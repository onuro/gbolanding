import type {
  ChapterCopy,
  ProductPageBase,
  RowCopy,
  SayDoCopy,
} from "@/i18n/page-types/shared";

// The copy shape of /kollektor. Each section's slice sits here and is filled in
// messages/kollektor-page.tr.ts and messages/kollektor-page.en.ts. Mock labels
// live here too: a picture on this page must never say something the copy
// around it does not.

/** A label and its value inside a mock. */
export interface PairCopy {
  label: string;
  value: string;
}

/** One line of a sample conversation. */
export interface LineCopy {
  who: string;
  text: string;
}

/** A fact under the sample call: a short value and the sentence behind it. */
export interface ProofCopy {
  value: string;
  caption: string;
}

/** One sample person in a list mock. Fictional, and the mock says so. */
export interface SampleRowCopy {
  name: string;
  /** Second column: a masked phone or a time. */
  detail: string;
  /** Third column: an amount, or empty. */
  amount: string;
  /** What the row's dot says. */
  state: string;
  /** done: nothing to do. wait: a person has to act. off: left out. */
  tone: "done" | "wait" | "off";
}

/** One call in the team screen's list. Fictional, and the mock says so. */
export interface CallRowCopy {
  name: string;
  /** When the call started. */
  time: string;
  /** How long it lasted. A dash when nobody picked up. */
  length: string;
  /** The result, in the product's own word. */
  state: string;
  tone: SampleRowCopy["tone"];
}

export interface KollektorPageMessages extends ProductPageBase {
  /** The hero picture: three named objects, numbered like the three steps. */
  heroPicture: {
    /** What a screen reader gets instead of the picture. */
    summary: string;
    /** Whose phone, whose voice, whose screen. Same order as hero.steps. */
    labels: [string, string, string];
    agent: LineCopy;
    debtor: LineCopy;
    /** Says the captions are translated. Empty on the Turkish page. */
    translated: string;
    cardTitle: string;
    cardRows: PairCopy[];
    cardFoot: string;
  };

  /** One call from start to finish: the scripted demo. */
  call: ChapterCopy & {
    /** Says which parts of the sample call are settings, not defaults. */
    caption: string;
    /** The button that plays the call, and the same button while it plays.
     *  The call never starts by itself on this page. */
    play: string;
    pause: string;
    proof: [ProofCopy, ProofCopy, ProofCopy];
  };

  /** From the list to the first call. */
  start: ChapterCopy & {
    rows: RowCopy[];
    mock: {
      summary: string;
      /** Whose screen the mock shows. */
      owner: string;
      window: string;
      file: string;
      steps: [string, string, string];
      columns: [string, string, string, string];
      rows: SampleRowCopy[];
      foot: string;
      next: string;
    };
  };

  /** What the debtor says, what Kollektor does. */
  onCall: ChapterCopy & {
    sayLabel: string;
    doLabel: string;
    rows: SayDoCopy[];
  };

  /** What the team sees. The chapter is wide, so `note` is printed under the
   *  picture instead of in the margin. */
  team: ChapterCopy & {
    rows: RowCopy[];
    mock: {
      summary: string;
      owner: string;
      window: string;
      range: string;
      /** Name, time, length, result. */
      columns: [string, string, string, string];
      rows: CallRowCopy[];
      detailTitle: string;
      detailRows: PairCopy[];
      recording: string;
      duration: string;
      lines: LineCopy[];
    };
  };

  /** When a person steps in. */
  handoff: ChapterCopy & {
    rows: RowCopy[];
    mock: {
      summary: string;
      owner: string;
      window: string;
      ringing: string;
      name: string;
      meta: string;
      lines: LineCopy[];
      take: string;
      foot: string;
    };
  };

  /** The rules the customer sets. */
  rules: ChapterCopy & { rows: RowCopy[] };

  /** Data and control: three mechanisms, each with a small picture. */
  data: ChapterCopy & {
    items: [RowCopy, RowCopy, RowCopy];
    pictures: {
      logSummary: string;
      logTitle: string;
      logRows: PairCopy[];
      keepSummary: string;
      keepFrom: PairCopy;
      keepTo: PairCopy;
      keepItems: string[];
      roleSummary: string;
      roleTitle: string;
      roleColumns: [string, string];
      /** value: "rw" read and write, "r" read only, "" no access. */
      roleRows: PairCopy[];
    };
  };

  /** Who it is for. */
  audience: ChapterCopy & { rows: RowCopy[]; imageAlt: string };
}
