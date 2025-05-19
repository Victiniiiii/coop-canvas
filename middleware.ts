import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BOARD_ID_REGEX = /^[a-zA-Z0-9-_]{8,}$/;

export function middleware(req: NextRequest) {
	const url = req.nextUrl.clone();

	if (url.pathname.startsWith("/board/")) {
		const parts = url.pathname.split("/");
		const boardId = parts[2];

		if (!boardId || !BOARD_ID_REGEX.test(boardId)) {
			url.pathname = "/404";
			return NextResponse.rewrite(url);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/board/:path*"],
};
