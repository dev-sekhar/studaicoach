"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/login", data);
            const { accessToken, refreshToken, user } = response.data;
            login(accessToken, refreshToken, user);
            toast.success("Welcome back!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-background to-background">
            <Toaster position="top-center" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 rounded-2xl glass-card space-y-8"
            >
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        StudAI<span className="text-purple-500">Coach</span>
                    </h1>
                    <p className="text-muted-foreground">Sign in to your dashboard</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                {...register("email", { required: "Email is required" })}
                                placeholder="Email address"
                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-muted-foreground/50"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
                            )}
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                {...register("password", { required: "Password is required" })}
                                type="password"
                                placeholder="Password"
                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-muted-foreground/50"
                            />
                            {errors.password && (
                                <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                        Create one
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
