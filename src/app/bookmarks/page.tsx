"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import ArticleCard from "@/components/ArticleCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getBookmarks, removeBookmark } from "@/services/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { Bookmark, CategoryFilter, Article } from "@/types";
import { HiOutlineBookmark, HiOutlineFunnel } from "react-icons/hi2";
import Link from "next/link";

function BookmarksContent() {
    const { user } = useAuth();
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [category, setCategory] = useState<CategoryFilter>("all");
    const [loading, setLoading] = useState(true);

    const fetchBookmarks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const result = await getBookmarks(user.uid, category);
        if (result.success && result.data) {
            setBookmarks(result.data.bookmarks);
        }
        setLoading(false);
    }, [user, category]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const handleRemove = async (article: Article) => {
        // Optimistic removal
        setBookmarks((prev) => prev.filter((b) => b.articleId !== article.articleId));
        const result = await removeBookmark(article.articleId);
        if (!result.success) {
            // Re-fetch on failure
            fetchBookmarks();
        }
    };

    const categories = [
        { label: "All", value: "all" },
        { label: "Tech", value: "tech" },
        { label: "World", value: "world" },
        { label: "Business", value: "business" },
        { label: "Science", value: "science" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#1a1d20]">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                {/* Page Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#2bb24c]/10 dark:bg-[#2bb24c]/20">
                            <HiOutlineBookmark className="h-5 w-5 text-[#2bb24c]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Bookmarks</h1>
                                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {bookmarks.length}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Your saved articles</p>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
                        <div className="flex items-center gap-1 rounded-sm bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200 dark:border-slate-700/50">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    onClick={() => setCategory(cat.value as CategoryFilter)}
                                    className={`rounded-sm px-3 py-1 text-xs font-semibold transition-colors ${category === cat.value
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-600/50"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <LoadingSpinner text="Loading your bookmarks..." />
                ) : bookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4">
                            <HiOutlineBookmark className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No bookmarks yet</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center max-w-sm">
                            Start saving articles from the feed and they&apos;ll appear here for easy access.
                        </p>
                        <Link href="/" className="btn-primary max-w-[200px] text-center">
                            Browse News
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-slide-up">
                        {bookmarks.map((bookmark) => (
                            <ArticleCard
                                key={bookmark.articleId}
                                article={bookmark}
                                isBookmarked={true}
                                onToggleBookmark={handleRemove}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function BookmarksPage() {
    return (
        <ProtectedRoute>
            <BookmarksContent />
        </ProtectedRoute>
    );
}
