import { getFirebaseAuth } from "@/lib/firebase";
import { ApiResponse, Article, BookmarksResponse, CategoryFilter } from "@/types";

// ─── Helper: get auth token ─────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
    try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    } catch {
        return null;
    }
}

function authHeaders(token: string): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

// ─── Add bookmark ────────────────────────────────────────────────────────────

export async function addBookmark(
    article: Article
): Promise<ApiResponse<{ bookmarkId: string }>> {
    const token = await getAuthToken();
    if (!token) return { success: false, data: null, error: "UNAUTHENTICATED", message: "Not logged in" };

    try {
        const res = await fetch("/api/bookmarks", {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify(article),
        });
        return await res.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to add bookmark";
        return { success: false, data: null, error: "ADD_FAILED", message };
    }
}

// ─── Remove bookmark ────────────────────────────────────────────────────────

export async function removeBookmark(
    articleId: string
): Promise<ApiResponse<null>> {
    const token = await getAuthToken();
    if (!token) return { success: false, data: null, error: "UNAUTHENTICATED", message: "Not logged in" };

    try {
        const res = await fetch(`/api/bookmarks?articleId=${articleId}`, {
            method: "DELETE",
            headers: authHeaders(token),
        });
        return await res.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to remove bookmark";
        return { success: false, data: null, error: "REMOVE_FAILED", message };
    }
}

// ─── Get bookmarks ──────────────────────────────────────────────────────────

export async function getBookmarks(
    userId: string,
    category: CategoryFilter = "all"
): Promise<ApiResponse<BookmarksResponse>> {
    const token = await getAuthToken();
    if (!token) return { success: false, data: null, error: "UNAUTHENTICATED", message: "Not logged in" };

    try {
        const res = await fetch(`/api/bookmarks?category=${category}`, {
            headers: authHeaders(token),
        });
        return await res.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch bookmarks";
        return { success: false, data: null, error: "FETCH_FAILED", message };
    }
}

