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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndCacheFeeds = fetchAndCacheFeeds;
const crypto = __importStar(require("crypto"));
const xml2js_1 = require("xml2js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const gemini_1 = require("./gemini");
const FEED_SOURCES = [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC", category: "world" },
    { url: "http://rss.cnn.com/rss/edition_world.rss", source: "CNN", category: "world" },
    { url: "https://techcrunch.com/feed/", source: "TechCrunch", category: "tech" },
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC", category: "business" },
    { url: "http://rss.cnn.com/rss/edition_technology.rss", source: "CNN", category: "tech" },
    { url: "http://rss.cnn.com/rss/edition_business.rss", source: "CNN", category: "business" },
];
// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateArticleId(url) {
    return crypto.createHash("md5").update(url).digest("hex");
}
function stripHtml(html) {
    return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}
function parseXml(xml) {
    return new Promise((resolve, reject) => {
        (0, xml2js_1.parseString)(xml, { explicitArray: false, trim: true }, (err, result) => {
            if (err)
                reject(err);
            else
                resolve(result);
        });
    });
}
function extractImageUrl(item) {
    var _a, _b, _c, _d, _e, _f, _g;
    // Try media:content
    if ((_b = (_a = item["media:content"]) === null || _a === void 0 ? void 0 : _a.$) === null || _b === void 0 ? void 0 : _b.url)
        return item["media:content"].$.url;
    // Try media:thumbnail
    if ((_d = (_c = item["media:thumbnail"]) === null || _c === void 0 ? void 0 : _c.$) === null || _d === void 0 ? void 0 : _d.url)
        return item["media:thumbnail"].$.url;
    // Try enclosure
    if (((_f = (_e = item.enclosure) === null || _e === void 0 ? void 0 : _e.$) === null || _f === void 0 ? void 0 : _f.url) && ((_g = item.enclosure.$.type) === null || _g === void 0 ? void 0 : _g.startsWith("image"))) {
        return item.enclosure.$.url;
    }
    // Try to extract from description
    const descHtml = typeof item.description === "string" ? item.description : "";
    const imgMatch = descHtml.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch)
        return imgMatch[1];
    return undefined;
}
// ─── Fetch a single feed ─────────────────────────────────────────────────────
async function fetchSingleFeed(feedSource) {
    var _a;
    try {
        console.log(`📡 Fetching ${feedSource.source} (${feedSource.category}): ${feedSource.url}`);
        const response = await (0, node_fetch_1.default)(feedSource.url, {
            headers: { "User-Agent": "NewsMarker/1.0" },
            timeout: 15000,
        });
        if (!response.ok) {
            console.error(`❌ Failed to fetch ${feedSource.url}: ${response.status}`);
            return [];
        }
        const xml = await response.text();
        const parsed = await parseXml(xml);
        const channel = ((_a = parsed.rss) === null || _a === void 0 ? void 0 : _a.channel) || parsed.feed;
        if (!channel) {
            console.error(`❌ No channel found in ${feedSource.url}`);
            return [];
        }
        const items = channel.item || channel.entry || [];
        const itemArray = Array.isArray(items) ? items : [items];
        const articles = itemArray.slice(0, 15).map((item) => {
            var _a, _b, _c, _d, _e;
            const link = typeof item.link === "string" ? item.link : ((_b = (_a = item.link) === null || _a === void 0 ? void 0 : _a.$) === null || _b === void 0 ? void 0 : _b.href) || ((_c = item.link) === null || _c === void 0 ? void 0 : _c._) || "";
            const title = typeof item.title === "string" ? item.title : ((_d = item.title) === null || _d === void 0 ? void 0 : _d._) || "Untitled";
            const desc = typeof item.description === "string" ? item.description : ((_e = item.description) === null || _e === void 0 ? void 0 : _e._) || item.summary || "";
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
    }
    catch (error) {
        console.error(`❌ Error fetching ${feedSource.url}:`, error.message);
        return [];
    }
}
// ─── Main: Fetch all feeds, categorize with Ollama, write to Firestore ───────
async function fetchAndCacheFeeds(db) {
    console.log("🚀 Starting full RSS feed fetch...");
    // Fetch all feeds in parallel
    const results = await Promise.allSettled(FEED_SOURCES.map((source) => fetchSingleFeed(source)));
    // Group articles by category
    const byCategory = {
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
        const seen = new Set();
        byCategory[cat] = byCategory[cat].filter((a) => {
            if (seen.has(a.articleId))
                return false;
            seen.add(a.articleId);
            return true;
        });
    }
    // Categorize with Gemini AI (graceful degradation)
    for (const cat of Object.keys(byCategory)) {
        try {
            const categorized = await (0, gemini_1.categorizeWithGemini)(byCategory[cat]);
            byCategory[cat] = categorized;
        }
        catch (error) {
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
//# sourceMappingURL=fetchRssFeeds.js.map