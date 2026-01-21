import sys
import json
import base64
import os
import argparse
from io import BytesIO
import traceback
import time
import re
from typing import Dict, Any, List, Optional

try:
    import cv2
    import numpy as np
    from PIL import Image
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

class AnalysisProvider:
    def process(self, file_path: str, board: str = "General", grade: str = "General", subject: str = "General") -> Dict[str, Any]:
        raise NotImplementedError

    def _preprocess_image(self, pil_img, max_dim: int = 1500):
        if not OPENCV_AVAILABLE:
            print("DEBUG: OpenCV not available, skipping preprocessing", file=sys.stderr)
            return pil_img

        try:
            print(f"DEBUG: Preprocessing image with OpenCV (max_dim={max_dim})...", file=sys.stderr)
            # Convert PIL to OpenCV (BGR)
            open_cv_image = np.array(pil_img)
            if len(open_cv_image.shape) == 3:
                open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)

            (h, w) = open_cv_image.shape[:2]

            # 0. Resize if too large
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                print(f"DEBUG: Resizing from {w}x{h} to {new_w}x{new_h}", file=sys.stderr)
                open_cv_image = cv2.resize(open_cv_image, (new_w, new_h), interpolation=cv2.INTER_AREA)
                (h, w) = open_cv_image.shape[:2]

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

    def _convert_pdf_to_images(self, pdf_path: str, preprocess: bool = True):
        try:
            from pdf2image import convert_from_path
            print("DEBUG: Converting PDF to images for analysis...", file=sys.stderr)
            images = convert_from_path(pdf_path, dpi=200)

            if preprocess:
                images = [self._preprocess_image(img) for img in images]

            return images
        except ImportError:
            self._fail("Missing dependency: pdf2image")
        except Exception as e:
            self._fail(f"PDF conversion failed: {str(e)}")

    def _image_to_base64(self, image, fmt="JPEG") -> str:
        buffered = BytesIO()
        image.save(buffered, format=fmt, quality=95)
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def _fail(self, message: str):
        print(json.dumps({'error': message}), file=sys.stderr)
        sys.exit(1)

    def _get_api_key(self):
        return os.getenv('OCR_API_KEY')
    
    def _get_model(self, default: str):
        return os.getenv('OCR_MODEL', default)

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

        return None

class HuggingFaceAnalyzer(AnalysisProvider):
    def process(self, file_path: str, board: str = "General", grade: str = "General", subject: str = "General") -> Dict[str, Any]:
        try:
            from huggingface_hub import InferenceClient
        except ImportError:
            self._fail("Missing dependency: huggingface_hub")

        api_key = self._get_api_key()
        model_name = self._get_model('Qwen/Qwen2.5-VL-7B-Instruct')
        
        client = InferenceClient(api_key=api_key)
        images = self._convert_pdf_to_images(file_path)
        
        full_analysis = {
            "evaluation": {
                "total_marks": 0,
                "obtained_marks": 0,
                "summary_text": ""
            },
            "sections": [],
            "topics": []
        }
        
        chunk_size = 4
        for i in range(0, len(images), chunk_size):
            chunk = images[i:i + chunk_size]
            page_start = i + 1
            page_end = i + len(chunk)

            print(f"DEBUG: Analyzing pages {page_start}-{page_end} for {board} Grade {grade} {subject}...", file=sys.stderr)

            content_parts = []
            for img in chunk:
                data_url = f"data:image/jpeg;base64,{self._image_to_base64(img)}"
                content_parts.append({"type": "image_url", "image_url": {"url": data_url}})
            
            prompt = f"""
            You are an expert ACADEMIC COACH for {board} Board, Grade {grade}, Subject: {subject}.
            
            Task: Analyze these {len(chunk)} pages and provide a performance report.
            
            CRITICAL: Map all topics strictly to the official {board} {subject} syllabus.
            Valid Syllabus Topics likely include terms specific to {subject} (e.g. for Physics: "Optics", "Mechanics"; for Math: "Calculus", "Vectors").
            
            Identify:
            1. Section Names (if any).
            2. Question Types.
            3. Marks obtained.
            4. Topics (Map questions to {board} syllabus topics).

            Output strictly valid JSON:
            {{
                "summary": "Coach's thought on these pages",
                "sections": [
                    {{
                        "name": "Derived Section Name",
                        "question_type": "MCQ/Subjective",
                        "correct": 0,
                        "wrong": 0,
                        "skipped": 0,
                        "marks_obtained": 0,
                        "details": "Brief details"
                    }}
                ],
                "topics": [
                    {{"name": "Syllabus Topic Name", "status": "Strong/Weak/Average", "remarks": "Advice based on {board} standards"}}
                ],
                "total_marks": 0,
                "obtained_marks": 0
            }}
            """
            content_parts.append({"type": "text", "text": prompt})
            
            messages = [
                {
                    "role": "user",
                    "content": content_parts
                }
            ]
            
            # Retry Logic
            max_retries = 3
            chunk_success = False
            for attempt in range(max_retries):
                try:
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=4096,
                        temperature=0.1
                    )
                    content = response.choices[0].message.content
                    print(f"DEBUG: Raw Analysis (Pages {page_start}-{page_end}): {content[:100]}...", file=sys.stderr)
                    
                    # Cleanup and Parse JSON
                    try:
                        chunk_res = self._clean_json(content)
                        if chunk_res is None:
                            raise Exception("Could not find valid JSON in output")
                        
                        # Merge Logic
                        full_analysis["evaluation"]["total_marks"] += chunk_res.get("total_marks", 0)
                        full_analysis["evaluation"]["obtained_marks"] += chunk_res.get("obtained_marks", 0)
                        if chunk_res.get("summary"):
                            full_analysis["evaluation"]["summary_text"] += f"Pages {page_start}-{page_end}: {chunk_res['summary']} "
                            
                        full_analysis["sections"].extend(chunk_res.get("sections", []))
                        full_analysis["topics"].extend(chunk_res.get("topics", []))
                        chunk_success = True
                        break # Success
                        
                    except Exception as e:
                        print(f"DEBUG: Failed to parse chunk analysis (Attempt {attempt+1}): {e}", file=sys.stderr)
                        if attempt == max_retries - 1:
                            print(f"DEBUG: Skipping pages {page_start}-{page_end} analysis after parsing failures.", file=sys.stderr)

                except Exception as e:
                    error_msg = str(e)
                    print(f"DEBUG: Analysis error pages {page_start}-{page_end} (Attempt {attempt+1}): {error_msg}", file=sys.stderr)

                    if "402" in error_msg or "Payment Required" in error_msg:
                        print(f"DEBUG: Quota exceeded for analysis. Stopping.", file=sys.stderr)
                        full_analysis["evaluation"]["summary_text"] += " [Analysis stopped: Quota exceeded]"
                        return full_analysis

                    if attempt < max_retries - 1:
                        wait_time = 5 * (attempt + 1)
                        print(f"DEBUG: Waiting {wait_time}s before retry...", file=sys.stderr)
                        time.sleep(wait_time)
            
            if not chunk_success:
                 full_analysis["evaluation"]["summary_text"] += f" [Analysis Failed for Pages {page_start}-{page_end}]"

            time.sleep(1) # Rate limit protection

        return full_analysis

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('file_path')
    parser.add_argument('--provider', default='huggingface')
    parser.add_argument('--board', default='General')
    parser.add_argument('--grade', default='General')
    parser.add_argument('--subject', default='General')
    args = parser.parse_args()
    
    if args.provider == 'huggingface':
        analyzer = HuggingFaceAnalyzer()
        # Pass metadata to process method (requires updating interface)
        print(json.dumps(analyzer.process(args.file_path, args.board, args.grade, args.subject)))
    else:
        print(json.dumps({"error": "Only huggingface supported for analysis currently"}))

if __name__ == '__main__':
    main()
