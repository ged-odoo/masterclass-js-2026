// This project's own setup, read by gas/assets/app.js (window.GAS_CONFIG).
// See gas/README.md for the shape this object needs, gas/CLAUDE.md for how
// to write slides with it.
window.GAS_CONFIG = {
  title: "Advanced Reactivity",

  // Odoo logo mark: purple ring, brand color #714B67
  favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='11.5' fill='none' stroke='%23714B67' stroke-width='5'/%3E%3C/svg%3E",

  defaultDeck: "talk",

  // the cover slide's background - the same file the masterclass uses
  welcomeImage: "assets/welcome-bg.webp",

  // One deck, so one entry. Its acts are the single source for the sidebar
  // grouping, the "Act n of 6" line on each divider and the progress rail:
  // add an act here, give the new slides a matching data-act, and all three
  // follow. `at` is the clock time the act opens at, `mins` how long it runs.
  program: [
    {
      topic: null,
      items: [
        {
          type: "slides",
          id: "talk",
          label: "Advanced Reactivity",
          acts: [
            { id: "primer", title: "A primer on Owl 3", at: "0:00", mins: 3 },
            { id: "question", title: "Reactivity", at: "0:03", mins: 5 },
            { id: "graph", title: "The Computation Graph", at: "0:08", mins: 8 },
            { id: "gate", title: "Laziness, and the gate", at: "0:16", mins: 7 },
            { id: "effects", title: "Effects", at: "0:23", mins: 8 },
            { id: "sin", title: "The cardinal sin", at: "0:31", mins: 10 },
            { id: "rules", title: "Rules, and close", at: "0:41", mins: 4 },
            // not an act of the talk: slides held back for questions, kept
            // out of the numbering and off the progress rail
            { id: "appendix", title: "Appendix", counted: false },
          ],
        },
      ],
    },
  ],
};
