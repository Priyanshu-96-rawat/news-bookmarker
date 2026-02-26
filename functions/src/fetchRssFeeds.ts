import * as crypto from "crypto";
import { parseString } from "xml2js";
import fetch from "node-fetch";
import { categorizeWithGemini } from "./gemini";

// ─── RSS Feed Sources ────────────────────────────────────────────────────────

interface FeedSource {
    url: string;
    source: string;
    category: string;
}

const FEED_SOURCES: FeedSource[] = [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC", category: "world" },
    { url: "http://rss.cnn.com/rss/edition_world.rss", source: "CNN", category: "world" },
    { url: "https://techcrunch.com/feed/", source: "TechCrunch", category: "tech" },
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC", category: "business" },
    { url: "http://rss.cnn.com/rss/edition_technology.rss", source: "CNN", category: "tech" },
    { url: "http://rss.cnn.com/rss/edition_business.rss", source: "CNN", category: "business" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedArticle {
    articleId: string;
    title: string;
    description: string;
    link: string;
    source: string;
    category: string;
    imageUrl?: string;
    pubDate: string;
    aiTags?: string[];
    sentiment?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateArticleId(url: string): string {
    return crypto.createHash("md5").update(url).digest("hex");
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function parseXml(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
        parseString(xml, { explicitArray: false, trim: true }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function extractImageUrl(item: any): string | undefined {
    // Try media:content
    if (item["media:content"]?.$?.url) return item["media:content"].$.url;
    // Try media:thumbnail
    if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
    // Try enclosure
    if (item.enclosure?.$?.url && item.enclosure.$.type?.startsWith("image")) {
        return item.enclosure.$.url;
    }
    // Try to extract from description
    const descHtml = typeof item.description === "string" ? item.description : "";
    const imgMatch = descHtml.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) return imgMatch[1];
    return undefined;
}

// ─── Fetch a single feed ─────────────────────────────────────────────────────

async function fetchSingleFeed(feedSource: FeedSource): Promise<ParsedArticle[]> {
    try {
        console.log(`📡 Fetching ${feedSource.source} (${feedSource.category}): ${feedSource.url}`);

        const response = await fetch(feedSource.url, {
            headers: { "User-Agent": "NewsMarker/1.0" },
            timeout: 15000,
        });

        if (!response.ok) {
            console.error(`❌ Failed to fetch ${feedSource.url}: ${response.status}`);
            return [];
        }

        const xml = await response.text();
        const parsed = await parseXml(xml);

        const channel = parsed.rss?.channel || parsed.feed;
        if (!channel) {
            console.error(`❌ No channel found in ${feedSource.url}`);
            return [];
        }

        const items = channel.item || channel.entry || [];
        const itemArray = Array.isArray(items) ? items : [items];

        const articles: ParsedArticle[] = itemArray.slice(0, 15).map((item: any) => {
            const link = typeof item.link === "string" ? item.link : item.link?.$?.href || item.link?._ || "";
            const title = typeof item.title === "string" ? item.title : item.title?._ || "Untitled";
            const desc = typeof item.description === "string" ? item.description : item.description?._ || item.summary || "";

            return {
                articleId: generateArticleId(link),
                title: stripHtml(title),
                description: stripHtml(desc).substring(0, 300),
                link,
                source: feedSource.source,
                category: feedSource.category,
                imageUrl: extractImageUrl(item),
                pubDate: item.pubDate || item.published || item.updated || new Date().toISOString(),
            };
        });

        console.log(`✅ Parsed ${articles.length} articles from ${feedSource.source} (${feedSource.category})`);
        return articles;
    } catch (error: any) {
        console.error(`❌ Error fetching ${feedSource.url}:`, error.message);
        return [];
    }
}

// ─── Main: Fetch all feeds, categorize with Ollama, write to Firestore ───────

export async function fetchAndCacheFeeds(db: FirebaseFirestore.Firestore): Promise<void> {
    console.log("🚀 Starting full RSS feed fetch...");

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
        FEED_SOURCES.map((source) => fetchSingleFeed(source))
    );

    // Group articles by category
    const byCategory: Record<string, ParsedArticle[]> = {
        tech: [],
        world: [],
        business: [],
    };

    for (const result of results) {
        if (result.status === "fulfilled") {
            for (const article of result.value) {
                if (byCategory[article.category]) {
                    byCategory[article.category].push(article);
                }
            }
        }
    }

    // Deduplicate by articleId within each category
    for (const cat of Object.keys(byCategory)) {
        const seen = new Set<string>();
        byCategory[cat] = byCategory[cat].filter((a) => {
            if (seen.has(a.articleId)) return false;
            seen.add(a.articleId);
            return true;
        });
    }

    // Categorize with Gemini AI (graceful degradation)
    for (const cat of Object.keys(byCategory)) {
        try {
            const categorized = await categorizeWithGemini(byCategory[cat]) as ParsedArticle[];
            byCategory[cat] = categorized;
        } catch (error: any) {
            console.warn(`⚠️ Gemini unavailable for ${cat}, skipping AI tags:`, error.message);
            // Articles remain without AI tags — frontend handles this gracefully
        }
    }

    // Write to Firestore
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const [category, articles] of Object.entries(byCategory)) {
        const docRef = db.collection("cachedFeeds").doc(category);
        batch.set(docRef, {
            id: category,
            category: category.charAt(0).toUpperCase() + category.slice(1),
            articles,
            lastFetchedAt: now,
            updatedAt: now,
            createdAt: now,
        }, { merge: true });

        console.log(`📝 Writing ${articles.length} articles to cachedFeeds/${category}`);
    }

    await batch.commit();
    console.log("✅ All feeds cached to Firestore successfully");
}
