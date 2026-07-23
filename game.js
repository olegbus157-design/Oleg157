(function () {
  "use strict";

  // ---------------------------------------------------------------
  // Telegram WebApp integration
  // ---------------------------------------------------------------
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  function applyTelegramTheme() {
    if (!tg) return;
    const p = tg.themeParams || {};
    const root = document.documentElement;
    if (p.bg_color) root.style.setProperty("--tg-theme-bg-color", p.bg_color);
    if (p.text_color) root.style.setProperty("--tg-theme-text-color", p.text_color);
  }

  if (tg) {
    tg.ready();
    tg.expand();
    applyTelegramTheme();
    tg.onEvent("themeChanged", applyTelegramTheme);
    try { tg.setHeaderColor("secondary_bg_color"); } catch (e) {}
  }

  function haptic(style) {
    if (tg && tg.HapticFeedback) {
      try { tg.HapticFeedback.impactOccurred(style || "light"); } catch (e) {}
    }
  }

  // ---------------------------------------------------------------
  // Game data
  // ---------------------------------------------------------------
  const MINERS = [
    { id: "m1", name: "Шахтёр-новичок", icon: "🧑‍🔧", baseCost: 15, baseProd: 0.1 },
    { id: "m2", name: "Тележка с киркой", icon: "🛒", baseCost: 120, baseProd: 1 },
    { id: "m3", name: "Экскаватор", icon: "🚜", baseCost: 1200, baseProd: 8 },
    { id: "m4", name: "Буровая установка", icon: "🛢️", baseCost: 13000, baseProd: 47 },
    { id: "m5", name: "Обогатительный завод", icon: "🏭", baseCost: 140000, baseProd: 260 },
    { id: "m6", name: "Глубокая шахта", icon: "⛰️", baseCost: 1600000, baseProd: 1400 },
    { id: "m7", name: "Роботы-дроны", icon: "🤖", baseCost: 20000000, baseProd: 7800 },
    { id: "m8", name: "Космодобытчик", icon: "🚀", baseCost: 330000000, baseProd: 44000 },
  ];

  const AUTOCLICKERS = [
    { id: "a1", name: "Ленивый кот на кнопке", icon: "🐱", baseCost: 300, cps: 0.5 },
    { id: "a2", name: "Дедушкина палка-тыкалка", icon: "👴", baseCost: 2000, cps: 1 },
    { id: "a3", name: "Робот-манипулятор Петрович", icon: "🤖", baseCost: 15000, cps: 3 },
    { id: "a4", name: "Дрессированный голубь", icon: "🕊️", baseCost: 90000, cps: 6 },
    { id: "a5", name: "Тайный клон самого себя", icon: "🧑‍🤝‍🧑", baseCost: 600000, cps: 12 },
    { id: "a6", name: "ИИ-кликер по подписке", icon: "🖥️", baseCost: 4000000, cps: 25 },
    { id: "a7", name: "Секта кликающих монахов", icon: "🧘", baseCost: 30000000, cps: 50 },
    { id: "a8", name: "Квантовый палец из будущего", icon: "👆", baseCost: 250000000, cps: 100 },
  ];

  const UPGRADES = [
    { id: "u1", type: "click", name: "Стальная кирка", icon: "⚒️", cost: 50, mult: 2, desc: "Сила клика ×2" },
    { id: "p1", type: "prod", name: "Смазка для техники", icon: "🛠️", cost: 500, mult: 2, desc: "Вся добыча ×2" },
    { id: "u2", type: "click", name: "Алмазный наконечник", icon: "💠", cost: 1000, mult: 2, desc: "Сила клика ×2" },
    { id: "p2", type: "prod", name: "Ночная смена", icon: "🌙", cost: 8000, mult: 2, desc: "Вся добыча ×2" },
    { id: "u3", type: "click", name: "Автомолот", icon: "🔨", cost: 25000, mult: 3, desc: "Сила клика ×3" },
    { id: "p3", type: "prod", name: "ИИ-логистика", icon: "🧠", cost: 150000, mult: 2, desc: "Вся добыча ×2" },
    { id: "u4", type: "click", name: "Наниты-разрушители", icon: "🧬", cost: 750000, mult: 4, desc: "Сила клика ×4" },
    { id: "p4", type: "prod", name: "Квантовая добыча", icon: "⚛️", cost: 5000000, mult: 3, desc: "Вся добыча ×3" },
  ];

  const SAVE_KEY = "idleMinerSave_v1";
  const OFFLINE_CAP_MS = 4 * 60 * 60 * 1000; // 4 hours
  const OFFLINE_RATE = 0.5; // 50% efficiency while away

  function defaultState() {
    const owned = {};
    MINERS.forEach((m) => (owned[m.id] = 0));
    const autoOwned = {};
    AUTOCLICKERS.forEach((a) => (autoOwned[a.id] = 0));
    const bought = {};
    UPGRADES.forEach((u) => (bought[u.id] = false));
    return {
      gold: 0,
      totalGoldEarned: 0,
      totalClicks: 0,
      gems: 0,
      owned,
      autoOwned,
      bought,
      lastSave: Date.now(),
    };
  }

  let state = loadState();

  function loadState() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {}
    if (!raw) return defaultState();
    try {
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return Object.assign(base, parsed, {
        owned: Object.assign(base.owned, parsed.owned || {}),
        autoOwned: Object.assign(base.autoOwned, parsed.autoOwned || {}),
        bought: Object.assign(base.bought, parsed.bought || {}),
      });
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    state.lastSave = Date.now();
    const json = JSON.stringify(state);
    try { localStorage.setItem(SAVE_KEY, json); } catch (e) {}
    if (tg && tg.CloudStorage && (!tg.isVersionAtLeast || tg.isVersionAtLeast("6.9"))) {
      try { tg.CloudStorage.setItem(SAVE_KEY, json, () => {}); } catch (e) {}
    }
  }

  // ---------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------
  function prestigeMult() {
    return 1 + state.gems * 0.02;
  }

  function clickUpgradeMult() {
    let mult = 1;
    UPGRADES.forEach((u) => {
      if (u.type === "click" && state.bought[u.id]) mult *= u.mult;
    });
    return mult;
  }

  function prodUpgradeMult() {
    let mult = 1;
    UPGRADES.forEach((u) => {
      if (u.type === "prod" && state.bought[u.id]) mult *= u.mult;
    });
    return mult;
  }

  function minerCost(minerDef) {
    const owned = state.owned[minerDef.id] || 0;
    return Math.ceil(minerDef.baseCost * Math.pow(1.15, owned));
  }

  function autoCost(autoDef) {
    const owned = state.autoOwned[autoDef.id] || 0;
    return Math.ceil(autoDef.baseCost * Math.pow(1.15, owned));
  }

  function minerProduction() {
    let total = 0;
    MINERS.forEach((m) => {
      total += m.baseProd * (state.owned[m.id] || 0);
    });
    return total * prodUpgradeMult() * prestigeMult();
  }

  function autoProduction() {
    let cps = 0;
    AUTOCLICKERS.forEach((a) => {
      cps += a.cps * (state.autoOwned[a.id] || 0);
    });
    return cps * clickPower();
  }

  function totalProduction() {
    return minerProduction() + autoProduction();
  }

  function clickPower() {
    return 1 * clickUpgradeMult() * prestigeMult();
  }

  function canPrestige() {
    return state.totalGoldEarned >= 1000000;
  }

  function prestigeGain() {
    return Math.floor(Math.sqrt(state.totalGoldEarned / 1000000));
  }

  // ---------------------------------------------------------------
  // Number formatting
  // ---------------------------------------------------------------
  const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
  function formatNumber(n) {
    if (n < 1000) return n < 10 && n !== Math.floor(n) ? n.toFixed(1) : Math.floor(n).toString();
    let tier = Math.floor(Math.log10(n) / 3);
    tier = Math.min(tier, SUFFIXES.length - 1);
    const scaled = n / Math.pow(1000, tier);
    return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIXES[tier];
  }

  // ---------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------
  const goldAmountEl = document.getElementById("gold-amount");
  const goldRateEl = document.getElementById("gold-rate");
  const gemsAmountEl = document.getElementById("gems-amount");
  const clickPowerEl = document.getElementById("click-power");
  const oreRock = document.getElementById("ore-rock");
  const floatLayer = document.getElementById("float-layer");
  const minersList = document.getElementById("miners-list");
  const autoList = document.getElementById("auto-list");
  const upgradesList = document.getElementById("upgrades-list");
  const statsBox = document.getElementById("stats-box");
  const prestigeBtn = document.getElementById("prestige-btn");
  const offlineModal = document.getElementById("offline-modal");
  const offlineText = document.getElementById("offline-text");
  const offlineClose = document.getElementById("offline-close");

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function updateTopbar() {
    goldAmountEl.textContent = formatNumber(state.gold);
    goldRateEl.textContent = "+" + formatNumber(totalProduction()) + "/сек";
    gemsAmountEl.textContent = formatNumber(state.gems);
    clickPowerEl.textContent = formatNumber(clickPower());
  }

  function renderMiners() {
    minersList.innerHTML = "";
    MINERS.forEach((m) => {
      const cost = minerCost(m);
      const owned = state.owned[m.id] || 0;
      const afford = state.gold >= cost;
      const card = document.createElement("div");
      card.className = "item-card card-miner" + (afford ? "" : " disabled");
      card.innerHTML =
        '<div class="item-icon">' + m.icon + "</div>" +
        '<div class="item-info">' +
          '<div class="item-name">' + m.name + "</div>" +
          '<div class="item-sub">+' + formatNumber(m.baseProd) + "/сек за штуку</div>" +
          '<div class="item-owned">В наличии: ' + owned + "</div>" +
        "</div>" +
        '<div class="item-price' + (afford ? " afford" : "") + '">🪙 ' + formatNumber(cost) + "</div>";
      card.addEventListener("click", () => buyMiner(m));
      minersList.appendChild(card);
    });
  }

  function renderAutoClickers() {
    autoList.innerHTML = "";
    AUTOCLICKERS.forEach((a) => {
      const cost = autoCost(a);
      const owned = state.autoOwned[a.id] || 0;
      const afford = state.gold >= cost;
      const prod = a.cps * clickPower();
      const card = document.createElement("div");
      card.className = "item-card card-auto" + (afford ? "" : " disabled");
      card.innerHTML =
        '<div class="item-icon">' + a.icon + "</div>" +
        '<div class="item-info">' +
          '<div class="item-name">' + a.name + "</div>" +
          '<div class="item-sub">+' + formatNumber(prod) + "/сек за штуку (" + a.cps + " кликов/сек)</div>" +
          '<div class="item-owned">В наличии: ' + owned + "</div>" +
        "</div>" +
        '<div class="item-price' + (afford ? " afford" : "") + '">🪙 ' + formatNumber(cost) + "</div>";
      card.addEventListener("click", () => buyAutoClicker(a));
      autoList.appendChild(card);
    });
  }

  function renderUpgrades() {
    upgradesList.innerHTML = "";
    UPGRADES.forEach((u) => {
      const bought = state.bought[u.id];
      const afford = state.gold >= u.cost;
      const typeClass = u.type === "click" ? "card-click" : "card-prod";
      const card = document.createElement("div");
      card.className = "item-card " + typeClass + (bought ? " bought" : afford ? "" : " disabled");
      card.innerHTML =
        '<div class="item-icon">' + u.icon + "</div>" +
        '<div class="item-info">' +
          '<div class="item-name">' + u.name + "</div>" +
          '<div class="item-sub">' + u.desc + "</div>" +
        "</div>" +
        '<div class="item-price' + (!bought && afford ? " afford" : "") + '">' +
          (bought ? "Куплено ✅" : "🪙 " + formatNumber(u.cost)) +
        "</div>";
      if (!bought) card.addEventListener("click", () => buyUpgrade(u));
      upgradesList.appendChild(card);
    });
  }

  function renderStats() {
    const gain = prestigeGain();
    statsBox.innerHTML =
      row("Золото сейчас", formatNumber(state.gold)) +
      row("Всего добыто", formatNumber(state.totalGoldEarned)) +
      row("Кликов сделано", formatNumber(state.totalClicks)) +
      row("Добыча в секунду", formatNumber(totalProduction())) +
      row("  из них от автокликеров", formatNumber(autoProduction())) +
      row("Кристаллы престижа", formatNumber(state.gems)) +
      row("Бонус от кристаллов", "+" + Math.round((prestigeMult() - 1) * 100) + "%");
    prestigeBtn.textContent = canPrestige()
      ? "Перезапустить шахту 💎 (+" + gain + ")"
      : "Нужно добыть 1M золота (" + formatNumber(state.totalGoldEarned) + " / 1M)";
    prestigeBtn.disabled = !canPrestige();
  }

  function row(label, value) {
    return '<div class="stats-row"><span>' + label + "</span><b>" + value + "</b></div>";
  }

  function renderAll() {
    updateTopbar();
    renderMiners();
    renderAutoClickers();
    renderUpgrades();
    renderStats();
  }

  // ---------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------
  function addGold(amount) {
    state.gold += amount;
    state.totalGoldEarned += amount;
  }

  function buyMiner(m) {
    const cost = minerCost(m);
    if (state.gold < cost) return;
    state.gold -= cost;
    state.owned[m.id] = (state.owned[m.id] || 0) + 1;
    haptic("light");
    renderMiners();
    updateTopbar();
    saveState();
  }

  function buyAutoClicker(a) {
    const cost = autoCost(a);
    if (state.gold < cost) return;
    state.gold -= cost;
    state.autoOwned[a.id] = (state.autoOwned[a.id] || 0) + 1;
    haptic("light");
    renderAutoClickers();
    updateTopbar();
    saveState();
  }

  function buyUpgrade(u) {
    if (state.bought[u.id] || state.gold < u.cost) return;
    state.gold -= u.cost;
    state.bought[u.id] = true;
    haptic("medium");
    renderUpgrades();
    renderAutoClickers();
    updateTopbar();
    saveState();
  }

  function doPrestige() {
    if (!canPrestige()) return;
    const gain = prestigeGain();
    if (gain <= 0) return;
    state.gems += gain;
    state.gold = 0;
    state.totalGoldEarned = 0;
    MINERS.forEach((m) => (state.owned[m.id] = 0));
    AUTOCLICKERS.forEach((a) => (state.autoOwned[a.id] = 0));
    UPGRADES.forEach((u) => (state.bought[u.id] = false));
    haptic("heavy");
    renderAll();
    saveState();
  }

  function spawnFloatText(x, y, text) {
    const el = document.createElement("div");
    el.className = "float-text";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function handleTap(clientX, clientY) {
    const gained = clickPower();
    addGold(gained);
    state.totalClicks += 1;
    const rect = oreRock.getBoundingClientRect();
    const stageRect = floatLayer.getBoundingClientRect();
    const x = (clientX != null ? clientX : rect.left + rect.width / 2) - stageRect.left;
    const y = (clientY != null ? clientY : rect.top + rect.height / 2) - stageRect.top;
    spawnFloatText(x + (Math.random() * 30 - 15), y, "+" + formatNumber(gained));
    oreRock.classList.remove("hit");
    void oreRock.offsetWidth;
    oreRock.classList.add("hit");
    haptic("light");
    updateTopbar();
  }

  oreRock.addEventListener("click", (e) => handleTap(e.clientX, e.clientY));

  prestigeBtn.addEventListener("click", doPrestige);

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------
  const tabs = document.querySelectorAll(".tab");
  const views = document.querySelectorAll(".view");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      views.forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.view).classList.add("active");
      if (tab.dataset.view === "view-stats") renderStats();
    });
  });

  // ---------------------------------------------------------------
  // Offline earnings
  // ---------------------------------------------------------------
  function applyOfflineEarnings() {
    const elapsed = Date.now() - (state.lastSave || Date.now());
    if (elapsed < 30000) return;
    const capped = Math.min(elapsed, OFFLINE_CAP_MS);
    const prod = totalProduction();
    const earned = prod * (capped / 1000) * OFFLINE_RATE;
    if (earned < 1) return;
    addGold(earned);
    const hours = Math.floor(capped / 3600000);
    const minutes = Math.floor((capped % 3600000) / 60000);
    offlineText.textContent =
      "Пока вас не было (" + hours + "ч " + minutes + "м), техника добыла " +
      formatNumber(earned) + " золота.";
    offlineModal.classList.remove("hidden");
  }

  offlineClose.addEventListener("click", () => {
    offlineModal.classList.add("hidden");
    saveState();
  });

  // ---------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------
  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;
    const gained = totalProduction() * delta;
    if (gained > 0) addGold(gained);
    updateTopbar();
    refreshActiveList();
  }

  function refreshActiveList() {
    const active = document.querySelector(".view.active");
    if (!active) return;
    if (active.id === "view-shop") {
      renderMiners();
      renderAutoClickers();
    } else if (active.id === "view-upgrades") {
      renderUpgrades();
    }
  }
  setInterval(tick, 200);
  setInterval(saveState, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveState();
  });
  window.addEventListener("beforeunload", saveState);

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  applyOfflineEarnings();
  renderAll();
})();
