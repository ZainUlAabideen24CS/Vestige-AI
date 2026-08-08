def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    step = chunk_size - overlap

    while start < len(words):
        chunk = " ".join(words[start : start + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        start += step

    return chunks