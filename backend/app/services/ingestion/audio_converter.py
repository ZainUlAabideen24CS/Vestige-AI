import subprocess
from pathlib import Path

import imageio_ffmpeg


SUPPORTED_AUDIO_VIDEO = {
    ".mp3",
    ".mp4",
    ".wav",
    ".m4a",
    ".ogg",
    ".flac",
    ".aac",
    ".webm",
}


def convert_to_mp3(input_path: str) -> str:
    """
    Convert any supported audio/video file to MP3.

    If the input is already MP3, return it unchanged.

    Returns:
        Path to the MP3 file.
    """

    source = Path(input_path)

    if not source.exists():
        raise FileNotFoundError(
            f"Audio/video file not found: {source}"
        )

    extension = source.suffix.lower()

    if extension not in SUPPORTED_AUDIO_VIDEO:
        raise ValueError(
            f"Unsupported media type: {extension}"
        )

    # Already MP3
    if extension == ".mp3":
        print(
            f"[AUDIO] Already MP3, skipping conversion: "
            f"{source}"
        )
        return str(source)

    # Output filename
    output_path = source.with_suffix(".mp3")

    # FFmpeg bundled through imageio-ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    print(
        f"[AUDIO] Converting: {source.name} -> "
        f"{output_path.name}"
    )

    command = [
        ffmpeg_exe,
        "-y",
        "-i",
        str(source),

        # Audio only
        "-vn",

        # MP3
        "-acodec",
        "libmp3lame",

        # Good speech quality
        "-b:a",
        "128k",

        # Mono is enough for meeting speech
        "-ac",
        "1",

        # Standard sample rate
        "-ar",
        "16000",

        str(output_path),
    ]

    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )

    except Exception as e:
        raise RuntimeError(
            f"FFmpeg could not start: {e}"
        ) from e

    if result.returncode != 0:
        error = result.stderr[-3000:]

        raise RuntimeError(
            "Audio conversion failed.\n"
            f"FFmpeg error:\n{error}"
        )

    if not output_path.exists():
        raise RuntimeError(
            "FFmpeg reported success but MP3 file "
            "was not created."
        )

    if output_path.stat().st_size == 0:
        raise RuntimeError(
            "Converted MP3 file is empty."
        )

    print(
        f"[AUDIO] Conversion complete: "
        f"{output_path}"
    )

    # Delete original only after successful conversion
    try:
        source.unlink()
        print(
            f"[AUDIO] Removed original file: "
            f"{source.name}"
        )
    except Exception as e:
        print(
            f"[AUDIO] Could not remove original file: "
            f"{e}"
        )

    return str(output_path)