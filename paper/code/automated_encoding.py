import json
import os
import sys
from dataclasses import dataclass
from typing import Optional, Dict
import random

# Mocking LLM interaction for the proof of concept if no key is present
# In a real scenario, this would import from the project's LLM utils
MOCK_RESPONSES = [
    {
        "subject": "CAP Theorem",
        "image": "Two heads (Consistency/Availability) trying to breathe fire on a partition wall, but one always chokes.",
        "factors": {
            "Substitute": "Heads for abstract concepts",
            "Movement": "Breathing fire",
            "Absurd": "Heads detaching",
            "Sensory": "Heat of fire",
            "Humor": "Choking dragon",
            "Interact": "You are the partition wall",
            "Numbers": "2 heads",
            "Symbols": "Partition as wall",
            "Color": "Red fire",
            "Oversize": "Giant heads",
            "Position": "On a bridge",
            "Emotion": "Frustration"
        }
    }
]

@dataclass
class SmashinEncoding:
    subject: str
    image: str
    factors: Dict[str, str]

class AutomatedEncoder:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
    def encode(self, concept: str, use_mock: bool = False) -> SmashinEncoding:
        """
        Generates a SMASHIN SCOPE encoding for a given concept.
        """
        print(f"Generating encoding for: {concept}...")
        
        if use_mock or not self.api_key:
            if not self.api_key and not use_mock:
                print("Warning: No API key found. Using mock generator.")
            
            # Select a mock response based on concept hash to be deterministic-ish
            seed = sum(ord(c) for c in concept)
            mock_factors = MOCK_RESPONSES[0].copy()
            mock_factors["subject"] = concept
            # We just use the same factors for demo, but we could have a library of mocks
            
            return SmashinEncoding(
                subject=mock_factors["subject"],
                image=mock_factors["image"],
                factors=mock_factors["factors"]
            )
            
        # Placeholder for actual API call
        # prompt = f"Generate 12-factor SMASHIN SCOPE for {concept}..."
        return SmashinEncoding(concept, "Pending implementation of actual API call (Set GEMINI_API_KEY)", {})

    def save_to_json(self, encoding: SmashinEncoding, filename: str):
        with open(filename, 'w') as f:
            json.dump({
                "subject": encoding.subject,
                "image": encoding.image,
                "factors": encoding.factors
            }, f, indent=2)
        print(f"Saved encoding to {filename}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python automated_encoding.py <concept> [--mock]")
        sys.exit(1)
        
    concept = sys.argv[1]
    use_mock = "--mock" in sys.argv
    
    encoder = AutomatedEncoder()
    result = encoder.encode(concept, use_mock=use_mock)
    
    print("\n--- Result ---")
    print(f"Subject: {result.subject}")
    print(f"Image: {result.image}")
    print("Factors:")
    for k, v in result.factors.items():
        print(f"  {k}: {v}")
