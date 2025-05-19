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
	const { boardId, path, color } = await req.json();
	if (!boardId || !path || !color) {
		return NextResponse.json({ error: "Missing boardId, path, or color" }, { status: 400 });
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
		data: { boardId, path, color },
	});

	await pusher.trigger(`board-${boardId}`, "stroke", stroke);

	return NextResponse.json(stroke);
}

export async function DELETE(req: NextRequest) {
	const strokeId = req.nextUrl.searchParams.get("strokeId");
	const boardId = req.nextUrl.searchParams.get("boardId");
	if (!strokeId || !boardId) {
		return NextResponse.json({ error: "Missing strokeId or boardId" }, { status: 400 });
	}

	const idNum = parseInt(strokeId, 10);
	await prisma.stroke.delete({
		where: { id: idNum },
	});

	await pusher.trigger(`board-${boardId}`, "erase", { id: idNum });

	return NextResponse.json({ success: true });
}
