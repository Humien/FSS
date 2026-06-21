import type { VercelRequest, VercelResponse } from "@vercel/node";

// Import the Nitro server handler
let handler: any;

async function getHandler() {
  if (handler) return handler;
  try {
    const mod = await import("../.output/server/index.mjs");
    handler = mod.default;
    return handler;
  } catch (e) {
    console.error("Failed to load Nitro handler:", e);
    throw e;
  }
}

export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    const nitroHandler = await getHandler();

    // Convert Vercel request to Web Request
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.append(key, String(value));
    });

    const request = new Request(
      `http://${req.headers.host}${req.url}`,
      {
        method: req.method || "GET",
        headers,
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? JSON.stringify(req.body || {})
            : undefined,
      }
    );

    // Call Nitro handler
    const response = await nitroHandler.fetch(request, {}, {});

    // Send response back
    res.status(response.status);

    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send body
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

