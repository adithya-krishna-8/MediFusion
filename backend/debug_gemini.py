import google.generativeai as genai
import os

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

print("--- DEBUG START ---")
try:
    print(f"Library Version: {genai.__version__}")
    print("Available Models:")
    for m in genai.list_models():
        print(f" - {m.name}")
except Exception as e:
    print(f"Error: {e}")
print("--- DEBUG END ---")
