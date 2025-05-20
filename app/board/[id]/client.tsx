"use client";

import React, { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import type { Point, Stroke } from "@/types/board";

function getBoundingBox(path: Point[]) {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (let { x, y } of path) {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}
	return { minX, minY, maxX, maxY };
}

function boxesOverlap(a: ReturnType<typeof getBoundingBox>, b: ReturnType<typeof getBoundingBox>) {
	return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

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
	const strokesRef = useRef<Stroke[]>([]);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const isDrawingRef = useRef(false);
	const currentPathRef = useRef<Point[]>([]);
	const lastPointRef = useRef<Point | null>(null);
	const [tool, setTool] = useState<"draw" | "erase">("draw");
	const [color, setColor] = useState<string>("#000000");

	useEffect(() => {
		async function fetchStrokes() {
			try {
				const res = await fetch(`/api/strokes?boardId=${boardId}`);
				const data: Stroke[] = await res.json();
				strokesRef.current = data;
				setStrokes(data);
			} catch {}
		}
		fetchStrokes();
	}, [boardId]);

	useEffect(() => {
		const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
			cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
		});
		const channel = pusher.subscribe(`board-${boardId}`);

		channel.bind("stroke", (stroke: Stroke) => {
			if (!strokesRef.current.some(s => s.id === stroke.id)) {
				strokesRef.current = [...strokesRef.current, stroke];
				setStrokes([...strokesRef.current]);
			}
		});
		channel.bind("erase", ({ id }: { id: number }) => {
			strokesRef.current = strokesRef.current.filter(s => s.id !== id);
			setStrokes([...strokesRef.current]);
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
			const path = s.path;
			ctx.moveTo(path[0].x, path[0].y);
			for (let i = 1; i < path.length; i++) {
				ctx.lineTo(path[i].x, path[i].y);
			}
			ctx.stroke();
		}
	}, [strokes]);

	const getPoint = (x: number, y: number) => {
		const rect = canvasRef.current!.getBoundingClientRect();
		return { x: x - rect.left, y: y - rect.top };
	};

	const startDrawing = (x: number, y: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		isDrawingRef.current = true;
		const pt = getPoint(x, y);
		currentPathRef.current = [pt];
		lastPointRef.current = pt;
	};

	const drawMove = (x: number, y: number) => {
		if (!isDrawingRef.current) return;
		const last = lastPointRef.current;
		if (!last) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const pt = getPoint(x, y);
		ctx.beginPath();
		ctx.strokeStyle = tool === "erase" ? "#FFFFFF" : color;
		ctx.moveTo(last.x, last.y);
		ctx.lineTo(pt.x, pt.y);
		ctx.stroke();
		currentPathRef.current.push(pt);
		lastPointRef.current = pt;
	};

	const endDrawing = async () => {
		if (!isDrawingRef.current) return;
		isDrawingRef.current = false;
		const path = currentPathRef.current;
		if (path.length === 0) return;

		if (tool === "draw") {
			const tempId = Date.now() * -1;
			const newStroke: Stroke = { id: tempId, path, color };
			strokesRef.current = [...strokesRef.current, newStroke];
			setStrokes([...strokesRef.current]);
			try {
				await fetch("/api/strokes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ boardId, path, color }),
				});
			} catch {}
		} else {
			const eraseBox = getBoundingBox(path);
			const toDelete = strokesRef.current
				.filter(s => {
					const strokeBox = getBoundingBox(s.path);
					return boxesOverlap(eraseBox, strokeBox) && pathIntersects(path, s.path);
				})
				.map(s => s.id);

			for (let id of toDelete) {
				strokesRef.current = strokesRef.current.filter(s => s.id !== id);
				setStrokes([...strokesRef.current]);
				try {
					await fetch(`/api/strokes?strokeId=${id}&boardId=${boardId}`, {
						method: "DELETE",
					});
				} catch {}
			}
		}

		currentPathRef.current = [];
		lastPointRef.current = null;
	};

	return (
		<div>
			<div className="flex flex-row items-center justify-around mb-2">
				<button
					className="py-1 px-4 rounded-md"
					onClick={() => setTool("draw")}
					style={{
						background: tool === "draw" ? "#5c5c5c" : "#FFF",
						color: tool === "draw" ? "white" : "black",
					}}
				>
					Draw
				</button>
				<button
					className="py-1 px-4 rounded-md"
					onClick={() => setTool("erase")}
					style={{
						background: tool === "erase" ? "#5c5c5c" : "#FFF",
						color: tool === "erase" ? "white" : "black",
					}}
				>
					Erase
				</button>
				<div className="flex flex-row items-center justify-center">
					<label className="text-white">Color:</label>
					<input
						type="color"
						value={color}
						onChange={e => setColor(e.target.value)}
						disabled={tool === "erase"}
						style={{
							marginLeft: 8,
							cursor: tool === "erase" ? "not-allowed" : "pointer",
						}}
					/>
				</div>
			</div>
			<canvas
				ref={canvasRef}
				width={1200}
				height={800}
				onMouseDown={e => startDrawing(e.clientX, e.clientY)}
				onMouseMove={e => drawMove(e.clientX, e.clientY)}
				onMouseUp={endDrawing}
				onMouseLeave={endDrawing}
				onTouchStart={e => {
					e.preventDefault();
					if (!e.touches.length) return;
					const t = e.touches[0];
					startDrawing(t.clientX, t.clientY);
				}}
				onTouchMove={e => {
					e.preventDefault();
					if (!isDrawingRef.current || !e.touches.length) return;
					const t = e.touches[0];
					drawMove(t.clientX, t.clientY);
				}}
				onTouchEnd={e => {
					e.preventDefault();
					endDrawing();
				}}
				onTouchCancel={e => {
					e.preventDefault();
					endDrawing();
				}}
				style={{ border: "1px solid black", cursor: "crosshair", backgroundColor: "white" }}
			/>
		</div>
	);
}
