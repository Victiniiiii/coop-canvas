"use client";

import React, { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import type { Point, Stroke } from "@/types/board";

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
	const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
	const ab = cross(a, b, c) * cross(a, b, d);
	const cd = cross(c, d, a) * cross(c, d, b);
	return ab < 0 && cd < 0;
}

function pathIntersects(pathA: Point[], pathB: Point[]) {
	for (let i = 1; i < pathA.length; i++) {
		for (let j = 1; j < pathB.length; j++) {
			if (segmentsIntersect(pathA[i - 1], pathA[i], pathB[j - 1], pathB[j])) {
				return true;
			}
		}
	}
	return false;
}

export default function BoardClient({ boardId }: { boardId: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [currentPath, setCurrentPath] = useState<Point[]>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [tool, setTool] = useState<"draw" | "erase">("draw");
	const [color, setColor] = useState<string>("#000000");

	useEffect(() => {
		fetch(`/api/strokes?boardId=${boardId}`)
			.then(r => r.json())
			.then((data: Stroke[]) => setStrokes(data));
	}, [boardId]);

	useEffect(() => {
		const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
			cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
		});
		const channel = pusher.subscribe(`board-${boardId}`);
		channel.bind("stroke", (stroke: Stroke) => {
			setStrokes(prev => {
				if (prev.some(s => s.id === stroke.id)) return prev;
				return [...prev, stroke];
			});
		});
		channel.bind("erase", ({ id }: { id: number }) => {
			setStrokes(prev => prev.filter(s => s.id !== id));
		});
		return () => {
			channel.unbind_all();
			pusher.unsubscribe(`board-${boardId}`);
		};
	}, [boardId]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (const s of strokes) {
			ctx.beginPath();
			ctx.strokeStyle = s.color;
			s.path.forEach((pt, i) => {
				if (i === 0) ctx.moveTo(pt.x, pt.y);
				else ctx.lineTo(pt.x, pt.y);
			});
			ctx.stroke();
		}
		if (currentPath.length) {
			ctx.beginPath();
			ctx.strokeStyle = tool === "erase" ? "#FFFFFF" : color;
			currentPath.forEach((pt, i) => {
				if (i === 0) ctx.moveTo(pt.x, pt.y);
				else ctx.lineTo(pt.x, pt.y);
			});
			ctx.stroke();
		}
	}, [strokes, currentPath, tool, color]);

	const startDrawing = (e: React.MouseEvent) => {
		setIsDrawing(true);
		const rect = canvasRef.current!.getBoundingClientRect();
		setCurrentPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
	};

	const draw = (e: React.MouseEvent) => {
		if (!isDrawing) return;
		const rect = canvasRef.current!.getBoundingClientRect();
		const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		setCurrentPath(prev => [...prev, pt]);
	};

	const endDrawing = async () => {
		if (!isDrawing || currentPath.length === 0) {
			setIsDrawing(false);
			return;
		}
		setIsDrawing(false);

		if (tool === "draw") {
			const tempId = Date.now() * -1;
			const newStroke: Stroke = { id: tempId, path: currentPath, color };
			setStrokes(prev => [...prev, newStroke]);
			fetch("/api/strokes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ boardId, path: currentPath, color }),
			}).catch(console.error);
		} else {
			const toDelete = strokes.filter(s => pathIntersects(currentPath, s.path)).map(s => s.id);
			toDelete.forEach(async id => {
				setStrokes(prev => prev.filter(s => s.id !== id));
				await fetch(`/api/strokes?strokeId=${id}&boardId=${boardId}`, {
					method: "DELETE",
				}).catch(console.error);
			});
		}

		setCurrentPath([]);
	};

	return (
		<div>
			<div className="flex flex-row items-center justify-around mb-2">
				<button className="py-1 px-4 rounded-md" onClick={() => setTool("draw")} style={{ background: tool === "draw" ? "#5c5c5c" : "#FFF", color: tool === "draw" ? "white" : "black" }}>
					Draw
				</button>
				<button className="py-1 px-4 rounded-md" onClick={() => setTool("erase")} style={{ background: tool === "erase" ? "#5c5c5c" : "#FFF", color: tool === "erase" ? "white" : "black" }}>
					Erase
				</button>
				<div className="flex flex-row items-center justify-center">
					<label className="text-white">Color:</label>
					<input type="color" value={color} onChange={e => setColor(e.target.value)} disabled={tool === "erase"} style={{ marginLeft: 8, cursor: tool === "erase" ? "not-allowed" : "pointer" }} />
				</div>
			</div>
			<canvas ref={canvasRef} width={1200} height={800} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing} style={{ border: "1px solid black", cursor: "crosshair", backgroundColor: "white" }} />
		</div>
	);
}
