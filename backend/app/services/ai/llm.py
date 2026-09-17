import time
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()


# ============================================================
# Gemini Configuration
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_TEXT_MODEL",
    "gemini-3.6-flash",
)

# Fallback model used when the primary model is temporarily
# unavailable / overloaded.
GEMINI_FALLBACK_MODEL = os.getenv(
    "GEMINI_FALLBACK_TEXT_MODEL",
    "gemini-3.5-flash-lite",
)

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set in the environment."
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# Retry Configuration
# ============================================================

MAX_RETRIES = 3

# 8s, 16s, 24s
RETRY_BASE_DELAY_SECONDS = 8.0


# ============================================================
# System Prompt
# ============================================================

SYSTEM_PROMPT = """You answer questions about a software agency's internal project history.

Rules:

- Answer ONLY from the provided context.
- Never use outside knowledge.
- If the context does not contain the answer, reply with ONLY this exact sentence:
"I don't have enough information to answer that."
- Be concise.
- Normally answer in two or three sentences unless more detail is genuinely needed.
- Do not invent names, dates, people, or technical details.
- Do not assume information that is not present in the context.
"""


# ============================================================
# Helper: Check Whether Error Is Temporary
# ============================================================

def _is_overload_error(error: Exception) -> bool:
    """
    Detect temporary Gemini server overload/unavailability errors.
    """

    error_text = str(error).upper()

    return (
        "503" in error_text
        or "UNAVAILABLE" in error_text
        or "SERVICE UNAVAILABLE" in error_text
        or "OVERLOADED" in error_text
    )


def _is_quota_error(error: Exception) -> bool:
    """
    Detect Gemini quota/rate-limit errors.
    """

    error_text = str(error).upper()

    return (
        "429" in error_text
        or "RESOURCE_EXHAUSTED" in error_text
        or "QUOTA" in error_text
    )


# ============================================================
# Helper: Generate With One Model
# ============================================================

def _generate_with_model(
    model: str,
    prompt: str,
    system_instruction: str,
    max_output_tokens: int,
    thinking_level: str,
) -> str:
    """
    Generate content using one Gemini model.

    Retries temporary 503/UNAVAILABLE errors.

    Returns the generated text.

    Raises the final exception if all retries fail.
    """

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):

        try:

            print(
                f"[llm] Using model: {model} "
                f"(attempt {attempt}/{MAX_RETRIES})"
            )

            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    max_output_tokens=max_output_tokens,
                    thinking_config=types.ThinkingConfig(
                        thinking_level=thinking_level
                    ),
                ),
            )

            # ------------------------------------------------
            # Debug information
            # ------------------------------------------------

            if response.candidates:

                candidate = response.candidates[0]

                print(
                    f"[llm] finish_reason="
                    f"{candidate.finish_reason}"
                )

            if hasattr(response, "usage_metadata"):

                usage = response.usage_metadata

                print(
                    f"[llm] prompt_tokens="
                    f"{getattr(usage, 'prompt_token_count', None)}"
                )

                print(
                    f"[llm] output_tokens="
                    f"{getattr(usage, 'candidates_token_count', None)}"
                )

                print(
                    f"[llm] total_tokens="
                    f"{getattr(usage, 'total_token_count', None)}"
                )

            # ------------------------------------------------
            # Empty response protection
            # ------------------------------------------------

            if not response.text:

                return (
                    "I don't have enough information to answer that."
                )

            return response.text.strip()

        except Exception as e:

            last_error = e

            # -----------------------------------------------
            # Quota error
            # -----------------------------------------------

            if _is_quota_error(e):

                print(
                    f"[llm] Quota/rate-limit error on "
                    f"{model}: {e}"
                )

                raise

            # -----------------------------------------------
            # Temporary overload
            # -----------------------------------------------

            if _is_overload_error(e):

                if attempt < MAX_RETRIES:

                    wait_time = (
                        RETRY_BASE_DELAY_SECONDS * attempt
                    )

                    print(
                        f"[llm] Model overloaded "
                        f"(attempt {attempt}/{MAX_RETRIES}), "
                        f"retrying in {wait_time:.0f}s..."
                    )

                    time.sleep(wait_time)

                    continue

                print(
                    f"[llm] Model {model} remained unavailable "
                    f"after {MAX_RETRIES} attempts."
                )

                raise

            # -----------------------------------------------
            # Other error
            # -----------------------------------------------

            print(
                f"[llm] Error from {model}: {e}"
            )

            raise

    raise last_error


# ============================================================
# Gemini Text Generation
# ============================================================

def _generate(
    prompt: str,
    system_instruction: str = SYSTEM_PROMPT,
    max_output_tokens: int = 800,
    thinking_level: str = "low",
) -> str:
    """
    Generate text using Gemini.

    Primary:
        gemini-3.6-flash

    Fallback:
        gemini-3.5-flash-lite

    The primary model gets up to MAX_RETRIES attempts.
    If it remains temporarily unavailable, the fallback model
    is tried.

    Quota errors are NOT silently switched around because quota
    problems can affect the API key rather than only one model.
    """

    # ========================================================
    # 1. Try Primary Model
    # ========================================================

    try:

        print(
            f"[llm] Trying primary model: "
            f"{GEMINI_MODEL}"
        )

        return _generate_with_model(
            model=GEMINI_MODEL,
            prompt=prompt,
            system_instruction=system_instruction,
            max_output_tokens=max_output_tokens,
            thinking_level=thinking_level,
        )

    except Exception as primary_error:

        # ----------------------------------------------------
        # Quota error
        # ----------------------------------------------------

        if _is_quota_error(primary_error):

            print(
                "[llm] Primary model quota/rate-limit error."
            )

            return (
                "⚠️ You have exceeded your current quota. "
                "Please check your Gemini API quota and billing details."
            )

        # ----------------------------------------------------
        # Only use fallback for temporary overload
        # ----------------------------------------------------

        if not _is_overload_error(primary_error):

            print(
                f"[llm] Primary model failed with a non-overload "
                f"error: {primary_error}"
            )

            return (
                "⚠️ Something went wrong while generating "
                "the answer. Please try again."
            )

        print(
            f"[llm] Primary model {GEMINI_MODEL} is unavailable."
        )

        # ====================================================
        # 2. Try Fallback Model
        # ====================================================

        if not GEMINI_FALLBACK_MODEL:

            print(
                "[llm] No fallback model configured."
            )

            return (
                "⚠️ Gemini is temporarily unavailable. "
                "Please try again later."
            )

        # Don't use the same model twice.
        if GEMINI_FALLBACK_MODEL == GEMINI_MODEL:

            print(
                "[llm] Fallback model is the same as primary. "
                "Skipping fallback."
            )

            return (
                "⚠️ Gemini is temporarily unavailable. "
                "Please try again later."
            )

        try:

            print(
                f"[llm] Switching to fallback model: "
                f"{GEMINI_FALLBACK_MODEL}"
            )

            return _generate_with_model(
                model=GEMINI_FALLBACK_MODEL,
                prompt=prompt,
                system_instruction=system_instruction,
                max_output_tokens=max_output_tokens,
                thinking_level=thinking_level,
            )

        except Exception as fallback_error:

            # ------------------------------------------------
            # Fallback quota
            # ------------------------------------------------

            if _is_quota_error(fallback_error):

                print(
                    "[llm] Fallback model quota/rate-limit error."
                )

                return (
                    "⚠️ You have exceeded your current Gemini "
                    "API quota. Please check your plan and "
                    "billing details."
                )

            # ------------------------------------------------
            # Both models unavailable
            # ------------------------------------------------

            print(
                "[llm] Both primary and fallback models failed."
            )

            print(
                f"[llm] Primary error: {primary_error}"
            )

            print(
                f"[llm] Fallback error: {fallback_error}"
            )

            return (
                "⚠️ Gemini is temporarily unavailable. "
                "Please try again later."
            )


# ============================================================
# RAG Answer Generation
# ============================================================

def generate_answer(
    question: str,
    chunks: list[str],
) -> str:

    if not chunks:

        return "I don't have enough information to answer that."

    context = "\n\n---\n\n".join(
        f"[Source {i + 1}]\n{chunk}"
        for i, chunk in enumerate(chunks)
    )

    prompt = f"""Context:

{context}

Question:

{question}

Answer:
"""

    return _generate(
        prompt=prompt,
        max_output_tokens=800,
        thinking_level="low",
    )


# ============================================================
# Search / Query Understanding
# ============================================================

def generate_search_query(
    question: str,
) -> str:

    prompt = f"""Convert the following user question into a concise
semantic search query for retrieving relevant chunks from a
software agency's internal meeting/project database.

Do not answer the question.

Return ONLY the search query.

Question:

{question}
"""

    return _generate(
        prompt=prompt,
        system_instruction=(
            "You generate concise search queries for an internal "
            "software project knowledge base. "
            "Return only the search query."
        ),
        max_output_tokens=100,
        thinking_level="low",
    )


# ============================================================
# Speaker Naming
# ============================================================

def identify_speaker_name(
    speaker_label: str,
    transcript: str,
) -> str:

    prompt = f"""We have a meeting transcript and a speaker label.

Speaker label:

{speaker_label}

Transcript:

{transcript}

Determine the person's name ONLY if the transcript provides
strong evidence for their name.

Rules:

- Never invent a person's name.
- Use only information present in the transcript.
- If the person's name cannot be determined, return exactly:

Unknown

- Return ONLY the person's name or Unknown.
"""

    return _generate(
        prompt=prompt,
        system_instruction=(
            "You identify meeting speakers from transcript evidence. "
            "Never guess or invent names."
        ),
        max_output_tokens=50,
        thinking_level="low",
    )


# ============================================================
# Multiple Speaker Naming
# ============================================================

def identify_speakers(
    speaker_transcripts: dict[str, str],
) -> dict[str, str]:

    transcript_text = "\n\n".join(
        f"Speaker {speaker}:\n{text}"
        for speaker, text in speaker_transcripts.items()
    )

    prompt = f"""Analyze the following meeting transcript.

{transcript_text}

Identify the real name of each speaker ONLY when the transcript
provides sufficient evidence.

Return the result in this exact format:

Speaker 1: Name

Speaker 2: Name

If a speaker's name cannot be determined, use:

Speaker 1: Unknown

Rules:

- Never invent names.
- Use only information from the transcript.
- Do not add explanations.
"""

    result = _generate(
        prompt=prompt,
        system_instruction=(
            "You identify meeting participants from transcript evidence. "
            "Never guess names."
        ),
        max_output_tokens=200,
        thinking_level="low",
    )

    speakers = {}

    for line in result.splitlines():

        if ":" not in line:
            continue

        speaker, name = line.split(":", 1)

        speaker = speaker.strip()
        name = name.strip()

        if speaker and name:
            speakers[speaker] = name

    return speakers


# ============================================================
# Summary Generation
# ============================================================

def generate_summary(
    text: str,
    title: str | None = None,
    max_output_tokens: int = 2200,
) -> str:

    print(
        f"[llm] generate_summary "
        f"max_output_tokens={max_output_tokens}"
    )

    if not text or not text.strip():

        return ""

    label = (
        f"Title: {title}\n\n"
        if title
        else ""
    )

    # ========================================================
    # Keep the complete meeting whenever possible.
    # ========================================================

    max_input_chars = 30000

    if len(text) > max_input_chars:

        print(
            f"[llm] Summary input truncated: "
            f"{len(text)} chars -> {max_input_chars} chars"
        )

        trimmed_text = text[:max_input_chars]

    else:

        trimmed_text = text

    prompt = f"""{label}Content:

{trimmed_text}

Write a detailed, structured summary of this meeting/document for
someone who was NOT present, so they can understand what happened
without reading the full transcript.

Format your response EXACTLY like this:

Overview:

<3-5 complete sentences describing the meeting, participants,
main purpose, major discussion, and overall outcome>

Key Discussion Points:

- <point 1>
- <point 2>
- <point 3>
- <continue with all genuinely important discussion points>

Decisions Made:

- <decision 1>
- <decision 2>
- <continue with important decisions>

Action Items:

- <person> will <action> <deadline if mentioned>
- <person> will <action> <deadline if mentioned>

Open Questions / Unresolved:

- <item 1>
- <item 2>

Rules:

- Use ONLY information present in the Content.
- Never invent names, numbers, dates, deadlines, or technical details.
- Include all major topics discussed.
- Include important technical details and numbers when present.
- Include the final decisions from the meeting.
- Include action items and responsible people when present.
- Include next-meeting topics when they are explicitly mentioned.
- Do NOT stop after only 2-3 discussion points.
- Every bullet must be a complete sentence.
- Never end a bullet or sentence halfway.

- If there are no action items, write:

  "No action items were assigned."

- If there were no decisions, write:

  "No decisions were finalized."

- If there are no unresolved questions, write:

  "None noted."

- Make the summary detailed but avoid unnecessary repetition.
"""

    return _generate(
        prompt=prompt,
        system_instruction=(
            "You write detailed, complete and accurate meeting summaries "
            "for an internal software agency knowledge base. "
            "The summary must cover the important discussion, decisions, "
            "action items and unresolved points from the provided content. "
            "Never invent information. "
            "Always finish every sentence and bullet point completely."
        ),
        max_output_tokens=max_output_tokens,
        thinking_level="low",
    )