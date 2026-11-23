(function () {
  const Store = window.QuizStore;
  const app = document.getElementById("app");
  const bank = {}; // "quizId/questionId" -> question
  const quizTitles = {};

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const fmtDate = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const healthColor = (p) => (p >= 80 ? "var(--green)" : p >= 60 ? "var(--gold)" : "var(--red)");
  const qKey = (r) => r.quizId + "/" + r.questionId;
  const personKey = (r) => r.email || r.name.trim();

  let rows = [];
  let range = Store.read("ctq.dashRange", "all");
  let quizFilter = Store.read("ctq.dashQuiz", "all");
  let selectedPerson = null;

  function meter(p) {
    return '<span class="meter">' + p + '%<span class="bar"><i style="width:' + p + "%;background:" + healthColor(p) + '"></i></span></span>';
  }

  function message(html) {
    app.innerHTML = '<div class="gate panel"><img src="ControlTech_Logo_BULB.png" alt="" style="width:60px"><h2>Training dashboard</h2>' + html + "</div>";
  }

  // ---------- loading ----------
  async function load() {
    app.innerHTML = '<div class="empty">Loading results…</div>';
    try {
      const raw = await Store.fetchAll();
      rows = raw.map((r) => ({
        ...r,
        name: String(r.name || r.email || "Unknown"),
        date: new Date(r.ts),
        firstTry: r.firstTry === true || r.firstTry === "true",
        attempts: +r.attempts || 1,
        wrongPicks: String(r.wrongPicks || "").split(" || ").filter(Boolean),
      }));
      render();
    } catch (e) {
      if (e.message === "signed-out") {
        message('<p>Sign in on the quiz page first, then come back here.</p><a class="btn" href="index.html">Go to sign-in</a>');
      } else if (e.message === "not-admin") {
        const u = Store.user();
        message("<p><b>" + esc(u && u.email) + "</b> isn't a dashboard admin.</p><p class=muted>Add this email to the admin list in firestore.rules and publish the rules.</p>");
      } else {
        message('<p class="err">' + esc(e.message) + "</p>");
      }
    }
  }

  // ---------- aggregation ----------
  function filtered() {
    let list = rows;
    if (quizFilter !== "all") list = list.filter((r) => r.quizId === quizFilter);
    if (range !== "all") {
      const cutoff = Date.now() - +range * 86400000;
      list = list.filter((r) => r.date.getTime() >= cutoff);
    }
    return list;
  }

  function byKey(list, keyFn) {
    const m = new Map();
    list.forEach((r) => {
      const k = keyFn(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    });
    return m;
  }

  const questionText = (r) => (bank[qKey(r)] ? bank[qKey(r)].question : r.question);
  const quizLabel = (r) => quizTitles[r.quizId] || r.quizTitle || r.quizId;
  const latestName = (rs) => rs.reduce((a, b) => (b.date > a.date ? b : a)).name;

  // ---------- render ----------
  function render() {
    const data = filtered();
    const people = byKey(data, personKey);
    const firstTry = data.filter((r) => r.firstTry).length;
    const quizIds = [...new Set(Object.keys(quizTitles).concat(rows.map((r) => r.quizId)))];
    const bankSize = Object.keys(bank).filter((k) => quizFilter === "all" || k.startsWith(quizFilter + "/")).length;

    let html =
      '<div class="dhead"><img src="ControlTech_Logo_LIGHT-200.png" alt="ControlTech"><h1>Training dashboard</h1>' +
      '<select id="quiz" class="field"><option value="all">All quizzes</option>' +
      quizIds.map((id) => '<option value="' + esc(id) + '"' + (id === quizFilter ? " selected" : "") + ">" + esc(quizTitles[id] || id) + "</option>").join("") +
      "</select>" +
      '<select id="range" class="field">' +
      [["all", "All time"], ["90", "Last 90 days"], ["30", "Last 30 days"], ["7", "Last 7 days"]]
        .map(([v, l]) => '<option value="' + v + '"' + (v === range ? " selected" : "") + ">" + l + "</option>").join("") +
      "</select>" +
      '<button class="btn ghost" id="csv">Export CSV</button>' +
      '<button class="btn" id="refresh">Refresh</button></div>' +
      (Store.isLocal ? '<p class="mode-note" style="margin-top:-8px">Demo mode: showing results from this browser only. <a href="#" id="clear">Clear demo data</a></p>' : "");

    if (!data.length) {
      app.innerHTML = html + '<div class="panel empty">No results for this selection yet.</div>';
      wire();
      return;
    }

    html +=
      '<div class="kpis">' +
      kpi("Techs active", people.size) +
      kpi("Questions answered", data.length) +
      kpi("First-try accuracy", pct(firstTry, data.length) + "%") +
      kpi("Questions covered", new Set(data.map(qKey)).size + " / " + bankSize) +
      "</div>" +
      '<div class="grid2"><div>' + gapsPanel(data) + peoplePanel(people) + "</div>" +
      "<div>" + quizzesPanel(data) + personDetail(people) + "</div></div>";

    app.innerHTML = html;
    wire();
  }

  function kpi(label, value) {
    return '<div class="kpi"><div class="l">' + label + '</div><div class="v">' + value + "</div></div>";
  }

  // Questions the team misses most: where the SOP isn't landing.
  function gapsPanel(data) {
    const qs = [...byKey(data, qKey)].map(([, list]) => {
      const missed = list.filter((r) => !r.firstTry);
      const wrongCounts = {};
      missed.forEach((r) => r.wrongPicks.forEach((w) => (wrongCounts[w] = (wrongCounts[w] || 0) + 1)));
      const top = Object.entries(wrongCounts).sort((a, b) => b[1] - a[1])[0];
      return {
        text: questionText(list[0]),
        quiz: quizLabel(list[0]),
        n: list.length,
        missRate: pct(missed.length, list.length),
        topWrong: top ? top[0] + " (" + top[1] + "×)" : "",
        who: [...byKey(missed, personKey).values()].map(latestName),
      };
    });
    qs.sort((a, b) => b.missRate - a.missRate || b.n - a.n);
    const shown = qs.filter((q) => q.missRate > 0);

    return (
      '<div class="panel"><h2>Knowledge gaps<small>questions missed on the first try, worst first</small></h2>' +
      (shown.length
        ? "<table><thead><tr><th>Question</th><th class=num>Tries</th><th class=num>Missed</th></tr></thead><tbody>" +
          shown.map((q) =>
            "<tr><td>" + (quizFilter === "all" ? "<span class=pill>" + esc(q.quiz) + "</span> " : "") + esc(q.text) +
            (q.topWrong ? '<div class="wrongs">Most picked wrong: ' + esc(q.topWrong) + "</div>" : "") +
            '<div class="muted" style="font-size:13px">Missed by: ' + esc(q.who.join(", ")) + "</div></td>" +
            "<td class=num>" + q.n + "</td><td class=num>" + meter(q.missRate) + "</td></tr>"
          ).join("") + "</tbody></table>"
        : '<p class="muted">Nobody has missed anything in this selection. 🎉</p>') +
      "</div>"
    );
  }

  function peoplePanel(people) {
    const list = [...people].map(([key, rs]) => {
      const first = rs.filter((r) => r.firstTry).length;
      return { key, name: latestName(rs), n: rs.length, acc: pct(first, rs.length), open: openMisses(rs).length, last: new Date(Math.max(...rs.map((r) => r.date))) };
    });
    list.sort((a, b) => b.open - a.open || a.acc - b.acc);
    return (
      '<div class="panel"><h2>By tech<small>click a name for details</small></h2>' +
      "<table><thead><tr><th>Name</th><th class=num>Answered</th><th class=num>First try</th><th class=num>To review</th><th class=num>Last active</th></tr></thead><tbody>" +
      list.map((p) =>
        '<tr class="click' + (p.key === selectedPerson ? " active" : "") + '" data-person="' + esc(p.key) + '">' +
        "<td><b>" + esc(p.name) + "</b></td><td class=num>" + p.n + "</td><td class=num>" + meter(p.acc) + "</td>" +
        "<td class=num>" + (p.open ? '<span class="pill bad">' + p.open + "</span>" : '<span class="pill">0</span>') + "</td>" +
        "<td class=num>" + fmtDate(p.last) + "</td></tr>"
      ).join("") +
      "</tbody></table></div>"
    );
  }

  // A question is "open" for a person if their most recent attempt wasn't a first-try correct.
  function openMisses(rs) {
    const latest = new Map();
    rs.forEach((r) => {
      const cur = latest.get(qKey(r));
      if (!cur || r.date > cur.date) latest.set(qKey(r), r);
    });
    return [...latest.values()].filter((r) => !r.firstTry);
  }

  function quizzesPanel(data) {
    const quizzes = [...byKey(data, (r) => r.quizId)].map(([, list]) => ({
      title: quizLabel(list[0]),
      people: byKey(list, personKey).size,
      acc: pct(list.filter((r) => r.firstTry).length, list.length),
    }));
    quizzes.sort((a, b) => a.acc - b.acc);
    return (
      '<div class="panel"><h2>By quiz<small>first-try accuracy</small></h2>' +
      quizzes.map((t) =>
        '<div class="topic"><div class="row"><span>' + esc(t.title) + ' <span class="muted">(' + t.people + " techs)</span></span><span>" + t.acc + "%</span></div>" +
        '<div class="track"><i style="width:' + t.acc + "%;background:" + healthColor(t.acc) + '"></i></div></div>'
      ).join("") +
      "</div>"
    );
  }

  function personDetail(people) {
    if (!selectedPerson || !people.has(selectedPerson)) {
      return '<div class="panel muted">Select a tech to see which questions to follow up on.</div>';
    }
    const rs = people.get(selectedPerson);
    const open = openMisses(rs);
    const missedEver = byKey(rs.filter((r) => !r.firstTry), qKey);
    const fixed = [...missedEver.keys()].filter((k) => !open.some((r) => qKey(r) === k));
    const email = rs[0].email;

    return (
      '<div class="panel"><h2>' + esc(latestName(rs)) + (email ? ' <small>' + esc(email) + "</small>" : "") + "</h2>" +
      "<h3 style='font-size:15px;margin:0 0 6px'>Follow up on (" + open.length + ")</h3>" +
      (open.length
        ? "<table><tbody>" + open.map((r) =>
            "<tr><td>" + (quizFilter === "all" ? "<span class=pill>" + esc(quizLabel(r)) + "</span> " : "") + esc(questionText(r)) +
            '<div class="wrongs">Picked: ' + esc(r.wrongPicks.join("; then ")) + "</div>" +
            '<div class="muted" style="font-size:13px">' + fmtDate(r.date) + " · took " + r.attempts + " tries</div></td></tr>"
          ).join("") + "</tbody></table>"
        : '<p class="muted">Nothing outstanding.</p>') +
      (fixed.length
        ? "<h3 style='font-size:15px;margin:18px 0 6px'>Missed before, now getting right (" + fixed.length + ")</h3><ul>" +
          fixed.map((k) => "<li>" + esc(questionText(missedEver.get(k)[0])) + "</li>").join("") + "</ul>"
        : "") +
      "</div>"
    );
  }

  function exportCsv() {
    const cols = ["ts", "name", "email", "quizTitle", "questionId", "question", "attempts", "firstTry", "wrongPicks"];
    const cell = (v) => '"' + String(Array.isArray(v) ? v.join(" || ") : v ?? "").replace(/"/g, '""') + '"';
    const csv = [cols.join(",")].concat(filtered().map((r) => cols.map((c) => cell(r[c])).join(","))).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "quiz-results.csv";
    a.click();
  }

  function wire() {
    document.getElementById("quiz").onchange = (e) => { quizFilter = e.target.value; Store.write("ctq.dashQuiz", quizFilter); render(); };
    document.getElementById("range").onchange = (e) => { range = e.target.value; Store.write("ctq.dashRange", range); render(); };
    document.getElementById("refresh").onclick = load;
    document.getElementById("csv").onclick = exportCsv;
    const clear = document.getElementById("clear");
    if (clear) clear.onclick = (e) => { e.preventDefault(); if (confirm("Delete all demo results in this browser?")) { Store.clearLocal(); rows = []; render(); } };
    app.querySelectorAll("tr[data-person]").forEach((tr) =>
      tr.addEventListener("click", () => { selectedPerson = tr.dataset.person; render(); })
    );
  }

  (async function boot() {
    app.innerHTML = '<div class="empty">Loading…</div>';
    await Store.init();
    window.QUIZZES.forEach((quiz) => {
      quizTitles[quiz.id] = quiz.title;
      quiz.questions.forEach((q) => (bank[quiz.id + "/" + q.id] = q));
    });
    if (quizFilter !== "all" && !quizTitles[quizFilter]) quizFilter = "all";
    load();
  })();
})();
