"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import ArticleCard from "@/components/ArticleCard";
import LoadingSpinner from "@/components/LoadingSpinner";

import dynamic from "next/dynamic";

const DynamicSplashLoader = dynamic(() => import("@/components/SplashLoader"), { ssr: false });
import { getNewsFeed } from "@/services/feedService";
import { addBookmark, removeBookmark, getBookmarks } from "@/services/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { Article, CategoryFilter } from "@/types";
import { HiOutlineSignal, HiOutlineExclamationTriangle, HiOutlineSparkles, HiXMark } from "react-icons/hi2";

export default function HomePage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [activeAiTag, setActiveAiTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  // Fetch news feed
  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getNewsFeed(category);
    if (result.success && result.data) {
      setArticles(result.data.articles);
    } else {
      setError(result.message);
      setArticles([]);
    }
    setLoading(false);
    isInitialLoad.current = false;
  }, [category]);

  // Fetch user's bookmarks
  const fetchBookmarkIds = useCallback(async () => {
    if (!user) {
      setBookmarkedIds(new Set());
      return;
    }
    const result = await getBookmarks(user.uid);
    if (result.success && result.data) {
      setBookmarkedIds(new Set(result.data.bookmarks.map((b) => b.articleId)));
    }
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    fetchBookmarkIds();
  }, [fetchBookmarkIds]);

  const handleToggleBookmark = async (article: Article) => {
    if (!user) return;
    const isCurrentlyBookmarked = bookmarkedIds.has(article.articleId);

    // Optimistic update
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyBookmarked) {
        next.delete(article.articleId);
      } else {
        next.add(article.articleId);
      }
      return next;
    });

    if (isCurrentlyBookmarked) {
      const result = await removeBookmark(article.articleId);
      if (!result.success) {
        setBookmarkedIds((prev) => new Set(prev).add(article.articleId));
      }
    } else {
      const result = await addBookmark(article);
      if (!result.success) {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(article.articleId);
          return next;
        });
      }
    }
  };

  // Filter articles by AI tag
  const filteredArticles = activeAiTag
    ? articles.filter((a) => a.aiTags?.includes(activeAiTag))
    : articles;

  // Collect all unique AI tags from current articles
  const availableTags = Array.from(
    new Set(articles.flatMap((a) => a.aiTags || []))
  ).sort();

  return (
    <>
      <DynamicSplashLoader isLoading={loading && isInitialLoad.current} />
      <div className="min-h-screen bg-slate-50 dark:bg-[#1a1d20]">
        <Header activeCategory={category} onCategoryChange={(c) => { setCategory(c as CategoryFilter); setActiveAiTag(null); }} />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Page Header */}
          <div className="mb-6 animate-fade-in border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#2bb24c]/10 dark:bg-[#2bb24c]/20">
                <HiOutlineSignal className="h-5 w-5 text-[#2bb24c]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Latest News</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Curated stories from BBC, CNN & TechCrunch
                </p>
              </div>
            </div>
          </div>

          {/* AI Tags Filter Bar */}
          {availableTags.length > 0 && (
            <div className="mb-6 animate-fade-in">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <HiOutlineSparkles className="h-4 w-4" />
                  <span>AI Tags</span>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveAiTag(activeAiTag === tag ? null : tag)}
                    className={`shrink-0 rounded-sm border px-3 py-1 text-xs font-semibold transition-colors ${activeAiTag === tag
                      ? "bg-[#2bb24c] text-white border-[#2bb24c]"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
                {activeAiTag && (
                  <button
                    onClick={() => setActiveAiTag(null)}
                    className="shrink-0 flex items-center gap-1 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <HiXMark className="h-3 w-3" />
                    Clear filter
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Tag Indicator */}
          {activeAiTag && (
            <div className="mb-6 flex items-center gap-2 animate-fade-in">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Showing articles tagged</span>
              <span className="rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                {activeAiTag}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-500">
                ({filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"})
              </span>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <LoadingSpinner text="Fetching latest articles..." />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-red-50 dark:bg-rose-900/20 mb-4 border border-red-100 dark:border-rose-800/30">
                <HiOutlineExclamationTriangle className="h-8 w-8 text-red-500 dark:text-rose-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Failed to load news</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">{error}</p>
              <button onClick={fetchFeed} className="btn-primary max-w-[200px]">
                Try Again
              </button>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 mb-4 border border-slate-200 dark:border-slate-700">
                <HiOutlineSignal className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No articles found</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                {activeAiTag
                  ? `No articles tagged "${activeAiTag}". Try a different tag or clear the filter.`
                  : "No articles available for this category. Try selecting a different one."
                }
              </p>
              {activeAiTag && (
                <button onClick={() => setActiveAiTag(null)} className="mt-6 btn-primary max-w-[200px]">
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-slide-up">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.articleId}
                  article={article}
                  isBookmarked={bookmarkedIds.has(article.articleId)}
                  onToggleBookmark={handleToggleBookmark}
                  onTagClick={(tag) => setActiveAiTag(activeAiTag === tag ? null : tag)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-12 bg-white dark:bg-[#24272b]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <HiOutlineSparkles className="h-4 w-4 text-[#2bb24c]" />
              <span className="text-xs text-[#2bb24c] font-bold uppercase tracking-wider">Powered by Gemini AI</span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} NewsMarker. Built with Next.js + Firebase.
              Powered by free RSS feeds.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
