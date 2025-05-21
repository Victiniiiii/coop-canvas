"use client";

import React, { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import type { Point, Stroke } from "@/types/board";
import { getBoundingBox, boxesOverlap, pathIntersects } from "./utilities";

export default function BoardClient({ boardId }: { boardId: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const activeCanvasRef = useRef<HTMLCanvasElement>(null);
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const strokesRef = useRef<Stroke[]>([]);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const isDrawingRef = useRef(false);
	const currentPathRef = useRef<Point[]>([]);
	const lastPointRef = useRef<Point | null>(null);
	const [tool, setTool] = useState<"draw" | "erase" | "move">("draw");
	const [color, setColor] = useState<string>("#000000");
	const isLoadedRef = useRef(false);
	const operationQueueRef = useRef<Array<() => Promise<void>>>([]);
	const isProcessingQueueRef = useRef(false);
	const pendingOperationsRef = useRef(new Set<string>());
	const [isLoading, setIsLoading] = useState(true);
	const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
	const [canvasMobileMode, setCanvasMobileMode] = useState(false);

	const processQueue = async () => {
		if (isProcessingQueueRef.current || operationQueueRef.current.length === 0) return;
		isProcessingQueueRef.current = true;
		while (operationQueueRef.current.length > 0) {
			const operation = operationQueueRef.current.shift();
			if (operation) {
				try {
					await operation();
				} catch (error) {
					console.error("Error processing operation:", error);
				}
			}
		}
		isProcessingQueueRef.current = false;
	};

	const queueOperation = (operation: () => Promise<void>) => {
		operationQueueRef.current.push(operation);
		processQueue();
	};

	useEffect(() => {
		const handleResize = () => {
			const isMobile = window.innerWidth <= 768;
			setCanvasMobileMode(isMobile);

			if (isMobile) {
				setCanvasSize({ width: 1200, height: 800 });
			} else {
				const containerWidth = canvasContainerRef.current?.clientWidth || window.innerWidth - 20;
				const containerHeight = window.innerHeight - 150;
				const width = Math.min(containerWidth, 1200);
				const height = Math.min(containerHeight, 800);
				setCanvasSize({ width, height });
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		async function fetchStrokes() {
			if (pendingOperationsRef.current.has("fetch")) return;

			pendingOperationsRef.current.add("fetch");
			setIsLoading(true);
			try {
				const res = await fetch(`/api/strokes?boardId=${boardId}`);
				const data: Stroke[] = await res.json();
				strokesRef.current = data;
				setStrokes(data);
				isLoadedRef.current = true;
			} catch (error) {
				console.error("Error fetching strokes:", error);
			} finally {
				pendingOperationsRef.current.delete("fetch");
				setIsLoading(false);
			}
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

	const drawStrokes = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (const s of strokes) {
			ctx.beginPath();
			ctx.strokeStyle = s.color;
			const path = s.path;
			if (path.length === 0) continue;

			ctx.moveTo(path[0].x, path[0].y);
			for (let i = 1; i < path.length; i++) {
				ctx.lineTo(path[i].x, path[i].y);
			}
			ctx.stroke();
		}
	};

	useEffect(() => {
		drawStrokes();
	}, [strokes, canvasSize]);

	useEffect(() => {
		const activeCanvas = activeCanvasRef.current;
		if (!activeCanvas) return;

		const ctx = activeCanvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
	}, [canvasSize]);

	const getPoint = (x: number, y: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return {
			x: x - rect.left,
			y: y - rect.top,
		};
	};

	const startDrawing = (x: number, y: number) => {
		if (tool === "move") return;

		const activeCanvas = activeCanvasRef.current;
		if (!activeCanvas) return;

		isDrawingRef.current = true;
		const pt = getPoint(x, y);
		currentPathRef.current = [pt];
		lastPointRef.current = pt;
	};

	const startPanning = (x: number, y: number) => {
		if (tool !== "move") return;
		lastPanPosRef.current = { x, y };
	};

	const panMove = (x: number, y: number) => {
		if (tool !== "move" || !lastPanPosRef.current) return;

		const dx = x - lastPanPosRef.current.x;
		const dy = y - lastPanPosRef.current.y;

		if (!canvasContainerRef.current) {
			lastPanPosRef.current = { x, y };
			return;
		}

		const containerWidth = canvasContainerRef.current.clientWidth;
		const containerHeight = canvasContainerRef.current.clientHeight;
		const { width: cWidth, height: cHeight } = canvasSize;

		setPanOffset(prev => {
			let newX = prev.x + dx;
			let newY = prev.y + dy;

			if (cWidth <= containerWidth) {
				newX = 0;
			} else {
				const minX = containerWidth - cWidth;
				if (newX < minX) newX = minX;
				if (newX > 0) newX = 0;
			}

			if (cHeight <= containerHeight) {
				newY = 0;
			} else {
				const minY = containerHeight - cHeight;
				if (newY < minY) newY = minY;
				if (newY > 0) newY = 0;
			}

			return { x: newX, y: newY };
		});

		lastPanPosRef.current = { x, y };
	};

	const endPanning = () => {
		lastPanPosRef.current = null;
	};

	const drawMove = (x: number, y: number) => {
		if (!isDrawingRef.current || tool === "move") return;

		const last = lastPointRef.current;
		if (!last) return;

		const activeCanvas = activeCanvasRef.current;
		if (!activeCanvas) return;

		const ctx = activeCanvas.getContext("2d");
		if (!ctx) return;

		const pt = getPoint(x, y);

		ctx.beginPath();
		ctx.strokeStyle = tool === "erase" ? "#FFFFFF" : color;
		ctx.lineWidth = 2;
		ctx.moveTo(last.x, last.y);
		ctx.lineTo(pt.x, pt.y);
		ctx.stroke();

		currentPathRef.current.push(pt);
		lastPointRef.current = pt;
	};

	const endDrawing = () => {
		if (!isDrawingRef.current) return;
		isDrawingRef.current = false;

		const path = currentPathRef.current;
		if (path.length === 0) return;

		if (tool === "draw") {
			const activeCanvas = activeCanvasRef.current;
			if (activeCanvas) {
				const ctx = activeCanvas.getContext("2d");
				if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
			}

			const tempId = Date.now() * -1;
			const newStroke: Stroke = { id: tempId, path, color };
			strokesRef.current = [...strokesRef.current, newStroke];
			setStrokes([...strokesRef.current]);

			queueOperation(async () => {
				try {
					const res = await fetch("/api/strokes", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ boardId, path, color }),
					});

					if (!res.ok) {
						console.error("Failed to save stroke:", await res.text());
					}
				} catch (error) {
					console.error("Error saving stroke:", error);
				}
			});
		} else if (tool === "erase") {
			const activeCanvas = activeCanvasRef.current;
			if (activeCanvas) {
				const ctx = activeCanvas.getContext("2d");
				if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
			}

			const eraseBox = getBoundingBox(path);
			const toDelete = strokesRef.current
				.filter(s => {
					const strokeBox = getBoundingBox(s.path);
					return boxesOverlap(eraseBox, strokeBox) && pathIntersects(path, s.path);
				})
				.map(s => s.id);

			if (toDelete.length > 0) {
				strokesRef.current = strokesRef.current.filter(s => !toDelete.includes(s.id));
				setStrokes([...strokesRef.current]);

				for (const id of toDelete) {
					queueOperation(async () => {
						try {
							const res = await fetch(`/api/strokes?strokeId=${id}&boardId=${boardId}`, {
								method: "DELETE",
							});

							if (!res.ok) {
								console.error(`Failed to delete stroke ${id}:`, await res.text());
							}
						} catch (error) {
							console.error(`Error deleting stroke ${id}:`, error);
						}
					});
				}
			}
		}

		currentPathRef.current = [];
		lastPointRef.current = null;
	};

	return (
		<div className="w-full max-w-screen-xl mx-auto px-2">
			{isLoading ? (
				<div className="flex items-center justify-center w-full h-64">
					<div className="flex flex-col items-center justify-center">
						<div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
						<p className="mt-4 text-white text-lg">Loading board...</p>
					</div>
				</div>
			) : (
				<>
					<div className="flex flex-row flex-wrap items-center justify-around mb-2">
						<div className="flex space-x-2">
							<button className={`py-1 px-3 rounded-md ${tool === "draw" ? "bg-gray-700 text-white" : "bg-white text-black"}`} onClick={() => setTool("draw")}>
								Draw
							</button>
							<button className={`py-1 px-3 rounded-md ${tool === "erase" ? "bg-gray-700 text-white" : "bg-white text-black"}`} onClick={() => setTool("erase")}>
								Erase
							</button>
							{canvasMobileMode && (
								<button className={`py-1 px-3 rounded-md ${tool === "move" ? "bg-gray-700 text-white" : "bg-white text-black"}`} onClick={() => setTool("move")}>
									Move
								</button>
							)}
						</div>
						<div className="flex flex-row items-center justify-center">
							<label className="text-white mr-1">Color:</label>
							<input type="color" value={color} onChange={e => setColor(e.target.value)} disabled={tool === "erase" || tool === "move"} className={`${tool === "erase" || tool === "move" ? "cursor-not-allowed" : "cursor-pointer"}`} />
						</div>
					</div>

					<div ref={canvasContainerRef} className={`relative mx-auto overflow-hidden ${canvasMobileMode ? "border border-gray-400 rounded-md" : ""}`} style={canvasMobileMode ? { width: "100%", height: "70vh" } : {}}>
						<div
							style={{
								width: canvasSize.width,
								height: canvasSize.height,
								transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
								transition: tool === "move" ? "transform 0.05s ease" : "none",
							}}
							className="relative"
						>
							<canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="absolute top-0 left-0 z-10 bg-white rounded-md" />
							<canvas
								ref={activeCanvasRef}
								width={canvasSize.width}
								height={canvasSize.height}
								onMouseDown={e => {
									if (tool === "move") {
										startPanning(e.clientX, e.clientY);
									} else {
										startDrawing(e.clientX, e.clientY);
									}
								}}
								onMouseMove={e => {
									if (tool === "move") {
										panMove(e.clientX, e.clientY);
									} else {
										drawMove(e.clientX, e.clientY);
									}
								}}
								onMouseUp={e => {
									if (tool === "move") {
										endPanning();
									} else {
										endDrawing();
									}
								}}
								onMouseLeave={e => {
									if (tool === "move") {
										endPanning();
									} else {
										endDrawing();
									}
								}}
								onTouchStart={e => {
									e.preventDefault();
									if (!e.touches.length) return;
									const t = e.touches[0];
									if (tool === "move") {
										startPanning(t.clientX, t.clientY);
									} else {
										startDrawing(t.clientX, t.clientY);
									}
								}}
								onTouchMove={e => {
									e.preventDefault();
									if (!e.touches.length) return;
									const t = e.touches[0];
									if (tool === "move") {
										panMove(t.clientX, t.clientY);
									} else if (isDrawingRef.current) {
										drawMove(t.clientX, t.clientY);
									}
								}}
								onTouchEnd={e => {
									e.preventDefault();
									if (tool === "move") {
										endPanning();
									} else {
										endDrawing();
									}
								}}
								onTouchCancel={e => {
									e.preventDefault();
									if (tool === "move") {
										endPanning();
									} else {
										endDrawing();
									}
								}}
								className={`absolute top-0 left-0 z-20 bg-transparent rounded-md touch-none ${tool === "move" ? "cursor-move" : "cursor-crosshair"}`}
							/>
						</div>
					</div>

					{canvasMobileMode && tool === "move" && (
						<div className="mt-2 text-center text-white text-sm">
							<p>Drag to move the canvas. Switch back to Draw or Erase when done.</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
