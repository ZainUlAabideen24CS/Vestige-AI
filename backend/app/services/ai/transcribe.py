from faster_whisper import WhisperModel

MODEL_SIZE = "base"
_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return _model


def transcribe(audio_path: str) -> tuple[str, float]:
    model = get_model()
    segments, info = model.transcribe(audio_path, beam_size=1, vad_filter=True)
    text = " ".join(seg.text.strip() for seg in segments)
    return text.strip(), info.duration