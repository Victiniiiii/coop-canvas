"use client";

import { useRouter } from "next/navigation";
import { generateBoardId } from "@/lib/utils";

export default function Home() {
	const router = useRouter();

	function createNewBoard() {
		const id = generateBoardId();
		router.push(`/board/${id}`);
	}

	return (
		<main style={{ padding: "2rem" }}>
			<h1>Collaborative Canvas</h1>
			<p>This project is a real-time collaborative drawing board built with Next.js, TypeScript, Pusher, and SQLite.</p>
			<p>No authentication required — just create or join a board by URL.</p>
			<button onClick={createNewBoard}>Create New Board</button>
		</main>
	);
}
