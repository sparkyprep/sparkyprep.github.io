// Sparky Prep app. One page, hash routes, no framework.
// Progress is kept in localStorage straight away and, when signed in, saved to the server a
// couple of seconds after each change, so nothing is lost if the tab closes.

(function () {
  "use strict";

  // ------------------------------------------------------------------ helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayDiff = (a, b) => Math.round((new Date(b + "T00:00") - new Date(a + "T00:00")) / 864e5);
  const DAY = 864e5;
  const KEYS = ["A", "B", "C", "D"];

  // ------------------------------------------------------------------ progress
  const LS = "sparky-prep:v1";
  const fresh = () => ({
    v: 1, xp: 0, answered: 0, correct: 0, cards: {}, days: {}, streak: { count: 0, last: null, best: 0 },
    goal: 10, settings: { answerFirst: false, leaderboard: false }, badges: {}, exams: [], maths: { answered: 0, correct: 0 }, run: 0, bestRun: 0,
  });
  let P = load();
  let user = null;
  // No server (e.g. GitHub Pages): accounts are hidden and progress lives in this browser only
  let STATIC = false;
  let saveTimer = null;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(LS)); if (s && s.v === 1) return { ...fresh(), ...s }; } catch {}
    return fresh();
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(P)); } catch {}
    if (!user) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushProgress, 1500);
  }
  async function pushProgress() {
    if (!user) return;
    try {
      const r = await api("PUT", "api/progress", { progress: P });
      if (r.status === 401) { user = null; renderChrome(); }
    } catch {}
  }
  window.addEventListener("pagehide", () => { if (user && saveTimer) { clearTimeout(saveTimer); pushProgress(); } });

  async function api(method, url, body) {
    if (STATIC) return { status: 0, ok: false, data: {} };
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin", keepalive: method === "PUT" });
    let data = {};
    try { data = await res.json(); } catch {}
    return { status: res.status, ok: res.ok, data };
  }

  // Merge two progress objects (e.g. this device + the account) keeping the best of each card.
  function merge(a, b) {
    if (!a) return b; if (!b) return a;
    const out = { ...fresh(), ...a };
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    out.answered = Math.max(a.answered || 0, b.answered || 0);
    out.correct = Math.max(a.correct || 0, b.correct || 0);
    out.cards = { ...(b.cards || {}) };
    for (const [id, c] of Object.entries(a.cards || {})) {
      const o = out.cards[id];
      out.cards[id] = !o || (c.t || 0) > (o.t || 0) ? c : o;
    }
    out.days = { ...(b.days || {}) };
    for (const [d, n] of Object.entries(a.days || {})) out.days[d] = Math.max(n, out.days[d] || 0);
    out.streak = (a.streak?.count || 0) >= (b.streak?.count || 0) ? a.streak : b.streak;
    out.badges = { ...(b.badges || {}), ...(a.badges || {}) };
    out.exams = [...(b.exams || []), ...(a.exams || [])].sort((x, y) => x.at - y.at).filter((e, i, arr) => !i || e.at !== arr[i - 1].at).slice(-30);
    out.maths = { answered: Math.max(a.maths?.answered || 0, b.maths?.answered || 0), correct: Math.max(a.maths?.correct || 0, b.maths?.correct || 0) };
    out.settings = { ...(b.settings || {}), ...(a.settings || {}) };
    out.bestRun = Math.max(a.bestRun || 0, b.bestRun || 0);
    return out;
  }

  // ------------------------------------------------------------------ spaced repetition
  // Leitner boxes: right answers move a card up a box and push its next review further out.
  // A wrong answer drops it back to box 1 and brings it back tomorrow (and later this session).
  const GAPS = [0, 1, 3, 7, 14, 30, 60]; // days per box
  const MASTERED = 3;

  function grade(id, right) {
    const c = P.cards[id] || { b: 0, r: 0, w: 0 };
    c.b = right ? Math.min(c.b + 1, GAPS.length - 1) : 1;
    c.due = Date.now() + (right ? GAPS[c.b] * DAY : 0.5 * DAY);
    c.t = Date.now();
    c.last = right ? 1 : 0;
    right ? c.r++ : c.w++;
    P.cards[id] = c;
  }
  const due = () => QB.all().filter((q) => P.cards[q.id] && P.cards[q.id].due <= Date.now());
  const unseen = (list = QB.all()) => list.filter((q) => !P.cards[q.id]);
  const mistakes = () => QB.all().filter((q) => P.cards[q.id] && P.cards[q.id].last === 0);
  function mastery(unitId) {
    const qs = unitId ? QB.forUnit(unitId) : QB.all();
    if (!qs.length) return 0;
    return qs.reduce((s, q) => s + Math.min((P.cards[q.id]?.b || 0), MASTERED + 1) / (MASTERED + 1), 0) / qs.length;
  }
  const mastered = () => QB.all().filter((q) => (P.cards[q.id]?.b || 0) >= MASTERED).length;

  // ------------------------------------------------------------------ xp, streak, badges
  const level = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
  const levelFloor = (l) => 60 * (l - 1) ** 2;

  function countAnswer(right) {
    const d = today();
    P.days[d] = (P.days[d] || 0) + 1;
    P.answered++; if (right) P.correct++;
    P.xp += right ? 10 : 2;
    P.run = right ? (P.run || 0) + 1 : 0;
    P.bestRun = Math.max(P.bestRun || 0, P.run);
    if (P.days[d] === P.goal) {
      const last = P.streak.last;
      if (last !== d) {
        P.streak.count = last && dayDiff(last, d) === 1 ? P.streak.count + 1 : 1;
        P.streak.last = d;
        P.streak.best = Math.max(P.streak.best || 0, P.streak.count);
        P.xp += 20;
        toast(`Daily goal done. ${P.streak.count}-day streak`, "flame");
      }
    }
  }
  const streakNow = () => {
    const last = P.streak.last;
    if (!last) return 0;
    return dayDiff(last, today()) <= 1 ? P.streak.count : 0;
  };

  const BADGES = [
    { id: "first", name: "First spark", desc: "Answer your first question", icon: "bolt", test: () => P.answered >= 1 },
    { id: "run10", name: "On a roll", desc: "10 right in a row", icon: "star", test: () => P.bestRun >= 10 },
    { id: "goal", name: "Daily goal", desc: "Hit your daily goal", icon: "target", test: () => Object.values(P.days).some((n) => n >= P.goal) },
    { id: "streak3", name: "Three-peat", desc: "3-day streak", icon: "flame", test: () => (P.streak.best || 0) >= 3 },
    { id: "streak7", name: "Week strong", desc: "7-day streak", icon: "flame", test: () => (P.streak.best || 0) >= 7 },
    { id: "maths25", name: "Number cruncher", desc: "25 maths questions right", icon: "calc", test: () => P.maths.correct >= 25 },
    { id: "allunits", name: "Full coverage", desc: "Try a question from every unit", icon: "layers", test: () => QB.UNITS.every((u) => QB.forUnit(u.id).some((q) => P.cards[q.id])) },
    { id: "mastered50", name: "Locked in", desc: "Master 50 questions", icon: "lock", test: () => mastered() >= 50 },
    { id: "exampass", name: "Exam ready", desc: "Pass a mock exam (60%+)", icon: "trophy", test: () => P.exams.some((e) => e.pct >= 60) },
    { id: "exam80", name: "Top marks", desc: "Score 80%+ in a mock exam", icon: "trophy", test: () => P.exams.some((e) => e.pct >= 80) },
    { id: "xp1000", name: "1,000 XP", desc: "Earn 1,000 XP", icon: "chart", test: () => P.xp >= 1000 },
  ];
  function checkBadges() {
    for (const b of BADGES) if (!P.badges[b.id] && b.test()) { P.badges[b.id] = Date.now(); toast(`Badge unlocked: ${b.name}`, "trophy"); }
  }

  // ------------------------------------------------------------------ chrome (nav, footer, toast)
  function navLinks() {
    if (!user && !P.answered && !STATIC) return [["#/", "Home", "bolt"], ["#/maths", "Maths trainer", "calc"], ["#/units", "Units", "book"]];
    return [["#/", "Dashboard", "chart"], ["#/units", "Units", "book"], ["#/maths", "Maths", "calc"], ["#/exam", "Mock exam", "clock"], ["#/progress", "Progress", "trophy"]];
  }
  function renderChrome() {
    $("#logo").innerHTML = logoMark(30);
    const route = location.hash.split("?")[0] || "#/";
    $("#nav").innerHTML = navLinks().map(([href, label, ic]) => {
      const on = route === href || (href !== "#/" && route.startsWith(href));
      return `<a href="${href}" class="${on ? "on" : ""}">${icon(ic, 18)}${label}</a>`;
    }).join("");
    const s = streakNow();
    $("#navRight").innerHTML = STATIC
      ? `<span class="chip-stat streak ${s ? "hot" : ""}" title="Day streak">${icon("flame", 16)}${s}</span>
         <span class="chip-stat xp" title="Experience points">${icon("star", 16)}${P.xp.toLocaleString()}</span>`
      : user
      ? `<span class="chip-stat streak ${s ? "hot" : ""}" title="Day streak">${icon("flame", 16)}${s}</span>
         <span class="chip-stat xp" title="Experience points">${icon("star", 16)}${P.xp.toLocaleString()}</span>
         <a class="icon-btn" href="#/account" aria-label="Your account">${icon("user", 18)}</a>`
      : `<a class="btn btn-quiet btn-sm" href="#/login">Log in</a><a class="btn btn-primary btn-sm" href="#/signup">Sign up free</a>`;
    $("#menuBtn").innerHTML = icon("menu", 20);
    $("#footer").innerHTML = `<div class="wrap footer-in">
      <span class="brand-name">Sparky<span>Prep</span></span>
      <span>Built for NZ electrical pre-trade students. Not an official ETCO, Skills or EWRB resource.</span>
    </div>`;
  }
  $("#menuBtn").addEventListener("click", () => {
    const n = $("#nav"); const open = !n.classList.contains("open");
    n.classList.toggle("open", open); $("#menuBtn").setAttribute("aria-expanded", open);
  });

  let toastTimer;
  function toast(msg, ic = "check") {
    const t = $("#toast");
    t.innerHTML = `${icon(ic, 18)}<span>${esc(msg)}</span>`;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  // Widths and ring offsets are set from data attributes (the CSP blocks inline styles)
  function paint(root = document) {
    $$("[data-w]", root).forEach((el) => requestAnimationFrame(() => (el.style.width = el.dataset.w + "%")));
    $$("[data-ring]", root).forEach((el) => {
      const c = 2 * Math.PI * 56;
      el.style.strokeDasharray = c;
      el.style.strokeDashoffset = c;
      requestAnimationFrame(() => requestAnimationFrame(() => (el.style.strokeDashoffset = c * (1 - Math.min(1, +el.dataset.ring)))));
    });
  }

  const view = (html) => { const m = $("#main"); m.innerHTML = html; paint(m); window.scrollTo(0, 0); };

  // ------------------------------------------------------------------ landing
  function landing() {
    const total = QB.all().length;
    view(`
    <section class="hero"><div class="wrap hero-grid">
      <div>
        <span class="eyebrow"><span class="dot">${icon("bolt", 14)}</span>For the NZ electrical pre-trade capstone</span>
        <h1>Walk into your capstone <em>ready</em>.</h1>
        <p class="lede">Short daily practice across all 8 units. The questions you get wrong come back until they stick, and the maths trainer shows every step.</p>
        <div class="hero-ctas">
          ${STATIC ? `<a class="btn btn-primary btn-lg" href="#/practice?mode=review">Start practising ${icon("arrow", 18)}</a>
          <a class="btn btn-ghost btn-lg" href="#/maths">Maths trainer</a>` : `<a class="btn btn-primary btn-lg" href="#/signup">Create a free account ${icon("arrow", 18)}</a>
          <a class="btn btn-ghost btn-lg" href="#/practice?mode=mixed">Try 10 questions</a>`}
        </div>
        <p class="hero-note">${icon("lock", 16)}${STATIC ? "No sign-up needed. Your progress saves in this browser." : "Just a username and password. No email needed."}</p>
      </div>
      <div class="preview" aria-hidden="true">
        <div class="preview-card">
          <div class="preview-top"><span class="tag blue">US 32610 · Parallel circuits</span><span class="mono dim">7 / 10</span></div>
          <p class="qtext">Three resistors of 20 Ω, 30 Ω and 60 Ω are connected in parallel. What is the total resistance?</p>
          <div class="options">
            <div class="opt math faded"><span class="key">A</span>110 Ω</div>
            <div class="opt math right"><span class="key">B</span>10 Ω<span class="mark">${icon("check", 18)}</span></div>
            <div class="opt math faded"><span class="key">C</span>0.1 Ω</div>
          </div>
          <div class="workings"><span class="f">1/Rₜ = 1/20 + 1/30 + 1/60</span><br>= 0.05 + 0.0333 + 0.0167 = 0.1<br>FLIP: Rₜ = 1 ÷ 0.1 = 10 Ω</div>
        </div>
        <div class="preview-float a"><span class="float-ic t4">${icon("flame", 18)}</span>6-day streak</div>
        <div class="preview-float b"><span class="float-ic t2">${icon("review", 18)}</span>4 cards due today</div>
      </div>
    </div></section>

    <section class="band alt"><div class="wrap">
      <div class="section-head"><p class="kicker">How it works</p><h2>Study the way memory actually works</h2>
        <p>Re-reading notes feels productive but doesn't stick. Testing yourself and spacing it out does, so the whole site is built around those two ideas.</p></div>
      <div class="steps">
        <div class="step"><div class="step-ic">${icon("target", 24)}</div><p class="num">01</p><h3>Answer first</h3><p>Every question is four-option, like the real capstone. Turn on "answer first" to hide the options until you've thought of the answer.</p></div>
        <div class="step"><div class="step-ic">${icon("review", 24)}</div><p class="num">02</p><h3>Review what's due</h3><p>Get one wrong and it comes back tomorrow. Get it right and the gap grows: 3 days, a week, a month.</p></div>
        <div class="step"><div class="step-ic">${icon("shuffle", 24)}</div><p class="num">03</p><h3>Mix it up</h3><p>Mixed sets make you work out which formula or rule applies, which is the part the exam actually tests.</p></div>
      </div>
    </div></section>

    <section class="band"><div class="wrap">
      <div class="section-head"><p class="kicker">What's covered</p><h2>All 8 capstone units</h2><p>Questions written from the learner guides and class notes, each with an explanation of why the answer is right.</p></div>
      <div class="units">${QB.UNITS.map(unitCard).join("")}</div>
    </div></section>

    <section class="band alt"><div class="wrap">
      <div class="stats">
        <div class="stat"><b>${total}</b><span>written questions with explanations</span></div>
        <div class="stat"><b>${Object.values(Maths.TOPICS).flat().length}</b><span>maths question types, new numbers every time</span></div>
        <div class="stat"><b>40</b><span>question timed mock exam, 60% to pass</span></div>
        <div class="stat"><b>$0</b><span>free for everyone in the class</span></div>
      </div>
    </div></section>

    <section class="band"><div class="wrap">
      <div class="section-head"><p class="kicker">Questions</p><h2>Good to know</h2></div>
      <div class="faq">
        ${faq("Is this the real capstone?", "No. It's practice built from the course learner guides. The capstone is set by the industry body, so expect different questions on the same topics.")}
        ${STATIC ? faq("Where is my progress saved?", "In this browser on this device. Use the same browser each time. Clearing your browser data resets it. Accounts that sync across devices are coming.")
          : faq("Do I need an email?", "No, just a username and password. There's no email, which also means there's no password reset, so pick something you'll remember.") +
            faq("Can I use it without an account?", "Yes. Your progress saves on this device. Make an account to keep it across your phone and laptop. Your progress comes with you when you sign up.") +
            faq("Will other people see my results?", "Only if you turn on the class leaderboard in your account. It shows your username, XP and streak, nothing else.")}
      </div>
    </div></section>

    <section class="band"><div class="wrap"><div class="cta-band">
      <div><h2>Ten questions a day is enough</h2><p>About five minutes. Do it every day and the spacing does the rest.</p></div>
      <a class="btn btn-primary btn-lg" href="${STATIC ? "#/practice?mode=review" : "#/signup"}">Start now ${icon("arrow", 18)}</a>
    </div></div></section>`);
  }
  const faq = (q, a) => `<details><summary>${esc(q)}${icon("chevron", 18)}</summary><p>${esc(a)}</p></details>`;

  function unitCard(u) {
    const n = QB.forUnit(u.id).length;
    const m = Math.round(mastery(u.id) * 100);
    const seen = P.answered > 0;
    return `<a class="unit ${u.tone}" href="#/unit/${u.id}">
      ${u.partial ? `<span class="tag amber">More soon</span>` : ""}
      <span class="unit-ic">${icon(u.icon, 22)}</span>
      <div><p class="unit-code">${esc(u.code)}</p><h4>${esc(u.name)}</h4></div>
      ${seen ? `<div class="bar thin"><i data-w="${m}"></i></div>` : ""}
      <div class="meta"><span>${n} questions</span>${seen ? `<span class="mono">${m}%</span>` : ""}</div>
    </a>`;
  }

  // ------------------------------------------------------------------ dashboard
  function dashboard() {
    const d = today();
    const done = P.days[d] || 0;
    const nDue = due().length;
    const s = streakNow();
    const lvl = level(P.xp), lo = levelFloor(lvl), hi = levelFloor(lvl + 1);
    const ready = Math.round(mastery() * 100);
    const acc = P.answered ? Math.round((P.correct / P.answered) * 100) : 0;
    const nMiss = mistakes().length;
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
    const goalDone = done >= P.goal;
    view(`<div class="page"><div class="wrap">
      <div class="page-head"><div><h1>${hello}${user ? ", " + esc(user.username) : ""}</h1>
        <p class="muted">${goalDone ? "Daily goal done. Anything extra now is a bonus." : `${P.goal - done} more question${P.goal - done === 1 ? "" : "s"} to hit today's goal.`}</p></div></div>

      <div class="dash">
        <div class="card today">
          <div class="ring ${goalDone ? "done" : ""}"><svg viewBox="0 0 132 132"><circle class="track" cx="66" cy="66" r="56" fill="none" stroke-width="12"/><circle class="fill" data-ring="${done / P.goal}" cx="66" cy="66" r="56" fill="none" stroke-width="12" stroke-linecap="round"/></svg>
            <div class="ring-label"><div><b>${done}</b><span>of ${P.goal} today</span></div></div></div>
          <div>
            <h2>${nDue ? `${nDue} card${nDue === 1 ? "" : "s"} due for review` : P.answered ? "You're up to date" : "Start your first session"}</h2>
            <p>${nDue ? "Do these first. They're the ones about to slip." : "A daily session mixes in new questions from every unit, plus some maths."}</p>
            <div class="today-ctas">
              <a class="btn btn-primary" href="#/practice?mode=review">${icon("review", 18)}${nDue ? "Start review" : "Daily session"}</a>
              <a class="btn btn-ghost" href="#/practice?mode=mixed">${icon("shuffle", 18)}Mixed practice</a>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="metrics">
            <div class="metric amber"><p class="lbl">${icon("flame", 16)}Streak</p><b>${s}</b><small>best ${P.streak.best || 0} day${(P.streak.best || 0) === 1 ? "" : "s"}</small></div>
            <div class="metric"><p class="lbl">${icon("star", 16)}Level ${lvl}</p><b>${P.xp.toLocaleString()}</b><small>${hi - P.xp} XP to level ${lvl + 1}</small></div>
            <div class="metric"><p class="lbl">${icon("target", 16)}Accuracy</p><b>${acc}%</b><small>${P.answered} answered</small></div>
            <div class="metric"><p class="lbl">${icon("lock", 16)}Mastered</p><b>${mastered()}</b><small>of ${QB.all().length}</small></div>
          </div>
          <div class="ready"><div class="ready-top"><span>Capstone readiness</span><b>${ready}%</b></div><div class="bar"><i data-w="${ready}"></i></div></div>
        </div>
      </div>

      <div class="actions">
        ${action("#/maths", "calc", "Maths trainer", "Endless calculations with worked answers", "t4")}
        ${action("#/exam", "clock", "Mock exam", "40 questions, timed, 60% to pass", "t5")}
        ${action("#/mistakes", "alert", "Mistakes", nMiss ? `${nMiss} to fix` : "Nothing to fix right now", "t8")}
        ${action("#/practice?mode=formula", "lightbulb", "Which formula?", "Pick the right formula, fast", "t3")}
      </div>

      <div class="section-title"><h2>Units</h2><a href="#/units" class="muted">See all</a></div>
      <div class="units">${QB.UNITS.map(unitCard).join("")}</div>
    </div></div>`);
  }
  const action = (href, ic, title, desc, tone) =>
    `<a class="action ${tone}" href="${href}"><span class="action-ic">${icon(ic, 20)}</span><div><h4>${esc(title)}</h4><p>${esc(desc)}</p></div></a>`;

  // ------------------------------------------------------------------ units
  function unitsPage() {
    view(`<div class="page"><div class="wrap">
      <div class="page-head"><div><h1>Units</h1><p class="muted">Practise one unit at a time, or pick a single topic inside it.</p></div></div>
      <div class="units">${QB.UNITS.map(unitCard).join("")}</div>
    </div></div>`);
  }

  function unitPage(id) {
    const u = QB.unit(id);
    if (!u) return go("#/units");
    const qs = QB.forUnit(id);
    const topics = QB.topics(id);
    const m = Math.round(mastery(id) * 100);
    const seen = qs.filter((q) => P.cards[q.id]).length;
    const nDue = qs.filter((q) => P.cards[q.id] && P.cards[q.id].due <= Date.now()).length;
    view(`<div class="page"><div class="wrap ${u.tone}">
      <a href="#/units" class="btn btn-quiet btn-sm">${icon("back", 16)}Units</a>
      <div class="page-head"><div class="unit-headline">
        <span class="unit-ic">${icon(u.icon, 24)}</span>
        <p class="unit-code">${esc(u.code)}</p><h1>${esc(u.name)}</h1><p class="muted">${esc(u.long)}</p></div>
        <a class="btn btn-primary btn-lg" href="#/practice?mode=unit&unit=${id}">Practise this unit ${icon("arrow", 18)}</a>
      </div>
      ${u.partial ? `<div class="card notice">${icon("alert", 18)}<p>This unit is built from practice quizzes so far. More questions get added once the learner guide is in.</p></div>` : ""}
      <div class="split">
        <div class="card">
          <div class="card-head"><h3>Topics</h3><span class="muted">${qs.length} questions</span></div>
          <div class="list">${Object.entries(topics).map(([t, n]) => {
            const tq = qs.filter((q) => q.topic === t);
            const tm = Math.round(tq.reduce((s, q) => s + Math.min(P.cards[q.id]?.b || 0, 4) / 4, 0) / tq.length * 100);
            return `<div class="row"><div class="grow"><p>${esc(t)}</p><small>${n} question${n === 1 ? "" : "s"} · ${tm}% mastered</small></div>
              <a class="btn btn-ghost btn-sm" href="#/practice?mode=unit&unit=${id}&topic=${encodeURIComponent(t)}">Practise</a></div>`;
          }).join("")}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Your progress</h3></div>
          <div class="metrics">
            <div class="metric"><p class="lbl">Mastery</p><b>${m}%</b></div>
            <div class="metric"><p class="lbl">Seen</p><b>${seen}</b><small>of ${qs.length}</small></div>
            <div class="metric"><p class="lbl">Due now</p><b>${nDue}</b></div>
            <div class="metric"><p class="lbl">To fix</p><b>${qs.filter((q) => P.cards[q.id]?.last === 0).length}</b></div>
          </div>
          <div class="bar unit-bar"><i data-w="${m}"></i></div>
        </div>
      </div>
    </div></div>`);
  }

  // ------------------------------------------------------------------ maths hub
  function mathsPage() {
    const topics = Object.keys(Maths.TOPICS);
    const acc = P.maths.answered ? Math.round((P.maths.correct / P.maths.answered) * 100) : 0;
    view(`<div class="page"><div class="wrap">
      <div class="page-head"><div><h1>Maths trainer</h1><p class="muted">Fresh numbers every time, with the full working after each answer. Pick a topic or mix them all.</p></div>
        <a class="btn btn-primary btn-lg" href="#/practice?mode=maths">${icon("shuffle", 18)}Mixed maths</a></div>
      <div class="split">
        <div class="card"><div class="card-head"><h3>Topics</h3></div>
          <div class="list">${topics.map((t) => `<div class="row"><div class="grow"><p>${esc(t)}</p><small>${Maths.TOPICS[t].length} question type${Maths.TOPICS[t].length === 1 ? "" : "s"}</small></div>
            <a class="btn btn-ghost btn-sm" href="#/practice?mode=maths&topic=${encodeURIComponent(t)}">Practise</a></div>`).join("")}
            <div class="row"><div class="grow"><p>Which formula?</p><small>Recognise the right formula from the situation</small></div>
            <a class="btn btn-ghost btn-sm" href="#/practice?mode=formula">Practise</a></div>
          </div></div>
        <div>
          <div class="card"><div class="card-head"><h3>Your maths</h3></div>
            <div class="metrics"><div class="metric"><p class="lbl">Answered</p><b>${P.maths.answered}</b></div><div class="metric"><p class="lbl">Accuracy</p><b>${acc}%</b></div></div></div>
          <div class="card tips">
            <h3>${icon("lightbulb", 18)}Before you start</h3>
            <ul>
              <li>Work it out <b>before</b> you look at the options.</li>
              <li>Convert first: ms → s, W → kW, mm² → m².</li>
              <li>Parallel? <b>Flip</b> at the end. The total is always smaller than the smallest resistor.</li>
              <li>Calculator in <b>degrees</b> for sin θ.</li>
              <li>Your answer isn't an option? Check your units before you guess.</li>
            </ul>
          </div>
        </div>
      </div>
    </div></div>`);
  }

  // ------------------------------------------------------------------ sessions
  let S = null; // the running session

  function bankItem(q) {
    const right = q.options[0];
    return { kind: "bank", id: q.id, unit: q.unit, topic: q.topic, q: q.q, options: shuffle(q.options), answerText: right, explain: q.explain };
  }
  function mathsItem(topic) {
    const m = topic === "Which formula?" ? Maths.formulaQuestion() : Maths.make(topic || null);
    return { ...m, options: shuffle(m.options) };
  }
  function pickSpread(pool, n) {
    // Interleave units so a set never sits on one topic for long
    const byUnit = {};
    for (const q of shuffle(pool)) (byUnit[q.unit] ||= []).push(q);
    const out = [];
    const lists = Object.values(byUnit);
    while (out.length < n && lists.some((l) => l.length)) for (const l of shuffle(lists)) if (l.length && out.length < n) out.push(l.pop());
    return out;
  }

  function buildSession(params) {
    const mode = params.get("mode") || "mixed";
    const unit = params.get("unit");
    const topic = params.get("topic");
    let items = [], title = "Practice", exam = false;

    if (mode === "review") {
      const d = shuffle(due()).slice(0, 15);
      const newOnes = pickSpread(unseen(), Math.max(0, 10 - d.length));
      items = [...d, ...newOnes].map(bankItem);
      items = shuffle(items);
      items.splice(Math.min(3, items.length), 0, mathsItem());
      items.splice(Math.min(8, items.length), 0, mathsItem());
      title = "Daily session";
    } else if (mode === "mixed") {
      const pool = QB.all();
      const fresh = pickSpread(unseen(pool), 8);
      const rest = pickSpread(pool.filter((q) => !fresh.includes(q)), 12 - fresh.length);
      items = shuffle([...fresh, ...rest]).map(bankItem);
      items.splice(4, 0, mathsItem()); items.splice(9, 0, mathsItem());
      title = "Mixed practice";
    } else if (mode === "unit") {
      let pool = QB.forUnit(unit);
      if (topic) pool = pool.filter((q) => q.topic === topic);
      const score = (q) => { const c = P.cards[q.id]; if (!c) return 1; if (c.due <= Date.now()) return 0; return 2 + c.b; };
      items = shuffle(pool).sort((a, b) => score(a) - score(b)).slice(0, 12).map(bankItem);
      title = topic ? topic : QB.unit(unit)?.name || "Unit";
    } else if (mode === "maths") {
      items = Array.from({ length: 10 }, () => mathsItem(topic));
      title = topic ? `Maths: ${topic}` : "Mixed maths";
    } else if (mode === "formula") {
      const seen = new Set();
      while (items.length < 10) { const f = mathsItem("Which formula?"); if (!seen.has(f.q) || seen.size > 12) { seen.add(f.q); items.push(f); } }
      title = "Which formula?";
    } else if (mode === "mistakes") {
      items = shuffle(mistakes()).slice(0, 15).map(bankItem);
      title = "Fix your mistakes";
    } else if (mode === "exam") {
      exam = true;
      const perUnit = QB.UNITS.map((u) => shuffle(QB.forUnit(u.id)).slice(0, 4)).flat();
      const extra = shuffle(QB.all().filter((q) => !perUnit.includes(q))).slice(0, 34 - perUnit.length);
      items = shuffle([...perUnit, ...extra]).map(bankItem);
      for (let i = 0; i < 6; i++) items.splice(Math.floor(Math.random() * items.length), 0, mathsItem());
      title = "Mock exam";
    }
    return { mode, title, items, i: 0, answers: [], exam, requeued: new Set(), start: Date.now(), xp0: P.xp, ends: exam ? Date.now() + 50 * 60_000 : null, picked: null, revealed: false };
  }

  function practice(params) {
    S = buildSession(params);
    if (!S.items.length) {
      return view(`<div class="page"><div class="wrap narrow"><div class="card empty">${icon(S.mode === "mistakes" ? "check" : "review", 40)}
        <h3>${S.mode === "mistakes" ? "No mistakes to fix" : "Nothing here yet"}</h3><p>${S.mode === "mistakes" ? "Anything you get wrong shows up here until you get it right." : "Try a mixed session instead."}</p>
        <p><a class="btn btn-primary" href="#/practice?mode=mixed">Mixed practice</a></p></div></div></div>`);
    }
    renderQ();
    if (S.exam) tick();
  }

  function tick() {
    if (!S || !S.exam) return;
    const el = $("#timer");
    const left = Math.max(0, S.ends - Date.now());
    if (el) {
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      el.querySelector("span").textContent = `${m}:${String(s).padStart(2, "0")}`;
      el.classList.toggle("low", left < 5 * 60_000);
    }
    if (left <= 0) return finish();
    setTimeout(tick, 1000);
  }

  function renderQ() {
    const it = S.items[S.i];
    S.picked = null;
    S.revealed = !P.settings.answerFirst || S.exam;
    const u = it.unit ? QB.unit(it.unit) : null;
    const pct = (S.i / S.items.length) * 100;
    const isMath = it.kind === "maths" || it.kind === "formula";
    view(`<div class="quiz">
      <div class="quiz-top">
        <a class="icon-btn" href="#/" aria-label="End session">${icon("x", 18)}</a>
        <div class="bar"><i data-w="${pct}"></i></div>
        ${S.exam ? `<span class="timer" id="timer">${icon("clock", 16)}<span>50:00</span></span>` : ""}
        <span class="quiz-count">${S.i + 1} / ${S.items.length}</span>
      </div>
      <div class="qcard">
        <div class="qmeta">
          ${u ? `<span class="tag ${u.tone} tone-tag">${esc(u.code)}</span>` : `<span class="tag blue">${icon(it.kind === "formula" ? "lightbulb" : "calc", 12)}&nbsp;Maths</span>`}
          <span class="tag">${esc(it.topic)}</span>
          ${!S.exam && it.kind === "bank" && !P.cards[it.id] ? `<span class="tag amber">New</span>` : ""}
        </div>
        <p class="qtext">${esc(it.q)}</p>
        <div id="opts">${S.revealed ? optionsHtml(it, isMath) : `<button class="reveal" data-act="reveal"><b>Got your answer in mind?</b>Tap to show the options (or press Space)</button>`}</div>
        <div id="fb"></div>
      </div>
      <div class="quiz-foot">
        ${S.exam ? `<span class="kbd-hint">Answers are marked at the end. Pick one and move on.</span>` :
        `<label class="toggle"><input type="checkbox" id="af" ${P.settings.answerFirst ? "checked" : ""}><span class="sw"></span>Answer first</label>`}
        <span class="kbd-hint">Keys <span class="kbd">1</span>–<span class="kbd">4</span> to answer, <span class="kbd">Enter</span> for next</span>
      </div>
    </div>`);
    const af = $("#af");
    if (af) af.addEventListener("change", () => { P.settings.answerFirst = af.checked; save(); });
  }

  function optionsHtml(it, isMath) {
    return `<div class="options">${it.options.map((o, i) =>
      `<button class="opt ${isMath ? "math" : ""}" data-act="pick" data-i="${i}"><span class="key">${KEYS[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  }

  function reveal() {
    if (S.revealed) return;
    S.revealed = true;
    const it = S.items[S.i];
    $("#opts").innerHTML = optionsHtml(it, it.kind !== "bank");
  }

  function pick(i) {
    if (!S || S.picked !== null || !S.revealed) return;
    const it = S.items[S.i];
    const chosen = it.options[i];
    const right = chosen === it.answerText;
    S.picked = i;
    S.answers.push({ it, chosen, right });

    if (it.kind === "bank") grade(it.id, right);
    if (it.kind !== "bank") { P.maths.answered++; if (right) P.maths.correct++; }
    countAnswer(right);

    const btns = $$(".opt");
    btns.forEach((b, j) => {
      b.disabled = true;
      if (S.exam) { if (j === i) b.classList.add("picked"); return; }
      if (it.options[j] === it.answerText) { b.classList.add("right"); b.insertAdjacentHTML("beforeend", `<span class="mark">${icon("check", 18)}</span>`); }
      else if (j === i) { b.classList.add("wrong"); b.insertAdjacentHTML("beforeend", `<span class="mark">${icon("x", 18)}</span>`); }
      else b.classList.add("faded");
    });

    if (!S.exam && !right && it.kind === "bank" && !S.requeued.has(it.id)) {
      S.requeued.add(it.id);
      S.items.push(bankItem(QB.get(it.id)));
    }
    checkBadges();
    save();
    renderChrome();

    const last = S.i >= S.items.length - 1;
    if (S.exam) {
      $("#fb").innerHTML = `<div class="quiz-foot"><span></span><button class="btn btn-ink" data-act="next">${last ? "Finish exam" : "Next"} ${icon("arrow", 18)}</button></div>`;
      return;
    }
    const steps = it.steps ? `<div class="workings">${it.formula ? `<span class="f">${esc(it.formula)}</span><br>` : ""}${it.steps.map(esc).join("<br>")}</div>` : "";
    const trap = it.trap && !right ? `<p class="trap">${icon("alert", 16)}${esc(it.trap)}</p>` : "";
    $("#fb").innerHTML = `<div class="feedback ${right ? "good" : "bad"}">
      <h4>${icon(right ? "check" : "x", 18)}${right ? pickPraise() : `The answer is: ${esc(it.answerText)}`}</h4>
      ${it.explain ? `<p>${esc(it.explain)}</p>` : ""}${steps}${trap}
      ${!right && it.kind === "bank" ? `<p class="dim small-note">This one will come back later in this session and again tomorrow.</p>` : ""}
    </div>
    <div class="quiz-foot"><span class="dim">${right ? "+10 XP" : "+2 XP for trying"}</span>
      <button class="btn btn-ink" data-act="next" id="nextBtn">${last ? "See results" : "Next question"} ${icon("arrow", 18)}</button></div>`;
    $("#nextBtn").focus({ preventScroll: true });
  }
  const pickPraise = () => ["Correct", "Nice one", "That's right", "Spot on", "Yep, correct"][Math.floor(Math.random() * 5)];

  function next() {
    if (!S || S.picked === null) return;
    if (S.i >= S.items.length - 1) return finish();
    S.i++;
    renderQ();
  }

  function finish() {
    if (!S) return;
    const answered = S.answers;
    // In a timed exam anything unanswered counts as wrong
    const total = S.exam ? S.items.length : answered.length;
    const right = answered.filter((a) => a.right).length;
    const pct = total ? Math.round((right / total) * 100) : 0;
    const gained = P.xp - S.xp0;
    const misses = answered.filter((a) => !a.right);
    if (S.exam) {
      const pass = pct >= 60;
      P.exams.push({ at: Date.now(), pct, right, total, mins: Math.round((Date.now() - S.start) / 60000) });
      if (pass) P.xp += 50;
      checkBadges(); save(); renderChrome();
    }
    const pass = pct >= 60;
    const secs = Math.round((Date.now() - S.start) / 1000);
    const exam = S.exam;
    const mode = S.mode;
    S = null;
    view(`<div class="quiz"><div class="qcard result">
      <div class="result-ic ${exam && !pass ? "fail" : ""}">${icon(exam ? (pass ? "trophy" : "alert") : "star", 34)}</div>
      <h1>${exam ? (pass ? "Pass" : "Not yet") : "Session done"}</h1>
      <p class="muted">${exam ? (pass ? "That's a pass mark. Keep the reviews going so it holds." : "60% is the pass mark. Your mistakes are saved, so work through them and try again.") : "Your review schedule has been updated."}</p>
      <p class="big">${pct}%</p><p class="muted">${right} of ${total} correct</p>
      <div class="result-row">
        <div class="metric"><p class="lbl">${icon("star", 16)}XP earned</p><b>+${gained + (exam && pass ? 50 : 0)}</b></div>
        <div class="metric"><p class="lbl">${icon("clock", 16)}Time</p><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</b></div>
        <div class="metric"><p class="lbl">${icon("flame", 16)}Streak</p><b>${streakNow()}</b></div>
      </div>
      <div class="result-ctas">
        <a class="btn btn-primary" href="#/practice?mode=${mode === "exam" ? "mistakes" : mode === "review" ? "mixed" : mode}">${mode === "exam" ? "Fix mistakes" : "Keep going"}</a>
        <a class="btn btn-ghost" href="#/">Back to dashboard</a>
      </div>
      ${misses.length ? `<div class="miss-list"><h3>Review these</h3>${misses.map((m) => `<div class="miss"><p>${esc(m.it.q)}</p>
        <div class="ans">${icon("check", 16)}${esc(m.it.answerText)}</div>${m.it.explain ? `<p class="dim small-note">${esc(m.it.explain)}</p>` : ""}</div>`).join("")}</div>` : ""}
    </div></div>`);
  }

  // ------------------------------------------------------------------ exam intro, mistakes, progress
  function examPage() {
    const last = P.exams.slice(-5).reverse();
    view(`<div class="page"><div class="wrap narrow">
      <div class="page-head"><div><h1>Mock exam</h1><p class="muted">Like the real capstone: four options per question, closed book, no feedback until the end.</p></div></div>
      <div class="card exam-card">
        <div class="metrics three">
          <div class="metric"><p class="lbl">${icon("layers", 16)}Questions</p><b>40</b><small>all 8 units + maths</small></div>
          <div class="metric"><p class="lbl">${icon("clock", 16)}Time</p><b>50 min</b><small>timer runs out = submit</small></div>
          <div class="metric"><p class="lbl">${icon("target", 16)}Pass mark</p><b>60%</b><small>24 of 40</small></div>
        </div>
        <p class="muted exam-note">Have a calculator ready. Answers can't be changed once picked, so think first.</p>
        <a class="btn btn-ink btn-lg btn-block" href="#/practice?mode=exam">Start mock exam ${icon("arrow", 18)}</a>
      </div>
      ${last.length ? `<div class="card"><div class="card-head"><h3>Recent attempts</h3></div><div class="list">${last.map((e) => `<div class="row"><div class="grow"><p>${new Date(e.at).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}</p><small>${e.right} of ${e.total} · ${e.mins} min</small></div>
        <span class="tag ${e.pct >= 60 ? "blue" : ""}">${e.pct}% ${e.pct >= 60 ? "pass" : ""}</span></div>`).join("")}</div></div>` : ""}
    </div></div>`);
  }

  function mistakesPage() {
    const list = mistakes();
    view(`<div class="page"><div class="wrap narrow">
      <div class="page-head"><div><h1>Mistakes</h1><p class="muted">Questions you got wrong last time. Get each one right to clear it.</p></div>
        ${list.length ? `<a class="btn btn-primary btn-lg" href="#/practice?mode=mistakes">Fix ${Math.min(15, list.length)} now</a>` : ""}</div>
      <div class="card">${list.length ? `<div class="list">${list.map((q) => {
        const u = QB.unit(q.unit);
        return `<div class="row"><span class="unit-ic sm ${u.tone}">${icon(u.icon, 18)}</span><div class="grow"><p>${esc(q.q)}</p><small>${esc(u.code)} · ${esc(q.topic)}</small></div></div>`;
      }).join("")}</div>` : `<div class="empty">${icon("check", 40)}<h3>All clear</h3><p>Anything you get wrong will show up here.</p></div>`}</div>
    </div></div>`);
  }

  async function progressPage() {
    const days = [];
    for (let i = 27; i >= 0; i--) { const d = new Date(Date.now() - i * DAY); days.push([today(d), P.days[today(d)] || 0]); }
    view(`<div class="page"><div class="wrap">
      <div class="page-head"><div><h1>Progress</h1><p class="muted">Level ${level(P.xp)} · ${P.xp.toLocaleString()} XP · ${mastered()} questions mastered</p></div></div>
      <div class="two">
        <div class="card"><div class="card-head"><h3>${icon("chart", 18)}Last 4 weeks</h3><span class="muted">goal ${P.goal}/day</span></div>
          <div class="heat">${days.map(([d, n]) => `<span class="cell l${n === 0 ? 0 : n < P.goal / 2 ? 1 : n < P.goal ? 2 : 3}" title="${d}: ${n}"></span>`).join("")}</div>
          <div class="heat-key"><span>Less</span><span class="cell l0"></span><span class="cell l1"></span><span class="cell l2"></span><span class="cell l3"></span><span>Goal hit</span></div>
        </div>
        <div class="card"><div class="card-head"><h3>${icon("layers", 18)}Mastery by unit</h3></div>
          <div class="list">${QB.UNITS.map((u) => { const m = Math.round(mastery(u.id) * 100); return `<div class="row ${u.tone}"><span class="unit-ic sm">${icon(u.icon, 16)}</span><div class="grow"><p>${esc(u.name)}</p><div class="bar thin"><i data-w="${m}"></i></div></div><span class="mono">${m}%</span></div>`; }).join("")}</div>
        </div>
      </div>
      <div class="section-title gap"><h2>Badges</h2><span class="muted">${Object.keys(P.badges).length} of ${BADGES.length}</span></div>
      <div class="badges">${BADGES.map((b) => `<div class="badge ${P.badges[b.id] ? "got" : ""}"><span class="bi">${icon(b.icon, 22)}</span><div><h4>${esc(b.name)}</h4><p>${esc(b.desc)}</p></div></div>`).join("")}</div>
      ${STATIC ? "" : `<div class="section-title gap"><h2>Class leaderboard</h2></div>
      <div class="card" id="board"><p class="muted">Loading…</p></div>`}
    </div></div>`);
    if (STATIC) return;
    try {
      const r = await api("GET", "api/leaderboard");
      const rows = r.data.board || [];
      const me = user?.username;
      $("#board").innerHTML = (rows.length ? `<table class="board"><thead><tr><th>#</th><th>Username</th><th>XP</th><th>Streak</th></tr></thead><tbody>${rows.map((x, i) =>
        `<tr class="${x.username === me ? "me" : ""}"><td>${i + 1}</td><td>${esc(x.username)}</td><td class="n">${x.xp.toLocaleString()}</td><td class="n">${x.streak}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">No one's on the board yet.</p>`) +
        (user ? `<label class="toggle board-toggle"><input type="checkbox" id="lb" ${P.settings.leaderboard ? "checked" : ""}><span class="sw"></span>Show me on the leaderboard</label>`
              : `<p class="dim board-toggle"><a href="#/signup">Make an account</a> to join the board.</p>`);
      const lb = $("#lb");
      if (lb) lb.addEventListener("change", async () => { P.settings.leaderboard = lb.checked; save(); await pushProgress(); progressPage(); });
    } catch { $("#board").innerHTML = `<p class="muted">Couldn't load the leaderboard.</p>`; }
  }

  // ------------------------------------------------------------------ account & auth
  function accountPage() {
    if (!user) return go("#/login");
    view(`<div class="page"><div class="wrap narrow">
      <div class="page-head"><div><h1>Account</h1><p class="muted">Signed in as <b>${esc(user.username)}</b></p></div></div>
      <div class="card">
        <div class="card-head"><h3>Settings</h3></div>
        <div class="list">
          <div class="row"><div class="grow"><p>Daily goal</p><small>Questions per day for your streak</small></div>
            <div class="chips">${[5, 10, 20, 30].map((n) => `<button class="chip ${P.goal === n ? "on" : ""}" data-act="goal" data-n="${n}">${n}</button>`).join("")}</div></div>
          <div class="row"><div class="grow"><p>Answer first</p><small>Hide the options until you've thought of the answer</small></div>
            <label class="toggle"><input type="checkbox" id="setAf" ${P.settings.answerFirst ? "checked" : ""}><span class="sw"></span></label></div>
          <div class="row"><div class="grow"><p>Class leaderboard</p><small>Show your username, XP and streak to others</small></div>
            <label class="toggle"><input type="checkbox" id="setLb" ${P.settings.leaderboard ? "checked" : ""}><span class="sw"></span></label></div>
        </div>
      </div>
      <div class="card"><div class="row"><div class="grow"><p>Sign out</p><small>Your progress is saved to your account</small></div>
        <button class="btn btn-ghost" data-act="logout">${icon("logout", 18)}Sign out</button></div></div>
    </div></div>`);
    $("#setAf").addEventListener("change", (e) => { P.settings.answerFirst = e.target.checked; save(); toast("Saved"); });
    $("#setLb").addEventListener("change", (e) => { P.settings.leaderboard = e.target.checked; save(); toast("Saved"); });
  }

  function authPage(mode) {
    if (user) return go("#/");
    const isUp = mode === "signup";
    view(`<div class="auth"><div class="card">
      <div class="auth-logo">${logoMark(44)}</div>
      <h1>${isUp ? "Create your account" : "Welcome back"}</h1>
      <p class="sub">${isUp ? "Save your progress across devices." : "Log in to pick up where you left off."}</p>
      <div class="tabs" role="tablist"><button class="${isUp ? "on" : ""}" data-act="tab" data-to="signup" role="tab" aria-selected="${isUp}">Sign up</button><button class="${!isUp ? "on" : ""}" data-act="tab" data-to="login" role="tab" aria-selected="${!isUp}">Log in</button></div>
      <form id="authForm" novalidate>
        <div id="authErr"></div>
        <div class="field"><label for="un">Username</label><input id="un" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" required>
          ${isUp ? `<small>3–20 characters: letters, numbers, dots or underscores</small>` : ""}</div>
        <div class="field"><label for="pw">Password</label><div class="pw"><input id="pw" name="password" type="password" autocomplete="${isUp ? "new-password" : "current-password"}" required minlength="6">
          <button type="button" data-act="showpw" aria-label="Show password">${icon("eye", 18)}</button></div>
          ${isUp ? `<small>At least 6 characters. There's no reset, so make it one you'll remember.</small>` : ""}</div>
        <button class="btn btn-primary btn-lg btn-block" type="submit">${isUp ? "Create account" : "Log in"}</button>
      </form>
      ${isUp && P.answered ? `<p class="fine">Your ${P.answered} answers on this device will be saved to your new account.</p>` : ""}
      <p class="fine">${isUp ? "No email, no spam. Just practice." : "Forgot your password? Make a new account, since there's no email to reset it."}</p>
    </div></div>`);
    $("#un").focus();
    $("#authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("[type=submit]");
      const username = $("#un").value.trim(), password = $("#pw").value;
      const err = (m) => ($("#authErr").innerHTML = `<div class="form-error">${esc(m)}</div>`);
      if (!username || !password) return err("Enter a username and password.");
      btn.disabled = true;
      try {
        const r = await api("POST", isUp ? "api/signup" : "api/login", isUp ? { username, password, progress: P } : { username, password });
        if (!r.ok) { btn.disabled = false; return err(r.data.message || "Something went wrong. Try again."); }
        user = r.data.user;
        if (!isUp) { P = merge(P, r.data.progress); save(); await pushProgress(); }
        toast(isUp ? "Account created" : `Welcome back, ${user.username}`, "check");
        go("#/");
      } catch { btn.disabled = false; err("Couldn't reach the server. Check your connection."); }
    });
  }

  async function logout() {
    await pushProgress();
    await api("POST", "api/logout", {});
    user = null;
    try { localStorage.removeItem(LS); } catch {}
    P = fresh();
    toast("Signed out", "logout");
    go("#/");
  }

  // ------------------------------------------------------------------ events
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const a = el.dataset.act;
    if (a === "pick") pick(+el.dataset.i);
    else if (a === "next") next();
    else if (a === "reveal") reveal();
    else if (a === "logout") logout();
    else if (a === "tab") go("#/" + el.dataset.to);
    else if (a === "goal") { P.goal = +el.dataset.n; save(); accountPage(); toast("Daily goal updated"); }
    else if (a === "showpw") { const i = $("#pw"); const show = i.type === "password"; i.type = show ? "text" : "password"; el.innerHTML = icon(show ? "eyeoff" : "eye", 18); }
  });
  document.addEventListener("keydown", (e) => {
    if (!S || e.target.matches("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-4]$/.test(e.key)) { e.preventDefault(); if (!S.revealed) return; pick(+e.key - 1); }
    else if (/^[a-dA-D]$/.test(e.key) && S.revealed) { e.preventDefault(); pick("abcd".indexOf(e.key.toLowerCase())); }
    else if (e.key === " " && !S.revealed) { e.preventDefault(); reveal(); }
    else if (e.key === "Enter" && S.picked !== null) { e.preventDefault(); next(); }
  });

  // ------------------------------------------------------------------ router
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    $("#nav").classList.remove("open");
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const params = new URLSearchParams(qs || "");
    if (!path.startsWith("/practice")) S = null;
    renderChrome();
    const seg = path.split("/").filter(Boolean);
    if (!seg.length) return user || P.answered ? dashboard() : landing();
    switch (seg[0]) {
      case "units": return unitsPage();
      case "unit": return unitPage(seg[1]);
      case "maths": return mathsPage();
      case "practice": return practice(params);
      case "exam": return examPage();
      case "mistakes": return mistakesPage();
      case "progress": return progressPage();
      case "account": return STATIC ? go("#/") : accountPage();
      case "login": return STATIC ? go("#/") : authPage("login");
      case "signup": return STATIC ? go("#/") : authPage("signup");
      case "welcome": return landing();
      default: return go("#/");
    }
  }
  window.addEventListener("hashchange", route);

  (async function boot() {
    renderChrome();
    try {
      const r = await api("GET", "api/me");
      if (r.status === 404 || !("user" in r.data)) STATIC = true;
      else if (r.data.user) { user = r.data.user; P = merge(P, r.data.progress); save(); }
    } catch { STATIC = true; }
    route();
  })();
})();
