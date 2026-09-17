import os
import json
import re
import time

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL = os.getenv(
    "GEMINI_TEXT_MODEL",
    "gemini-3.6-flash",
)

# Retry behavior for transient server overload (503 UNAVAILABLE)
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 8.0


def _clean_name(name: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        str(name).strip(),
    )


def _transcript_for_gemini(turns):
    lines = []

    for turn in turns:

        speaker = turn.get(
            "speaker_label",
            "UNKNOWN",
        )

        text = turn.get(
            "text",
            "",
        ).strip()

        if text:
            lines.append(
                f"{speaker}: {text}"
            )

    return "\n".join(lines)


def _parse_json(text):
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

    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:

        try:
            return json.loads(
                text[start:end + 1]
            )
        except Exception:
            pass

    return None


def _fallback_mapping(turns):
    """
    Safe fallback if Gemini fails (including after retries are
    exhausted on a persistent overload).
    """

    speakers = []

    for turn in turns:

        label = turn.get(
            "speaker_label"
        )

        if (
            label
            and label not in speakers
        ):
            speakers.append(label)

    result = {}

    for index, label in enumerate(
        speakers,
        start=1,
    ):

        result[label] = {
            "name": f"Speaker {index}",
            "user_id": None,
            "confidence": "unknown",
            "reason": "gemini_naming_failed",
        }

    return result


def _call_gemini_with_retry(prompt: str):
    """
    Calls Gemini for speaker identification, automatically retrying
    on transient server overload (503 UNAVAILABLE) with increasing
    backoff before giving up.
    """

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):

        try:
            return client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                ),
            )

        except Exception as e:
            last_error = e
            error_text = str(e)
            is_overload = "503" in error_text or "UNAVAILABLE" in error_text

            if is_overload and attempt < MAX_RETRIES:
                wait_time = RETRY_BASE_DELAY_SECONDS * attempt
                print(
                    f"[speaker_naming] Model overloaded (attempt "
                    f"{attempt}/{MAX_RETRIES}), retrying in "
                    f"{wait_time:.0f}s..."
                )
                time.sleep(wait_time)
                continue

            raise last_error

    raise last_error


def map_speakers(
    db,
    turns,
    participants,
):
    """
    Identify speaker names using Gemini.

    Examples Gemini must understand:

        "میں عزیر ہوں"
            -> Uzair

        "میں رمضان ہوں"
            -> Ramzan

        "اور میں زین ہوں"
            -> Zain

        "رمضان بھائی..."
            -> supporting evidence that speaker is Ramzan

    Names are NEVER assigned simply according to
    Speaker 1 / Speaker 2 ordering.
    """

    if not turns:
        return {}

    transcript = _transcript_for_gemini(
        turns
    )

    participant_names = [
        _clean_name(name)
        for name in (
            participants or ""
        ).split(",")
        if name.strip()
    ]

    participants_text = ", ".join(
        participant_names
    )

    prompt = f"""
You are identifying the real names of speakers in a meeting.

You have a diarized transcript.

The transcript contains Urdu, English, and code-switching.

Your job is ONLY speaker identity resolution.

Do NOT rewrite the transcript.

Do NOT translate it.

Do NOT transliterate it.

Do NOT infer names merely from speaker order.

PARTICIPANTS PROVIDED BY THE APPLICATION:

{participants_text or "No participant list was provided."}

TRANSCRIPT:

{transcript}

IDENTITY RULES:

1. Strongest evidence is self-introduction.

English examples:

"My name is Uzair."
"I am Uzair."
"I'm Uzair."
"This is Uzair."

Urdu examples:

"میں عزیر ہوں"
"میرا نام عزیر ہے"
"میں رمضان ہوں"
"اور میں زین ہوں"

These MUST be treated as strong/high-confidence evidence.

2. A speaker mentioning another speaker's name is supporting evidence.

Example:

Speaker A:
"رمضان بھائی ابھی سٹاک کا ریکارڈ کس طرح مینٹین ہوتا ہے"

This strongly suggests that the person being addressed is Ramzan,
but do not automatically assume Speaker A is Ramzan.

3. If a participant explicitly identifies themselves, assign that
name to that speaker.

4. If one speaker is identified and there are exactly as many
detected speakers as participant names, the remaining unmatched
participant can be assigned ONLY when the one-to-one mapping is
logically forced.

5. Never map names simply because:
   Speaker 1 = first participant
   Speaker 2 = second participant

6. If the evidence is insufficient, use:
   "Speaker 1"
   "Speaker 2"
   "Speaker 3"

7. Do not invent names.

8. Preserve the exact speaker labels from the transcript.

Return ONLY JSON in this format:

{{
  "SPEAKER_00": {{
    "name": "Uzair",
    "confidence": "high",
    "reason": "explicit_self_introduction"
  }},
  "SPEAKER_01": {{
    "name": "Ramzan",
    "confidence": "high",
    "reason": "explicit_self_introduction"
  }},
  "SPEAKER_02": {{
    "name": "Zain",
    "confidence": "high",
    "reason": "explicit_self_introduction"
  }}
}}

If a name cannot be reliably identified, use:

{{
  "name": "Speaker 1",
  "confidence": "unknown",
  "reason": "no_reliable_name_evidence"
}}
"""

    try:

        print(
            f"[speaker_naming] Asking Gemini "
            f"({MODEL}) to identify speakers..."
        )

        response = _call_gemini_with_retry(prompt)

        response_text = getattr(
            response,
            "text",
            "",
        )

        if not response_text:
            print(
                "[speaker_naming] Gemini returned empty response."
            )

            return _fallback_mapping(
                turns
            )

        data = _parse_json(
            response_text
        )

        if not isinstance(data, dict):

            print(
                "[speaker_naming] Invalid Gemini JSON."
            )

            return _fallback_mapping(
                turns
            )

        # ----------------------------------------------------
        # Make sure every detected speaker has a mapping
        # ----------------------------------------------------

        detected_speakers = []

        for turn in turns:

            label = turn.get(
                "speaker_label"
            )

            if (
                label
                and label not in detected_speakers
            ):
                detected_speakers.append(
                    label
                )

        result = {}

        used_names = set()

        for index, label in enumerate(
            detected_speakers,
            start=1,
        ):

            item = data.get(
                label
            )

            if not isinstance(
                item,
                dict,
            ):
                item = {}

            name = _clean_name(
                item.get(
                    "name",
                    "",
                )
            )

            confidence = item.get(
                "confidence",
                "unknown",
            )

            reason = item.get(
                "reason",
                "no_reliable_name_evidence",
            )

            # Don't accept empty names
            if not name:
                name = f"Speaker {index}"

            # Prevent Gemini from assigning the
            # same real name to multiple speakers.
            normalized = name.lower()

            if (
                normalized in used_names
                and not name.lower().startswith(
                    "speaker "
                )
            ):
                name = f"Speaker {index}"
                confidence = "unknown"
                reason = "duplicate_name_prevented"

            used_names.add(
                name.lower()
            )

            result[label] = {
                "name": name,
                "user_id": None,
                "confidence": confidence,
                "reason": reason,
            }

        print(
            "[speaker_naming] Final mapping:",
            result,
        )

        return result

    except Exception as e:

        print(
            f"[speaker_naming] Gemini error: {e}"
        )

        return _fallback_mapping(
            turns
        )