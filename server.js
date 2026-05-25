const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function safeFilePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.resolve(root, `.${requested}`);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

async function handleQuotes(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const symbols = (requestUrl.searchParams.get("symbols") || "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  if (!symbols.length) {
    send(res, 400, JSON.stringify({ error: "missing symbols" }), "application/json; charset=utf-8");
    return;
  }

  const channels = symbols.map((symbol) => `tse_${symbol}.tw`).join("|");
  const twseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(channels)}&json=1&delay=0&_=${Date.now()}`;

  try {
    const response = await fetch(twseUrl, {
      headers: {
        referer: "https://mis.twse.com.tw/stock/index.jsp",
        "user-agent": "Mozilla/5.0 ETF Dashboard",
      },
    });
    const text = await response.text();
    send(res, response.ok ? 200 : response.status, text.trim(), "application/json; charset=utf-8");
  } catch (error) {
    send(res, 502, JSON.stringify({ error: "quote fetch failed", detail: error.message }), "application/json; charset=utf-8");
  }
}

async function handleStatic(req, res) {
  const filePath = safeFilePath(req.url);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  } catch (error) {
    send(res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/quotes")) {
    handleQuotes(req, res);
    return;
  }
  handleStatic(req, res);
});

server.listen(port, () => {
  console.log(`ETF dashboard running at http://localhost:${port}`);
});
