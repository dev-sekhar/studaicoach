import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fromPath } from 'pdf2pic';

@Injectable()
export class PdfService {
    /**
     * Convert PDF to images
     * @param pdfPath Path to PDF file
     * @returns Array of image paths
     */
    async convertToImages(pdfPath: string): Promise<string[]> {
        const outputDir = path.join(path.dirname(pdfPath), 'pages');
        await fs.ensureDir(outputDir);

        try {
            // Configure pdf2pic
            const options = {
                density: 300, // DPI
                saveFilename: path.basename(pdfPath, '.pdf'),
                savePath: outputDir,
                format: 'png',
                width: 2480, // A4 at 300 DPI
                height: 3508,
            };

            const convert = fromPath(pdfPath, options);

            // Get PDF info to know number of pages
            const pdfInfo = await this.getPdfInfo(pdfPath);
            const numPages = pdfInfo.pages;

            const imagePaths: string[] = [];

            // Convert each page
            for (let i = 1; i <= numPages; i++) {
                const result = await convert(i, { responseType: 'image' });
                if (result && result.path) {
                    imagePaths.push(result.path);
                }
            }

            return imagePaths;
        } catch (error) {
            throw new Error(`Failed to convert PDF to images: ${error.message}`);
        }
    }

    /**
     * Get PDF information (number of pages, etc.)
     */
    private async getPdfInfo(pdfPath: string): Promise<{ pages: number }> {
        const pdfParse = require('pdf-parse');
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdfParse(dataBuffer);

        return {
            pages: data.numpages,
        };
    }

    /**
     * Clean up temporary image files
     */
    async cleanupImages(imagePaths: string[]): Promise<void> {
        for (const imagePath of imagePaths) {
            try {
                await fs.remove(imagePath);
            } catch (error) {
                console.error(`Failed to delete image: ${imagePath}`, error);
            }
        }

        // Also try to remove the parent directory if empty
        if (imagePaths.length > 0) {
            const dir = path.dirname(imagePaths[0]);
            try {
                const files = await fs.readdir(dir);
                if (files.length === 0) {
                    await fs.remove(dir);
                }
            } catch (error) {
                // Ignore errors
            }
        }
    }
}
