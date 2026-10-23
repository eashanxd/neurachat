
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Check the .env file in your project root."
    )

client = Groq(api_key=api_key)

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=[
        {
            "role": "system",
            "content": (
                "You are NeuraChat, a helpful, clear, and friendly "
                "AI assistant."
            ),
        },
        {
            "role": "user",
            "content": "Introduce yourself in two sentences.",
        },
    ],
    temperature=0.7,
    max_completion_tokens=300,
)

answer = response.choices[0].message.content

print("\n--- NeuraChat response ---\n")
print(answer)
