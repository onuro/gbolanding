import type {
  ChapterCopy,
  ProductPageBase,
  RowCopy,
  SayDoCopy,
} from "@/i18n/page-types/shared";

// The copy shape of /hastam. Turkish (messages/hastam-page.tr.ts) defines the
// content and English must match it key for key.
//
// Truth rules every string here is written against (hastam-site/CLAUDE.md and
// the product itself): a phone booking is a REQUEST the clinic approves; a
// complaint is routed to a department, never assessed; in an emergency the
// assistant says 112 first; numbers are product defaults only. The clinic,
// the people and the hours in the pictures are invented, and each picture
// says so once.

/** Chip colours inside the pictures: waiting on a person, done, or neutral. */
export type HastamTone = "pending" | "ok" | "info";

/** Who speaks a line: the assistant or the patient. */
export type HastamSpeaker = "ai" | "pt";

/** One scripted call on the hero picture. */
export interface HastamHeroScene {
  /** Tab label, and the scene's name for screen readers. */
  tab: string;
  /** "in": the patient rings the clinic. "out": Hastam rings the patient. */
  dir: "in" | "out";
  patient: string;
  turns: { who: HastamSpeaker; text: string }[];
  /** What the call leaves on the clinic's screen. */
  outcome: {
    /** Which screen of the dashboard it lands on. */
    area: string;
    meta: string;
    when: string;
    status: string;
    tone: HastamTone;
    action: string;
  };
}

export interface HastamHeroCallsCopy {
  label: string;
  /** Read by screen readers in place of the moving picture. */
  description: string;
  tabsLabel: string;
  pause: string;
  play: string;
  /** The three named objects in the picture. */
  phoneLabel: string;
  talkLabel: string;
  screenLabel: string;
  clinic: string;
  clinicInitials: string;
  line: string;
  inbound: string;
  outbound: string;
  speakers: Record<HastamSpeaker, string>;
  scenes: HastamHeroScene[];
}

/**
 * The call HastamDemo plays on this page, in place of the home page's. The
 * component keeps its own schedule, so the nine lines must alternate assistant
 * and patient, starting with the assistant, and stay inside the word budgets
 * written beside `timing` in HastamDemo.astro.
 *
 * It is a reschedule, and the same call as the hero's second tab (same
 * patient, doctor and times): the hero's first call and the approval picture
 * already show a new request, and a third telling of it made the page read as
 * an appointment bot.
 */
export interface HastamDemoScenario {
  heading: string;
  description: string;
  stageLabel: string;
  /** Visible label of the replay button, and its label while the call plays. */
  replay: string;
  pause: string;
  agentName: string;
  /** The caller's number as the clinic sees it. Always masked. */
  callerPhone: string;
  lines: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  /**
   * The first card of the call steps: why the patient rang, in their own
   * words. A complaint or a wish; never a verdict on either.
   */
  complaint: {
    title: string;
    listening: string;
    noted: string;
    before: string;
    after: string;
  };
  steps: [
    { title: string; detail: string },
    { title: string },
    { title: string; detail: string; pending: string },
  ];
  slots: [string, string, string];
  chosen: string;
  receipt: {
    label: string;
    when: string;
    status: string;
    rows: { label: string; value: string }[];
    id: string;
    note: string;
  };
  phone: { clinic: string; line: string };
}

export interface HastamApprovalMockCopy {
  label: string;
  screenLabel: string;
  phoneLabel: string;
  calendarTitle: string;
  calendarMeta: string;
  /** Appointments already on the calendar around the request. */
  booked: { time: string; name: string; kind: string }[];
  lunch: { time: string; label: string };
  request: { time: string; name: string; meta: string };
  status: { pending: string; approved: string; declined: string };
  approve: string;
  decline: string;
  undo: string;
  clinic: string;
  clinicInitials: string;
  /** The patient's phone, one block per decision. */
  call: {
    pending: { chip: string; text: string };
    approved: { chip: string; said: string; result: string };
    declined: { chip: string; text: string; result: string };
  };
}

export interface HastamOutboundMockCopy {
  ladder: {
    label: string;
    attempts: { label: string; time: string; result: string; tone: HastamTone }[];
    gaps: string[];
  };
  hours: {
    label: string;
    window: string;
    ticks: string[];
    due: string;
    deferred: string;
    next: string;
  };
  caps: {
    label: string;
    setting: string;
    day: string;
    week: string;
  };
}

export interface HastamPageMessages extends ProductPageBase {
  heroCalls: HastamHeroCallsCopy;
  /** One call from start to finish: the scripted demo and three facts under it. */
  call: ChapterCopy & {
    demo: HastamDemoScenario;
    proof: [
      { value: string; caption: string },
      { value: string; caption: string },
      { value: string; caption: string },
    ];
  };
  /** What the patient says, what Hastam does. */
  heard: ChapterCopy & {
    sayLabel: string;
    doLabel: string;
    rows: SayDoCopy[];
  };
  /** Request, approval on the calendar, confirmation call. */
  approval: ChapterCopy & {
    steps: [RowCopy, RowCopy, RowCopy];
    mock: HastamApprovalMockCopy;
  };
  /** The calls Hastam places itself, and the defaults that hold them back. */
  outbound: ChapterCopy & {
    rows: RowCopy[];
    facts: [RowCopy, RowCopy, RowCopy];
    mock: HastamOutboundMockCopy;
  };
  rules: ChapterCopy & { items: RowCopy[] };
  /** The row that names the parent company and links to hastam.ai. */
  parent: ChapterCopy & { linkLabel: string; externalHint: string };
}
