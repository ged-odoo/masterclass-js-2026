// This project's own setup, read by gas/assets/app.js (window.GAS_CONFIG).
// See gas/README.md for the shape this object needs, gas/CLAUDE.md for how
// to write slides with it.
window.GAS_CONFIG = {
  palette: "claude",
  title: "Introducing Owl 3",

  // Odoo logo mark: purple ring, brand color #714B67
  favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='11.5' fill='none' stroke='%23714B67' stroke-width='5'/%3E%3C/svg%3E",

  defaultDeck: "talk",

  // the cover slide's background - the same file the masterclass uses
  welcomeImage: "assets/welcome-bg.webp",

  // One deck, so one entry. Its acts are the single source for the sidebar
  // grouping, the "Act n of 6" line on each divider and the progress rail:
  // add an act here, give the new slides a matching data-act, and all three
  // follow. `at` is the clock time the act opens at, `mins` how long it
  // runs; `counted: false` keeps an act out of the numbering and off the
  // rail, for slides that belong to the deck but not to the talk.
  program: [
    {
      topic: null,
      items: [
        {
          type: "slides",
          id: "talk",
          label: "Introducing Owl 3",
          acts: [
            { id: "frontier", title: "Scaling Odoo JS", at: "0:00", mins: 8 },
            { id: "signals", title: "Signals", at: "0:08", mins: 13 },
            { id: "plugins", title: "Plugins", at: "0:21", mins: 10 },
            { id: "misc", title: "Other changes", at: "0:31", mins: 4 },
            { id: "transition", title: "Migration", at: "0:35", mins: 6 },
            { id: "vision", title: "Vision, and close", at: "0:41", mins: 4 },
            { id: "appendix", title: "Appendix", counted: false },
          ],
        },
      ],
    },
  ],
};
