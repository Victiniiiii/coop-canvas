"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);

	async function createNewBoard() {
		setIsCreating(true);
		try {
			const res = await fetch("/api/generate-id");
			const { id } = await res.json();
			router.push(`/board/${id}`);
		} catch (error) {
			console.error("Error creating board:", error);
			setIsCreating(false);
		}
	}

	return (
		<main className="flex min-h-screen flex-col justify-center items-center p-4 text-white">
			<div className="max-w-md w-full space-y-8 text-center">
				<h1 className="text-center text-4xl md:text-6xl mt-2 text-shadow font-extrabold">Collaborative Canvas</h1>

				<p className="text-lg md:text-xl text-shadow">A real-time collaborative drawing board built with Next.js, TypeScript, Pusher, PostgreSQL and Supabase.</p>

				<p className="text-lg text-shadow">No authentication required, just create or join a board by URL.</p>

				<button className="w-full bg-blue-500 p-4 rounded-lg cursor-pointer border-white border disabled:opacity-70 flex items-center justify-center" onClick={createNewBoard} disabled={isCreating}>
					{isCreating ? (
						<>
							<div className="w-5 h-5 border-2 border-t-white border-b-white border-l-transparent border-r-transparent rounded-full animate-spin mr-2"></div>
							Creating Board...
						</>
					) : (
						"Create New Board"
					)}
				</button>
			</div>
		</main>
	);
}
