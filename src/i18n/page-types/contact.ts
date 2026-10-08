import type { ContactProduct } from "@/lib/contact";

// The copy shape of /contact and /en/contact. Turkish
// (messages/contact-page.tr.ts) defines the content and English must match it
// key for key.
//
// Rules every string here is written against (the owner, 2026-10-07):
//   - The page publishes the office address and a map link, nothing else: no
//     company phone, no legal name and no e-mail address, in the copy, the markup or
//     the JSON-LD. The form is the only channel, so no error message may
//     offer an e-mail or phone fallback.
//   - The address itself is never typed here; it comes from src/lib/brand.ts.
//   - No reply-time promise ("bir iş günü içinde", "en kısa sürede") until the
//     owner commits to one.
//   - No consent checkbox and no açık rıza: the form only answers the message.
//     If counsel ever wants an acknowledgment, the only wording to use is
//     "Aydınlatma metnini okudum ve anladım." (KVKK Kurul decision 2026/347).
//   - Turkish errors use the -In imperative ("girin"), never -InIz ("giriniz").
// Research behind the wording: docs/contact-page-research.md.

export interface ContactPageMessages {
  /** Own title and description: the page never shares the home page's. */
  metaTitle: string;
  metaDescription: string;
  /** Small line above the h1; also the page's name in navigation. */
  eyebrow: string;
  /** The page's only h1. */
  title: string;
  lead: string;
  form: {
    /** aria-label of the <form>. */
    label: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    /** Marker after an optional field's label, without brackets. */
    optional: string;
    product: {
      legend: string;
      /**
       * The first pill, picked by default: no particular topic. It sends no
       * product, so every state of the group can be reached from the keyboard.
       */
      general: string;
      /** The pill labels. Product names stay as they are in both languages. */
      options: Record<ContactProduct, string>;
    };
    message: string;
    /** The only placeholder: labels stay visible, so the other fields have none. */
    messagePlaceholder: string;
    /** Label of the hidden field only bots fill in (screen readers skip it). */
    honeypot: string;
    submit: string;
    sending: string;
    /** The privacy line under the form. A plain notice: no checkbox. */
    privacy: string;
    /** The sentence that links the privacy notice (/privacy); "{link}" marks
     *  where privacyLinkLabel goes. */
    privacyMore: string;
    privacyLinkLabel: string;
  };
  success: {
    title: string;
    body: string;
    /** Button that clears the form and shows it again. */
    again: string;
  };
  errors: {
    nameRequired: string;
    nameTooLong: string;
    emailRequired: string;
    emailInvalid: string;
    phoneRequired: string;
    phoneInvalid: string;
    companyTooLong: string;
    messageRequired: string;
    messageTooShort: string;
    messageTooLong: string;
    /** The send failed: network, provider or anything unexpected. */
    submission: string;
    /**
     * The server turned the message down. Only seen without JavaScript (the
     * script names the field instead), after the endpoint's redirect.
     */
    invalid: string;
    /** 429 from the endpoint. */
    rateLimited: string;
    /** 503: no mail provider is configured, so nothing can be sent. */
    unavailable: string;
  };
  address: {
    /** The address block's heading. */
    label: string;
    /** Country after the city, as the footer writes it. */
    country: string;
    mapLink: string;
    /** Read after the link text by screen readers only. */
    mapLinkHint: string;
  };
}
