const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";
const WIKIMEDIA_PAGEVIEWS_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user";
const NOMINATIM_API_BASE = "https://nominatim.openstreetmap.org/search";

function cleanHtmlSnippet(text) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function formatYmd(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

async function fetchJson(url, init = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWikipediaSearch(searchText) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: searchText,
    format: "json",
    utf8: "1",
    srlimit: "5",
  });

  const data = await fetchJson(`${WIKIPEDIA_API_BASE}?${params.toString()}`);
  const results = data?.query?.search || [];

  return results.map((item) => ({
    title: item.title,
    pageid: item.pageid,
    snippet: cleanHtmlSnippet(item.snippet || ""),
  }));
}

async function fetchWikipediaExtracts(pageIds) {
  if (!pageIds.length) {
    return [];
  }

  const params = new URLSearchParams({
    action: "query",
    prop: "extracts|info",
    inprop: "url",
    explaintext: "1",
    exintro: "1",
    pageids: pageIds.join("|"),
    format: "json",
    utf8: "1",
  });

  const data = await fetchJson(`${WIKIPEDIA_API_BASE}?${params.toString()}`);
  const pages = Object.values(data?.query?.pages || {});

  return pages.map((page) => ({
    pageid: page.pageid,
    title: page.title,
    canonicalUrl: page.canonicalurl || "",
    extract: (page.extract || "").replace(/\s+/g, " ").trim(),
  }));
}

async function fetchPageviews(title) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  const url = `${WIKIMEDIA_PAGEVIEWS_BASE}/${encodeURIComponent(title)}/daily/${formatYmd(start)}/${formatYmd(end)}`;

  try {
    const data = await fetchJson(url);
    const items = data?.items || [];

    if (!items.length) {
      return null;
    }

    const total = items.reduce((sum, item) => sum + (item.views || 0), 0);
    return Number((total / items.length).toFixed(2));
  } catch {
    return null;
  }
}

async function fetchGeoHint(locationText) {
  const params = new URLSearchParams({
    q: locationText,
    format: "json",
    limit: "1",
  });

  try {
    const results = await fetchJson(`${NOMINATIM_API_BASE}?${params.toString()}`, {
      headers: {
        "User-Agent": "HackTues12-AI-Engine/1.0",
      },
    });

    if (!Array.isArray(results) || !results.length) {
      return null;
    }

    const top = results[0];
    return {
      displayName: top.display_name,
      lat: top.lat,
      lon: top.lon,
    };
  } catch {
    return null;
  }
}

export async function collectInternetEvidence(proposal) {
  const searchText = `${proposal.name} ${proposal.location} ${proposal.category}`.trim();

  const [geoHint, searchHits] = await Promise.all([
    fetchGeoHint(proposal.location),
    fetchWikipediaSearch(searchText),
  ]);

  const topHits = searchHits.slice(0, 3);
  const extracts = await fetchWikipediaExtracts(topHits.map((hit) => hit.pageid));
  const extractById = new Map(extracts.map((item) => [item.pageid, item]));

  const sources = await Promise.all(
    topHits.map(async (hit) => {
      const details = extractById.get(hit.pageid);
      const avgDailyPageviews30d = await fetchPageviews(hit.title);

      return {
        title: hit.title,
        url: details?.canonicalUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replaceAll(" ", "_"))}`,
        snippet: hit.snippet,
        summary: details?.extract || "",
        avgDailyPageviews30d,
      };
    })
  );

  return {
    searchText,
    geoHint,
    sources,
  };
}
