export interface FeatureMessage {
  label: string;
  title: string;
  body: string;
}

export interface Messages {
  metadata: {
    title: string;
    description: string;
  };
  nav: {
    badge: string;
    joinWaitlist: string;
  };
  hero: {
    badge: string;
    titleLineOne: string;
    titleLineTwo: string;
    description: string;
  };
  countdown: {
    heading: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
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
    };
  };
  features: FeatureMessage[];
  footer: {
    rightsReserved: string;
  };
}
