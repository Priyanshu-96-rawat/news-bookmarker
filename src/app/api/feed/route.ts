import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// GET /api/feed?category=all
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || "all";

        if (category === "all") {
            const snapshot = await db.collection("cachedFeeds").get();
            const articles: any[] = [];
            let lastFetchedAt = "";

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.articles) articles.push(...data.articles);
                if (data.lastFetchedAt) lastFetchedAt = data.lastFetchedAt;
            });

            // Deduplicate by articleId (same URL can appear in multiple feeds)
            const seen = new Set<string>();
            const uniqueArticles = articles.filter((a) => {
                if (seen.has(a.articleId)) return false;
                seen.add(a.articleId);
                return true;
            });

            uniqueArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

            return NextResponse.json({
                success: true,
                data: { articles: uniqueArticles, lastFetchedAt },
                error: null,
                message: "Fetched articles successfully",
            }, {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                }
            });
        }

        const doc = await db.collection("cachedFeeds").doc(category).get();
        if (!doc.exists) {
            return NextResponse.json({
                success: true,
                data: { articles: [], lastFetchedAt: "" },
                error: null,
                message: "No articles found",
            });
        }

        const data = doc.data()!;
        return NextResponse.json({
            success: true,
            data: { articles: data.articles || [], lastFetchedAt: data.lastFetchedAt || "" },
            error: null,
            message: "Fetched articles successfully",
        }, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json(
            { success: false, data: null, error: "FETCH_FAILED", message },
            { status: 500 }
        );
    }
}
