import os
import time
import json
import re
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from mutagen import File as MutagenFile


# ============================================================
# ENV / CLIENT
# ============================================================

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

TRANSCRIBE_MODEL = "gemini-3.5-transcribe"

VERIFY_MODEL = os.getenv(
    "GEMINI_TEXT_MODEL",
    "gemini-3.6-flash",
)

VERIFY_TRANSCRIPT = (
    os.getenv(
        "GEMINI_VERIFY_TRANSCRIPT",
        "true",
    ).lower()
    == "true"
)


# ============================================================
# GENERIC SDK HELPERS
# ============================================================

def _get_value(obj: Any, *names, default=None):
    """
    Safely read a value from either:
    - Gemini SDK objects
    - dictionaries
    """

    if obj is None:
        return default

    for name in names:

        if isinstance(obj, dict):
            if name in obj:
                value = obj[name]

                if value is not None:
                    return value

        try:
            value = getattr(obj, name, None)

            if value is not None:
                return value

        except Exception:
            pass

    return default


def _seconds(value):
    """
    Convert Gemini timestamp/duration values into seconds.
    """

    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    try:
        return float(value.total_seconds())
    except Exception:
        pass

    try:
        return float(value.seconds)
    except Exception:
        pass

    # Some SDK versions may expose:
    # {"seconds": ..., "nanos": ...}
    if isinstance(value, dict):

        seconds = value.get("seconds")

        nanos = value.get("nanos", 0)

        if seconds is not None:

            try:
                return float(seconds) + (
                    float(nanos) / 1_000_000_000
                )

            except Exception:
                pass

    return None


# ============================================================
# AUDIO TRANSCRIPTION EXTRACTION
# ============================================================

def _get_audio_transcription(part):
    """
    Gemini SDK versions expose audio transcription
    slightly differently.
    """

    return _get_value(
        part,
        "audio_transcription",
        "audioTranscription",
    )


def _extract_text(annotation):
    """
    Extract actual transcript text.
    """

    text = _get_value(
        annotation,
        "text",
        "transcript",
        "content",
    )

    if text is None:
        return ""

    return str(text).strip()


def _extract_speaker(annotation):
    """
    Extract Gemini speaker ID.
    """

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

    return speaker if speaker else None


def _extract_times(annotation):
    """
    Extract start/end timestamps.
    """

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

    return (
        _seconds(start),
        _seconds(end),
    )


# ============================================================
# SPEAKER NORMALIZATION
# ============================================================

def _normalize_speaker(
    raw_speaker,
    speaker_map,
):
    """
    Convert Gemini speaker IDs into:

        SPEAKER_00
        SPEAKER_01
        SPEAKER_02
    """

    if raw_speaker is None:
        return "SPEAKER_UNKNOWN"

    raw = str(raw_speaker).strip()

    if not raw:
        return "SPEAKER_UNKNOWN"

    # Examples:
    # spk_0
    # speaker_1
    # SPEAKER_02
    # speaker2

    match = re.search(
        r"(\d+)$",
        raw,
    )

    if match:

        number = int(
            match.group(1)
        )

    else:

        if raw not in speaker_map:
            speaker_map[raw] = len(
                speaker_map
            )

        number = speaker_map[raw]

    return f"SPEAKER_{number:02d}"


# ============================================================
# EXTRACT DIARIZED TRANSCRIPTION
# ============================================================

def _extract_dialogues(response):
    """
    Extract diarized transcription from Gemini's
    generate_content() response.
    """

    dialogues = []

    speaker_map = {}

    candidates = (
        getattr(
            response,
            "candidates",
            None,
        )
        or []
    )

    if not candidates:
        return dialogues

    content = getattr(
        candidates[0],
        "content",
        None,
    )

    if content is None:
        return dialogues

    parts = (
        getattr(
            content,
            "parts",
            None,
        )
        or []
    )

    print(
        f"[transcribe] Response parts: {len(parts)}"
    )

    for index, part in enumerate(parts):

        annotation = _get_audio_transcription(
            part
        )

        if annotation is None:
            continue

        text = _extract_text(
            annotation
        )

        if not text:
            continue

        raw_speaker = _extract_speaker(
            annotation
        )

        speaker_label = _normalize_speaker(
            raw_speaker,
            speaker_map,
        )

        start, end = _extract_times(
            annotation
        )

        dialogues.append(
            {
                "speaker_label": speaker_label,
                "text": text,
                "start": (
                    start
                    if start is not None
                    else 0.0
                ),
                "end": (
                    end
                    if end is not None
                    else 0.0
                ),
            }
        )

    return dialogues


# ============================================================
# TRANSCRIPT TEXT
# ============================================================

def _dialogues_to_text(dialogues):
    """
    Convert dialogue objects into readable transcript.
    """

    lines = []

    for turn in dialogues:

        speaker = (
            turn.get(
                "speaker_label",
                "SPEAKER_UNKNOWN",
            )
        )

        text = str(
            turn.get("text", "")
        ).strip()

        if not text:
            continue

        lines.append(
            f"{speaker}: {text}"
        )

    return "\n".join(lines)


# ============================================================
# JSON EXTRACTION
# ============================================================

def _extract_json(text):
    """
    Gemini may return JSON inside markdown fences.
    """

    if not text:
        return None

    text = text.strip()

    # Remove markdown code fence
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

    # Direct JSON
    try:
        return json.loads(text)

    except Exception:
        pass

    # JSON array
    start = text.find("[")

    end = text.rfind("]")

    if start != -1 and end > start:

        candidate = text[
            start:end + 1
        ]

        try:
            return json.loads(
                candidate
            )

        except Exception:
            pass

    # JSON object
    start = text.find("{")

    end = text.rfind("}")

    if start != -1 and end > start:

        candidate = text[
            start:end + 1
        ]

        try:
            return json.loads(
                candidate
            )

        except Exception:
            pass

    return None


# ============================================================
# VALIDATE VERIFICATION RESULT
# ============================================================

def _validate_verified_dialogues(
    data,
    original_dialogues,
):
    """
    Validate Gemini 3.6 verification output.

    The verifier is allowed to fix text,
    but speaker identity and timestamps from
    the original diarization are preferred.
    """

    if isinstance(data, dict):

        data = data.get(
            "segments"
        )

    if not isinstance(data, list):
        return None

    cleaned = []

    for i, item in enumerate(data):

        if not isinstance(item, dict):
            continue

        text = str(
            item.get(
                "text",
                "",
            )
        ).strip()

        if not text:
            continue

        # ----------------------------------------------------
        # Speaker
        # ----------------------------------------------------

        speaker = item.get(
            "speaker_label"
        )

        if not speaker:
            speaker = item.get(
                "speaker"
            )

        if (
            not speaker
            and i < len(original_dialogues)
        ):
            speaker = (
                original_dialogues[i]
                .get(
                    "speaker_label",
                    "SPEAKER_UNKNOWN",
                )
            )

        if not speaker:
            speaker = "SPEAKER_UNKNOWN"

        speaker = str(
            speaker
        ).strip()

        match = re.search(
            r"(\d+)$",
            speaker,
        )

        if match:

            speaker = (
                f"SPEAKER_"
                f"{int(match.group(1)):02d}"
            )

        # ----------------------------------------------------
        # Timestamps
        # ----------------------------------------------------

        if i < len(original_dialogues):

            original = (
                original_dialogues[i]
            )

            start = float(
                original.get(
                    "start",
                    0.0,
                )
                or 0.0
            )

            end = float(
                original.get(
                    "end",
                    0.0,
                )
                or 0.0
            )

        else:

            try:
                start = float(
                    item.get(
                        "start",
                        0.0,
                    )
                    or 0.0
                )

            except Exception:
                start = 0.0

            try:
                end = float(
                    item.get(
                        "end",
                        0.0,
                    )
                    or 0.0
                )

            except Exception:
                end = 0.0

        cleaned.append(
            {
                "speaker_label": speaker,
                "text": text,
                "start": start,
                "end": end,
            }
        )

    if not cleaned:
        return None

    return cleaned


# ============================================================
# GEMINI 3.6 VERIFICATION
# ============================================================

def _verify_transcript_with_gemini(
    uploaded_file,
    draft_dialogues,
):
    """
    Gemini 3.6 Flash verifies the original audio.

    IMPORTANT:
    This is NOT a translation step.

    It is specifically instructed to:
      - preserve English
      - preserve Urdu
      - preserve code switching
      - recover missing speech
      - keep speaker labels
      - keep chronological order
    """

    if not draft_dialogues:
        return draft_dialogues

    draft_text = _dialogues_to_text(
        draft_dialogues
    )

    prompt = f"""
You are a professional meeting transcription
verification system.

The ORIGINAL AUDIO is the source of truth.

A first Gemini 3.5 Transcribe pass produced
the draft transcript below.

You must LISTEN TO THE ORIGINAL AUDIO and
correct the draft transcript.

==================================================
LANGUAGE RULES
==================================================

1. DO NOT TRANSLATE.

2. Preserve the language actually spoken.

3. ENGLISH MUST REMAIN ENGLISH.

If the speaker says:

"Exactly, the requirements are clear."

write:

"Exactly, the requirements are clear."

DO NOT write:

"ایگزیکٹلی، دی ریکوائرمنٹس آر کلیئر"

4. URDU MUST REMAIN URDU.

If the speaker speaks Urdu, write Urdu
using Urdu script.

5. PRESERVE CODE-SWITCHING.

Example:

"We need to finalize the requirements,
phir implementation start karenge."

Keep the English portion in Latin characters
and the Urdu portion in Urdu script.

DO NOT convert the complete sentence
into Urdu script.

6. Do not transliterate English words
into Urdu script.

7. Do not translate Urdu into English.

==================================================
COMPLETENESS
==================================================

8. The final transcript must contain
EVERY AUDIBLE UTTERANCE.

9. If the draft completely missed an
English sentence, recover it from the audio.

10. If the draft missed a short English
response such as:

"Yes"
"Okay"
"Right"
"Exactly"
"Perfect"
"Sure"

restore it if it is audible.

11. Do not summarize.

12. Do not shorten.

13. Do not remove speech merely because
it is short.

14. Do not invent speech that is not audible.

==================================================
SPEAKERS
==================================================

15. Preserve the existing speaker labels.

16. Do NOT rename:

SPEAKER_00
SPEAKER_01
SPEAKER_02

17. Keep the chronological order.

==================================================
TIMESTAMPS
==================================================

18. Preserve the original timestamps
whenever possible.

==================================================
IMPORTANT
==================================================

The draft may contain Urdu transliteration
where the speaker actually spoke English.

Correct this by LISTENING TO THE AUDIO.

Do not simply copy the draft.

The AUDIO is more important than the draft.

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
            f"[transcribe] Verifying transcript "
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
                "[transcribe] "
                "Verification returned empty response."
            )

            return draft_dialogues

        data = _extract_json(
            result_text
        )

        if data is None:

            print(
                "[transcribe] "
                "Could not parse verifier JSON."
            )

            return draft_dialogues

        verified = (
            _validate_verified_dialogues(
                data,
                draft_dialogues,
            )
        )

        if not verified:

            print(
                "[transcribe] "
                "Verification result invalid."
            )

            return draft_dialogues

        print(
            "[transcribe] Verification complete: "
            f"{len(draft_dialogues)} -> "
            f"{len(verified)} segments"
        )

        return verified

    except Exception as e:

        print(
            "[transcribe] Verification failed:"
            f" {e}"
        )

        # Never destroy the original transcript
        return draft_dialogues


# ============================================================
# AUDIO DURATION
# ============================================================

def _get_audio_file_duration(
    audio_path: str,
) -> float:

    try:

        audio = MutagenFile(
            audio_path
        )

        if (
            audio is not None
            and audio.info is not None
        ):
            return float(
                audio.info.length
            )

    except Exception as e:

        print(
            "[transcribe] "
            f"Could not read audio duration: {e}"
        )

    return 0.0


# ============================================================
# MAIN TRANSCRIPTION
# ============================================================

def transcribe(
    audio_path: str,
    vocabulary_hint: str | None = None,
    speakers_expected: int | None = None,
):
    """
    Primary pipeline:

        Audio
          ↓
        Gemini 3.5 Transcribe
          ↓
        Diarization
          ↓
        Speaker segments
          ↓
        Gemini 3.6 Flash verification
          ↓
        Final transcript
    """

    print(
        f"[transcribe] Uploading: {audio_path}"
    )

    # --------------------------------------------------------
    # Upload
    # --------------------------------------------------------

    uploaded_file = client.files.upload(
        file=audio_path
    )

    print(
        f"[transcribe] Uploaded: "
        f"{uploaded_file.name}"
    )

    # --------------------------------------------------------
    # Wait for Gemini processing
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
            "[transcribe] "
            "Audio still processing..."
        )

        time.sleep(3)

    print(
        f"[transcribe] Audio ready: "
        f"{state_name}"
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # Do NOT send vocabulary with diarization.
    # --------------------------------------------------------

    if vocabulary_hint:

        print(
            "[transcribe] Vocabulary hint "
            "received but intentionally ignored "
            "because diarization is enabled."
        )

    # --------------------------------------------------------
    # Primary transcription prompt
    # --------------------------------------------------------

    prompt = """
Transcribe this meeting completely and verbatim.

The meeting may contain:

- Urdu
- English
- Urdu-English code switching

==================================================
LANGUAGE
==================================================

Preserve the language actually spoken.

If English is spoken, write English using
LATIN / ENGLISH characters.

Example:

Speaker says:

"Exactly, the requirements are clear."

Write:

"Exactly, the requirements are clear."

NOT:

"ایگزیکٹلی، دی ریکوائرمنٹس آر کلیئر"

If Urdu is spoken, write it in Urdu script.

If the speaker switches between Urdu and English
inside one sentence, preserve that switching.

Example:

"We need to finalize the requirements,
phir implementation start karenge."

Do NOT convert the entire sentence
to Urdu script.

Do NOT transliterate English into Urdu script.

Do NOT translate English into Urdu.

Do NOT translate Urdu into English.

==================================================
COMPLETENESS
==================================================

Transcribe every audible utterance.

Do not summarize.

Do not shorten.

Do not omit:

- short answers
- confirmations
- greetings
- "Yes"
- "Ji"
- "Okay"
- "Right"
- "Exactly"
- "Perfect"
- "Sure"

English speech must NOT be omitted.

If an English sentence is audible,
include it in the transcript.

==================================================
DIARIZATION
==================================================

Perform automatic speaker diarization.

Keep different speakers separate.

Use labels such as:

SPEAKER_00
SPEAKER_01
SPEAKER_02

Do not merge different speakers
into one speaker.

==================================================
TIMESTAMPS
==================================================

Preserve timestamps for each spoken segment.

Keep the transcript in chronological order.

The output must represent the actual meeting,
not a summary of the meeting.
"""

    # --------------------------------------------------------
    # Gemini 3.5 Transcribe
    # --------------------------------------------------------

    print(
        "[transcribe] Generating transcript "
        "with Gemini 3.5 Transcribe..."
    )

    print(
        "[transcribe] Diarization: ON"
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
        f"[transcribe] Draft transcript segments: "
        f"{len(dialogues)}"
    )

    # --------------------------------------------------------
    # Fail clearly if Gemini returned nothing
    # --------------------------------------------------------

    if not dialogues:

        response_text = getattr(
            response,
            "text",
            "",
        )

        print(
            "[transcribe] WARNING: "
            "No audio transcription parts found."
        )

        if response_text:

            print(
                "[transcribe] Gemini text response:"
            )

            print(
                response_text[:3000]
            )

        raise RuntimeError(
            "Gemini returned no diarized "
            "transcription segments."
        )

    # --------------------------------------------------------
    # Print draft speaker information
    # --------------------------------------------------------

    draft_speakers = sorted(
        {
            turn.get(
                "speaker_label"
            )
            for turn in dialogues
            if turn.get(
                "speaker_label"
            )
        }
    )

    print(
        "[transcribe] Draft speakers: "
        f"{draft_speakers}"
    )

    # --------------------------------------------------------
    # Verification
    # --------------------------------------------------------

    if VERIFY_TRANSCRIPT:

        dialogues = (
            _verify_transcript_with_gemini(
                uploaded_file,
                dialogues,
            )
        )

    else:

        print(
            "[transcribe] "
            "Transcript verification disabled."
        )

    # --------------------------------------------------------
    # Final transcript
    # --------------------------------------------------------

    transcript_text = (
        _dialogues_to_text(
            dialogues
        )
    )

    speakers = sorted(
        {
            turn.get(
                "speaker_label"
            )
            for turn in dialogues
            if turn.get(
                "speaker_label"
            )
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
        "[transcribe] Speakers detected: "
        f"{speakers}"
    )

    # --------------------------------------------------------
    # Duration
    # --------------------------------------------------------

    file_duration = (
        _get_audio_file_duration(
            audio_path
        )
    )

    segment_duration = 0.0

    if dialogues:

        segment_duration = max(
            (
                float(
                    turn.get(
                        "end",
                        0.0,
                    )
                    or 0.0
                )
                for turn in dialogues
            ),
            default=0.0,
        )

    duration_seconds = (
        file_duration
        if file_duration > 0
        else segment_duration
    )

    print(
        f"[transcribe] File duration: "
        f"{file_duration:.1f}s, "
        f"segment-based: "
        f"{segment_duration:.1f}s"
    )

    return (
        transcript_text,
        duration_seconds,
        dialogues,
    )