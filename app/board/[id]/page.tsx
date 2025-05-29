import { prisma } from "@/lib/db";
import BoardClient from "./client";
import ReturnHomeButton from "../../components/mainMenuButton";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const board = await prisma.board.findUnique({
		where: { id },
	});

	return (
		<main className="flex flex-col items-center min-h-screen w-full">
			<h1 className="w-full mx-auto h-10 flex items-center justify-center font-bold bg-white bg-opacity-50 mb-4 text-black padding40vwleft">
				<ReturnHomeButton />
				Board {id}
			</h1>
			<BoardClient boardId={id} />
		</main>
	);
}
