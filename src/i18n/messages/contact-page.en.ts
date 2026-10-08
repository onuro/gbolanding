import type { ContactPageMessages } from "@/i18n/page-types/contact";

// /en/contact. Matches contact-page.tr.ts key for key; the rules are in the
// header of page-types/contact.ts. "{n}" in an error is replaced with the
// limit from src/lib/contact.ts, in English number format (4,000).
const contactPage: ContactPageMessages = {
  metaTitle: "Contact | Write to us | GBO Vision",
  metaDescription:
    "Write to GBO Vision about your AI project or our products through the contact form. We reply by email. Our office is in Ataşehir, Istanbul.",
  eyebrow: "Contact",
  title: "Write to us.",
  lead: "Tell us in a few sentences about the work you want AI to speed up, or ask about our products. We read your message and reply by email.",
  form: {
    label: "Contact form",
    name: "Full name",
    email: "Email",
    phone: "Phone number",
    company: "Company",
    optional: "optional",
    product: {
      legend: "Topic",
      general: "General",
      options: {
        kollektor: "Kollektor",
        intelval: "Intelval",
        hastam: "Hastam",
        fountible: "Fountible",
        custom: "Custom software",
      },
    },
    message: "Message",
    messagePlaceholder: "Tell us briefly what you need",
    honeypot: "Leave this field empty",
    submit: "Send message",
    sending: "Sending…",
    privacy: "We use the details in this form only to reply to your message.",
    privacyMore: "See the {link} for details.",
    privacyLinkLabel: "privacy notice",
  },
  success: {
    title: "Message received",
    body: "Thank you. We’ll read your message and reply by email.",
    again: "Write another message",
  },
  errors: {
    nameRequired: "Enter your full name.",
    nameTooLong: "Your name can be up to {n} characters.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    phoneRequired: "Enter your phone number.",
    phoneInvalid: "Enter a valid phone number.",
    companyTooLong: "The company name can be up to {n} characters.",
    messageRequired: "Write your message.",
    messageTooShort: "Your message needs at least {n} characters.",
    messageTooLong: "Your message can be up to {n} characters.",
    submission: "We couldn’t send your message. Try again shortly.",
    invalid: "We couldn’t send your message. Check the form and try again.",
    rateLimited: "Too many messages in a short time. Try again in a few minutes.",
    unavailable: "Messages can’t be sent right now. Please try again later.",
  },
  address: {
    label: "Our office",
    country: "Turkey",
    mapLink: "Open in Maps",
    mapLinkHint: "Google Maps, opens in a new tab",
  },
};

export default contactPage;
