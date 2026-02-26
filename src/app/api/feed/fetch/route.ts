import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { fetchAllFeeds } from "@/lib/rss";

// POST /api/feed/fetch — called by cron-job.org every 30 minutes (uses Bearer token)
export async function POST(request: Request) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
            const authHeader = request.headers.get("authorization");
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json(
                    { success: false, error: "UNAUTHORIZED", message: "Invalid cron secret" },
                    { status: 401 }
                );
            }
        }

        return await doFetch();
    } catch (error: any) {
        console.error("Feed fetch error:", error);
        return NextResponse.json(
            { success: false, data: null, error: "FETCH_FAILED", message: error.message },
            { status: 500 }
        );
    }
}

// GET /api/feed/fetch — for browser-triggered seeding (no auth needed)
export async function GET() {
    try {
        return await doFetch();
    } catch (error: any) {
        console.error("Feed fetch error:", error);
        return NextResponse.json(
            { success: false, data: null, error: "FETCH_FAILED", message: error.message },
            { status: 500 }
        );
    }
}

async function doFetch() {
    console.log("🚀 Fetching RSS feeds...");
    const byCategory = await fetchAllFeeds();
    const now = new Date().toISOString();

    const batch = db.batch();
    let totalArticles = 0;

    for (const [category, articles] of Object.entries(byCategory)) {
        const docRef = db.collection("cachedFeeds").doc(category);
        batch.set(docRef, {
            id: category,
            category: category.charAt(0).toUpperCase() + category.slice(1),
            articles,
            lastFetchedAt: now,
            updatedAt: now,
        }, { merge: true });
        totalArticles += articles.length;
    }

    await batch.commit();

    return NextResponse.json({
        success: true,
        data: { totalArticles, categories: Object.keys(byCategory) },
        error: null,
        message: `Cached ${totalArticles} articles successfully`,
    });
}
