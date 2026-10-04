import type { HastamPageMessages } from "@/i18n/page-types/hastam";
import type { KollektorPageMessages } from "@/i18n/page-types/kollektor";

export interface SolutionMessage {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  cta: string;
}

/** A product that has its own page: the card also links there. */
export interface ProductSolutionMessage extends SolutionMessage {
  /** Label of the link to the product's page (/kollektor, /hastam). */
  pageCta: string;
}

export interface HastamSolutionMessage extends ProductSolutionMessage {
  headline: string;
  support: string;
  imageAlt: string;
  steps: { title: string; description: string }[];
}

export interface EnterprisePhaseMessage {
  number: string;
  title: string;
  /** One line for the tab rail. */
  summary: string;
  description: string;
  deliverables: [string, string, string];
}

export interface EnterpriseSolutionMessage {
  eyebrow: string;
  title: string;
  description: string;
  phases: [
    EnterprisePhaseMessage,
    EnterprisePhaseMessage,
    EnterprisePhaseMessage,
    EnterprisePhaseMessage,
  ];
  cta: string;
}

export interface IndustryStatMessage {
  value: string;
  lead: string;
  rest: string;
}

export interface IndustryItemMessage {
  title: string;
  badge: string;
  description: string;
  imageAlt: string;
  stats: [IndustryStatMessage, IndustryStatMessage];
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

export interface AboutMessages {
  /** Own title/description: /about must never share the home page's metadata. */
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  /** Names the company in the first sentence, in both spellings. */
  lead: string;
  bodyTitle: string;
  body: [string, string];
  productsTitle: string;
  productsIntro: string;
  factsTitle: string;
  factLabels: {
    legalName: string;
    based: string;
    languages: string;
    products: string;
    contact: string;
    site: string;
  };
  factValues: {
    based: string;
    languages: string;
    products: string;
  };
}

export interface Messages {
  metadata: {
    title: string;
    description: string;
  };
  about: AboutMessages;
  /** /kollektor and /hastam. Their copy lives in messages/<product>-page.*.ts. */
  kollektorPage: KollektorPageMessages;
  hastamPage: HastamPageMessages;
  nav: {
    solutions: string;
    kollektor: string;
    hastam: string;
    method: string;
    about: string;
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
    voiceIdle: string;
    voiceConnecting: string;
    voiceLive: string;
    voiceError: string;
    voiceMicDenied: string;
    voiceMicMissing: string;
    voiceMicError: string;
    voiceMicInsecure: string;
    voiceSoundBlocked: string;
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
    kollektor: ProductSolutionMessage;
    intelval: SolutionMessage;
    hastam: HastamSolutionMessage;
    enterprise: EnterpriseSolutionMessage;
  };
  industries: {
    eyebrow: string;
    title: string;
    description: string;
    items: [
      IndustryItemMessage,
      IndustryItemMessage,
      IndustryItemMessage,
      IndustryItemMessage,
    ];
  };
  kollektorDeep: {
    eyebrow: string;
    title: string;
    description: string;
    pipelineLabel: string;
    pipeline: [
      ApproachStepMessage,
      ApproachStepMessage,
      ApproachStepMessage,
      ApproachStepMessage,
      ApproachStepMessage,
      ApproachStepMessage,
    ];
    chapters: [
      CapabilityMessage,
      CapabilityMessage,
      CapabilityMessage,
    ];
    faq: {
      eyebrow: string;
      title: string;
      items: [
        { question: string; answer: string },
        { question: string; answer: string },
        { question: string; answer: string },
      ];
    };
    split: {
      eyebrow: string;
      title: string;
      description: string;
      debtorTitle: string;
      debtorBody: string;
      debtorBeats: [string, string, string, string];
      operatorTitle: string;
      operatorBody: string;
      operatorBeats: [string, string, string, string];
    };
    guardrails: {
      title: string;
      items: [
        CapabilityMessage,
        CapabilityMessage,
        CapabilityMessage,
      ];
    };
    cta: string;
  };
  platform: {
    eyebrow: string;
    title: string;
    description: string;
    /** The word before each drawing's number, as in "Fig 0.1". */
    figure: string;
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
  /**
   * The demo request as a product page closes with it (ProductPageShell). The
   * home page keeps `finalCta`; a product page that reused it would end on a
   * headline about "your next business problem" instead of the product.
   */
  productCta: {
    kollektor: { title: string; description: string };
    hastam: { title: string; description: string };
    /** Label of the link back to the home page's list of solutions. */
    secondaryCta: string;
    /**
     * Kollektor's line under the product pills on product pages. It promises
     * only what every flow does (call, confirm, record). The home page still
     * shows ProductPicker's own line, which also names payment plans.
     */
    kollektorNote: string;
  };
  footer: {
    tagline: string;
    solutions: string;
    kollektor: string;
    hastam: string;
    platform: string;
    method: string;
    about: string;
    rightsReserved: string;
  };
}
