
import google.generativeai as genai
import os

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

print("--- AVAILABLE MODELS ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"NAME: {m.name} | DISPLAY: {m.display_name}")
except Exception as e:
    print(f"ERROR: {e}")
print("--- END ---")
