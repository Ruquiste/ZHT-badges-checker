const WORKER = "https://roblox-badge-proxy.nguyenksang19052006.workers.dev";

// Neutral placeholder shown before a username has been checked / before thumbnails load
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
     <rect width="150" height="150" rx="18" fill="#3a3d44"/>
     <text x="75" y="95" font-size="60" text-anchor="middle" fill="#7a7d84" font-family="Arial">?</text>
   </svg>`
);

// id -> { badge, barEl, imgEl, acronymEl, subboxEl (or null when closed) }
const badgeRegistry = new Map();

// id -> { description, awardedCount } once fetched
const badgeDetailsCache = new Map();

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function setStatus(text) {
  document.getElementById("status-line").textContent = text;
}

// ---------- Building the bars (skeleton, shown immediately on page load) ----------

function buildBar(badge) {
  const [r, g, b] = getDifficultyColor(badge.difficulty);

  const bar = document.createElement("div");
  bar.className = "badge-bar locked";
  bar.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
  bar.dataset.badgeId = badge.id;

  const acronym = document.createElement("div");
  acronym.className = "acronym";
  acronym.textContent = badge.acronym;

  const statusTag = document.createElement("div");
  statusTag.className = "status-tag";
  statusTag.textContent = "UNOBTAINED";

  const imgWrap = document.createElement("div");
  imgWrap.className = "badge-img-wrap";

  const img = document.createElement("img");
  img.src = PLACEHOLDER_IMG;
  img.alt = badge.acronym;
  imgWrap.appendChild(img);

  bar.appendChild(acronym);
  bar.appendChild(statusTag);
  bar.appendChild(imgWrap);

  bar.addEventListener("click", () => toggleSubbox(badge.id));

  badgeRegistry.set(badge.id, { badge, barEl: bar, imgEl: img, statusTagEl: statusTag, subboxEl: null });

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
      region.badges.forEach(badge => list.appendChild(buildBar(badge)));
      container.appendChild(list);
    });
  });
}

// ---------- Sub-box (expand/collapse on click) ----------

function buildSubboxContent(badge) {
  const [r, g, b] = getDifficultyColor(badge.difficulty);
  const details = badgeDetailsCache.get(badge.id) || {};

  const box = document.createElement("div");
  box.className = "badge-subbox";
  box.style.background = `rgba(${r}, ${g}, ${b}, 0.15)`;
  box.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.8)`;

  const rows = [];
  rows.push(["Full name", badge.fullName || "(not set)"]);
  if (details.description) rows.push(["Description", details.description]);
  rows.push(["Difficulty", badge.difficulty.toFixed(2)]);
  rows.push(["Length", badge.length || "(not set)"]);
  rows.push(["Type", badge.type || "(not set)"]);
  if (details.awardedCount !== undefined) {
    rows.push(["Winners (all time)", details.awardedCount.toLocaleString()]);
  }

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="label">${label}:</span><span class="value"></span>`;
    row.querySelector(".value").textContent = value;
    box.appendChild(row);
  });

  return box;
}

function toggleSubbox(badgeId) {
  const entry = badgeRegistry.get(badgeId);
  if (!entry) return;

  if (entry.subboxEl) {
    entry.subboxEl.remove();
    entry.subboxEl = null;
    return;
  }

  const box = buildSubboxContent(entry.badge);
  entry.barEl.insertAdjacentElement("afterend", box);
  entry.subboxEl = box;
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

  // Step 3: Badge info (description + all-time winners count)
  setStatus("Loading badge details...");
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
      }
    } catch (err) {
      console.error(`Badge info fetch failed for ${badge.id}:`, err);
    }
    await delay(150);
  }

  // Step 4: Ownership check per badge (rate-limited with a short delay)
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
          entry.barEl.classList.toggle("locked", !owned);
          entry.statusTagEl.textContent = owned ? "OWNED" : "LOCKED";
          // if this bar's subbox is currently open, refresh it with the newly fetched data
          if (entry.subboxEl) {
            const fresh = buildSubboxContent(badge);
            entry.subboxEl.replaceWith(fresh);
            entry.subboxEl = fresh;
          }
        }
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
  preloadThumbnails();
});
