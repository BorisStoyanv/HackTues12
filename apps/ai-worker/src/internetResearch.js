const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";
const WIKIMEDIA_PAGEVIEWS_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user";
const NOMINATIM_API_BASE = "https://nominatim.openstreetmap.org/search";
const WORLD_BANK_API_BASE = "https://api.worldbank.org/v2";

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

function buildSearchQueries(proposal, geoHint) {
  const country = geoHint?.country || "";
  const raw = [
    `${proposal.name} ${proposal.location} ${proposal.category}`,
    `${proposal.name} visitors tourism`,
    `${proposal.name} restoration economic impact`,
    `${proposal.location} tourism statistics`,
    country ? `${country} international tourism arrivals` : "",
    country ? `${country} tourism receipts` : "",
    `${proposal.category} conservation return on investment`,
  ];

  return Array.from(
    new Set(
      raw
        .map((query) => query.replace(/\s+/g, " ").trim())
        .filter(Boolean)
    )
  ).slice(0, 7);
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
    addressdetails: "1",
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
      country: top.address?.country || null,
      countryCode: top.address?.country_code ? String(top.address.country_code).toUpperCase() : null,
    };
  } catch {
    return null;
  }
}

async function fetchWorldBankIndicator(countryCode, indicatorCode) {
  if (!countryCode) {
    return null;
  }

  const params = new URLSearchParams({
    format: "json",
    per_page: "120",
  });

  try {
    const data = await fetchJson(
      `${WORLD_BANK_API_BASE}/country/${encodeURIComponent(countryCode)}/indicator/${encodeURIComponent(
        indicatorCode
      )}?${params.toString()}`,
      {},
      15000
    );
    const rows = Array.isArray(data?.[1]) ? data[1] : [];
    const latest = rows.find((row) => row && row.value !== null);

    if (!latest) {
      return null;
    }

    return {
      year: Number(latest.date),
      value: Number(latest.value),
      sourceUrl: `https://data.worldbank.org/indicator/${indicatorCode}?locations=${countryCode}`,
    };
  } catch {
    return null;
  }
}

async function fetchCountryEconomicContext(geoHint) {
  const countryCode = geoHint?.countryCode;
  if (!countryCode) {
    return null;
  }

  const [tourismArrivals, tourismReceiptsUsd, gdpUsd] = await Promise.all([
    fetchWorldBankIndicator(countryCode, "ST.INT.ARVL"),
    fetchWorldBankIndicator(countryCode, "ST.INT.RCPT.CD"),
    fetchWorldBankIndicator(countryCode, "NY.GDP.MKTP.CD"),
  ]);

  if (!tourismArrivals && !tourismReceiptsUsd && !gdpUsd) {
    return null;
  }

  return {
    country: geoHint?.country || countryCode,
    countryCode,
    tourismArrivals,
    tourismReceiptsUsd,
    gdpUsd,
  };
}

export async function collectInternetEvidence(proposal) {
  const searchText = `${proposal.name} ${proposal.location} ${proposal.category}`.trim();

  const geoHint = await fetchGeoHint(proposal.location);
  const searchQueries = buildSearchQueries(proposal, geoHint);

  const [queryHits, countryEconomicContext] = await Promise.all([
    Promise.all(
      searchQueries.map(async (query, queryIndex) => {
        try {
          const hits = await fetchWikipediaSearch(query);
          return hits.map((hit, hitIndex) => ({
            ...hit,
            query,
            score: queryIndex * 100 + hitIndex,
          }));
        } catch {
          return [];
        }
      })
    ),
    fetchCountryEconomicContext(geoHint),
  ]);

  const dedupedByPageId = new Map();
  for (const hits of queryHits) {
    for (const hit of hits) {
      const existing = dedupedByPageId.get(hit.pageid);
      if (!existing || hit.score < existing.score) {
        dedupedByPageId.set(hit.pageid, hit);
      }
    }
  }

  const topHits = Array.from(dedupedByPageId.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);
  const extracts = await fetchWikipediaExtracts(topHits.map((hit) => hit.pageid));
  const extractById = new Map(extracts.map((item) => [item.pageid, item]));

  const sources = await Promise.all(
    topHits.map(async (hit) => {
      const details = extractById.get(hit.pageid);
      const avgDailyPageviews30d = await fetchPageviews(hit.title);

      return {
        title: hit.title,
        url: details?.canonicalUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replaceAll(" ", "_"))}`,
        matchedQuery: hit.query,
        snippet: hit.snippet,
        summary: details?.extract || "",
        avgDailyPageviews30d,
      };
    })
  );

  return {
    searchText,
    searchQueries,
    geoHint,
    sources,
    countryEconomicContext,
  };
}
