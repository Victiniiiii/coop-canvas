import { prisma } from "@/lib/db";
import BoardClient from "./client";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const board = await prisma.board.findUnique({
		where: { id },
	});

	return (
		<main className="flex flex-col items-center text-center">
			<h1 className="w-[100vw] h-10 flex items-center justify-center font-bold bg-[rgb(255,255,255,0.5)] mb-5">Board {id}</h1>
			<BoardClient boardId={id} />
		</main>
	);
}
