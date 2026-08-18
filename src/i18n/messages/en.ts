import type { Messages } from "@/i18n/types";

const enMessages: Messages = {
  metadata: {
    title: "Enterprise AI Agency & Custom Software | GBO Vision",
    description:
      "GBO Vision builds enterprise AI and custom software. We turn complex work and scattered data into tools that cut manual work and help your business grow.",
  },
  about: {
    metaTitle: "About GBO Vision | Enterprise AI Agency",
    metaDescription:
      "GBO Vision (gbovision.com) is an enterprise AI agency based in Türkiye. We build AI products and custom software for companies that want to grow.",
    eyebrow: "About the company",
    title: "GBO Vision builds AI that teams actually use.",
    lead: "GBO Vision, or gbovision, is an enterprise AI agency. We build AI products and custom software. Our work turns slow manual processes into tools teams use every day.",
    bodyTitle: "Who we work with",
    body: [
      "We work with law firms, banks, and valuation firms. Most of our clients are in Türkiye, and we build for teams outside it too. We work in English and Turkish.",
      "We are a product company as much as an agency. We ship our own software and we run it. Kollektor and Intelval are both live, and both grew out of real client work.",
    ],
    productsTitle: "What we have built",
    productsIntro:
      "Two products carry our name. Each one started as client work and became something we run ourselves.",
    factsTitle: "Company details",
    factLabels: {
      legalName: "Legal name",
      based: "Based in",
      languages: "Languages",
      products: "Products",
      contact: "Contact",
      site: "Site",
    },
    factValues: {
      based: "Türkiye",
      languages: "English, Turkish",
      products: "Kollektor, Intelval",
    },
  },
  nav: {
    solutions: "Solutions",
    kollektor: "Kollektor",
    method: "How we work",
    about: "About",
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
        "Kollektor is a voice assistant that phones debtors on behalf of law firms and asset-receivable portfolios. It runs up to 10,000 calls a day, works out a payment plan, and has recovered $500K so far.",
      highlights: [
        "10,000 calls a day",
        "$500K recovered",
        "Escalates to your team",
      ],
      cta: "See how Kollektor works",
    },
    intelval: {
      eyebrow: "Valuation intelligence",
      title: "Intelval",
      description:
        "Intelval analyzes comparable-property and appraisal reports for valuation firms, and produces expert-level reports.",
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
        "No generic SaaS. From analysis to build, we design around your work, data, and goals.",
      phases: [
        {
          number: "01",
          title: "Analyze",
          summary: "Where the work actually breaks.",
          description:
            "We sit with the people doing the work and follow it end to end — users, tools, handoffs, and the data underneath. Then we name where friction is costing you hours, revenue, or accuracy, and rank it by what it is worth to fix.",
          deliverables: [
            "Friction map",
            "Cost of manual work",
            "Ranked opportunities",
          ],
        },
        {
          number: "02",
          title: "Blueprint",
          summary: "The plan, before a line of code.",
          description:
            "Product strategy, user journeys, and scope written in language your whole team can argue with. Everyone agrees on what gets built and why it matters before anyone opens an editor.",
          deliverables: [
            "Product strategy",
            "User journeys",
            "Scoped roadmap",
          ],
        },
        {
          number: "03",
          title: "Architect",
          summary: "The skeleton that scales.",
          description:
            "APIs, data modelling, integrations, and the AI layer designed as one system. It fits the tools you already run today, and leaves room for the volume you expect next year.",
          deliverables: [
            "System design",
            "Data model",
            "Integration plan",
          ],
        },
        {
          number: "04",
          title: "Build",
          summary: "Shipped in releases, not one reveal.",
          description:
            "The software takes shape through short releases you can use and react to. Every one goes through testing, security review, and a controlled rollout. Enterprise-grade code, at AI speed.",
          deliverables: [
            "Working releases",
            "Tests and security review",
            "Handover and support",
          ],
        },
      ],
      cta: "Explore the platform",
    },
  },
  kollektorDeep: {
    eyebrow: "Product · Kollektor",
    title: "A collector on the phone. A live desk for your team.",
    description:
      "Kollektor collects banks' and institutions' asset receivables by phone. It asks for payment, structures a plan with the debtor, and takes the payments that come in. The whole process runs through an AI voice agent. Your team sees the recovery.",
    pipelineLabel: "From list to recovery",
    pipeline: [
      {
        number: "01",
        title: "Import",
        description: "Debtor and receivable lists are pulled from the daily pool. Call jobs start.",
      },
      {
        number: "02",
        title: "Campaign",
        description: "Open a call group. The queue works the file without an agent on every line.",
      },
      {
        number: "03",
        title: "Call",
        description: "The agent verifies identity, and the call stays KVKK-compliant.",
      },
      {
        number: "04",
        title: "Capture",
        description: "Payment promises, collection records, and branching call scenarios are written as they happen.",
      },
      {
        number: "05",
        title: "Escalate",
        description: "Completed calls are recorded as payment, promise, refusal, or another outcome.",
      },
      {
        number: "06",
        title: "Report",
        description: "Completed calls are reported daily. Payments, promises, and other outcomes go to the team.",
      },
    ],
    chapters: [
      {
        title: "Campaigns that start from a list",
        description:
          "Debtors, receivable lists, due dates, and restructuring options are pulled from the database and run automatically.",
      },
      {
        title: "A live voice pipeline",
        description:
          "The call starts, and the debtor talks as if they are speaking to a real call-center agent. The voice on the other end is Kollektor, an AI agent.",
      },
      {
        title: "Not notes — payment promises and collections",
        description:
          "Payment amounts and dates persist as they are spoken. Callback slots are computed — there is no luxury of guessing.",
      },
    ],
    faq: {
      eyebrow: "FAQ",
      title: "About Kollektor",
      items: [
        {
          question: "Is Kollektor KVKK / GDPR compatible?",
          answer:
            "Yes. Kollektor is built for KVKK and GDPR: phones and IDs are masked, transcripts purge on a schedule, and the legal frame sits in the playbook. A DPA and processing addendum are added for your organisation.",
        },
        {
          question: "Do debtors know they have been talking to AI?",
          answer:
            "Measured: 97% of debtors do not realise they spoke to an AI. That multiplies the collection success rate many times over — the call lands like a real call-center agent.",
        },
        {
          question: "How fast is Kollektor?",
          answer:
            "Kollektor can run up to 20 simultaneous calls, in direct proportion to the capacity of the client's FCT call / dial PBX.",
        },
      ],
    },
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
      operatorBody: "A React floor that updates as the call happens. No refresh, no extra wire.",
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
    about: "About",
    rightsReserved: "All rights reserved",
  },
};

export default enMessages;
