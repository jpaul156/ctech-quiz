// ---------------------------------------------------------------------------
// QUIZ FILE FORMAT
//   id           - unique, never change it once people have taken the quiz
//   title, description
//   archived     - optional: true moves it to "Past quizzes" on the home screen
//   questionsPerRound, shuffle - optional overrides (shuffle: false keeps order)
//
// Each question:
//   id        - unique within this quiz, never reuse or renumber
//   question, image (optional screenshot), why (shown after a correct answer)
//   choices   - mark the right one(s) correct: true. More than one correct
//               answer turns it into "select all that apply" automatically.
//               Each wrong choice needs an explanation. Any choice can have
//               its own image.
//
// NOTE: explanations below are drafts. Review them before rollout.
// ---------------------------------------------------------------------------
window.QUIZZES.push({
  id: "floorplan-markup",
  title: "Floorplan Markup",
  description: "How we mark up the shared floorplan so anyone can see the status of every room, fixture and device at a glance.",
  questions: [
    {
      id: "fm01",
      question: "If a room is inaccessible, how should that be noted?",
      why: "Red tells the next tech the room still needs a visit and that access was the blocker, so they can arrange it before showing up.",
      choices: [
        { text: "Leave it blank", image: "images/markup/room-blank.svg", explanation: "Blank means 'not started.' Nobody can tell whether you skipped it, forgot it, or couldn't get in, so someone wastes a trip to find out." },
        { text: "Highlight in red", image: "images/markup/room-red.svg", correct: true },
        { text: "Yellow X", image: "images/markup/room-yellow-x.svg", explanation: "A yellow X means something else on our markup. Using the wrong mark makes the room's status unreadable." },
        { text: "Highlight in black", image: "images/markup/room-black.svg", explanation: "Black means the room was deleted. An inaccessible room marked black may never get finished." },
      ],
    },
    {
      id: "fm02",
      question: "If a room is deleted, how should that be noted?",
      why: "Black makes it obvious the room is out of scope, so nobody spends time on it or counts it as unfinished.",
      choices: [
        { text: "Leave it blank", image: "images/markup/room-blank.svg", explanation: "Blank looks like 'not started,' so the room stays on everyone's to-do list forever." },
        { text: "Highlight in red", image: "images/markup/room-red.svg", explanation: "Red means inaccessible. Someone will keep trying to get into a room that doesn't need any work." },
        { text: "Yellow X", image: "images/markup/room-yellow-x.svg", explanation: "A yellow X means something else on our markup. Deleted rooms need to stand out as out of scope." },
        { text: "Highlight in black", image: "images/markup/room-black.svg", correct: true },
      ],
    },
    {
      id: "fm03",
      question: "If a fixture is not dimming, how should that be noted?",
      why: "Purple flags a dimming issue on the exact fixture, so whoever troubleshoots knows where to look without re-testing the whole room.",
      choices: [
        { text: "Highlight in yellow", image: "images/markup/fixture-yellow.svg", explanation: "Yellow means something else on our markup. A dimming problem needs its own color so it gets fixed." },
        { text: "Highlight in red", image: "images/markup/fixture-red.svg", explanation: "Red is for inaccessible rooms. A red fixture reads as an access problem, not a dimming problem." },
        { text: "Cry", explanation: "Understandable, but tears don't show up on the floorplan. Mark it so it gets fixed." },
        { text: "Highlight in purple", image: "images/markup/fixture-purple.svg", correct: true },
      ],
    },
    {
      id: "fm04",
      question: "How should the hub be named?",
      why: "The name says what it is, which job, and exactly where it is (floor and column). Anyone can find it on the floorplan without a site walk.",
      choices: [
        { text: "Serial number + location (0F3212CA Bathroom)", explanation: "Serial numbers mean nothing in the field, and there's a bathroom on every floor. Nobody can find this hub from its name." },
        { text: "Room number + \"Vive\" (2270 Vive)", explanation: "Room numbers change during construction, and the name doesn't say which job it belongs to." },
        { text: "\"Vive\" + job name + floor-and-column (Vive AESmith 22-F10)", correct: true },
        { text: "Room name (Gym)", explanation: "This doesn't identify the job or the floor, and there could be several hubs near the gym." },
      ],
    },
    {
      id: "fm05",
      question: "What occupancy settings are used for open offices?",
      why: "Staged occupancy lights the space in a controlled way as people arrive, without lighting the whole floor for one person walking through.",
      choices: [
        { text: "Occupancy, all operating together", explanation: "One person walking through lights the whole open office. That wastes energy all day." },
        { text: "Occupancy, all operating independently", explanation: "Lights pop on and off in patches as people move around. It looks broken and generates complaint calls." },
        { text: "Staged occupancy", correct: true },
        { text: "Vacancy", explanation: "Vacancy (manual-on) makes everyone hunt for a switch. Open offices should come on automatically." },
      ],
    },
    {
      id: "fm06",
      question: "How should devices be tagged?",
      why: "Fixture type plus column tells anyone what the device is and where to find it, even on a floor they've never been on.",
      choices: [
        { text: "No tags", explanation: "Untagged devices are nearly impossible to find later. Every device gets tagged." },
        { text: "Fixture type (e.g. linear, recess, cove)", correct: true },
        { text: "Column number (e.g. G10, E08)", correct: true },
        { text: "Issue (e.g. not dimming, old fixture)", explanation: "Issues go on the floorplan markup, not on the device tag. A tag should still be true after the issue is fixed." },
      ],
    },
    {
      id: "fm07",
      question: "How are column numbers assigned?",
      image: "images/markup/grid-device.svg",
      why: "Top-left is one consistent rule, so every tech tags the same device the same way.",
      choices: [
        { text: "The column closest to the device", explanation: "'Closest' is a judgment call when a device sits near the middle of a bay. Two techs will pick two different columns." },
        { text: "The column closest to the top left of the device on the floorplan", correct: true },
        { text: "Your lucky number", explanation: "Bold strategy, but nobody else knows your lucky number." },
        { text: "The column farthest from the device", explanation: "That sends people to the wrong side of the bay." },
      ],
    },
    {
      id: "fm08",
      question: "What if an area covers more than one column grid square?",
      image: "images/markup/grid-area.svg",
      why: "The area still needs a location people can find. Use the top-left or central column so it lands on the right part of the floor.",
      choices: [
        { text: "Use the top-left column or the central column", correct: true },
        { text: "Leave the column number out", explanation: "Without a column, nobody can find the area. On a 36-floor job that means walking the floor to look for it." },
      ],
    },
  ],
});
