/* Feelings Shop — game logic. Content & tuning live in data.js (window.FS_DATA). */
(function () {
  "use strict";

  var D = window.FS_DATA;
  var C = D.config;
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------------ lookups
  var PILLS = {};
  D.basePills.forEach(function (p) { PILLS[p.id] = p; });

  var FEELINGS = {};
  D.recipes.forEach(function (r) { FEELINGS[r.id] = r; });
  FEELINGS[D.fizzle.id] = { id: D.fizzle.id, name: D.fizzle.name, colors: D.fizzle.colors, rarity: "fizzle" };

  function recipeKey(a, b) { return [a, b].sort().join("+"); }
  var RECIPE_BY_KEY = {};
  D.recipes.forEach(function (r) { RECIPE_BY_KEY[recipeKey(r.a, r.b)] = r; });

  function col(name) { return D.colors[name] || name; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function weightedPick(items, wfn) {
    var total = 0;
    var ws = items.map(function (it) { var w = Math.max(0, wfn(it)); total += w; return w; });
    if (total <= 0) return items[Math.floor(Math.random() * items.length)];
    var r = Math.random() * total;
    for (var i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // ------------------------------------------------------------------ state
  var S;

  function freshState() {
    var stock = {};
    D.basePills.forEach(function (p) { stock[p.id] = D.start.stock[p.id] || 0; });
    return {
      version: 1,
      coins: D.start.coins,
      xp: 0,
      level: 1,
      stock: stock,
      slots: [null, null],
      tray: [],              // { uid, feeling, shiny }
      selected: null,        // uid of selected tray pill
      customers: [],         // { id, target, surprise, line, patience, maxPatience, status }
      nextArrival: C.firstCustomerSec,
      nextCustomerId: 1,
      nextUid: 1,
      discovered: {},        // feelingId -> true, "shiny:feelingId" -> true
      upgrades: {},
      muted: false,
      seenIntro: false,
      stats: { mixed: 0, served: 0, earned: 0, shinies: 0 },
    };
  }

  // Effective config value, after upgrades.
  function cfg(key) {
    var v = key === "restockDiscount" ? 0 : C[key];
    D.upgrades.forEach(function (u) {
      if (S.upgrades[u.id] && u.effect[key] !== undefined) v = u.effect[key];
    });
    return v;
  }

  function isUnlocked(pillId) { return S.level >= PILLS[pillId].unlockLevel; }
  function restockCost(pillId) { return Math.max(1, PILLS[pillId].cost - cfg("restockDiscount")); }
  function waitingCustomers() { return S.customers.filter(function (c) { return c.status === "waiting"; }); }
  function selectedItem() {
    for (var i = 0; i < S.tray.length; i++) if (S.tray[i].uid === S.selected) return S.tray[i];
    return null;
  }

  // ------------------------------------------------------------------ save / load
  function save() {
    try {
      var copy = JSON.parse(JSON.stringify(S));
      copy.customers = copy.customers
        .filter(function (c) { return c.status === "waiting"; })
        .map(function (c) { delete c.fading; return c; });
      localStorage.setItem(D.saveKey, JSON.stringify(copy));
    } catch (e) { /* storage unavailable — play on without saving */ }
  }

  function load() {
    var fresh = freshState();
    try {
      var raw = localStorage.getItem(D.saveKey);
      if (!raw) return fresh;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return fresh;
      var s = Object.assign(fresh, data);
      s.stock = Object.assign(freshState().stock, data.stock || {});
      s.stats = Object.assign(freshState().stats, data.stats || {});
      s.discovered = data.discovered || {};
      s.upgrades = data.upgrades || {};
      s.slots = Array.isArray(data.slots) && data.slots.length === 2 ? data.slots : [null, null];
      s.tray = Array.isArray(data.tray) ? data.tray.filter(function (t) { return FEELINGS[t.feeling]; }) : [];
      s.customers = Array.isArray(data.customers) ? data.customers.filter(function (c) {
        return c.status === "waiting" && (c.surprise || FEELINGS[c.target]);
      }) : [];
      return s;
    } catch (e) {
      return fresh;
    }
  }

  // ------------------------------------------------------------------ audio
  var actx = null;
  function audio() {
    if (S && S.muted) return null;
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === "suspended") actx.resume();
      return actx;
    } catch (e) { return null; }
  }

  function tone(freq, at, dur, type, vol, freqEnd) {
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime + (at || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, fStart, fEnd) {
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(fStart, t);
    f.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    var g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t);
  }

  var sfx = {
    click: function () { tone(660, 0, 0.06, "sine", 0.08, 880); },
    back: function () { tone(520, 0, 0.06, "sine", 0.07, 380); },
    error: function () { tone(220, 0, 0.12, "triangle", 0.12, 180); },
    pop: function () { tone(280, 0, 0.14, "sine", 0.28, 900); tone(900, 0.05, 0.08, "triangle", 0.08, 1400); },
    pfft: function () { noise(0.4, 0.35, 2400, 120); tone(180, 0, 0.3, "sine", 0.08, 70); },
    sparkle: function () { [1568, 2093, 2637, 3136, 2637].forEach(function (f, i) { tone(f, 0.05 + i * 0.06, 0.25, "triangle", 0.07); }); },
    coin: function () { tone(988, 0, 0.09, "square", 0.06); tone(1319, 0.08, 0.3, "square", 0.06); },
    tick: function () { tone(1200, 0, 0.05, "square", 0.03); },
    chime: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.1, 0.6, "sine", 0.14); }); },
    bell: function () { tone(1320, 0, 0.5, "sine", 0.06); tone(1760, 0.03, 0.4, "sine", 0.04); },
  };

  // ------------------------------------------------------------------ pills
  function pillHTML(colors, opts) {
    opts = opts || {};
    var cls = "pill" + (opts.size ? " " + opts.size : "") + (opts.silhouette ? " silhouette" : "") + (opts.fizzle ? " fizzle" : "");
    return '<span class="pill-wrap' + (opts.shiny ? " shiny" : "") + '">' +
      '<span class="' + cls + '" style="--a:' + col(colors[0]) + ";--b:" + col(colors[1]) + '">' +
      '<span class="h a"></span><span class="h b"></span></span></span>';
  }
  function feelingLabel(item) { return (item.shiny ? "✨ Shiny " : "") + FEELINGS[item.feeling].name; }
  function rarityName(r) { return r === "fizzle" ? "Dud" : D.rarities[r].name; }

  // ------------------------------------------------------------------ fx
  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function floatText(text, el, cls, dy) {
    if (!el) return;
    var p = centerOf(el);
    var f = document.createElement("div");
    f.className = "float" + (cls ? " " + cls : "");
    f.textContent = text;
    f.style.left = p.x + "px";
    f.style.top = (p.y + (dy || 0)) + "px";
    $("fx").appendChild(f);
    setTimeout(function () { f.remove(); }, 1400);
  }
  function sparkles(el, n) {
    if (!el) return;
    var p = centerOf(el);
    for (var i = 0; i < (n || 10); i++) {
      var s = document.createElement("div");
      s.className = "spark";
      s.textContent = Math.random() < 0.5 ? "✦" : "✧";
      var a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      s.style.left = p.x + "px"; s.style.top = p.y + "px";
      s.style.setProperty("--dx", Math.cos(a) * d + "px");
      s.style.setProperty("--dy", Math.sin(a) * d + "px");
      s.style.animationDelay = Math.random() * 0.15 + "s";
      $("fx").appendChild(s);
      (function (node) { setTimeout(function () { node.remove(); }, 1200); })(s);
    }
  }
  function burst(el, colors) {
    if (!el) return;
    var p = centerOf(el);
    for (var i = 0; i < 12; i++) {
      var b = document.createElement("div");
      b.className = "burst";
      var a = (i / 12) * Math.PI * 2, d = 40 + Math.random() * 25;
      b.style.left = p.x + "px"; b.style.top = p.y + "px";
      b.style.background = col(colors[i % colors.length]);
      b.style.setProperty("--dx", Math.cos(a) * d + "px");
      b.style.setProperty("--dy", Math.sin(a) * d + "px");
      $("fx").appendChild(b);
      (function (node) { setTimeout(function () { node.remove(); }, 700); })(b);
    }
  }
  function puff(el) {
    if (!el) return;
    var p = centerOf(el);
    var f = document.createElement("div");
    f.className = "puff"; f.textContent = "💨";
    f.style.left = p.x + "px"; f.style.top = p.y + "px";
    $("fx").appendChild(f);
    setTimeout(function () { f.remove(); }, 1000);
  }
  function shake(el) {
    if (!el) return;
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.innerHTML = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  // ------------------------------------------------------------------ levels
  function levelInfo(level) { return D.levels[level - 1]; }
  function maxLevel() { return D.levels.length; }
  function levelForXp(xp) {
    var lv = 1;
    D.levels.forEach(function (l) { if (xp >= l.xp) lv = l.level; });
    return lv;
  }
  function rankFor(level) {
    var name = D.ranks[0].name;
    D.ranks.forEach(function (r) { if (level >= r.minLevel) name = r.name; });
    return name;
  }

  function addXp(n, el) {
    n = Math.round(n);
    if (n <= 0) return;
    S.xp += n;
    if (el) floatText("+" + n + " XP", el, "xp", 22);
    var target = levelForXp(S.xp);
    if (target > S.level) {
      var oldRank = rankFor(S.level);
      var lines = [];
      for (var lv = S.level + 1; lv <= target; lv++) {
        levelInfo(lv).unlocks.forEach(function (u) { lines.push(u); });
        D.basePills.forEach(function (p) {
          if (p.unlockLevel === lv) {
            S.stock[p.id] = Math.min(cfg("maxStock"), S.stock[p.id] + C.newPillGift);
            lines.push("+" + C.newPillGift + " free " + p.name + " pills to get you started.");
          }
        });
      }
      S.level = target;
      var newRank = rankFor(S.level);
      var lvNow = S.level;
      queueModal(function () { return levelUpHTML(lvNow, lines, newRank !== oldRank ? newRank : null); }, "levelup");
      sfx.chime();
      renderShelf();
      renderLine();
    }
    renderTop();
  }

  function addCoins(n, el) {
    S.coins += n;
    if (el && n > 0) floatText("+" + n + " 🪙", el);
    var c = $("coins");
    c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    renderTop();
    renderShelf();
  }

  // ------------------------------------------------------------------ customers
  function makeableFeelings() {
    return D.recipes.filter(function (r) { return isUnlocked(r.a) && isUnlocked(r.b); });
  }
  function orderWeights() {
    var w = D.orderWeights[0];
    D.orderWeights.forEach(function (o) { if (S.level >= o.minLevel) w = o; });
    return w;
  }

  function spawnCustomer() {
    var c = {
      id: S.nextCustomerId++,
      target: null,
      surprise: false,
      line: "",
      patience: C.patienceSec,
      maxPatience: C.patienceSec,
      status: "waiting",
    };
    if (Math.random() < C.surpriseChance) {
      c.surprise = true;
      c.line = pick(D.surpriseLines);
    } else {
      var weights = orderWeights();
      var inLine = {};
      S.customers.forEach(function (x) { if (x.target) inLine[x.target] = true; });
      var options = makeableFeelings();
      var f = weightedPick(options, function (r) {
        return (weights[r.rarity] || 0) * (inLine[r.id] ? 0.25 : 1);
      });
      c.target = f.id;
      c.line = pick(D.orderLines[f.id] || ["I want to feel " + f.name + "."]);
    }
    S.customers.push(c);
    sfx.bell();
    renderLine();
    save();
  }

  function setReaction(c, kind, text, pay) {
    c.status = "reaction";
    c.reaction = { kind: kind, text: text, pay: pay || 0 };
    c.reactionLeft = C.reactionSec;
  }

  function serve(customerId) {
    var c = null;
    S.customers.forEach(function (x) { if (x.id === customerId) c = x; });
    if (!c || c.status !== "waiting") return;
    var el = bubbleEl(c.id);
    var item = selectedItem();
    if (!item) {
      sfx.error(); shake(el);
      toast(S.tray.length ? "Tap a pill in the tray first." : "Mix a pill first, then tap a customer!");
      return;
    }
    var f = FEELINGS[item.feeling];
    var rar = D.rarities[f.rarity];
    var base = rar.price * (item.shiny ? C.shinyPriceMult : 1);
    var xp = rar.xp * (item.shiny ? C.shinyXpMult : 1);
    var exact = c.surprise || item.feeling === c.target;
    var pay, text;
    if (exact) {
      pay = Math.round(base * (1 + C.exactTip));
      if (c.surprise && Math.random() < 0.5) text = pick(D.surpriseReactions);
      else text = pick(D.exactReactions[item.feeling] || ["This is exactly it."]);
      if (item.shiny) text += " ✨";
    } else {
      pay = Math.round(base * C.wrongPayMult);
      xp = xp * C.wrongXpMult;
      text = pick(D.wrongReactions);
    }
    setReaction(c, exact ? "exact" : "wrong", text, pay);

    // remove pill from tray
    S.tray = S.tray.filter(function (t) { return t.uid !== item.uid; });
    S.selected = S.tray.length ? S.tray[S.tray.length - 1].uid : null;

    S.stats.served++;
    S.stats.earned += pay;
    sfx.coin();
    if (exact) burst(el, f.colors);
    if (item.shiny) { sparkles(el, 8); }
    addCoins(pay, el);
    addXp(xp, el);
    renderLine();
    renderTray();
    renderMixer();
    checkRescue();
    save();
  }

  // ------------------------------------------------------------------ actions
  function pickPill(id) {
    var p = PILLS[id];
    var el = document.querySelector('.shelf-item[data-id="' + id + '"]');
    if (!isUnlocked(id)) { sfx.error(); shake(el); toast(p.name + " unlocks at Level " + p.unlockLevel + "."); return; }
    if (S.stock[id] <= 0) { sfx.error(); shake(el); toast("Out of " + p.name + "! Tap <b>+</b> to restock."); return; }
    var slot = S.slots[0] === null ? 0 : S.slots[1] === null ? 1 : -1;
    if (slot < 0) { sfx.error(); shake($("slot0").parentNode); toast("Mixer is full — tap a slot to take a pill out."); return; }
    S.stock[id]--;
    S.slots[slot] = id;
    sfx.click();
    renderShelf(); renderMixer();
    save();
  }

  function unslot(i) {
    var id = S.slots[i];
    if (!id) return;
    S.stock[id]++;
    S.slots[i] = null;
    sfx.back();
    renderShelf(); renderMixer();
    save();
  }

  function restock(id) {
    var p = PILLS[id];
    var el = document.querySelector('.shelf-item[data-id="' + id + '"]');
    var cost = restockCost(id);
    if (!isUnlocked(id)) return;
    if (S.stock[id] >= cfg("maxStock")) { sfx.error(); shake(el); toast("The " + p.name + " shelf is full!"); return; }
    if (S.coins < cost) { sfx.error(); shake($("coins")); toast("Not enough coins — serve a customer!"); return; }
    S.coins -= cost;
    S.stock[id]++;
    sfx.tick();
    renderTop(); renderShelf();
    save();
  }

  function mix() {
    var a = S.slots[0], b = S.slots[1];
    var mixerEl = document.querySelector(".mixer");
    if (!a || !b) { sfx.error(); toast("Put two pills in the mixer first."); return; }
    if (S.tray.length >= C.trayMax) { sfx.error(); shake($("tray")); toast("Tray is full — serve or toss a pill first."); return; }

    S.slots = [null, null];
    S.stats.mixed++;
    mixerEl.classList.remove("mixing"); void mixerEl.offsetWidth; mixerEl.classList.add("mixing");

    var recipe = RECIPE_BY_KEY[recipeKey(a, b)];
    if (!recipe) {
      sfx.pfft();
      puff($("mixBtn"));
      var firstFizz = !S.discovered.fizzle;
      S.discovered.fizzle = true;
      toast(firstFizz ? "Pfft… a <b>Fizzle</b>! That combo doesn't make a feeling. (Added to your book.)" : "Pfft… <b>Fizzle</b>. Try a different combo!");
      renderMixer(); renderShelf();
      checkRescue();
      save();
      return;
    }

    var shiny = Math.random() < cfg("shinyChance");
    var item = { uid: S.nextUid++, feeling: recipe.id, shiny: shiny };
    S.tray.push(item);
    S.selected = item.uid;
    if (shiny) S.stats.shinies++;

    sfx.pop();
    renderMixer();
    renderShelf();
    renderTray(item.uid);
    var trayEl = document.querySelector('.tray-item[data-uid="' + item.uid + '"]');
    burst(trayEl, recipe.colors);
    if (shiny) { setTimeout(sfx.sparkle, 120); sparkles(trayEl, 14); }

    var msgs = [];
    if (!S.discovered[recipe.id]) {
      S.discovered[recipe.id] = true;
      msgs.push("New feeling: <b>" + esc(recipe.name) + "</b>!");
      addXp(C.discoverXp, trayEl);
    }
    if (shiny && !S.discovered["shiny:" + recipe.id]) {
      S.discovered["shiny:" + recipe.id] = true;
      msgs.push("First ✨ <b>Shiny " + esc(recipe.name) + "</b>!");
      addXp(C.discoverShinyXp);
    } else if (shiny) {
      msgs.push("✨ Lucky batch! <b>Shiny " + esc(recipe.name) + "</b>");
    }
    if (msgs.length) toast(msgs.join(" "));
    renderLine();
    save();
  }

  function selectTray(uid) {
    if (S.selected === uid) return;
    S.selected = uid;
    sfx.click();
    renderTray(); renderLine();
    save();
  }

  function toss(uid) {
    S.tray = S.tray.filter(function (t) { return t.uid !== uid; });
    if (S.selected === uid) S.selected = S.tray.length ? S.tray[S.tray.length - 1].uid : null;
    sfx.back();
    renderTray(); renderMixer(); renderLine();
    checkRescue();
    save();
  }

  // If the player can't possibly make anything, a friendly supplier helps out.
  function checkRescue() {
    var inHand = S.slots.filter(Boolean).length;
    D.basePills.forEach(function (p) { if (isUnlocked(p.id)) inHand += S.stock[p.id]; });
    if (inHand >= 2 || S.tray.length > 0) return;
    var cheapest = Infinity;
    D.basePills.forEach(function (p) { if (isUnlocked(p.id)) cheapest = Math.min(cheapest, restockCost(p.id)); });
    if (S.coins >= cheapest * (2 - inHand)) return;
    D.basePills.forEach(function (p) { if (p.unlockLevel === 1) S.stock[p.id] = Math.min(cfg("maxStock"), S.stock[p.id] + 3); });
    toast("A kind supplier dropped off some free pills! 💝");
    renderShelf();
  }

  function buyUpgrade(id) {
    var u = null;
    D.upgrades.forEach(function (x) { if (x.id === id) u = x; });
    if (!u || S.upgrades[id]) return;
    if (S.level < C.upgradesLevel) return;
    if (S.coins < u.cost) { sfx.error(); toast("Not enough coins yet!"); return; }
    S.coins -= u.cost;
    S.upgrades[id] = true;
    sfx.chime();
    toast(u.icon + " <b>" + esc(u.name) + "</b> installed!");
    renderAll();
    renderModal();
    save();
  }

  // ------------------------------------------------------------------ rendering
  function renderTop() {
    $("shopName").textContent = D.shopName;
    $("rankTitle").textContent = rankFor(S.level);
    $("levelLabel").textContent = "Lv " + S.level;
    $("coinCount").textContent = S.coins;
    if (S.level >= maxLevel()) {
      $("xpFill").style.width = "100%";
      $("xpText").textContent = S.xp + " XP · MAX";
    } else {
      var cur = levelInfo(S.level).xp, next = levelInfo(S.level + 1).xp;
      $("xpFill").style.width = Math.min(100, ((S.xp - cur) / (next - cur)) * 100) + "%";
      $("xpText").textContent = (S.xp - cur) + " / " + (next - cur);
    }
    $("muteBtn").textContent = S.muted ? "🔇" : "🔊";
    var up = $("upgradesBtn");
    var locked = S.level < C.upgradesLevel;
    up.classList.toggle("locked", locked);
    up.innerHTML = "⭐ Upgrades" + (locked ? '<span class="lock">🔒 Lv ' + C.upgradesLevel + "</span>" : "");
  }

  function bubbleEl(id) { return document.querySelector('.bubble[data-id="' + id + '"]'); }

  function renderLine() {
    var line = $("line");
    var ids = {};
    S.customers.forEach(function (c) { ids[c.id] = true; });
    Array.prototype.forEach.call(line.querySelectorAll(".bubble"), function (el) {
      if (!ids[el.dataset.id]) el.remove();
    });
    var hasPill = !!selectedItem();
    S.customers.forEach(function (c) {
      var el = bubbleEl(c.id);
      if (!el) {
        el = document.createElement("button");
        el.className = "bubble";
        el.dataset.id = c.id;
        line.appendChild(el);
      }
      var sig = c.status + (c.reaction ? c.reaction.kind : "");
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        if (c.status === "waiting") {
          el.className = "bubble" + (c.surprise ? " surprise" : "");
          el.setAttribute("aria-label", "Serve customer: " + c.line);
          el.innerHTML = '<span class="who">Customer #' + c.id + (c.surprise ? " 🎁" : "") + "</span>" +
            '<span class="text">“' + esc(c.line) + "”</span>" +
            '<span class="patience"><span class="pfill"></span></span>';
        } else {
          var r = c.reaction;
          el.className = "bubble reaction " + r.kind;
          el.removeAttribute("aria-label");
          el.innerHTML = '<span class="who">Customer #' + c.id + "</span>" +
            '<span class="text">“' + esc(r.text) + "”</span>" +
            (r.pay ? '<span class="pay">+' + r.pay + " 🪙" + (r.kind === "exact" ? " (tip included!)" : "") + "</span>" : "");
        }
      }
      if (c.status === "waiting") el.classList.toggle("ready", hasPill);
      if (c.fading) el.classList.add("gone");
    });
    var empty = line.querySelector(".line-empty");
    if (!S.customers.length) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "line-empty";
        empty.textContent = "The shop is quiet… a customer will wander in soon.";
        line.appendChild(empty);
      }
    } else if (empty) empty.remove();
    $("inShop").textContent = "In shop: " + waitingCustomers().length + " / " + cfg("lineMax");
    updatePatience();
  }

  function updatePatience() {
    S.customers.forEach(function (c) {
      if (c.status !== "waiting") return;
      var el = bubbleEl(c.id);
      if (!el) return;
      var bar = el.querySelector(".pfill");
      if (!bar) return;
      var pct = Math.max(0, c.patience / c.maxPatience) * 100;
      bar.style.width = pct + "%";
      bar.classList.toggle("low", pct < 30);
    });
  }

  function renderMixer() {
    [0, 1].forEach(function (i) {
      var el = $("slot" + i);
      var id = S.slots[i];
      el.classList.toggle("filled", !!id);
      el.innerHTML = id ? pillHTML(PILLS[id].colors, { size: "lg" }) : "";
      el.setAttribute("aria-label", id ? "Remove " + PILLS[id].name + " from mixer" : "Empty mixer slot");
    });
    var full = S.tray.length >= C.trayMax;
    var ready = S.slots[0] && S.slots[1] && !full;
    var btn = $("mixBtn");
    btn.disabled = !ready;
    btn.classList.toggle("ready", !!ready);
    var hint = $("mixHint");
    var a = S.slots[0], b = S.slots[1];
    if (full) hint.innerHTML = "Tray is full — serve a customer or toss a pill.";
    else if (a && b) {
      var r = RECIPE_BY_KEY[recipeKey(a, b)];
      var known = r && S.discovered[r.id];
      hint.innerHTML = PILLS[a].name + " + " + PILLS[b].name + " → <b>" + (known ? esc(r.name) : "???") + "</b>";
    } else if (a || b) hint.innerHTML = "Pick one more pill.";
    else hint.innerHTML = "Tap two pills on the shelf.";
  }

  function renderTray(newUid) {
    var html = "";
    for (var i = 0; i < C.trayMax; i++) {
      var t = S.tray[i];
      if (!t) { html += '<div class="tray-item empty">empty</div>'; continue; }
      var f = FEELINGS[t.feeling];
      html += '<button class="tray-item' + (t.uid === S.selected ? " selected" : "") + (t.uid === newUid ? " new" : "") + '" data-uid="' + t.uid + '">' +
        '<span class="toss" data-toss="' + t.uid + '" role="button" aria-label="Toss pill">✕</span>' +
        pillHTML(f.colors, { shiny: t.shiny }) +
        '<span class="tname">' + esc(feelingLabel(t)) + "</span>" +
        '<span class="rar ' + (t.shiny ? "rarity-shiny" : "rarity-" + f.rarity) + '">' + (t.shiny ? "Shiny " : "") + rarityName(f.rarity) + "</span>" +
        "</button>";
    }
    $("tray").innerHTML = html;
  }

  function renderShelf() {
    var html = "";
    var max = cfg("maxStock");
    D.basePills.forEach(function (p) {
      var unlocked = isUnlocked(p.id);
      if (!unlocked) {
        html += '<div class="shelf-item locked" data-id="' + p.id + '">' +
          '<button class="pick" data-pick="' + p.id + '" aria-label="' + p.name + ' locked">' + pillHTML(p.colors, { size: "lg", silhouette: true }) +
          '<span class="pname">???</span></button>' +
          '<span class="count">🔒 Lv ' + p.unlockLevel + "</span></div>";
        return;
      }
      var n = S.stock[p.id];
      var cost = restockCost(p.id);
      html += '<div class="shelf-item" data-id="' + p.id + '">' +
        '<button class="pick" data-pick="' + p.id + '" aria-label="Add ' + p.name + ' to mixer">' + pillHTML(p.colors, { size: "lg" }) +
        '<span class="pname">' + esc(p.name) + "</span></button>" +
        '<span class="count' + (n === 0 ? " out" : "") + '">' + n + " / " + max + "</span>" +
        '<button class="restock" data-restock="' + p.id + '"' + (n >= max || S.coins < cost ? " disabled" : "") +
        ' aria-label="Restock ' + p.name + ' for ' + cost + ' coins">+ ' + cost + "🪙</button></div>";
    });
    $("shelf").innerHTML = html;
  }

  function renderAll() {
    renderTop(); renderLine(); renderMixer(); renderTray(); renderShelf();
  }

  // ------------------------------------------------------------------ modals
  var modalStack = [];   // queued modals: { render: fn, kind }
  var current = null;

  function modalOpen() { return !!current; }

  function queueModal(render, kind) {
    modalStack.push({ render: render, kind: kind });
    if (!current) showNextModal();
  }

  function openModal(render, kind) {
    // Explicit opens replace whatever informational modal is showing.
    current = { render: render, kind: kind };
    renderModal();
    $("modal").classList.remove("hidden");
  }

  function showNextModal() {
    var next = modalStack.shift();
    if (!next) { current = null; $("modal").classList.add("hidden"); return; }
    current = next;
    renderModal();
    $("modal").classList.remove("hidden");
  }

  function renderModal() {
    if (!current) return;
    $("modalBody").innerHTML = current.render();
  }

  function closeModal() {
    if (current && current.kind === "intro") { S.seenIntro = true; save(); }
    current = null;
    showNextModal();
  }

  function levelUpHTML(level, lines, newRank) {
    var items = lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("");
    if (newRank) items = '<li>🏷️ New rank: <b>' + esc(newRank) + "</b></li>" + items;
    return '<div class="levelup"><div class="big">🎉</div>' +
      "<h3>Level " + level + "!</h3>" +
      '<p class="sub">Your shop is growing.</p>' +
      "<ul>" + (items || "<li>Keep mixing!</li>") + "</ul>" +
      '<button class="btn" data-action="close">Yay!</button></div>';
  }

  function introHTML() {
    return '<div class="levelup"><div class="big">💊</div>' +
      "<h3>Welcome to " + esc(D.shopName) + "!</h3>" +
      '<p class="sub">You sell feelings. In pill form. It\'s a whole thing.</p>' +
      "<ul>" +
      "<li>1. Tap two pills on the shelf to put them in the mixer.</li>" +
      "<li>2. Press <b>Mix!</b> to make a new feeling.</li>" +
      "<li>3. Read a customer's bubble, then tap them to serve the pill in your tray.</li>" +
      "<li>Customers are patient — there's no rush. ☕</li>" +
      "</ul>" +
      '<button class="btn" data-action="close">Open the shop!</button></div>';
  }

  function bookHTML() {
    var total = D.recipes.length * 2 + 1;
    var found = 0;
    D.recipes.forEach(function (r) {
      if (S.discovered[r.id]) found++;
      if (S.discovered["shiny:" + r.id]) found++;
    });
    if (S.discovered.fizzle) found++;

    function cell(r, shiny) {
      var key = shiny ? "shiny:" + r.id : r.id;
      var known = !!S.discovered[key];
      var recipe = r.id === "fizzle" ? "Any unknown combo" : PILLS[r.a].name + " + " + PILLS[r.b].name;
      if (!known) {
        return '<div class="book-cell unknown">' + pillHTML(r.colors, { silhouette: true }) +
          '<span class="bname">???</span><span class="brar">' + (shiny ? "Shiny" : "&nbsp;") + "</span></div>";
      }
      var rarCls = r.id === "fizzle" ? "rarity-fizzle" : shiny ? "rarity-shiny" : "rarity-" + r.rarity;
      return '<div class="book-cell' + (shiny ? " shiny-cell" : "") + '">' + pillHTML(r.colors, { shiny: shiny }) +
        '<span class="bname">' + (shiny ? "✨ " : "") + esc(r.name) + "</span>" +
        '<span class="brar ' + rarCls + '">' + (shiny ? "Shiny " : "") + rarityName(r.rarity) + "</span>" +
        '<span class="brec">' + esc(recipe) + "</span></div>";
    }

    var trophyOn = S.level >= maxLevel();
    var html = "<h3>📖 Feelings Book</h3>" +
      '<p class="sub">Discovered <b>' + found + " / " + total + "</b></p>" +
      '<div class="trophy' + (trophyOn ? "" : " locked") + '"><div class="ticon">🏆</div><div><b>' +
      (trophyOn ? esc(D.trophy.name) : "??? Trophy") + "</b><br><span>" +
      (trophyOn ? esc(D.trophy.desc) : "Reach Level " + maxLevel() + " to earn it.") + "</span></div></div>" +
      '<div class="book-section-title">Feelings</div><div class="book-grid">';
    D.recipes.forEach(function (r) { html += cell(r, false); });
    html += cell(FEELINGS.fizzle, false);
    html += '</div><div class="book-section-title">✨ Shiny batches</div><div class="book-grid">';
    D.recipes.forEach(function (r) { html += cell(r, true); });
    html += "</div>";
    return html;
  }

  function upgradesHTML() {
    var html = "<h3>⭐ Upgrades</h3>";
    if (S.level < C.upgradesLevel) {
      return html + '<p class="sub">The upgrades shop opens at <b>Level ' + C.upgradesLevel + "</b>. Keep serving!</p>";
    }
    html += '<p class="sub">You have <b>' + S.coins + " 🪙</b></p><div class=\"upgrade-list\">";
    D.upgrades.forEach(function (u) {
      var owned = !!S.upgrades[u.id];
      html += '<div class="upgrade' + (owned ? " owned" : "") + '"><div class="uicon">' + u.icon + '</div>' +
        '<div class="uinfo"><div class="uname">' + esc(u.name) + '</div><div class="udesc">' + esc(u.desc) + "</div></div>" +
        (owned ? '<span class="btn mint" aria-disabled="true">Owned ✓</span>'
               : '<button class="btn" data-buy="' + u.id + '"' + (S.coins < u.cost ? " disabled" : "") + ">" + u.cost + " 🪙</button>") +
        "</div>";
    });
    return html + "</div>";
  }

  var resetArmed = false;
  function settingsHTML() {
    return "<h3>⚙️ Settings</h3>" +
      '<div class="settings-row"><div><b>Sound</b><br><span class="sub">Pops, sparkles and coins.</span></div>' +
      '<button class="btn ' + (S.muted ? "ghost" : "mint") + '" data-action="mute">' + (S.muted ? "🔇 Off" : "🔊 On") + "</button></div>" +
      '<div class="settings-row"><div><b>How to play</b></div><button class="btn ghost" data-action="intro">Show</button></div>' +
      '<div class="settings-row"><div><b>Stats</b><br><span class="sub">Mixed ' + S.stats.mixed + " · Served " + S.stats.served +
      " · Shinies " + S.stats.shinies + " · Earned " + S.stats.earned + " 🪙</span></div></div>" +
      '<div class="settings-row"><div><b>Reset save</b><br><span class="sub">Start the shop over from scratch.</span></div>' +
      '<button class="btn danger" data-action="reset">' + (resetArmed ? "Tap again to confirm" : "Reset") + "</button></div>";
  }

  function toggleMute() {
    S.muted = !S.muted;
    if (!S.muted) sfx.click();
    renderTop(); renderModal();
    save();
  }

  function resetSave() {
    if (!resetArmed) { resetArmed = true; renderModal(); return; }
    resetArmed = false;
    try { localStorage.removeItem(D.saveKey); } catch (e) { /* ignore */ }
    var muted = S.muted;
    S = freshState();
    S.muted = muted;
    S.seenIntro = true;
    modalStack = [];
    current = null;
    $("modal").classList.add("hidden");
    $("line").innerHTML = "";
    renderAll();
    save();
    toast("Fresh start! Welcome back to the shop. 💊");
  }

  // ------------------------------------------------------------------ loop
  var last = 0;
  var saveTimer = 0;

  function tick(now) {
    var dt = Math.min(0.5, (now - last) / 1000 || 0);
    last = now;
    if (!document.hidden && !modalOpen()) step(dt);
    requestAnimationFrame(tick);
  }

  function step(dt) {
    var changed = false;
    S.customers.forEach(function (c) {
      if (c.status === "waiting") {
        c.patience -= dt;
        if (c.patience <= 0) {
          setReaction(c, "leaving", pick(D.leaveLines), 0);
          changed = true;
        }
      } else {
        c.reactionLeft -= dt;
        if (c.reactionLeft <= 0 && !c.fading) {
          c.fading = true;
          var el = bubbleEl(c.id);
          if (el) el.classList.add("gone");
        }
      }
    });
    var before = S.customers.length;
    S.customers = S.customers.filter(function (c) { return !(c.status !== "waiting" && c.reactionLeft <= -0.4); });
    if (S.customers.length !== before) changed = true;

    // arrivals
    S.nextArrival -= dt;
    if (S.nextArrival <= 0) {
      if (waitingCustomers().length < cfg("lineMax")) {
        spawnCustomer();
        S.nextArrival = rand(cfg("arriveMinSec"), cfg("arriveMaxSec"));
      } else {
        S.nextArrival = rand(3, 6);
      }
    }

    if (changed) { renderLine(); save(); }
    else updatePatience();

    saveTimer += dt;
    if (saveTimer > 5) { saveTimer = 0; save(); }
  }

  // ------------------------------------------------------------------ events
  function bind() {
    $("shelf").addEventListener("click", function (e) {
      var r = e.target.closest("[data-restock]");
      if (r) { restock(r.dataset.restock); return; }
      var p = e.target.closest("[data-pick]");
      if (p) pickPill(p.dataset.pick);
    });
    $("slot0").addEventListener("click", function () { unslot(0); });
    $("slot1").addEventListener("click", function () { unslot(1); });
    $("mixBtn").addEventListener("click", mix);
    $("tray").addEventListener("click", function (e) {
      var t = e.target.closest("[data-toss]");
      if (t) { e.stopPropagation(); toss(+t.dataset.toss); return; }
      var it = e.target.closest("[data-uid]");
      if (it) selectTray(+it.dataset.uid);
    });
    $("line").addEventListener("click", function (e) {
      var b = e.target.closest(".bubble");
      if (b) serve(+b.dataset.id);
    });
    $("bookBtn").addEventListener("click", function () { sfx.click(); openModal(bookHTML, "book"); });
    $("upgradesBtn").addEventListener("click", function () { sfx.click(); openModal(upgradesHTML, "upgrades"); });
    $("settingsBtn").addEventListener("click", function () { sfx.click(); resetArmed = false; openModal(settingsHTML, "settings"); });
    $("muteBtn").addEventListener("click", toggleMute);
    $("modalClose").addEventListener("click", function () { sfx.back(); closeModal(); });
    $("modal").addEventListener("click", function (e) {
      if (e.target === $("modal")) { closeModal(); return; }
      var buy = e.target.closest("[data-buy]");
      if (buy) { buyUpgrade(buy.dataset.buy); return; }
      var a = e.target.closest("[data-action]");
      if (!a) return;
      var act = a.dataset.action;
      if (act === "close") { sfx.click(); closeModal(); }
      else if (act === "mute") toggleMute();
      else if (act === "reset") resetSave();
      else if (act === "intro") openModal(introHTML, "intro");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalOpen()) closeModal();
    });
    // Unlock audio on first interaction (mobile browsers require a gesture).
    var unlock = function () { audio(); window.removeEventListener("pointerdown", unlock); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    S = load();
    // keep level consistent with XP (e.g. if thresholds were tweaked in data.js)
    S.level = Math.max(S.level, levelForXp(S.xp));
    bind();
    renderAll();
    checkRescue();
    if (!S.seenIntro) queueModal(introHTML, "intro");
    save();
    requestAnimationFrame(function (t) { last = t; requestAnimationFrame(tick); });
  }

  // Exposed for debugging in the console: FeelingsShop.state, FeelingsShop.give(coins, xp)
  window.FeelingsShop = {
    get state() { return S; },
    give: function (coins, xp) { if (coins) addCoins(coins); if (xp) addXp(xp); renderAll(); save(); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
