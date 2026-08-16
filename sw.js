/* キノコ決闘団 — オフラインでも遊べるようにする最小のサービスワーカー。
   方針は「本体はネット優先・素材はキャッシュ優先」。
   本体（index.html）をキャッシュ優先にすると、更新を出しても古い画面が出続ける。
   ここでいちど痛い目を見ているので、遊ぶ本体だけは必ず取りに行く。 */
const CACHE = "kinoko-duel-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", e => {
  // 取れない資源が1つあっても全体を巻き添えにしない
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // フォントなどはブラウザに任せる

  const isShell = req.mode === "navigate" || url.pathname.endsWith("/index.html");

  if (isShell) {
    // ネット優先。落ちていたらキャッシュ、それも無ければトップを返す
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // アイコンなどは変わらないのでキャッシュ優先。無ければ取りに行って貯める
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
