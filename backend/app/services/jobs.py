from datetime import datetime, timezone

from app.db.session import SessionLocal

from app.models.ingestion_job import IngestionJob
from app.models.document import Document
from app.models.meeting import Meeting
from app.models.dialogue_turn import DialogueTurn

from app.services.ai.embeddings import embed_texts
from app.services.ai.transcribe import transcribe
from app.services.ai.speaker_naming import map_speakers
from app.services.ai.llm import generate_summary

from app.services.ingestion.chunker import (
    chunk_text,
    chunk_turns,
)

from app.services.memory.vector_store import (
    store_chunks,
    delete_document_chunks,
)


# ============================================================
# MEETING PROCESSING
# ============================================================

def process_meeting(job_id: int):
    """
    VESTIGE AI: Meeting processing pipeline.

    Flow:

        Audio
          ↓
        Gemini 3.5 Transcribe
          ↓
        Automatic speaker diarization
          ↓
        Gemini transcript verification
          ↓
        Gemini speaker-name identification
          ↓
        Save DialogueTurn
          ↓
        Save original transcript
          ↓
        Generate meeting summary
          ↓
        Create RAG chunks
          ↓
        Embeddings
          ↓
        Qdrant

    Important:

        - No Groq
        - No AssemblyAI
        - No translation
        - Original Urdu/English/code-switching preserved
        - Speaker count is NOT hardcoded
    """

    db = SessionLocal()

    job = None

    try:

        # =====================================================
        # 1. GET INGESTION JOB
        # =====================================================

        job = db.get(
            IngestionJob,
            job_id,
        )

        if not job:
            print(
                f"[JOBS] Ingestion job {job_id} not found."
            )
            return

        # =====================================================
        # 2. GET MEETING
        # =====================================================

        meeting = db.get(
            Meeting,
            job.meeting_id,
        )

        if not meeting:

            raise ValueError(
                f"Meeting {job.meeting_id} not found."
            )

        print(
            f"[JOBS] Processing meeting {meeting.id}"
        )

        # =====================================================
        # 3. START PROCESSING
        # =====================================================

        job.status = "processing"
        job.progress = 5
        job.error_message = None

        db.commit()

        # =====================================================
        # 4. TRANSCRIPTION
        # =====================================================

        print(
            f"[JOBS] Starting transcription "
            f"for meeting {meeting.id}"
        )

        transcript_text, duration, segments = transcribe(
            meeting.audio_path,
            vocabulary_hint=None,
            speakers_expected=None,
        )

        # -----------------------------------------------------
        # Duration
        # -----------------------------------------------------

        if duration is not None:

            try:

                meeting.duration_seconds = int(
                    duration
                )

            except Exception:

                meeting.duration_seconds = 0

        print(
            f"[JOBS] Transcription complete. "
            f"Segments: {len(segments)}"
        )

        if not segments:

            raise ValueError(
                "Gemini returned no transcription segments."
            )

        job.progress = 40

        db.commit()

        # =====================================================
        # 5. SPEAKER NAMING
        # =====================================================

        print(
            "[JOBS] Identifying speaker names with Gemini..."
        )

        speaker_mapping = map_speakers(
            db,
            segments,
            meeting.participants,
        )

        print(
            f"[JOBS] Speaker mapping: "
            f"{speaker_mapping}"
        )

        job.progress = 55

        db.commit()

        # =====================================================
        # 6. DELETE OLD DIALOGUE TURNS
        # =====================================================

        print(
            "[JOBS] Removing previous dialogue turns..."
        )

        db.query(
            DialogueTurn
        ).filter(
            DialogueTurn.meeting_id == meeting.id
        ).delete(
            synchronize_session=False
        )

        db.commit()

        # =====================================================
        # 7. SAVE DIALOGUE TURNS
        # =====================================================

        readable_transcript = []

        rag_turns = []

        saved_turn_count = 0

        for i, seg in enumerate(segments):

            # -------------------------------------------------
            # Speaker label
            # -------------------------------------------------

            speaker_label = (
                seg.get("speaker_label")
                or f"SPEAKER_{i:02d}"
            )

            # -------------------------------------------------
            # Speaker mapping
            # -------------------------------------------------

            speaker_info = speaker_mapping.get(
                speaker_label,
                {},
            )

            speaker_name = (
                speaker_info.get("name")
            )

            # -------------------------------------------------
            # Final fallback
            # -------------------------------------------------

            if not speaker_name:

                # IMPORTANT:
                # Don't use i + 1 here.
                # i is the segment number, not speaker number.

                existing_speaker_numbers = []

                for mapping in speaker_mapping.values():

                    name = mapping.get(
                        "name",
                        "",
                    )

                    if name.lower().startswith(
                        "speaker "
                    ):

                        try:

                            number = int(
                                name.split()[-1]
                            )

                            existing_speaker_numbers.append(
                                number
                            )

                        except Exception:
                            pass

                next_number = 1

                while next_number in existing_speaker_numbers:

                    next_number += 1

                speaker_name = (
                    f"Speaker {next_number}"
                )

            # -------------------------------------------------
            # Original text
            # -------------------------------------------------

            original_text = (
                seg.get("text")
                or ""
            ).strip()

            if not original_text:

                continue

            # -------------------------------------------------
            # Timestamp
            # -------------------------------------------------

            start_time = seg.get(
                "start",
                0.0,
            )

            end_time = seg.get(
                "end",
                0.0,
            )

            try:

                start_time = float(
                    start_time or 0.0
                )

            except Exception:

                start_time = 0.0

            try:

                end_time = float(
                    end_time or 0.0
                )

            except Exception:

                end_time = 0.0

            # -------------------------------------------------
            # Save DialogueTurn
            # -------------------------------------------------

            turn = DialogueTurn(

                meeting_id=meeting.id,

                turn_order=i,

                speaker_label=speaker_label,

                speaker_name=speaker_name,

                # ---------------------------------------------
                # ORIGINAL LANGUAGE
                # ---------------------------------------------

                text=original_text,

                # ---------------------------------------------
                # NO TRANSLATION
                # ---------------------------------------------

                text_en=None,

                # ---------------------------------------------
                # TIMESTAMPS
                # ---------------------------------------------

                start_time=start_time,

                end_time=end_time,
            )

            db.add(turn)

            saved_turn_count += 1

            # -------------------------------------------------
            # UI transcript
            # -------------------------------------------------

            readable_transcript.append(
                f"{speaker_name}: "
                f"{original_text}"
            )

            # -------------------------------------------------
            # RAG
            #
            # IMPORTANT:
            # We use ORIGINAL text.
            #
            # There is currently no translation.
            # -------------------------------------------------

            rag_turns.append(
                {
                    "speaker_name": speaker_name,
                    "text_en": original_text,
                }
            )

        print(
            f"[JOBS] Saved {saved_turn_count} dialogue turns."
        )

        if saved_turn_count == 0:

            raise ValueError(
                "No valid dialogue turns were produced."
            )

        db.commit()

        # =====================================================
        # 8. SAVE MEETING TRANSCRIPT
        # =====================================================

        meeting.transcript = (
            "\n\n".join(
                readable_transcript
            )
        )

        db.commit()

        print(
            "[JOBS] Original transcript saved."
        )

        job.progress = 65

        db.commit()

        # =====================================================
        # 8b. GENERATE MEETING SUMMARY
        # =====================================================

        print(
            "[JOBS] Generating meeting summary..."
        )

        try:

            meeting.summary = generate_summary(
                meeting.transcript,
                title=meeting.title,
            )

        except Exception as e:

            print(
                f"[JOBS] Summary generation failed: {e}"
            )

            meeting.summary = None

        db.commit()

        job.progress = 70

        db.commit()

        # =====================================================
        # 9. CREATE RAG CHUNKS
        # =====================================================

        print(
            "[JOBS] Creating RAG chunks..."
        )

        chunks = chunk_turns(
            rag_turns
        )

        if not chunks:

            print(
                "[JOBS] No chunks generated."
            )

        else:

            print(
                f"[JOBS] Generated "
                f"{len(chunks)} RAG chunks."
            )

            job.progress = 75

            db.commit()

            # =================================================
            # 10. EMBEDDINGS
            # =================================================

            print(
                f"[JOBS] Embedding "
                f"{len(chunks)} chunks..."
            )

            vectors = embed_texts(
                chunks
            )

            if not vectors:

                raise ValueError(
                    "Embedding model returned no vectors."
                )

            if len(vectors) != len(chunks):

                raise ValueError(
                    "Number of vectors does not match "
                    "number of chunks."
                )

            # =================================================
            # 11. QDRANT
            # =================================================

            # Negative IDs are used for meetings so they
            # don't collide with document IDs.

            document_id = -meeting.id

            print(
                f"[JOBS] Removing old Qdrant chunks "
                f"for meeting {meeting.id}..."
            )

            delete_document_chunks(
                document_id
            )

            print(
                f"[JOBS] Storing "
                f"{len(chunks)} chunks in Qdrant..."
            )

            store_chunks(

                document_id=document_id,

                chunks=chunks,

                vectors=vectors,

                meta={
                    "meeting_id": meeting.id,
                    "project_id": meeting.project_id,
                    "source_type": "meeting",
                },
            )

            print(
                "[JOBS] Qdrant storage complete."
            )

        # =====================================================
        # 12. COMPLETE JOB
        # =====================================================

        job.progress = 100

        job.status = "done"

        job.finished_at = (
            datetime.now(timezone.utc)
        )

        db.commit()

        print(
            f"[JOBS] Meeting {meeting.id} "
            f"processed successfully."
        )

    except Exception as e:

        # -----------------------------------------------------
        # Rollback
        # -----------------------------------------------------

        db.rollback()

        print(
            f"[JOBS] process_meeting failed: "
            f"{type(e).__name__}: {e}"
        )

        # -----------------------------------------------------
        # Mark job as failed
        # -----------------------------------------------------

        try:

            failed_job = db.get(
                IngestionJob,
                job_id,
            )

            if failed_job:

                failed_job.status = "failed"

                failed_job.error_message = (
                    str(e)[:500]
                )

                db.commit()

        except Exception as commit_error:

            print(
                f"[JOBS] Could not update failed job: "
                f"{commit_error}"
            )

    finally:

        db.close()


# ============================================================
# DOCUMENT PROCESSING
# ============================================================

def process_document(job_id: int):
    """
    VESTIGE AI: Processes uploaded text documents.

    Flow:

        Document
          ↓
        Read text
          ↓
        Generate summary
          ↓
        Chunk
          ↓
        Embeddings
          ↓
        Qdrant
    """

    db = SessionLocal()

    try:

        # =====================================================
        # GET JOB
        # =====================================================

        job = db.get(
            IngestionJob,
            job_id,
        )

        if not job:
            return

        # =====================================================
        # GET DOCUMENT
        # =====================================================

        doc = db.get(
            Document,
            job.document_id,
        )

        if not doc:

            raise ValueError(
                f"Document {job.document_id} not found."
            )

        # =====================================================
        # START
        # =====================================================

        job.status = "processing"
        job.progress = 10

        db.commit()

        print(
            f"[JOBS] Processing document {doc.id}"
        )

        # =====================================================
        # READ FILE
        # =====================================================

        with open(
            doc.file_path,
            "r",
            encoding="utf-8",
            errors="ignore",
        ) as f:

            text = f.read()

        text = text.strip()

        if not text:

            raise ValueError(
                "Document contains no readable text."
            )

        doc.extracted_text = text

        job.progress = 35

        db.commit()

        # =====================================================
        # GENERATE DOCUMENT SUMMARY
        # =====================================================

        print(
            "[JOBS] Generating document summary..."
        )

        try:

            doc.summary = generate_summary(
                text,
                title=doc.filename,
            )

        except Exception as e:

            print(
                f"[JOBS] Summary generation failed: {e}"
            )

            doc.summary = None

        db.commit()

        # =====================================================
        # CHUNK
        # =====================================================

        print(
            "[JOBS] Creating document chunks..."
        )

        chunks = chunk_text(
            text
        )

        if not chunks:

            raise ValueError(
                "No chunks generated from document."
            )

        print(
            f"[JOBS] Generated "
            f"{len(chunks)} document chunks."
        )

        job.progress = 55

        db.commit()

        # =====================================================
        # EMBEDDINGS
        # =====================================================

        print(
            f"[JOBS] Embedding "
            f"{len(chunks)} document chunks..."
        )

        vectors = embed_texts(
            chunks
        )

        if not vectors:

            raise ValueError(
                "Embedding model returned no vectors."
            )

        if len(vectors) != len(chunks):

            raise ValueError(
                "Number of vectors does not match "
                "number of document chunks."
            )

        job.progress = 75

        db.commit()

        # =====================================================
        # QDRANT
        # =====================================================

        delete_document_chunks(
            doc.id
        )

        store_chunks(

            document_id=doc.id,

            chunks=chunks,

            vectors=vectors,

            meta={
                "client_id": doc.client_id,
                "project_id": doc.project_id,
                "source_type": "document",
            },
        )

        print(
            "[JOBS] Document Qdrant storage complete."
        )

        # =====================================================
        # SAVE CHUNK COUNT
        # =====================================================

        doc.chunk_count = len(
            chunks
        )

        # =====================================================
        # DONE
        # =====================================================

        job.status = "done"

        job.progress = 100

        db.commit()

        print(
            f"[JOBS] Document {doc.id} "
            f"processed successfully."
        )

    except Exception as e:

        db.rollback()

        print(
            f"[JOBS] process_document failed: "
            f"{type(e).__name__}: {e}"
        )

        try:

            failed_job = db.get(
                IngestionJob,
                job_id,
            )

            if failed_job:

                failed_job.status = "failed"

                failed_job.error_message = (
                    str(e)[:500]
                )

                db.commit()

        except Exception as commit_error:

            print(
                f"[JOBS] Could not update failed document job: "
                f"{commit_error}"
            )

    finally:

        db.close()


# ============================================================
# RE-EMBED MEETING
# ============================================================

def reembed_meeting(meeting_id: int):
    """
    Refresh Qdrant vectors after speaker names are changed
    from the UI.

    Uses the original transcript.

    No translation.
    """

    db = SessionLocal()

    try:

        # =====================================================
        # GET MEETING
        # =====================================================

        meeting = db.get(
            Meeting,
            meeting_id,
        )

        if not meeting:

            raise ValueError(
                f"Meeting {meeting_id} not found."
            )

        # =====================================================
        # GET DIALOGUE TURNS
        # =====================================================

        rows = (
            db.query(
                DialogueTurn
            )
            .filter(
                DialogueTurn.meeting_id
                == meeting_id
            )
            .order_by(
                DialogueTurn.turn_order
            )
            .all()
        )

        if not rows:

            print(
                f"[JOBS] No dialogue turns found "
                f"for meeting {meeting_id}"
            )

            return

        turns = []

        for row in rows:

            speaker_name = (
                row.speaker_name
                or row.speaker_label
                or "Speaker"
            )

            original_text = (
                row.text
                or ""
            ).strip()

            if not original_text:

                continue

            turns.append(
                {
                    "speaker_name": speaker_name,

                    # -------------------------------------------------
                    # IMPORTANT:
                    # Always prefer ORIGINAL transcript.
                    #
                    # text_en is intentionally ignored because
                    # transcription currently does not translate.
                    # -------------------------------------------------

                    "text_en": original_text,
                }
            )

        if not turns:

            print(
                f"[JOBS] No usable transcript text "
                f"for meeting {meeting_id}"
            )

            return

        # =====================================================
        # CHUNK
        # =====================================================

        chunks = chunk_turns(
            turns
        )

        if not chunks:

            print(
                f"[JOBS] No chunks generated "
                f"for meeting {meeting_id}"
            )

            return

        print(
            f"[JOBS] Re-embedding meeting "
            f"{meeting_id}: "
            f"{len(chunks)} chunks"
        )

        # =====================================================
        # EMBEDDINGS
        # =====================================================

        vectors = embed_texts(
            chunks
        )

        if not vectors:

            raise ValueError(
                "Embedding model returned no vectors."
            )

        if len(vectors) != len(chunks):

            raise ValueError(
                "Number of vectors does not match "
                "number of chunks."
            )

        # =====================================================
        # QDRANT
        # =====================================================

        document_id = -meeting_id

        delete_document_chunks(
            document_id
        )

        store_chunks(

            document_id=document_id,

            chunks=chunks,

            vectors=vectors,

            meta={
                "meeting_id": meeting_id,
                "project_id": meeting.project_id,
                "source_type": "meeting",
            },
        )

        print(
            f"[JOBS] Re-embedded meeting "
            f"{meeting_id} successfully."
        )

    except Exception as e:

        print(
            f"[JOBS] reembed_meeting failed: "
            f"{type(e).__name__}: {e}"
        )

        raise

    finally:

        db.close()