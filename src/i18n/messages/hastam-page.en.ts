import type { HastamPageMessages } from "@/i18n/page-types/hastam";

// /en/hastam. Same shape and same rules as hastam-page.tr.ts: a phone booking
// is a request the clinic approves, a complaint is routed and never assessed,
// 112 comes first in an emergency, and the only numbers are product defaults.
// The calls are in Turkish in the product; these captions are translations.
// Akademi Polyclinic, the people and the hours are invented sample data.
const hastamPage: HastamPageMessages = {
  metaTitle: "Hastam: The AI Phone Assistant for Clinics | GBO Vision",
  metaDescription:
    "Hastam is the AI assistant that answers your clinic's phone. It talks to the patient, takes the appointment request and shows it to you. A GBO Vision company.",
  hero: {
    eyebrow: "For polyclinics and medical centres",
    title: "Hastam answers your clinic’s phone.",
    lead: "Hastam is the AI receptionist that answers the phone 24/7. It talks with the caller, takes the appointment request and puts it on your screen. Approval stays with you.",
    chips: ["No app", "No keypad menu", "The patient just calls"],
    primaryCta: "Request a demo",
    secondaryCta: "The hastam.ai site",
    steps: [
      {
        title: "Your patient calls the clinic.",
        description: "The number they already know. No app, no keypad menu.",
      },
      {
        title: "AI picks up and talks.",
        description: "It listens, then finds the right doctor and a free time.",
      },
      {
        title: "The result lands on your screen.",
        description: "You decide, and the patient is told.",
      },
    ],
  },
  faq: {
    label: "Questions",
    title: "Questions clinic owners ask.",
    lead: "If your question is not answered here, you can ask it in the demo.",
    noteTitle: "Asked most",
    note: "What clinic owners ask most often.",
    items: [
      {
        question: "Does the patient need to download an app?",
        answer:
          "No. Your patient rings the number of your clinic that they already know, and talks. There is no app, no password and no keypad menu.",
      },
      {
        question: "Does Hastam book the appointment directly?",
        answer:
          "No. The assistant finds a free time and files an appointment request. You approve the request on the dashboard. After that, Hastam rings the patient and confirms the appointment.",
      },
      {
        question: "What happens if the caller has an emergency?",
        answer:
          "The assistant first tells them to call 112. The call is flagged as urgent on the dashboard and your team is alerted. An authorised member of staff can take the call over live.",
      },
      {
        question: "Which languages does Hastam speak?",
        answer: "Turkish is the main language. English is also available.",
      },
      {
        question: "What does Hastam not do?",
        answer:
          "It does not diagnose and gives no medical advice. It does not write or renew prescriptions. It does not approve an appointment for you.",
      },
      {
        question: "How does setup work?",
        answer:
          "Hastam is set up separately for each clinic. Your departments, doctors and working hours are entered into the system. To start, request a demo.",
      },
    ],
  },
  ctaAssurances: [
    "Set up separately for each clinic",
    "Speaks Turkish, English available",
    "Approval stays with your clinic",
  ],
  heroCalls: {
    label: "Sample calls",
    description:
      "Four sample calls play in turn. The patient calls the clinic, or Hastam calls the patient. The AI talks. The result lands on the clinic's screen.",
    tabsLabel: "Choose a sample call",
    pause: "Pause the sample calls",
    play: "Play the sample calls",
    phoneLabel: "The patient’s phone",
    talkLabel: "The conversation",
    screenLabel: "Your clinic’s screen",
    clinic: "Akademi Polyclinic",
    clinicInitials: "AP",
    line: "Clinic line",
    inbound: "Incoming call",
    outbound: "Outgoing call",
    speakers: { ai: "AI", pt: "Patient" },
    scenes: [
      {
        tab: "Appointment request",
        dir: "in",
        patient: "Ayşe Yılmaz",
        turns: [
          {
            who: "ai",
            text: "Hello from Akademi Polyclinic. This call is being recorded.",
          },
          {
            who: "pt",
            text: "My ear has been hurting for two days. I would like to see a doctor.",
          },
          {
            who: "ai",
            text: "I hope you feel better soon. In ENT, Dr. Zeynep Arslan is free tomorrow at 11.30 and 15.00. Which suits you?",
          },
          { who: "pt", text: "11.30 works." },
          {
            who: "ai",
            text: "I have taken your request for 11.30 tomorrow. Once the clinic approves it, I will call you to confirm.",
          },
        ],
        outcome: {
          area: "Calendar",
          meta: "Dr. Zeynep Arslan · ENT",
          when: "Wed 11.30",
          status: "Needs approval",
          tone: "pending",
          action: "Approve",
        },
      },
      {
        tab: "Reschedule",
        dir: "in",
        patient: "Mehmet Demir",
        turns: [
          {
            who: "ai",
            text: "Hello from Akademi Polyclinic. This call is being recorded.",
          },
          {
            who: "pt",
            text: "I cannot make my appointment tomorrow. Could we move it to Thursday?",
          },
          {
            who: "ai",
            text: "Dr. Mehmet Kaya is free on Thursday at 10.00, 14.30 and 16.00. Which would you like?",
          },
          { who: "pt", text: "14.30, please." },
          {
            who: "ai",
            text: "I cancelled tomorrow’s appointment and took your request for Thursday 14.30. I will call you once approved.",
          },
        ],
        outcome: {
          area: "Calendar",
          meta: "Dr. Mehmet Kaya · Cardiology",
          when: "Wed 09.30 → Thu 14.30",
          status: "Needs approval",
          tone: "pending",
          action: "Approve",
        },
      },
      {
        tab: "Message for the doctor",
        dir: "in",
        patient: "Fatma Kaya",
        turns: [
          {
            who: "ai",
            text: "Hello from Akademi Polyclinic. This call is being recorded.",
          },
          {
            who: "pt",
            text: "My test results are in. I wanted to ask Dr. Selin something about my medication.",
          },
          {
            who: "ai",
            text: "I will note your question and pass it to Dr. Selin Aydın. Please go ahead.",
          },
          {
            who: "pt",
            text: "Should I take it in the morning or in the evening?",
          },
          {
            who: "ai",
            text: "I have passed your note on. When the doctor answers, I will call you and read the answer to you.",
          },
        ],
        outcome: {
          area: "Requests",
          meta: "Dr. Selin Aydın · Internal medicine",
          when: "“Should I take it in the morning or in the evening?”",
          status: "New request",
          tone: "info",
          action: "Answer",
        },
      },
      {
        tab: "Reminder",
        dir: "out",
        patient: "Ali Çelik",
        turns: [
          {
            who: "ai",
            text: "Hello Mr. Çelik, I am calling from Akademi Polyclinic. This call is being recorded. You have an appointment with Dr. Burak Demir tomorrow at 10.30.",
          },
          { who: "pt", text: "Yes, I remember." },
          { who: "ai", text: "Will you be able to come?" },
          { who: "pt", text: "I will." },
          {
            who: "ai",
            text: "Thank you, I have noted that. See you tomorrow.",
          },
        ],
        outcome: {
          area: "Outgoing calls",
          meta: "Appointment reminder · attempt 1 of 3",
          when: "Thu 10.30 · Dr. Burak Demir",
          status: "Patient confirmed attendance",
          tone: "ok",
          action: "Connected",
        },
      },
    ],
  },
  call: {
    label: "A sample call",
    title: "Watch one call from start to finish.",
    lead: "You see two screens: the patient’s phone and your clinic’s screen. Press play to watch the call.",
    demo: {
      heading: "How Hastam handles a call to reschedule",
      description:
        "In a sample call, a patient phones the clinic. Hastam picks up and says the call is recorded. The patient says they cannot make tomorrow's appointment. Hastam finds the appointment and offers three free times on Thursday with the same doctor. The patient picks 14.30. The old appointment is cancelled. The new time goes to the clinic for approval. Once the clinic approves it, the patient is called. The call is in Turkish and the captions are translated.",
      stageLabel: "Hastam · Sample call",
      replay: "Play the call",
      pause: "Pause the call",
      agentName: "AI",
      callerPhone: "••• 48 21",
      lines: [
        "Hello from Akademi Polyclinic. This call is being recorded. How can I help you?",
        "I cannot make my appointment tomorrow. Could we move it to Thursday?",
        "Dr. Mehmet Kaya is free on Thursday at 10.00, 14.30 and 16.00. Which would you like?",
        "14.30, please.",
        "Thursday at 14.30, with Dr. Mehmet Kaya. Shall I send your request like that?",
        "Yes, please.",
        "I cancelled tomorrow’s appointment and took your request for Thursday 14.30. I will call you once approved.",
        "Okay, thank you.",
        "You are welcome. Have a good day.",
      ],
      complaint: {
        title: "Reason for call",
        listening: "Listening",
        noted: "Noted",
        before: "The patient says what they need in their own words.",
        after: "“I cannot make my appointment tomorrow.”",
      },
      steps: [
        { title: "Current appointment", detail: "Wed 09.30 · Dr. M. Kaya" },
        { title: "Free times" },
        {
          title: "Reschedule request",
          detail: "Thu 14.30 · Dr. M. Kaya",
          pending: "Awaiting the patient's answer",
        },
      ],
      slots: ["10.00", "14.30", "16.00"],
      chosen: "14.30",
      receipt: {
        label: "Request",
        when: "Thu 14.30",
        status: "Needs approval",
        rows: [
          { label: "Doctor", value: "Dr. Mehmet Kaya" },
          { label: "Department", value: "Cardiology" },
          { label: "Previous time", value: "Wed 09.30" },
        ],
        id: "R-3105",
        note: "Called once approved",
      },
      phone: { clinic: "Akademi Polyclinic", line: "Clinic line" },
    },
    proof: [
      {
        value: "Recording notice",
        caption: "said in the greeting, and the time is noted",
      },
      {
        value: "Checked again",
        caption: "the time is looked at again just before the request is written",
      },
      {
        value: "Clinic approval",
        caption: "the appointment is not final until you approve it",
      },
    ],
  },
  heard: {
    label: "How it works",
    title: "It talks like a front desk. It checks the calendar, takes notes, calls back.",
    lead: "There is no keypad menu. Patients describe the problem in their own words. The assistant keeps it short and asks one thing at a time.",
    noteTitle: "How to read this",
    note: "On the left, what the patient says. On the right, what Hastam does.",
    sayLabel: "What the patient says",
    doLabel: "What Hastam does",
    rows: [
      {
        say: "“I would like an appointment for an examination.”",
        title: "Takes an appointment request.",
        description:
          "It writes it into a time that is free in the doctor’s calendar at that moment. The request becomes an appointment once your clinic approves it.",
      },
      {
        say: "“I cannot make my appointment tomorrow.”",
        title: "Cancels and reschedules.",
        description:
          "It moves the appointment to another time with the same doctor. The new time comes to you for approval again.",
      },
      {
        say: "“My ear has been hurting for two days.”",
        title: "Routes the complaint to a department.",
        description:
          "Patients do not need to know the department’s name. They describe the complaint and the assistant finds the right department and doctor.",
      },
      {
        say: "“I wanted to ask about my test results.”",
        title: "Takes a message.",
        description:
          "It notes what it cannot answer and your team sees it in the dashboard. The doctor writes and approves an answer. The assistant calls the patient and reads it out.",
      },
      {
        say: "“I feel pressure in my chest.”",
        title: "Says 112 first.",
        description:
          "When it hears an emergency symptom, the first thing it says is 112. Your team can take over the live call from the dashboard, and the assistant goes quiet.",
      },
      {
        say: "“Will you call me if an earlier time frees up?”",
        title: "Calls the patient itself.",
        description:
          "It tells them the request was approved, reminds them of the visit and offers a freed time. It checks in after the appointment.",
      },
    ],
  },
  approval: {
    label: "You decide",
    title: "The assistant talks. Your team decides.",
    lead: "The request becomes an appointment once your clinic approves it. After that, Hastam rings the patient and confirms the appointment.",
    noteTitle: "Try it yourself",
    note: "Approve or decline the sample request. See what Hastam does next.",
    steps: [
      {
        title: "The request lands on the calendar.",
        description:
          "The assistant finds a free time and files an appointment request. It is not final until you approve it.",
      },
      {
        title: "You give the approval.",
        description:
          "You approve or decline the request on the calendar. The decision stays with your clinic.",
      },
      {
        title: "Hastam calls the patient.",
        description:
          "If you approve, it rings the patient and confirms the appointment. If you decline, it rings at once and offers another time.",
      },
    ],
    mock: {
      label: "Approval screen",
      screenLabel: "Your clinic’s screen",
      phoneLabel: "The patient’s phone",
      calendarTitle: "Calendar",
      calendarMeta: "Dr. Zeynep Arslan · ENT · Wednesday",
      booked: [
        { time: "10.30", name: "Deniz Acar", kind: "Examination" },
        { time: "11.00", name: "Elif Kurt", kind: "Check-up" },
      ],
      lunch: { time: "12.00", label: "Lunch break" },
      request: { time: "11.30", name: "Ayşe Yılmaz", meta: "Taken by phone" },
      status: {
        pending: "Needs approval",
        approved: "Approved",
        declined: "Declined",
      },
      approve: "Approve",
      decline: "Decline",
      undo: "Undo",
      clinic: "Akademi Polyclinic",
      clinicInitials: "AP",
      call: {
        pending: {
          chip: "No call yet",
          text: "The patient has not been called. Your decision comes first.",
        },
        approved: {
          chip: "Confirmation call",
          said: "“Your appointment request for Wednesday at 11.30 has been approved.”",
          result: "Patient informed",
        },
        declined: {
          chip: "Called right away",
          text: "The assistant calls the patient at once and offers another time.",
          result: "This call may ring outside calling hours.",
        },
      },
    },
  },
  outbound: {
    label: "It calls patients",
    title: "Hastam also calls your patients.",
    lead: "For confirmations, reminders, freed times, follow-ups and call-backs. If the patient does not answer, the assistant tries again at intervals.",
    noteTitle: "Hastam calls too",
    note: "You set the hours and how often.",
    rows: [
      {
        title: "Confirmation",
        description:
          "Once you approve the request, it rings the patient and confirms the appointment.",
      },
      {
        title: "Reminder",
        description:
          "Patients are called before the appointment. They can confirm, move or cancel.",
      },
      {
        title: "Offer of a freed time",
        description:
          "A freed time is offered to waiting patients one at a time. The queue starts with whoever joined the list first. Each patient is called once for this offer.",
      },
      {
        title: "Follow-up call",
        description:
          "After the visit it rings the patient and asks how they are. The summary lands on the dashboard.",
      },
      {
        title: "Call-back",
        description:
          "The doctor writes and approves an answer. The assistant rings the patient and reads it out.",
      },
    ],
    facts: [
      {
        title: "A routine call is tried three times.",
        description:
          "For a routine call the first attempt is made at once. If the patient does not answer, it tries again after 10 minutes, then after 4 hours.",
      },
      {
        title: "Reminder calls keep to your hours.",
        description:
          "Unless you change it, 09.00 to 19.00. A call that falls outside the hours is not cancelled, it is postponed.",
      },
      {
        title: "2 calls a day, 5 a week.",
        description:
          "The default limit on routine calls per patient. Reminders can be switched off for a patient who does not want them.",
      },
    ],
    mock: {
      ladder: {
        label: "Attempts",
        attempts: [
          { label: "Attempt 1", time: "14.00", result: "No answer", tone: "info" },
          { label: "Attempt 2", time: "14.10", result: "No answer", tone: "info" },
          { label: "Attempt 3", time: "18.10", result: "Connected", tone: "ok" },
        ],
        gaps: ["+10 min", "+4 h"],
      },
      hours: {
        label: "Calling hours",
        window: "09.00–19.00",
        ticks: ["00", "06", "12", "18", "24"],
        due: "Call due · 20.40",
        deferred: "Postponed",
        next: "Tomorrow 09.00",
      },
      caps: {
        label: "Call limit",
        setting: "Default",
        day: "Day",
        week: "Week",
      },
    },
  },
  rules: {
    label: "Rules and safety",
    title: "You set the rules. The AI cannot step outside them.",
    lead: "You choose the calling hours, a doctor’s age limit and who sees what. Whatever the caller says, the AI cannot go past these rules.",
    noteTitle: "Six rules",
    note: "Each box describes a rule that runs in the product.",
    items: [
      {
        title: "No diagnosis, no medical advice.",
        description:
          "It routes the complaint to the right department. It does not write or renew prescriptions.",
      },
      {
        title: "It says 112 first in an emergency.",
        description:
          "The call is flagged as urgent on the dashboard. An authorised person listens in or takes the call over.",
      },
      {
        title: "The recording notice is in the greeting.",
        description:
          "The assistant says in its greeting that the call is recorded. Only the people you give permission to can listen.",
      },
      {
        title: "The doctor’s age limit is checked first.",
        description:
          "This limit is applied by the system that writes the appointment, not by the AI. Even if the caller insists, the result does not change.",
      },
      {
        title: "No details before the identity check.",
        description:
          "If you switch it on, the assistant asks for the TC identity number. Appointment details are not given until the number is checked.",
      },
      {
        title: "You decide who sees what.",
        description:
          "The front desk manages appointments and calls and has no access to clinical records. You set the permissions.",
      },
    ],
  },
  parent: {
    label: "GBO Vision",
    title: "Hastam is a GBO Vision company.",
    lead: "The product has its own site, hastam.ai. You will find more sample calls and the dashboard screens there.",
    linkLabel: "Go to the hastam.ai site",
    externalHint: "another site",
  },
};

export default hastamPage;
