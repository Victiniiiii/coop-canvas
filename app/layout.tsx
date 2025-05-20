import "./globals.css";
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
    title: "Co-op Canvas",
    description: "Real-time collaborative canvas app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
