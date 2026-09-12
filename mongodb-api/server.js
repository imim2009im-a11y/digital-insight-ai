import http from "node:http";
import { URL } from "node:url";
import { MongoClient, ServerApiVersion } from "mongodb";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const SOURCE_MONGODB_URI = process.env.MONGODB_URI;
const TARGET_MONGODB_URI = process.env.TARGET_MONGODB_URI;
const MIGRATE_ON_START = process.env.MIGRATE_ON_START === "true";
const ACTIVE_MONGODB_URI = TARGET_MONGODB_URI || SOURCE_MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "digitalinsightai";
const DEFAULT_ORIGINS = "https://digitalinsightai.com,https://www.digitalinsightai.com";
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

let clientPromise;

function getClient() {
  if (!ACTIVE_MONGODB_URI) {
    throw new Error("MongoDB connection is not configured");
  }

  if (!clientPromise) {
    const client = new MongoClient(ACTIVE_MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    clientPromise = client.connect().then(() => client).catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }

  return clientPromise;
}

async function getDatabase() {
  const client = await getClient();
  return client.db(MONGODB_DB);
}

function createMigrationClient(uri) {
  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

async function migrateDatabaseIfRequested() {
  if (!MIGRATE_ON_START) return;
  if (!SOURCE_MONGODB_URI || !TARGET_MONGODB_URI) {
    throw new Error("Migration requires both source and target MongoDB connections");
  }
  if (SOURCE_MONGODB_URI === TARGET_MONGODB_URI) {
    console.log("Migration skipped because source and target are identical");
    return;
  }

  const sourceClient = createMigrationClient(SOURCE_MONGODB_URI);
  const targetClient = createMigrationClient(TARGET_MONGODB_URI);
  const collections = [
    "users",
    "content",
    "tools",
    "affiliate_links",
    "analytics_events",
    "app_config",
  ];

  try {
    await Promise.all([sourceClient.connect(), targetClient.connect()]);
    const sourceDb = sourceClient.db(MONGODB_DB);
    const targetDb = targetClient.db(MONGODB_DB);

    for (const name of collections) {
      const documents = await sourceDb.collection(name).find({}).toArray();
      const target = targetDb.collection(name);
      await target.deleteMany({});
      if (documents.length) {
        await target.insertMany(documents, { ordered: true });
      }
      console.log(`Migrated ${name}: ${documents.length} documents`);
    }

    await Promise.all([
      targetDb.collection("users").createIndex({ email: 1 }, { name: "idx_users_email" }),
      targetDb.collection("users").createIndex({ createdAt: -1 }, { name: "idx_users_createdAt" }),
      targetDb.collection("content").createIndex({ slug: 1 }, { name: "idx_content_slug" }),
      targetDb
        .collection("content")
        .createIndex({ status: 1, publishedAt: -1 }, { name: "idx_content_status_publishedAt" }),
      targetDb.collection("tools").createIndex({ slug: 1 }, { name: "idx_tools_slug" }),
      targetDb
        .collection("tools")
        .createIndex({ category: 1, status: 1 }, { name: "idx_tools_category_status" }),
      targetDb
        .collection("affiliate_links")
        .createIndex({ provider: 1, active: 1 }, { name: "idx_affiliate_provider_active" }),
      targetDb
        .collection("affiliate_links")
        .createIndex({ slug: 1 }, { name: "idx_affiliate_slug" }),
      targetDb
        .collection("affiliate_links")
        .createIndex({ toolId: 1 }, { name: "idx_affiliate_toolId" }),
      targetDb
        .collection("analytics_events")
        .createIndex({ event: 1, occurredAt: -1 }, { name: "idx_analytics_event_time" }),
      targetDb
        .collection("analytics_events")
        .createIndex({ sessionId: 1, occurredAt: -1 }, { name: "idx_analytics_session_time" }),
    ]);

    await targetDb.collection("app_config").updateOne(
      { key: "project" },
      {
        $set: {
          databaseStatus: "secure-cutover-ready",
          secureProject: true,
          migratedAt: new Date(),
        },
      },
      { upsert: true },
    );

    const sourceTools = await sourceDb.collection("tools").countDocuments({});
    const targetTools = await targetDb.collection("tools").countDocuments({});
    if (sourceTools !== targetTools) {
      throw new Error(`Migration verification failed for tools: ${sourceTools} != ${targetTools}`);
    }
    console.log(`Migration verified: tools=${targetTools}`);
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function parseLimit(url, fallback = 20) {
  const raw = Number.parseInt(url.searchParams.get("limit") || String(fallback), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, 1), 100);
}

function safeText(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

async function readJsonBody(req, maxBytes = 65536) {
  let total = 0;
  const chunks = [];

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

async function handleRequest(req, res) {
  applySecurityHeaders(res);
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    sendJson(res, 200, { ok: true, service: "digital-insight-mongodb-api", database: MONGODB_DB });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/tools") {
    const db = await getDatabase();
    const limit = parseLimit(url);
    const documents = await db
      .collection("tools")
      .find(
        { status: { $in: ["active", "published"] } },
        {
          projection: {
            _id: 0,
            name: 1,
            slug: 1,
            description: 1,
            category: 1,
            website: 1,
            image: 1,
            pricing: 1,
            tags: 1,
            featured: 1,
            affiliateLinkId: 1,
            updatedAt: 1,
          },
        },
      )
      .sort({ featured: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();
    sendJson(res, 200, { items: documents, count: documents.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/content") {
    const db = await getDatabase();
    const limit = parseLimit(url);
    const documents = await db
      .collection("content")
      .find(
        { status: "published" },
        {
          projection: {
            _id: 0,
            title: 1,
            slug: 1,
            excerpt: 1,
            tags: 1,
            coverImage: 1,
            publishedAt: 1,
            updatedAt: 1,
          },
        },
      )
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();
    sendJson(res, 200, { items: documents, count: documents.length });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/affiliate-links") {
    const db = await getDatabase();
    const limit = parseLimit(url);
    const slug = safeText(url.searchParams.get("slug"), 120);
    const filter = slug ? { active: true, slug } : { active: true };
    const documents = await db
      .collection("affiliate_links")
      .find(filter, {
        projection: {
          _id: 0,
          slug: 1,
          provider: 1,
          label: 1,
          url: 1,
          toolId: 1,
          disclosure: 1,
          updatedAt: 1,
        },
      })
      .limit(limit)
      .toArray();
    sendJson(res, 200, { items: documents, count: documents.length });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/analytics/events") {
    const payload = await readJsonBody(req);
    const event = safeText(payload.event, 64);
    if (!event || !/^[a-zA-Z0-9_.-]+$/.test(event)) {
      sendJson(res, 400, { error: "Invalid event" });
      return;
    }

    const document = {
      event,
      occurredAt: new Date(),
      sessionId: safeText(payload.sessionId, 128),
      page: safeText(payload.page, 512),
      referrer: safeText(payload.referrer, 1024),
      affiliateLinkId: safeText(payload.affiliateLinkId, 128),
      metadata:
        payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
          ? payload.metadata
          : undefined,
      userAgent: safeText(req.headers["user-agent"], 512),
    };

    const db = await getDatabase();
    await db.collection("analytics_events").insertOne(document);
    sendJson(res, 202, { accepted: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) {
      console.error("Request failed", error);
    }
    if (!res.headersSent) {
      applySecurityHeaders(res);
      applyCors(req, res);
    }
    if (!res.writableEnded) {
      sendJson(res, statusCode, { error: statusCode >= 500 ? "Internal server error" : error.message });
    }
  });
});

async function startServer() {
  await migrateDatabaseIfRequested();
  const db = await getDatabase();
  await db.command({ ping: 1 });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`digital-insight-mongodb-api listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Startup failed", error);
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    try {
      if (clientPromise) {
        const client = await clientPromise;
        await client.close();
      }
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
