export function generateBoardId(length = 8) {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
	let id = "";

	for (let i = 0; i < length; i++) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
    
	return id;
}
