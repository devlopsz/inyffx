const CACHE_NAME = "inyffx-shell-20260903-audit-v2";
const CORE_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./registration-data.js",
  "./character-data.js",
  "./calendar-shields.js",
  "./shortcut-data.js",
  "./assets/config.js",
  "./manifest.webmanifest",
  "./mod/pics/logo-inyffx.png",
  "./mod/pics/login/inyffx-background-initial.webp",
  "./mod/pics/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("inyffx-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
