const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/quotes") {
      return json({ error: "not found" }, 404);
    }

    const symbols = (url.searchParams.get("symbols") || "")
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean);

    if (!symbols.length) {
      return json({ error: "missing symbols" }, 400);
    }

    const channels = symbols.map((symbol) => `tse_${symbol}.tw`).join("|");
    const twseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(channels)}&json=1&delay=0&_=${Date.now()}`;

    const response = await fetch(twseUrl, {
      headers: {
        referer: "https://mis.twse.com.tw/stock/index.jsp",
        "user-agent": "Mozilla/5.0 ETF Dashboard",
      },
    });

    const body = await response.text();
    return new Response(body.trim(), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  },
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
