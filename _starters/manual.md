---
# MANUAL — long reference content people navigate and return to.
# Builds a sticky contents rail from your h2/h3 headings automatically.
layout: layouts/manual.njk
title: "__TITLE__"
subtitle: ""                   # one sentence — it is the meta description and the search-index summary; write it as the answer to "why go?"
overline: Handbook
# toc: false                   # suppress the contents rail
# prev: { label: "Previous", url: "/somewhere/" }
# next: { label: "Next", url: "/elsewhere/" }
updated: __DATE__              # UNQUOTED — a quoted date breaks the build
---

Open with what this document covers and who it's for.

## First section

Write headings as things a reader would scan for — "Right of way at roundabouts",
not "The circular question". They become the navigation.

### A subsection

h2 and h3 appear in the rail; h4 gets an anchor but stays out of it.
