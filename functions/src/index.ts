import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions";
import { fetchAndCacheFeeds } from "./fetchRssFeeds";
import { addBookmarkHandler, removeBookmarkHandler, getBookmarksHandler } from "./bookmarks";

admin.initializeApp();

const db = admin.firestore();

// ─── 1. getNewsFeed (Callable) ───────────────────────────────────────────────

export const getNewsFeed = onCall(async (request) => {
    try {
        const category = request.data?.category || "all";

        if (category === "all") {
            // Fetch all categories
            const snapshot = await db.collection("cachedFeeds").get();
            const articles: any[] = [];
            let lastFetchedAt = "";

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.articles) {
                    articles.push(...data.articles);
                }
                if (data.lastFetchedAt) {
                    lastFetchedAt = data.lastFetchedAt;
                }
            });

            // Sort by pubDate descending
            articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

            return {
                success: true,
                data: { articles, lastFetchedAt },
                error: null,
                message: "Fetched articles successfully",
            };
        }

        // Fetch specific category
        const doc = await db.collection("cachedFeeds").doc(category).get();
        if (!doc.exists) {
            return {
                success: true,
                data: { articles: [], lastFetchedAt: "" },
                error: null,
                message: "No articles found for this category",
            };
        }

        const data = doc.data()!;
        return {
            success: true,
            data: {
                articles: data.articles || [],
                lastFetchedAt: data.lastFetchedAt || "",
            },
            error: null,
            message: "Fetched articles successfully",
        };
    } catch (error: any) {
        return {
            success: false,
            data: null,
            error: "FETCH_FAILED",
            message: error.message || "Unable to retrieve articles",
        };
    }
});

// ─── 2. addBookmark (Callable) ───────────────────────────────────────────────

export const addBookmark = onCall(async (request) => {
    return addBookmarkHandler(request, db);
});

// ─── 3. removeBookmark (Callable) ────────────────────────────────────────────

export const removeBookmark = onCall(async (request) => {
    return removeBookmarkHandler(request, db);
});

// ─── 4. getBookmarks (Callable) ──────────────────────────────────────────────

export const getBookmarks = onCall(async (request) => {
    return getBookmarksHandler(request, db);
});

// ─── 5. scheduledFetchRssFeeds (Scheduled every 30 min) ──────────────────────

export const scheduledFetchRssFeeds = onSchedule("every 30 minutes", async () => {
    console.log("⏰ Scheduled RSS feed fetch started");
    await fetchAndCacheFeeds(db);
    console.log("✅ Scheduled RSS feed fetch completed");
});

// ─── 6. onUserCreate (Auth Trigger) ──────────────────────────────────────────

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("users").doc(user.uid).set({
        id: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        userId: user.uid,
        createdAt: now,
        updatedAt: now,
    });
    console.log(`✅ Created user profile for ${user.uid}`);
});

// ─── Manual trigger to seed feeds on first deploy ────────────────────────────

export const triggerFetchFeeds = onCall(async (request) => {
    if (!request.auth) {
        return {
            success: false,
            data: null,
            error: "UNAUTHENTICATED",
            message: "You must be logged in to trigger feed fetch",
        };
    }
    console.log("🔄 Manual RSS feed fetch triggered");
    await fetchAndCacheFeeds(db);
    return {
        success: true,
        data: null,
        error: null,
        message: "Feeds fetched and cached successfully",
    };
});
