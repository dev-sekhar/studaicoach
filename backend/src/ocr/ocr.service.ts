import { Injectable } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';

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

    constructor() {
        // Initialize Google Cloud Vision client with API key
        this.client = new ImageAnnotatorClient({
            // Use API key from environment variable
            apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY,
        });
    }

    /**
     * Extract text from image using Google Cloud Vision API
     */
    async extractText(imagePath: string): Promise<OcrResult> {
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
}
