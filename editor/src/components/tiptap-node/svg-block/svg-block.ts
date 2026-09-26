import { Node } from "@tiptap/core"
import { sanitizeSvg } from "@/lib/svg-paste"

function svgFromToken(token: { svg?: string; raw?: string; text?: string }) {
  return sanitizeSvg(String(token.svg || token.raw || token.text || ""))
}

/** Inline figure so pasted SVG markup renders, and round-trips as HTML markdown. */
export const SvgBlock = Node.create({
  name: "svgBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      svg: {
        default: "",
        parseHTML: (element) => element.querySelector("svg")?.outerHTML || "",
      },
    }
  },

  parseHTML() {
    return [
      { tag: "figure[data-svg-block]" },
      {
        tag: "svg",
        getAttrs: (element) => ({ svg: (element as Element).outerHTML }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const svg = String(HTMLAttributes.svg || "")
    return [
      "figure",
      { "data-svg-block": "true", class: "svg-block" },
      ["div", { class: "svg-block__fallback" }, svg ? "" : ""],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("figure")
      dom.className = "svg-block"
      dom.setAttribute("data-svg-block", "true")
      dom.setAttribute("contenteditable", "false")
      const svg = sanitizeSvg(String(node.attrs.svg || ""))
      if (svg) dom.innerHTML = svg
      else dom.textContent = "This SVG could not be shown."
      return { dom }
    }
  },

  markdownTokenizer: {
    name: "svgBlock",
    level: "block",
    start: (src: string) => {
      const match = /^(?:<figure\b[^>]*\bdata-svg-block\b|<svg[\s>/])/i.exec(src.trimStart())
      if (!match) return -1
      return src.length - src.trimStart().length
    },
    tokenize: (src: string) => {
      const figure = /^[ \t]*<figure\b[^>]*\bdata-svg-block\b[^>]*>[\s\S]*?<\/figure>/i.exec(src)
      if (figure) {
        const svg = figure[0].match(/<svg\b[\s\S]*<\/svg>/i)?.[0] || ""
        return { type: "svgBlock", raw: figure[0], svg }
      }
      const bare = /^[ \t]*<svg\b[\s\S]*?<\/svg>/i.exec(src)
      if (!bare) return undefined
      return { type: "svgBlock", raw: bare[0], svg: bare[0].trim() }
    },
  },

  parseMarkdown: (token) => {
    const svg = svgFromToken(token as { svg?: string; raw?: string; text?: string })
    if (!svg) return { type: "paragraph" }
    return { type: "svgBlock", attrs: { svg } }
  },

  renderMarkdown: (node) => {
    const svg = sanitizeSvg(String(node.attrs?.svg || ""))
    if (!svg) return ""
    return `<figure data-svg-block="true">\n${svg}\n</figure>\n\n`
  },
})
