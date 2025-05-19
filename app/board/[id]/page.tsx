import { prisma } from "@/lib/db";
import BoardClient from "./client";

export default async function BoardPage({ params }) {
    const { id } = params;
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
