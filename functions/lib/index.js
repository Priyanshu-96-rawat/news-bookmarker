"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerFetchFeeds = exports.onUserCreate = exports.scheduledFetchRssFeeds = exports.getBookmarks = exports.removeBookmark = exports.addBookmark = exports.getNewsFeed = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const functions = __importStar(require("firebase-functions"));
const fetchRssFeeds_1 = require("./fetchRssFeeds");
const bookmarks_1 = require("./bookmarks");
admin.initializeApp();
const db = admin.firestore();
// ─── 1. getNewsFeed (Callable) ───────────────────────────────────────────────
exports.getNewsFeed = (0, https_1.onCall)(async (request) => {
    var _a;
    try {
        const category = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.category) || "all";
        if (category === "all") {
            // Fetch all categories
            const snapshot = await db.collection("cachedFeeds").get();
            const articles = [];
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
        const data = doc.data();
        return {
            success: true,
            data: {
                articles: data.articles || [],
                lastFetchedAt: data.lastFetchedAt || "",
            },
            error: null,
            message: "Fetched articles successfully",
        };
    }
    catch (error) {
        return {
            success: false,
            data: null,
            error: "FETCH_FAILED",
            message: error.message || "Unable to retrieve articles",
        };
    }
});
// ─── 2. addBookmark (Callable) ───────────────────────────────────────────────
exports.addBookmark = (0, https_1.onCall)(async (request) => {
    return (0, bookmarks_1.addBookmarkHandler)(request, db);
});
// ─── 3. removeBookmark (Callable) ────────────────────────────────────────────
exports.removeBookmark = (0, https_1.onCall)(async (request) => {
    return (0, bookmarks_1.removeBookmarkHandler)(request, db);
});
// ─── 4. getBookmarks (Callable) ──────────────────────────────────────────────
exports.getBookmarks = (0, https_1.onCall)(async (request) => {
    return (0, bookmarks_1.getBookmarksHandler)(request, db);
});
// ─── 5. scheduledFetchRssFeeds (Scheduled every 30 min) ──────────────────────
exports.scheduledFetchRssFeeds = (0, scheduler_1.onSchedule)("every 30 minutes", async () => {
    console.log("⏰ Scheduled RSS feed fetch started");
    await (0, fetchRssFeeds_1.fetchAndCacheFeeds)(db);
    console.log("✅ Scheduled RSS feed fetch completed");
});
// ─── 6. onUserCreate (Auth Trigger) ──────────────────────────────────────────
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
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
exports.triggerFetchFeeds = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        return {
            success: false,
            data: null,
            error: "UNAUTHENTICATED",
            message: "You must be logged in to trigger feed fetch",
        };
    }
    console.log("🔄 Manual RSS feed fetch triggered");
    await (0, fetchRssFeeds_1.fetchAndCacheFeeds)(db);
    return {
        success: true,
        data: null,
        error: null,
        message: "Feeds fetched and cached successfully",
    };
});
//# sourceMappingURL=index.js.map