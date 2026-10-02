import type { KollektorPageMessages } from "@/i18n/page-types/kollektor";

// Copy for /en/kollektor. Same shape and same claims as the Turkish file. The
// product calls in Turkish only, so this page says so wherever a call is
// shown, and amounts stay in lira. Sample people in the mocks are made up.
const kollektorPage: KollektorPageMessages = {
  metaTitle: "Kollektor: Voice AI for Debt Collection | GBO Vision",
  metaDescription:
    "Kollektor is the voice AI collections assistant by GBO Vision (gbovision.com). It calls debtors in Turkish, confirms each promise to pay and records it.",
  hero: {
    eyebrow: "For law offices and collection teams",
    title: "Kollektor calls the debtor and records the promise.",
    lead: "It calls in Turkish. It gets a clear payment day. It repeats the promise out loud, then saves it. Your team sees every call live.",
    chips: ["Calls are in Turkish", "Recording and transcript", "Your team can take over a call"],
    primaryCta: "Schedule a demo",
    secondaryCta: "Watch a sample call",
    steps: [
      {
        title: "Kollektor calls the debtor.",
        description:
          "It calls the person on your list, in Turkish. The debtor needs no app and no link.",
      },
      {
        title: "It pins down the payment day.",
        description: "It repeats the day and the amount out loud.",
      },
      {
        title: "The promise lands on your screen.",
        description:
          "Your team sees the promise, the recording and the transcript. They can take over the call.",
      },
    ],
  },
  heroPicture: {
    summary:
      "Sample call. The debtor’s phone rings. Kollektor says the day and the amount, and the debtor says yes. The promise to pay shows on your team’s screen.",
    labels: ["The debtor’s phone", "Kollektor’s voice", "Your team’s screen"],
    agent: { who: "Kollektor", text: "8,400 lira on Friday. Is that firm?" },
    debtor: { who: "Debtor", text: "Yes, it’s firm." },
    translated: "Translated from Turkish",
    cardTitle: "Promise to pay saved",
    cardRows: [
      { label: "Amount", value: "₺8,400" },
      { label: "Date", value: "Fri 16 Oct" },
      { label: "Confirmed", value: "Debtor said yes" },
    ],
    cardFoot: "K-2046 · Recording + transcript",
  },
  call: {
    label: "Sample call",
    title: "Watch one call from start to finish.",
    lead: "You see two screens: the debtor’s phone and your team’s screen.",
    caption:
      "This sample has an ID question and a split payment. Both are settings of a call flow, not part of every call.",
    play: "Play the call",
    pause: "Pause the call",
    proof: [
      {
        value: "Turkish",
        caption: "Calls are made in Turkish. The lines you read here are translated.",
      },
      {
        value: "Yes first",
        caption: "On the call, a promise is saved once the debtor clearly says yes.",
      },
      {
        value: "90 days",
        caption: "Transcripts and recordings are deleted after 90 days.",
      },
    ],
  },
  start: {
    label: "Getting started",
    title: "Four steps from your list to the first call.",
    lead: "You upload your Excel list. You run the rest from the screen.",
    noteTitle: "On your screen",
    note: "The picture shows step two. You see each row.",
    rows: [
      {
        title: "You upload the list.",
        description:
          "You upload your Excel file. It has to follow the template we give you.",
      },
      {
        title: "You check the rows.",
        description:
          "The list opens as a table. You fix a bad row or leave it out.",
      },
      {
        title: "You write the rules.",
        description:
          "You pick the calling hours, the daily limit and the time between tries.",
      },
      {
        title: "The group is ready.",
        description:
          "We switch on automatic dialling together during setup. You can stop the group at any time.",
      },
    ],
    mock: {
      summary:
        "Sample screen. The uploaded list opens as a table. Three rows are ready. One row has no phone number. One row is left out.",
      owner: "Your team’s screen",
      window: "New call group",
      file: "october-list.xlsx",
      steps: ["Upload list", "Review", "Group rules"],
      columns: ["Name", "Phone", "Debt", "Row"],
      rows: [
        { name: "Selin A.", detail: "0532 ••• •• 18", amount: "₺8,400", state: "Ready", tone: "done" },
        { name: "Murat T.", detail: "0544 ••• •• 07", amount: "₺21,750", state: "Ready", tone: "done" },
        { name: "Derya K.", detail: "—", amount: "₺6,900", state: "No phone", tone: "wait" },
        { name: "Hakan Ö.", detail: "0505 ••• •• 63", amount: "₺12,500", state: "Ready", tone: "done" },
        { name: "Elif Ş.", detail: "0533 ••• •• 40", amount: "₺14,200", state: "Left out", tone: "off" },
      ],
      foot: "5 rows · 3 ready",
      next: "Next",
    },
  },
  onCall: {
    label: "On the call",
    title: "How does Kollektor handle the call?",
    lead: "It adapts to the customer’s reply. It confirms a payment date, plans a call back or transfers the call to your team.",
    noteTitle: "Example situations",
    note: "The customer’s reply and Kollektor’s next step.",
    sayLabel: "Customer’s reply",
    doLabel: "Kollektor’s next step",
    rows: [
      {
        say: "“How much do I owe?”",
        title: "If there is an ID question, it asks that first.",
        description:
          "This is a call flow setting. It gives no amount until the answer matches.",
      },
      {
        say: "“I can’t pay it all today.”",
        title: "It asks for a clear day.",
        description:
          "A vague answer is not a promise. A part payment is discussed only if the call flow allows it.",
      },
      {
        say: "“Fine, I’ll pay on Friday.”",
        title: "It repeats the promise and waits for a yes.",
        description:
          "It says the date and the amount out loud. It saves them after a clear yes.",
      },
      {
        say: "“I’ll pay on Sunday.”",
        title: "It will not save a day that cannot work.",
        description:
          "A weekend, a bank holiday or a past day is not a promise. The system turns it down.",
      },
      {
        say: "“I can’t talk right now.”",
        title: "It books a call back.",
        description:
          "It saves the time to call back. Your team sees it on the calendar.",
      },
      {
        say: "“Let me talk to a person.”",
        title: "It rings your team.",
        description:
          "The screen of a free team member rings. Kollektor stays on the line.",
      },
      {
        say: "“Wrong number.”",
        title: "It adds the number to the do-not-call list.",
        description:
          "The number goes on the do-not-call list. No call group dials it again.",
      },
    ],
  },
  team: {
    label: "Your screen",
    title: "Your team sees every call on screen.",
    lead: "The debtor only hears a phone call. There is no app, no portal and no link.",
    note: "The picture shows today’s calls and the one you picked.",
    rows: [
      {
        title: "Live transcript",
        description:
          "The words show on screen as they are said. A team member can listen in live.",
      },
      {
        title: "Promise to pay",
        description: "The amount and the date are saved while the call is on.",
      },
      {
        title: "Call back calendar",
        description:
          "Booked call backs sit on the calendar. Your team can move the day and the time.",
      },
      {
        title: "Recording and transcript",
        description:
          "You can open the sound and the text of each call. You can download the recording.",
      },
      {
        title: "Review list",
        description:
          "If the system is not sure of a result, it asks your team. A person agrees or fixes it.",
      },
      {
        title: "Reports",
        description:
          "How many were called, reached and gave a promise. You see it by day, week and month.",
      },
    ],
    mock: {
      summary:
        "Sample screen. Six of today’s calls are listed with their results. The picked call shows the promise to pay, the recording and the last two lines.",
      owner: "Your team’s screen",
      window: "Calls",
      range: "Today",
      columns: ["Debtor", "Time", "Length", "Result"],
      // The first three are the ready rows of the list mock above. The others
      // are not on that list: a person it leaves out is never called here.
      rows: [
        { name: "Selin A.", time: "10:24", length: "02:41", state: "Promise to pay", tone: "done" },
        { name: "Murat T.", time: "10:31", length: "01:12", state: "Call back", tone: "done" },
        { name: "Hakan Ö.", time: "10:38", length: "03:05", state: "Needs review", tone: "wait" },
        { name: "Zeynep D.", time: "10:44", length: "—", state: "No answer", tone: "off" },
        { name: "Burak Y.", time: "10:52", length: "01:48", state: "Promise to pay", tone: "done" },
        { name: "Aylin C.", time: "10:57", length: "00:54", state: "Call back", tone: "done" },
      ],
      detailTitle: "Selin A. · K-2046",
      detailRows: [
        { label: "Promise to pay", value: "₺8,400" },
        { label: "Date", value: "Fri 16 Oct" },
      ],
      recording: "Recording",
      duration: "02:41",
      lines: [
        { who: "Kollektor", text: "8,400 lira on Friday. Is that firm?" },
        { who: "Debtor", text: "Yes, it’s firm." },
      ],
    },
  },
  handoff: {
    label: "Taking over",
    title: "When needed, a person takes over the call.",
    lead: "The handoff happens in Kollektor’s own phone in the browser. Calls are not passed to an outside call centre.",
    noteTitle: "On your screen",
    note: "The picture shows a call that rings on a team member’s screen.",
    rows: [
      {
        title: "Kollektor rings your team.",
        description:
          "The screen of a free team member rings for 30 seconds. Kollektor keeps the talk going.",
      },
      {
        title: "A team member clicks “Take over”.",
        description:
          "They join the same call from the browser and speak. The AI goes quiet.",
      },
      {
        title: "If no one picks up, the call goes on.",
        description: "Kollektor tells the debtor so. Then it carries on with the call.",
      },
      {
        title: "A team member can call too.",
        description:
          "The AI can listen and draft the promise. The person agrees, edits or turns it down.",
      },
    ],
    mock: {
      summary:
        "Sample screen. A call rings on a team member’s screen. It shows the debtor’s name, the last two lines and a Take over button.",
      owner: "A team member’s screen",
      window: "Waiting call",
      ringing: "Ringing · 00:12",
      name: "Hakan Ö.",
      meta: "Tel ***1863 · K-2051",
      lines: [
        { who: "Kollektor", text: "Will you pay today?" },
        { who: "Debtor", text: "Let me talk to a person." },
      ],
      take: "Take over",
      foot: "No answer: call goes on",
    },
  },
  rules: {
    label: "Rules",
    title: "You write who gets a call, when and how often.",
    lead: "Each call group runs on its own rules.",
    noteTitle: "Note",
    note: "The calling hours come preset. You can pick your own for each group.",
    rows: [
      {
        title: "Calling hours",
        description:
          "The preset is Monday to Saturday, 09:00 to 20:00. You can pick your own for each group.",
      },
      {
        title: "Calls per number",
        description: "You write how many times one number can be called at most.",
      },
      {
        title: "Daily limit",
        description: "You write how many times one person can be called in a day.",
      },
      {
        title: "Time between tries",
        description:
          "You pick when a call with no answer is tried again. After a call that reached a result, the group does not call that person again. A person who asked for a call back is called back.",
      },
      {
        title: "Start and end day",
        description: "After the end day the group makes no calls.",
      },
      {
        title: "Do-not-call list",
        description:
          "Your firm has one do-not-call list. Each group follows it. A team member can add a number by hand.",
      },
    ],
  },
  data: {
    label: "Data",
    title: "We wrote down what it does with data.",
    lead: "We show no badges. We show what the system does with the data.",
    noteTitle: "How to read it",
    note: "Each box shows one thing the system does with data.",
    items: [
      {
        title: "System logs show the last four digits.",
        description:
          "In system logs a phone number shows as its last four digits. Only the last four digits of the Turkish ID number are stored.",
      },
      {
        title: "Deleted after 90 days.",
        description:
          "Transcripts and recordings are deleted after 90 days. They are not kept for good.",
      },
      {
        title: "Each firm’s data is kept apart.",
        description:
          "Each firm sees only its own data. You set who can see what with roles and rights.",
      },
    ],
    pictures: {
      logSummary:
        "Sample system log. A phone number shows as its last four digits.",
      logTitle: "System log",
      // The same three calls as the team screen, so the endings match the
      // phones in the list mock (18, 07, 63).
      logRows: [
        { label: "10:24:07", value: "Tel ***4218" },
        { label: "10:31:02", value: "Tel ***9107" },
        { label: "10:38:15", value: "Tel ***1863" },
      ],
      keepSummary:
        "The record starts on the day of the call. Ninety days later the transcript and the recording are deleted.",
      keepFrom: { label: "Day 0", value: "Call" },
      keepTo: { label: "Day 90", value: "Deleted" },
      keepItems: ["Transcript", "Recording"],
      roleSummary:
        "Sample table of rights. A team member can read and write calls, can only read debtors and cannot see settings.",
      roleTitle: "Role: Team member",
      roleColumns: ["Read", "Write"],
      roleRows: [
        { label: "Calls", value: "rw" },
        { label: "Debtors", value: "r" },
        { label: "Settings", value: "" },
      ],
    },
  },
  audience: {
    label: "Who it is for",
    title: "Built for law offices and collection teams.",
    lead: "It is for teams that follow up loan, credit card and invoice debts.",
    noteTitle: "Note",
    note: "The debtor only hears a phone call.",
    imageAlt: "A headset on a desk",
    rows: [
      {
        title: "Law offices",
        description: "For offices that follow up files on behalf of a creditor.",
      },
      {
        title: "Collection teams",
        description: "For debt management firms that work long lists by phone.",
      },
      {
        title: "Manager and team member",
        description:
          "The manager writes the rules and the rights. The team member watches the calls and takes over when needed.",
      },
    ],
  },
  faq: {
    label: "Questions",
    title: "Answers to the questions you may have.",
    lead: "We also wrote down what it does not do.",
    noteTitle: "Note",
    note: "If your question is not here, ask us in the demo.",
    items: [
      {
        question: "Which language does Kollektor call in?",
        answer:
          "Kollektor calls in Turkish. The screen your team uses is in Turkish too.",
      },
      {
        question: "What does Kollektor not do?",
        answer:
          "It does not take payments. It sends no SMS and no payment link. It does not check if the money came in. Your team records the payment.",
      },
      {
        question: "How do I upload a list?",
        answer:
          "You upload an Excel file. It has to follow the template we give you. There is no ready link to other systems.",
      },
      {
        question: "Can we take over a call?",
        answer:
          "Yes. A team member joins the call from the phone in the browser. Calls are not passed to an outside call centre.",
      },
      {
        question: "How long are recordings kept?",
        answer:
          "Transcripts and recordings are deleted after 90 days. They are not kept for good.",
      },
      {
        question: "Is the ID question asked on every call?",
        answer:
          "No. It is a setting of the call flow. If you add an ID question, no debt detail is given until the answer matches.",
      },
      {
        question: "Which number do the calls come from?",
        answer:
          "You add your own line and numbers. You pick the caller line for each group.",
      },
    ],
  },
  ctaAssurances: [
    "Calls are made in Turkish",
    "Recordings are deleted after 90 days",
    "Your team can take over a call",
  ],
};

export default kollektorPage;
