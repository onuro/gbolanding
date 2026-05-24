import type { Messages } from "@/i18n/types";

const enMessages: Messages = {
  metadata: {
    title: "GBO Vision | Enterprise AI Solutions",
    description:
      "Enterprise artificial intelligence from GBO Vision, including Kollektor for law firm debt collection and Intelval for business and real estate valuation.",
  },
  nav: {
    badge: "Enterprise AI",
    joinWaitlist: "Join waitlist",
  },
  hero: {
    badge: "Enterprise AI platforms",
    titleLineOne: "Enterprise",
    titleLineTwo: "artificial intelligence",
    description:
      "GBO Vision develops and deploys enterprise AI for regulated industries-from Kollektor, an autonomous agent for law firm debt collection, to Intelval, an AI-driven business and real estate valuation platform.",
  },
  countdown: {
    heading: "Launch countdown",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
  },
  signup: {
    placeholder: "Enter your work email",
    notify: "Notify me",
    sending: "Sending",
    successTitle: "You're on the list",
    successBody:
      "Thanks for your interest in GBO Vision. We'll be in touch with updates on our enterprise AI solutions.",
    errors: {
      required: "Email is required",
      invalid: "Please enter a valid email address",
    },
  },
  features: [
    {
      label: "Legal AI",
      title: "Kollektor",
      body: "An autonomous AI agent for law firms that streamlines debt collection through compliance-aware outreach, case prioritisation, and recovery workflow automation.",
    },
    {
      label: "Valuation",
      title: "Intelval",
      body: "An AI-driven business and real estate valuation platform delivering institutional-grade analysis, market intelligence, and enterprise reporting at scale.",
    },
    {
      label: "Enterprise",
      title: "Built for enterprise",
      body: "Mission-critical AI platforms engineered for your workflows, data infrastructure, and regulatory compliance-not generic SaaS.",
    },
  ],
  footer: {
    rightsReserved: "All rights reserved",
  },
};

export default enMessages;
