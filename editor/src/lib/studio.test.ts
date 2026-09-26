import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { applyAction, commitMessage, fillStarter, pagePath, slugify, splitMarkdown } from "./markdown-file.ts"
import { decideSvgPaste, isSvgMarkup, svgSourceFromClipboard } from "./svg-paste.ts"

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`

describe("svg paste", () => {
  it("renders markup in prose and keeps source inside code", () => {
    assert.equal(decideSvgPaste(svg, false), "graphic")
    assert.equal(decideSvgPaste(svg, true), "text")
    assert.equal(decideSvgPaste("hello", false), "ignore")
    assert.equal(isSvgMarkup(svg), true)
  })

  it("reads an svg out of a figure wrapper and ignores mixed html", () => {
    const figure = `<figure data-svg-block="true">\n${svg}\n</figure>`
    assert.equal(svgSourceFromClipboard(figure, ""), svg)
    assert.equal(svgSourceFromClipboard(`<p>See this</p>${svg}`, ""), null)
  })
})

describe("pages", () => {
  it("matches starter paths from scripts/new.js", () => {
    assert.equal(slugify("Termas de Chillán"), "termas-de-chillan")
    assert.equal(pagePath("place", "termas-de-chillan"), "content/places/termas-de-chillan/index.md")
    assert.equal(pagePath("dispatch", "dinner-at-ten"), "content/dinner-at-ten.md")
    assert.equal(pagePath("guide", "a-map"), "content/a-map.md")
  })

  it("forces published and keeps the body", () => {
    const starter = fillStarter(
      '---\npublished: false\ntitle: "__TITLE__"\nslug: __SLUG__\nupdated: __DATE__\n---\n\nHello\n',
      'Dinner "at" ten',
      "dinner-at-ten",
      "2026-09-26"
    )
    const published = applyAction(starter, "publish", "2026-09-26")
    const parts = splitMarkdown(published)
    assert.match(parts.fm, /published: true/)
    assert.match(parts.body, /Hello/)
    assert.equal(commitMessage("publish", "Dinner at ten"), "content: publish Dinner at ten")
    assert.equal(commitMessage("save", "Dinner at ten"), "content: update Dinner at ten")
    const draft = applyAction(published, "unpublish", "2026-09-26")
    assert.match(draft, /published: false/)
  })
})
