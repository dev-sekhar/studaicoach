"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Upload,
    BookOpen,
    GraduationCap,
    Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isAdmin, loading, isAuthenticated } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }



    // Role-based navigation items
    const navItems = isAdmin ? [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Subjects", href: "/dashboard/subjects", icon: GraduationCap },
        { name: "Boards", href: "/dashboard/boards", icon: Building2 },
        { name: "Users", href: "/dashboard/users", icon: Users },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ] : [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Upload Answer Sheet", href: "/dashboard/upload", icon: Upload },
        { name: "My Submissions", href: "/dashboard/answer-sheets", icon: FileText },
        { name: "My Progress", href: "/dashboard/progress", icon: BookOpen },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <div className="flex h-screen h-[100dvh] bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 256, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20"
                    >
                        <div className="p-6 flex items-center justify-between">
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                StudAICoach
                            </span>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? "bg-blue-600 text-white shadow-md"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                            }`}
                                    >
                                        <item.icon size={20} />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 px-4 py-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                                    {user?.name?.[0] || "A"}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate text-slate-900 dark:text-white">
                                        {user?.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">Sign Out</span>
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center px-6 justify-between shadow-sm z-10">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-4">
                        {/* Add header actions here if needed */}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    );
}
