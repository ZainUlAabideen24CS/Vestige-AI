import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

PROVIDER = os.getenv("WHISPER_PROVIDER", "local")
GROQ_WHISPER_MODEL = "whisper-large-v3"

_groq = None
_local = None


def _groq_client() -> OpenAI:
    global _groq
    if _groq is None:
        _groq = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _groq


def _local_model():
    global _local
    if _local is None:
        from faster_whisper import WhisperModel
        _local = WhisperModel("base", device="cpu", compute_type="int8")
    return _local


def transcribe(audio_path: str, vocabulary_hint: str | None = None) -> tuple[str, float]:
    if PROVIDER == "groq":
        with open(audio_path, "rb") as f:
            res = _groq_client().audio.translations.create(
                file=(os.path.basename(audio_path), f.read()),
                model=GROQ_WHISPER_MODEL,
                prompt=vocabulary_hint or "",
                response_format="verbose_json",
            )
        text = res.text.strip()
        duration = getattr(res, "duration", 0.0) or 0.0
        return text, float(duration)

    model = _local_model()
    segments, info = model.transcribe(
        audio_path,
        beam_size=1,
        vad_filter=True,
        initial_prompt=vocabulary_hint,
    )
    text = " ".join(seg.text.strip() for seg in segments)
    return text.strip(), info.duration