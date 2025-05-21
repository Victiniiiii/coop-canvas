"use client";

import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();

	async function createNewBoard() {
		const res = await fetch("/api/generate-id");
		const { id } = await res.json();
		router.push(`/board/${id}`);
	}

	return (
		<main className="flex flex-col justify-around items-center text-white">
			<h1 className="text-center text-7xl mt-2 text-shadow font-extrabold">Collaborative Canvas</h1>
			<p className="text-2xl text-shadow">This project is a real-time collaborative drawing board built with Next.js, TypeScript, Pusher, PostgreSQL and Supabase.</p>
			<p className="text-2xl text-shadow">No authentication required, just create or join a board by URL.</p>
			<button className="bg-blue-500 p-4 rounded-lg cursor-pointer border-white border" onClick={createNewBoard}>Create New Board</button>
		</main>
	);
}
