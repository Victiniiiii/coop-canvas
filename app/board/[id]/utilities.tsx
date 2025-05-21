import type { Point } from "@/types/board";

export function getBoundingBox(path: Point[]) {
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

export function boxesOverlap(a: ReturnType<typeof getBoundingBox>, b: ReturnType<typeof getBoundingBox>) {
	return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
	const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
	const ab = cross(a, b, c) * cross(a, b, d);
	const cd = cross(c, d, a) * cross(c, d, b);
	return ab < 0 && cd < 0;
}

export function pathIntersects(pathA: Point[], pathB: Point[]) {
	for (let i = 1; i < pathA.length; i++) {
		for (let j = 1; j < pathB.length; j++) {
			if (segmentsIntersect(pathA[i - 1], pathA[i], pathB[j - 1], pathB[j])) {
				return true;
			}
		}
	}
	return false;
}
