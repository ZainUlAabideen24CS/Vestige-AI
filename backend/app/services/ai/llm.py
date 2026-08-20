import os
from dotenv import load_dotenv

import ollama
from openai import OpenAI

load_dotenv()

PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
OLLAMA_MODEL = "phi4-mini"
GROQ_MODEL = "allam-2-7b"

SYSTEM_PROMPT = """You answer questions about a software agency's internal project history.

Rules:
- Answer ONLY from the provided context. Never use outside knowledge.
-- If the context does not contain the answer, reply with ONLY this exact sentence and nothing else, with no explanation: "I don't have enough information to answer that."
- Be concise. Two or three sentences unless more detail is genuinely needed.
- Do not invent names, dates, or technical details that are not in the context."""

_groq = None


def _groq_client() -> OpenAI:
    global _groq
    if _groq is None:
        _groq = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _groq


def generate_answer(question: str, chunks: list[str]) -> str:
    if not chunks:
        return "I don't have enough information to answer that."

    context = "\n\n---\n\n".join(f"[Source {i + 1}]\n{c}" for i, c in enumerate(chunks))
    prompt = f"Context:\n\n{context}\n\nQuestion: {question}\n\nAnswer:"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    if PROVIDER == "groq":
        res = _groq_client().chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=300,
        )
        return res.choices[0].message.content.strip()

    res = ollama.chat(
        model=OLLAMA_MODEL,
        messages=messages,
        options={"temperature": 0.1, "num_predict": 300},
        keep_alive="30m",
    )
    return res["message"]["content"].strip()