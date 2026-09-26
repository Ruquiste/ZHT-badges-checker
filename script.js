const BADGE_IDS = [2124799722, 2124841910, 2124841911];
const WORKER = "https://roblox-badge-proxy.nguyenksang19052006.workers.dev";

async function checkBadges() {
  const username = document.getElementById("username").value.trim();
  const gridContainer = document.getElementById("badge-grid");

  if (!username) {
    alert("Please enter a username!");
    return;
  }

  gridContainer.innerHTML = "<p>Loading...</p>";

  // Step 1: Username -> User ID
  let userId;
  try {
    const target = encodeURIComponent("https://users.roblox.com/v1/usernames/users");
    const userRes = await fetch(`${WORKER}/?url=${target}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    console.log("Username lookup status:", userRes.status);
    const userData = await userRes.json();
    console.log("Username lookup data:", userData);

    if (!userData.data || userData.data.length === 0) {
      gridContainer.innerHTML = "<p>User not found!</p>";
      return;
    }
    userId = userData.data[0].id;
  } catch (err) {
    console.error("Step 1 (username lookup) failed:", err);
    gridContainer.innerHTML = "<p>Error looking up username. Check console for details.</p>";
    return;
  }

  // Step 2: Badge thumbnails
  let badgeImages = {};
  try {
    const badgeIdsParam = BADGE_IDS.join(",");
    const target = encodeURIComponent(
      `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${badgeIdsParam}&size=150x150&format=Png`
    );
    const thumbRes = await fetch(`${WORKER}/?url=${target}`);
    console.log("Thumbnail fetch status:", thumbRes.status);
    const thumbData = await thumbRes.json();
    console.log("Thumbnail data:", thumbData);

    if (thumbData.data) {
      thumbData.data.forEach(item => {
        badgeImages[item.targetId] = item.imageUrl;
      });
    }
  } catch (err) {
    console.error("Step 2 (thumbnails) failed:", err);
  }

  // Step 3: Check ownership per badge
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  const ownedBadges = new Set();

  for (const badgeId of BADGE_IDS) {
    try {
      const target = encodeURIComponent(
        `https://inventory.roblox.com/v1/users/${userId}/items/Badge/${badgeId}`
      );
      const checkRes = await fetch(`${WORKER}/?url=${target}`);
      console.log(`Ownership check for badge ${badgeId}: status ${checkRes.status}`);

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        console.log(`Ownership data for badge ${badgeId}:`, checkData);
        if (checkData && checkData.data && checkData.data.length > 0) {
          ownedBadges.add(badgeId);
        }
      }
    } catch (err) {
      console.error(`Step 3 (ownership check for badge ${badgeId}) failed:`, err);
    }
    await delay(400);
  }

  // Step 4: Render
  gridContainer.innerHTML = "";
  BADGE_IDS.forEach(badgeId => {
    const isOwned = ownedBadges.has(badgeId);
    const imageUrl = badgeImages[badgeId] || "https://via.placeholder.com/100";

    const card = document.createElement("div");
    card.className = `badge-card ${isOwned ? "owned" : ""}`;
    card.innerHTML = `
      <img src="${imageUrl}" alt="Badge ${badgeId}">
      <div><strong>Badge ID:</strong></div>
      <div>${badgeId}</div>
      <div style="margin-top: 5px; font-size: 12px; font-weight: bold;">
        ${isOwned ? "OWNED" : "LOCKED"}
      </div>
    `;
    gridContainer.appendChild(card);
  });
}
