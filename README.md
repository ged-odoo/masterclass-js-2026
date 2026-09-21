# Masterclass Odoo JS

The slides and exercises for the Odoo JS masterclass, and the addons the
exercises start from.

**[Open the masterclass →](https://ged-odoo.github.io/masterclass-js-2026/)**

Everything is in there: the presentations, every exercise with its steps, and
the solutions behind a "Show solution" button. Under Bonus Content, at the
foot of the sidebar, are the two OXP talks the masterclass grew out of. "Print everything", at the foot
of the sidebar, lays the whole program out as one document you can save as a
PDF.

## Before you arrive

You need a running Odoo on the `master` branch - an
[odoo.sh](https://www.odoo.sh) project does just as well as a local one, and
is worth starting the day before, since the first build takes a while.

Then clone this repository and start Odoo with it in the addons path:

```bash
git clone https://github.com/ged-odoo/masterclass-js-2026.git
odoo-bin --addons-path=...,masterclass-js-2026/addons_skeleton
```

`addons_skeleton/` holds the addons each exercise builds on. Install the one
the exercise names - `awesome_dashboard`, `awesome_dental_practice`,
`awesome_shelter`, `awesome_clicker` - and follow the steps.

## About this repository

This holds what you need for the two days: the built site, and the skeleton
addons. It is assembled from the sources - the slide decks, the exercises and
the framework that renders them - which live in a repo of their own.
