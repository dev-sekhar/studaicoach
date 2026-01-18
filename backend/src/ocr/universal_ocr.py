import sys
import json
import base64
import os
import argparse
from io import BytesIO
from typing import List, Dict, Any, Optional
import traceback
import time
import re

try:
    import cv2
    import numpy as np
    from PIL import Image
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

class OcrProvider:
    def process(self, file_path: str) -> Dict[str, Any]:
        raise NotImplementedError

    def _preprocess_image(self, pil_img):
        if not OPENCV_AVAILABLE:
            print("DEBUG: OpenCV not available, skipping preprocessing", file=sys.stderr)
            return pil_img

        try:
            print("DEBUG: Preprocessing image with OpenCV...", file=sys.stderr)
            # Convert PIL to OpenCV (BGR)
            open_cv_image = np.array(pil_img)
            if len(open_cv_image.shape) == 3:
                open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)

            # 1. Grayscale
            gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)

            # 2. Denoise
            denoised = cv2.fastNlMeansDenoising(gray, h=10)

            # 3. Threshold (Otsu's Binarization)
            _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            # 4. Deskew (Basic)
            coords = np.column_stack(np.where(thresh > 0))
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle

            (h, w) = open_cv_image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(open_cv_image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

            # Convert back to PIL
            rotated_rgb = cv2.cvtColor(rotated, cv2.COLOR_BGR2RGB)
            return Image.fromarray(rotated_rgb)
        except Exception as e:
            print(f"DEBUG: Preprocessing failed: {e}", file=sys.stderr)
            return pil_img

    def _convert_pdf_to_images(self, pdf_path: str, preprocess: bool = False):
        try:
            from pdf2image import convert_from_path
            print("DEBUG: Converting PDF to images...", file=sys.stderr)
            images = convert_from_path(pdf_path, dpi=200)
            print(f"DEBUG: Converted {len(images)} pages", file=sys.stderr)

            if preprocess:
                images = [self._preprocess_image(img) for img in images]

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
        """
        Robustly extracts and parses JSON from a string that might contain
        markdown code blocks, trailing commas, or other common LLM output noise.
        """
        text = text.strip()

        # 1. Remove Markdown code blocks if present
        if "```" in text:
            # Try to find content between ```json and ``` or just ``` and ```
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
            if json_match:
                text = json_match.group(1)

        text = text.strip()

        # 2. Try direct parsing
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 3. If direct fails, try to find the outermost {}
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            candidate = text[start:end+1]

            # 3.1 Pre-processing the candidate to fix common issues
            # Remove trailing commas before closing braces/brackets
            candidate = re.sub(r',\s*([\]}])', r'\1', candidate)

            try:
                return json.loads(candidate)
            except json.JSONDecodeError as e:
                print(f"DEBUG: JSON repair attempt failed: {e}", file=sys.stderr)

        # 4. Final fallback
        print("DEBUG: Could not parse JSON, returning raw text as structured object", file=sys.stderr)
        return {
            "text": text,
            "confidence": 0.4,
            "blocks": [{"text": text, "confidence": 0.4, "type": "raw_output"}],
            "formulas": [],
            "tables": [],
            "error_parsing": True
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
    def process(self, file_path: str, subject: Optional[str] = None, preprocess: bool = False) -> Dict[str, Any]:
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
            images = self._convert_pdf_to_images(file_path, preprocess=preprocess)

            subject_hint = f" The subject is {subject}." if subject else ""
            
            # Gemini accepts PIL images directly in the list
            # We construct the parts list
            parts = []
            prompt = f"""
            Analyze this document and extract ALL text (handwritten and printed).{subject_hint}
            Return a JSON object with this exact structure:
            {{
                "text": "full extracted text",
                "confidence": 0.95,
                "blocks": [{{ "text": "block text", "confidence": 0.9, "type": "handwritten or printed" }}],
                "formulas": ["LaTeX formula"],
                "tables": [{{ "markdown": "table markdown" }}]
            }}
            IMPORTANT: Return ONLY valid JSON. Focus on accuracy for {subject if subject else 'all content'}.
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
    def process(self, file_path: str, subject: Optional[str] = None, preprocess: bool = False) -> Dict[str, Any]:
        try:
            from huggingface_hub import InferenceClient
        except ImportError:
            self._fail("Missing dependency: huggingface_hub. Install: pip install huggingface_hub")

        api_key = self._get_api_key()
        model_name = self._get_model('Qwen/Qwen2.5-VL-7B-Instruct')
        
        client = InferenceClient(api_key=api_key)
        
        images = self._convert_pdf_to_images(file_path, preprocess=preprocess)
        
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

        subject_hint = f" The subject is {subject}." if subject else ""

        for idx, img in enumerate(images):
            # Debug image size
            print(f"DEBUG: Processing image size: {img.size}", file=sys.stderr, flush=True)
            data_url = f"data:image/jpeg;base64,{self._image_to_base64(img)}"

            prompt = f"""
            Extract ALL text from this page.{subject_hint}
            CRITICAL: Maintain original formatting using Markdown (headers, lists, bold).
            
            Identify:
            1. Printed Text.
            2. Handwriting (preserve placement).
            3. Formulas ($latex$) and Tables (markdown tables).
            
            Output a valid JSON object with:
            {{
                "text": "full text with markdown formatting",
                "blocks": [{{ "text": "segment", "confidence": 0.9, "type": "handwritten|printed" }}],
                "formulas": [],
                "tables": []
            }}
            """
            
            print(f"DEBUG: Prompt sent to model (Page {idx+1}): {prompt[:50]}...", file=sys.stderr, flush=True)

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            
            # Retry Logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=4096,
                        temperature=0.1
                    )
                    content = response.choices[0].message.content
                    print(f"DEBUG: Raw model response (Page {idx+1}): {content[:200]}...", file=sys.stderr, flush=True)
                    
                    # Manual construction since we dropped JSON for debugging
                    page_res = {
                        "text": content,
                        "blocks": [{"text": content, "confidence": 0.8}],
                        "formulas": [],
                        "tables": []
                    }
                    
                    # Check if page result is valid
                    if not page_res.get("text") and not page_res.get("blocks"):
                        raise Exception("Empty content returned")
                    
                    # Aggregate
                    compiled_result["text"] += f"\n\n--- Page {idx+1} ---\n\n" + page_res.get("text", "")
                    compiled_result["blocks"].extend(page_res.get("blocks", []))
                    compiled_result["formulas"].extend(page_res.get("formulas", []))
                    compiled_result["tables"].extend(page_res.get("tables", []))
                    
                    conf = page_res.get("confidence", 0)
                    if conf > 0:
                        total_confidence += conf
                        pages_processed += 1
                    
                    # Break retry loop on success
                    break
                    
                except Exception as e:
                    print(f"DEBUG: Error on page {idx+1} (Attempt {attempt+1}/{max_retries}): {str(e)}", file=sys.stderr)
                    if attempt < max_retries - 1:
                        time.sleep(2 * (attempt + 1)) # Backoff: 2s, 4s, 6s
                    else:
                        print(f"DEBUG: Failed to process page {idx+1} after retries.", file=sys.stderr)
                        compiled_result["text"] += f"\n\n--- Page {idx+1} (Failed) ---\n\n[OCR Failed for this page]"
                        # Don't fail the whole document, just mark this page as failed

            # Rate limit protection between pages
            time.sleep(1)


        if pages_processed > 0:
            compiled_result["confidence"] = total_confidence / pages_processed
            
        compiled_result["isTrustworthy"] = compiled_result["confidence"] > 0.7
        return compiled_result

def main():
    parser = argparse.ArgumentParser(description='Universal OCR Script')
    parser.add_argument('file_path', help='Path to the PDF/Image file')
    parser.add_argument('--provider', default=os.getenv('OCR_PROVIDER', 'gemini'), help='OCR provider (gemini, huggingface)')
    parser.add_argument('--subject', default=None, help='Subject hint for OCR')
    parser.add_argument('--preprocess', action='store_true', help='Apply OpenCV preprocessing')
    
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
        result = processor.process(args.file_path, subject=args.subject, preprocess=args.preprocess)
        print("DEBUG: Successfully parsed JSON", file=sys.stderr)
        print(json.dumps(result))
    except Exception as e:
        error_info = {'error': str(e), 'traceback': traceback.format_exc()}
        print(json.dumps(error_info), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
