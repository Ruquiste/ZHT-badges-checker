const WORKER = "https://roblox-badge-proxy.ruquiste.workers.dev";

// placeholder
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
     <rect width="150" height="150" rx="18" fill="#3a3d44"/>
     <text x="75" y="95" font-size="60" text-anchor="middle" fill="#7a7d84" font-family="Arial">?</text>
   </svg>`
);

const badgeRegistry = new Map();
const badgeDetailsCache = new Map();
const regionRegistry = new Map();
const thumbsDone = new Set();

let thumbnailsLoaded = false;
let detailsLoaded = false;
let thumbsInFlight = null;
let detailsInFlight = null;

// ---------- run management ----------
let currentRunId = 0;
let currentAbortController = null;

// ---------- tunables ----------
const OWNERSHIP_BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 2;
const FALLBACK_CONCURRENCY = 3;
const FALLBACK_PASSES = 3;
const DETAILS_CONCURRENCY = 4;
const THUMB_BATCH_SIZE = 50;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 650;

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function setStatus(text) {
  const el = document.getElementById("status-line");
  if (el) el.textContent = text;
}

function updateProgressSummary(obtained, total) {
  const el = document.getElementById("progress-summary");
  if (!el) return;
  const pct = total ? Math.round((obtained / total) * 100) : 0;
  el.textContent = `${obtained} / ${total} badges obtained (${pct}%)`;
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const RETRYABLE_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
let globalCooldownUntil = 0;

function backoffDelay(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const secs = parseFloat(retryAfterHeader);
    if (!isNaN(secs)) return Math.min(secs * 1000, 15000);
  }
  const jitter = Math.random() * 300;
  return Math.min(BASE_BACKOFF_MS * Math.pow(1.8, attempt), 8000) + jitter;
}

async function waitForCooldown(signal) {
  while (true) {
    const wait = globalCooldownUntil - Date.now();
    if (wait <= 0) return;
    if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
    await delay(Math.min(wait, 400));
  }
}

async function fetchWithRetry(url, options = {}, { retries = MAX_RETRIES, signal } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
    await waitForCooldown(signal);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const onOuterAbort = () => controller.abort();
    if (signal) signal.addEventListener("abort", onOuterAbort);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onOuterAbort);

      if (res.ok) return res;

      if (RETRYABLE_STATUSES.has(res.status) && attempt < retries) {
        const d = backoffDelay(attempt, res.headers.get("Retry-After"));
        if (res.status === 429 || res.status === 403) {
          globalCooldownUntil = Math.max(globalCooldownUntil, Date.now() + d);
        }
        await delay(d);
        continue;
      }
      return res; // not retryable
    } catch (err) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onOuterAbort);
      if (err.name === "AbortError" && signal && signal.aborted) throw err; // cancelled by newer run

      lastErr = err;
      if (attempt < retries) {
        await delay(backoffDelay(attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("fetchWithRetry: exhausted retries");
}

async function runPool(items, worker, concurrency = 6) {
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const cur = idx++;
      try {
        await worker(items[cur], cur);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Pool item failed:", err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

// --- building bars ---

function buildBar(badge) {
  const [r, g, b] = getDifficultyColor(badge.difficulty);
  const darker = [r, g, b].map(c => Math.round(c * 0.55));

  const bar = document.createElement("div");
  bar.className = "badge-bar locked";
  bar.style.background = `rgba(${r}, ${g}, ${b}, 0.4)`;
  bar.style.border = `4px solid rgb(${darker[0]}, ${darker[1]}, ${darker[2]})`;
  bar.dataset.badgeId = badge.id;

  const acronym = document.createElement("div");
  acronym.className = "acronym";
  acronym.textContent = badge.acronym;

  const statusTag = document.createElement("div");
  statusTag.className = "status-tag";
  statusTag.textContent = "UNOBTAINED";

  const imgWrap = document.createElement("div");
  imgWrap.className = "badge-img-wrap";
  imgWrap.style.animationDelay = `-${(Math.random() * 1.6).toFixed(2)}s`;

  const img = document.createElement("img");
  img.src = PLACEHOLDER_IMG;
  img.alt = badge.acronym;
  imgWrap.appendChild(img);

  bar.appendChild(acronym);
  bar.appendChild(statusTag);
  bar.appendChild(imgWrap);

  bar.addEventListener("click", () => toggleSubbox(badge.id));

  badgeRegistry.set(badge.id, {
    badge, barEl: bar, imgEl: img, imgWrapEl: imgWrap, statusTagEl: statusTag,
    subboxEl: null, owned: false, animState: null
  });

  return bar;
}

function createRainbowText(text) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.className = "rainbow-char";
    span.textContent = text[i];
    span.style.animationDelay = `-${(i * 0.12).toFixed(2)}s`;
    span.style.animationDuration = "1.2s";
    frag.appendChild(span);
  }
  return frag;
}

const CLIP_WHILE_ANIMATING = "inset(-80px -40px 0px -40px)";

function transitionMs(el) {
  const cs = getComputedStyle(el);
  const parse = s => Math.max(0, ...String(s).split(",").map(v => {
    const n = parseFloat(v);
    if (isNaN(n)) return 0;
    return v.includes("ms") ? n : n * 1000;
  }));
  return parse(cs.transitionDuration) + parse(cs.transitionDelay);
}

function renderSkeleton() {
  const container = document.getElementById("channels-container");
  if (!container) return;
  container.innerHTML = "";
  regionRegistry.clear();

  CHANNELS.forEach((worldEntry, wIdx) => {
    const worldHeading = document.createElement("div");
    worldHeading.className = "world-heading";
    worldHeading.textContent = worldEntry.world;
    container.appendChild(worldHeading);

    worldEntry.regions.forEach((region, rIdx) => {
      if (!region.badges.length) return;

      const regionKey = `${wIdx}-${rIdx}`;
      const totalBadges = region.badges.length;

      // 1. region header bar
      const regionHeading = document.createElement("div");
      regionHeading.className = "region-heading";
      regionHeading.dataset.regionKey = regionKey;

      const titleContainer = document.createElement("div");
      titleContainer.className = "region-title-container";

      const arrow = document.createElement("span");
      arrow.className = "region-arrow";
      arrow.textContent = "▼";

      const regionNameEl = document.createElement("span");
      regionNameEl.className = "region-name";
      regionNameEl.textContent = region.name;

      titleContainer.appendChild(arrow);
      titleContainer.appendChild(regionNameEl);

      // 2. region counter element
      const countEl = document.createElement("span");
      countEl.className = "region-count";
      countEl.textContent = `0 / ${totalBadges}`;

      regionHeading.appendChild(titleContainer);
      regionHeading.appendChild(countEl);

      // 3. collapsible wrapper & badge list
      const contentWrapper = document.createElement("div");
      contentWrapper.className = "region-content";

      const list = document.createElement("div");
      list.className = "badge-bar-list";

      region.badges.forEach(badge => {
        const bar = buildBar(badge);
        const unit = document.createElement("div");
        unit.className = "badge-unit";
        unit.appendChild(bar);
        list.appendChild(unit);
      });

      contentWrapper.appendChild(list);

      // 4. toggle accordion
      let toggleToken = 0;
      regionHeading.addEventListener("click", () => {
        const myToken = ++toggleToken;
        const wasOpen = contentWrapper.classList.contains("open");

        contentWrapper.style.overflow = "visible";
        contentWrapper.style.clipPath = CLIP_WHILE_ANIMATING;
        contentWrapper.classList.add("animating");

        let finished = false;
        let fallbackTimer = null;

        const finish = () => {
          contentWrapper.removeEventListener("transitionend", onEnd);
          clearTimeout(fallbackTimer);
          if (finished || myToken !== toggleToken) return;
          finished = true;

          contentWrapper.style.clipPath = "";
          contentWrapper.classList.remove("animating");
          if (wasOpen) {
            contentWrapper.style.overflow = "hidden"; // fully closed
          } else {
            contentWrapper.style.height = "auto";     // let subboxes push content down
            contentWrapper.style.overflow = "visible";
          }
        };

        const onEnd = (e) => {
          if (e.target === contentWrapper && e.propertyName === "height") finish();
        };
        contentWrapper.addEventListener("transitionend", onEnd);

        if (wasOpen) {
          contentWrapper.style.height = contentWrapper.offsetHeight + "px";
          void contentWrapper.offsetHeight; // force reflow
          contentWrapper.style.height = "0px";
          contentWrapper.classList.remove("open");
          arrow.classList.remove("open");
        } else {
          contentWrapper.classList.add("open");
          arrow.classList.add("open");
          contentWrapper.style.height = contentWrapper.scrollHeight + "px";
        }

        // safety net in case transitionend never fires
        fallbackTimer = setTimeout(finish, transitionMs(contentWrapper) + 150);
      });

      regionRegistry.set(regionKey, {
        total: totalBadges,
        obtained: 0,
        countEl,
        nameEl: regionNameEl,
        originalName: region.name,
        badgeIds: region.badges.map(b => b.id)
      });

      container.appendChild(regionHeading);
      container.appendChild(contentWrapper);
    });
  });
}

function updateRegionProgress() {
  regionRegistry.forEach((data, regionKey) => {
    let obtainedCount = 0;
    data.badgeIds.forEach(id => {
      const entry = badgeRegistry.get(id);
      if (entry && entry.owned) obtainedCount++;
    });

    const previousCount = data.obtained || 0;
    if (obtainedCount > previousCount) {
      const headingEl = document.querySelector(`[data-region-key="${regionKey}"]`);
      if (headingEl) {
        headingEl.classList.remove("ping-green");
        void headingEl.offsetWidth;
        headingEl.classList.add("ping-green");
      }
    }

    data.obtained = obtainedCount;
    data.countEl.textContent = `${obtainedCount} / ${data.total}`;

    // roygbiv if 100%
    if (obtainedCount === data.total && data.total > 0) {
      if (!data.nameEl.classList.contains("completed")) {
        data.nameEl.classList.add("completed");
        data.nameEl.textContent = "";
        data.nameEl.appendChild(createRainbowText(data.originalName));
      }
    } else if (data.nameEl.classList.contains("completed")) {
      data.nameEl.classList.remove("completed");
      data.nameEl.textContent = data.originalName;
    }
  });
}

// --- subboxes ---

function addRow(container, label, value, strong) {
  const row = document.createElement("div");
  row.className = "row" + (strong ? " strong-row" : "");
  row.innerHTML = `<span class="label">${label}:</span><span class="value"></span>`;
  row.querySelector(".value").textContent = value;
  container.appendChild(row);
  return row;
}

function buildSubboxContent(badge, owned) {
  const [r, g, b] = getDifficultyColor(badge.difficulty);
  const darker = [r, g, b].map(c => Math.round(c * 0.55));
  const details = badgeDetailsCache.get(badge.id) || {};

  const box = document.createElement("div");
  box.className = "badge-subbox" + (owned ? "" : " locked");
  box.style.background = `rgba(${r}, ${g}, ${b}, 0.4)`;
  box.style.border = `4px solid rgb(${darker[0]}, ${darker[1]}, ${darker[2]})`;

  const inner = document.createElement("div");
  inner.className = "badge-subbox-inner";

  const content = document.createElement("div");
  content.className = "badge-subbox-content";

  addRow(content, "Full name", badge.fullName || "(not set)", true);
  if (details.description) addRow(content, "Description", details.description, true);
  addRow(content, "Difficulty", badge.difficulty.toFixed(2), true);

  const separator = document.createElement("div");
  separator.className = "separator";
  content.appendChild(separator);

  addRow(content, "Length", badge.length || "(not set)");
  addRow(content, "Type", badge.type || "(not set)");
  if (details.awardedCount !== undefined) {
    addRow(content, "Winners (all time)", details.awardedCount.toLocaleString());
  }

  inner.appendChild(content);
  box.appendChild(inner);

  return box;
}

function toggleSubbox(badgeId) {
  const entry = badgeRegistry.get(badgeId);
  if (!entry) return;

  if (entry.animState === "opening" || entry.animState === "open") {
    closeSubbox(entry);
  } else if (entry.animState === "closing") {
    finishCloseImmediately(entry);
    openSubbox(entry);
  } else {
    openSubbox(entry);
  }
}

function finishCloseImmediately(entry) {
  if (entry.subboxEl) {
    entry.subboxEl.remove();
    entry.subboxEl = null;
  }
  entry.animState = null;
  entry.barEl.classList.remove("expanded");
}

function openSubbox(entry) {
  const box = buildSubboxContent(entry.badge, entry.owned);
  const inner = box.querySelector(".badge-subbox-inner");

  inner.style.height = "0px";
  inner.style.overflow = "hidden";
  inner.style.transition = "height 0.32s ease";

  entry.barEl.insertAdjacentElement("afterend", box);
  entry.barEl.classList.add("expanded");
  entry.subboxEl = box;
  entry.animState = "opening";

  const pieces = inner.querySelectorAll(".row, .separator");
  pieces.forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";
    el.style.transition = "opacity 0.28s ease, transform 0.28s ease";
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = inner.scrollHeight;
      inner.style.height = target + "px";
      pieces.forEach((el, i) => {
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        }, 90 + i * 45);
      });
    });
  });

  inner.addEventListener("transitionend", function handler(e) {
    if (e.target !== inner) return;
    if (e.propertyName === "height") {
      if (entry.subboxEl === box && entry.animState === "opening") {
        inner.style.height = "auto";
        entry.animState = "open";
      }
      inner.removeEventListener("transitionend", handler);
    }
  });
}

function closeSubbox(entry) {
  const box = entry.subboxEl;
  if (!box) return;
  const inner = box.querySelector(".badge-subbox-inner");

  entry.barEl.classList.remove("expanded");
  entry.animState = "closing";

  const currentHeight = inner.scrollHeight;
  inner.style.height = currentHeight + "px";
  void inner.offsetHeight;
  inner.style.transition = "height 0.28s ease";

  const pieces = inner.querySelectorAll(".row, .separator");
  pieces.forEach(el => {
    el.style.transition = "opacity 0.15s ease";
    el.style.opacity = "0";
  });

  requestAnimationFrame(() => {
    inner.style.height = "0px";
  });

  inner.addEventListener("transitionend", function handler(e) {
    if (e.target !== inner) return;
    if (e.propertyName === "height") {
      inner.removeEventListener("transitionend", handler);
      if (entry.subboxEl === box) {
        box.remove();
        entry.subboxEl = null;
        entry.animState = null;
      }
    }
  });
}

// rebuild a subbox's content in place
function refreshSubboxIfOpen(badge) {
  const entry = badgeRegistry.get(badge.id);
  if (entry && entry.subboxEl) {
    const fresh = buildSubboxContent(badge, entry.owned);
    fresh.querySelector(".badge-subbox-inner").style.height = "auto"; // stay open, no re-animation
    entry.subboxEl.replaceWith(fresh);
    entry.subboxEl = fresh;
  }
}

// --- static data preloading (thumbnails + badge details) ---

function flattenAllBadges() {
  const all = [];
  CHANNELS.forEach(w => w.regions.forEach(r => r.badges.forEach(b => all.push(b))));
  return all;
}

async function preloadThumbnails() {
  const allBadges = flattenAllBadges();
  if (!allBadges.length) { thumbnailsLoaded = true; return; }

  const quiet = currentRunId !== 0; // don't overwrite status text during a check
  if (!quiet) setStatus("Loading badge images...");

  let missing = allBadges.map(b => b.id).filter(id => !thumbsDone.has(id));

  for (let pass = 0; pass < 3 && missing.length; pass++) {
    await runPool(chunkArray(missing, THUMB_BATCH_SIZE), async (ids) => {
      try {
        const target = encodeURIComponent(
          `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${ids.join(",")}&size=150x150&format=Png`
        );
        const res = await fetchWithRetry(`${WORKER}/?url=${target}`);
        if (!res.ok) return;
        const data = await res.json();
        (data.data || []).forEach(item => {
          const entry = badgeRegistry.get(item.targetId);
          if (entry && item.imageUrl) {
            entry.imgEl.src = item.imageUrl;
            thumbsDone.add(item.targetId);
          }
        });
      } catch (err) {
        console.error("Thumbnail batch failed:", err);
      }
    }, 2);

    missing = missing.filter(id => !thumbsDone.has(id));
    if (missing.length) await delay(1200);
  }

  thumbnailsLoaded = missing.length === 0;
  if (!quiet && currentRunId === 0) {
    setStatus(thumbnailsLoaded ? "" : "Some badge images couldn't load, will retry next check");
  }
}

async function preloadBadgeDetails() {
  const allBadges = flattenAllBadges();
  if (!allBadges.length) { detailsLoaded = true; return; }

  for (let pass = 0; pass < 2; pass++) {
    const missing = allBadges.filter(b => !badgeDetailsCache.has(b.id));
    if (!missing.length) break;

    await runPool(missing, async (badge) => {
      try {
        const target = encodeURIComponent(`https://badges.roblox.com/v1/badges/${badge.id}`);
        const res = await fetchWithRetry(`${WORKER}/?url=${target}`);
        if (!res.ok) return;
        const info = await res.json();
        badgeDetailsCache.set(badge.id, {
          description: info.description || "",
          awardedCount: info.statistics ? info.statistics.awardedCount : undefined
        });
        refreshSubboxIfOpen(badge);
      } catch (err) {
        console.error(`Badge info fetch failed for ${badge.id}:`, err);
      }
    }, DETAILS_CONCURRENCY);
  }

  detailsLoaded = allBadges.every(b => badgeDetailsCache.has(b.id));
}

// de-duplicated so page-load preloads and checkBadges() never double-fire
function ensureThumbnails() {
  if (thumbnailsLoaded) return Promise.resolve();
  if (!thumbsInFlight) thumbsInFlight = preloadThumbnails().finally(() => { thumbsInFlight = null; });
  return thumbsInFlight;
}
function ensureDetails() {
  if (detailsLoaded) return Promise.resolve();
  if (!detailsInFlight) detailsInFlight = preloadBadgeDetails().finally(() => { detailsInFlight = null; });
  return detailsInFlight;
}

// --- ownership checking ---

async function fetchOwnedBatch(userId, badges, signal) {
  try {
    const ids = badges.map(b => b.id).join(",");
    const target = encodeURIComponent(
      `https://badges.roblox.com/v1/users/${userId}/badges/awarded-dates?badgeIds=${ids}`
    );
    const res = await fetchWithRetry(`${WORKER}/?url=${target}`, {}, { signal });
    if (!res.ok) {
      console.error(`Batch ownership check HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.data)) return null;
    return new Set(json.data.map(d => Number(d.badgeId)));
  } catch (err) {
    if (err.name === "AbortError") throw err;
    console.error("Batch ownership check failed:", err);
    return null;
  }
}

// Fallback: single-badge lookup. Returns true / false / null (= unknown).
async function fetchOwnedSingle(userId, badge, signal) {
  try {
    const target = encodeURIComponent(
      `https://inventory.roblox.com/v1/users/${userId}/items/Badge/${badge.id}`
    );
    const res = await fetchWithRetry(`${WORKER}/?url=${target}`, {}, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !Array.isArray(json.data)) return null;
    return json.data.length > 0;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return null;
  }
}

function applyOwnership(badge, owned) {
  const entry = badgeRegistry.get(badge.id);
  if (!entry) return;
  entry.owned = owned;
  entry.barEl.classList.toggle("locked", !owned);
  entry.statusTagEl.textContent = owned ? "OWNED" : "UNOBTAINED";
  entry.imgWrapEl.classList.toggle("wobble", owned);
  refreshSubboxIfOpen(badge);
}

function markUnknown(badge) {
  const entry = badgeRegistry.get(badge.id);
  if (!entry) return;
  entry.owned = false;
  entry.barEl.classList.add("locked");
  entry.statusTagEl.textContent = "COULDN'T VERIFY";
  entry.imgWrapEl.classList.remove("wobble");
}

// Resets on-screen state so checkBadges() can be re-run without a refresh.
function resetBadgeStates() {
  badgeRegistry.forEach(entry => {
    entry.owned = false;
    entry.barEl.classList.add("locked");
    entry.statusTagEl.textContent = "CHECKING…";
    entry.imgWrapEl.classList.remove("wobble");
    if (entry.subboxEl) refreshSubboxIfOpen(entry.badge);
  });
  regionRegistry.forEach(data => {
    data.obtained = 0;
    data.countEl.textContent = `0 / ${data.total}`;
    if (data.nameEl.classList.contains("completed")) {
      data.nameEl.classList.remove("completed");
      data.nameEl.textContent = data.originalName;
    }
  });
  updateProgressSummary(0, flattenAllBadges().length);
}

async function checkBadges() {
  const usernameInput = document.getElementById("username");
  const username = usernameInput ? usernameInput.value.trim() : "";
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  // Cancel any run already in flight and start a clean new one.
  currentRunId += 1;
  const runId = currentRunId;
  if (currentAbortController) currentAbortController.abort();
  const abortController = new AbortController();
  currentAbortController = abortController;
  const signal = abortController.signal;

  resetBadgeStates();
  setStatus("Looking up username...");

  // Step 1: Username -> User ID
  let userId;
  try {
    const target = encodeURIComponent("https://users.roblox.com/v1/usernames/users");
    const userRes = await fetchWithRetry(`${WORKER}/?url=${target}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    }, { signal });

    if (runId !== currentRunId) return;

    if (!userRes.ok) {
      const errorText = await userRes.text().catch(() => "");
      console.error(`Roblox API Error ${userRes.status}:`, errorText);

      if (userRes.status === 429) {
        setStatus("Roblox is rate-limiting requests. Wait a bit (like a minute) and try again.");
      } else if (userRes.status === 403) {
        setStatus("The proxy or Roblox is temporarily refusing requests. Try again shortly (kinda annoying ik).");
      } else if (userRes.status >= 500) {
        setStatus(`Server error (${userRes.status}) from Roblox/the proxy. Try again in a moment.`);
      } else {
        setStatus(`Roblox API Error (${userRes.status}). Check console.`);
      }
      return;
    }

    const userData = await userRes.json();
    if (!userData.data || userData.data.length === 0) {
      setStatus("User not found. Did you wrote name correctly?");
      return;
    }
    userId = userData.data[0].id;

  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Username lookup failed:", err);
    setStatus("Error looking up username (network issue). Check console for details.");
    return;
  }

  const allBadges = flattenAllBadges();
  const total = allBadges.length;
  let resolvedCount = 0;
  let obtainedCount = 0;

  const resolve = (badge, owned) => {
    applyOwnership(badge, owned);
    resolvedCount++;
    if (owned) obtainedCount++;
  };
  const refresh = () => {
    if (runId !== currentRunId) return;
    setStatus(`Checking ownership... (${resolvedCount}/${total})`);
    updateProgressSummary(obtainedCount, total);
    updateRegionProgress();
  };

  updateProgressSummary(0, total);
  setStatus("Checking badges...");

  try {
    // Step 2: batched ownership check (a handful of requests total)
    let pending = [];
    await runPool(chunkArray(allBadges, OWNERSHIP_BATCH_SIZE), async (chunk) => {
      const ownedSet = await fetchOwnedBatch(userId, chunk, signal);
      if (runId !== currentRunId) return;
      if (ownedSet) chunk.forEach(b => resolve(b, ownedSet.has(Number(b.id))));
      else pending.push(...chunk);
      refresh();
    }, BATCH_CONCURRENCY);

    if (runId !== currentRunId) return;

    // Step 3: anything the batch couldn't answer is retried one-by-one,
    // several passes, sharing the global rate-limit cooldown
    for (let pass = 1; pass <= FALLBACK_PASSES && pending.length && runId === currentRunId; pass++) {
      setStatus(`Some checks failed - retrying ${pending.length} badge(s)... (attempt ${pass}/${FALLBACK_PASSES})`);
      const stillPending = [];

      await runPool(pending, async (badge) => {
        if (runId !== currentRunId) return;
        const owned = await fetchOwnedSingle(userId, badge, signal);
        if (runId !== currentRunId) return;
        if (owned === null) stillPending.push(badge);
        else resolve(badge, owned);
        refresh();
      }, FALLBACK_CONCURRENCY);

      pending = stillPending;
      if (pending.length && pass < FALLBACK_PASSES) await delay(1500 * pass);
    }

    if (runId !== currentRunId) return;

    // Anything left is shown as "couldn't verify" - never silently as UNOBTAINED
    pending.forEach(markUnknown);
    updateProgressSummary(obtainedCount, total);
    updateRegionProgress();

    if (pending.length) {
      setStatus(`${pending.length} badge(s) couldn't be verified. You can press check again to retry.`);
    } else {
      setStatus(`Finished checking ${total} badges for ${username}.`);
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Badges check crashed:", err);
    setStatus("Something went wrong while checking badges. Check console for details.");
    return;
  }

  // Step 4: cosmetic data (images + descriptions) loads after the important part
  ensureThumbnails();
  ensureDetails();
}

// ---------- intro text / credit tweaks ----------

const INTRO_LINE_1 =
  "Hi, this is a custom made tracker for zKatanas's Hectic Towers, I made this since TowerStats looks kinda boring. " +
  "Now keep in mind it can sometimes be slow due to Roblox's API rate limits and might be at times inaccurate. Hope you like.";
const INTRO_LINE_2 = "DM me if you want one (not free ofc)";

function findDeepestByText(regex) {
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  const candidates = Array.from(document.body.querySelectorAll("*"))
    .filter(el => !skip.has(el.tagName) && !el.closest("script, style, noscript") && regex.test(el.textContent));
  return candidates.find(el => !Array.from(el.children).some(ch => regex.test(ch.textContent))) || null;
}

function applyIntroText() {
  const hint = findDeepestByText(/click a bar to see full details/i);
  if (hint) {
    hint.textContent = "";
    hint.appendChild(document.createTextNode(INTRO_LINE_1));
    hint.appendChild(document.createElement("br"));
    hint.appendChild(document.createTextNode(INTRO_LINE_2));
    Object.assign(hint.style, {
  fontWeight: "300",
  fontSize: "0.9em",
  lineHeight: "1.55",
  letterSpacing: "0.01em",
  maxWidth: "none",
  width: "100%",
  marginLeft: "0",
  marginRight: "0",
  textAlign: "left",
  opacity: "0.9"
});
  }

  const credit = findDeepestByText(/made by[\s\S]*ruquiste/i);
  if (credit) credit.style.translate = "0 22px";
}

document.addEventListener("DOMContentLoaded", () => {
  renderSkeleton();
  applyIntroText();
  updateProgressSummary(0, flattenAllBadges().length);
  ensureThumbnails().then(ensureDetails);
});
