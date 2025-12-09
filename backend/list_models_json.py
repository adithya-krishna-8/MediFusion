
import google.generativeai as genai
import os
import json

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

models = []
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            models.append(m.name)
except Exception as e:
    models = [{"error": str(e)}]

print(json.dumps(models, indent=2))
