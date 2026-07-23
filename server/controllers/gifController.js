const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

function mapGif(g) {
  return {
    id: g.id,
    title: g.title,
    url: g.images?.fixed_height?.url || g.images?.original?.url,
    previewUrl: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url,
  };
}

async function callGiphy(res, endpoint, params) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      message:
        "GIF search isn't configured yet. Add a free GIPHY_API_KEY to server/.env (see README).",
    });
  }

  const url = new URL(`${GIPHY_BASE}/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("rating", "pg-13");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url);
  if (!response.ok) {
    return res.status(502).json({ message: "GIF provider request failed" });
  }

  const data = await response.json();
  res.json({ gifs: (data.data || []).map(mapGif) });
}

// GET /api/gifs/search?q=hello&limit=24
async function search(req, res) {
  try {
    const { q = "", limit = 24 } = req.query;
    if (!q.trim()) return res.json({ gifs: [] });
    await callGiphy(res, "search", { q, limit });
  } catch (err) {
    res.status(500).json({ message: "GIF search failed", error: err.message });
  }
}

// GET /api/gifs/trending
async function trending(req, res) {
  try {
    await callGiphy(res, "trending", { limit: 24 });
  } catch (err) {
    res.status(500).json({ message: "Could not load trending GIFs", error: err.message });
  }
}

module.exports = { search, trending };
