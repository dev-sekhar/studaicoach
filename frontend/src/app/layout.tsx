import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "StudAICoach - Super Admin Dashboard",
    description: "SaaS Platform Administration",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <QueryProvider>
                    {/* Wrapped in QueryProvider for performance */}
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </QueryProvider>
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
