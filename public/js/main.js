/* SMS IT Agency — মূল স্ক্রিপ্ট
   যোগাযোগের তথ্য ও সার্ভিস বদলাতে js/config.js, কাজ যোগ করতে js/portfolio.js দেখুন। */
(function () {
  "use strict";
  fetch("/api/site", { cache: "no-store" }).then(function (r) { return r.json(); }).then(boot).catch(function () {
    document.body.insertAdjacentHTML("afterbegin", '<p style="padding:24px">সাইট লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।</p>');
  });
  function boot(D) {
  var S = Object.assign({}, D.settings, { services: D.sections });
  var P = { showEmpty: false, categories: D.sections.map(function (x) { return { id: x.id, label: x.title }; }),
    items: D.items.map(function (i) { return Object.assign({ category: i.section }, i); }) };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  /* ---------- বার্তা ---------- */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 3600);
  }

  /* ---------- যোগাযোগ-লিংক ---------- */
  function waUrl(msg) {
    var raw = String(S.whatsappNumber || "").trim();
    if (/^https?:\/\//i.test(raw)) return raw; // পুরো wa.me লিংক দিলে সেটাই ব্যবহার হবে
    var num = raw.replace(/\D/g, "");
    if (!num) return "";
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(msg || S.defaultMessage || "");
  }
  function urlFor(kind, msg) {
    switch (kind) {
      case "whatsapp": return waUrl(msg);
      case "messenger": return S.messengerUrl || "";
      case "facebook": return S.facebookPageUrl || "";
      case "email": return S.email ? "mailto:" + S.email : "";
      case "service": return waUrl(msg) || S.messengerUrl || "";
      default: return (S.social && S.social[kind]) || "";
    }
  }
  var MISSING = {
    whatsapp: "WhatsApp নম্বর এখনো যোগ করা হয়নি। অ্যাডমিন প্যানেলের সেটিংসে নম্বর দিন।",
    messenger: "Messenger লিংক এখনো যোগ করা হয়নি। অ্যাডমিন প্যানেলের সেটিংসে লিংক দিন।",
    service: "WhatsApp নম্বর বা Messenger লিংক এখনো যোগ করা হয়নি। অ্যাডমিন প্যানেলের সেটিংসে দিন।"
  };
  var HIDE_IF_MISSING = ["facebook", "email", "youtube", "instagram", "tiktok"];

  function wireContacts(root) {
    $$("[data-contact]", root).forEach(function (a) {
      var kind = a.getAttribute("data-contact");
      var url = urlFor(kind, a.getAttribute("data-msg"));
      if (url) {
        a.setAttribute("href", url);
        if (kind !== "email") { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
        return;
      }
      if (HIDE_IF_MISSING.indexOf(kind) > -1) {
        var li = a.closest("li");
        (li || a).setAttribute("data-hidden", "true");
        return;
      }
      a.addEventListener("click", function (e) { e.preventDefault(); toast(MISSING[kind] || MISSING.whatsapp); });
    });
  }

  /* ---------- আইকন ---------- */
  var ICONS = {
    chat: '<path d="M4 5.500A2.500 2.500 0 0 1 6.500 3h11A2.500 2.500 0 0 1 20 5.500v8a2.500 2.500 0 0 1-2.500 2.500H11l-4.500 4v-4A2.500 2.500 0 0 1 4 13.500v-8Z"/><path d="M8 8.500h8M8 11.500h5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.400 0 2-1 2-2 0-1.500-1-1.800-1-3 0-1 .8-2 2-2h2.500A3.500 3.500 0 0 0 21 10.500C21 6.300 17 3 12 3Z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10" cy="7.500" r="1"/><circle cx="15" cy="7.500" r="1"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l8 4V5L7 9H4a1 1 0 0 0-1 1Z"/><path d="M19 9a4 4 0 0 1 0 6M7 15l1.500 5h2.500l-1-4.500"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.500"/><circle cx="9" cy="10" r="1.800"/><path d="m21 16-5-5-8 9"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.500"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    cart: '<path d="M3 4h2.500l2 11h10l2-8H7"/><circle cx="9" cy="19.500" r="1.500"/><circle cx="17" cy="19.500" r="1.500"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/>',
    users: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20a6.500 6.500 0 0 1 13 0M16 4.500a3.500 3.500 0 0 1 0 7M18 14a6 6 0 0 1 3.500 6"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="2.500"/><path d="M3 9h18M9 9v11"/>'
  };
  function icon(name) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "24"); s.setAttribute("height", "24");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[name] || ICONS.chat;
    return s;
  }

  /* ---------- সার্ভিস ---------- */
  var list = $("#serviceList"), fs = $("#footerServices");
  (S.services || []).forEach(function (sv) {
    var ic = h("span", { "class": "service__icon" }); ic.appendChild(icon(sv.icon));
    var cta = h("a", { href: "#contact", "data-contact": "service", "data-msg": sv.message || "", text: "WhatsApp-এ জানুন" });
    var ob = h("button", { "class": "service__order", type: "button", "data-order": sv.id, text: sv.orderable === false ? "" : "অর্ডার করুন" });
    if (sv.orderable === false) ob = null;
    var row = h("div", { "class": "service__cta" }, [ob, cta]);
    list.appendChild(h("li", { "class": "service" }, [ic, h("h3", { text: sv.title }), h("p", { text: sv.desc }), row]));
    if (fs) fs.appendChild(h("a", { href: "#services", text: sv.title }));
  });

  /* ---------- পোর্টফোলিও ---------- */
  var items = (P.items || []).filter(function (i) { return i.enabled !== false; });
  var catLabel = {};
  (P.categories || []).forEach(function (c) { catLabel[c.id] = c.label; });
  var grid = $("#grid"), filtersEl = $("#filters"), emptyEl = $("#empty");
  var current = "all";

  function media(it, idx) {
    if (it.type === "video") {
      var v = h("video", { controls: "", preload: "none", playsinline: "", poster: it.poster || "", "aria-label": it.alt || it.title });
      v.appendChild(h("source", { src: it.src, type: "video/mp4" }));
      return h("div", { "class": "card__media" }, [v]);
    }
    var img = h("img", { src: it.src, alt: it.alt || it.title, loading: "lazy", decoding: "async" });
    if (it.w && it.h) { img.setAttribute("width", it.w); img.setAttribute("height", it.h); }
    var b = h("button", { "class": "card__media", type: "button", "aria-label": "বড় করে দেখুন: " + it.title }, [img]);
    b.addEventListener("click", function () { openLb(it); });
    return b;
  }
  function renderGrid() {
    grid.textContent = "";
    var shown = items.filter(function (i) { return current === "all" || i.category === current; });
    shown.forEach(function (it, idx) {
      var body = h("div", { "class": "card__body" }, [
        h("span", { "class": "card__tag", text: catLabel[it.category] || "" }),
        h("h3", { text: it.title }),
        it.desc ? h("p", { text: it.desc }) : null
      ]);
      grid.appendChild(h("article", { "class": "card" }, [media(it, idx), body]));
    });
    emptyEl.hidden = shown.length > 0;
    grid.hidden = shown.length === 0;
  }
  function renderFilters() {
    var used = {};
    items.forEach(function (i) { used[i.category] = true; });
    var cats = (P.categories || []).filter(function (c) { return P.showEmpty || used[c.id]; });
    if (cats.length < 2 && !P.showEmpty) { filtersEl.hidden = true; return; }
    [{ id: "all", label: "সব কাজ" }].concat(cats).forEach(function (c) {
      var b = h("button", { "class": "chip", type: "button", "aria-pressed": c.id === current ? "true" : "false", text: c.label });
      b.addEventListener("click", function () {
        current = c.id;
        $$(".chip", filtersEl).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        renderGrid();
      });
      filtersEl.appendChild(b);
    });
  }
  renderFilters(); renderGrid();

  /* ---------- বাছাই করা কাজ (প্রথম featured আইটেম) ---------- */
  var feat = items.filter(function (i) { return i.featured && i.type === "image"; })[0];
  if (feat) {
    var spot = $("#spot");
    var img = h("img", { src: feat.src, alt: feat.alt || feat.title, loading: "lazy", decoding: "async" });
    if (feat.w && feat.h) { img.setAttribute("width", feat.w); img.setAttribute("height", feat.h); }
    var ib = h("button", { "class": "spot__img", type: "button", "aria-label": "বড় করে দেখুন: " + feat.title }, [img]);
    ib.addEventListener("click", function () { openLb(feat); });
    var txt = h("div", {}, [h("h3", { text: feat.title }), feat.desc ? h("p", { text: feat.desc }) : null]);
    if (feat.facts && feat.facts.length) {
      var ul = h("ul", { "class": "facts" });
      feat.facts.forEach(function (f) { ul.appendChild(h("li", {}, [h("strong", { text: f.v }), h("span", { text: f.l })])); });
      txt.appendChild(ul);
    }
    spot.appendChild(ib); spot.appendChild(txt);
    $("#featured").hidden = false;
  }

  /* ---------- লাইটবক্স ---------- */
  var lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap"), lbPrev = $("#lbPrev"), lbNext = $("#lbNext");
  var lbList = [], lbIdx = 0;
  function showLb() {
    var it = lbList[lbIdx];
    lbImg.src = it.src; lbImg.alt = it.alt || it.title;
    lbCap.textContent = it.title + (it.desc ? " — " + it.desc : "");
    var many = lbList.length > 1;
    lbPrev.hidden = lbNext.hidden = !many;
  }
  function openLb(it) {
    lbList = items.filter(function (i) { return i.type === "image" && (current === "all" || i.category === current); });
    lbIdx = Math.max(0, lbList.indexOf(it));
    if (!lbList.length) { lbList = [it]; lbIdx = 0; }
    showLb();
    if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
    $("#lbClose").focus();
  }
  function step(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; showLb(); }
  lbPrev.addEventListener("click", function () { step(-1); });
  lbNext.addEventListener("click", function () { step(1); });
  $("#lbClose").addEventListener("click", function () { lb.close(); });
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", function (e) {
    if (lbList.length < 2) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ---------- নেভিগেশন ---------- */
  var menu = $("#menu"), btn = $("#menuBtn");
  function closeMenu() { menu.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "মেনু খুলুন"); }
  btn.addEventListener("click", function () {
    var open = menu.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "মেনু বন্ধ করুন" : "মেনু খুলুন");
  });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  var links = $$(".nav__links a[href^='#']:not(.btn)");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ["home", "about", "services", "portfolio", "contact"].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- উপরে যাওয়ার বাটন ---------- */
  var top = $("#toTop");
  window.addEventListener("scroll", function () { top.hidden = window.scrollY < 700; }, { passive: true });
  top.addEventListener("click", function () { window.scrollTo({ top: 0 }); });

  /* ---------- সেটিংস থেকে লেখা, লোগো ---------- */
  function paras(t) { return String(t || "").split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  if (S.name) document.title = S.name;
  $$(".nav__brand img, .footer__brand img").forEach(function (i) { if (S.logo) i.src = S.logo; i.removeAttribute("width"); i.removeAttribute("height"); i.alt = S.name || ""; });
  if (S.heroTitle) $(".hero h1").textContent = S.heroTitle;
  if (S.heroLead) $(".hero .lead").textContent = S.heroLead;
  if (S.heroImage) $(".shot img").src = S.heroImage;
  if (S.aboutText) {
    var ab = $("#about .about__in > div");
    $$("p", ab).forEach(function (p) { p.remove(); });
    paras(S.aboutText).forEach(function (t) { ab.appendChild(h("p", { text: t })); });
  }
  if (S.slogan) {
    var q = $(".slogan"); q.textContent = "";
    S.slogan.split("\n").filter(function (x) { return x.trim(); }).forEach(function (t) { q.appendChild(h("p", { text: t })); });
    $(".footer__brand p").textContent = S.slogan.replace(/\s*\n\s*/g, " ");
  }

  /* ---------- ডায়নামিক পেজ ---------- */
  var pv = $("#pageView"), pb = $("#pageBody"), homeSecs = $$("main > section:not(#pageView)");
  var navEnd = $(".nav__wa-mobile"), fq = $(".footer__col");
  D.pages.forEach(function (pg) {
    if (!pg.inNav) return;
    var href = "#/p/" + encodeURIComponent(pg.slug);
    menu.insertBefore(h("a", { href: href, text: pg.title }), navEnd);
    fq.appendChild(h("a", { href: href, text: pg.title }));
  });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", closeMenu); });
  function renderPage(pg) {
    pb.textContent = "";
    pb.appendChild(h("a", { "class": "page__back", href: "#home", text: "← হোমে ফিরুন" }));
    pb.appendChild(h("h1", { text: pg.title }));
    String(pg.content || "").split(/\n\s*\n/).forEach(function (blk) {
      var box = h("div", { "class": "page__blk" });
      blk.split("\n").forEach(function (ln) {
        ln = ln.trim(); if (!ln) return;
        var im = /^!\s*(\S+)$/.exec(ln);
        if (/^##\s+/.test(ln)) box.appendChild(h("h2", { text: ln.replace(/^##\s+/, "") }));
        else if (im && /^(\/uploads\/|assets\/|https:\/\/)/.test(im[1])) box.appendChild(h("img", { src: im[1], alt: "", loading: "lazy" }));
        else box.appendChild(h("p", { text: ln }));
      });
      pb.appendChild(box);
    });
  }
  function route() {
    var m = /^#\/p\/(.+)$/.exec(location.hash), pg = null;
    if (m) { var slug = decodeURIComponent(m[1]); pg = D.pages.filter(function (x) { return x.slug === slug; })[0] || null; }
    pv.hidden = !pg;
    homeSecs.forEach(function (s) { if (pg) s.setAttribute("data-hidden", "true"); else s.removeAttribute("data-hidden"); });
    if (pg) { renderPage(pg); document.title = pg.title + " | " + (S.name || ""); window.scrollTo(0, 0); }
    else {
      document.title = S.name || document.title;
      var el = location.hash.length > 1 && !m ? document.getElementById(location.hash.slice(1)) : null;
      if (el) el.scrollIntoView();
    }
  }
  window.addEventListener("hashchange", route);
  route();

  /* ---------- অর্ডার ফর্ম ---------- */
  var od = $("#orderDlg"), of = $("#orderForm"), osel = $("#ordSection");
  (D.sections || []).forEach(function (sv) { if (sv.orderable !== false) osel.appendChild(h("option", { value: sv.id, text: sv.title })); });
  osel.appendChild(h("option", { value: "", text: "অন্য কিছু" }));
  function openOrder(sid) { osel.value = sid || ""; if (!sid && osel.options.length > 1) osel.selectedIndex = 0; od.showModal(); }
  $$("[data-order]").forEach(function (b) { b.addEventListener("click", function () { openOrder(b.getAttribute("data-order")); }); });
  $("#ordCancel").addEventListener("click", function () { od.close(); });
  od.addEventListener("click", function (e) { if (e.target === od) od.close(); });
  of.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = {}; new FormData(of).forEach(function (v, k) { body[k] = v; });
    fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); }); })
      .then(function () { od.close(); of.reset(); toast("আপনার অর্ডার পাঠানো হয়েছে। আমরা শিগগির যোগাযোগ করব।"); })
      .catch(function (er) { toast(er.message || "পাঠানো যায়নি, আবার চেষ্টা করুন।"); });
  });

  /* ---------- "চলুন কথা বলি": WhatsApp / Messenger বেছে নেওয়া ---------- */
  var cb = $("#chatBtn"), cm = $("#chatMenu");
  function chat(open) { cm.hidden = !open; cb.setAttribute("aria-expanded", open ? "true" : "false"); }
  cb.addEventListener("click", function (e) { e.stopPropagation(); chat(cm.hidden); });
  document.addEventListener("click", function (e) { if (!cm.hidden && !cm.contains(e.target)) chat(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") chat(false); });

  /* ---------- শেষে ---------- */
  $("#year").textContent = new Date().getFullYear();
  wireContacts(document);
  }
})();
