import { prisma } from "@/lib/db";
import BoardClient from "./client";

export default async function BoardPage({ params }: { params: any }) {
	const id = params.id as string;
	const board = await prisma.board.findUnique({
		where: { id },
	});

	return (
		<main>
			<h1>Board {id}</h1>
			<BoardClient boardId={id} />
		</main>
	);
}
