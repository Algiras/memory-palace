#!/usr/bin/env python3
"""
Generate voiceover for Memory Palace explainer video using Kokoro TTS.
"""

import os
from pathlib import Path

try:
    from kokoro_onnx import Kokoro
    import soundfile as sf
    import numpy as np
except ImportError:
    print("Installing dependencies...")
    import subprocess
    subprocess.check_call(["pip", "install", "kokoro-onnx", "soundfile", "numpy"])
    from kokoro_onnx import Kokoro
    import soundfile as sf
    import numpy as np

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Scene scripts - concise narration for each scene
SCENES = [
    {
        "id": "01-intro",
        "text": "Memory Palace. Ancient wisdom meets modern AI. A revolutionary approach to knowledge management.",
    },
    {
        "id": "02-problem",
        "text": "Large language models face two critical problems. Context overflow, loading hundreds of kilobytes per query. And hallucination, confidently generating false information.",
    },
    {
        "id": "03-smashin",
        "text": "SMASHIN SCOPE encoding transforms abstract concepts into unforgettable images using twelve factors. Substitute, Movement, Absurd, Sensory, Humor, Interact, Numbers, Symbols, Color, Oversize, Position, and Emotion.",
    },
    {
        "id": "04-hierarchy",
        "text": "The hierarchical memory index reduces context by ninety-seven percent. From five hundred kilobytes down to just two and a half kilobytes per query. Enabling efficient scaling to thousands of memories.",
    },
    {
        "id": "05-verification",
        "text": "Verification tokens provide deterministic hallucination detection. With an F1 score of point nine two, six hundred times cheaper than existing methods like FActScore.",
    },
    {
        "id": "06-redqueen",
        "text": "The Red Queen Protocol, named after Lewis Carroll's Through the Looking Glass, uses four agents to continuously test and strengthen memories. Examiner, Learner, Evaluator, and Evolver.",
    },
    {
        "id": "07-benchmarks",
        "text": "On the MTEB benchmark, Memory Palace achieves fifty-six percent with zero trainable parameters. Competitive with billion-parameter models from Google, OpenAI, and leading Chinese providers.",
    },
    {
        "id": "08-outro",
        "text": "Get started today. Install with npx skills add, then specify memory-palace. Ancient wisdom meets modern AI.",
    },
]


def generate_audio():
    """Generate voiceover audio for all scenes."""
    print("Initializing Kokoro TTS...")

    # Model paths
    model_dir = Path(__file__).parent.parent / "models"
    model_path = model_dir / "kokoro-v1.0.onnx"
    voices_path = model_dir / "voices-v1.0.bin"

    # Initialize Kokoro with model files
    kokoro = Kokoro(str(model_path), str(voices_path))

    print(f"Generating audio for {len(SCENES)} scenes...")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    for scene in SCENES:
        output_path = OUTPUT_DIR / f"{scene['id']}.wav"

        # Skip if already exists
        if output_path.exists():
            print(f"✓ {scene['id']} already exists, skipping")
            continue

        print(f"Generating: {scene['id']}...")
        print(f"  Text: {scene['text'][:60]}...")

        try:
            # Generate audio
            samples, sample_rate = kokoro.create(
                scene["text"],
                voice="af_heart",  # American female, warm voice
                speed=0.95,  # Slightly slower for clarity
            )

            # Save as WAV
            sf.write(str(output_path), samples, sample_rate)

            # Get duration
            duration = len(samples) / sample_rate
            print(f"  ✓ Saved: {output_path.name} ({duration:.1f}s)")

        except Exception as e:
            print(f"  ✗ Error: {e}")

    print()
    print("Done! Audio files saved to:", OUTPUT_DIR)

    # Print config for Remotion
    print()
    print("=== Audio Config for Remotion ===")
    print()
    for scene in SCENES:
        wav_path = OUTPUT_DIR / f"{scene['id']}.wav"
        if wav_path.exists():
            data, sr = sf.read(str(wav_path))
            duration_frames = int(len(data) / sr * 30)  # 30 fps
            print(f'  {{ id: "{scene["id"]}", file: "{scene["id"]}.wav", frames: {duration_frames} }},')


if __name__ == "__main__":
    generate_audio()
