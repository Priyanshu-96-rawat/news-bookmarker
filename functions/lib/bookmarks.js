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
exports.addBookmarkHandler = addBookmarkHandler;
exports.removeBookmarkHandler = removeBookmarkHandler;
exports.getBookmarksHandler = getBookmarksHandler;
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
// ─── Validation Schemas ──────────────────────────────────────────────────────
const addBookmarkSchema = zod_1.z.object({
    articleId: zod_1.z.string().min(1, "articleId is required"),
    title: zod_1.z.string().min(1, "title is required"),
    description: zod_1.z.string().default(""),
    link: zod_1.z.string().url("link must be a valid URL"),
    source: zod_1.z.string().min(1, "source is required"),
    category: zod_1.z.enum(["tech", "world", "business", "science"]),
    imageUrl: zod_1.z.string().optional(),
    pubDate: zod_1.z.string().default(""),
});
const removeBookmarkSchema = zod_1.z.object({
    articleId: zod_1.z.string().min(1, "articleId is required"),
});
const getBookmarksSchema = zod_1.z.object({
    category: zod_1.z.enum(["tech", "world", "business", "all"]).default("all"),
    limit: zod_1.z.number().min(1).max(100).default(50),
});
// ─── addBookmark ─────────────────────────────────────────────────────────────
async function addBookmarkHandler(request, db) {
    // Auth check
    if (!request.auth) {
        return {
            success: false,
            data: null,
            error: "UNAUTHENTICATED",
            message: "You must be logged in to bookmark articles",
        };
    }
    // Validate input
    const parsed = addBookmarkSchema.safeParse(request.data);
    if (!parsed.success) {
        return {
            success: false,
            data: null,
            error: "INVALID_INPUT",
            message: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }
    const { articleId, title, description, link, source, category, imageUrl, pubDate } = parsed.data;
    const userId = request.auth.uid;
    try {
        // Check if already bookmarked
        const existingDoc = await db
            .collection("users")
            .doc(userId)
            .collection("bookmarks")
            .doc(articleId)
            .get();
        if (existingDoc.exists) {
            return {
                success: false,
                data: null,
                error: "ALREADY_EXISTS",
                message: "Article is already bookmarked",
            };
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        await db
            .collection("users")
            .doc(userId)
            .collection("bookmarks")
            .doc(articleId)
            .set({
            id: articleId,
            articleId,
            title,
            description,
            link,
            source,
            category,
            imageUrl: imageUrl || null,
            pubDate,
            userId,
            createdAt: now,
            updatedAt: now,
        });
        return {
            success: true,
            data: { bookmarkId: articleId },
            error: null,
            message: "Article bookmarked successfully",
        };
    }
    catch (error) {
        console.error("addBookmark error:", error);
        return {
            success: false,
            data: null,
            error: "ADD_FAILED",
            message: error.message || "Failed to add bookmark",
        };
    }
}
// ─── removeBookmark ──────────────────────────────────────────────────────────
async function removeBookmarkHandler(request, db) {
    if (!request.auth) {
        return {
            success: false,
            data: null,
            error: "UNAUTHENTICATED",
            message: "You must be logged in to manage bookmarks",
        };
    }
    const parsed = removeBookmarkSchema.safeParse(request.data);
    if (!parsed.success) {
        return {
            success: false,
            data: null,
            error: "INVALID_INPUT",
            message: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }
    const userId = request.auth.uid;
    const { articleId } = parsed.data;
    try {
        const docRef = db
            .collection("users")
            .doc(userId)
            .collection("bookmarks")
            .doc(articleId);
        const doc = await docRef.get();
        if (!doc.exists) {
            return {
                success: false,
                data: null,
                error: "NOT_FOUND",
                message: "Bookmark not found",
            };
        }
        await docRef.delete();
        return {
            success: true,
            data: null,
            error: null,
            message: "Bookmark removed successfully",
        };
    }
    catch (error) {
        console.error("removeBookmark error:", error);
        return {
            success: false,
            data: null,
            error: "REMOVE_FAILED",
            message: error.message || "Failed to remove bookmark",
        };
    }
}
// ─── getBookmarks ────────────────────────────────────────────────────────────
async function getBookmarksHandler(request, db) {
    if (!request.auth) {
        return {
            success: false,
            data: null,
            error: "UNAUTHENTICATED",
            message: "You must be logged in to view bookmarks",
        };
    }
    const parsed = getBookmarksSchema.safeParse(request.data || {});
    if (!parsed.success) {
        return {
            success: false,
            data: null,
            error: "INVALID_INPUT",
            message: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }
    const userId = request.auth.uid;
    const { category, limit } = parsed.data;
    try {
        let query = db
            .collection("users")
            .doc(userId)
            .collection("bookmarks")
            .orderBy("createdAt", "desc")
            .limit(limit);
        if (category !== "all") {
            query = query.where("category", "==", category);
        }
        const snapshot = await query.get();
        const bookmarks = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d, _e, _f;
            const data = doc.data();
            return {
                id: doc.id,
                articleId: data.articleId,
                title: data.title,
                description: data.description,
                link: data.link,
                source: data.source,
                category: data.category,
                imageUrl: data.imageUrl,
                pubDate: data.pubDate,
                createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || "",
                updatedAt: ((_f = (_e = (_d = data.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || "",
                userId: data.userId,
            };
        });
        return {
            success: true,
            data: { bookmarks, total: bookmarks.length },
            error: null,
            message: "Bookmarks fetched successfully",
        };
    }
    catch (error) {
        console.error("getBookmarks error:", error);
        return {
            success: false,
            data: null,
            error: "FETCH_FAILED",
            message: error.message || "Failed to fetch bookmarks",
        };
    }
}
//# sourceMappingURL=bookmarks.js.map