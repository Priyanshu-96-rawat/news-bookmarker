"use client";

import { useState } from "react";
import { Article } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import BookmarkButton from "./BookmarkButton";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";

interface ArticleCardProps {
    article: Article;
    isBookmarked: boolean;
    onToggleBookmark: (article: Article) => void;
    onTagClick?: (tag: string) => void;
}

const sourceColors: Record<string, string> = {
    BBC: "bg-red-500",
    CNN: "bg-orange-500",
    TechCrunch: "bg-emerald-500",
    "The Guardian": "bg-blue-600",
    "Al Jazeera": "bg-amber-600",
    "Hacker News": "bg-orange-600",
    NPR: "bg-sky-500",
    Wired: "bg-fuchsia-500",
    "The Hindu": "bg-indigo-500",
};

const sentimentConfig = {
    positive: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Positive" },
    negative: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30", label: "Negative" },
    neutral: { color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", label: "Neutral" },
};

const tagColors = [
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
];

function getTagColor(index: number): string {
    return tagColors[index % tagColors.length];
}

function getSourceColor(source: string): string {
    return sourceColors[source] || "bg-slate-500";
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
        return dateStr;
    }
}

export default function ArticleCard({ article, isBookmarked, onToggleBookmark, onTagClick }: ArticleCardProps) {
    const { user } = useAuth();
    const [imgError, setImgError] = useState(false);

    const placeholderGradients: Record<string, string> = {
        tech: "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
        world: "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
        business: "from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
    };

    const sentiment = article.sentiment ? sentimentConfig[article.sentiment] : null;

    return (
        <article className="group flex flex-col overflow-hidden bg-white dark:bg-[#1a1d20] border-b border-slate-200 dark:border-slate-800 sm:border sm:rounded-md transition-shadow duration-200 hover:shadow-md">
            {/* Thumbnail */}
            {article.imageUrl && !imgError ? (
                <div className="relative aspect-[16/9] overflow-hidden border-b border-slate-100 dark:border-slate-800">
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="h-full w-full object-cover"
                        onError={() => setImgError(true)}
                    />
                    {/* Category styling - Feedly style */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <div className="rounded-sm bg-[#2bb24c] px-2 py-0.5 shadow-sm">
                            <span className="text-[10px] uppercase font-bold text-white tracking-wider">{article.category}</span>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Content */}
            <div className="flex flex-1 flex-col p-4 sm:p-5">
                {/* Source & Date Row */}
                <div className="flex items-center gap-2 mb-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${getSourceColor(article.source)}`} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{article.source}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">• {formatDate(article.pubDate)}</span>
                </div>

                <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white mb-2 group-hover:text-[#2bb24c] transition-colors line-clamp-2">
                    {article.title}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                    {article.description}
                </p>

                {/* Tags and Sentiment Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {sentiment && (
                        <div className={`rounded-sm ${sentiment.bg} px-2 py-0.5`}>
                            <span className={`text-[10px] uppercase font-bold tracking-wide ${sentiment.color}`}>{sentiment.label}</span>
                        </div>
                    )}

                    {article.aiTags && article.aiTags.length > 0 && (
                        <>
                            {article.aiTags.slice(0, 3).map((tag, i) => (
                                <button
                                    key={tag}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTagClick?.(tag);
                                    }}
                                    className={`rounded-sm border px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wide transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer ${getTagColor(i)}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#2bb24c] dark:hover:text-[#2bb24c] transition-colors flex items-center gap-1 uppercase tracking-wide"
                    >
                        Read Full Article <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
                    </a>

                    <div className="flex items-center">
                        {user && (
                            <div className="text-slate-400 hover:text-[#2bb24c] transition-colors">
                                <BookmarkButton
                                    isBookmarked={isBookmarked}
                                    onClick={() => onToggleBookmark(article)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
