// Shared by the quiz and the dashboard: loads quiz files, handles sign-in,
// and saves/reads results.
// With Firebase configured, techs sign in with an emailed link and results go
// to Firestore. Without it (demo mode), results stay in this browser.
(function () {
  const cfg = window.QUIZ_CONFIG || {};
  const FIREBASE_VERSION = "10.12.2";
  const LOCAL_KEY = "ctq.localResults";
  const isLocal = !(cfg.firebase && cfg.firebase.apiKey);
  let auth, db;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  async function init() {
    window.QUIZZES = [];
    for (const file of cfg.quizzes || []) {
      try { await loadScript(file); } catch (e) { console.warn(e.message); }
    }
    if (isLocal) return;

    for (const lib of ["app", "auth", "firestore"]) {
      await loadScript("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-" + lib + "-compat.js");
    }
    firebase.initializeApp(cfg.firebase);
    auth = firebase.auth();
    db = firebase.firestore();
    // Queues answers on spotty jobsite Wi-Fi and sends them when back online.
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    await new Promise((resolve) => { const off = auth.onAuthStateChanged(() => { off(); resolve(); }); });
  }

  // ---------- identity ----------
  function user() {
    if (isLocal) {
      const name = read("ctq.name", "");
      return name ? { name, email: "" } : null;
    }
    const u = auth.currentUser;
    if (!u) return null;
    return { email: u.email, uid: u.uid, name: read("ctq.name." + u.email, "") };
  }

  function setName(name) {
    const u = user();
    write(isLocal || !u ? "ctq.name" : "ctq.name." + u.email, name);
  }

  function domainAllowed(email) {
    const domains = (cfg.allowedEmailDomains || []).map((d) => d.toLowerCase());
    return !domains.length || domains.includes(email.split("@")[1]?.toLowerCase());
  }

  async function sendLink(email) {
    if (!domainAllowed(email)) throw new Error("Use your work email (" + cfg.allowedEmailDomains.join(" or ") + ").");
    await auth.sendSignInLinkToEmail(email, { url: location.origin + location.pathname, handleCodeInApp: true });
    write("ctq.pendingEmail", email);
  }

  const isSignInLink = () => !isLocal && auth.isSignInWithEmailLink(location.href);
  const pendingEmail = () => read("ctq.pendingEmail", "");

  async function completeSignIn(email) {
    await auth.signInWithEmailLink(email, location.href);
    try { localStorage.removeItem("ctq.pendingEmail"); } catch (e) {}
    history.replaceState(null, "", location.pathname);
  }

  function signOut() {
    if (isLocal) { try { localStorage.removeItem("ctq.name"); } catch (e) {} return Promise.resolve(); }
    return auth.signOut();
  }

  // ---------- results ----------
  function record(row) {
    const u = user();
    const full = Object.assign({}, row, { name: u.name, email: u.email });
    if (isLocal) {
      write(LOCAL_KEY, read(LOCAL_KEY, []).concat([full]));
      return;
    }
    full.uid = u.uid;
    db.collection("results").add(full).catch((e) => console.warn("Result not saved:", e.message));
  }

  async function fetchAll() {
    if (isLocal) return read(LOCAL_KEY, []);
    if (!auth.currentUser) throw new Error("signed-out");
    try {
      const snap = await db.collection("results").get();
      return snap.docs.map((d) => d.data());
    } catch (e) {
      throw new Error(e.code === "permission-denied" ? "not-admin" : e.message);
    }
  }

  function clearLocal() { write(LOCAL_KEY, []); }

  window.QuizStore = {
    isLocal, init, read, write,
    user, setName, sendLink, isSignInLink, pendingEmail, completeSignIn, signOut,
    record, fetchAll, clearLocal,
  };
})();
