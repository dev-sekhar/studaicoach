import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DOCS_PATH = path.join(process.cwd(), '..', 'docs', 'implementation_plan.md');

export async function GET() {
    try {
        const content = await fs.readFile(DOCS_PATH, 'utf-8');
        return NextResponse.json({ content });
    } catch (error) {
        console.error('Error reading implementation plan:', error);
        return NextResponse.json(
            { error: 'Failed to read implementation plan' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { error: 'Invalid content' },
                { status: 400 }
            );
        }

        await fs.writeFile(DOCS_PATH, content, 'utf-8');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error writing implementation plan:', error);
        return NextResponse.json(
            { error: 'Failed to save implementation plan' },
            { status: 500 }
        );
    }
}
