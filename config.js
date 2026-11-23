// ---------------------------------------------------------------------------
// App settings.
// ---------------------------------------------------------------------------
window.QUIZ_CONFIG = {
  appTitle: "ControlTech Field Academy",

  // Every quiz file, in the order they appear on the home screen.
  // Old quizzes stay here (mark them archived: true inside the file) so new
  // hires can still take them.
  quizzes: [
    "quizzes/floorplan-markup.js",
    "quizzes/field-sops-sample.js",
  ],

  // The quiz featured at the top of the home screen.
  recommendedQuiz: "floorplan-markup",

  // Default questions per round. 0 = all. A quiz can override this.
  questionsPerRound: 0,

  // Firebase project settings (Project settings > Your apps > Web app).
  // Leave apiKey blank to run in LOCAL DEMO MODE: no sign-in, and results are
  // saved only in this browser. Handy for testing new questions.
  firebase: {
    apiKey: "AIzaSyDadQD5PixoufdCoL5kHGZUIKaissOF0OY",
    authDomain: "ctech-quiz.firebaseapp.com",
    projectId: "ctech-quiz",
    appId: "1:806745411764:web:05b3a2cc26e118239c87e1",
  },

  // Only these email domains can sign in, e.g. ["yusen-illuminate.com"].
  // Empty = any email. (firestore.rules enforces this on the server too.)
  allowedEmailDomains: [],
};
