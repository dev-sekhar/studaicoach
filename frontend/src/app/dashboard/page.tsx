"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Upload, FileText, BarChart2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { user } = useAuth();

    const cards = [
        {
            title: "Upload Answer Sheet",
            description: "Upload PDF or image files for AI grading",
            icon: Upload,
            href: "/dashboard/upload",
            color: "from-purple-500 to-indigo-500",
        },
        {
            title: "View Results",
            description: "Check analysis and grades for uploaded sheets",
            icon: FileText,
            href: "/dashboard/answer-sheets",
            color: "from-pink-500 to-rose-500",
        },
        {
            title: "Analytics",
            description: "Track performance and progress over time",
            icon: BarChart2,
            href: "/dashboard/analytics",
            color: "from-blue-500 to-cyan-500",
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Welcome back, <span className="text-purple-400">{user?.name}</span>
                    </h1>
                    <p className="text-muted-foreground">Here's what you can do today.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card, index) => (
                        <Link key={index} href={card.href}>
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="p-6 rounded-2xl glass-card border border-white/5 hover:border-white/20 transition-all cursor-pointer h-full group"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <card.icon className="text-white" size={24} />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                                <p className="text-muted-foreground text-sm">{card.description}</p>
                            </motion.div>
                        </Link>
                    ))}
                </div>

                {/* Recent Activity Section could go here */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                        No recent activity to show.
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
