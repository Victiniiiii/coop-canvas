import { prisma } from "@/lib/db";
import BoardClient from "./client";

interface PageProps {
	params: { id: string };
}

export default async function BoardPage({ params }: PageProps) {
    const { id } = await params;
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
