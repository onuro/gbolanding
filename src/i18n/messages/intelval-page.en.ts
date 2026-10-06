import type { IntelvalPageMessages } from "@/i18n/page-types/intelval";

// /en/intelval. Same shape and same claims as intelval-page.tr.ts: Intelval
// reads, works out the value, drafts and checks; the licensed valuer who
// inspected the property reviews, edits and signs. The only legal facts are
// the verified ones listed in the Turkish file's header. Turkish terms stay
// only where an English reader needs the name, glossed once (TAKS/KAKS,
// kat karşılığı, yasal durum değeri, kentsel dönüşüm, BDDK, SPK, TKGM).
// The report mock shows the sample draft's paragraph in Turkish and English
// on both pages (draftParagraph in sample-file.ts). The site note, the deed
// and the calls are translations of Turkish originals. The Göztepe flat
// (IV-0587), its comparables, the deed and the owner are invented sample
// data; its facts live in sample-file.ts and copy names them by token.
const intelvalPage: IntelvalPageMessages = {
  metaTitle: "Intelval: AI for Property Valuation Firms | GBO Vision",
  metaDescription:
    "Intelval is GBO Vision’s valuation AI (gbovision.com). It reads documents, works out the value and drafts reports in each bank’s template. The valuer signs.",
  hero: {
    eyebrow: "For licensed valuation firms",
    title: "Intelval drafts the report. Your valuer signs it.",
    lead: "Intelval reads the documents and works out the value. It writes the draft in the bank’s template and checks it. The valuer who inspected the property reviews the draft and signs the report.",
    chips: ["Homes, land and commercial", "Each bank’s own template", "The valuer signs"],
    primaryCta: "Request a demo",
    secondaryCta: "See the sample file",
    steps: [
      {
        title: "It reads the documents and the site note.",
        description:
          "It pulls the facts from the deed, the zoning and the plans, and writes up the spoken note.",
      },
      {
        title: "It works out the value and writes the draft.",
        description:
          "It adjusts the comparables, works out both values and drafts in the bank’s template.",
      },
      {
        title: "Your valuer reviews and signs.",
        description: "The valuer who inspected the property edits the draft and signs the report.",
      },
    ],
  },
  heroPicture: {
    label:
      "Sample valuation file. The valuer inspects the flat on site and records a voice note. Intelval reads the note and the title deed, works out the value and writes the draft. The draft waits for the valuer to sign it.",
    labels: ["The valuer on site", "What Intelval reads", "Your firm’s screen"],
    // The same balcony the field picture flags: 135 m² on site, 128 in the
    // plans. Two sentences quoted word for word from field.mock.transcript.
    note: { who: "Spoken site note", text: "The balcony was closed in and joined to a room. I measured {site} square metres on site." },
    // Worded as the deed card's line: "First-rank" broke at its hyphen.
    deed: { who: "Title deed", text: "Block 1043, parcel 27 · Mortgage, first rank" },
    cardTitle: "Draft report ready",
    marketLabel: "Market value",
    legalLabel: "Legal-status value",
    compsLabel: "Comparables",
    compsValue: "{comps} properties",
    million: "million TL",
    // The draft stops where the valuer's work begins: nothing is signed here.
    cardFoot: "{file} · Valuer to sign",
  },
  reads: {
    label: "Documents",
    title: "Intelval reads the documents in the file and pulls out what the report needs.",
    lead: "Title deed, zoning certificate, approved plans, permits and earlier reports. Your valuer finds each fact in the file, linked to the document it came from.",
    noteTitle: "How to read this",
    note: "On the left, the document. On the right, what Intelval pulls out of it.",
    sayLabel: "Document",
    doLabel: "What Intelval pulls out",
    rows: [
      {
        say: "Title deed",
        title: "Pulls out the owner, the share and the encumbrances.",
        description:
          "It lists every mortgage, attachment and annotation. It writes the block, the parcel and the type of property into the report.",
      },
      {
        say: "Zoning certificate",
        title: "Pulls out the zoning rules.",
        description:
          "It reads the site coverage ratio (TAKS), the floor area ratio (KAKS), the number of floors and the plan notes. All of it goes into the zoning section of the report.",
      },
      {
        say: "Approved plans, building permit and occupancy permit",
        title: "Pulls out the legal status.",
        description:
          "It reads the area, the floor count and the permit details. What the valuer sees on site is checked against them.",
      },
      {
        say: "Earlier reports on the same property",
        title: "Shows what has changed.",
        description:
          "It sets the earlier report beside today’s file. It marks a change in the area, the owner or the encumbrances.",
      },
    ],
    mock: {
      label:
        "Sample title deed. Intelval reads the owner, the share and the encumbrances. The mortgage is noted for information. The annotation goes to the valuer.",
      owner: "The valuer’s screen",
      title: "Title deed",
      meta: "{file} · {place}",
      fieldsLabel: "Fields read",
      // Parcel, share and owner are invented; the owner's name is masked.
      fields: [
        { label: "Block / Parcel", value: "1043 / 27" },
        { label: "Type", value: "Residential" },
        { label: "Unit", value: "{floor} · No. 9" },
        { label: "Land share", value: "40/1000" },
        { label: "Owner", value: "A*** Y***" },
        { label: "Share", value: "1/1" },
      ],
      encumbrancesLabel: "Encumbrances",
      // Which line is flagged is in sample-file.ts (deedTones).
      encumbrances: [
        { kind: "Mortgage", detail: "First rank, in favour of a bank" },
        { kind: "Attachment", detail: "None recorded" },
        { kind: "Annotation", detail: "Family home annotation" },
        { kind: "Declaration", detail: "Management plan" },
      ],
      footnote: "Each line is linked to the place on the deed it was read from.",
    },
  },
  field: {
    label: "On site",
    title: "The valuer walks the property. Intelval puts what they see into the report.",
    lead: "It sorts the photos and checks the property as built against the approved plans. It writes the valuer’s spoken note into the report fields.",
    noteTitle: "In the picture",
    note: "The valuer’s spoken note fills the report fields. Any difference from the approved plans is flagged.",
    rows: [
      {
        title: "Builds the photo page.",
        description:
          "It sorts the photos into interior and exterior shots, then room by room. If a photo is missing, it tells the valuer.",
      },
      {
        title: "Checks the property against the approved plans.",
        description:
          "It flags changes made without a permit, flats joined into one and extra floors.",
      },
      {
        title: "Notes the condition of the building.",
        description:
          "It writes up the kitchen, the bathroom and the facade. Signs of damp and cracks get a note of their own.",
      },
      {
        title: "Writes the spoken note into the report.",
        description:
          "The valuer talks on site and the report fields fill themselves in. It uses the same voice AI as Kollektor and Hastam, GBO’s other products.",
      },
    ],
    mock: {
      label:
        "Sample site note. The valuer speaks. Intelval writes the note into the report fields and lays out the photos room by room. It flags that the balcony was joined to a room.",
      owner: "The valuer’s phone",
      title: "Site note",
      meta: "{file} · {rooms} · {floor} · {built}",
      transcriptLabel: "The valuer’s spoken note",
      // Matches the sample file: renovated kitchen and bath (E-04's condition
      // adjustment) and the balcony joined to a room (135 against 128 m²). The
      // measured area is the token, so the note says what the flag compares.
      transcript:
        "Fourth floor, facing south. Kitchen and bathroom renovated. The balcony was closed in and joined to a room. I measured {site} square metres on site. Slight damp on the bathroom ceiling. I saw no cracks in the facade.",
      fieldsLabel: "Report fields filled",
      fields: [
        { label: "Facing", value: "South" },
        { label: "Kitchen", value: "Renovated" },
        { label: "Bathroom", value: "Renovated\u00a0· damp on ceiling" },
        { label: "Facade", value: "No cracks" },
        { label: "Balcony", value: "Joined to a room" },
      ],
      photosLabel: "Photo page",
      photos: ["Facade", "Entrance", "Living room", "Kitchen", "Room 1", "Room 2", "Room 3", "Bathroom"],
      flag: {
        title: "Site differs from the approved plans",
        detail: "The balcony was joined to a room. {site} m² on site, {legal} m² in the approved plans.",
      },
    },
  },
  // Wide chapter: no margin column, so the note is the mock's own, printed
  // under the comparables table.
  value: {
    label: "Value",
    title: "Intelval does the sums and shows the valuer every step.",
    lead: "It works out two values together: the market value of the property as it stands, and its legal-status value (yasal durum değeri), which counts only what the approved plans allow. It also tests the result against the cost and income approaches.",
    rows: [
      {
        title: "Finds comparable properties.",
        description:
          "It gathers comparables from listings and your firm’s earlier reports. It drops duplicate listings, takes the bargaining discount off asking prices and puts each comparable on the map.",
      },
      {
        title: "Builds the adjustment table.",
        description:
          "It adjusts for time, location, size, age, floor, view and condition. It writes down the reason for each adjustment.",
      },
      {
        title: "Works on land and commercial property too.",
        description:
          "For land, it works out the landowner’s and the contractor’s shares in a flats-for-land deal (kat karşılığı) and runs the development calculation (residual value). For commercial property, it works out the value from the rental income.",
      },
      {
        title: "Works out both values together.",
        description:
          "It sets the market value of the property as it stands beside its legal-status value. It tests the result against the cost and income approaches.",
      },
    ],
    mock: {
      label:
        "Sample comparables table. The bargaining discount and the adjustments bring {comps} comparables to one value per m². Under it, a street map shows the flat and the comparables. The market value, the legal-status value and two approaches used as checks are there too.",
      owner: "The valuer’s screen",
      title: "Comparables",
      meta: "{file} · {place}",
      columns: {
        comp: "Comparable",
        source: "Source",
        area: "Area",
        price: "Price",
        discount: "Discount",
        adjustment: "Adjustment",
        unitPrice: "Unit value",
      },
      kinds: { listing: "Listing", archive: "From a firm report" },
      adjustments: {
        time: "Time",
        location: "Location",
        size: "Size",
        age: "Age",
        floor: "Floor",
        condition: "Condition",
      },
      averageLabel: "Average unit value",
      marketLabel: "Market value (as is)",
      legalLabel: "Legal-status value",
      checksLabel: "Cross-checks only",
      costLabel: "Cost approach",
      incomeLabel: "Income approach",
      perSqm: "TL/m²",
      million: "million TL",
      mapLegend: { subject: "Flat being valued", comp: "Comparable" },
      // IVS warns against averaging divergent approaches: say it once here.
      note: "In this file the value comes from the sales comparison approach. The cost and income approaches are cross-checks only. They are not averaged in.",
    },
  },
  writes: {
    label: "Draft",
    title: "The draft is written in the bank’s own template.",
    lead: "Intelval writes the draft in each bank’s own template. It also explains why the comparables and the adjustments were chosen.",
    noteTitle: "In the picture",
    note: "A page of the draft, with the same page in Turkish behind it. Marked figures are linked to their sources.",
    rows: [
      {
        title: "Writes in the bank’s template.",
        description:
          "The draft comes out in each bank’s own report template. Your valuer does not start from a blank page.",
      },
      {
        title: "Drafts the reasoning.",
        description:
          "Why these comparables and why these adjustments, in plain words. Under the International Valuation Standards (IVS), the valuer must explain how they reached the value. The valuer reads the draft reasoning and makes it their own.",
      },
      {
        title: "Writes in English too.",
        description:
          "It drafts reports in English for sales to foreign buyers and for citizenship applications. A circular from TKGM, the land registry, asks these reports to show the comparables on a satellite map.",
      },
    ],
    mock: {
      label:
        "Sample draft report, one page in the bank’s template. At the top are a photo of the living room, the market value and the legal-status value. Below them is the reason for the choice of comparables. Marked figures link to their source. The signature box is empty and waits for the valuer. Behind it is the same page in Turkish.",
      owner: "The valuer’s screen",
      title: "Draft report",
      meta: "{file} · Draft",
      templateLabel: "Template",
      template: "Bank · mortgage valuation report",
      languagesLabel: "Language",
      // The paragraph is the sample report's own text: it lives in
      // sample-file.ts (draftParagraph).
      languages: { tr: "Turkish", en: "English" },
      sourceHint: "Each marked figure is linked to its source.",
      marketLabel: "Market value",
      legalLabel: "Legal-status value",
      million: "million TL",
      // The balcony joined to a room: the two values rest on two areas.
      siteArea: "{site} m² on site",
      legalArea: "{legal} m² in the approved plans",
      // The valuer signs; on the draft the box is empty.
      signLabel: "Responsible valuer",
      signState: "Awaiting signature",
    },
  },
  checks: {
    label: "Checks",
    title: "Intelval checks the draft before it goes out.",
    lead: "It shows the source of every figure. It compares the value with official values and explains the gap between two reports.",
    noteTitle: "In the picture",
    note: "The checklist of the sample file. Flagged lines wait for the valuer’s decision.",
    rows: [
      {
        title: "Every figure shows its source.",
        description:
          "For each number in the report, you see which document or comparable it came from. Türkiye’s Capital Markets Board (SPK) says a firm’s working papers must support the report’s conclusion.",
      },
      {
        title: "Checks before delivery.",
        description:
          "It lists missing details, conflicts and anything that does not meet the bank’s requirements. The list goes to your firm’s reviewer.",
      },
      {
        title: "Flags a gap from official values.",
        description:
          "It compares the value with the property tax value and the land registry’s value map. If there is a gap, it tells the valuer.",
      },
      {
        title: "Checks reports that reach the bank.",
        description:
          // BDDK's first mention on the page, so it is glossed here.
          "Under the valuation regulation of BDDK, Türkiye’s banking regulator (Article 20/2), a property above 10 million TL needs reports from two different firms. If they differ by more than 10%, a third firm values it. Intelval explains the gap between the two reports.",
      },
    ],
    mock: {
      label:
        "Sample checklist of {checks} checks: {passed} passed, {informed} for information, {flagged} waiting for the valuer’s decision.",
      owner: "The reviewer’s screen",
      title: "Pre-delivery check",
      meta: "{file} · Before signing",
      // What each check found is in sample-file.ts (checkTones); the label and
      // the summary name its counts by token.
      items: [
        {
          text: "Every figure has a source",
          detail: "Each number in the report links to a document or a comparable.",
        },
        {
          text: "Bank template complete",
          detail: "Every field the bank asks for is filled in.",
        },
        {
          text: "Compared with official values",
          detail: "The property tax value and the land registry’s value map are set side by side.",
        },
        {
          text: "Area differs from the approved plans",
          detail: "{site} m² on site, {legal} m² in the approved plans. The draft carries both the market value and the legal-status value.",
        },
        {
          text: "Missing information",
          detail: "The occupancy permit date cannot be read on the document. The valuer has been asked.",
        },
      ],
      summary: "{flagged} issues wait for the valuer’s decision.",
    },
  },
  signoff: {
    label: "Signature",
    title: "The valuer who inspected the property signs the report.",
    lead: "Intelval writes the draft. The valuer reads it, changes what they want and signs the report.",
    noteTitle: "Article 14 of BDDK’s valuation regulation",
    note: "Under this rule from Türkiye’s banking regulator, the valuers who personally run the job and inspect the property on site prepare and sign the report.",
    steps: [
      {
        title: "The valuer reads the draft.",
        description:
          "Each figure has its source beside it. The valuer looks at the comparables, the adjustments and the reasoning.",
      },
      {
        // The valuer is the subject: a bare "Changes what they want" could
        // read as Intelval doing the edits.
        title: "The valuer changes what they want.",
        description:
          "The valuer drops a comparable, changes an adjustment or rewrites the text. The final value is the valuer’s call.",
      },
      {
        title: "The valuer signs.",
        description:
          "The report goes out under the valuer’s signature. Intelval does not sign.",
      },
    ],
  },
  phone: {
    label: "Phone",
    title: "On the phone, it books the visit and answers report questions.",
    lead: "It works on your firm’s line, with the same voice AI as GBO’s own products, Kollektor and Hastam.",
    noteTitle: "How to read this",
    note: "On the left, what the person on the phone says. On the right, what Intelval does.",
    sayLabel: "The person on the phone",
    doLabel: "What Intelval does",
    rows: [
      {
        say: "“I’m home on Saturday morning. Come then.”",
        title: "Books a time for the site visit.",
        description:
          "Intelval calls the homeowner and agrees a time with them. Your valuer visits the property at that time.",
      },
      {
        say: "“My home was valued for a loan. Where is my report?”",
        title: "Gives the report’s status.",
        description:
          "The customer calls your firm. Intelval tells them which stage the file is at.",
      },
      {
        say: "“How many days until the report is ready?”",
        title: "Answers the question for you.",
        description:
          "Your valuer is not called about it while on site. Your team keeps working.",
      },
    ],
  },
  audience: {
    label: "Who it is for",
    title: "Built for valuation firms. Banks and law firms can use it too.",
    lead: "It is for teams that value property, check the reports they receive or need a preliminary value analysis.",
    noteTitle: "Note",
    note: "A preliminary analysis is not a valuation report. A report goes out only under a licensed valuer’s signature.",
    imageAlt: "Stone and glass buildings in daylight",
    rows: [
      {
        title: "Valuation firms",
        description:
          "Licensed firms that write valuation reports on homes, land and commercial property for banks. Intelval writes the draft and your valuer signs.",
      },
      {
        title: "Bank valuation and review teams",
        description:
          "It checks the reports that reach the bank. For a property above 10 million TL, it explains the gap between the two reports.",
      },
      {
        title: "Law firms",
        description:
          "It gives a preliminary value analysis for enforcement auctions, expropriation, dividing an estate and splitting assets in a divorce.",
      },
      {
        title: "Urban renewal",
        description:
          "In urban renewal (kentsel dönüşüm) projects, it gives a preliminary analysis of who holds rights and how the shares are split.",
      },
      {
        title: "Bulk revaluation",
        description:
          "It keeps a bank’s collateral portfolio up to date at regular intervals. It runs a preliminary value analysis of each property in it.",
      },
    ],
  },
  rules: {
    label: "Rules",
    title: "The signature, the site visit and the final call stay with the valuer.",
    lead: "Intelval drafts and checks. It does not take the valuer’s place.",
    noteTitle: "Six rules",
    note: "The first four name jobs Intelval does not do. The last two are rules every draft follows.",
    items: [
      {
        title: "It does not sign.",
        description:
          "The valuer who personally runs the job and inspects the property signs the report. BDDK asks for this in Article 14 of its valuation regulation.",
      },
      {
        title: "It does not replace the site visit.",
        description:
          "The valuer sees the property on site. Intelval puts their notes and photos into the report.",
      },
      {
        title: "It does not set the value on its own.",
        description:
          "It does the sums and shows every step. The valuer decides the final value.",
      },
      {
        title: "It does not take on the valuer’s responsibility.",
        description:
          "The valuer reads and changes the draft. The valuer is responsible for every decision in the report.",
      },
      {
        title: "It shows the source of every figure.",
        description:
          "For every number in the draft, you can see which document or comparable it came from.",
      },
      {
        title: "It puts the legal status in the draft.",
        description:
          "If the property as built differs from the approved plans, the draft shows both values: the market value and the legal-status value.",
      },
    ],
  },
  faq: {
    label: "Questions",
    title: "Questions valuation firms ask.",
    lead: "If your question is not here, ask it in the demo.",
    noteTitle: "Note",
    note: "What it does not do is listed under Rules.",
    items: [
      {
        question: "Does Intelval sign the report?",
        answer:
          "No. The valuer who inspected the property on site signs the report. Intelval writes the draft and checks it.",
      },
      {
        question: "Is a site visit still needed?",
        answer:
          "Yes. The valuer sees the property on site. Intelval sorts the photos, writes the spoken note into the report and flags any difference from the approved plans.",
      },
      {
        question: "Which properties does it work on?",
        answer:
          "Homes, land and commercial property. For land, it works out the flats-for-land split and runs the development calculation (residual value). For commercial property, it works out the value from the rental income.",
      },
      {
        question: "Where do the comparables come from?",
        answer:
          "From listings and your firm’s earlier reports. Duplicate listings are dropped, and the bargaining discount is taken off asking prices. Each comparable shows on the map and in the adjustment table.",
      },
      {
        question: "Does it write in the bank’s own template?",
        answer:
          "Yes. The draft is written in each bank’s own template. Before delivery, it also lists anything that does not meet the bank’s requirements.",
      },
      {
        question: "Does it write reports in English?",
        answer:
          "Yes. It drafts reports in English for sales to foreign buyers and for citizenship applications. For these reports, a circular from TKGM, the land registry, asks for three things. Comparables must be shown on a satellite map. The adjustment and bargaining sums must be written out. The market value and the legal-status value must be given together.",
      },
      {
        question: "Can banks use Intelval?",
        answer:
          "Yes. A bank’s valuation and review team can use Intelval to check the reports it receives. A property above 10 million TL needs reports from two different firms. Intelval explains the gap between them.",
      },
      {
        question: "How do we start?",
        answer: "The first step is a demo. Request one with the form at the end of this page.",
      },
    ],
  },
  ctaAssurances: [
    "Your valuer signs the report",
    "Every figure shows its source",
    "Drafts in Turkish and English",
  ],
};

export default intelvalPage;
