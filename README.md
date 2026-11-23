# ControlTech Field Academy

A gamified quiz for teaching field SOPs, plus a dashboard showing who missed what.

- `index.html`: the quiz techs take (sign in, recommended quiz, other quizzes)
- `dashboard.html`: results for admins
- `quizzes/`: one file per quiz
- `config.js`: quiz list, recommended quiz, Firebase settings
- `images/`: screenshots for questions and answers
- `firestore.rules`: who can save and who can see results

There's no build step. Edit the files and push to GitHub.

## Try it locally

Double-click `index.html`. With no Firebase `apiKey` in `config.js`, it runs in **demo mode**:
no sign-in, and results are saved only in your browser. `dashboard.html` shows them.

## Adding a quiz

1. Copy `quizzes/floorplan-markup.js` to a new file, e.g. `quizzes/vive-hubs.js`.
2. Give it a new `id`, `title` and `description`, and write the questions.
3. Add the file to `quizzes` in `config.js`. Set `recommendedQuiz` to feature it.

To retire a quiz without losing it, add `archived: true`. It moves to "Past quizzes" and
new hires can still take it. Never change a quiz `id` or question `id` once people have
taken it, because the dashboard tracks results by id.

## Writing questions

```js
{
  id: "fm09",
  question: "If a room is complete, how should that be noted?",
  image: "images/markup/example.png",   // optional screenshot for the question
  why: "Shown after they get it right: the reason we do it this way.",
  choices: [
    { text: "Highlight in green", image: "images/markup/room-green.png", correct: true },
    { text: "Leave it blank", image: "images/markup/room-blank.png", explanation: "Why this is wrong." },
  ],
},
```

- Mark more than one choice `correct: true` and it becomes "select all that apply."
- If any choice has an `image`, the choices show as picture cards (click ⤢ to enlarge).
- The best wrong answers are mistakes new techs **actually make**.
- Keep screenshots under ~500 KB (PNG or JPG, ~1400 px wide is plenty).
- Press F12 > Console on the quiz page to see warnings for missing explanations or duplicate ids.

## Firebase setup (one time)

1. In the [Firebase console](https://console.firebase.google.com), create a project (or reuse one).
2. **Project settings > Your apps > Web (`</>`)**: register an app and copy `apiKey`,
   `authDomain`, `projectId` and `appId` into `config.js`.
3. **Authentication > Sign-in method > Email/Password**: enable it, and also turn on
   **Email link (passwordless sign-in)**.
4. **Authentication > Settings > Authorized domains**: add `<your-github-user>.github.io`.
5. **Firestore Database > Create database** (production mode). Then open **Rules**,
   paste in `firestore.rules`, put in your admin email(s) and company domain, and click **Publish**.
6. In `config.js`, set `allowedEmailDomains` to your company domain.

All of this fits in Firebase's free tier. The Firebase settings in `config.js` are
designed to be public. Your security comes from `firestore.rules`.

Sign-in emails come from `noreply@<project>.firebaseapp.com`. If they land in Junk or
Quarantine, ask IT to allow that sender.

## Publishing on GitHub Pages

1. Create a repository and upload these files.
2. **Settings > Pages > Deploy from branch > main / root**.
3. Share `https://<user>.github.io/<repo>/` with techs. The dashboard is at `/dashboard.html`.

On free GitHub plans, the site and repository are **public**: anyone with the link can read
the questions and images. Results are private (Firestore, admins only).
