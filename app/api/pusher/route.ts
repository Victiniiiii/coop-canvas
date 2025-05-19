import { pusher } from "@/lib/pusher";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const { boardId, update } = await req.json();

	if (!boardId || !update) {
		return NextResponse.json({ error: "Missing boardId or update" }, { status: 400 });
	}

	await pusher.trigger(`board-${boardId}`, "update", update);

	return NextResponse.json({ success: true });
}
