import type { FountiblePageMessages } from "@/i18n/page-types/fountible";

// /en/fountible. Same shape and same rules as fountible-page.tr.ts: every
// capability is one fountible.com names itself, with no user counts, prices,
// Fountible's own plans, "free", customer names or benchmark figures. The only
// number is a product limit fountible.com prints (up to six Bro runs at once).
// Model and tool names appear only as fountible.com prints them. "Plan" below
// means the user's own ChatGPT, Claude or Cursor subscription, fountible.com's
// word for it; Claude or Cursor plans and the MCP connectors are tied to the
// Mac app wherever they come up. Where fountible.com has its own English for a
// claim, this file uses it.
const fountiblePage: FountiblePageMessages = {
  metaTitle: "Fountible: The AI Design Tool | GBO Vision",
  metaDescription:
    "Fountible is an AI design tool. Describe a screen and Bro, the design assistant, builds it with you. Finished designs export as code. A GBO Vision product.",
  hero: {
    eyebrow: "For designers and product teams",
    title: "Design interfaces together with AI.",
    lead: "Fountible is an AI design tool. Describe what you need and Bro, the design assistant, builds the screen for you. Then edit it, share it with your team or hand it to developers as code.",
    chips: ["Bro, the design assistant", "Paste from Figma", "Web and Mac app"],
    primaryCta: "Request a demo for your team",
    secondaryCta: "The fountible.com site",
    steps: [
      {
        title: "Paste from Figma, or draw.",
        description:
          "Copy a selection in Figma and paste it onto the canvas. You can edit the layers right away. No plugin or export file.",
      },
      {
        title: "Design with Bro.",
        description:
          "Ask for a screen, a timeline or a whole deck. Bro builds it on the canvas as editable layers.",
      },
      {
        title: "Take the React and Tailwind code.",
        description:
          "Select a frame and copy it as code. You get the same code the canvas renders.",
      },
    ],
  },
  heroPicture: {
    alt: "The Fountible editor. Screens of a mobile app sit on the canvas. Layers, settings and a Bro chat show at the side.",
    caption: "Screenshot from fountible.com",
  },
  code: {
    label: "Design and code",
    title: "Every layer on the canvas is a real React element.",
    lead: "Each layer carries Tailwind classes. Export prints the same code the canvas renders. No handoff, no rebuild.",
    noteTitle: "How to read this",
    note: "Each row shows how the design becomes code.",
    picture: {
      alt: "The Fountible code view. A selected pricing card sits beside its own React and Tailwind code.",
      caption: "Screenshot from fountible.com",
    },
    rows: [
      {
        title: "Copy in Figma. Paste layers you can edit.",
        description:
          "Copy a selection in Figma and paste it onto the canvas. Frames, auto layout, text, vectors and effects arrive as layers. Some complex details may look slightly different.",
      },
      {
        title: "Your canvas is the real DOM.",
        description:
          "Frames render live React, styled with Tailwind. What you shape on the canvas is what ships in the browser.",
      },
      {
        title: "Export code, not a screenshot.",
        description:
          "Select any layer and copy it as React, HTML or SVG. Components, props and theme tokens come along too.",
      },
      {
        title: "Variables become Tailwind.",
        description:
          "Colour, number, radius and opacity variables mint real Tailwind classes. Change one token and every use of it updates.",
      },
    ],
  },
  bro: {
    label: "Bro",
    title: "Bro is the AI on the canvas, and it uses the same tools you do.",
    lead: "It looks at your file first. It reads the page, your selection and your variables. Then it builds layers in front of you. Every result is a layer you can select and change.",
    noteTitle: "How to read this",
    note: "Each box shows how Bro works.",
    picture: {
      alt: "Three Bro chats in one Fountible file. Each chat builds a different part of the same page.",
      caption: "Screenshot from fountible.com",
    },
    items: [
      {
        title: "Multiple Bro chats, one live canvas.",
        description:
          "Start separate chats in the same file. Each keeps its own model and history. Up to six can build in different parts of the page at once. Work aimed at the same layers waits its turn.",
      },
      {
        title: "Bring the model you trust.",
        description:
          "Use Bro with ChatGPT, Claude, Cursor or Kimi K3. Sign in with your own plan, or add your own key. Claude and Cursor plans work in the Mac app. Each chat uses its own model.",
      },
      {
        title: "Drive the canvas from Claude Code or Cursor.",
        description:
          "The Mac app runs a local MCP server. Claude Code, Claude Desktop and Cursor can read the open design and build screens. Their edits land live on the canvas and undo as single steps.",
      },
    ],
  },
  motion: {
    label: "Motion and decks",
    title: "Design the frame. Direct the movement.",
    lead: "Motion lives on the real layer. What you see in preview is what you export. Decks are built on the same canvas too.",
    noteTitle: "In code",
    note: "Exported motion respects the reduced-motion setting.",
    picture: {
      alt: "The Fountible motion view. A card’s layers line up on the timeline. Keyframes sit on each track.",
      caption: "Screenshot from fountible.com",
    },
    rows: [
      {
        title: "A preset or a timeline.",
        description:
          "Add an entrance in one click. Or open the timeline and place every keyframe yourself. Rotation on X, Y and Z is a track too.",
      },
      {
        title: "Add sound, export video.",
        description:
          "Drop in music or a voiceover and trim it on the timeline. Export an MP4 with sound. The Mac app also exports transparent ProRes and HEVC.",
      },
      {
        title: "Motion exports as code too.",
        description:
          "Exported motion is a React component that drives plain anime.js. It needs no Fountible runtime.",
      },
      {
        title: "Decks on the same canvas.",
        description:
          "Every slide is a real frame on the canvas. It has transitions, click-by-click builds and a presenter view. You can import a PPTX file and export the deck as PPTX.",
      },
    ],
  },
  features: {
    label: "Features",
    title: "Not promises. Product features.",
    lead: "They all run on the same canvas, and that canvas is real React and Tailwind.",
    noteTitle: "How to read this",
    note: "Each box describes a feature that works in the product.",
    items: [
      {
        title: "Components that stay in sync.",
        description:
          "Build a main component once and reuse its instances anywhere. Change the text and styles of an instance. Reset it, or jump back to the main component.",
      },
      {
        title: "Shaders stay live and editable.",
        description:
          "Add gradients, waves, halftone, liquid metal, water or ASCII. None of them turns into a flat image. You can change them all later.",
      },
      {
        title: "3D rotation is real CSS.",
        description:
          "Rotate a layer on X, Y and Z, then tune perspective and depth. Fountible writes the same CSS transform you see.",
      },
      {
        title: "Team spaces, files and fonts.",
        description:
          "Work stays in a shared team space. Upload the team’s fonts once. Everyone works in the same file with live cursors.",
      },
      {
        title: "Auto layout is real layout.",
        description:
          "Vertical, horizontal and grid flows map straight to flexbox and grid. Gap and padding carry into the code too.",
      },
      {
        title: "Image tools that stay editable.",
        description:
          "Exposure, contrast, colour and white balance render as CSS and SVG filters. The original image stays as it is. You can also remove a background on your own device.",
      },
    ],
  },
  platforms: {
    label: "Where it runs",
    title: "Fountible runs in the browser and on the Mac.",
    lead: "The same canvas opens on the web and in the Mac app. A Chrome extension brings web pages onto the canvas.",
    items: [
      {
        title: "Web app",
        description:
          "It opens at app.fountible.com, with nothing to install. The canvas, Bro and export are here too.",
      },
      {
        title: "Mac app",
        description:
          "The full canvas runs natively on the Mac. Claude and Cursor plans and the MCP connectors work only here. It needs Apple Silicon.",
      },
      {
        title: "Fountible Capture",
        description:
          "A Chrome extension. It copies any element from any page onto the canvas. Styles, images and the page’s own fonts come along.",
      },
    ],
  },
  faq: {
    label: "Questions",
    title: "Questions design and product leads ask.",
    lead: "If your question is not answered here, you can ask it in the demo.",
    noteTitle: "Asked most",
    note: "The full details are in the docs on fountible.com.",
    items: [
      {
        question: "Is Fountible a Figma alternative?",
        answer:
          "Yes, if your product UI ships with React and Tailwind. It has frames, auto layout, vectors, components, variables and multiplayer. The difference is that its canvas renders real React components. Teams that use Figma for illustration may keep both tools.",
      },
      {
        question: "What code does it export?",
        answer:
          "You can export a layer as React and Tailwind JSX, HTML or SVG. Layout becomes flexbox and gap. Motion comes out as plain anime.js. For images, video and decks there is also PNG, JPG, MP4 and PPTX.",
      },
      {
        question: "Which AI models does Bro work with?",
        answer:
          "You can sign in with ChatGPT in the browser or the Mac app. Claude and Cursor plans work in the Mac app. You can also add an Anthropic key in the browser, or a Kimi key. Each chat picks its own model.",
      },
      {
        question: "Does it work with Claude Desktop or Cursor?",
        answer:
          "Yes. The Mac app runs a local MCP server. Claude Code, Claude Desktop, Cursor and other MCP clients can read and edit your open files. The connectors are off by default, and you turn them on in settings. The browser app does not have them.",
      },
      {
        question: "Can I work with my team?",
        answer:
          "Yes. Your team works in the same file with live cursors. You can share a file with a link. In a team space you manage roles, shared libraries and fonts. Version history takes you back to an earlier version.",
      },
      {
        question: "Where does Fountible run?",
        answer:
          "In the browser at app.fountible.com, and in the Mac app. The Mac app needs Apple Silicon. On an Intel Mac, use the web app. Fountible Capture is an extension for Chrome.",
      },
    ],
  },
  ctaAssurances: [
    "Figma selections arrive as layers",
    "Code exports as React and Tailwind",
    "Bro works with the model you choose",
  ],
  parent: {
    label: "GBO Vision",
    title: "Fountible is a GBO Vision product.",
    lead: "The product has its own site, fountible.com. You will find the features, the docs and the download page there.",
    linkLabel: "fountible.com",
    externalHint: "another site",
  },
};

export default fountiblePage;
