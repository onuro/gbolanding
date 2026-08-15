import type { Messages } from "@/i18n/types";

const enMessages: Messages = {
  metadata: {
    title: "Enterprise AI Agency & Custom Software | GBO Vision",
    description:
      "GBO Vision builds enterprise AI and custom software. We turn complex work and scattered data into tools that cut manual work and help your business grow.",
  },
  nav: {
    solutions: "Solutions",
    kollektor: "Kollektor",
    platform: "Platform",
    method: "How we work",
    languageLabel: "Language",
    scheduleDemo: "Schedule a demo",
  },
  hero: {
    eyebrow: "Enterprise AI for business growth",
    titleLead: "Growth-focused",
    titleAccent: "enterprise AI agency.",
    description:
      "GBO Vision builds AI products and custom software. We turn complex work and scattered data into tools that cut manual work and help your business grow.",
    primaryCta: "Schedule a demo",
    secondaryCta: "Explore solutions",
    status: "Work with us",
    voiceIdle: "Talk to our AI assistant",
    voiceConnecting: "Connecting…",
    voiceLive: "End the call",
    voiceError: "The voice assistant is unavailable right now.",
    voiceMicDenied:
      "Microphone access is blocked. Allow it for this site in your browser, and check your system privacy settings.",
    voiceMicMissing:
      "No microphone found. Plug one in, then start the call again.",
    voiceMicError:
      "Your microphone is in use by another app. Close it (Teams, Zoom, OBS…) and start the call again.",
    voiceMicInsecure:
      "The microphone needs a secure connection. Open this page over https and start the call again.",
    voiceSoundBlocked: "Enable sound",
  },
  proofStrip: {
    label: "How we help",
    items: [
      "Business diagnosis",
      "Custom AI software",
      "System integration",
      "Continuous improvement",
    ],
  },
  intro: {
    eyebrow: "Your AI partner",
    title: "Turn business friction into working AI.",
    description:
      "We learn how your team works. Then we find the best place for AI to help.",
  },
  solutions: {
    kollektor: {
      eyebrow: "Voice AI for debt collection",
      title: "Kollektor",
      description:
        "Kollektor is a voice assistant that phones debtors on behalf of law firms. It runs up to 5,000 calls a day, works out a payment plan, and has recovered $500K so far.",
      highlights: [
        "5,000 calls a day",
        "$500K recovered",
        "Escalates to your team",
      ],
      cta: "See how Kollektor works",
    },
    intelval: {
      eyebrow: "Valuation intelligence",
      title: "Intelval",
      description:
        "Intelval helps teams value businesses and real estate. It brings data, analysis, and reports into one place.",
      highlights: [
        "Business value",
        "Real estate value",
        "Clear reports",
      ],
      cta: "Schedule an Intelval demo",
    },
    enterprise: {
      eyebrow: "Custom AI and software",
      title: "Built for your business.",
      description:
        "We design AI tools and custom software around your work, data, and goals. No generic SaaS.",
      highlights: [
        "AI strategy",
        "Custom software",
        "Data integration",
      ],
      cta: "Explore the platform",
    },
  },
  kollektorDeep: {
    eyebrow: "Product · Kollektor",
    title: "A collector on the phone. A live desk for your team.",
    description:
      "Kollektor recovers overdue debt on the phone. It presses for payment, locks a plan, and streams every turn to your desk. Debtors never see an app. Your team sees the recovery.",
    pipelineLabel: "From list to recovery",
    pipeline: [
      {
        number: "01",
        title: "Import",
        description: "Load a debtor list. Numbers are checked before a campaign starts.",
      },
      {
        number: "02",
        title: "Campaign",
        description: "Open a call group. The queue works the file without an agent on every line.",
      },
      {
        number: "03",
        title: "Call",
        description: "The voice agent verifies identity, presses for payment, and stays in Turkish.",
      },
      {
        number: "04",
        title: "Capture",
        description: "Promises, amounts, and callback slots are written as they are spoken.",
      },
      {
        number: "05",
        title: "Escalate",
        description: "Hostile callers, third-party denials, and loops go to a person.",
      },
      {
        number: "06",
        title: "Report",
        description: "Reach, promises, and recovered amounts land on the same dashboard.",
      },
    ],
    chapters: [
      {
        title: "Campaigns that start from a list",
        description:
          "Upload debtors, open a call group, and watch progress as the floor works the file.",
      },
      {
        title: "A live voice pipeline",
        description:
          "Speech in, a collector model, speech out. The agent is a debt collector — firm, direct, and in Turkish.",
      },
      {
        title: "Promises and callbacks, not notes",
        description:
          "Payment amounts and dates persist as they are spoken. Callback slots are computed, not guessed.",
      },
      {
        title: "Operators stay on the hard calls",
        description:
          "Live transcript, scenario hits, and P0–P2 triage. Your team takes the line when the model should not.",
      },
    ],
    split: {
      eyebrow: "Asymmetric by design",
      title: "Two sides. One call.",
      description:
        "The debtor only hears a phone call. Operators get the live desk: transcript, classification, listen-in, and history.",
      debtorTitle: "What the debtor hears",
      debtorBody: "No app. No portal. No link. A named collector, a debt, and a next step.",
      debtorBeats: [
        "Identity is verified before any debt is discussed",
        "The agent presses for payment, a split, or a date",
        "A promise or callback is captured on the call",
        "Hostile or looping callers are handed to a person",
      ],
      operatorTitle: "What your team sees",
      operatorBody: "A React floor that updates as the call happens — no refresh, no extra wire.",
      operatorBeats: [
        "Live transcript and call state",
        "Scenario hits and triage priority",
        "Payment promise amount and date",
        "Calendar of computed callback slots",
      ],
    },
    guardrails: {
      title: "Built for Turkish collection desks",
      items: [
        {
          title: "KVKK",
          description: "Phones masked to last 4. TC kimlik stored as last 4. Transcripts purge after 90 days.",
        },
        {
          title: "Law 6502",
          description: "Collector tone with the legal frame in the playbook, not bolted on after the call.",
        },
        {
          title: "Human control",
          description: "P0–P2 triage only escalates. Your team takes over; the model never talks down a priority.",
        },
      ],
    },
    cta: "Schedule a Kollektor demo",
  },
  platform: {
    eyebrow: "How we deliver",
    title: "From insight to working AI.",
    description:
      "We learn how your business works. Then we design, connect, and build the right AI tool.",
    capabilities: [
      {
        title: "Business discovery",
        description:
          "We map your goals, data, and day-to-day work.",
      },
      {
        title: "Solution design",
        description:
          "We design the right product and user flow.",
      },
      {
        title: "AI automation",
        description:
          "AI handles routine tasks and supports your team.",
      },
      {
        title: "Data integration",
        description:
          "We connect the systems and data you use.",
      },
      {
        title: "Human oversight",
        description:
          "Your team stays in control of key choices.",
      },
      {
        title: "Ongoing improvement",
        description:
          "We learn from use and improve the product.",
      },
    ],
  },
  approach: {
    eyebrow: "How we work",
    title: "From business problem to working product.",
    description:
      "We start with your business, not a tool. Then we design, build, and improve with your team.",
    steps: [
      {
        number: "01",
        title: "Discover",
        description:
          "We map your goals, workflows, data, and the friction slowing your team down.",
      },
      {
        number: "02",
        title: "Design",
        description:
          "We define the right AI product, user experience, and delivery plan.",
      },
      {
        number: "03",
        title: "Build",
        description:
          "We connect your systems and turn the plan into working software.",
      },
      {
        number: "04",
        title: "Improve",
        description:
          "We measure results, learn from use, and keep improving.",
      },
    ],
  },
  signup: {
    placeholder: "Work email address",
    notify: "Schedule a demo",
    sending: "Sending request…",
    successTitle: "Demo request received",
    successBody:
      "Thanks. We’ll contact you to arrange a time.",
    errors: {
      required: "Enter your email address.",
      invalid: "Enter a valid email address.",
      submission: "We couldn’t send your request. Try again shortly.",
    },
  },
  finalCta: {
    eyebrow: "Schedule a demo",
    title: "Turn your next business problem into a working AI solution.",
    description:
      "Tell us where work is slow or hard. We’ll show you a practical next step.",
    primaryCta: "Schedule a demo",
    secondaryCta: "Explore solutions",
  },
  footer: {
    tagline: "AI and software, built for your business.",
    solutions: "Solutions",
    kollektor: "Kollektor",
    platform: "Platform",
    method: "How we work",
    rightsReserved: "All rights reserved",
  },
};

export default enMessages;
