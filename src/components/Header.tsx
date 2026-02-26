"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { HiOutlineBookmark, HiOutlineNewspaper, HiOutlineSun, HiOutlineMoon, HiArrowRightOnRectangle, HiOutlineUser } from "react-icons/hi2";

const categories = [
    { label: "All", value: "all" },
    { label: "Tech", value: "tech" },
    { label: "World", value: "world" },
    { label: "Business", value: "business" },
    { label: "Science", value: "science" },
] as const;

interface HeaderProps {
    activeCategory?: string;
    onCategoryChange?: (category: string) => void;
}

export default function Header({ activeCategory = "all", onCategoryChange }: HeaderProps) {
    const { user, logOut } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#1a1d20]/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#2bb24c] shadow-sm transition-transform group-hover:scale-105">
                        <HiOutlineNewspaper className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        NewsMarker
                    </span>
                </Link>

                {/* Category Pills */}
                {pathname === "/" && onCategoryChange && (
                    <nav className="hidden md:flex items-center gap-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => onCategoryChange(cat.value)}
                                className={`rounded-sm px-4 py-1.5 text-sm font-semibold transition-colors ${activeCategory === cat.value
                                    ? "bg-slate-100 dark:bg-slate-800 text-[#2bb24c]"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </nav>
                )}

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        aria-label="Toggle theme"
                    >
                        {isDark ? <HiOutlineSun className="h-4 w-4" /> : <HiOutlineMoon className="h-4 w-4" />}
                    </button>

                    {user ? (
                        <>
                            <Link
                                href="/bookmarks"
                                className={`flex h-8 items-center gap-2 rounded-sm px-3 text-sm font-semibold transition-colors ${pathname === "/bookmarks"
                                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-[#2bb24c]"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                <HiOutlineBookmark className="h-4 w-4" />
                                <span className="hidden sm:inline">Bookmarks</span>
                            </Link>
                            <div className="flex items-center gap-2 ml-1 pl-4 border-l border-slate-200 dark:border-slate-800">
                                <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <button
                                    onClick={logOut}
                                    className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 transition-colors"
                                    aria-label="Log out"
                                >
                                    <HiArrowRightOnRectangle className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="flex h-8 items-center gap-2 rounded-sm bg-[#2bb24c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#269d43] transition-colors"
                        >
                            <HiOutlineUser className="h-4 w-4" />
                            Sign In
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Category Pills */}
            {pathname === "/" && onCategoryChange && (
                <div className="flex md:hidden items-center gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide border-t border-slate-100 dark:border-slate-800 pt-2 bg-slate-50/50 dark:bg-[#1a1d20]/50">
                    {categories.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => onCategoryChange?.(cat.value)}
                            className={`shrink-0 rounded-sm px-4 py-1.5 text-sm font-semibold transition-colors ${activeCategory === cat.value
                                ? "bg-white dark:bg-slate-800 text-[#2bb24c] border border-slate-200 dark:border-slate-700 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-900 dark:hover:text-white"
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}
        </header>
    );
}
