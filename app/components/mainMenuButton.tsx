"use client";

export default function ReturnHomeButton() {
	return (
		<button onClick={() => (window.location.href = "/")} className="fixed top-0 left-0 z-50 flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 transition">
			<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l9-9 9 9M4 10v10h5v-6h6v6h5V10" />
			</svg>
			Return Home
		</button>
	);
}
