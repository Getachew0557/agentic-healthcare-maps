"""
Live Gemini API test — verifies the SDK connection and model availability.
Run from backend/ directory with:
    python app/tests/test_gemini_live.py
"""
import sys, os
# backend/ is two levels up from app/tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from app.core.config import settings

async def main():
    print(f"GEMINI_API_KEY set: {bool(settings.gemini_api_key)}")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)

    # First list available models
    print("\nAvailable models:")
    try:
        models = client.models.list()
        for m in models:
            if "flash" in m.name.lower() or "pro" in m.name.lower():
                print(" ", m.name)
    except Exception as e:
        print(f"  Could not list models: {e}")

    # Test with gemini-3-flash-preview
    print("\nTesting gemini-3-flash-preview...")
    try:
        def _call():
            return client.models.generate_content(
                model="gemini-3-flash-preview",
                contents="Say hello in one word",
            )
        import asyncio as _a
        r = await _a.to_thread(_call)
        print("Response:", r.text)
    except Exception as e:
        print(f"ERROR with gemini-3-flash-preview: {type(e).__name__}: {e}")

    # Test with gemini-1.5-flash (known working)
    print("\nTesting gemini-1.5-flash...")
    try:
        def _call2():
            return client.models.generate_content(
                model="gemini-1.5-flash",
                contents="Say hello in one word",
            )
        r2 = await _a.to_thread(_call2)
        print("Response:", r2.text)
    except Exception as e:
        print(f"ERROR with gemini-1.5-flash: {type(e).__name__}: {e}")

asyncio.run(main())
