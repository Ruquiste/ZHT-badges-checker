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
  regionRegistry.forEach((data) => {
    let obtainedCount = 0;
    data.badgeIds.forEach(id => {
      const entry = badgeRegistry.get(id);
      if (entry && entry.owned) obtainedCount++;
    });

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

  // fetch all badge details without delay
  const fetchPromises = allBadges.map(async (badge) => {
    try {
      const target = encodeURIComponent(`https://badges.roblox.com/v1/badges/${badge.id}`);
      const infoRes = await fetch(`${WORKER}/?url=${target}`);
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        badgeDetailsCache.set(badge.id, {
          description: infoData.description || "",
          awardedCount: infoData.statistics ? infoData.statistics.awardedCount : undefined
        });
        refreshSubboxIfOpen(badge);
      }
    } catch (err) {
      console.error(`Badge info fetch failed for ${badge.id}:`, err);
    }
  });

  await Promise.all(fetchPromises);
  detailsLoaded = true;
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
    const userRes = await fetch(`${WORKER}/?url=${target}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    
    if (!userRes.ok) {
      throw new Error(`HTTP Error: ${userRes.status}`);
    }

    const userData = await userRes.json();

    if (!userData.data || userData.data.length === 0) {
      setStatus("User not found.");
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
    setStatus("Loading badge images...");
    await preloadThumbnails();
  }

  // Step 3: Badge info (description + winners)
  if (!detailsLoaded) {
    setStatus("Loading badge details...");
    await preloadBadgeDetails();
  }

  // Step 4: Ownership check per badge
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
          refreshSubboxIfOpen(badge);
        }
        if (owned) obtainedCount++;
        updateProgressSummary(obtainedCount, allBadges.length);
        updateRegionProgress();
      }
    } catch (err) {
      console.error(`Ownership check failed for badge ${badge.id}:`, err);
    }
    await delay(400);
  }

  setStatus(`Finished checking ${allBadges.length} badges for ${username}.`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderSkeleton();
  updateProgressSummary(0, flattenAllBadges().length);
  preloadThumbnails();
  preloadBadgeDetails();
});
