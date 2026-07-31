export interface SolutionMessage {
  eyebrow: string;
  title: string;
  description: string;
  highlights: [string, string, string];
  cta: string;
}

export interface CapabilityMessage {
  title: string;
  description: string;
}

export interface ApproachStepMessage {
  number: string;
  title: string;
  description: string;
}

export interface Messages {
  metadata: {
    title: string;
    description: string;
  };
  nav: {
    solutions: string;
    platform: string;
    method: string;
    languageLabel: string;
    scheduleDemo: string;
  };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    status: string;
  };
  proofStrip: {
    label: string;
    items: [string, string, string, string];
  };
  intro: {
    eyebrow: string;
    title: string;
    description: string;
  };
  solutions: {
    kollektor: SolutionMessage;
    intelval: SolutionMessage;
    enterprise: SolutionMessage;
  };
  platform: {
    eyebrow: string;
    title: string;
    description: string;
    capabilities: [
      CapabilityMessage,
      CapabilityMessage,
      CapabilityMessage,
      CapabilityMessage,
      CapabilityMessage,
      CapabilityMessage,
    ];
  };
  approach: {
    eyebrow: string;
    title: string;
    description: string;
    steps: [
      ApproachStepMessage,
      ApproachStepMessage,
      ApproachStepMessage,
      ApproachStepMessage,
    ];
  };
  signup: {
    placeholder: string;
    notify: string;
    sending: string;
    successTitle: string;
    successBody: string;
    errors: {
      required: string;
      invalid: string;
      submission: string;
    };
  };
  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    tagline: string;
    solutions: string;
    platform: string;
    method: string;
    rightsReserved: string;
  };
}
