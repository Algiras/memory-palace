#!/usr/bin/env python3
"""
Memory Palace Evaluation Framework
Compare our system against baseline methods on standard benchmarks.
"""

import os
import json
import time
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import math

# Will install these
# pip install datasets pandas numpy matplotlib scikit-learn

@dataclass
class MemoryRecord:
    """A single memory/flashcard record."""
    id: str
    question: str
    answer: str
    created: datetime
    last_review: Optional[datetime] = None
    reviews: List[dict] = field(default_factory=list)
    ease_factor: float = 2.5
    interval: int = 1
    confidence: float = 1.0
    decay_rate: float = 0.1

    # Memory Palace specific
    anchor: str = ""
    image: str = ""
    verify_token: str = ""
    smashin_score: int = 0  # How many SMASHIN SCOPE factors applied


@dataclass
class ReviewLog:
    """A single review event."""
    timestamp: datetime
    quality: int  # 1-5 rating
    response_time: float  # seconds
    recalled: bool


# =============================================================================
# BASELINE METHODS
# =============================================================================

class SM2Algorithm:
    """SuperMemo 2 - Classic spaced repetition."""

    def __init__(self):
        self.name = "SM-2"

    def calculate_interval(self, record: MemoryRecord, quality: int) -> tuple:
        """
        SM-2 algorithm implementation.
        Returns (new_interval, new_ease_factor)
        """
        ef = record.ease_factor

        # Update ease factor
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ef = max(1.3, ef)

        # Calculate interval
        if quality < 3:
            # Failed - reset
            interval = 1
        elif len(record.reviews) == 0:
            interval = 1
        elif len(record.reviews) == 1:
            interval = 6
        else:
            interval = int(record.interval * ef)

        return interval, ef

    def predict_retention(self, record: MemoryRecord, days: int) -> float:
        """Predict retention after N days (simple model)."""
        # SM-2 doesn't have explicit retention prediction
        # Using simple exponential decay as approximation
        if record.interval == 0:
            return 0.0
        return math.exp(-days / (record.interval * record.ease_factor))


class FSRSAlgorithm:
    """Free Spaced Repetition Scheduler - Modern ML-based."""

    def __init__(self):
        self.name = "FSRS"
        # Default FSRS parameters (from paper)
        self.w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]

    def calculate_interval(self, record: MemoryRecord, quality: int) -> tuple:
        """FSRS interval calculation."""
        stability = self.calculate_stability(record, quality)
        # Target 90% retention
        interval = max(1, int(stability * 0.9))
        # Update ease factor based on quality
        ef = record.ease_factor
        if quality >= 3:
            ef = min(3.0, ef + 0.1)
        else:
            ef = max(1.3, ef - 0.2)
        return interval, ef

    def calculate_stability(self, record: MemoryRecord, quality: int) -> float:
        """Calculate memory stability."""
        if len(record.reviews) == 0:
            # Initial stability based on quality
            return self.w[quality - 1] if quality <= 4 else self.w[3]

        # Stability after review
        s = record.interval  # Use interval as proxy for stability
        d = 1 / record.ease_factor  # Difficulty
        r = quality / 5.0  # Retrievability

        # Simplified FSRS formula
        new_s = s * (1 + math.exp(self.w[8]) * (11 - d) * math.pow(s, -self.w[9]) * (math.exp((1 - r) * self.w[10]) - 1))
        return max(1, new_s)

    def predict_retention(self, record: MemoryRecord, days: int) -> float:
        """FSRS retention prediction: R = exp(-t/S)"""
        stability = record.interval * record.ease_factor  # Simplified
        if stability == 0:
            return 0.0
        return math.exp(-days / stability)


class MemoryPalaceAlgorithm:
    """Our Memory Palace with SMASHIN SCOPE and Red Queen."""

    def __init__(self):
        self.name = "Memory Palace + Red Queen"
        # Decay rates by SMASHIN SCOPE score
        self.decay_by_score = {
            0: 0.20,   # No encoding
            1: 0.18,
            2: 0.15,
            3: 0.12,
            4: 0.10,
            5: 0.08,
            6: 0.06,   # Half factors
            7: 0.05,
            8: 0.04,
            9: 0.03,
            10: 0.025,
            11: 0.02,
            12: 0.015  # Full SMASHIN SCOPE
        }

    def calculate_interval(self, record: MemoryRecord, quality: int) -> tuple:
        """Memory Palace interval with SMASHIN SCOPE bonus."""
        # Base SM-2 calculation
        ef = record.ease_factor
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ef = max(1.3, ef)

        # SMASHIN SCOPE bonus: more factors = longer intervals
        smashin_bonus = 1.0 + (record.smashin_score * 0.05)  # Up to 60% bonus

        if quality < 3:
            interval = 1
        elif len(record.reviews) == 0:
            interval = int(1 * smashin_bonus)
        elif len(record.reviews) == 1:
            interval = int(6 * smashin_bonus)
        else:
            interval = int(record.interval * ef * smashin_bonus)

        return interval, ef

    def get_decay_rate(self, record: MemoryRecord) -> float:
        """Get decay rate based on SMASHIN SCOPE encoding."""
        score = min(12, max(0, record.smashin_score))
        return self.decay_by_score.get(score, 0.10)

    def predict_retention(self, record: MemoryRecord, days: int) -> float:
        """
        Memory Palace retention prediction.
        C(t) = C0 * exp(-t * decay_rate)

        Lower decay rate for higher SMASHIN SCOPE scores.
        """
        decay_rate = self.get_decay_rate(record)
        return record.confidence * math.exp(-days * decay_rate)

    def red_queen_boost(self, record: MemoryRecord) -> MemoryRecord:
        """
        Red Queen protocol: strengthen weak memories.
        Called when confidence drops below threshold.
        """
        # Simulate evolving the memory with stronger encoding
        record.smashin_score = min(12, record.smashin_score + 2)
        record.confidence = min(1.0, record.confidence + 0.15)
        record.decay_rate = self.get_decay_rate(record)
        return record


# =============================================================================
# EVALUATION METRICS
# =============================================================================

def mean_absolute_error(predictions: List[float], actuals: List[float]) -> float:
    """Calculate MAE between predicted and actual retention."""
    if len(predictions) != len(actuals):
        raise ValueError("Length mismatch")
    return sum(abs(p - a) for p, a in zip(predictions, actuals)) / len(predictions)


def retention_accuracy(predictions: List[float], actuals: List[float], threshold: float = 0.5) -> float:
    """Calculate accuracy of retention predictions (above/below threshold)."""
    correct = sum(1 for p, a in zip(predictions, actuals)
                  if (p >= threshold) == (a >= threshold))
    return correct / len(predictions)


def calculate_rmse(predictions: List[float], actuals: List[float]) -> float:
    """Root Mean Square Error."""
    mse = sum((p - a) ** 2 for p, a in zip(predictions, actuals)) / len(predictions)
    return math.sqrt(mse)


# =============================================================================
# DATASET LOADERS
# =============================================================================

def load_fsrs_sample(n_samples: int = 1000):
    """
    Load sample from FSRS-Anki dataset.
    Full dataset: open-spaced-repetition/FSRS-Anki-20k
    """
    try:
        from datasets import load_dataset

        print(f"Loading FSRS-Anki dataset (sampling {n_samples} records)...")
        dataset = load_dataset("open-spaced-repetition/FSRS-Anki-20k", split="train", streaming=True)

        samples = []
        for i, item in enumerate(dataset):
            if i >= n_samples:
                break
            samples.append(item)

        print(f"Loaded {len(samples)} samples")
        return samples
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print("Generating synthetic data instead...")
        return generate_synthetic_reviews(n_samples)


def generate_synthetic_reviews(n_samples: int = 1000) -> List[dict]:
    """Generate synthetic review data for testing."""
    import random

    samples = []
    for i in range(n_samples):
        # Simulate a card's review history
        n_reviews = random.randint(3, 20)
        reviews = []

        current_interval = 1
        current_ef = 2.5
        last_time = datetime.now() - timedelta(days=random.randint(30, 365))

        for _ in range(n_reviews):
            # Simulate review quality (weighted towards success)
            quality = random.choices([1, 2, 3, 4, 5], weights=[5, 10, 20, 35, 30])[0]

            reviews.append({
                'timestamp': last_time.isoformat(),
                'quality': quality,
                'interval': current_interval,
                'ease_factor': current_ef
            })

            # Update for next review
            if quality >= 3:
                current_interval = int(current_interval * current_ef)
            else:
                current_interval = 1

            current_ef = max(1.3, current_ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
            last_time = last_time + timedelta(days=current_interval)

        samples.append({
            'card_id': f'card_{i}',
            'reviews': reviews,
            'final_retention': random.random()  # Ground truth retention
        })

    return samples


if __name__ == "__main__":
    print("Memory Palace Evaluation Framework")
    print("=" * 50)

    # Test algorithms
    sm2 = SM2Algorithm()
    fsrs = FSRSAlgorithm()
    mp = MemoryPalaceAlgorithm()

    # Create test memory
    test_record = MemoryRecord(
        id="test-001",
        question="What is CAP theorem?",
        answer="Pick 2 of 3: Consistency, Availability, Partition tolerance",
        created=datetime.now() - timedelta(days=30),
        smashin_score=8  # Good encoding
    )

    # Predict retention at different intervals
    print("\nRetention Predictions (days since review):")
    print("-" * 50)
    print(f"{'Days':>6} | {'SM-2':>8} | {'FSRS':>8} | {'Memory Palace':>14}")
    print("-" * 50)

    for days in [1, 3, 7, 14, 30]:
        sm2_ret = sm2.predict_retention(test_record, days)
        fsrs_ret = fsrs.predict_retention(test_record, days)
        mp_ret = mp.predict_retention(test_record, days)
        print(f"{days:>6} | {sm2_ret:>8.2%} | {fsrs_ret:>8.2%} | {mp_ret:>14.2%}")

    print("\nSetup complete. Run benchmarks with: python run_benchmarks.py")
