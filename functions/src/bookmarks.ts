import * as admin from "firebase-admin";
import { z } from "zod";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

// ─── Validation Schemas ──────────────────────────────────────────────────────

const addBookmarkSchema = z.object({
    articleId: z.string().min(1, "articleId is required"),
    title: z.string().min(1, "title is required"),
    description: z.string().default(""),
    link: z.string().url("link must be a valid URL"),
    source: z.string().min(1, "source is required"),
    category: z.enum(["tech", "world", "business", "science"]),
    imageUrl: z.string().optional(),
    pubDate: z.string().default(""),
});

const removeBookmarkSchema = z.object({
    articleId: z.string().min(1, "articleId is required"),
});

const getBookmarksSchema = z.object({
    category: z.enum(["tech", "world", "business", "all"]).default("all"),
    limit: z.number().min(1).max(100).default(50),
});

// ─── addBookmark ─────────────────────────────────────────────────────────────

export async function addBookmarkHandler(
    request: CallableRequest,
    db: FirebaseFirestore.Firestore
) {
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
    } catch (error: any) {
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

export async function removeBookmarkHandler(
    request: CallableRequest,
    db: FirebaseFirestore.Firestore
) {
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
    } catch (error: any) {
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

export async function getBookmarksHandler(
    request: CallableRequest,
    db: FirebaseFirestore.Firestore
) {
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
        let query: FirebaseFirestore.Query = db
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
                createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
                userId: data.userId,
            };
        });

        return {
            success: true,
            data: { bookmarks, total: bookmarks.length },
            error: null,
            message: "Bookmarks fetched successfully",
        };
    } catch (error: any) {
        console.error("getBookmarks error:", error);
        return {
            success: false,
            data: null,
            error: "FETCH_FAILED",
            message: error.message || "Failed to fetch bookmarks",
        };
    }
}
