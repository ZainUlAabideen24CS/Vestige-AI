# import json
# from app.services.ai.llm import _groq_client

# def translate_segments(segments: list[dict], speaker_map: dict) -> list[dict]:
#     # Batch size 5 is safest for Groq 20b to avoid 400 errors
#     BATCH_SIZE = 5 
#     final_results = []
    
#     SYSTEM_PROMPT = """You are a professional meeting refiner. 
#     Refine Urdu/English mix text into professional English.
#     RULES:
#     1. If the input is in Urdu script, translate it to English.
#     2. If the input is already in English, keep it as is but fix grammar.
#     3. Output ONLY a valid JSON object mapping indices to text.
#     """

#     for i in range(0, len(segments), BATCH_SIZE):
#         batch = segments[i : i + BATCH_SIZE]
#         input_data = {str(j): s['text'] for j, s in enumerate(batch)}

#         try:
#             res = _groq_client().chat.completions.create(
#                 model="openai/gpt-oss-20b",
#                 messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": json.dumps(input_data)}],
#                 response_format={"type": "json_object"},
#                 temperature=0.1,
#                 max_tokens=2000 # Increased tokens
#             )
#             data = json.loads(res.choices[0].message.content)
            
#             for j, s in enumerate(batch):
#                 s["text_en"] = data.get(str(j), s['text'])
#                 label = s['speaker_label']
#                 s["speaker_name"] = speaker_map.get(label, {}).get("name", "Speaker")
#                 final_results.append(s)
#         except Exception as e:
#             print(f"[translate] Batch Error: {e}")
#             for s in batch:
#                 s["text_en"] = s['text']
#                 s["speaker_name"] = speaker_map.get(s['speaker_label'], {}).get("name", "Speaker")
#                 final_results.append(s)
#     return final_results