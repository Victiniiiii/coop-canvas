import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const boardId = req.nextUrl.searchParams.get('boardId');

    if (!boardId) {
        return NextResponse.json({ error: 'Missing boardId' }, { status: 400 });
    }

    const strokes = await prisma.stroke.findMany({
        where: { boardId },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(strokes);
}
