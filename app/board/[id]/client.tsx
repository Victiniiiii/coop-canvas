"use client";

import React, { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import type { Point } from "@/types/board";

interface Stroke {
	id: number;
	path: Point[];
}

export default function BoardClient({ boardId }: { boardId: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [currentPath, setCurrentPath] = useState<Point[]>([]);
	const [isDrawing, setIsDrawing] = useState(false);

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
			s.path.forEach((pt, i) => {
				i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
			});
			ctx.stroke();
		}

		if (currentPath.length) {
			ctx.beginPath();
			currentPath.forEach((pt, i) => {
				i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
			});
			ctx.strokeStyle = "#444";
			ctx.stroke();
			ctx.strokeStyle = "#000";
		}
	}, [strokes, currentPath]);

	// Handlers
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

		const tempId = Date.now() * -1;
		setStrokes(prev => [...prev, { id: tempId, path: currentPath }]);

		fetch("/api/strokes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ boardId, path: currentPath }),
		}).catch(console.error);

		setCurrentPath([]);
	};

	return <canvas ref={canvasRef} width={800} height={600} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing} style={{ border: "1px solid black", cursor: "crosshair" }} />;
}
