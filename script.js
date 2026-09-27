const WORKER = "https://roblox-badge-proxy.nguyenksang19052006.workers.dev";

// Neutral placeholder shown before a username has been checked / before thumbnails load
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
     <rect width="150" height="150" rx="18" fill="#3a3d44"/>
     <text x="75" y="95" font-size="60" text-anchor="middle" fill="#7a7d84" font-family="Arial">?</text>
   </svg>`
);

// id -> { badge, barEl, imgEl, acronymEl, subboxEl (or null when closed), owned, animState }
const badgeRegistry = new Map();

// id -> { description, awardedCount } once fetched
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

// ---------- Building the bars (skeleton, shown immediately on page load) ----------

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
    subboxEl: null, owned: false, animState: null // animState: null | "opening" | "open" | "closing"
  });

  return bar;
}

function renderSkeleton() {
  const container = document.getElementById("channels-container");
  container.innerHTML = "";

  CHANNELS.forEach(worldEntry => {
    const worldHeading = document.createElement("div");
    worldHeading.className = "world-heading";
    worldHeading.textContent = worldEntry.world;
    container.appendChild(worldHeading);

    worldEntry.regions.forEach(region => {
      if (!region.badges.length) return; // skip empty placeholder regions

      const regionHeading = document.createElement("div");
      regionHeading.className = "region-heading";
      regionHeading.textContent = region.name;
      container.appendChild(regionHeading);

      const list = document.createElement("div");
      list.className = "badge-bar-list";
      region.badges.forEach(badge => {
        const bar = buildBar(badge);
        // wrap each bar in its own unit so the list's big inter-badge gap
        // never lands between a bar and its own sub-box (they share this
        // wrapper instead, flush against each other with zero spacing)
        const unit = document.createElement("div");
        unit.className = "badge-unit";
        unit.appendChild(bar);
        list.appendChild(unit);
      });
      container.appendChild(list);
    });
  });
}

// ---------- Sub-box (expand/collapse on click) ----------
//
// Animates an explicit pixel `height` on the INNER wrapper (measured via
// scrollHeight), not max-height/grid-fr on the outer box. This is the most
// reliable way to get a true 0 -> full -> 0 slide: scrollHeight always
// reports the real content height even while clipped, and using a plain
// "height" transition (with a forced reflow + a double requestAnimationFrame
// before the first change) avoids both the "already looks open on the very
// first frame" glitch and the "shrinks to some floor then instantly
// disappears" glitch — both are symptoms of the browser never actually
// registering the starting value before the transition begins.

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

  // This wrapper purely handles the 0px -> scrollHeight animation
  const inner = document.createElement("div");
  inner.className = "badge-subbox-inner";

  // NEW: This wrapper purely handles the spacing/padding
  const content = document.createElement("div");
  content.className = "badge-subbox-content";

  // CHANGE: Append all your rows to 'content' instead of 'inner'
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

  // Put the padded content inside the animated wrapper
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
    // a click arrived mid-close: snap the old box away instantly instead of
    // letting it linger, then open fresh — this is what was causing leftover
    // boxes to pile up when toggling faster than the animation
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

  // rows/separator start hidden, then fade+rise in a stagger once it starts opening
  const pieces = inner.querySelectorAll(".row, .separator");
  pieces.forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";
    el.style.transition = "opacity 0.28s ease, transform 0.28s ease";
  });

  // scrollHeight reports the true content height even while height:0 clips it,
  // so we can read the target immediately — no need to un-collapse to measure.
  // Two nested rAFs guarantee the 0px state has actually been painted once
  // before we change it, which is what makes the transition play at all
  // instead of the box just appearing already-expanded on frame one.
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
        inner.style.height = "auto"; // let it breathe if content changes later (e.g. data refresh)
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

  // lock in the current pixel height (scrollHeight is correct even if height
  // is currently "auto") so we have a real starting point to animate down from
  const currentHeight = inner.scrollHeight;
  inner.style.height = currentHeight + "px";
  void inner.offsetHeight; // force reflow so that starting height is committed
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

// rebuild a subbox's content in place (no slide animation) when fresh data arrives
function refreshSubboxIfOpen(badge) {
  const entry = badgeRegistry.get(badge.id);
  if (entry && entry.subboxEl) {
    const fresh = buildSubboxContent(badge, entry.owned);
    fresh.querySelector(".badge-subbox-inner").style.height = "auto"; // stay open, no re-animation
    entry.subboxEl.replaceWith(fresh);
    entry.subboxEl = fresh;
  }
}

// ---------- Fetching live data for a username ----------

function flattenAllBadges() {
  const all = [];
  CHANNELS.forEach(w => w.regions.forEach(r => r.badges.forEach(b => all.push(b))));
  return all;
}

let thumbnailsLoaded = false;

async function preloadThumbnails() {
  const allBadges = flattenAllBadges();
  if (!allBadges.length) return;

  setStatus("Loading badge images...");
  const badgeIds = allBadges.map(b => b.id);
  try {
    const target = encodeURIComponent(
      `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${badgeIds.join(",")}&size=150x150&format=Png`
    );
    const thumbRes = await fetch(`${WORKER}/?url=${target}`);
    const thumbData = await thumbRes.json();
    if (thumbData.data) {
      thumbData.data.forEach(item => {
        const entry = badgeRegistry.get(item.targetId);
        if (entry && item.imageUrl) entry.imgEl.src = item.imageUrl;
      });
    }
    thumbnailsLoaded = true;
    setStatus("");
  } catch (err) {
    console.error("Thumbnail preload failed:", err);
    setStatus("Couldn't preload badge images — check console for details.");
  }
}

let detailsLoaded = false;

async function preloadBadgeDetails() {
  const allBadges = flattenAllBadges();
  if (!allBadges.length) return;

  for (const badge of allBadges) {
    try {
      const target = encodeURIComponent(`https://badges.roblox.com/v1/badges/${badge.id}`);
      const infoRes = await fetch(`${WORKER}/?url=${target}`);
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        badgeDetailsCache.set(badge.id, {
          description: infoData.description || "",
          awardedCount: infoData.statistics ? infoData.statistics.awardedCount : undefined
        });
        // if this bar's subbox happens to already be open, refresh it now that data arrived
        refreshSubboxIfOpen(badge);
      }
    } catch (err) {
      console.error(`Badge info fetch failed for ${badge.id}:`, err);
    }
    await delay(150);
  }
  detailsLoaded = true;
}

async function checkBadges() {
  const username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter a username!");
    return;
  }

  const allBadges = flattenAllBadges();
  if (!allBadges.length) {
    setStatus("No badges hard-coded yet — fill in badges-data.js first.");
    return;
  }

  setStatus("Looking up username...");

  // Step 1: Username -> User ID
  let userId;
  try {
    const target = encodeURIComponent("https://users.roblox.com/v1/usernames/users");
    const userRes = await fetch(`${WORKER}/?url=${target}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    const userData = await userRes.json();

    if (!userData.data || userData.data.length === 0) {
      setStatus("User not found!");
      return;
    }
    userId = userData.data[0].id;
  } catch (err) {
    console.error("Username lookup failed:", err);
    setStatus("Error looking up username. Check console for details.");
    return;
  }

  // Step 2: Thumbnails (skip if the preload on page load already got them)
  if (!thumbnailsLoaded) {
    setStatus("Loading badge images...");
    await preloadThumbnails();
  }

  // Step 3: Badge info (description + winners) — already preloaded on page load,
  // but fetch now as a fallback if the preload somehow hasn't finished/failed
  if (!detailsLoaded) {
    setStatus("Loading badge details...");
    await preloadBadgeDetails();
  }

  // Step 4: Ownership check per badge (rate-limited with a short delay)
  let obtainedCount = 0;
  updateProgressSummary(0, allBadges.length);

  for (let i = 0; i < allBadges.length; i++) {
    const badge = allBadges[i];
    setStatus(`Checking ownership... (${i + 1}/${allBadges.length})`);
    try {
      const target = encodeURIComponent(
        `https://inventory.roblox.com/v1/users/${userId}/items/Badge/${badge.id}`
      );
      const checkRes = await fetch(`${WORKER}/?url=${target}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const owned = checkData && checkData.data && checkData.data.length > 0;
        const entry = badgeRegistry.get(badge.id);
        if (entry) {
          entry.owned = owned;
          entry.barEl.classList.toggle("locked", !owned);
          entry.statusTagEl.textContent = owned ? "OWNED" : "UNOBTAINED";
          entry.imgWrapEl.classList.toggle("wobble", owned);
          // if this bar's subbox is currently open, refresh it with the newly fetched data
          refreshSubboxIfOpen(badge);
        }
        if (owned) obtainedCount++;
        updateProgressSummary(obtainedCount, allBadges.length);
      }
    } catch (err) {
      console.error(`Ownership check failed for badge ${badge.id}:`, err);
    }
    await delay(400);
  }

  setStatus(`Done — checked ${allBadges.length} badges for ${username}.`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderSkeleton();
  updateProgressSummary(0, flattenAllBadges().length);
  preloadThumbnails();
  preloadBadgeDetails();
});
