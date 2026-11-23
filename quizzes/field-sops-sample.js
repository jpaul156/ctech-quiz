// Sample quiz showing the format (including optional per-question categories).
// Replace or delete it, and remove it from config.js if you delete the file.
window.QUIZZES.push({
  id: "field-sops-sample",
  title: "General Field SOPs (sample)",
  description: "Backups, file storage, naming and troubleshooting basics.",
  questionsPerRound: 10,
  questions: [
    {
      id: "q001",
      category: "Site Prep",
      question: "You're about to change programming on a live system. What's the first thing you do?",
      why: "A backup is the only undo button you have. If a change goes sideways, you can restore the site in minutes instead of rebuilding from memory.",
      choices: [
        { text: "Pull a backup of the current program and save it to the job folder", correct: true },
        { text: "Make the change, then back up once it's working", explanation: "If the change breaks something, the 'last known good' version is already gone. Back up BEFORE you touch anything." },
        { text: "Ask the customer if they have a copy", explanation: "Customers almost never have a current copy, and it's not their job to. We own the backup." },
        { text: "Nothing, because the processor keeps its own history", explanation: "Most processors don't keep version history. Once you write over it, the old program is gone." },
      ],
    },
    {
      id: "q002",
      category: "Closeout",
      question: "Where should the final as-built program file be stored at closeout?",
      why: "One known location means anyone on the team can support the site later without hunting for files or calling whoever was there last.",
      choices: [
        { text: "In the project folder on the shared drive, named with the date", correct: true },
        { text: "On your laptop desktop", explanation: "If your laptop dies or you're out, nobody else can get to it. Files on one person's laptop are basically lost." },
        { text: "Emailed to yourself", explanation: "Email isn't a file system. It's hard to search, attachments get stripped, and teammates can't see it." },
        { text: "Only on the processor", explanation: "If the processor fails, so does your only copy. Always keep an off-device copy." },
      ],
    },
    {
      id: "q003",
      category: "Programming",
      question: "Which naming style should you use for zones?",
      image: "images/sample-screenshot.svg",
      why: "Consistent names make the system readable to the next tech, the facilities team, and you six months from now.",
      choices: [
        { text: "Floor-Room-Description, e.g. 2-214-Downlights", correct: true },
        { text: "Whatever the default name is (Zone 1, Zone 2…)", explanation: "Default names mean nothing in the field. Troubleshooting turns into guess-and-check." },
        { text: "Whatever the customer calls the room today", explanation: "Room nicknames change. Tie names to the drawings so they stay stable." },
      ],
    },
    {
      id: "q004",
      category: "Commissioning",
      question: "A sensor isn't triggering the lights. What do you check first?",
      why: "Going from simple to complex saves time. Most 'programming problems' turn out to be wiring or addressing.",
      choices: [
        { text: "Confirm the device is online and addressed correctly", correct: true },
        { text: "Rewrite the program logic", explanation: "If the device isn't communicating, no amount of logic will fix it. Rule out the physical layer first." },
        { text: "Replace the sensor", explanation: "Swapping hardware before diagnosing wastes parts and often hides the real problem." },
        { text: "Raise the sensitivity to maximum", explanation: "That hides the symptom and causes false triggers later. Find out why it isn't reporting." },
      ],
    },
  ],
});
