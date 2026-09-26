import { Highlight } from "@tiptap/extension-highlight"

const HIGHLIGHT_HEX: Record<string, string> = {
  "var(--tt-bg-color)": "#ffffff",
  "var(--tt-color-highlight-gray)": "#f8f8f7",
  "var(--tt-color-highlight-brown)": "#f4eeee",
  "var(--tt-color-highlight-orange)": "#fbecdd",
  "var(--tt-color-highlight-yellow)": "#fef9c3",
  "var(--tt-color-highlight-green)": "#dcfce7",
  "var(--tt-color-highlight-blue)": "#e0f2fe",
  "var(--tt-color-highlight-purple)": "#f3e8ff",
  "var(--tt-color-highlight-pink)": "#fcf1f6",
  "var(--tt-color-highlight-red)": "#ffe4e6",
}

function cssColor(value: unknown): string {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (HIGHLIGHT_HEX[raw]) return HIGHLIGHT_HEX[raw]
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw
  if (/^(?:rgb|hsl)a?\([\d\s,%.]+\)$/.test(raw)) return raw
  return ""
}

/** Color highlight that serializes to HTML `<mark>` so Eleventy can render it. */
export const RoadHighlight = Highlight.extend({
  renderMarkdown(node, helpers) {
    const inner = helpers.renderChildren(node)
    const color = cssColor(node.attrs?.color)
    if (!color) return `<mark>${inner}</mark>`
    return `<mark data-color="${color}" style="background-color: ${color}">${inner}</mark>`
  },
})
