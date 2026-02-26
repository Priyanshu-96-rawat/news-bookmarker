import { NextResponse } from "next/server";
import { db, auth } from "@/lib/firebaseAdmin";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

// ─── Validation ──────────────────────────────────────────────────────────────

const addBookmarkSchema = z.object({
    articleId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().default(""),
    link: z.string().url(),
    source: z.string().min(1),
    category: z.enum(["tech", "world", "business", "science"]),
    imageUrl: z.string().optional(),
    pubDate: z.string().default(""),
});

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function verifyAuth(request: Request): Promise<string | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    try {
        const token = authHeader.split("Bearer ")[1];
        const decoded = await auth.verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}

// ─── GET /api/bookmarks — get user's bookmarks ──────────────────────────────

export async function GET(request: Request) {
    const userId = await verifyAuth(request);
    if (!userId) {
        return NextResponse.json(
            { success: false, data: null, error: "UNAUTHENTICATED", message: "Not logged in" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || "all";
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

        let query: FirebaseFirestore.Query = db
            .collection("users").doc(userId).collection("bookmarks")
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

        return NextResponse.json({
            success: true,
            data: { bookmarks, total: bookmarks.length },
            error: null,
            message: "Bookmarks fetched",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json(
            { success: false, data: null, error: "FETCH_FAILED", message },
            { status: 500 }
        );
    }
}

// ─── POST /api/bookmarks — add bookmark ─────────────────────────────────────

export async function POST(request: Request) {
    const userId = await verifyAuth(request);
    if (!userId) {
        return NextResponse.json(
            { success: false, data: null, error: "UNAUTHENTICATED", message: "Not logged in" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const parsed = addBookmarkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, data: null, error: "INVALID_INPUT", message: parsed.error.issues.map((i) => i.message).join(", ") },
                { status: 400 }
            );
        }

        const { articleId, title, description, link, source, category, imageUrl, pubDate } = parsed.data;

        // Check duplicate
        const existing = await db.collection("users").doc(userId).collection("bookmarks").doc(articleId).get();
        if (existing.exists) {
            return NextResponse.json(
                { success: false, data: null, error: "ALREADY_EXISTS", message: "Already bookmarked" },
                { status: 409 }
            );
        }

        await db.collection("users").doc(userId).collection("bookmarks").doc(articleId).set({
            id: articleId, articleId, title, description, link, source, category,
            imageUrl: imageUrl || null, pubDate, userId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            data: { bookmarkId: articleId },
            error: null,
            message: "Bookmarked successfully",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json(
            { success: false, data: null, error: "ADD_FAILED", message },
            { status: 500 }
        );
    }
}

// ─── DELETE /api/bookmarks — remove bookmark ────────────────────────────────

export async function DELETE(request: Request) {
    const userId = await verifyAuth(request);
    if (!userId) {
        return NextResponse.json(
            { success: false, data: null, error: "UNAUTHENTICATED", message: "Not logged in" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const articleId = searchParams.get("articleId");
        if (!articleId || typeof articleId !== "string" || articleId.includes("/") || articleId.includes("\\")) {
            return NextResponse.json(
                { success: false, data: null, error: "INVALID_INPUT", message: "Valid articleId required" },
                { status: 400 }
            );
        }

        const docRef = db.collection("users").doc(userId).collection("bookmarks").doc(articleId);
        const doc = await docRef.get();
        if (!doc.exists) {
            return NextResponse.json(
                { success: false, data: null, error: "NOT_FOUND", message: "Bookmark not found" },
                { status: 404 }
            );
        }

        await docRef.delete();
        return NextResponse.json({
            success: true, data: null, error: null, message: "Bookmark removed",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json(
            { success: false, data: null, error: "REMOVE_FAILED", message },
            { status: 500 }
        );
    }
}
