import ollama

MODEL = "phi4-mini"

SYSTEM_PROMPT = """You answer questions about a software agency's internal project history.

Rules:
- Answer ONLY from the provided context. Never use outside knowledge.
- If the context does not contain the answer, say exactly: "I don't have enough information to answer that."
- Be concise. Two or three sentences unless more detail is genuinely needed.
- Do not invent names, dates, or technical details that are not in the context.
- Answer ONLY the single question that was asked. Do not generate additional questions, follow-up questions, or their answers.
- Stop writing as soon as the question is answered. Do not continue with more content."""


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
        options={"temperature": 0.1, "num_predict": 150},
    )

    answer = response["message"]["content"].strip()

    # Model sometimes keeps generating extra Q&A after the real answer.
    # Cut off at the first sign of it re-starting the pattern.
    for marker in ["\nQuestion:", "\nQ:", "\n\nQuestion", "Question:"]:
        if marker in answer:
            answer = answer.split(marker)[0].strip()
            break

    return answer