import { GetServerSidePropsContext } from "next";
import { prisma } from "@/lib/db";
import BoardClient from "./client";

export default async function BoardPage({ params }: { params: { id: string } }) {
    const board = await prisma.board.findUnique({
        where: { id: params.id },
    });

    return (
        <main>
            <h1>Board {params.id}</h1>
            <BoardClient boardId={params.id} />
        </main>
    );
}
