const SHELL_CACHE_PREFIX = "road-to-berlin-shell-";
const SHELL_CACHE = `${SHELL_CACHE_PREFIX}v2`;
// Keep the last valid plan when a later version of the app shell is installed.
const PLAN_CACHE = "road-to-berlin-plan-v1";
const BASE_URL = new URL(self.registration.scope);
const PLAN_URL = new URL("plan.json", BASE_URL);
const MANIFEST_URL = new URL("manifest.webmanifest", BASE_URL);
const INDEX_URL = new URL("index.html", BASE_URL);
const ASSETS = ["./", "index.html", "manifest.webmanifest", "icon-road-to-berlin-192-v2.png", "icon-road-to-berlin-512-v2.png"]
  .map(path => new URL(path, BASE_URL).href);

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

function validPlan(plan) {
  const text = value => typeof value === "string" && value.trim().length > 0;
  return Boolean(plan && text(plan.appName)
    && plan.goal && text(plan.goal.name) && text(plan.goal.location) && isDate(plan.goal.date)
    && plan.week && isDate(plan.week.start) && isDate(plan.week.end)
    && text(plan.week.title) && text(plan.week.note)
    && Array.isArray(plan.days) && plan.days.length === 7
    && Date.parse(plan.week.end) - Date.parse(plan.week.start) === 6 * 86400000
    && plan.days.every((day, index) => day && isDate(day.d)
      && Date.parse(day.d) === Date.parse(plan.week.start) + index * 86400000
      && [day.title, day.meta, day.tag, day.details].every(text)
      && (day.done === undefined || typeof day.done === "boolean")));
}

async function updatePlan(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Bypass HTTP cache; a stalled fetch/body must still reach the offline fallback.
    const response = await fetch(request, { cache: "no-store", signal: controller.signal });
    if (!response.ok || !validPlan(await response.clone().json())) {
      throw new Error("Invalid training plan response");
    }
    // A full/unavailable browser cache should not hide a valid network response.
    try {
      const cache = await caches.open(PLAN_CACHE);
      await cache.put(PLAN_URL.href, response.clone());
    } catch (_) {}
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function getPlan(request) {
  try {
    return await updatePlan(request);
  } catch (_) {
    try {
      const cache = await caches.open(PLAN_CACHE);
      const cached = await cache.match(PLAN_URL.href);
      if (cached && validPlan(await cached.clone().json())) {
        const headers = new Headers(cached.headers);
        headers.set("X-Plan-Source", "cache");
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers
        });
      }
    } catch (_) {}
    return new Response(JSON.stringify({ error: "Training plan is unavailable offline." }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}

async function getManifest(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Android must see the current name and versioned icons even before reinstalling.
    const response = await fetch(request, { cache: "no-store", signal: controller.signal });
    const manifest = response.ok && await response.clone().json();
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("Invalid app manifest response");
    }
    try {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(MANIFEST_URL.href, response.clone());
    } catch (_) {}
    return response;
  } catch (_) {
    try {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(MANIFEST_URL.href);
      if (cached) return cached;
    } catch (_) {}
    return new Response(JSON.stringify({ error: "App manifest is unavailable offline." }), {
      status: 503,
      headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" }
    });
  } finally {
    clearTimeout(timeout);
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const shell = caches.open(SHELL_CACHE).then(cache => cache.addAll(
      ASSETS.map(url => new Request(url, { cache: "reload" }))
    ));
    // The plan is useful on the first offline visit, but cannot fail installation.
    const plan = updatePlan(new Request(PLAN_URL.href)).catch(() => {});
    await Promise.all([shell, plan]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key === "hm-krakow-v1"
        || (key.startsWith(SHELL_CACHE_PREFIX) && key !== SHELL_CACHE))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== BASE_URL.origin) return;

  if (url.pathname === PLAN_URL.pathname) {
    event.respondWith(getPlan(request));
    return;
  }

  if (url.pathname === MANIFEST_URL.pathname) {
    event.respondWith(getManifest(request));
    return;
  }

  const asset = ASSETS.find(path => new URL(path).pathname === url.pathname);
  const navigation = request.mode === "navigate" && url.pathname.startsWith(BASE_URL.pathname);
  if (!asset && !navigation) return;

  event.respondWith((async () => {
    let cached;
    try {
      const cache = await caches.open(SHELL_CACHE);
      cached = await cache.match(asset || INDEX_URL.href);
    } catch (_) {}
    return cached || fetch(request);
  })());
});
