import sys
import json
import base64
import os
import argparse
from io import BytesIO
from typing import List, Dict, Any
import traceback
import time

class OcrProvider:
    def process(self, file_path: str) -> Dict[str, Any]:
        raise NotImplementedError

    def _convert_pdf_to_images(self, pdf_path: str):
        try:
            from pdf2image import convert_from_path
            print("DEBUG: Converting PDF to images...", file=sys.stderr)
            images = convert_from_path(pdf_path, dpi=200)
            print(f"DEBUG: Converted {len(images)} pages", file=sys.stderr)
            return images
        except ImportError:
            self._fail("Missing dependency: pdf2image. Install: pip install pdf2image")
        except Exception as e:
            self._fail(f"PDF conversion failed: {str(e)}")

    def _image_to_base64(self, image, fmt="JPEG") -> str:
        buffered = BytesIO()
        image.save(buffered, format=fmt, quality=95)
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

    def _clean_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"):
                text = "\n".join(lines[1:])
            if text.endswith("```"):
                text = text[:-3]
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1:
                try:
                    return json.loads(text[start:end+1])
                except:
                    pass
            return {
                "text": text,
                "confidence": 0.5,
                "blocks": [{"text": text, "confidence": 0.5}],
                "formulas": [],
                "tables": []
            }

    def _fail(self, message: str):
        print(json.dumps({'error': message}), file=sys.stderr)
        sys.exit(1)

    def _get_api_key(self):
        key = os.getenv('OCR_API_KEY')
        if not key:
            self._fail('OCR_API_KEY environment variable not set')
        return key

    def _get_model(self, default: str):
        return os.getenv('OCR_MODEL', default)

class GeminiProvider(OcrProvider):
    def process(self, file_path: str) -> Dict[str, Any]:
        try:
            import google.generativeai as genai
        except ImportError:
            self._fail("Missing dependency: google-generativeai. Install: pip install google-generativeai")

        api_key = self._get_api_key()
        model_name = self._get_model('gemini-1.5-pro-latest')
        
        genai.configure(api_key=api_key)
        
        try:
            print(f"DEBUG: Initializing Gemini model {model_name}...", file=sys.stderr)
            model = genai.GenerativeModel(model_name)
            images = self._convert_pdf_to_images(file_path)
            
            # Gemini accepts PIL images directly in the list
            # We construct the parts list
            parts = []
            prompt = """
            Analyze this document and extract ALL text (handwritten and printed).
            Return a JSON object with this exact structure:
            {
                "text": "full extracted text",
                "confidence": 0.95,
                "blocks": [{"text": "block text", "confidence": 0.9, "type": "handwritten or printed"}],
                "formulas": ["LaTeX formula"],
                "tables": [{"markdown": "table markdown"}]
            }
            IMPORTANT: Return ONLY valid JSON, no markdown formatting.
            """
            parts.append(prompt)
            parts.extend(images) # Gemini python SDK handles PIL images
            
            print("DEBUG: Sending to Gemini...", file=sys.stderr)
            response = model.generate_content(parts)
            print("DEBUG: Received response", file=sys.stderr)
            
            return self._clean_json(response.text)
            
        except Exception as e:
            self._fail(f"Gemini processing error: {str(e)}")

class HuggingFaceProvider(OcrProvider):
    def process(self, file_path: str) -> Dict[str, Any]:
        try:
            from huggingface_hub import InferenceClient
        except ImportError:
            self._fail("Missing dependency: huggingface_hub. Install: pip install huggingface_hub")

        api_key = self._get_api_key()
        model_name = self._get_model('Qwen/Qwen2.5-VL-7B-Instruct')
        
        client = InferenceClient(api_key=api_key)
        
        images = self._convert_pdf_to_images(file_path)
        
        compiled_result = {
            "text": "",
            "confidence": 0.0,
            "blocks": [],
            "formulas": [],
            "tables": [],
            "isTrustworthy": True
        }
        
        total_confidence = 0
        pages_processed = 0

        for idx, img in enumerate(images):
            print(f"DEBUG: Processing page {idx+1}...", file=sys.stderr)
            
            # Resize logic if needed (skipping for now)
            # Convert to data URL
            data_url = f"data:image/jpeg;base64,{self._image_to_base64(img)}"
            
            prompt = """Analyze this image and extract ALL text, formulas, and tables. 
            Return a JSON object with this EXACT structure:
            {
                "text": "full extracted string",
                "blocks": [{"text": "text segment", "confidence": 0.9}],
                "formulas": [],
                "tables": []
            }
            """
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    max_tokens=4096,
                    temperature=0.1
                )
                content = response.choices[0].message.content
                print(f"DEBUG: Raw model response (Page {idx+1}): {content[:500]}...", file=sys.stderr)
                page_res = self._clean_json(content)
                print(f"DEBUG: Parsed result (Page {idx+1}): Keys={list(page_res.keys())}, Blocks={len(page_res.get('blocks', []))}", file=sys.stderr)
                
                # Check if page result is valid
                if not page_res.get("text") and not page_res.get("blocks"):
                    print(f"DEBUG: Page {idx+1} returned empty content.", file=sys.stderr)
                    if idx == 0:
                        raise Exception("First page failed to extract any content. Aborting.")
                
                # Aggregate
                compiled_result["text"] += page_res.get("text", "") + "\n\n"
                compiled_result["blocks"].extend(page_res.get("blocks", []))
                compiled_result["formulas"].extend(page_res.get("formulas", []))
                compiled_result["tables"].extend(page_res.get("tables", []))
                
                conf = page_res.get("confidence", 0)
                if conf > 0:
                    total_confidence += conf
                    pages_processed += 1
                
                # Rate limit protection
                time.sleep(1)
                    
            except Exception as e:
                print(f"DEBUG: Error on page {idx+1}: {str(e)}", file=sys.stderr)
                if hasattr(e, 'response') and hasattr(e.response, 'text'):
                     print(f"DEBUG: API Error Detail: {e.response.text}", file=sys.stderr)
                
                # Break immediately if it's the first page or critical error
                if idx == 0:
                     self._fail(f"Critical failure on page 1: {str(e)}")


        if pages_processed > 0:
            compiled_result["confidence"] = total_confidence / pages_processed
            
        compiled_result["isTrustworthy"] = compiled_result["confidence"] > 0.7
        return compiled_result

def main():
    parser = argparse.ArgumentParser(description='Universal OCR Script')
    parser.add_argument('file_path', help='Path to the PDF/Image file')
    parser.add_argument('--provider', default=os.getenv('OCR_PROVIDER', 'gemini'), help='OCR provider (gemini, huggingface)')
    
    args = parser.parse_args()
    
    provider_map = {
        'gemini': GeminiProvider,
        'huggingface': HuggingFaceProvider
    }
    
    provider_class = provider_map.get(args.provider.lower())
    if not provider_class:
        print(json.dumps({'error': f'Unknown provider: {args.provider}'}), file=sys.stderr)
        sys.exit(1)
        
    try:
        processor = provider_class()
        result = processor.process(args.file_path)
        print("DEBUG: Successfully parsed JSON", file=sys.stderr)
        print(json.dumps(result))
    except Exception as e:
        error_info = {'error': str(e), 'traceback': traceback.format_exc()}
        print(json.dumps(error_info), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
