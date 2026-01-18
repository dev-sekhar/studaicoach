import sys
import json
import base64
import os
import argparse
from io import BytesIO
import traceback
import time
from typing import Dict, Any, List

class AnalysisProvider:
    def process(self, file_path: str, board: str = "General", grade: str = "General", subject: str = "General") -> Dict[str, Any]:
        raise NotImplementedError

    # ... (rest of helper methods same)

    def _convert_pdf_to_images(self, pdf_path: str):
        try:
            from pdf2image import convert_from_path
            print("DEBUG: Converting PDF to images for analysis...", file=sys.stderr)
            images = convert_from_path(pdf_path, dpi=200)
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
        
        for idx, img in enumerate(images):
            print(f"DEBUG: Analyzing page {idx+1} for {board} Grade {grade} {subject}...", file=sys.stderr)
            data_url = f"data:image/jpeg;base64,{self._image_to_base64(img)}"
            
            prompt = f"""
            You are an expert ACADEMIC COACH for {board} Board, Grade {grade}, Subject: {subject}.
            
            Task: Analyze this page and provide a performance report.
            
            CRITICAL: Map all topics strictly to the official {board} {subject} syllabus.
            Valid Syllabus Topics likely include terms specific to {subject} (e.g. for Physics: "Optics", "Mechanics"; for Math: "Calculus", "Vectors").
            
            Identify:
            1. Section Names (if any).
            2. Question Types.
            3. Marks obtained.
            4. Topics (Map questions to {board} syllabus topics).

            Output strictly valid JSON:
            {{
                "page_summary": "Coach's thought on this page",
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
                "total_marks_page": 0,
                "obtained_marks_page": 0
            }}
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
            
            # Retry Logic
            max_retries = 3
            page_success = False
            for attempt in range(max_retries):
                try:
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=4096,
                        temperature=0.1
                    )
                    content = response.choices[0].message.content
                    print(f"DEBUG: Raw Analysis (Page {idx+1}): {content[:100]}...", file=sys.stderr)
                    
                    # Cleanup and Parse JSON
                    try:
                        cleaned = content.replace('```json', '').replace('```', '').strip()
                        page_res = json.loads(cleaned)
                        
                        # Merge Logic
                        full_analysis["evaluation"]["total_marks"] += page_res.get("total_marks_page", 0)
                        full_analysis["evaluation"]["obtained_marks"] += page_res.get("obtained_marks_page", 0)
                        if page_res.get("page_summary"):
                            full_analysis["evaluation"]["summary_text"] += f"Page {idx+1}: {page_res['page_summary']} "
                            
                        full_analysis["sections"].extend(page_res.get("sections", []))
                        full_analysis["topics"].extend(page_res.get("topics", []))
                        page_success = True
                        break # Success
                        
                    except Exception as e:
                        print(f"DEBUG: Failed to parse page analysis (Attempt {attempt+1}): {e}", file=sys.stderr)
                        if attempt == max_retries - 1:
                            print(f"DEBUG: Skipping page {idx+1} analysis after parsing failures.", file=sys.stderr)

                except Exception as e:
                    print(f"DEBUG: Analysis error page {idx+1} (Attempt {attempt+1}): {e}", file=sys.stderr)
                    if attempt < max_retries - 1:
                        time.sleep(2 * (attempt + 1))
            
            if not page_success:
                 full_analysis["evaluation"]["summary_text"] += f" [Analysis Failed for Page {idx+1}]"

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
