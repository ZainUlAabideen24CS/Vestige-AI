import os
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")


AUDIO_PATH = Path(
    r"app\uploads\44427990e1bf4e44ad1b784ce754352f.wav"
)

MODEL = "gemini-3.5-transcribe"


if not AUDIO_PATH.exists():
    raise FileNotFoundError(
        f"Audio file not found:\n{AUDIO_PATH.resolve()}"
    )


client = genai.Client(api_key=GEMINI_API_KEY)


print("=" * 70)
print("GEMINI 3.5 TRANSCRIBE DIRECT TEST")
print("=" * 70)

print(f"Audio: {AUDIO_PATH.resolve()}")
print(f"Model: {MODEL}")
print()


# ============================================================
# UPLOAD
# ============================================================

print("[1] Uploading audio...")

audio_file = client.files.upload(
    file=str(AUDIO_PATH)
)

print(f"Uploaded: {audio_file.name}")
print(f"State: {audio_file.state.name}")


# ============================================================
# WAIT
# ============================================================

print()
print("[2] Waiting for audio...")

while True:

    current_file = client.files.get(
        name=audio_file.name
    )

    state = current_file.state.name

    print(f"Audio state: {state}")

    if state == "ACTIVE":
        break

    if state == "FAILED":
        raise RuntimeError(
            f"Gemini audio processing failed: {current_file}"
        )

    time.sleep(2)


print("Audio ready.")


# ============================================================
# PROMPT
# ============================================================

prompt = r"""
Transcribe this meeting completely and verbatim.

IMPORTANT:

- Capture every audible sentence.
- Do not summarize.
- Do not omit speech.
- Do not shorten speech.
- Do not translate speech.
- Preserve the actual language spoken.

LANGUAGE RULES:

- English MUST remain in English using Latin/English characters.
- Urdu MUST remain in Urdu script.
- Do NOT write English words phonetically in Urdu script.
- Do NOT translate English into Urdu.
- Do NOT translate Urdu into English.
- Preserve Urdu-English code switching exactly.

For example:

If the speaker says:
"Exactly, the system should work directly from the meeting audio."

write:

"Exactly, the system should work directly from the meeting audio."

NOT:

"ایگزیکٹلی، دی سسٹم..."

If the speaker says Urdu mixed with English, preserve both languages.

If a word is genuinely unclear, write [unclear].

Return the complete transcription.
"""


# ============================================================
# GEMINI
# ============================================================

print()
print("[3] Sending audio to Gemini...")
print("Diarization: OFF")
print("Verification: OFF")
print()


response = client.models.generate_content(
    model=MODEL,
    contents=[
        types.Content(
            role="user",
            parts=[
                types.Part(text=prompt),
                types.Part(
                    file_data=types.FileData(
                        file_uri=current_file.uri,
                        mime_type=current_file.mime_type,
                    )
                ),
            ],
        )
    ],
)


# ============================================================
# INSPECT RESPONSE
# ============================================================

print()
print("[4] Gemini response received.")
print()

print("=" * 70)
print("RESPONSE STRUCTURE")
print("=" * 70)

print("Candidates:", len(response.candidates))


# ============================================================
# EXTRACT AUDIO TRANSCRIPTION
# ============================================================

all_transcription_text = []

for candidate_index, candidate in enumerate(
    response.candidates
):

    print()
    print(
        f"Candidate {candidate_index}"
    )

    parts = candidate.content.parts

    print(
        f"Parts: {len(parts)}"
    )

    for part_index, part in enumerate(parts):

        print()
        print(
            f"Part {part_index}"
        )

        print(
            "Has text:",
            bool(getattr(part, "text", None))
        )

        audio_transcription = getattr(
            part,
            "audio_transcription",
            None
        )

        print(
            "Has audio_transcription:",
            bool(audio_transcription)
        )

        # ----------------------------------------------------
        # AUDIO TRANSCRIPTION
        # ----------------------------------------------------

        if audio_transcription:

            print(
                "audio_transcription type:",
                type(audio_transcription)
            )

            print(
                "audio_transcription object:"
            )

            print(
                repr(audio_transcription)
            )

            # Try common transcript fields
            text_value = getattr(
                audio_transcription,
                "text",
                None
            )

            if text_value:

                all_transcription_text.append(
                    text_value
                )

            else:

                # Some SDK versions may expose the
                # transcription object differently.

                print()
                print(
                    "audio_transcription attributes:"
                )

                try:
                    print(
                        vars(audio_transcription)
                    )
                except Exception:
                    pass


# ============================================================
# FINAL DIRECT TRANSCRIPT
# ============================================================

print()
print("=" * 70)
print("DIRECT AUDIO TRANSCRIPTION")
print("=" * 70)

if all_transcription_text:

    final_text = "\n\n".join(
        all_transcription_text
    )

    print(final_text)

else:

    print(
        "[Could not find .text inside audio_transcription]"
    )


# ============================================================
# RAW RESPONSE DEBUG
# ============================================================

print()
print("=" * 70)
print("RESPONSE TEXT PROPERTY")
print("=" * 70)

try:

    print(
        repr(response.text)
    )

except Exception as e:

    print(
        "response.text error:",
        repr(e)
    )


print()
print("=" * 70)
print("TEST COMPLETE")
print("=" * 70)