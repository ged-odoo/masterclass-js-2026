// GAS (GED Awesome Slides): sidebar, decks, views, and the ?mode=edit
// annotation panel. Generic engine - a project's own setup (title, program,
// resources...) lives in its config.js, loaded before this file and read
// from window.GAS_CONFIG below. See gas/README.md for that shape, and
// gas/CLAUDE.md for how to write slides and exercises with it.
//
// This page's markup is its index.html, which gas/build.py writes from
// gas/template.html and the project's sections/; its styles are
// gas/assets/style.css.

// ---------- embedded in another GAS site ----------

// ?embed=1 says this page is in an iframe of another one, which has its own
// sidebar: two of them side by side is a lot of furniture for a reader who
// only wants the slides, so this one steps out of the way. The deck bar
// stays - that is how you move through a deck with no rail to click.
if (new URLSearchParams(location.search).get("embed") === "1") {
  document.documentElement.classList.add("embedded");
}

// ---------- theme (light/dark) ----------
//
// The one personal, per-viewer choice - a stored pick, else the OS's own
// preference, applied once already (before this file even loaded, so the
// page never visibly jumps) by the inline script in template.html's <head>.
// The palette itself (which of assets/palettes/*.css) isn't here - it's a
// project setting now, picked from the editor panel instead (?mode=edit)
// and written into config.js - see the "edit mode" section further down.

const THEME_KEY = "gas-theme";

document.getElementById("theme-toggle").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    // private window, or storage blocked outright - the choice just
    // doesn't outlive this tab, same tradeoff every other localStorage use
    // on this page already makes (see saveNotes, for the notes/drawings)
  }
});

const CONFIG = window.GAS_CONFIG || {};

// Links shown in the "Resources" section - hidden entirely if empty.
const RESOURCES = CONFIG.resources || [];

// The pad embedded in the "Collaborative Pad" section - that nav entry is
// hidden entirely if this is empty.
const PAD_URL = CONFIG.padUrl || "";

// The sidebar, topic by topic. Each topic runs its presentation first, then
// the exercises. "slides" points at a <div class="deck">, "project" at an
// <article class="project">, "view" at a plain <section class="view"> (all
// three by id).
const PROGRAM = CONFIG.program || [];

// a screen on a stand, code chevrons, and a plain page
const ICONS = {
  slides: "<rect x='1.5' y='2' width='13' height='9' rx='1.5'/>" +
    "<path d='M8 11v2.5'/><path d='M5.5 13.5h5'/>",
  project: "<path d='M5.5 4.5 2 8l3.5 3.5'/><path d='M10.5 4.5 14 8l-3.5 3.5'/>",
  view: "<rect x='2.5' y='1.5' width='11' height='13' rx='1.5'/>" +
    "<path d='M5 5h6M5 8h6M5 11h3.5'/>",
  // points right when the topic is folded, turned down when it is open
  topic: "<path d='M6 3.5 10.5 8 6 12.5'/>",
};

const DEFAULT_DECK = CONFIG.defaultDeck || "";

// Cover image for the welcome screen. Empty (the default) falls back to the
// gradient and the starfield generated below.
const WELCOME_IMAGE = CONFIG.welcomeImage || "";

// ---------- this project's title, favicon, and optional nav entries ----------

if (CONFIG.title) {
  document.title = CONFIG.title;
  document.getElementById("home").textContent = CONFIG.title;
  // a quoted CSS string, read by .clean .slide-foot::after in style.css
  document.documentElement.style.setProperty("--footer-brand", JSON.stringify(CONFIG.title));
}
if (CONFIG.favicon) {
  document.getElementById("favicon").href = CONFIG.favicon;
}

const padNavBtn = document.querySelector('.nav-item[data-view="pad"]');
padNavBtn.hidden = !PAD_URL;

const resourcesNavBtn = document.querySelector('.nav-item[data-view="resources"]');
resourcesNavBtn.hidden = !RESOURCES.length;

// ---------- resources ----------

// the page a project's resources are listed on - only there if the project
// actually ships one (see gas/README.md); its links are config's own
const resourcesEl = document.getElementById("resources");

for (const { group, links } of resourcesEl ? RESOURCES : []) {
  const section = document.createElement("div");
  section.className = "link-group";
  const heading = document.createElement("h3");
  heading.textContent = group;
  const list = document.createElement("div");
  list.className = "link-list";
  for (const link of links) {
    const card = document.createElement("a");
    card.className = "link-card";
    card.href = link.url;
    card.target = "_blank";
    card.rel = "noopener";
    const title = document.createElement("strong");
    title.textContent = link.title;
    const note = document.createElement("span");
    note.textContent = link.note;
    const url = document.createElement("em");
    url.textContent = link.url;
    card.append(title, note, url);
    list.append(card);
  }
  section.append(heading, list);
  resourcesEl.append(section);
}

// ---------- embedded markdown ----------

// Training material is written as markdown, not as html, and rides in a
// <script type="text/markdown"> block: a page opened from a file:// url is not
// allowed to fetch a .md of its own. marked turns it into the page here.

// the ids github would give the headings, so the table of contents on top of a
// document reaches its own sections
function slug(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

// a small inline pencil that opens the source editor (see the "edit mode:
// Edit source" section further down) scoped to one target - next to an
// exercise step's own heading, or a solution's own button, rather than
// only the whole file the panel's own "Edit source" button offers.
// className defaults to the small inline pencil; a solution's dialog (see
// makeSolutionDialogs) uses "solution-edit" for one sized and placed like
// its own Close button instead, reachable without opening the editor panel
// at all - the panel's own button already resolves to just the solution
// too now (see sourceTargetFor), this is just a shorter path to the same
// thing while you're already looking at it.
function makeEditButton(target, className = "md-edit-btn") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.title = `Edit ${target.label}`;
  btn.setAttribute("aria-label", `Edit ${target.label}`);
  btn.textContent = className === "md-edit-btn" ? "✎" : "Edit";
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openSourceEditor(target);
  });
  return btn;
}

// a permalink next to a heading, Wikipedia/GitHub-style - invisible until
// that heading is hovered (see style.css), copies a direct link to it and
// (via rememberProjectStep) updates the url the same way actually clicking
// into it would, so the copied link and what your own address bar would
// show if you navigated there yourself never disagree. An <svg>, not text,
// so appending it can never leak into a heading's own textContent the way
// makeEditButton's "✎" would - see stepTitleBefore below for why that matters
function makeHeadingLink(projectId, headingId) {
  const link = document.createElement("a");
  link.className = "heading-link";
  link.href = `#project/${projectId}/${headingId}`;
  link.title = "Copy link to this section";
  link.setAttribute("aria-label", "Copy link to this section");
  link.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6.5 9.5 9.5 6.5"/>' +
    '<path d="M8 4.5 9 3.5a2.3 2.3 0 0 1 3.3 3.3l-1 1"/>' +
    '<path d="M8 11.5 7 12.5a2.3 2.3 0 0 1-3.3-3.3l1-1"/>' +
    "</svg>";
  link.addEventListener("click", async (ev) => {
    ev.preventDefault();
    rememberProjectStep(projectId, headingId);
    try {
      await navigator.clipboard.writeText(location.href);
    } catch (err) {
      // clipboard access is often refused on file:// - the url is at least
      // already right there in the address bar to copy by hand
    }
  });
  return link;
}

function renderMarkdown() {
  for (const source of document.querySelectorAll('script[type="text/markdown"]')) {
    const rendered = document.createElement("div");
    rendered.className = "md";
    rendered.innerHTML = marked.parse(source.textContent);

    // the pictures sit next to the markdown in the tutorials repo, and next to
    // the page here, so the paths it was written with are rewritten once
    for (const image of rendered.querySelectorAll('img[src^="_images/"]')) {
      image.setAttribute("src", `assets/tutorials/${image.getAttribute("src").slice(8)}`);
    }
    // source, not rendered: still attached here (only replaced by `rendered`
    // at the very end of this loop), so its own project ancestor resolves
    const project = source.closest(".project");
    const projectId = project && project.id.replace("project-", "");
    for (const heading of rendered.querySelectorAll("h1, h2, h3, h4")) {
      heading.id = slug(heading.textContent);
      if (projectId) {
        heading.append(makeHeadingLink(projectId, heading.id));
      }
    }

    // a numbered exercise's own steps ("## 1. ...", "## 2. ...") get a table of
    // contents computed from the headings actually there, not hand-written -
    // renaming, reordering or adding a step can never leave it stale
    const steps = [...rendered.querySelectorAll("h2")].filter((h) => /^\d+\.\s/.test(h.textContent));
    if (steps.length > 1) {
      const heading = document.createElement("h2");
      heading.textContent = "Content";
      const list = document.createElement("ul");
      for (const step of steps) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${step.id}`;
        link.textContent = step.textContent;
        item.append(link);
        list.append(item);
      }
      steps[0].before(heading, list);
    }

    // an inline "Edit" next to each step's own heading, scoped to just that
    // step (kind: markdown-heading) - source is still attached here (it's
    // only replaced by `rendered` at the very end of this loop), so its
    // data-src still resolves to the real project file on disk
    if (EDIT_MODE) {
      const file = project && project.dataset.src;
      if (file) {
        for (const step of steps) {
          const btn = makeEditButton({ file, kind: "markdown-heading", heading: step.textContent, label: step.textContent });
          step.append(btn);
        }
      }
    }

    // a link into the document scrolls, and the step it lands on rides in the
    // url next - see rememberProjectStep, next to rememberSlide, for why
    rendered.addEventListener("click", (ev) => {
      const link = ev.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }
      ev.preventDefault();
      const headingId = link.getAttribute("href").slice(1);
      const target = rendered.querySelector(`[id="${headingId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        const project = rendered.closest(".project");
        if (project) {
          rememberProjectStep(project.id.replace("project-", ""), headingId);
        }
      }
    });

    source.replaceWith(rendered);
  }
}


// ---------- sidebar ----------

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (err) {
    return fallback;
  }
}

const programEl = document.getElementById("program");
const programEndEl = document.getElementById("program-end");
const programLastEl = document.getElementById("program-last");
// the topics are numbered by their place in the program, so adding one
// anywhere renumbers the rest on its own
let topicNumber = 0;
const topicGroups = [];
const OPEN_KEY = "owf-open-topics";

// each topic folds on its own: opening one leaves the others as they are
function foldTopic(group, open) {
  group.heading.setAttribute("aria-expanded", String(open));
  group.entries.hidden = !open;
}

function rememberTopics() {
  const open = topicGroups
    .filter((group) => !group.entries.hidden)
    .map((group) => group.name);
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(open));
  } catch (err) {
    // private windows and blocked storage: the folding lasts this visit only
  }
}

function openTopic(name) {
  const group = topicGroups.find((topic) => topic.name === name);
  if (group && group.entries.hidden) {
    foldTopic(group, true);
    rememberTopics();
  }
}

// which topic number each presentation belongs to, for the mark its cover
// carries (see "a cover's topic number" below)
const topicNumberOf = {};

const PROGRAM_SLOTS = { end: programEndEl, last: programLastEl };

for (const { topic, items, at } of PROGRAM) {
  const into = PROGRAM_SLOTS[at] || programEl;
  const group = document.createElement("div");
  group.className = topic ? "nav-group" : "nav-group flat";
  // the numbered topics are the program proper: a group sent to a slot at the
  // foot of the sidebar is outside it, and keeps its name without a number
  const number = topic && !at ? ++topicNumber : 0;
  for (const item of items) {
    if (number && item.type === "slides") {
      topicNumberOf[item.id] = number;
    }
    const button = document.createElement("button");
    button.className = "nav-item";
    // "slides"/"project" share one view per type, addressed by a sub-id
    // ("slides/js-framework"); a plain "view" page is its own top-level
    // view, addressed directly by its own id, the same as "pad"/"resources"
    button.dataset.view = item.type === "view" ? item.id : item.type;
    button.dataset.item = item.type === "view" ? "" : item.id;
    button.dataset.topic = topic || "";
    button.innerHTML =
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" ` +
      `stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ` +
      `stroke-linejoin="round" aria-hidden="true">${ICONS[item.type]}</svg>` +
      `<span></span>`;
    button.querySelector("span").textContent = item.label;
    group.append(button);
  }
  if (topic) {
    const heading = document.createElement("button");
    heading.type = "button";
    heading.className = "nav-section";
    heading.innerHTML =
      `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" ` +
      `stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
      `stroke-linejoin="round" aria-hidden="true">${ICONS.topic}</svg>` +
      `<span></span>`;
    heading.querySelector("span").textContent = number ? `${number}. ${topic}` : topic;
    const entry = { name: topic, heading, entries: group };
    heading.addEventListener("click", () => {
      foldTopic(entry, group.hidden);
      rememberTopics();
    });
    into.append(heading);
    topicGroups.push(entry);
  }
  into.append(group);
}

// the program opens the way you left it last time, folded on a first visit
const wasOpen = readStore(OPEN_KEY, []);
for (const group of topicGroups) {
  foldTopic(group, wasOpen.includes(group.name));
}

// the menu can be collapsed to a narrow rail, so the slides get more room -
// remembered across visits, so it stays out of the way once put there
const COLLAPSED_KEY = "owf-sidebar-collapsed";
const sidebarEl = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");

function setSidebarCollapsed(collapsed) {
  sidebarEl.classList.toggle("collapsed", collapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.title = collapsed ? "Expand menu (m)" : "Collapse menu (m)";
  sidebarToggle.setAttribute("aria-label", collapsed ? "Expand menu" : "Collapse menu");
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
  } catch (err) {
    // private windows and blocked storage: the setting lasts this visit only
  }
}

setSidebarCollapsed(readStore(COLLAPSED_KEY, false));
sidebarToggle.addEventListener("click", () => {
  setSidebarCollapsed(!sidebarEl.classList.contains("collapsed"));
});

document.addEventListener("keydown", (ev) => {
  if (ev.target.closest("input, textarea, [contenteditable]")) {
    return;
  }
  if (ev.key !== "m" || ev.metaKey || ev.ctrlKey || ev.altKey) {
    return;
  }
  ev.preventDefault();
  setSidebarCollapsed(!sidebarEl.classList.contains("collapsed"));
});

// ---------- welcome cover ----------

// Scattered stars, drawn once into a background image rather than 150 nodes.
function starfield(count) {
  let seed = 20260101;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let dots = "";
  for (let i = 0; i < count; i++) {
    const x = (random() * 1200).toFixed(1);
    const y = (random() * 800).toFixed(1);
    const r = (random() * 1.5 + 0.4).toFixed(2);
    const o = (random() * 0.65 + 0.2).toFixed(2);
    dots += `<circle cx='${x}' cy='${y}' r='${r}' fill='white' opacity='${o}'/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// a project without a cover of its own has neither of these
const welcomeBg = document.querySelector(".welcome-bg");
const welcomeStars = document.querySelector(".welcome-stars");

if (WELCOME_IMAGE && welcomeBg) {
  // the cover already has its own stars, keep only the ring and the sparkles
  welcomeBg.style.backgroundImage = `url("${WELCOME_IMAGE}")`;
  welcomeBg.style.backgroundSize = "cover";
  welcomeBg.style.backgroundPosition = "center";
  welcomeStars?.remove();
} else if (welcomeStars) {
  welcomeStars.style.backgroundImage = starfield(220);
}

// ---------- slide decks ----------

const decks = {};
// remembers which slide we were on, per deck
const deckIndex = {};

for (const el of document.querySelectorAll(".deck")) {
  const id = el.id.replace("deck-", "");
  decks[id] = el;
  deckIndex[id] = 0;
}

// ---------- a cover's topic number ----------

// A presentation's cover carries the number of the topic it belongs to, big
// and faint behind the title, from the same count the sidebar's headings use:
// the four decks of one topic then read as one family at a glance. A deck in
// no topic at all - Practical Details, the ecosystem, Owl 2 vs Owl 3 - simply
// has no mark, which is also true of it.
for (const [id, number] of Object.entries(topicNumberOf)) {
  const cover = decks[id] && decks[id].querySelector(".slide.cover");
  if (!cover) {
    continue;
  }
  const numeral = document.createElement("span");
  numeral.className = "cover-numeral";
  numeral.textContent = number;
  numeral.setAttribute("aria-hidden", "true");
  cover.prepend(numeral);
}

const projects = {};
for (const el of document.querySelectorAll(".project")) {
  projects[el.id.replace("project-", "")] = el;
}
let currentProject = Object.keys(projects)[0];

function showProject(id) {
  currentProject = projects[id] ? id : currentProject;
  for (const [key, el] of Object.entries(projects)) {
    el.classList.toggle("current", key === currentProject);
  }
  setupProjectCodeBlocks(currentProject);
}

const counter = document.getElementById("counter");
const startBtn = document.getElementById("start");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
let currentDeck = DEFAULT_DECK || Object.keys(decks)[0];

function slidesOf(deckId) {
  return decks[deckId].querySelectorAll(".slide");
}

// ---------- acts: the slide overview, and the divider rail ----------

// A deck can be organised into acts. Its program entry lists them (see
// gas/README.md), every slide carries a data-act naming the act it belongs
// to, and the slide that opens one is <article class="slide divider">. Two
// things follow, both drawn from that one list so they cannot drift apart:
// the sidebar lists the deck slide by slide, grouped under its act with the
// clock time the act opens at, and every divider draws "Act n of m" plus a
// progress rail with its own act lit. A deck with no acts configured is
// untouched - it keeps the single sidebar entry it always had.
const ACTS_OF = {};
for (const { items } of PROGRAM) {
  for (const item of items) {
    if (item.type === "slides" && item.acts && item.acts.length) {
      ACTS_OF[item.id] = item.acts;
    }
  }
}

// the rows of each outline, in slide order, so showSlide can light the one
// it is on without going back to the DOM for it
const outlineRows = {};

// What a slide is called in the overview: its heading, or its eyebrow when
// it has no heading of its own.
function outlineLabel(slide) {
  // a slide can name itself for the overview without printing anything on
  // the slide itself - a picture with no words on it still needs a row
  if (slide.dataset.label) {
    return slide.dataset.label;
  }
  const heading = slide.querySelector("h2");
  if (heading) {
    // a heading broken over two lines with <br> would otherwise run its
    // halves together: "The frontier,and the diagnosis"
    const copy = heading.cloneNode(true);
    for (const br of copy.querySelectorAll("br")) {
      br.replaceWith(" ");
    }
    return copy.textContent.replace(/\s+/g, " ").trim();
  }
  const eyebrow = slide.querySelector(".eyebrow");
  return eyebrow ? eyebrow.textContent.replace(/\s+/g, " ").trim() : "Slide";
}

function buildDeckOutline(deckId, acts) {
  const anchor = document.querySelector(
    `.nav-item[data-view="slides"][data-item="${deckId}"]`
  );
  if (!anchor) {
    return;  // the deck has acts but no sidebar entry to hang them under
  }
  const outline = document.createElement("div");
  outline.className = "deck-outline";
  const rows = [];
  let group = null;
  let actId = null;
  let act = null;

  // Which slide is each act's own row: its first divider, wherever that sits
  // in the act. Found up front, so a slide standing before it - a cover, or
  // anything else that opens the deck - does not cost the act its row.
  const slides = [...slidesOf(deckId)];
  const actRow = new Map();
  slides.forEach((slide, i) => {
    const id = slide.dataset.act;
    if (slide.classList.contains("divider") && id && !actRow.has(id)) {
      actRow.set(id, i);
    }
  });

  slides.forEach((slide, i) => {
    // the cover belongs to no act: it sits on its own, above the first one
    const cover = slide.classList.contains("welcome");
    const divider = slide.classList.contains("divider");
    // an act with a divider needs no heading of its own - that row is the
    // heading, rather than two entries saying the same thing
    const opensAct = actRow.get(slide.dataset.act) === i;

    if (!cover && slide.dataset.act !== actId) {
      actId = slide.dataset.act;
      act = acts.find((one) => one.id === actId) || null;
      group = document.createElement("div");
      group.className = "act-group";
      if (actRow.has(actId)) {
        outline.append(group);
      } else {
        // no divider to carry it: the act still has to be named somewhere
        const head = document.createElement("div");
        head.className = "act-head";
        const name = document.createElement("span");
        name.className = "act-name";
        name.textContent = act ? act.title : actId;
        const time = document.createElement("span");
        time.className = "act-time";
        time.textContent = (act && act.at) || "";
        head.append(name, time);
        outline.append(head, group);
      }
    }
    if (!group) {
      group = document.createElement("div");
      group.className = "act-group";
      outline.append(group);
    }

    const row = document.createElement("button");
    row.type = "button";
    row.className = "nav-item slide-item";
    if (divider) {
      row.classList.add("is-divider");
    }
    const label = document.createElement("span");
    label.className = "slide-label";
    label.textContent = outlineLabel(slide);

    if (opensAct) {
      // the act's own row: the deck icon where a slide carries its number,
      // and the time the act opens at, where its heading used to carry it
      row.classList.add("act-row");
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [name, value] of Object.entries({
        viewBox: "0 0 16 16", fill: "none", stroke: "currentColor",
        "stroke-width": "1.5", "stroke-linecap": "round",
        "stroke-linejoin": "round", "aria-hidden": "true",
      })) {
        icon.setAttribute(name, value);
      }
      icon.innerHTML = ICONS.slides;
      const time = document.createElement("span");
      time.className = "act-time";
      time.textContent = (act && act.at) || "";
      row.append(icon, label, time);
    } else {
      const num = document.createElement("span");
      num.className = "slide-num";
      num.textContent = divider ? "" : String(i + 1);
      row.append(num, label);
    }
    // the deck's own entry goes through the generic nav handler; a row here
    // names a slide, so it carries the slide number into the url itself
    row.addEventListener("click", () => {
      location.hash = `slides/${deckId}/${i + 1}`;
      syncFromHash();
    });
    group.append(row);
    rows.push(row);
  });

  anchor.after(outline);
  // the outline is the deck's entry now: keeping both would name the deck
  // twice over, once as itself and once as its own cover slide
  anchor.classList.add("has-outline");
  outlineRows[deckId] = rows;
}

// An act may sit outside the count with `counted: false` - an appendix, say,
// which belongs to the deck but not to the talk as delivered. It keeps its
// heading in the sidebar and is left off the numbering and the rail.
function renderDividers(deckId, acts) {
  const counted = acts.filter((act) => act.counted !== false);
  for (const slide of decks[deckId].querySelectorAll(".slide.divider")) {
    const here = counted.findIndex((act) => act.id === slide.dataset.act);
    if (here < 0) {
      continue;  // an uncounted act's divider: no number, no rail
    }
    const eyebrow = slide.querySelector(".divider-eyebrow");
    const rail = slide.querySelector(".prog");
    if (eyebrow) {
      eyebrow.textContent = `Act ${here + 1} of ${counted.length}`;
    }
    if (rail) {
      counted.forEach((act, i) => {
        const seg = document.createElement("span");
        if (i === here) {
          seg.className = "on";
        }
        seg.title = act.title;
        rail.append(seg);
      });
    }
  }
}

// which row is lit - called by showSlide, for whichever deck is open
function paintOutline() {
  const rows = outlineRows[currentDeck];
  if (!rows) {
    return;
  }
  rows.forEach((row, i) => {
    if (i === deckIndex[currentDeck]) {
      row.setAttribute("aria-current", "page");
    } else {
      row.removeAttribute("aria-current");
    }
  });
}

for (const [deckId, acts] of Object.entries(ACTS_OF)) {
  buildDeckOutline(deckId, acts);
  renderDividers(deckId, acts);
}

// The slide rides in the url, so a refresh lands where you were and a link
// names the slide it means. replaceState rather than a hash assignment: the
// back button then still means the last thing opened, not the last slide.
function rememberSlide() {
  if (views.slides.hidden) {
    return;
  }
  const hash = `#slides/${currentDeck}/${deckIndex[currentDeck] + 1}`;
  if (location.hash === hash) {
    return;
  }
  try {
    history.replaceState(null, "", hash);
  } catch (err) {
    // some browsers refuse a history entry on file://, this costs one instead
    location.replace(hash);
  }
}

// Same idea as rememberSlide above, for a project's own numbered steps: the
// heading you clicked into rides in the url as a third part, so a refresh or
// a shared link lands back on that step instead of the top of the exercise.
function rememberProjectStep(projectId, headingId) {
  const hash = `#project/${projectId}/${headingId}`;
  if (location.hash === hash) {
    return;
  }
  try {
    history.replaceState(null, "", hash);
  } catch (err) {
    location.replace(hash);
  }
}

// A slide's type sizes scale off its container's width (cqw), not its own
// content, so one slide can hold noticeably more than another at the same
// size and overflow where its neighbours don't. Rather than hand-trim
// whichever one runs long - or shrink the whole card, which would make it a
// visibly different size from every other slide - turn its own text down
// (every font-size in the stylesheet is `calc(...cqw * var(--content-scale))`)
// just enough to clear the bottom edge. Padding and gaps don't shrink along
// with it, so there's no exact formula for how much text needs to give -
// text and layout do not shrink at the same rate - so try progressively
// smaller steps instead of computing one.
const MIN_CONTENT_SCALE = 0.75;
const CONTENT_SCALE_STEP = 0.02;

function fitSlide(slide) {
  if (!slide) {
    return;
  }
  slide.style.removeProperty("--content-scale");
  let scale = 1;
  while (slide.scrollHeight > slide.clientHeight && scale > MIN_CONTENT_SCALE) {
    scale -= CONTENT_SCALE_STEP;
    slide.style.setProperty("--content-scale", scale.toFixed(2));
  }
}

function showSlide(n) {
  const slides = slidesOf(currentDeck);
  const index = Math.max(0, Math.min(n, slides.length - 1));
  deckIndex[currentDeck] = index;
  slides.forEach((slide, i) => slide.classList.toggle("current", i === index));
  counter.textContent = `${index + 1} / ${slides.length}`;
  startBtn.disabled = index === 0;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === slides.length - 1;
  rememberSlide();
  paintOutline();
  syncEditor();
  fitSlide(slides[index]);
}

// the fit depends on the viewport (cqw sizes move with it), so re-check
// the slide on screen whenever the window - or the fullscreen state - changes
window.addEventListener("resize", () => fitSlide(slidesOf(currentDeck)[deckIndex[currentDeck]]));
document.addEventListener("fullscreenchange", () => fitSlide(slidesOf(currentDeck)[deckIndex[currentDeck]]));

// clicking the counter turns it into a number input, to jump straight to a slide
counter.title = "Click to jump to a slide";
counter.addEventListener("click", () => {
  const slides = slidesOf(currentDeck);
  const input = document.createElement("input");
  input.type = "number";
  input.className = "counter-input";
  input.min = 1;
  input.max = slides.length;
  input.value = deckIndex[currentDeck] + 1;
  counter.replaceWith(input);
  input.focus();
  input.select();

  // removing the focused input below fires its own blur event, synchronously,
  // before the input is actually gone - so the blur listener re-enters commit
  // while it's still mid-call. A plain flag catches that; input.isConnected
  // doesn't, it hasn't flipped false yet at that point.
  let done = false;
  function commit() {
    if (done) {
      return;
    }
    done = true;
    const n = parseInt(input.value, 10);
    input.replaceWith(counter);
    if (!isNaN(n)) {
      showSlide(n - 1);
    }
  }
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      commit();
    } else if (ev.key === "Escape") {
      done = true;
      input.replaceWith(counter);
    }
  });
  input.addEventListener("blur", commit);
});

// ---------- code blocks: copy and always-on editing ----------

// Prism.manual is set in index.html, so this pass colours the code samples,
// before CodeJar takes over re-highlighting the ones being edited. Every
// sample is directly editable, on a slide or in an exercise's rendered
// markdown (a solution shown there included) - CodeJar (vendored in
// assets/codejar.js) drives the contenteditable element and re-runs Prism
// on every change, so it keeps its syntax colours while you type. Takes the
// code elements directly rather than a selector, so a caller can scope it to
// one deck or project instead of the whole page - see setupCodeBlocksOnce.
function setupCodeBlocks(codeEls) {
  for (const codeEl of codeEls) {
    const preEl = codeEl.parentElement;
    const block = document.createElement("div");
    block.className = "code-block";
    preEl.replaceWith(block);
    // Prism.highlightElement makes the pre itself focusable, so a click that
    // lands in its padding rather than on the code steals focus and draws the
    // browser's own focus rectangle around it, outside the .code-block ring.
    preEl.tabIndex = -1;

    // the code as it shipped on the slide, to bring back with Reset. Its
    // innerHTML, not just its text: some slides hand-wrap a word in <mark> to
    // point at it, and textContent would flatten that away for good. The
    // plain text is also kept, as the cheap way to notice an actual edit.
    const originalHTML = codeEl.innerHTML;
    const originalCode = codeEl.textContent;

    const toolbar = document.createElement("div");
    toolbar.className = "code-toolbar";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-btn code-copy";
    copyBtn.textContent = "Copy";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "code-btn code-reset";
    resetBtn.textContent = "Reset";
    resetBtn.hidden = true; // only worth showing once there's something to undo
    toolbar.append(copyBtn, resetBtn);
    block.append(toolbar, preEl);

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeEl.textContent);
        copyBtn.textContent = "Copied";
      } catch (err) {
        // clipboard access is often refused on file://
        copyBtn.textContent = "Press ctrl+c";
      }
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    });

    // Prism's keep-markup plugin defaults to treating its own <span
    // class="token"> output as markup to preserve too, so every re-highlight
    // re-wraps the previous one's spans instead of starting clean - each
    // keystroke got slower than the last. drop-tokens opts out of that while
    // still preserving genuine hand-written markup, like the <mark> emphasis.
    codeEl.classList.add("drop-tokens");
    const jar = CodeJar(codeEl, (editor) => Prism.highlightElement(editor));
    jar.onUpdate((code) => {
      resetBtn.hidden = code === originalCode;
    });

    resetBtn.addEventListener("click", () => {
      codeEl.innerHTML = originalHTML;
      resetBtn.hidden = true;
    });
  }
}

// ---------- solution dialogs ----------

// the button that opens a solution, to the dialog holding it
const solutionOf = new Map();

// a solution used to unfold in place, which pushed everything below it down
// the page and lost the student's scroll position. A native <dialog>, opened
// full screen over everything (the sidebar included), leaves the exercise
// exactly where it was - closing it is the only way back, so there's no
// question of where the student was.
// every <summary> just reads "Show solution" (deliberately, for the
// student), which is useless as a title once several of them need telling
// apart - the heading of the exercise step just above it says what a
// solution is actually for
function stepTitleBefore(el) {
  for (let node = el.previousElementSibling; node; node = node.previousElementSibling) {
    if (node.tagName === "H2" || node.tagName === "H3") {
      // in edit mode, the heading may itself hold an inline "Edit" button
      // (see makeEditButton in renderMarkdown) - its own text isn't part of
      // the heading and must not leak into this (the exact heading text
      // .md-edit-btn's own "markdown-heading"/"markdown-solution" lookups,
      // and this function's callers, both key off of)
      const clone = node.cloneNode(true);
      for (const btn of clone.querySelectorAll(".md-edit-btn")) {
        btn.remove();
      }
      return clone.textContent.replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

function makeSolutionDialogs() {
  // a plain <details> in the markdown has nothing of its own to carry an id,
  // so one is made up from its project and its place in it - stable across
  // rebuilds as long as solutions keep their order in the text, same as
  // every other note's id needs to be
  const solutionCounts = new Map();

  for (const details of document.querySelectorAll(".md details")) {
    const summary = details.querySelector("summary");
    const project = details.closest(".project");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "solution-btn";
    button.textContent = summary ? summary.textContent : "Show solution";

    const dialog = document.createElement("dialog");
    dialog.className = "solution-dialog";
    if (project) {
      const n = (solutionCounts.get(project) || 0) + 1;
      solutionCounts.set(project, n);
      dialog.dataset.id = `${project.dataset.id}-solution-${n}`;
      dialog.dataset.project = project.id.replace("project-", "");
    }
    const stepHeading = stepTitleBefore(details);
    dialog.dataset.title = stepHeading || (summary ? summary.textContent.trim() : "Solution");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "solution-close";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => dialog.close());

    const body = document.createElement("div");
    body.className = "md solution-body";
    for (const child of Array.from(details.children)) {
      if (child !== summary) {
        body.append(child);
      }
    }

    // scoped to just this solution (kind: markdown-solution) - shared by
    // both the inline "Edit" next to the button below and the dialog's own
    // Edit, right next to Close, for while the dialog is already open
    const solutionTarget = EDIT_MODE && project && project.dataset.src && stepHeading
      ? {
          file: project.dataset.src,
          kind: "markdown-solution",
          heading: stepHeading,
          label: `${stepHeading} — solution`,
        }
      : null;

    if (solutionTarget) {
      dialog.append(closeBtn, makeEditButton(solutionTarget, "solution-edit"), body);
    } else {
      dialog.append(closeBtn, body);
    }
    document.body.append(dialog);

    if (solutionTarget) {
      const row = document.createElement("span");
      row.className = "solution-row";
      row.append(button, makeEditButton(solutionTarget));
      details.replaceWith(row);
    } else {
      details.replaceWith(button);
    }

    // the only link between the two: nothing in the DOM says which dialog a
    // button opens, and printing everything (bottom of this file) needs to
    // put each solution back under its own button
    solutionOf.set(button, dialog);

    button.addEventListener("click", () => {
      dialog.showModal();
      // a <dialog> paints in its own top layer, above absolutely everything
      // else no matter its z-index - the only way the editor and its
      // drawing layer can still show over it is to actually live inside the
      // dialog while it's open, so they share that same layer
      if (EDIT_MODE) {
        dialog.append(editorEl, layer);
      }
      syncEditor();
    });
    // a click that lands on the dialog element itself, rather than something
    // inside .solution-body, is a click on the backdrop area
    dialog.addEventListener("click", (ev) => {
      if (ev.target === dialog) {
        dialog.close();
      }
    });
    // fires however it closed - the button above, the backdrop, or Escape
    dialog.addEventListener("close", () => {
      if (EDIT_MODE) {
        document.body.append(editorEl, layer);
      }
      syncEditor();
    });
  }
}

// ---------- before/after diffing ----------

// A solution's .diff-cols pair is written as two plain code samples, with
// no markup of its own - which lines actually changed is computed here
// (Diff.diffLines, vendored in assets/diff.js) rather than marked up by
// hand in the markdown. Hand-placed marks are exactly the kind of thing
// that gets forgotten on one side of a pair, or left stale after a later
// edit to the same lines; a diff derived from the two samples themselves
// can't drift out of sync with them.
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function diffCodeBlocks() {
  for (const cols of document.querySelectorAll(".md .diff-cols")) {
    const beforeEl = cols.querySelector(".before pre > code");
    const afterEl = cols.querySelector(".after pre > code");
    if (!beforeEl || !afterEl) {
      continue;
    }
    // diffLines already merges consecutive same-side lines into one hunk,
    // so a run of changed lines lands under a single <mark> on its own -
    // the same shape a hand-authored diff would use
    const hunks = Diff.diffLines(beforeEl.textContent, afterEl.textContent);
    const render = (hunk) => {
      const html = escapeHtml(hunk.value);
      return hunk.added || hunk.removed ? `<mark>${html}</mark>` : html;
    };
    beforeEl.innerHTML = hunks.filter((hunk) => !hunk.added).map(render).join("");
    afterEl.innerHTML = hunks.filter((hunk) => !hunk.removed).map(render).join("");
  }
}

const SLIDE_SAMPLES = ".slide pre > code[class*='language-']";
const MD_SAMPLES = ".md pre > code[class*='language-']";

// The exercise pages are the heavy half - the markdown of every tutorial,
// and the solutions in it - and nothing paints until this script returns, so
// they wait for the sidebar and the current slide to be on screen. Opening
// one before that pulls it in first. This only renders the markdown, computes
// the diffs and builds the solution dialogs - a training this size holds a
// couple hundred code samples across every slide and every exercise, and
// turning every one of them into a live CodeJar editor whether or not it's
// ever actually looked at is a lot of standing memory for nothing; that part
// is deferred further still, to the deck or project actually shown - see
// setupCodeBlocksOnce below.
let projectsReady = false;

function prepareProjects() {
  if (projectsReady) {
    return;
  }
  projectsReady = true;
  renderMarkdown();
  diffCodeBlocks();
  makeSolutionDialogs();
}

// Coloured and made editable once, the first time the deck or project
// holding it is actually shown - a second visit is a no-op, `key` (a deck or
// project id, prefixed so the two id spaces can't collide) is just tracked
// here for that. Not undone when you navigate away: unlike prepareProjects'
// one-time global pass, the cost here is naturally bounded by how much of
// the training you actually open in a given session, not by its whole size.
const codeBlocksReady = new Set();

function setupCodeBlocksOnce(key, codeEls) {
  if (codeBlocksReady.has(key) || !codeEls.length) {
    return;
  }
  codeBlocksReady.add(key);
  for (const codeEl of codeEls) {
    Prism.highlightElement(codeEl);
  }
  setupCodeBlocks(codeEls);
}

function setupDeckCodeBlocks(deckId) {
  const deck = decks[deckId];
  if (deck) {
    setupCodeBlocksOnce(`slides/${deckId}`, [...deck.querySelectorAll(SLIDE_SAMPLES)]);
  }
}

// A solution's dialog is appended straight to <body> (see makeSolutionDialogs),
// so it's no longer a descendant of its project by the time this runs - its
// own data-project, set there for exactly this, is how its code samples are
// still found and scoped to the right project.
function setupProjectCodeBlocks(id) {
  const project = projects[id];
  if (!project) {
    return;
  }
  const codeEls = [...project.querySelectorAll(MD_SAMPLES)];
  for (const dialog of document.querySelectorAll(`dialog.solution-dialog[data-project="${id}"]`)) {
    codeEls.push(...dialog.querySelectorAll(MD_SAMPLES));
  }
  setupCodeBlocksOnce(`project/${id}`, codeEls);
}

// clicking plain text elsewhere on the slide doesn't blur a contenteditable
// on its own (only clicking another focusable element does), so its focus
// ring and toolbar would otherwise stay stuck open after you click away
function blurCodeBlockIfEditing() {
  if (document.activeElement.closest(".code-block")) {
    document.activeElement.blur();
  }
}

// pointerdown, in the capture phase, ahead of everything else: dragging to
// draw a slide annotation is a press and a drag, which never fires a click
// at all, and the annotation layer's own pointerdown handler calls
// preventDefault, which per spec suppresses the mousedown/click a plain
// bubble-phase listener would otherwise get - so this has to see the
// pointerdown before that handler runs, not wait for what it leaves behind.
document.addEventListener("pointerdown", (ev) => {
  if (ev.target.closest(".code-block")) {
    return;
  }
  blurCodeBlockIfEditing();
  // typing, then clicking away within CodeJar's own ~30ms debounce: its
  // pending re-highlight still re-selects the caret to restore it, which
  // silently refocuses the block right after this blur. Catch that too.
  setTimeout(blurCodeBlockIfEditing, 50);
}, true);

function showDeck(deckId) {
  currentDeck = decks[deckId] ? deckId : currentDeck;
  for (const [id, el] of Object.entries(decks)) {
    el.classList.toggle("current", id === currentDeck);
  }
  setupDeckCodeBlocks(currentDeck);
  showSlide(deckIndex[currentDeck]);
}

startBtn.addEventListener("click", () => showSlide(0));
prevBtn.addEventListener("click", () => showSlide(deckIndex[currentDeck] - 1));
nextBtn.addEventListener("click", () => showSlide(deckIndex[currentDeck] + 1));

// ---------- printing a deck ----------

// Printing shows every slide of the current deck at once (CSS: .printing),
// each still exactly the slide-sized box it always is - so each one needs
// its own fitSlide() pass, the same one a lone current slide always gets,
// just run across all of them instead of one.
//
// This has to run on "beforeprint", not the button's click - the button is
// only a shortcut for window.print(), and the browser's own print command
// (Ctrl+P, a menu, ...) calls that exact same thing directly, skipping any
// click handler entirely. "beforeprint" fires for either one.
window.addEventListener("beforeprint", () => {
  document.body.classList.add("printing");
  // printing everything has already laid out and fitted the whole program
  // (bottom of this file) - this deck is only part of what is on the page
  if (document.body.classList.contains("printing-all")) {
    return;
  }
  for (const slide of slidesOf(currentDeck)) {
    fitSlide(slide);
  }
});

// fires whether the dialog was used to print or dismissed - either way,
// back to showing only the current slide
window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing");
  restorePrintAll();
});

document.getElementById("print-deck").addEventListener("click", () => {
  window.print();
});

// f toggles full screen on whichever of the two slide-shaped views is open
function fullscreenTarget() {
  if (!views.slides.hidden) {
    return views.slides;
  }
  return views.welcome.hidden ? null : views.welcome;
}

document.addEventListener("keydown", (ev) => {
  if (ev.target.closest("input, textarea, [contenteditable]")) {
    return;
  }
  if (ev.key !== "f" || ev.metaKey || ev.ctrlKey || ev.altKey) {
    return;
  }
  const target = fullscreenTarget();
  if (!target) {
    return;
  }
  ev.preventDefault();
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    target.requestFullscreen().catch(() => {});
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.target.closest("input, textarea, [contenteditable]")) {
    return;
  }
  if (views.slides.hidden) {
    return;
  }
  if (ev.key === "ArrowRight" || ev.key === " ") {
    ev.preventDefault();
    showSlide(deckIndex[currentDeck] + 1);
  } else if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    showSlide(deckIndex[currentDeck] - 1);
  } else if (ev.key === "Home") {
    ev.preventDefault();
    showSlide(0);
  }
});

// ---------- navigation between views ----------

// built above - the outline's slide rows share the .nav-item look but carry
// a slide number of their own, so they are wired up where they are built
const navItems = document.querySelectorAll(".nav-item:not(.slide-item)");
// every <section class="view" id="view-*">, whatever a project's sections/
// happen to hold - "slides", "project", "pad" and "welcome" get bespoke
// handling below (built into the engine); any other one is a plain page,
// handled generically, e.g. a project's own "resources" or a page like the
// masterclass's "odoosh" (see gas/CLAUDE.md)
const views = {};
for (const el of document.querySelectorAll('main > .view[id^="view-"]')) {
  views[el.id.slice("view-".length)] = el;
}

// same again: the pad is a section a project may simply not have
const padFrame = document.getElementById("pad-frame");
const padLink = document.getElementById("pad-link");
if (padLink) {
  padLink.href = PAD_URL;
}

// Where you had scrolled to on each page, for as long as the tab is open.
// Leaving a long document to check something else and coming back should land
// you where you were, not at the top of it.
const scrollTops = {};
let scrolledPage = null;
const scroller = document.querySelector("main");

function showView(name, itemId) {
  if (!views[name]) {
    name = "slides";
  }
  if (name === "project") {
    prepareProjects();
  }
  // read it before anything is hidden, or the browser has already lost it
  if (scrolledPage) {
    scrollTops[scrolledPage] = scroller.scrollTop;
  }
  for (const [key, view] of Object.entries(views)) {
    view.hidden = key !== name;
  }
  if (name === "slides") {
    showDeck(itemId || currentDeck);
  }
  if (name === "project") {
    showProject(itemId || currentProject);
  }
  // load the pad the first time the section is opened, not on page load
  if (name === "pad" && padFrame && !padFrame.src) {
    padFrame.src = PAD_URL;
  }
  // same for any other embedded page: a section nobody opens costs nothing,
  // which matters when the thing embedded is a whole site of its own
  if (views[name]) {
    for (const frame of views[name].querySelectorAll("iframe[data-src]")) {
      if (!frame.src) {
        frame.src = frame.dataset.src;
      }
    }
  }
  for (const item of navItems) {
    const current = name === "slides" ? currentDeck : currentProject;
    const active = item.dataset.view === name &&
      (!item.dataset.item || item.dataset.item === current);
    if (active) {
      item.setAttribute("aria-current", "page");
      // whatever you open unfolds its own topic, and nothing else moves
      if (item.dataset.topic) {
        openTopic(item.dataset.topic);
      }
    } else {
      item.removeAttribute("aria-current");
    }
  }
  scrolledPage = `${name}/${name === "project" ? currentProject : currentDeck}`;
  scroller.scrollTop = scrollTops[scrolledPage] || 0;
  syncEditor();
}

for (const item of navItems) {
  item.addEventListener("click", () => {
    const id = item.dataset.item;
    location.hash = id ? `${item.dataset.view}/${id}` : item.dataset.view;
    // clicking the same entry twice leaves the hash unchanged, so sync by hand
    syncFromHash();
  });
}

// A click with the mouse leaves the button focused, and the next arrow key
// then paints a focus ring around the sidebar instead of moving the deck on.
// ev.detail is 0 when the click came from the keyboard, which keeps its ring.
document.querySelector(".sidebar").addEventListener("click", (ev) => {
  const button = ev.target.closest("button");
  if (button && ev.detail) {
    button.blur();
  }
});

// the sidebar title opens the welcome cover
document.getElementById("home").addEventListener("click", () => {
  location.hash = "welcome";
  syncFromHash();
});

function syncFromHash() {
  const [view, id, extra] = location.hash.slice(1).split("/");
  // a third part is the slide to open, counted from 1 as the counter shows
  // it, for a deck - or the heading id to land on, for a project
  if (view === "slides" && decks[id] && extra) {
    const n = parseInt(extra, 10);
    if (n > 0) {
      deckIndex[id] = n - 1;
    }
  }
  showView(view || "slides", id);
  if (view === "project" && extra) {
    projects[id]?.querySelector(`[id="${extra}"]`)?.scrollIntoView({ block: "start" });
  }
}

// ---------- edit mode: ?mode=edit ----------

const EDIT_MODE = new URLSearchParams(location.search).get("mode") === "edit";
const EDITS_KEY = "owf-slide-notes";
const POS_KEY = "owf-editor-pos";
const MINIMIZED_KEY = "owf-editor-minimized";

const editorEl = document.getElementById("editor");
const editorTitle = document.getElementById("editor-title");
const editorTitleLabel = document.getElementById("editor-title-label");
const editorComment = document.getElementById("editor-comment");
const editorMeta = document.getElementById("editor-meta");

const KIND_LABEL = { slide: "Current slide", section: "Exercise", solution: "Solution" };

const DECK_LABEL = {};
const PROJECT_LABEL = {};
for (const { topic, items } of PROGRAM) {
  const decksHere = items.filter((item) => item.type === "slides").length;
  for (const item of items) {
    const into = item.type === "slides" ? DECK_LABEL : PROJECT_LABEL;
    // the one deck of a topic is called "Presentation", which names nothing in
    // a note: the topic does that better. Past the first, each needs its own.
    into[item.id] = topic && item.type === "slides" && decksHere === 1
      ? topic
      : item.label;
  }
}

const VIEW_LABEL = { welcome: "Welcome" };
for (const item of navItems) {
  if (!item.dataset.item) {
    VIEW_LABEL[item.dataset.view] = item.textContent.trim();
  }
}

// notes are ordered the way the sidebar is - VIEW_LABEL already holds every
// top-level view a nav-item points at (pad, resources, welcome, and
// whatever plain "view" pages a project's program adds, e.g. odoosh)
const GROUP_ORDER = [
  ...Object.keys(DECK_LABEL),
  ...Object.keys(PROJECT_LABEL),
  ...Object.keys(VIEW_LABEL),
];

let notes = readStore(EDITS_KEY, {});

function saveNotes() {
  try {
    localStorage.setItem(EDITS_KEY, JSON.stringify(notes));
  } catch (err) {
    // private windows and blocked storage: notes stay for this session only
  }
}

function noteHasContent(n) {
  return Boolean(n.op) || Boolean(n.comment) ||
    Boolean(n.marks && n.marks.length) ||
    (n.title != null && n.title !== n.originalTitle);
}

function newSlideId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

let editorSlide = null;

function titleOf(el) {
  // a slide's own heading is an h2, an exercise's is its markdown's lone
  // h1 - either is "the" heading, whichever of the two an element has
  const heading = el.querySelector("h1, h2");
  return heading ? heading.textContent.replace(/\s+/g, " ").trim() : "";
}

function currentTarget() {
  if (!EDIT_MODE) {
    return null;
  }
  // a solution opens over everything else, project view included - it's
  // what's actually on screen, so it outranks the exercise behind it
  const openDialog = document.querySelector("dialog.solution-dialog[open]");
  const solutionBody = openDialog && openDialog.querySelector(".solution-body");
  if (solutionBody) {
    return {
      kind: "solution",
      el: solutionBody,
      id: openDialog.dataset.id,
      group: openDialog.dataset.project,
      label: `${PROJECT_LABEL[openDialog.dataset.project] || openDialog.dataset.project} — ${openDialog.dataset.title}`,
      title: openDialog.dataset.title,
    };
  }
  if (!views.slides.hidden) {
    const slides = slidesOf(currentDeck);
    const el = slides[deckIndex[currentDeck]];
    return el && {
      kind: "slide",
      el,
      id: el.dataset.id,
      group: currentDeck,
      label: DECK_LABEL[currentDeck] || currentDeck,
      index: deckIndex[currentDeck] + 1,
      total: slides.length,
      title: titleOf(el),
    };
  }
  if (!views.project.hidden) {
    const el = projects[currentProject];
    return el && {
      kind: "section",
      el,
      id: el.dataset.id,
      group: currentProject,
      label: PROJECT_LABEL[currentProject] || currentProject,
      title: titleOf(el),
    };
  }
  for (const [name, view] of Object.entries(views)) {
    if (name !== "slides" && name !== "project" && !view.hidden) {
      return {
        kind: "section",
        el: view,
        id: view.dataset.id,
        group: name,
        label: VIEW_LABEL[name] || name,
        title: titleOf(view) || VIEW_LABEL[name] || name,
      };
    }
  }
  return null;
}

function syncEditor() {
  if (!EDIT_MODE) {
    return;
  }
  editorSlide = currentTarget();
  const noted = Object.values(notes).filter(noteHasContent).length;
  const tally = noted === 1 ? "1 note" : `${noted} notes`;
  if (!editorSlide) {
    editorEl.dataset.empty = "1";
    editorTitle.value = "";
    editorComment.value = "";
    editorMeta.textContent = `Nothing open to annotate. ${tally}.`;
    placeLayer();
    return;
  }
  editorEl.dataset.empty = "0";
  editorEl.dataset.kind = editorSlide.kind;
  editorTitleLabel.textContent = KIND_LABEL[editorSlide.kind] || "Title";
  const note = notes[editorSlide.id] || {};
  editorTitle.value = note.title != null ? note.title : editorSlide.title;
  editorComment.value = note.comment || "";
  const where = editorSlide.kind === "slide"
    ? `${editorSlide.index}/${editorSlide.total}`
    : editorSlide.kind;
  const drawn = marksOf(editorSlide).length;
  const drawings = drawn ? ` · ${drawn === 1 ? "1 drawing" : `${drawn} drawings`}` : "";
  editorMeta.textContent =
    `${editorSlide.label} · ${where} · #${editorSlide.id} · ${tally}${drawings}`;
  placeLayer();
}

function noteFor(target) {
  const note = notes[target.id] || (notes[target.id] = {});
  note.kind = target.kind;
  note.group = target.group;
  note.label = target.label;
  note.index = target.index || 0;
  note.originalTitle = target.title;
  return note;
}

editorTitle.addEventListener("input", () => {
  if (!editorSlide) {
    return;
  }
  noteFor(editorSlide).title = editorTitle.value;
  saveNotes();
  syncEditor();
});

editorComment.addEventListener("input", () => {
  if (!editorSlide) {
    return;
  }
  noteFor(editorSlide).comment = editorComment.value;
  saveNotes();
  syncEditor();
});

// Both of these change the page so you can keep working, and record the
// operation so the export can tell me to make the same change in the file.
function addSlide() {
  if (!editorSlide || editorSlide.kind !== "slide") {
    return;
  }
  const from = slidesOf(currentDeck)[deckIndex[currentDeck]];
  const el = document.createElement("article");
  el.className = "slide";
  el.dataset.id = newSlideId();
  const heading = document.createElement("h2");
  heading.textContent = "New slide";
  el.append(heading);
  from.after(el);

  notes[el.dataset.id] = {
    op: "add",
    after: editorSlide.id,
    kind: "slide",
    group: currentDeck,
    label: DECK_LABEL[currentDeck] || currentDeck,
    index: editorSlide.index + 1,
    originalTitle: "New slide",
    title: "New slide",
    comment: "",
  };
  saveNotes();
  showSlide(deckIndex[currentDeck] + 1);
  editorTitle.focus();
  editorTitle.select();
}

function deleteSlide() {
  if (!editorSlide || editorSlide.kind !== "slide") {
    return;
  }
  const slides = slidesOf(currentDeck);
  if (slides.length < 2) {
    alert("A presentation needs at least one slide.");
    return;
  }
  if (!confirm(`Delete slide ${editorSlide.index}, "${editorSlide.title}"?`)) {
    return;
  }
  const el = slides[deckIndex[currentDeck]];
  const note = notes[editorSlide.id];
  if (note && note.op === "add") {
    // it never reached the file, so there is nothing to report
    delete notes[editorSlide.id];
  } else {
    notes[editorSlide.id] = {
      op: "delete",
      kind: "slide",
      group: currentDeck,
      label: DECK_LABEL[currentDeck] || currentDeck,
      index: editorSlide.index,
      originalTitle: editorSlide.title,
      comment: note ? note.comment : "",
    };
  }
  el.remove();
  saveNotes();
  showSlide(Math.min(deckIndex[currentDeck], slidesOf(currentDeck).length - 1));
}

document.getElementById("new-slide").addEventListener("click", addSlide);
document.getElementById("del-slide").addEventListener("click", deleteSlide);

// ---------- edit mode: "Edit source" (talks to dev.py's /api/source) ----------

// A slide, a project or a view all stamp their own root element with where
// they came from (gas/build.py's stamp_source) - data-src is a file path
// relative to the project, data-src-kind either "html-block" (this element,
// found again by its data-id, is what a save replaces) or "markdown-file"
// (the whole file is the unit, used for a project sourced from
// build:markdown - see makeStepTarget/makeSolutionTarget below for the
// finer-grained markdown-heading/markdown-solution kinds, scoped to one
// exercise step or one of its solutions instead of the whole file).
function sourceTargetFor(target) {
  if (!target) {
    return null;
  }
  if (target.kind === "solution") {
    // target.title is the step heading the open dialog was built from (see
    // makeSolutionDialogs' dialog.dataset.title) - the exact same thing its
    // own inline "Edit" button next to "Show solution" already addresses
    // with, so this resolves to just the solution too, not the whole file
    const project = projects[target.group];
    return project && project.dataset.src && target.title
      ? { file: project.dataset.src, kind: "markdown-solution", heading: target.title, label: target.label }
      : null;
  }
  const root = target.el.closest("[data-src]");
  if (!root) {
    return null;
  }
  return root.dataset.srcKind === "markdown-file"
    ? { file: root.dataset.src, kind: "markdown-file", label: target.label }
    : {
        file: root.dataset.src,
        kind: "html-block",
        id: target.id,
        label: target.label,
        // "New slide" (the toolbar) only makes sense here: inserted next to
        // a plain project's or view's own block it would just be dead
        // markup, never picked up as a real slide (build.py classifies a
        // section file by its *first* element, and only a deck's is that)
        isSlide: target.kind === "slide",
      };
}

const sourceDialog = document.getElementById("source-dialog");
const sourceTitleEl = document.getElementById("source-title");
const sourceStatusEl = document.getElementById("source-status");
const sourceRawCode = document.getElementById("source-raw-code");
const editSourceBtn = document.getElementById("edit-source");
const sourceInsertSlideBtn = document.getElementById("source-insert-slide");
const sourceCopySlideBtn = document.getElementById("source-copy-slide");

// always editable, syntax-coloured as you type - the same CodeJar every
// code sample elsewhere on the page uses (see setupCodeBlocks), one
// instance reused across opens via jar.updateCode() rather than a fresh one
// each time
sourceRawCode.classList.add("drop-tokens");
const sourceJar = CodeJar(sourceRawCode, (editor) => Prism.highlightElement(editor));

// a toolbar button's own mousedown otherwise steals focus from the editor
// before its click handler ever runs - once that happens the selection is
// no longer inside it, and CodeJar's save() falls back to "the end of the
// text" for a cursor position it can't find, so every insert would land at
// the bottom instead of wherever you actually clicked. preventDefault on
// mousedown (not click) is what suppresses that default focus move, while
// leaving the click itself - and the selection - completely alone.
document.getElementById("source-toolbar").addEventListener("mousedown", (ev) => {
  if (ev.target.closest("button")) {
    ev.preventDefault();
  }
});

let sourceCtx = null; // {file, kind, id, heading, label, isSlide} of what's open

function setSourceStatus(message, isError) {
  sourceStatusEl.hidden = !message;
  sourceStatusEl.textContent = message || "";
  sourceStatusEl.classList.toggle("error", !!isError);
}

async function openSourceEditor(target) {
  if (!target) {
    window.alert("Nothing here comes from an editable file (rebuild the site if this looks wrong).");
    return;
  }
  sourceCtx = target;
  sourceTitleEl.textContent = `Edit source — ${target.label || target.file}`;
  sourceInsertSlideBtn.hidden = !target.isSlide;
  sourceCopySlideBtn.hidden = !target.isSlide;
  setSourceStatus("Loading…");
  sourceJar.updateCode("");
  sourceDialog.showModal();
  const query = new URLSearchParams({
    file: target.file,
    kind: target.kind,
    id: target.id || "",
    heading: target.heading || "",
  });
  try {
    const res = await fetch(`/api/source?${query}`);
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "failed to load");
    }
    sourceJar.updateCode(data.source);
    setSourceStatus("");
    sourceRawCode.focus();
  } catch (err) {
    // the most common cause by far: this page isn't served by dev.py (a
    // static file:// open, or the published site) - there's simply no
    // server on the other end of that fetch to answer it
    setSourceStatus(
      "Couldn't load this - Edit source only works when served locally by dev.py.",
      true,
    );
  }
}

editSourceBtn.addEventListener("click", () => {
  openSourceEditor(sourceTargetFor(currentTarget()));
});

document.getElementById("source-close").addEventListener("click", () => sourceDialog.close());
document.getElementById("source-cancel").addEventListener("click", () => sourceDialog.close());

document.getElementById("source-save").addEventListener("click", async () => {
  if (!sourceCtx) {
    return;
  }
  setSourceStatus("Saving…");
  try {
    const res = await fetch("/api/source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sourceCtx, source: sourceJar.toString() }),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "failed to save");
    }
    setSourceStatus("Saved — reloading…");
    // the file just changed on disk - dev.py (always watching) rebuilds
    // within half a second, this reload picks that fresh build back up
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    setSourceStatus(err.message || "Couldn't save.", true);
  }
});

// insert boilerplate at the cursor (or replacing the current selection),
// cursor left right after it - jar.save()/restore() are CodeJar's own
// character-offset equivalent of a textarea's selectionStart/selectionEnd
function insertAtCursor(text) {
  const pos = sourceJar.save();
  const start = Math.min(pos.start, pos.end);
  const end = Math.max(pos.start, pos.end);
  const code = sourceJar.toString();
  sourceJar.updateCode(code.slice(0, start) + text + code.slice(end));
  sourceJar.restore({ start: start + text.length, end: start + text.length });
}

document.getElementById("source-insert-code").addEventListener("click", () => {
  // a standalone sample in an exercise's markdown is a plain fence (marked
  // renders that into the same pre>code[class] shape Prism/CodeJar expect) -
  // only a diff-cols before/after (see below) has no markdown equivalent
  // and needs the literal HTML on both sides, slide or exercise alike
  const isMarkdown = sourceCtx && sourceCtx.kind !== "html-block";
  insertAtCursor(
    isMarkdown
      ? "```js\n\n```"
      : '<pre><code class="language-javascript">\n\n</code></pre>',
  );
});

document.getElementById("source-insert-diff").addEventListener("click", () => {
  insertAtCursor(
    '<div class="diff-cols">\n<div class="before">\n<h4>Before</h4>\n\n' +
    '<pre><code class="language-javascript"></code></pre>\n\n</div>\n' +
    '<div class="after">\n<h4>After</h4>\n\n' +
    '<pre><code class="language-javascript"></code></pre>\n\n</div>\n</div>',
  );
});

document.getElementById("source-insert-link").addEventListener("click", () => {
  const pos = sourceJar.save();
  const start = Math.min(pos.start, pos.end);
  const end = Math.max(pos.start, pos.end);
  const code = sourceJar.toString();
  const selected = code.slice(start, end);
  // editing an existing link: recognize either syntax in the current
  // selection and prefill from it, instead of always starting blank
  const md = selected.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
  const html = selected.match(/^<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>$/i);
  const label = md ? md[1] : html ? html[2] : selected;
  const url = md ? md[2] : html ? html[1] : "https://";
  const newLabel = window.prompt("Link text", label);
  if (newLabel === null) {
    return;
  }
  const newUrl = window.prompt("Link URL", url);
  if (newUrl === null) {
    return;
  }
  const isMarkdown = sourceCtx && sourceCtx.kind !== "html-block";
  const replacement = isMarkdown ? `[${newLabel}](${newUrl})` : `<a href="${newUrl}">${newLabel}</a>`;
  sourceJar.updateCode(code.slice(0, start) + replacement + code.slice(end));
  sourceJar.restore({ start: start + replacement.length, end: start + replacement.length });
});

document.getElementById("source-insert-slide").addEventListener("click", () => {
  insertAtCursor(`<article class="slide" data-id="${newSlideId()}">\n    <h2>New slide</h2>\n</article>\n`);
});

// duplicates whatever's currently in the editor (this exact slide, edits
// included) right after itself, with a fresh data-id - the usual way a new
// slide actually gets made in practice, copying a similar existing one
// rather than starting from New slide's bare stub above
document.getElementById("source-copy-slide").addEventListener("click", () => {
  const code = sourceJar.toString();
  const copy = code.replace(/data-id="[0-9a-f]{8}"/, `data-id="${newSlideId()}"`);
  const updated = `${code}\n${copy}`;
  sourceJar.updateCode(updated);
  sourceJar.restore({ start: updated.length, end: updated.length });
});

// "Edit source" only works served by dev.py (the /api/source it needs) -
// checked once, right away, so the panel button and every inline pencil can
// just not be there at all on a file:// open or the published site, rather
// than offering something that would only fail when clicked. Buttons are
// still created unconditionally elsewhere (this resolves in parallel,
// essentially instantly for a same-machine dev.py) - simpler and more
// robust than threading an awaited check through every place one is made,
// at the cost of a rare, brief flash if this is ever unusually slow.
const sourceApiCheck = EDIT_MODE
  ? fetch("/api/source?file=&kind=markdown-file")
      .then((res) => res.json())
      .then((data) => typeof data === "object" && data !== null && "ok" in data)
      .catch(() => false)
  : Promise.resolve(false);

sourceApiCheck.then((available) => {
  if (available) {
    return;
  }
  editSourceBtn.hidden = true;
  paletteSelect.hidden = true;
  for (const btn of document.querySelectorAll(".md-edit-btn")) {
    btn.remove();
  }
});

// ---------- edit mode: palette picker (writes into config.js) ----------
//
// The project's own default palette, not a personal one - see "theme
// (light/dark)" up top for why that one differs. Writes straight into
// config.js's GAS_CONFIG.palette via the exact same /api/source save every
// other Edit source uses (kind: "markdown-file" - a slight misnomer here,
// but the server never actually treats that kind as markdown-specific,
// just "replace the whole file" - config.js works exactly the same way a
// project's own markdown file would).

const paletteSelect = document.getElementById("palette-select");
for (const link of document.querySelectorAll("link[data-palette]")) {
  const option = document.createElement("option");
  option.value = link.dataset.palette;
  // uppercased - reads fine for a name ("CLAUDE") and is exactly right for
  // an initialism ("OXP26") without needing to tell the two apart; a
  // hyphenated file name ("tokyo-night") just reads as two words
  option.textContent = link.dataset.palette.replace(/-/g, " ").toUpperCase();
  paletteSelect.append(option);
}
paletteSelect.value = document.documentElement.dataset.palette;

function withPaletteField(text, name) {
  const field = /(\bpalette\s*:\s*)"[^"]*"/;
  if (field.test(text)) {
    return text.replace(field, `$1"${name}"`);
  }
  const assignment = /(window\.GAS_CONFIG\s*=\s*\{)/;
  if (!assignment.test(text)) {
    return null;
  }
  return text.replace(assignment, `$1\n  palette: "${name}",`);
}

paletteSelect.addEventListener("change", async () => {
  const name = paletteSelect.value;
  const previous = document.documentElement.dataset.palette;
  document.documentElement.dataset.palette = name; // preview immediately
  try {
    const res = await fetch("/api/source?file=config.js&kind=markdown-file");
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "failed to load config.js");
    }
    const updated = withPaletteField(data.source, name);
    if (updated === null) {
      throw new Error("config.js doesn't look like window.GAS_CONFIG = {...} - not saved");
    }
    const saveRes = await fetch("/api/source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "config.js", kind: "markdown-file", source: updated }),
    });
    const saveData = await saveRes.json();
    if (!saveData.ok) {
      throw new Error(saveData.error || "failed to save config.js");
    }
  } catch (err) {
    document.documentElement.dataset.palette = previous; // undo the preview
    window.alert(`Couldn't save the palette to config.js: ${err.message}`);
  }
});

// ---------- drawing on the slide ----------

// A red layer sits over whatever is open. What you draw is kept on the note
// in percentages of the slide box, so it holds at any size, together with
// the words it was drawn over, which is what the export reads back.
const SVG_NS = "http://www.w3.org/2000/svg";
const RED = "#e11d1d";

const layer = document.createElement("div");
layer.className = "annot-layer";
layer.hidden = true;
const canvas = document.createElementNS(SVG_NS, "svg");
layer.append(canvas);

const toolBtns = {
  line: document.getElementById("tool-line"),
  arrow: document.getElementById("tool-arrow"),
  rect: document.getElementById("tool-rect"),
  text: document.getElementById("tool-text"),
};

let tool = null;             // a key of toolBtns, or nothing
let sketch = null;           // the line being dragged right now
let layerBox = { w: 0, h: 0 };

// reading them must not create a note: every slide looked at would get one
function marksOf(target) {
  const note = target && notes[target.id];
  return (note && note.marks) || [];
}

function drawMark(mark) {
  const { w, h } = layerBox;
  const weight = Math.max(2, w / 340);
  if (mark.type === "rect") {
    const box = document.createElementNS(SVG_NS, "rect");
    box.setAttribute("x", (Math.min(mark.x1, mark.x2) / 100) * w);
    box.setAttribute("y", (Math.min(mark.y1, mark.y2) / 100) * h);
    box.setAttribute("width", (Math.abs(mark.x2 - mark.x1) / 100) * w);
    box.setAttribute("height", (Math.abs(mark.y2 - mark.y1) / 100) * h);
    box.setAttribute("rx", weight * 1.5);
    box.setAttribute("fill", "none");
    box.setAttribute("stroke", RED);
    box.setAttribute("stroke-width", weight);
    return box;
  }
  if (mark.type === "line" || mark.type === "arrow") {
    const x1 = (mark.x1 / 100) * w;
    const y1 = (mark.y1 / 100) * h;
    const x2 = (mark.x2 / 100) * w;
    const y2 = (mark.y2 / 100) * h;
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", RED);
    line.setAttribute("stroke-width", weight);
    line.setAttribute("stroke-linecap", "round");
    if (mark.type === "line") {
      return line;
    }
    // a triangle at the far end, turned to sit on the stroke
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(9, weight * 5);
    const wing = (turn) =>
      `${x2 - head * Math.cos(angle + turn)},${y2 - head * Math.sin(angle + turn)}`;
    const tip = document.createElementNS(SVG_NS, "polygon");
    tip.setAttribute("points", `${x2},${y2} ${wing(0.42)} ${wing(-0.42)}`);
    tip.setAttribute("fill", RED);
    const arrow = document.createElementNS(SVG_NS, "g");
    arrow.append(line, tip);
    return arrow;
  }
  const x = (mark.x / 100) * w;
  const y = (mark.y / 100) * h;
  const size = Math.max(13, w / 45);
  const group = document.createElementNS(SVG_NS, "g");
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("cx", x);
  dot.setAttribute("cy", y);
  dot.setAttribute("r", Math.max(2.5, w / 400));
  dot.setAttribute("fill", RED);
  const text = document.createElementNS(SVG_NS, "text");
  // words dropped near the right edge run back towards the middle
  const toLeft = mark.x > 70;
  text.setAttribute("x", toLeft ? x - size * 0.45 : x + size * 0.45);
  text.setAttribute("y", y + size * 0.35);
  text.setAttribute("text-anchor", toLeft ? "end" : "start");
  text.setAttribute("font-size", size);
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", RED);
  // an outline keeps them readable over whatever they cover
  text.setAttribute("stroke", "#fff");
  text.setAttribute("stroke-width", size / 5);
  text.setAttribute("paint-order", "stroke");
  text.textContent = mark.text;
  group.append(dot, text);
  return group;
}

function renderMarks() {
  canvas.textContent = "";
  for (const mark of marksOf(editorSlide)) {
    canvas.append(drawMark(mark));
  }
  if (sketch) {
    canvas.append(drawMark(sketch));
  }
}

function placeLayer() {
  const el = editorSlide && editorSlide.el;
  if (!EDIT_MODE || !el || !el.isConnected) {
    layer.hidden = true;
    return;
  }
  const box = el.getBoundingClientRect();
  layerBox = { w: box.width, h: box.height };
  layer.hidden = false;
  layer.style.left = `${box.left}px`;
  layer.style.top = `${box.top}px`;
  layer.style.width = `${box.width}px`;
  layer.style.height = `${box.height}px`;
  canvas.setAttribute("width", box.width);
  canvas.setAttribute("height", box.height);
  renderMarks();
}

window.addEventListener("resize", placeLayer);
window.addEventListener("scroll", placeLayer, true);
document.addEventListener("fullscreenchange", placeLayer);

function percentAt(ev) {
  const box = layer.getBoundingClientRect();
  return {
    x: Math.round(((ev.clientX - box.left) / box.width) * 1000) / 10,
    y: Math.round(((ev.clientY - box.top) / box.height) * 1000) / 10,
  };
}

function clip(raw) {
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length > 70 ? `${text.slice(0, 67)}...` : text;
}

// What the pointer is on, in words: the bullet or heading right under it, or
// the nearest one when it lands on empty space. This is what turns a stroke
// on the screen into a sentence someone else can act on.
function anchorAt(ev) {
  const el = editorSlide && editorSlide.el;
  if (!el) {
    return null;
  }
  // the layer itself is skipped, so is the slide as a whole: the deepest
  // element under the pointer is the one worth naming
  for (const node of document.elementsFromPoint(ev.clientX, ev.clientY)) {
    if (layer.contains(node) || node === el || !el.contains(node)) {
      continue;
    }
    const text = clip(node.textContent);
    if (text) {
      return { text, over: true };
    }
  }
  let best = null;
  for (const node of el.querySelectorAll("h2, h3, li, p, dt, dd")) {
    const box = node.getBoundingClientRect();
    const dx = Math.max(box.left - ev.clientX, 0, ev.clientX - box.right);
    const dy = Math.max(box.top - ev.clientY, 0, ev.clientY - box.bottom);
    const distance = Math.hypot(dx, dy);
    if (!best || distance < best.distance) {
      best = { distance, text: clip(node.textContent) };
    }
  }
  // any further away and "near" would be a lie
  if (best && best.text && best.distance < layerBox.h * 0.25) {
    return { text: best.text, over: false };
  }
  return null;
}

// What a box encloses, in words: the items whose middle falls inside it.
function enclosedBy(mark) {
  const el = editorSlide && editorSlide.el;
  if (!el) {
    return [];
  }
  const box = layer.getBoundingClientRect();
  const left = box.left + (Math.min(mark.x1, mark.x2) / 100) * box.width;
  const right = box.left + (Math.max(mark.x1, mark.x2) / 100) * box.width;
  const top = box.top + (Math.min(mark.y1, mark.y2) / 100) * box.height;
  const bottom = box.top + (Math.max(mark.y1, mark.y2) / 100) * box.height;
  const held = [];
  for (const node of el.querySelectorAll("h2, h3, li, p, dt, dd")) {
    const r = node.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const text = clip(node.textContent);
    if (text && x >= left && x <= right && y >= top && y <= bottom) {
      held.push(text);
    }
  }
  return held.slice(0, 4);
}

function addMark(mark) {
  const note = noteFor(editorSlide);
  note.marks = note.marks || [];
  note.marks.push(mark);
  saveNotes();
  syncEditor();
}

function setTool(next) {
  tool = tool === next ? null : next;
  if (tool) {
    layer.dataset.tool = tool;
  } else {
    delete layer.dataset.tool;
  }
  for (const [name, button] of Object.entries(toolBtns)) {
    button.setAttribute("aria-pressed", String(tool === name));
  }
}

for (const [name, button] of Object.entries(toolBtns)) {
  button.addEventListener("click", () => setTool(name));
}

document.getElementById("tool-undo").addEventListener("click", () => {
  const note = editorSlide && notes[editorSlide.id];
  if (!note || !note.marks || !note.marks.length) {
    return;
  }
  note.marks.pop();
  if (!note.marks.length) {
    delete note.marks;
  }
  saveNotes();
  syncEditor();
});

// escape drops the tool, so the slide takes the mouse again
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && tool && !ev.target.closest("input, textarea, [contenteditable]")) {
    setTool(null);
  }
});

layer.addEventListener("pointerdown", (ev) => {
  if (!tool || !editorSlide) {
    return;
  }
  ev.preventDefault();
  const point = percentAt(ev);
  if (tool === "text") {
    openTextInput(ev, point);
    return;
  }
  sketch = {
    type: tool,
    x1: point.x, y1: point.y,
    x2: point.x, y2: point.y,
    from: anchorAt(ev),
  };
  layer.setPointerCapture(ev.pointerId);
});

layer.addEventListener("pointermove", (ev) => {
  if (!sketch) {
    return;
  }
  const point = percentAt(ev);
  sketch.x2 = point.x;
  sketch.y2 = point.y;
  renderMarks();
});

layer.addEventListener("pointerup", (ev) => {
  if (!sketch) {
    return;
  }
  const stroke = sketch;
  sketch = null;
  // a click that went nowhere is not a stroke
  if (Math.hypot(stroke.x2 - stroke.x1, stroke.y2 - stroke.y1) < 1.5) {
    renderMarks();
    return;
  }
  if (stroke.type === "rect") {
    stroke.holds = enclosedBy(stroke);
  } else {
    stroke.to = anchorAt(ev);
  }
  addMark(stroke);
});

// the text tool types straight onto the slide, where you clicked
function openTextInput(ev, point) {
  const open = layer.querySelector(".annot-input");
  if (open) {
    open.blur();
  }
  const box = layer.getBoundingClientRect();
  const anchor = anchorAt(ev);
  const input = document.createElement("input");
  input.className = "annot-input";
  input.style.left = `${ev.clientX - box.left + 8}px`;
  input.style.top = `${ev.clientY - box.top - 14}px`;

  let done = false;
  function close(save) {
    if (done) {
      return;
    }
    done = true;
    const text = input.value.trim();
    input.remove();
    if (save && text) {
      addMark({ type: "text", x: point.x, y: point.y, text, anchor });
    }
  }

  input.addEventListener("keydown", (keyEv) => {
    if (keyEv.key === "Enter") {
      close(true);
    } else if (keyEv.key === "Escape") {
      close(false);
    }
  });
  input.addEventListener("blur", () => close(true));

  layer.append(input);
  input.focus();
}

function clearNotes() {
  const noted = Object.values(notes).filter(noteHasContent).length;
  if (!noted) {
    return false;
  }
  if (!confirm(`Delete ${noted === 1 ? "the note" : `all ${noted} notes`}?`)) {
    return false;
  }
  notes = {};
  saveNotes();
  syncEditor();
  return true;
}

document.getElementById("clear-btn").addEventListener("click", clearNotes);

// ---------- export ----------

// Coordinates on their own say nothing, so each drawing is read back as a
// sentence: where it runs, and across which words.
function describeMark(mark) {
  const on = (a) => (a && a.text ? ` ${a.over ? "over" : "near"} "${a.text}"` : "");
  const span = `from ${mark.x1}%,${mark.y1}% to ${mark.x2}%,${mark.y2}%`;
  if (mark.type === "rect") {
    const held = (mark.holds || []).map((text) => `"${text}"`);
    if (held.length) {
      return `red box around ${held.join(", ")}, corners ${span}`;
    }
    return `red box on empty space, corners ${span}${on(mark.from)}`;
  }
  if (mark.type === "arrow") {
    // an arrow is about its far end, so that is what the sentence leads with
    if (mark.to && mark.to.text) {
      const start = mark.from && mark.from.text !== mark.to.text
        ? `, starting${on(mark.from)}` : "";
      return `red arrow pointing ${mark.to.over ? "at" : "towards"} ` +
        `"${mark.to.text}"${start}, ${span}`;
    }
    const start = mark.from ? `, starting${on(mark.from)}` : "";
    return `red arrow ${span}${start}`;
  }
  if (mark.type === "line") {
    // a line that starts and ends on the same words is drawn across them
    if (mark.from && mark.to && mark.from.text === mark.to.text) {
      return `red line ${mark.from.over ? "across" : "beside"} ` +
        `"${mark.from.text}", ${span}`;
    }
    return `red line from ${mark.x1}%,${mark.y1}%${on(mark.from)}` +
      ` to ${mark.x2}%,${mark.y2}%${on(mark.to)}`;
  }
  return `red text "${mark.text}" at ${mark.x}%,${mark.y}%${on(mark.anchor)}`;
}

function buildExport() {
  const rank = (note) => GROUP_ORDER.indexOf(note.group || note.deck);
  const rows = Object.entries(notes)
    .filter(([, note]) => noteHasContent(note))
    .sort((a, b) => (rank(a[1]) - rank(b[1])) || ((a[1].index || 0) - (b[1].index || 0)));

  if (!rows.length) {
    return "No notes yet.";
  }

  const lines = [
    `Slide notes for ${CONFIG.title || document.title}`,
    `Generated ${new Date().toISOString()}`,
    "",
  ];
  if (rows.some(([, note]) => note.marks && note.marks.length)) {
    lines.splice(2, 0,
      "Drawings are given as x%,y% of the slide box, 0,0 being its top left,",
      "with the text they were drawn over quoted next to them.");
  }
  rows.forEach(([id, note], i) => {
    const group = note.group || note.deck;
    const label = note.label || DECK_LABEL[group] || group;
    if (note.kind === "section" || note.kind === "solution") {
      lines.push(`[${i + 1}] ${label} — ${note.kind} — data-id="${id}"`);
    } else {
      // a slide still on the page knows its own position better than the note does
      const live = document.querySelector(`.slide[data-id="${id}"]`);
      const where = live
        ? Array.from(slidesOf(group)).indexOf(live) + 1
        : note.index;
      if (note.op === "add") {
        lines.push(`[${i + 1}] ${label} — NEW SLIDE, insert after data-id="${note.after}" — data-id="${id}"`);
      } else if (note.op === "delete") {
        lines.push(`[${i + 1}] ${label} — DELETE slide ${where} — data-id="${id}"`);
      } else {
        lines.push(`[${i + 1}] ${label} — slide ${where} — data-id="${id}"`);
      }
    }
    lines.push(`    title: ${note.originalTitle}`);
    if (note.title != null && note.title !== note.originalTitle) {
      lines.push(`    retitle to: ${note.title}`);
    }
    if (note.comment) {
      for (const line of note.comment.split("\n")) {
        lines.push(`    note: ${line}`);
      }
    }
    for (const mark of note.marks || []) {
      lines.push(`    drawing: ${describeMark(mark)}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}

function openExport() {
  const back = document.createElement("div");
  back.className = "export-back";
  const card = document.createElement("div");
  card.className = "export-card";
  const area = document.createElement("textarea");
  area.value = buildExport();
  area.spellcheck = false;
  const actions = document.createElement("div");
  actions.className = "export-actions";
  const status = document.createElement("span");
  status.className = "editor-meta";
  const copy = document.createElement("button");
  copy.textContent = "Copy";
  const clear = document.createElement("button");
  clear.textContent = "Clear all notes";
  const close = document.createElement("button");
  close.textContent = "Close";

  copy.addEventListener("click", async () => {
    area.select();
    try {
      await navigator.clipboard.writeText(area.value);
      status.textContent = "Copied";
    } catch (err) {
      // clipboard access is often refused on file://, the selection stands in
      status.textContent = "Press ctrl+c to copy the selection";
    }
  });

  clear.addEventListener("click", () => {
    if (clearNotes()) {
      area.value = buildExport();
      status.textContent = "Cleared";
    }
  });

  function dismiss() {
    back.remove();
  }

  close.addEventListener("click", dismiss);
  back.addEventListener("click", (ev) => {
    if (ev.target === back) {
      dismiss();
    }
  });

  actions.append(status, clear, copy, close);
  card.append(area, actions);
  back.append(card);
  document.body.append(back);
  area.focus();
}

document.getElementById("export-btn").addEventListener("click", openExport);

// ---------- the panel can be dragged by its header ----------

const editorHead = editorEl.querySelector(".editor-head");
let drag = null;

function placeEditor(x, y) {
  const maxX = window.innerWidth - editorEl.offsetWidth;
  const maxY = window.innerHeight - editorEl.offsetHeight;
  editorEl.style.right = "auto";
  editorEl.style.bottom = "auto";
  editorEl.style.left = `${Math.min(Math.max(0, x), Math.max(0, maxX))}px`;
  editorEl.style.top = `${Math.min(Math.max(0, y), Math.max(0, maxY))}px`;
}

editorHead.addEventListener("pointerdown", (ev) => {
  if (ev.target.closest("button")) {
    return;
  }
  const box = editorEl.getBoundingClientRect();
  drag = { dx: ev.clientX - box.left, dy: ev.clientY - box.top };
  placeEditor(box.left, box.top);
  editorHead.setPointerCapture(ev.pointerId);
  ev.preventDefault();
});

editorHead.addEventListener("pointermove", (ev) => {
  if (drag) {
    placeEditor(ev.clientX - drag.dx, ev.clientY - drag.dy);
  }
});

editorHead.addEventListener("pointerup", () => {
  if (!drag) {
    return;
  }
  drag = null;
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({
      left: editorEl.style.left,
      top: editorEl.style.top,
    }));
  } catch (err) {
    // position just will not be remembered
  }
});

// ---------- the panel can be minimized down to just its pencil icon ----------

const editorMinimizeBtn = document.getElementById("editor-minimize");

// Minimized, the panel is one small button, and a button left wherever the
// panel's top-left corner happened to be reads as stranded in the middle of
// the page. So it parks in the bottom-right corner it starts in, and the
// position it was dragged to comes back when it is expanded again.
function parkEditor() {
  editorEl.style.left = "auto";
  editorEl.style.top = "auto";
  editorEl.style.right = "22px";
  editorEl.style.bottom = "22px";
}

function setEditorMinimized(minimized) {
  if (minimized) {
    parkEditor();
  } else {
    const pos = readStore(POS_KEY, null);
    if (pos && pos.left && pos.top) {
      placeEditor(parseFloat(pos.left), parseFloat(pos.top));
    }
  }
  editorEl.classList.toggle("minimized", minimized);
  editorMinimizeBtn.setAttribute("aria-expanded", String(!minimized));
  editorMinimizeBtn.title = minimized ? "Expand editor" : "Minimize";
  editorMinimizeBtn.setAttribute("aria-label", minimized ? "Expand editor" : "Minimize editor");
  try {
    localStorage.setItem(MINIMIZED_KEY, JSON.stringify(minimized));
  } catch (err) {
    // private windows and blocked storage: stays expanded next visit
  }
}

editorMinimizeBtn.addEventListener("click", () => {
  setEditorMinimized(!editorEl.classList.contains("minimized"));
});

if (EDIT_MODE) {
  document.body.append(layer);
  editorEl.hidden = false;
  editorHead.style.cursor = "move";
  // setEditorMinimized puts it where it belongs either way: the corner while
  // it is a button, the position it was dragged to once it is a panel again
  setEditorMinimized(readStore(MINIMIZED_KEY, false));
}

window.addEventListener("hashchange", syncFromHash);
syncFromHash();

// after the first paint, never before it
requestAnimationFrame(() => setTimeout(prepareProjects));

// ---------- printing everything ----------

// The same idea as printing one deck, across the whole program: every deck,
// exercise and page laid out at once, in the order the sidebar lists them.
//
// On screen those live in three different places - the decks in the stage,
// the exercises in #view-project, the plain pages as views of their own - and
// the print engine walks the document in DOM order, not sidebar order. So
// each one is moved into #print-all for the print, leaving a comment node
// behind to mark where it came from, and put back when the dialog closes.
//
// A page cannot hand the browser a PDF file: this opens the print dialog,
// where "Save as PDF" is the destination. ?print=all does the layout without
// printing, which is the hook a headless render (or a build step) would use.

const printAllEl = document.getElementById("print-all");
const printAllHome = [];
const printedSolutions = [];

function programElements() {
  const first = [];
  const last = [];
  for (const group of PROGRAM) {
    (group.at === "end" ? last : first).push(...(group.items || []));
  }
  const where = { slides: decks, project: projects, view: views };
  // the cover the site itself opens on. It is no part of the program - the
  // sidebar reaches it through the title, not an entry of its own - but it is
  // the title page of anything printed out of the whole thing
  const out = views.welcome ? [views.welcome] : [];
  for (const item of [...first, ...last]) {
    const el = (where[item.type] || {})[item.id];
    // data-print="skip": a page that is a window onto somebody else's site
    // prints as an empty box, so it is left out of the document
    if (el && el.dataset.print !== "skip") {
      out.push(el);
    }
  }
  // the loose entry the sidebar adds under the program. The pad is left out:
  // it is an iframe of a page that is not ours, and prints as an empty box
  if (RESOURCES.length && views.resources) {
    out.push(views.resources);
  }
  return out;
}

// a solution is a <dialog> parked on <body> (makeSolutionDialogs), which the
// print would either miss entirely or pile up at the end - each one goes back
// inline, under the button that opens it
function inlineSolutions() {
  for (const button of printAllEl.querySelectorAll(".solution-btn")) {
    const dialog = solutionOf.get(button);
    const body = dialog && dialog.querySelector(".solution-body");
    if (!body) {
      continue;
    }
    const box = document.createElement("div");
    box.className = "print-solution";
    const title = document.createElement("h4");
    title.textContent = dialog.dataset.title || button.textContent;
    box.append(title, body);
    (button.closest(".solution-row") || button).after(box);
    printedSolutions.push({ dialog, body, box });
  }
}

function preparePrintAll() {
  if (document.body.classList.contains("printing-all")) {
    return;
  }
  // the exercises are markdown until something asks for them, and code is
  // coloured the first time its own deck or project is opened - for this one
  // document, all of it is asked for at once
  prepareProjects();
  for (const el of programElements()) {
    const mark = document.createComment("print-all");
    el.before(mark);
    printAllHome.push({ el, mark, hidden: el.hidden });
    el.hidden = false;
    printAllEl.append(el);
  }
  for (const id of Object.keys(decks)) {
    setupDeckCodeBlocks(id);
  }
  for (const id of Object.keys(projects)) {
    // before inlineSolutions, which moves solution bodies out of the dialogs
    // this looks them up in
    setupProjectCodeBlocks(id);
  }
  inlineSolutions();
  document.body.classList.add("printing", "printing-all");
  // that class is what lays every slide out at once; a slide can only be
  // measured and fitted once it is, the same as for a single deck
  for (const slide of printAllEl.querySelectorAll(".slide")) {
    fitSlide(slide);
  }
}

function restorePrintAll() {
  if (!document.body.classList.contains("printing-all")) {
    return;
  }
  document.body.classList.remove("printing", "printing-all");
  for (const { dialog, body, box } of printedSolutions.splice(0)) {
    dialog.append(body);
    box.remove();
  }
  // the marks, not the original siblings: several of these moved out of the
  // same parent, and a comment node holds its place whatever else has left
  for (const { el, mark, hidden } of printAllHome.splice(0)) {
    el.hidden = hidden;
    mark.replaceWith(el);
  }
}

document.getElementById("print-everything").addEventListener("click", () => {
  preparePrintAll();
  window.print();
});

// lays the document out and stops there, for a headless render: the print
// dialog is a user gesture no automation can answer
if (new URLSearchParams(location.search).get("print") === "all") {
  preparePrintAll();
}
