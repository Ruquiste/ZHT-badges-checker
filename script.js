const WORKER = "https://roblox-badge-proxy.nguyenksang19052006.workers.dev";

// placeholder
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
     <rect width="150" height="150" rx="18" fill="#3a3d44"/>
     <text x="75" y="95" font-size="60" text-anchor="middle" fill="#7a7d84" font-family="Arial">?</text>
   </svg>`
);

const badgeRegistry = new Map();

const badgeDetailsCache = new Map();

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function setStatus(text) {
  document.getElementById("status-line").textContent = text;
}

function updateProgressSummary(obtained, total) {
  const pct = total ? Math.round((obtained / total) * 100) : 0;
  document.getElementById("progress-summary").textContent =
    `${obtained} / ${total} badges obtained (${pct}%)`;
}

// --- networking helpers ---

// Splits an array into chunks of at most `size` items. Used to stay under
// Roblox's per-request ID caps on the batch endpoints (thumbnails,
// awarded-dates), which otherwise silently truncate or fail on big lists.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// fetch() wrapper that retries 429s (respecting Retry-After when present)
// and 5xx/network errors with exponential backoff, instead of letting a
// single transient failure silently look identical to "badge not owned".
async function fetchWithRetry(url, options = {}, maxRetries = 4) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      await delay(500 * 2 ** attempt);
      continue;
    }

    if (res.status === 429) {
      if (attempt >= maxRetries) throw new Error("429: rate limited after max retries");
      const retryAfter = parseFloat(res.headers.get("Retry-After")) || 0;
      await delay(Math.max(retryAfter * 1000, 700 * 2 ** attempt));
      continue;
    }

    if (!res.ok && res.status >= 500) {
      if (attempt >= maxRetries) return res; // give up, let caller handle non-ok
      await delay(500 * 2 ** attempt);
      continue;
    }

    return res;
  }
}

// Runs `worker` over `items` with at most `concurrency` in flight at once.
// Much faster than one-at-a-time-with-a-fixed-delay, but still bounded so
// we don't slam the proxy/Roblox with hundreds of simultaneous requests.
async function runPool(items, worker, concurrency = 4) {
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, next);
  await Promise.all(workers);
}

// --- bilding bars ---

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

const regionRegistry = new Map();

function createRainbowText(text) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.className = "rainbow-char";
    span.textContent = text[i];
    span.style.animationDelay = `${i * 0.75}s`;
    frag.appendChild(span);
  }
  return frag;
}

function renderSkeleton() {
  const container = document.getElementById("channels-container");
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

      // 4. toggle accordion click event
regionHeading.addEventListener("click", () => {
  const isOpen = contentWrapper.classList.contains("open");
  
  if (isOpen) {
    // Collapse
    contentWrapper.classList.add("animating");
    contentWrapper.style.height = contentWrapper.scrollHeight + "px";
    void contentWrapper.offsetHeight; // force reflow
    contentWrapper.style.height = "0px";
    contentWrapper.classList.remove("open");
    arrow.classList.remove("open");
    
    contentWrapper.addEventListener("transitionend", function handler(e) {
      if (e.propertyName === "height") {
        contentWrapper.classList.remove("animating");
        contentWrapper.removeEventListener("transitionend", handler);
      }
    });
  } else {
    // Expand region
    contentWrapper.classList.add("open", "animating");
    arrow.classList.add("open");
    contentWrapper.style.height = contentWrapper.scrollHeight + "px";

    contentWrapper.addEventListener("transitionend", function handler(e) {
      if (e.propertyName === "height" && contentWrapper.classList.contains("open")) {
        contentWrapper.style.height = "auto"; // set to auto so subboxes push lower content down!
        contentWrapper.classList.remove("animating");
        contentWrapper.removeEventListener("transitionend", handler);
      }
    });
  }
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
    } else {
      // revert if incomplete
      if (data.nameEl.classList.contains("completed")) {
        data.nameEl.classList.remove("completed");
        data.nameEl.textContent = data.originalName;
      }
    }
  });
}

// --- subboxes something ---

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

// --- fetching live data for a username ---

function flattenAllBadges() {
  const all = [];
  CHANNELS.forEach(w => w.regions.forEach(r => r.badges.forEach(b => all.push(b))));
  return all;
}

const BATCH_SIZE = 50; // conservative cap for Roblox's batch endpoints

let thumbnailsLoaded = false;

async function preloadThumbnails() {
  const allBadges = flattenAllBadges();
  if (!allBadges.length) return;

  setStatus("Loading badge images...");
  const idChunks = chunk(allBadges.map(b => b.id), BATCH_SIZE);
  let anyFailed = false;

  await runPool(idChunks, async (idsChunk) => {
    try {
      const target = encodeURIComponent(
        `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${idsChunk.join(",")}&size=150x150&format=Png`
      );
      const thumbRes = await fetchWithRetry(`${WORKER}/?url=${target}`);
      if (!thumbRes.ok) throw new Error(`HTTP ${thumbRes.status}`);
      const thumbData = await thumbRes.json();
      if (thumbData.data) {
        thumbData.data.forEach(item => {
          const entry = badgeRegistry.get(item.targetId);
          if (entry && item.imageUrl) entry.imgEl.src = item.imageUrl;
        });
      }
    } catch (err) {
      console.error("Thumbnail batch failed:", idsChunk, err);
      anyFailed = true;
    }
  }, 3);

  if (anyFailed) {
    setStatus("Some badge images failed to load — they'll retry next time you check a username.");
  } else {
    thumbnailsLoaded = true;
    setStatus("");
  }
}

let detailsLoaded = false;

async function preloadBadgeDetails() {
  const allBadges = flattenAllBadges();
  if (!allBadges.length) return;

  let anyFailed = false;

  // bounded concurrency instead of firing every request at once —
  // this alone was likely a big source of 429s
  await runPool(allBadges, async (badge) => {
    try {
      const target = encodeURIComponent(`https://badges.roblox.com/v1/badges/${badge.id}`);
      const infoRes = await fetchWithRetry(`${WORKER}/?url=${target}`);
      if (!infoRes.ok) throw new Error(`HTTP ${infoRes.status}`);
      const infoData = await infoRes.json();
      badgeDetailsCache.set(badge.id, {
        description: infoData.description || "",
        awardedCount: infoData.statistics ? infoData.statistics.awardedCount : undefined
      });
      refreshSubboxIfOpen(badge);
    } catch (err) {
      console.error(`Badge info fetch failed for ${badge.id}:`, err);
      anyFailed = true;
    }
  }, 6);

  detailsLoaded = !anyFailed;
}

// Ownership check: there is no public, unauthenticated batch endpoint for
// badge ownership (the awarded-dates endpoint requires a .ROBLOSECURITY
// cookie, and the Open Cloud v2 inventory-items batch endpoint requires an
// Open Cloud API key attached server-side in the Worker). So this stays
// one request per badge via the public inventory endpoint — but run
// through a concurrency pool with retries, instead of strictly sequential
// requests with a fixed 400ms sleep between every one.
async function checkOwnership(userId, allBadges) {
  const ownedIds = new Set();
  const failedIds = new Set();
  let done = 0;

  await runPool(allBadges, async (badge) => {
    try {
      const target = encodeURIComponent(
        `https://inventory.roblox.com/v1/users/${userId}/items/Badge/${badge.id}`
      );
      const res = await fetchWithRetry(`${WORKER}/?url=${target}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.data && data.data.length > 0) ownedIds.add(badge.id);
    } catch (err) {
      console.error(`Ownership check failed for badge ${badge.id}:`, err);
      failedIds.add(badge.id);
    }
    done++;
    setStatus(`Checking ownership... (${done}/${allBadges.length})`);
  }, 6); // in-flight requests — lower this if you still see 429s in console

  return { ownedIds, failedIds };
}

async function checkBadges() {
  const username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  setStatus("Looking up username...");

  // Step 1: Username -> User ID
  let userId;
  try {
    const target = encodeURIComponent("https://users.roblox.com/v1/usernames/users");

    const userRes = await fetchWithRetry(`${WORKER}/?url=${target}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    if (!userRes.ok) {
      const errorText = await userRes.text();
      console.error(`Roblox API Error ${userRes.status}:`, errorText);

      if (userRes.status === 429) {
        setStatus("Roblox is rate-limiting requests. Please wait a minute and try again.");
      } else {
        setStatus(`Roblox API Error (${userRes.status}). Check console.`);
      }
      return;
    }

    const userData = await userRes.json();

    if (!userData.data || userData.data.length === 0) {
      setStatus("User not found! Check your spelling.");
      return;
    }

    userId = userData.data[0].id;

  } catch (err) {
    console.error("Username lookup failed:", err);
    setStatus("Error looking up username. Check console for details.");
    return;
  }

  const allBadges = flattenAllBadges();

  // Step 2: Thumbnails
  if (!thumbnailsLoaded) {
    await preloadThumbnails();
  }

  // Step 3: Badge info (description + winners)
  if (!detailsLoaded) {
    setStatus("Loading badge details...");
    await preloadBadgeDetails();
  }

  // Step 4: Ownership check, batched
  updateProgressSummary(0, allBadges.length);
  const { ownedIds, failedIds } = await checkOwnership(userId, allBadges);

  let obtainedCount = 0;
  allBadges.forEach(badge => {
    const entry = badgeRegistry.get(badge.id);
    if (!entry) return;

    if (failedIds.has(badge.id)) {
      // couldn't verify this one — say so instead of guessing "unobtained"
      entry.statusTagEl.textContent = "?";
      return;
    }

    const owned = ownedIds.has(badge.id);
    entry.owned = owned;
    entry.barEl.classList.toggle("locked", !owned);
    entry.statusTagEl.textContent = owned ? "OWNED" : "UNOBTAINED";
    entry.imgWrapEl.classList.toggle("wobble", owned);
    refreshSubboxIfOpen(badge);
    if (owned) obtainedCount++;
  });

  updateProgressSummary(obtainedCount, allBadges.length);
  updateRegionProgress();

  if (failedIds.size) {
    setStatus(`Finished, but ${failedIds.size} badge(s) couldn't be verified — click Check again to retry.`);
  } else {
    setStatus(`Finished checking ${allBadges.length} badges for ${username}.`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderSkeleton();
  updateProgressSummary(0, flattenAllBadges().length);
  preloadThumbnails();
  preloadBadgeDetails();
});
