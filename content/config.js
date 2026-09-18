// This project's own setup, read by gas/assets/app.js (window.GAS_CONFIG).
// See gas/README.md for the shape this object needs, gas/CLAUDE.md for how
// to add slides and exercises to program below.
window.GAS_CONFIG = {
  palette: "claude",
  title: "Masterclass Odoo JS",

  // Odoo logo mark: purple ring, brand color #714B67
  favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='11.5' fill='none' stroke='%23714B67' stroke-width='5'/%3E%3C/svg%3E",

  // the deck shown first, and the one "Home" falls back to
  defaultDeck: "intro",

  // cover image for the welcome screen - empty falls back to a generated
  // starfield instead
  welcomeImage: "assets/welcome-bg.webp",

  // the pad embedded in the "Collaborative Pad" section - that nav entry
  // is hidden entirely if this is empty
  padUrl: "https://pad.odoo.com/p/masterclass-2026",

  // links shown in the "Resources" section - hidden entirely if empty
  resources: [
    {
      group: "Owl",
      links: [
        {
          title: "Owl website",
          url: "https://odoo.github.io/owl/",
          note: "Landing page, with the tutorials and the playground",
        },
        {
          title: "Owl documentation",
          url: "https://odoo.github.io/owl/documentation/",
          note: "Reference: components, hooks, templates, reactivity",
        },
        {
          title: "Owl playground",
          url: "https://odoo.github.io/owl/playground/",
          note: "Write and run Owl components in the browser. Used for the part 1 exercises",
        },
        {
          title: "Owl repository",
          url: "https://github.com/odoo/owl",
          note: "Source code and issues",
        },
      ],
    },
    {
      group: "Odoo",
      links: [
        {
          title: "Odoo developer documentation",
          url: "https://www.odoo.com/documentation/master/developer.html",
          note: "Framework, views, fields, ORM",
        },
      ],
    },
  ],

  // the sidebar, topic by topic. Each topic runs its presentation first,
  // then the exercises. "slides" points at a <div class="deck">, "project"
  // at an <article class="project">, "view" at a plain <section
  // class="view"> - all three by id, all under sections/.
  program: [
    {
      topic: null,
      items: [
        { type: "slides", id: "practical", label: "Practical Details" },
        { type: "slides", id: "intro", label: "The Odoo JS Ecosystem" },
      ],
    },
    {
      topic: "Owl",
      items: [
        { type: "slides", id: "owl", label: "Components and Signals" },
        { type: "project", id: "getting-started", label: "Getting Started" },
        { type: "slides", id: "owl-app", label: "Building an Application" },
        { type: "project", id: "todo-list", label: "Todo List" },
        { type: "slides", id: "generic-components", label: "Generic Components" },
      ],
    },
    {
      topic: "The Odoo JS Framework",
      items: [
        { type: "slides", id: "js-framework", label: "JS Framework 101" },
        { type: "project", id: "dashboard", label: "Building a dashboard, part 1" },
        { type: "slides", id: "js-framework-2", label: "Plugins" },
        { type: "project", id: "dashboard-part-2", label: "Building a dashboard, part 2" },
      ],
    },
    {
      topic: "Views and Fields",
      items: [
        { type: "slides", id: "views-fields", label: "Views and Fields" },
        { type: "slides", id: "customizing-views", label: "Customizing views and fields" },
        { type: "project", id: "customizing", label: "Exercises" },
        { type: "project", id: "dental-practice", label: "Project: Dental practice" },
      ],
    },
    {
      topic: "Advanced JS Framework",
      items: [
        { type: "slides", id: "advanced", label: "JS Framework 201" },
        { type: "slides", id: "customizing-ui", label: "Customizing the UI" },
        { type: "slides", id: "state-management", label: "State Management" },
        { type: "project", id: "clicker", label: "Clicker game" },
      ],
    },
    {
      // "end" sends a group to the foot of the sidebar, under the loose
      // entries (Collaborative Pad, Resources) the framework itself adds
      topic: null,
      at: "end",
      items: [
        { type: "slides", id: "owl-2-vs-3", label: "Owl 2 vs Owl 3" },
        { type: "view", id: "odoosh", label: "Using odoo.sh" },
      ],
    },
  ],
};
