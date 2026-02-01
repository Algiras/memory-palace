import re
from dataclasses import dataclass
from typing import Tuple, List

@dataclass
class Memory:
    id: str
    content: str
    verify_token: str
    
# Sample data from the paper's domain
SAMPLE_MEMORIES = [
    Memory(
        id="mem_001", 
        content="The CAP theorem states that a distributed data store can only provide two of the following three guarantees: Consistency, Availability, and Partition Tolerance.",
        verify_token="two heads breathe"
    ),
    Memory(
        id="mem_002",
        content="Two-Phase Commit (2PC) is a distributed algorithm that coordinates all the processes that participate in a distributed atomic transaction on whether to commit or abort (roll back) the transaction.",
        verify_token="47 couples" # From SMASHIN SCOPE example
    )
]

class HallucinationVerifier:
    def __init__(self):
        pass
        
    def check(self, response: str, memory: Memory) -> Tuple[bool, str]:
        """
        Checks if the response contains the verification token.
        """
        # Normalize for case-insensitive check
        if memory.verify_token.lower() in response.lower():
            return True, "VERIFIED"
        else:
            return False, "POTENTIAL HALLUCINATION"

def run_demo():
    print("--- Memory Palace Verification Token Demo ---")
    print("Objective: Prove that simple string matching of embedded tokens detects 'ungrounded' answers.\n")
    
    verifier = HallucinationVerifier()
    
    # Scene 1: Valid Response
    memory = SAMPLE_MEMORIES[0]
    print(f"Memory Subject: CAP Theorem")
    print(f"Hidden Token: '{memory.verify_token}' (embedded in the mental image)\n")
    
    valid_response = (
        "Based on the concept of 'two heads breathe' representing Consistency and Availability "
        "struggling against Partition Tolerance, the CAP theorem states you can't have all three."
    )
    print(f"LLM Response A: \"{valid_response}\"")
    result, status = verifier.check(valid_response, memory)
    print(f"Result: [{status}] - Token found.\n")
    
    # Scene 2: Hallucinated/Ungrounded Response
    print("-" * 40)
    print(f"Memory Subject: Two-Phase Commit")
    memory = SAMPLE_MEMORIES[1]
    print(f"Hidden Token: '{memory.verify_token}'\n")
    
    hallucinated_response = (
        "Two-Phase Commit is a protocol where a coordinator asks participants if they are ready, "
        "and then tells them to commit. It ensures atomicity in distributed systems."
    ) 
    # This answer is FACTUALLY correct generally, but it proves the LLM did NOT Use *our* specific memory 
    # because it lacks the "47 couples" token. In a rigorous RAG setting, we want to know if it used retrieved context.
    
    print(f"LLM Response B: \"{hallucinated_response}\"")
    print("(Note: This answer is factually correct, but fails to use the specific retrieval context)")
    result, status = verifier.check(hallucinated_response, memory)
    print(f"Result: [{status}] - Token missing.\n")
    
    # Scene 3: User Input
    print("-" * 40)
    print("Interactive Mode:")
    print(f"Try to answer for '{memory.id}' (Token: {memory.verify_token})")
    user_response = input("Enter a response: ")
    result, status = verifier.check(user_response, memory)
    print(f"Result: [{status}]")

if __name__ == "__main__":
    run_demo()
