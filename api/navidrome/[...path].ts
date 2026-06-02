const DEFAULT_TARGET = "https://music.prashantshirke.me";

function getTargetBase() {
  return (process.env.NAVIDROME_PROXY_TARGET || DEFAULT_TARGET).replace(/\/+$/, "");
}

export default async function handler(req: any, res: any) {
  try {
    const basePath = "/api/navidrome";
    const reqUrl = req.url || "/";
    // Remove the base path from the incoming request URL
    const strippedPath = reqUrl.startsWith(basePath) ? reqUrl.slice(basePath.length) : reqUrl;
    
    const url = new URL(`${getTargetBase()}${strippedPath}`);

    const method = req.method || "GET";
    const hasBody = method !== "GET" && method !== "HEAD";

    const upstreamRes = await fetch(url.toString(), {
      method,
      headers: {
        accept: req.headers.accept || "*/*",
        "content-type": req.headers["content-type"] || "",
        "user-agent": req.headers["user-agent"] || "musico-vercel-proxy",
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    res.status(upstreamRes.status);
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }

    const text = await upstreamRes.text();
    res.send(text);
  } catch (error: any) {
    res.status(502).json({
      error: "Bad Gateway",
      message: "Failed to reach upstream music server",
      detail: error?.message || String(error),
    });
  }
}
