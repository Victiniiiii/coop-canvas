"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);
	const [isJoining, setIsJoining] = useState(false);
	const [code, setCode] = useState("");

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

	function goToBoard() {
		const valid = /^[a-zA-Z0-9\-_]{1,}$/.test(code);
		if (!valid || code.length != 8) {
			alert("Invalid lobby code.");
			return;
		}
		setIsJoining(true);
		router.push(`/board/${code}`);
	}

	return (
		<main className="flex min-h-screen flex-col justify-center items-center p-6 bg-gradient-to-br from-gray-800 to-gray-700 text-white">
			<div className="w-full max-w-md space-y-10 text-center">
				<h1 className="text-5xl md:text-6xl font-extrabold text-shadow drop-shadow-lg">Collaborative Canvas</h1>

				<p className="text-lg md:text-xl text-shadow text-gray-300">Draw together in real-time. No accounts, just share a link or code.</p>

				<div className="space-y-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter board code" className="flex-1 p-3 rounded-lg text-black" />
						<button onClick={goToBoard} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold border border-white flex items-center justify-center disabled:opacity-70 transition" disabled={isJoining || !code}>
							{isJoining ? (
								<>
									<div className="w-4 h-4 border-2 border-t-white border-b-white border-l-transparent border-r-transparent rounded-full animate-spin mr-2"></div>
									Joining...
								</>
							) : (
								"Join Board"
							)}
						</button>
					</div>
					<button className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-semibold border border-white disabled:opacity-70 flex items-center justify-center transition" onClick={createNewBoard} disabled={isCreating}>
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
			</div>
		</main>
	);
}
