import type { PrivacyPageMessages } from "@/i18n/page-types/privacy";

// /en/privacy: an English translation of the Turkish privacy notice, which is
// the binding text. Keep it key for key with privacy-page.tr.ts.
const privacyPage: PrivacyPageMessages = {
  metaTitle: "Privacy notice for the contact form | GBO Vision",
  metaDescription:
    "How GBO Vision processes the personal data you send through its contact form, on what legal grounds, and your rights under Türkiye’s KVKK law.",
  eyebrow: "Privacy",
  title: "Contact form privacy notice",
  lead: "This notice explains how we process the personal data you send us through the contact form on gbovision.com, as Article 10 of Türkiye’s Personal Data Protection Law No. 6698 (KVKK) requires.",
  updated: "Last updated: 7 October 2026",
  translationNote: "This is a translation. The Turkish text is the binding one.",
  sections: [
    {
      title: "Data controller",
      paragraphs: [
        "Your personal data is processed by GB Baskı ve Servis Hizmetleri Anonim Şirketi (“GBO Vision”) as the data controller.",
        "Our address: {address}.",
      ],
    },
    {
      title: "The personal data we process",
      paragraphs: ["When you fill in the contact form, we process:"],
      items: [
        "Identity: your first and last name.",
        "Contact: your e-mail address.",
        "Company: the name of your company, if you choose to give it.",
        "Request: the topic you pick and the content of your message.",
        "Transaction security: your IP address, to protect the form against abuse.",
      ],
      after: [
        "Please do not include other people’s personal data or special categories of your own data, such as health information, in your message.",
      ],
    },
    {
      title: "Why we process it",
      paragraphs: ["We process your data only to:"],
      items: [
        "Read your message and reply to you.",
        "Assess your request about our products or services and contact you about it.",
        "Keep the form secure and prevent its misuse.",
      ],
      after: ["We do not use your data to send marketing e-mails or other commercial electronic messages."],
    },
    {
      title: "How we collect it and the legal grounds",
      paragraphs: [
        "Your data is collected electronically when you fill in and send the contact form.",
        "We process it on these grounds in Article 5(2) of the KVKK:",
      ],
      items: [
        "(c): where your request concerns a product or service, processing directly related to entering into a contract.",
        "(f): our legitimate interest in replying to your message and keeping the form secure, provided it does not harm your fundamental rights and freedoms.",
      ],
    },
    {
      title: "Who receives it",
      paragraphs: [
        "We do not sell your data or share it with anyone for marketing. The providers we use to run the form process it only to provide that service:",
      ],
      items: [
        "Vercel Inc.: hosting for our website.",
        "Resend: the e-mail delivery service that forwards your message to us.",
        "Google LLC (Google Workspace): the business e-mail service where your message arrives.",
      ],
      after: [
        "These providers’ servers may be located outside Türkiye. In that case your data is transferred abroad in line with the rules in Article 9 of the KVKK.",
        "Your data may also be disclosed to public authorities with legal power to request it, to the extent the law allows.",
      ],
    },
    {
      title: "How long we keep it",
      paragraphs: [
        "We keep your message and details until your request is resolved and then for the statutory limitation period for possible disputes. After that we delete or anonymise them.",
      ],
    },
    {
      title: "Your rights under the KVKK",
      paragraphs: ["Under Article 11 of the KVKK you can ask us to:"],
      items: [
        "Tell you whether your personal data is processed.",
        "Give you information about that processing.",
        "Tell you the purpose of processing and whether the data is used for it.",
        "Name the third parties in Türkiye or abroad that received your data.",
        "Correct your data if it is incomplete or wrong.",
        "Delete or destroy your data under the conditions in Article 7 of the KVKK.",
        "Notify the third parties that received your data of a correction, deletion or destruction.",
        "Hear your objection to a result against you that arises only from automated analysis.",
        "Compensate you for damage caused by unlawful processing.",
      ],
    },
    {
      title: "How to apply",
      paragraphs: [
        "You can send your request in writing to the address above, as the Communiqué on the Procedures and Principles for Applications to the Data Controller provides, or write to us through the contact form.",
        "We answer within 30 days at the latest and free of charge. If the request involves an extra cost, the fee set by the Personal Data Protection Board may be charged.",
      ],
    },
  ],
};

export default privacyPage;
