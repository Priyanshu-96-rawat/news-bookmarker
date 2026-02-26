// Shared TypeScript types for the News Bookmarker app

export interface Article {
  articleId: string;
  title: string;
  description: string;
  link: string;
  source: string;
  category: Category;
  imageUrl?: string;
  pubDate: string;
  aiTags?: string[];        // AI-generated tags from Ollama (e.g., "AI/ML", "Climate")
  sentiment?: Sentiment;     // AI-detected sentiment
}

export interface Bookmark extends Article {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// Base RSS categories
export type Category = "tech" | "world" | "business" | "science";
export type CategoryFilter = Category | "all";
export type Sentiment = "positive" | "negative" | "neutral";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string;
}

export interface NewsFeedResponse {
  articles: Article[];
  lastFetchedAt: string;
}

export interface BookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}
