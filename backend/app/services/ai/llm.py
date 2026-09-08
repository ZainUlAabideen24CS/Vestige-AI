import os
from dotenv import load_dotenv
from google import genai

load_dotenv()


# ============================================================
# Gemini Configuration
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_TEXT_MODEL",
    "gemini-3.6-flash"
)

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set in the environment."
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)


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
# Gemini Text Generation
# ============================================================

def _generate(
    prompt: str,
    system_instruction: str = SYSTEM_PROMPT,
    max_output_tokens: int = 300,
) -> str:

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "system_instruction": system_instruction,
            "max_output_tokens": max_output_tokens,
        },
    )

    if not response.text:
        return "I don't have enough information to answer that."

    return response.text.strip()


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
        max_output_tokens=300,
    )


# ============================================================
# Search / Query Understanding
# ============================================================

def generate_search_query(question: str) -> str:

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