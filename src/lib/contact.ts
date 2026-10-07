// The contact form's rules, shared by the page's script (src/components/
// ContactPage.astro) and the endpoint (src/pages/api/contact.ts), so the
// browser and the server can never disagree on what a valid message is.
//
// This module is bundled into client code. It must never hold the recipient
// address, a key or anything else read from the environment: those live in
// the endpoint only.

export const contactProducts = [
  "kollektor",
  "intelval",
  "hastam",
  "fountible",
  "custom",
] as const;

export type ContactProduct = (typeof contactProducts)[number];

export const contactLimits = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  companyMax: 160,
  messageMin: 10,
  messageMax: 4000,
  /**
   * Bytes of request body the endpoint reads. 4,000 characters of Turkish are
   * about 8 KB of UTF-8, and emoji take four bytes each, so this leaves room
   * for the longest valid message plus the other fields.
   */
  bodyMaxBytes: 24 * 1024,
} as const;

/** Name of the hidden field only bots fill in. Not "company": that one is real here. */
export const honeypotField = "website";

/**
 * Without JavaScript the browser posts the form itself. The endpoint then
 * answers 303 back to the page, at one of these fragments, and the page shows
 * that state with CSS alone (:target). The keys other than "sent" are keys of
 * the page's `errors` copy, so each fragment has its own message.
 */
export const contactFallback = {
  sent: "contact-sent",
  invalid: "contact-error-invalid",
  rateLimited: "contact-error-rate-limited",
  unavailable: "contact-error-unavailable",
  submission: "contact-error-failed",
} as const;

export type ContactOutcome = keyof typeof contactFallback;

// The same pattern as /api/waitlist: one @, a dot after it, no spaces.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactField = "name" | "email" | "company" | "product" | "message";
export type ContactFieldError = "required" | "too_short" | "too_long" | "invalid";
export type ContactFieldErrors = Partial<Record<ContactField, ContactFieldError>>;

export interface ContactSubmission {
  name: string;
  email: string;
  /** Empty when the visitor left it blank. */
  company: string;
  /** Null when no topic was picked. */
  product: ContactProduct | null;
  message: string;
}

// C0 and C1 control characters, minus tab and newline. A message keeps its line
// breaks; a name or a subject line keeps none.
const controlChars = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

const asText = (value: unknown) => (typeof value === "string" ? value : "");

/** One line: no control characters, runs of whitespace (newlines too) become one space. */
const oneLine = (value: unknown) =>
  asText(value).replace(controlChars, "").replace(/\s+/g, " ").trim();

/** Keeps the visitor's paragraphs; drops stray control characters. */
const multiLine = (value: unknown) =>
  asText(value)
    .replace(/\r\n?/g, "\n")
    .replace(controlChars, "")
    .replace(/\t/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

export const isContactProduct = (value: unknown): value is ContactProduct =>
  typeof value === "string" && (contactProducts as readonly string[]).includes(value);

/**
 * Normalises and checks one submission. Lengths are counted in UTF-16 code
 * units, as the browser's maxlength counts them, so a message the textarea
 * accepted is never rejected here for being one emoji too long.
 */
export function validateContact(
  input: Record<string, unknown>,
):
  | { ok: true; data: ContactSubmission }
  | { ok: false; errors: ContactFieldErrors } {
  const errors: ContactFieldErrors = {};
  const { nameMin, nameMax, emailMax, companyMax, messageMin, messageMax } =
    contactLimits;

  const name = oneLine(input.name);
  if (!name) errors.name = "required";
  else if (name.length < nameMin) errors.name = "too_short";
  else if (name.length > nameMax) errors.name = "too_long";

  const email = asText(input.email).trim();
  if (!email) errors.email = "required";
  else if (email.length > emailMax || !emailPattern.test(email)) errors.email = "invalid";

  const company = oneLine(input.company);
  if (company.length > companyMax) errors.company = "too_long";

  const rawProduct = asText(input.product).trim();
  let product: ContactProduct | null = null;
  if (rawProduct) {
    if (isContactProduct(rawProduct)) product = rawProduct;
    else errors.product = "invalid";
  }

  const message = multiLine(input.message);
  if (!message) errors.message = "required";
  else if (message.length < messageMin) errors.message = "too_short";
  else if (message.length > messageMax) errors.message = "too_long";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, company, product, message } };
}
