"use client";

import { useEffect, useState } from "react";

interface SplashLoaderProps {
    isLoading: boolean;
}

export default function SplashLoader({ isLoading }: SplashLoaderProps) {
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            // Start fade-out animation
            setFadeOut(true);
            // Remove from DOM after animation completes
            const timer = setTimeout(() => setVisible(false), 700);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#1a1d20] transition-all duration-700 ${fadeOut ? "opacity-0 scale-105" : "opacity-100 scale-100"
                }`}
        >
            {/* Logo + Brand */}
            <div className="flex flex-col items-center gap-6 animate-fade-in">
                {/* Animated logo icon */}
                <div className="relative">
                    {/* Pulsing ring */}
                    <div className="absolute inset-0 rounded-xl bg-[#2bb24c]/20 animate-ping" style={{ animationDuration: "2s" }} />
                    {/* Outer glow */}
                    <div className="absolute -inset-3 rounded-2xl bg-[#2bb24c]/10 blur-xl animate-pulse" />
                    {/* Logo container */}
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-[#2bb24c] shadow-lg shadow-[#2bb24c]/25">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                        </svg>
                    </div>
                </div>

                {/* Brand name */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    News<span className="text-[#2bb24c]">Marker</span>
                </h1>

                {/* Loading bar */}
                <div className="w-48 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2bb24c] to-emerald-400"
                        style={{
                            animation: "loadingBar 1.8s ease-in-out infinite",
                        }}
                    />
                </div>

                {/* Loading text */}
                <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                    Fetching latest articles...
                </p>
            </div>

            {/* Source badges */}
            <div className="mt-10 flex flex-wrap justify-center gap-2 max-w-xs animate-fade-in" style={{ animationDelay: "0.3s" }}>
                {["BBC", "CNN", "TechCrunch", "The Guardian", "Al Jazeera", "NPR"].map((source, i) => (
                    <span
                        key={source}
                        className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400"
                        style={{
                            animation: `fadeInUp 0.5s ease-out ${0.1 * i}s both`,
                        }}
                    >
                        {source}
                    </span>
                ))}
            </div>

            {/* Inline styles for animations */}
            <style jsx>{`
                @keyframes loadingBar {
                    0% { width: 0%; margin-left: 0; }
                    50% { width: 70%; margin-left: 15%; }
                    100% { width: 0%; margin-left: 100%; }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
