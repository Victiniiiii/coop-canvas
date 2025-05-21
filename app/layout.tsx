import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
	title: "Co-op Canvas",
	description: "Real-time collaborative canvas app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
			</head>
			<body className="bg-gradient-to-br from-blue-900 to-purple-800 text-white">
				{children}
				<Analytics />
			</body>
		</html>
	);
}
