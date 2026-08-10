import ollama

MODEL = "phi4-mini"

SYSTEM_PROMPT = """You answer questions about a software agency's internal project history.

Rules:
- Answer ONLY from the provided context. Never use outside knowledge.
- If the context does not contain the answer, say exactly: "I don't have enough information to answer that."
- Be concise. Two or three sentences unless more detail is genuinely needed.
- Do not invent names, dates, or technical details that are not in the context."""


def generate_answer(question: str, chunks: list[str]) -> str:
    if not chunks:
        return "I don't have enough information to answer that."

    context = "\n\n---\n\n".join(f"[Source {i + 1}]\n{c}" for i, c in enumerate(chunks))

    prompt = f"""Context:

{context}

Question: {question}

Answer:"""

    response = ollama.chat(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        options={"temperature": 0.1, "num_predict": 300},
    )
    return response["message"]["content"].strip()