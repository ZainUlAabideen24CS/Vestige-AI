import os
import time
import json
import re
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types   
from mutagen import File as MutagenFile

load_dotenv()   

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY")) 

TRANSCRIBE_MODEL = "gemini-3.5-transcribe"  

# Gemini text/multimodal model used for verification.
# You can change this from .env without changing code.
VERIFY_MODEL = os.getenv(
    "GEMINI_TEXT_MODEL",
    "gemini-3.6-flash",
)

VERIFY_TRANSCRIPT = os.getenv(
    "GEMINI_VERIFY_TRANSCRIPT",
    "true",
).lower() == "true"


# ============================================================
# Helpers
# ============================================================

def _get_value(obj: Any, *names, default=None):
    """
    Safely read a value from either an SDK object or a dict.
    """
    for name in names:
        if obj is None:
            continue

        if isinstance(obj, dict):
            if name in obj:
                return obj[name]

        value = getattr(obj, name, None)

        if value is not None:
            return value

    return default


def _get_audio_transcription(part):
    """
    Gemini SDK versions can expose audio transcription
    slightly differently.
    """
    value = _get_value(
        part,
        "audio_transcription",
        "audioTranscription",
    )

    return value


def _extract_speaker(annotation):
    speaker = _get_value(
        annotation,
        "speaker",
        "speaker_id",
        "speakerId",
        "speaker_label",
        "speakerLabel",
    )

    if speaker is None:
        return None

    speaker = str(speaker).strip()

    if not speaker:
        return None

    return speaker


def _extract_text(annotation):
    text = _get_value(
        annotation,
        "text",
        "transcript",
        "content",
    )

    if text is None:
        return ""

    return str(text).strip()


def _seconds(value):
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    # Gemini duration objects normally expose total_seconds()
    try:
        return float(value.total_seconds())
    except Exception:
        pass

    # Some SDK objects may expose seconds
    try:
        return float(value.seconds)
    except Exception:
        pass

    return None


def _extract_times(annotation):
    start = _get_value(
        annotation,
        "start_offset",
        "startOffset",
        "start",
    )

    end = _get_value(
        annotation,
        "end_offset",
        "endOffset",
        "end",
    )

    return _seconds(start), _seconds(end)


def _normalize_speaker(raw_speaker, speaker_map):
    """
    Convert arbitrary Gemini speaker IDs into stable labels.

    Example:
        spk:0 -> SPEAKER_00
        speaker_1 -> SPEAKER_01
    """

    if raw_speaker is None:
        return "SPEAKER_UNKNOWN"

    raw = str(raw_speaker).strip()

    # Extract trailing number where possible
    match = re.search(r"(\d+)$", raw)

    if match:
        number = int(match.group(1))
    else:
        # Keep non-number speaker IDs stable
        if raw not in speaker_map:
            speaker_map[raw] = len(speaker_map)

        number = speaker_map[raw]

    return f"SPEAKER_{number:02d}"


# ============================================================
# Extract legacy generate_content() transcription
# ============================================================

def _extract_dialogues(response):
    dialogues = []
    speaker_map = {}

    candidates = getattr(response, "candidates", None) or []

    if not candidates:
        return dialogues

    content = getattr(candidates[0], "content", None)

    if content is None:
        return dialogues

    parts = getattr(content, "parts", None) or []

    for part in parts:

        annotation = _get_audio_transcription(part)

        if annotation is None:
            continue

        text = _extract_text(annotation)

        if not text:
            continue

        raw_speaker = _extract_speaker(annotation)

        speaker_label = _normalize_speaker(
            raw_speaker,
            speaker_map,
        )

        start, end = _extract_times(annotation)

        dialogues.append(
            {
                "speaker_label": speaker_label,
                "text": text,
                "start": start if start is not None else 0.0,
                "end": end if end is not None else 0.0,
            }
        )

    return dialogues


# ============================================================
# Build transcript
# ============================================================

def _dialogues_to_text(dialogues):
    lines = []

    for turn in dialogues:
        speaker = turn["speaker_label"]
        text = turn["text"].strip()

        if text:
            lines.append(f"{speaker}: {text}")

    return "\n".join(lines)


# ============================================================
# Gemini transcript verification
# ============================================================

def _extract_json(text):
    """
    Gemini sometimes returns JSON inside ```json ... ```
    """

    text = text.strip()

    if text.startswith("```"):
        text = re.sub(
            r"^```(?:json)?\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

        text = re.sub(
            r"\s*```$",
            "",
            text,
        )

    # Try direct JSON
    try:
        return json.loads(text)
    except Exception:
        pass

    # Find JSON array
    start = text.find("[")

    if start != -1:
        end = text.rfind("]")

        if end != -1:
            candidate = text[start:end + 1]

            try:
                return json.loads(candidate)
            except Exception:
                pass

    # Find JSON object
    start = text.find("{")

    if start != -1:
        end = text.rfind("}")

        if end != -1:
            candidate = text[start:end + 1]

            try:
                return json.loads(candidate)
            except Exception:
                pass

    return None


def _validate_verified_dialogues(data, original_dialogues):
    """
    Validate Gemini's correction result.

    We don't blindly trust Gemini.
    Speaker labels and timestamps from the first
    diarization pass remain authoritative where possible.
    """

    if isinstance(data, dict):
        data = data.get("segments")

    if not isinstance(data, list):
        return None

    cleaned = []

    for i, item in enumerate(data):

        if not isinstance(item, dict):
            continue

        text = str(
            item.get("text", "")
        ).strip()

        if not text:
            continue

        speaker = item.get("speaker_label")

        if not speaker:
            speaker = item.get("speaker")

        if not speaker and i < len(original_dialogues):
            speaker = original_dialogues[i]["speaker_label"]

        if not speaker:
            speaker = "SPEAKER_UNKNOWN"

        # Normalize speaker naming from Gemini verifier
        speaker_str = str(speaker).strip()

        match = re.search(
            r"(\d+)$",
            speaker_str,
        )

        if match:
            speaker_str = (
                f"SPEAKER_{int(match.group(1)):02d}"
            )

        if i < len(original_dialogues):

            original = original_dialogues[i]

            start = original["start"]
            end = original["end"]

        else:

            start = float(
                item.get("start", 0.0) or 0.0
            )

            end = float(
                item.get("end", 0.0) or 0.0
            )

        cleaned.append(
            {
                "speaker_label": speaker_str,
                "text": text,
                "start": start,
                "end": end,
            }
        )

    if not cleaned:
        return None

    return cleaned


def _verify_transcript_with_gemini(
    uploaded_file,
    draft_dialogues,
):
    """
    Second Gemini pass.

    Purpose:
      - prevent English -> Urdu transliteration
      - detect omitted utterances where possible
      - preserve Urdu as Urdu
      - preserve English as English
      - preserve code-switching
      - keep diarization labels from first pass

    This is NOT the primary diarization pass.
    """

    if not draft_dialogues:
        return draft_dialogues

    draft_text = _dialogues_to_text(
        draft_dialogues
    )

    prompt = f"""
You are a professional meeting-transcript verification system.

The audio is the ORIGINAL source of truth.

A first Gemini transcription/diarization pass produced the draft
transcript below.

Your job is to listen to the audio and correct the draft.

CRITICAL RULES:

1. DO NOT translate anything.

2. Preserve the language actually spoken.

3. If a person speaks English, write English using LATIN/ENGLISH
   characters.

   Example:
   "Perfect, mostly Excel"
   MUST remain:
   "Perfect, mostly Excel"

   NOT:
   "پرفیکٹ، موسٹلی ایکسل"

4. If a person speaks Urdu, write Urdu in Urdu script.

5. If the speaker switches between Urdu and English, preserve the
   switching exactly.

Example:

"We need to finalize the requirements, phir implementation
start karenge."

Do NOT convert the whole sentence into Urdu script.

6. Do not summarize.

7. Do not shorten.

8. Do not remove short utterances such as:
   "Yes"
   "Ji"
   "Right"
   "Exactly"
   "Okay"

9. The audio is the source of truth. If the draft missed an audible
   sentence or turn, restore it.

10. Do not invent speech that is not present in the audio.

11. Preserve speaker identity from the draft diarization.
    Do NOT rename SPEAKER_00, SPEAKER_01, etc.

12. Preserve chronological order.

13. Preserve timestamps where they already exist in the draft.

14. Do not combine unrelated turns just to make the transcript shorter.

15. Every audible conversational turn should be represented.

Return ONLY valid JSON.

Format:

[
  {{
    "speaker_label": "SPEAKER_00",
    "start": 0.0,
    "end": 3.2,
    "text": "actual spoken text"
  }}
]

DRAFT TRANSCRIPT:

{draft_text}
"""

    try:

        print(
            f"[transcribe] Running Gemini transcript verification "
            f"with {VERIFY_MODEL}..."
        )

        response = client.models.generate_content(
            model=VERIFY_MODEL,
            contents=[
                uploaded_file,
                prompt,
            ],
            config=types.GenerateContentConfig(
                temperature=0.0,
            ),
        )

        result_text = getattr(
            response,
            "text",
            None,
        )

        if not result_text:
            print(
                "[transcribe] Verification returned empty response."
            )
            return draft_dialogues

        data = _extract_json(result_text)

        if data is None:
            print(
                "[transcribe] Could not parse verifier JSON."
            )
            return draft_dialogues

        verified = _validate_verified_dialogues(
            data,
            draft_dialogues,
        )

        if not verified:
            print(
                "[transcribe] Verification result invalid."
            )
            return draft_dialogues

        print(
            f"[transcribe] Verification complete: "
            f"{len(draft_dialogues)} -> {len(verified)} segments"
        )

        return verified

    except Exception as e:

        print(
            f"[transcribe] Verification failed: {e}"
        )

        # Don't destroy a working transcription if the
        # verification model temporarily fails.
        return draft_dialogues


# ============================================================
# Main transcription function
# ============================================================

def transcribe(
    audio_path: str,
    vocabulary_hint: str | None = None,
    speakers_expected: int | None = None,
):
    """
    Primary transcription:

        Gemini 3.5 Transcribe
        -> diarization
        -> timestamps
        -> Gemini verification
    """

    print(
        f"[transcribe] Uploading: {audio_path}"
    )

    uploaded_file = client.files.upload(
        file=audio_path
    )

    print(
        f"[transcribe] Uploaded: {uploaded_file.name}"
    )

    # --------------------------------------------------------
    # Wait until Gemini has processed the audio
    # --------------------------------------------------------

    while True:

        uploaded_file = client.files.get(
            name=uploaded_file.name
        )

        state = getattr(
            uploaded_file,
            "state",
            None,
        )

        state_name = getattr(
            state,
            "name",
            str(state),
        )

        if state_name != "PROCESSING":
            break

        print(
            "[transcribe] Audio still processing..."
        )

        time.sleep(3)

    print(
        f"[transcribe] Audio ready: {state_name}"
    )

    # --------------------------------------------------------
    # Primary Gemini transcription
    # --------------------------------------------------------

    prompt = """
Transcribe the meeting completely and verbatim.

IMPORTANT LANGUAGE RULES:

The meeting may contain Urdu, English, and Urdu-English code switching.

Preserve the language that is actually spoken.

If English is spoken, write English using Latin/English characters.

For example:

"Exactly, the requirements are clear."

MUST be written as:

"Exactly, the requirements are clear."

NOT:

"ایگزیکٹلی، دی ریکوائرمنٹس آر کلیئر"

If Urdu is spoken, write it in Urdu script.

If the speaker switches languages inside one sentence, preserve
that switching.

Example:

"We need to finalize the requirements, phir implementation
start karenge."

Do NOT translate it.

Do NOT transliterate English words into Urdu script.

Do NOT summarize.

Do NOT omit short responses.

Capture every audible utterance.

Perform automatic speaker diarization.

Do not assume a fixed number of speakers.

Use speaker labels such as SPEAKER_00, SPEAKER_01, SPEAKER_02.

Keep different speakers separate.

Preserve timestamps for each segment.
"""

    # Do not pass custom vocabulary when using diarization/timestamps.
    # This is intentionally ignored for this transcription mode.

    print(
        "[transcribe] Generating transcript with "
        "Gemini 3.5 Transcribe..."
    )

    response = client.models.generate_content(
        model=TRANSCRIBE_MODEL,
        contents=[
            uploaded_file,
            prompt,
        ],
        config=types.GenerateContentConfig(
            temperature=0.0,
            audio_transcription_config=(
                types.AudioTranscriptionConfig(
                    diarization=True
                )
            ),
        ),
    )

    print(
        "[transcribe] Gemini response received"
    )

    # --------------------------------------------------------
    # Extract diarized segments
    # --------------------------------------------------------

    dialogues = _extract_dialogues(
        response
    )

    print(
        f"[transcribe] Response parts: "
        f"{len(getattr(response.candidates[0].content, 'parts', []) or [])}"
    )

    print(
        f"[transcribe] Draft transcript segments: "
        f"{len(dialogues)}"
    )

    if not dialogues:

        response_text = getattr(
            response,
            "text",
            "",
        )

        print(
            "[transcribe] WARNING: No audio transcription "
            "parts found."
        )

        if response_text:
            print(
                "[transcribe] Gemini text response:"
            )
            print(response_text[:2000])

        raise RuntimeError(
            "Gemini returned no diarized transcription segments."
        )

    # --------------------------------------------------------
    # Gemini verification
    # --------------------------------------------------------

    if VERIFY_TRANSCRIPT:

        dialogues = _verify_transcript_with_gemini(
            uploaded_file,
            dialogues,
        )

    # --------------------------------------------------------
    # Final transcript
    # --------------------------------------------------------

    transcript_text = _dialogues_to_text(
        dialogues
    )

    speakers = sorted(
        {
            turn["speaker_label"]
            for turn in dialogues
            if turn.get("speaker_label")
        }
    )

    print(
        f"[transcribe] Final transcript length: "
        f"{len(transcript_text)}"
    )

    print(
        f"[transcribe] Final dialogue segments: "
        f"{len(dialogues)}"
    )

    print(
        f"[transcribe] Speakers detected: "
        f"{speakers}"
    )

        # --------------------------------------------------------
    # Compute duration from the last segment's end timestamp
    # --------------------------------------------------------

        # Prefer actual audio file duration over last-segment timestamp
    file_duration = _get_audio_file_duration(audio_path)

    if dialogues:
        segment_duration = max((turn.get("end") or 0.0) for turn in dialogues)
    else:
        segment_duration = 0.0

    duration_seconds = file_duration if file_duration > 0 else segment_duration

    print(f"[transcribe] File duration: {file_duration:.1f}s, segment-based: {segment_duration:.1f}s")

    return (
        transcript_text,
        duration_seconds,
        dialogues,
    )

def _get_audio_file_duration(audio_path: str) -> float:
    try:
        audio = MutagenFile(audio_path)
        if audio is not None and audio.info is not None:
            return float(audio.info.length)
    except Exception as e:
        print(f"[transcribe] Could not read audio file duration: {e}")
    return 0.0

   