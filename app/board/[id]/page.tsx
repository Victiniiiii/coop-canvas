import { prisma } from "@/lib/db";
import BoardClient from "./client";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const board = await prisma.board.findUnique({
		where: { id },
	});

	return (
		<main className="flex flex-col items-center min-h-screen w-full px-2 py-4">
			<h1 className="w-full md:max-w-screen-xl mx-auto h-10 flex items-center justify-center font-bold bg-white bg-opacity-50 rounded-md mb-4 text-black">Board {id}</h1>
			<BoardClient boardId={id} />
		</main>
	);
}
