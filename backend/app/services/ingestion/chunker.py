def chunk_text(text: str, chunk_size: int = 80, overlap: int = 15) -> list[str]:
    """Standard word-based chunking for documents."""
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


def chunk_turns(turns: list[dict], max_words: int = 180, overlap_turns: int = 1) -> list[str]:
    """
    Groups turns into chunks with speaker names and overlap.
    Ensures chunks don't exceed model limits.
    """
    chunks: list[str] = []
    current_chunk_turns: list[str] = []
    current_word_count = 0

    for i, t in enumerate(turns):
        speaker = t.get('speaker_name', 'Unknown')
        text = t.get('text_en', '') or t.get('text', '')
        line = f"{speaker}: {text}"
        
        words_in_line = line.split()
        n = len(words_in_line)

        # ISSUE FIX: Agar aik hi banda itna lamba bolay ke limit cross ho jaye
        if n > max_words:
            # Pehle purana chunk save karein
            if current_chunk_turns:
                chunks.append("\n".join(current_chunk_turns))
                current_chunk_turns, current_word_count = [], 0
            
            # Is lambay turn ko chote pieces mein split karein
            sub_chunks = chunk_text(line, chunk_size=max_words, overlap=20)
            chunks.extend(sub_chunks)
            continue

        # Check if adding this turn exceeds chunk limit
        if current_word_count + n > max_words and current_chunk_turns:
            chunks.append("\n".join(current_chunk_turns))
            
            # OVERLAP LOGIC: Agla chunk pichli 1-2 lines se shuru karein context ke liye
            overlap_index = max(0, len(current_chunk_turns) - overlap_turns)
            current_chunk_turns = current_chunk_turns[overlap_index:]
            current_word_count = sum(len(x.split()) for x in current_chunk_turns)

        current_chunk_turns.append(line)
        current_word_count += n

    if current_chunk_turns:
        chunks.append("\n".join(current_chunk_turns))

    return chunks