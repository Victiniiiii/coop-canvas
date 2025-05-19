import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function randomId(length = 8): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
	let id = "";
	for (let i = 0; i < length; i++) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return id;
}

export async function GET() {
	try {
		let id: string;
		let exists: boolean;

		do {
			id = randomId();
			const board = await prisma.board.findUnique({ where: { id } });
			exists = !!board;
		} while (exists);

		return NextResponse.json({ id });
	} catch (err) {
		console.error("[/api/generate-id] error:", err);
		return NextResponse.json({ error: "internal server error, check logs" }, { status: 500 });
	}
}
