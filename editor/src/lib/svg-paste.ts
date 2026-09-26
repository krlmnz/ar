/** Decide what a pasted SVG string should become. Pure so it can be tested. */

export type SvgPasteDecision = "graphic" | "text" | "ignore"

const SVG_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "text",
  "tspan",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "title",
  "desc",
  "clippath",
  "mask",
  "use",
  "symbol",
  "marker",
  "pattern",
  "filter",
  "feoffset",
  "fegaussianblur",
  "feflood",
  "feblend",
  "fecomposite",
  "fecolormatrix",
  "femerge",
  "femergenode",
  "style",
])

export function isSvgMarkup(value: string): boolean {
  const inner = extractSvgElement(value)
  if (!inner) return false
  if (inner.length > 200_000) return false
  return true
}

export function extractSvgElement(value: string): string | null {
  const trimmed = value
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^<\?xml[\s\S]*?\?>/, "")
    .trim()
  const match = trimmed.match(/<svg\b[\s\S]*<\/svg>/i)
  if (!match) return null
  const svg = match[0].trim()
  const rest = trimmed.replace(svg, "").replace(/<!--[\s\S]*?-->/g, "").trim()
  const wrapper = rest
    .replace(/<\/?figure\b[^>]*>/gi, "")
    .replace(/<\/?div\b[^>]*>/gi, "")
    .replace(/<\/?span\b[^>]*>/gi, "")
    .trim()
  if (wrapper.length > 0) return null
  return svg
}

export function svgSourceFromClipboard(plain: string, html: string): string | null {
  const fromPlain = extractSvgElement(plain)
  if (fromPlain) return fromPlain
  if (!html) return null
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:html|body|head|meta|span|div|p)\b[^>]*>/gi, "")
    .trim()
  return extractSvgElement(stripped)
}

export function decideSvgPaste(source: string | null, insideCode: boolean): SvgPasteDecision {
  if (!source || !isSvgMarkup(source)) return "ignore"
  return insideCode ? "text" : "graphic"
}

export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.trim().length < 2) return false
  return /(^|\n)#{1,6}\s+\S|(^|\n)(?:[-*+]|\d+\.)\s+\S|\[[^\]]+\]\([^)]+\)|(^|\n)>\s+\S|(^|\n)```|\*\*[^*\n]+\*\*|==[^=\n]+==/.test(
    text
  )
}

export function sanitizeSvg(source: string): string {
  const svg = extractSvgElement(source)
  if (!svg) return ""
  if (typeof DOMParser === "undefined") {
    return svg
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/javascript:/gi, "")
  }
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (doc.querySelector("parsererror")) return ""
  const root = doc.querySelector("svg")
  if (!root) return ""
  const walk = (el: Element) => {
    const children = [...el.children]
    for (const child of children) {
      if (!SVG_TAGS.has(child.tagName.toLowerCase().replace(/^.*:/, ""))) {
        child.remove()
        continue
      }
      walk(child)
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      const val = attr.value.trim()
      if (name.startsWith("on")) el.removeAttribute(attr.name)
      else if ((name === "href" || name.endsWith(":href")) && /^javascript:/i.test(val)) {
        el.removeAttribute(attr.name)
      }
    }
  }
  walk(root)
  root.querySelectorAll("script, foreignObject").forEach((node) => node.remove())
  return root.outerHTML
}
