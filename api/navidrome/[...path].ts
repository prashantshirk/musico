const DEFAULT_TARGET = "https://music.prashantshirke.me";

function getTargetBase() {
  return (process.env.NAVIDROME_PROXY_TARGET || DEFAULT_TARGET).replace(/\/+$/, "");
}

export default async function handler(req: any, res: any) {
  try {
    const pathParam = req.query.path;
    const pathParts = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
    const upstreamPath = pathParts.map((part) => encodeURIComponent(part)).join("/");
    const url = new URL(`${getTargetBase()}/${upstreamPath}`);

    const incomingQuery = req.url?.split("?")[1];
    if (incomingQuery) {
      url.search = incomingQuery;
    }

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
