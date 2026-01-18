import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface OcrBlock {
    text: string;
    confidence: number;
    boundingBox?: any;
}

export interface OcrResult {
    text: string;
    confidence: number;
    blocks: OcrBlock[];
    isTrustworthy: boolean;
}

@Injectable()
export class OcrService {
    private client: ImageAnnotatorClient;
    private ocrProvider: string;

    constructor(private configService: ConfigService) {
        // Get OCR provider from environment (default: gemini)
        this.ocrProvider = this.configService.get('OCR_PROVIDER', 'gemini');
        console.log(`🔧 OCR Service initialized with provider: ${this.ocrProvider}`);

        // Initialize Google Cloud Vision client only if needed
        if (this.ocrProvider === 'google-vision') {
            this.client = new ImageAnnotatorClient({
                apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY,
            });
        }
    }

    /**
     * Extract text from image using configured OCR provider
     */
    async extractText(imagePath: string, context: { subject?: string, preprocess?: boolean } = {}): Promise<OcrResult> {
        console.log(`🔍 Extracting text using ${this.ocrProvider}...`);

        switch (this.ocrProvider) {
            case 'gemini':
                return this.extractTextWithPython(imagePath, 'gemini', context);
            case 'huggingface':
                return this.extractTextWithPython(imagePath, 'huggingface', context);
            case 'google-vision':
                return this.extractTextWithGoogleVision(imagePath);
            default:
                console.warn(`⚠️ Unknown OCR provider: ${this.ocrProvider}, falling back to Gemini`);
                return this.extractTextWithPython(imagePath, 'gemini', context);
        }
    }

    /**
     * Extract text using Hugging Face Inference API (Qwen-VL etc.)
     */
    private async extractTextWithHuggingFace(imagePath: string): Promise<OcrResult> {
        try {
            console.log('🤗 Using Hugging Face for OCR...');
            console.log(`  File path: ${imagePath}`);

            const ocrApiKey = this.configService.get('OCR_API_KEY');
            // API Key might be optional for some public endpoints, but recommended

            const ocrModel = this.configService.get('OCR_MODEL', 'Qwen/Qwen2-VL-7B-Instruct');

            // Use external Python script
            const scriptPath = path.join(__dirname, 'huggingface_ocr.py');

            // Execute Python script
            const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${imagePath}"`, {
                env: {
                    ...process.env,
                    OCR_API_KEY: ocrApiKey,
                    OCR_MODEL: ocrModel
                }
            });

            // Log debug output
            if (stderr) {
                const debugLines = stderr.split('\n').filter(line => line.includes('DEBUG:'));
                debugLines.forEach(line => console.log(`  ${line}`));
            }

            // Check for errors
            if (stderr && stderr.includes('"error"')) {
                // Try to parse error json
                try {
                    const errorJson = JSON.parse(stderr.split('\n').find(l => l.startsWith('{')) || '{}');
                    if (errorJson.error) throw new Error(errorJson.error);
                } catch (e) {
                    // If regex fail, just log raw
                    if (stderr.includes('Traceback')) {
                        console.error('  ❌ Hugging Face Python error:', stderr);
                        throw new Error(`Hugging Face Python error: ${stderr}`);
                    }
                }
            }

            // Parse results
            const trimmedOutput = stdout.trim();
            if (!trimmedOutput) {
                console.warn('  ⚠️ Hugging Face returned empty output');
                return {
                    text: '',
                    confidence: 0,
                    blocks: [],
                    isTrustworthy: false,
                };
            }

            const result = JSON.parse(trimmedOutput);

            if (result.error) {
                throw new Error(result.error);
            }

            // Convert to OcrResult format
            const blocks: OcrBlock[] = (result.blocks || []).map((block: any) => ({
                text: block.text,
                confidence: block.confidence || 0.9,
                boundingBox: block.bbox || null,
            }));

            const fullText = result.text || blocks.map(b => b.text).join(' ');
            const avgConfidence = result.confidence || 0;

            console.log(`  ✅ Hugging Face extracted ${blocks.length} blocks, confidence: ${(avgConfidence * 100).toFixed(1)}%`);

            return {
                text: fullText,
                confidence: avgConfidence,
                blocks,
                isTrustworthy: this.calculateTrustworthiness(avgConfidence, blocks),
            };

        } catch (error) {
            console.error('❌ Hugging Face extraction failed:', error.message);
            throw new Error(`Failed to extract text with Hugging Face: ${error.message}`);
        }
    }

    /**
     * Extract text using Gemini 2.0 Flash (best for handwriting, formulas, tables)
     */
    private async extractTextWithGemini(imagePath: string): Promise<OcrResult> {
        try {
            console.log('🤖 Using Gemini 2.0 Flash for OCR...');
            console.log(`  File path: ${imagePath}`);

            const ocrApiKey = this.configService.get('OCR_API_KEY');
            if (!ocrApiKey) {
                throw new Error('OCR_API_KEY not found in environment variables');
            }

            const ocrModel = this.configService.get('OCR_MODEL', 'gemini-1.5-pro-latest');

            // Use external Python script
            const scriptPath = path.join(__dirname, 'gemini_ocr.py');

            // Execute Python script with API key and model as environment variables
            const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${imagePath}"`, {
                env: {
                    ...process.env,
                    OCR_API_KEY: ocrApiKey,
                    OCR_MODEL: ocrModel
                }
            });

            // Log debug output
            if (stderr) {
                const debugLines = stderr.split('\n').filter(line => line.includes('DEBUG:'));
                debugLines.forEach(line => console.log(`  ${line}`));
            }

            // Check for errors
            if (stderr && stderr.includes('"error"')) {
                console.error('  ❌ Gemini Python error:', stderr);
                throw new Error(`Gemini Python error: ${stderr}`);
            }

            // Parse results
            const trimmedOutput = stdout.trim();
            if (!trimmedOutput) {
                console.warn('  ⚠️ Gemini returned empty output');
                return {
                    text: '',
                    confidence: 0,
                    blocks: [],
                    isTrustworthy: false,
                };
            }

            const result = JSON.parse(trimmedOutput);

            if (result.error) {
                throw new Error(result.error);
            }

            // Convert to OcrResult format
            const blocks: OcrBlock[] = (result.blocks || []).map((block: any) => ({
                text: block.text,
                confidence: block.confidence || 0.9,
                boundingBox: block.bbox || null,
            }));

            const fullText = result.text || blocks.map(b => b.text).join(' ');
            const avgConfidence = result.confidence || (blocks.length > 0
                ? blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
                : 0);

            console.log(`  ✅ Gemini extracted ${blocks.length} text blocks, confidence: ${(avgConfidence * 100).toFixed(1)}%`);
            if (result.formulas && result.formulas.length > 0) {
                console.log(`  📐 Found ${result.formulas.length} formulas`);
            }
            if (result.tables && result.tables.length > 0) {
                console.log(`  📊 Found ${result.tables.length} tables`);
            }

            return {
                text: fullText,
                confidence: avgConfidence,
                blocks,
                isTrustworthy: this.calculateTrustworthiness(avgConfidence, blocks),
            };
        } catch (error) {
            console.error('❌ Gemini extraction failed:', error.message);
            if (error.stdout) console.error('  stdout:', error.stdout);
            if (error.stderr) console.error('  stderr:', error.stderr);
            throw new Error(`Failed to extract text with Gemini: ${error.message}`);
        }
    }

    /**
     * Extract text using Google Cloud Vision API
     */
    private async extractTextWithGoogleVision(imagePath: string): Promise<OcrResult> {
        try {
            const [result] = await this.client.textDetection(imagePath);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                return {
                    text: '',
                    confidence: 0,
                    blocks: [],
                    isTrustworthy: false,
                };
            }

            // First annotation contains the full text
            const fullText = detections[0].description || '';

            // Calculate average confidence from individual text blocks
            const confidenceScores = detections
                .slice(1) // Skip first element (full text)
                .map((d) => d.confidence || 0)
                .filter((c) => c > 0);

            const avgConfidence =
                confidenceScores.length > 0
                    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
                    : 0;

            // Extract individual blocks with positions
            const blocks: OcrBlock[] = detections.slice(1).map((detection) => ({
                text: detection.description || '',
                confidence: detection.confidence || 0,
                boundingBox: detection.boundingPoly,
            }));

            // Calculate trustworthiness
            const isTrustworthy = this.calculateTrustworthiness(avgConfidence, blocks);

            return {
                text: fullText,
                confidence: avgConfidence,
                blocks,
                isTrustworthy,
            };
        } catch (error) {
            console.error('OCR extraction failed:', error);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Calculate trustworthiness based on confidence scores
     */
    calculateTrustworthiness(avgConfidence: number, blocks: OcrBlock[]): boolean {
        // Trustworthy if:
        // 1. Average confidence > 85%
        // 2. At least 90% of blocks have confidence > 70%

        if (blocks.length === 0) return false;

        const highConfidenceBlocks = blocks.filter((b) => b.confidence > 0.7).length;
        const highConfidenceRatio = highConfidenceBlocks / blocks.length;

        return avgConfidence > 0.85 && highConfidenceRatio > 0.9;
    }
    /**
     * Extract text using the universal Python OCR script
     */
    private async extractTextWithPython(imagePath: string, provider: string, context: { subject?: string, preprocess?: boolean } = {}): Promise<OcrResult> {
        try {
            console.log(`🤖 Using ${provider} via Universal OCR Script...`);
            console.log(`  File path: ${imagePath}`);

            const ocrApiKey = this.configService.get('OCR_API_KEY');
            if (!ocrApiKey) {
                // Warning only, as some local providers or free tiers might not need it, 
                // but usually required. The Python script handles strict validation if needed.
                console.warn('⚠️ OCR_API_KEY not found in environment variables');
            }

            const ocrModel = this.configService.get('OCR_MODEL');
            const subject = context.subject || '';
            const preprocessFlag = context.preprocess ? '--preprocess' : '';

            // Use generic universal script
            const scriptPath = path.join(__dirname, 'universal_ocr.py');

            // Execute Python script
            const command = `python "${scriptPath}" "${imagePath}" --provider ${provider} --subject "${subject}" ${preprocessFlag}`;
            console.log(`  Executing: ${command}`);

            const { stdout, stderr } = await execAsync(command, {
                env: {
                    ...process.env,
                    OCR_API_KEY: ocrApiKey,
                    OCR_MODEL: ocrModel,
                    OCR_PROVIDER: provider
                }
            });

            // Log debug output
            if (stderr) {
                const debugLines = stderr.split('\n').filter(line => line.includes('DEBUG:'));
                debugLines.forEach(line => console.log(`  ${line}`));
            }

            // Check for errors
            if (stderr && stderr.includes('"error"')) {
                try {
                    const errorJson = JSON.parse(stderr.split('\n').find(l => l.startsWith('{')) || '{}');
                    if (errorJson.error) throw new Error(errorJson.error);
                } catch (e) {
                    if (stderr.includes('Traceback')) {
                        console.error('  ❌ Python script error:', stderr);
                        throw new Error(`Python script error: ${stderr}`);
                    }
                }
            }

            // Parse results
            const trimmedOutput = stdout.trim();
            if (!trimmedOutput) {
                console.warn(`  ⚠️ ${provider} returned empty output`);
                return {
                    text: '',
                    confidence: 0,
                    blocks: [],
                    isTrustworthy: false,
                };
            }

            const result = JSON.parse(trimmedOutput);
            if (result.error) throw new Error(result.error);

            // Output stats
            const blocksCount = result.blocks ? result.blocks.length : 0;
            const avgConfidence = result.confidence || 0;
            console.log(`  ✅ ${provider} extracted ${blocksCount} blocks, confidence: ${(avgConfidence * 100).toFixed(1)}%`);

            return {
                text: result.text || '',
                confidence: result.confidence || 0,
                blocks: result.blocks || [],
                isTrustworthy: result.isTrustworthy || false,
            };

        } catch (error) {
            console.error(`❌ ${provider} extraction failed:`, error.message);
            throw new Error(`Failed to extract text with ${provider}: ${error.message}`);
        }
    }

    /**
     * Perform detailed performance analysis using the separate analysis script
     */
    async performAnalysis(imagePath: string, context: { board?: string, grade?: string, subject?: string } = {}): Promise<any> {
        try {
            console.log('🧠 Starting AI Performance Analysis...');

            // Resolve script path - check dist first, then src fallback
            let scriptPath = path.join(__dirname, 'universal_analysis.py');
            if (!require('fs').existsSync(scriptPath)) {
                // Fallback to src location during dev/if not copied
                scriptPath = path.join(process.cwd(), 'src/ocr/universal_analysis.py');
                console.log(`  DO: Switching to source script path: ${scriptPath}`);
            }

            const ocrApiKey = this.configService.get('OCR_API_KEY');
            const ocrModel = this.configService.get('OCR_MODEL');

            const board = context.board || 'General';
            const grade = context.grade || 'General';
            const subject = context.subject || 'General';

            const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${imagePath}" --provider huggingface --board "${board}" --grade "${grade}" --subject "${subject}"`, {
                env: {
                    ...process.env,
                    OCR_API_KEY: ocrApiKey,
                    OCR_MODEL: ocrModel
                }
            });

            if (stderr) {
                console.log('  Analysis Debug:', stderr);
            }

            const result = JSON.parse(stdout.trim());
            console.log('  ✅ Analysis completed successfully');
            return result;

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            // Return empty analysis rather than failing the whole process
            return {
                evaluation: { total_marks: 0, obtained_marks: 0, summary_text: "Analysis failed" },
                sections: [],
                topics: []
            };
        }
    }
}
