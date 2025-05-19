import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { boardId, path } = await req.json();

    if (!boardId || !path) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    await prisma.stroke.create({
        data: { boardId, path },
    });

    return NextResponse.json({ success: true });
}
