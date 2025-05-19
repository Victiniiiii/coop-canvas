import { prisma } from "@/lib/db";
import { pusher } from "@/lib/pusher";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const boardId = req.nextUrl.searchParams.get("boardId");
	if (!boardId) {
		return NextResponse.json({ error: "Missing boardId" }, { status: 400 });
	}
	const strokes = await prisma.stroke.findMany({
		where: { boardId },
		orderBy: { createdAt: "asc" },
	});
	return NextResponse.json(strokes);
}

export async function POST(req: NextRequest) {
	const { boardId, path } = await req.json();
	if (!boardId || !path) {
		return NextResponse.json({ error: "Missing boardId or path" }, { status: 400 });
	}

	const boardExists = await prisma.board.findUnique({
		where: { id: boardId },
	});

	if (!boardExists) {
		await prisma.board.create({
			data: {
				id: boardId,
				data: {},
			},
		});
	}

	const stroke = await prisma.stroke.create({
		data: { boardId, path },
	});

	await pusher.trigger(`board-${boardId}`, "stroke", stroke);

	return NextResponse.json(stroke);
}
