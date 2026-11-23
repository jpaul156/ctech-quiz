(function () {
  const cfg = window.QUIZ_CONFIG || {};
  const Store = window.QuizStore;
  const app = document.getElementById("app");
  let QUIZZES = [];

  const PRAISE = ["Nice!", "Nailed it!", "Spot on!", "Great job!", "You got it!", "Excellent!", "Pro move!", "Textbook!"];
  const RETRY_PRAISE = ["There it is!", "Got there!", "Now you know!", "That's the one!"];
  const WRONG = ["Not quite", "Close, but no", "Not this one"];
  const STREAK_MILESTONES = { 3: "3 in a row!", 5: "5 streak! On fire", 10: "10 streak! Unstoppable", 15: "15 streak! Legend" };

  let state = {};
  let soundOn = Store.read("ctq.sound", true);

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const isMulti = (q) => q.choices.filter((c) => c.correct).length > 1;
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Catch authoring mistakes early; they show up in the browser console (F12).
  function validate() {
    const quizIds = new Set();
    QUIZZES.forEach((quiz) => {
      if (quizIds.has(quiz.id)) console.warn("Duplicate quiz id: " + quiz.id);
      quizIds.add(quiz.id);
      const seen = new Set();
      (quiz.questions || []).forEach((q, i) => {
        const label = quiz.id + " / " + (q.id || "question #" + (i + 1));
        if (!q.id) console.warn(label + ": missing id");
        if (seen.has(q.id)) console.warn(label + ": duplicate id");
        seen.add(q.id);
        if (!(q.choices || []).some((c) => c.correct)) console.warn(label + ": no correct choice");
        (q.choices || []).forEach((c) => {
          if (!c.correct && !c.explanation) console.warn(label + ': wrong choice "' + c.text + '" has no explanation');
        });
      });
    });
  }

  // ---------- sound ----------
  let audioCtx;
  function tone(notes, type) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      let t = audioCtx.currentTime;
      notes.forEach(([freq, dur]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur * 0.7;
      });
    } catch (e) { /* audio unavailable */ }
  }
  const sfx = {
    right: () => tone([[660, 0.12], [880, 0.22]], "sine"),
    wrong: () => tone([[220, 0.18], [180, 0.25]], "triangle"),
    finish: () => tone([[523, 0.14], [659, 0.14], [784, 0.14], [1047, 0.35]], "sine"),
  };

  // ---------- confetti ----------
  function confetti(amount) {
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const colors = ["#7db942", "#c9dfae", "#f2b01e", "#ff8a1f", "#6aaee6", "#a7a9ac"];
    const parts = Array.from({ length: amount }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 6,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: pick(colors),
    }));
    const start = performance.now();
    (function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 1800);
      parts.forEach((p) => {
        p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 1800) requestAnimationFrame(frame); else canvas.remove();
    })(start);
  }

  function toast(text) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = "🔥 " + text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }

  function lightbox(src) {
    const el = document.createElement("div");
    el.className = "lightbox";
    el.innerHTML = '<img src="' + esc(src) + '" alt="">';
    el.onclick = () => el.remove();
    document.body.appendChild(el);
  }

  // ---------- sign-in ----------
  function page(inner) {
    app.innerHTML =
      '<section class="start narrow"><img class="logo" src="ControlTech_Logo_LIGHT-200.png" alt="ControlTech">' +
      "<h1>" + esc(cfg.appTitle || "Field Academy") + "</h1>" + inner + "</section>";
  }

  function renderLogin(message) {
    page(
      '<p class="tag">Sign in with your work email. We\'ll send you a link, no password needed.</p>' +
      '<div class="panel"><input id="email" class="field" type="email" placeholder="you@company.com" autocomplete="email" value="' + esc(Store.pendingEmail()) + '">' +
      '<button class="btn wide" id="send">Email me a sign-in link</button>' +
      '<div class="err" id="err">' + esc(message || "") + "</div></div>"
    );
    const email = document.getElementById("email");
    const send = document.getElementById("send");
    const go = async () => {
      const value = email.value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(value)) { document.getElementById("err").textContent = "Enter a valid email address."; return; }
      send.disabled = true;
      send.textContent = "Sending…";
      try {
        await Store.sendLink(value);
        renderCheckEmail(value);
      } catch (e) {
        document.getElementById("err").textContent = e.message;
        send.disabled = false;
        send.textContent = "Email me a sign-in link";
      }
    };
    send.onclick = go;
    email.onkeydown = (e) => { if (e.key === "Enter") go(); };
    email.focus();
  }

  function renderCheckEmail(email) {
    page(
      '<div class="panel center"><div class="big-icon">✉️</div><h2>Check your inbox</h2>' +
      "<p>We sent a sign-in link to <b>" + esc(email) + "</b>.<br>Open it on this computer to start.</p>" +
      '<p class="muted small">Not there after a minute? Check Junk or Quarantine.</p>' +
      '<button class="btn ghost" id="back">Use a different email</button></div>'
    );
    document.getElementById("back").onclick = () => renderLogin();
  }

  // The link was opened in a different browser than the one that requested it.
  function renderConfirmEmail(message) {
    page(
      '<p class="tag">Confirm your email to finish signing in.</p>' +
      '<div class="panel"><input id="email" class="field" type="email" placeholder="you@company.com">' +
      '<button class="btn wide" id="go">Finish signing in</button><div class="err">' + esc(message || "") + "</div></div>"
    );
    const email = document.getElementById("email");
    const go = async () => {
      try {
        await Store.completeSignIn(email.value.trim().toLowerCase());
        route();
      } catch (e) {
        renderConfirmEmail("That didn't work. Check the address, or send yourself a new link.");
      }
    };
    document.getElementById("go").onclick = go;
    email.onkeydown = (e) => { if (e.key === "Enter") go(); };
    email.focus();
  }

  function guessName(email) {
    return (email || "").split("@")[0].split(/[._-]+/).filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }

  function renderName() {
    const u = Store.user();
    page(
      '<p class="tag">' + (Store.isLocal ? "Demo mode: results are saved in this browser only." : "One last thing: how should your name appear?") + "</p>" +
      '<div class="panel"><input id="name" class="field" placeholder="First and last name" value="' + esc(u ? guessName(u.email) : "") + '">' +
      '<button class="btn wide" id="go">Continue</button></div>'
    );
    const name = document.getElementById("name");
    const go = () => { if (name.value.trim()) { Store.setName(name.value.trim()); route(); } };
    document.getElementById("go").onclick = go;
    name.onkeydown = (e) => { if (e.key === "Enter") go(); };
    name.select();
  }

  function route() {
    const u = Store.user();
    if (!u) return Store.isLocal ? renderName() : renderLogin();
    if (!u.name) return renderName();
    renderHome();
  }

  // ---------- home ----------
  function renderHome() {
    const u = Store.user();
    const best = Store.read("ctq.best", {});
    const active = QUIZZES.filter((q) => !q.archived);
    const past = QUIZZES.filter((q) => q.archived);
    const featured = QUIZZES.find((q) => q.id === cfg.recommendedQuiz) || active[0] || QUIZZES[0];
    const others = active.filter((q) => q !== featured);

    const meta = (quiz) => {
      const score = best[quiz.id];
      return quiz.questions.length + " questions · " +
        (score === undefined ? "Not taken yet" : '<span class="done">✓ Best ' + score + "%</span>");
    };
    const card = (quiz) =>
      '<button class="quizcard" data-quiz="' + esc(quiz.id) + '"><h3>' + esc(quiz.title) + "</h3>" +
      "<p>" + esc(quiz.description || "") + '</p><div class="meta">' + meta(quiz) + "</div></button>";

    app.innerHTML =
      '<section class="start home">' +
      '<div class="userbar">' + esc(u.name) + (u.email ? ' <span class="muted">(' + esc(u.email) + ")</span>" : "") +
      ' · <a href="#" id="signout">' + (Store.isLocal ? "Change name" : "Sign out") + "</a></div>" +
      '<img class="logo" src="ControlTech_Logo_LIGHT-200.png" alt="ControlTech">' +
      "<h1>" + esc(cfg.appTitle || "Field Academy") + "</h1>" +
      '<p class="tag">The stuff that isn\'t in the manual. Learn how we do it, and why.</p>' +
      (featured
        ? '<div class="label">Recommended for you</div>' +
          '<div class="quizcard featured"><div><h3>' + esc(featured.title) + "</h3><p>" + esc(featured.description || "") +
          '</p><div class="meta">' + meta(featured) + "</div></div>" +
          '<button class="btn big" data-quiz="' + esc(featured.id) + '">Start</button></div>'
        : '<div class="panel">No quizzes found. Check the list in config.js.</div>') +
      (others.length ? '<div class="label">Explore more</div><div class="quizgrid">' + others.map(card).join("") + "</div>" : "") +
      (past.length
        ? '<details class="past"><summary>Past quizzes (' + past.length + ')</summary><div class="quizgrid">' + past.map(card).join("") + "</div></details>"
        : "") +
      '<div class="lifetime">Lifetime XP: <b>' + Store.read("ctq.lifetimeXp", 0) + "</b></div>" +
      (Store.isLocal ? '<div class="mode-note">Demo mode: results are saved in this browser only.</div>' : "") +
      "</section>";

    app.querySelectorAll("[data-quiz]").forEach((b) =>
      b.addEventListener("click", () => {
        const quiz = QUIZZES.find((q) => q.id === b.dataset.quiz);
        let pool = quiz.shuffle === false ? quiz.questions.slice() : shuffle(quiz.questions);
        const perRound = quiz.questionsPerRound ?? cfg.questionsPerRound;
        if (perRound > 0) pool = pool.slice(0, perRound);
        startRound(quiz, pool, false);
      })
    );
    document.getElementById("signout").onclick = async (e) => {
      e.preventDefault();
      if (Store.isLocal) Store.setName("");
      else await Store.signOut();
      route();
    };
  }

  // ---------- quiz ----------
  function startRound(quiz, questions, practice) {
    state = {
      quiz,
      queue: questions,
      idx: 0,
      xp: 0,
      streak: 0,
      best: 0,
      firstTry: 0,
      missed: [],
      practice,
      sessionId: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.queue[state.idx];
    const multi = isMulti(q);
    const withImages = q.choices.some((c) => c.image);
    state.choices = shuffle(q.choices);
    state.wrongPicks = [];
    state.misses = 0;
    state.out = new Set();
    state.selected = new Set();
    state.done = false;

    const pct = (state.idx / state.queue.length) * 100;
    app.innerHTML =
      '<section class="quiz">' +
      '<div class="topbar">' +
      '<button class="icon-btn" id="quit" title="Quit round">✕</button>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      '<div class="stat streak' + (state.streak ? "" : " cold") + '" id="streak" title="Streak">🔥 ' + state.streak + "</div>" +
      '<div class="stat xp" id="xp" title="XP this round">⚡ ' + state.xp + "</div>" +
      '<button class="icon-btn" id="mute" title="Sound on/off">' + (soundOn ? "🔊" : "🔇") + "</button>" +
      "</div>" +
      '<span class="qcat">' + esc(state.quiz.title) + (q.category ? " · " + esc(q.category) : "") + "</span>" +
      (state.practice ? '<span class="qcat retry-tag">Review</span>' : "") +
      (multi ? '<span class="qcat multi-tag">Select all that apply</span>' : "") +
      '<div class="qtext">' + esc(q.question) + "</div>" +
      (q.image ? '<img class="qimg" src="' + esc(q.image) + '" alt="Screenshot for this question" title="Click to enlarge">' : "") +
      '<div class="choices' + (withImages ? " grid" : "") + (multi ? " multi" : "") + '">' +
      state.choices.map((c, i) =>
        '<button class="choice" data-i="' + i + '"><span class="key">' + (i + 1) + "</span>" +
        (c.image ? '<span class="cimg"><img src="' + esc(c.image) + '" alt=""><span class="zoom" data-src="' + esc(c.image) + '" title="Enlarge">⤢</span></span>' : "") +
        '<span class="ctext">' + esc(c.text) + "</span></button>"
      ).join("") +
      "</div></section>" +
      '<div class="footer" id="footer"></div>';

    app.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => select(+b.dataset.i)));
    app.querySelectorAll(".zoom").forEach((z) =>
      z.addEventListener("click", (e) => { e.stopPropagation(); lightbox(z.dataset.src); })
    );
    const img = app.querySelector(".qimg");
    if (img) img.addEventListener("click", () => lightbox(q.image));
    document.getElementById("quit").onclick = () => {
      if (confirm("Quit this round? Answers so far are already saved.")) renderHome();
    };
    document.getElementById("mute").onclick = (e) => {
      soundOn = !soundOn;
      Store.write("ctq.sound", soundOn);
      e.currentTarget.textContent = soundOn ? "🔊" : "🔇";
    };
    footerCheck();
  }

  function footerCheck() {
    const q = state.queue[state.idx];
    const f = document.getElementById("footer");
    f.className = "footer";
    f.innerHTML =
      '<div class="inner"><div class="msg hint">' +
      (isMulti(q) ? "Pick every correct answer, then Check" : "Press 1–" + state.choices.length + " to choose, Enter to check") +
      '</div><button class="btn" id="primary">Check</button></div>';
    const btn = document.getElementById("primary");
    btn.disabled = state.selected.size === 0;
    btn.onclick = check;
  }

  function select(i) {
    const btn = app.querySelector('.choice[data-i="' + i + '"]');
    if (state.done || !btn || state.out.has(i)) return;
    // After a wrong answer, picking again dismisses the red sheet.
    if (document.getElementById("footer").classList.contains("bad")) footerCheck();
    if (isMulti(state.queue[state.idx])) {
      if (state.selected.has(i)) state.selected.delete(i); else state.selected.add(i);
    } else {
      state.selected = new Set([i]);
    }
    app.querySelectorAll(".choice").forEach((b) => b.classList.toggle("sel", state.selected.has(+b.dataset.i)));
    document.getElementById("primary").disabled = state.selected.size === 0;
  }

  function bump(id, text) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function check() {
    if (!state.selected.size || state.done) return;
    const q = state.queue[state.idx];
    const multi = isMulti(q);
    const wrongSel = [...state.selected].filter((i) => !state.choices[i].correct);
    const missing = state.choices.some((c, i) => c.correct && !state.selected.has(i));
    const buttonFor = (i) => app.querySelector('.choice[data-i="' + i + '"]');
    const f = document.getElementById("footer");

    if (!wrongSel.length && !missing) {
      state.done = true;
      const first = state.misses === 0;
      state.selected.forEach((i) => { buttonFor(i).classList.remove("sel"); buttonFor(i).classList.add("right"); });
      app.querySelectorAll(".choice").forEach((b) => (b.disabled = true));

      let gained;
      if (first) {
        state.streak++;
        state.firstTry++;
        state.best = Math.max(state.best, state.streak);
        gained = 10 + Math.min(state.streak - 1, 5); // streak bonus up to +5
      } else {
        gained = state.misses === 1 ? 5 : 2;
        state.missed.push(q);
      }
      state.xp += gained;
      bump("xp", "⚡ " + state.xp);
      bump("streak", "🔥 " + state.streak);
      document.getElementById("streak").classList.toggle("cold", !state.streak);
      app.querySelector(".progress > div").style.width = ((state.idx + 1) / state.queue.length) * 100 + "%";

      sfx.right();
      if (first) confetti(70);
      if (first && STREAK_MILESTONES[state.streak]) toast(STREAK_MILESTONES[state.streak]);

      f.className = "footer good";
      f.innerHTML =
        '<div class="inner"><div class="badge">✓</div><div class="msg">' +
        "<h3>" + (first ? pick(PRAISE) : pick(RETRY_PRAISE)) + ' <span class="hint">+' + gained + " XP</span></h3>" +
        (q.why ? '<p><span class="why-label">Why: </span>' + esc(q.why) + "</p>" : "") +
        '</div><button class="btn" id="primary">Continue</button></div>';
      document.getElementById("primary").onclick = next;
      document.getElementById("primary").focus();

      if (!state.practice) {
        Store.record({
          ts: new Date().toISOString(),
          sessionId: state.sessionId,
          quizId: state.quiz.id,
          quizTitle: state.quiz.title,
          questionId: q.id,
          category: q.category || "",
          question: q.question,
          attempts: state.misses + 1,
          firstTry: first,
          wrongPicks: state.wrongPicks.join(" || "),
        });
      }
      return;
    }

    // Wrong: cross out the wrong picks, explain each one, keep any right picks selected.
    state.misses++;
    state.streak = 0;
    bump("streak", "🔥 0");
    document.getElementById("streak").classList.add("cold");
    wrongSel.forEach((i) => {
      const btn = buttonFor(i);
      state.wrongPicks.push(state.choices[i].text);
      state.out.add(i);
      state.selected.delete(i);
      btn.classList.remove("sel");
      btn.classList.add("wrong");
      setTimeout(() => { btn.classList.remove("wrong"); btn.classList.add("out"); btn.disabled = true; }, 450);
    });
    if (!wrongSel.length) state.wrongPicks.push("(missed a correct answer)");
    sfx.wrong();

    let body = wrongSel
      .map((i) => "<p>" + (wrongSel.length > 1 ? "<b>" + esc(state.choices[i].text) + ":</b> " : "") +
        esc(state.choices[i].explanation || "That's not how we do it.") + "</p>")
      .join("");
    if (multi && missing) {
      body += "<p><b>" + (wrongSel.length ? "Also, there's" : "Good picks, but there's") + " at least one more correct answer.</b></p>";
    }

    f.className = "footer bad";
    f.innerHTML =
      '<div class="inner"><div class="badge">✕</div><div class="msg">' +
      "<h3>" + pick(WRONG) + "</h3>" + body +
      '</div><button class="btn red" id="primary">Try again</button></div>';
    document.getElementById("primary").onclick = footerCheck;
  }

  function next() {
    state.idx++;
    if (state.idx >= state.queue.length) renderSummary();
    else renderQuestion();
  }

  // ---------- summary ----------
  function renderSummary() {
    const total = state.queue.length;
    const acc = Math.round((state.firstTry / total) * 100);
    Store.write("ctq.lifetimeXp", Store.read("ctq.lifetimeXp", 0) + state.xp);
    if (!state.practice) {
      const best = Store.read("ctq.best", {});
      best[state.quiz.id] = Math.max(best[state.quiz.id] ?? 0, acc);
      Store.write("ctq.best", best);
    }

    const title =
      acc === 100 ? "Flawless!" : acc >= 80 ? "Great work!" : acc >= 50 ? "Solid effort!" : "Every miss is a lesson!";
    const sub = state.practice
      ? "Review complete. Those should stick now."
      : acc === 100 ? "Every question right on the first try." : "You finished " + esc(state.quiz.title) + ".";

    app.innerHTML =
      '<section class="summary">' +
      '<img class="bulb" src="ControlTech_Logo_BULB.png" alt="">' +
      "<h1>" + title + "</h1>" +
      '<p class="sub">' + sub + "</p>" +
      '<div class="tiles">' +
      '<div class="tile gold"><div class="lbl">XP earned</div><div class="val">⚡ ' + state.xp + "</div></div>" +
      '<div class="tile green"><div class="lbl">First try</div><div class="val">' + acc + "%</div></div>" +
      '<div class="tile orange"><div class="lbl">Best streak</div><div class="val">🔥 ' + state.best + "</div></div>" +
      "</div>" +
      (state.missed.length
        ? '<div class="panel missed"><h2>Worth another look</h2><ul>' +
          state.missed.map((q) => "<li>" + esc(q.question) + "</li>").join("") + "</ul></div>"
        : "") +
      '<div class="actions">' +
      (state.missed.length ? '<button class="btn" id="review">Review missed</button>' : "") +
      '<button class="btn ghost" id="again">Back to quizzes</button>' +
      "</div></section>";

    sfx.finish();
    confetti(acc >= 80 ? 220 : 90);
    const review = document.getElementById("review");
    if (review) review.onclick = () => startRound(state.quiz, shuffle(state.missed), true);
    document.getElementById("again").onclick = renderHome;
  }

  // ---------- keyboard ----------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelector(".lightbox")?.remove();
    if (!document.querySelector(".quiz")) return;
    if (/^[1-9]$/.test(e.key)) select(+e.key - 1);
    if (e.key === "Enter") {
      const btn = document.getElementById("primary");
      if (btn && !btn.disabled && document.activeElement !== btn) { e.preventDefault(); btn.click(); }
    }
  });

  // ---------- boot ----------
  (async function boot() {
    app.innerHTML = '<div class="loading">Loading…</div>';
    try {
      await Store.init();
    } catch (e) {
      app.innerHTML = '<div class="loading">Couldn\'t start: ' + esc(e.message) + "</div>";
      return;
    }
    QUIZZES = window.QUIZZES;
    validate();

    if (Store.isSignInLink()) {
      const email = Store.pendingEmail();
      if (!email) return renderConfirmEmail();
      try {
        await Store.completeSignIn(email);
      } catch (e) {
        return renderLogin("That link expired or was already used. Send yourself a new one.");
      }
    }
    route();
  })();
})();
