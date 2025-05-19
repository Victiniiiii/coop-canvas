export interface Point {
	x: number;
	y: number;
}

export interface BoardData {
	points: Point[];
}

export interface Stroke {
    id: number;
    path: Point[];
	color: string;
}
