import { ApiResponse, NewsFeedResponse, CategoryFilter } from "@/types";

export async function getNewsFeed(
    category: CategoryFilter = "all"
): Promise<ApiResponse<NewsFeedResponse>> {
    try {
        const res = await fetch(`/api/feed?category=${category}`);
        const data = await res.json();
        return data;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch news feed";
        return { success: false, data: null, error: "FETCH_FAILED", message };
    }
}
