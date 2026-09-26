export const PAGE_THEMES = [
  { id: "", label: "Site default", hint: "Omit theme. Light / Minimal unless the visitor chose one.", bg: "#f5f5f2", ink: "#111416", accent: "#1d5fd0" },
  { id: "light", label: "Light / Minimal", hint: "The paper default, written into the page.", bg: "#f5f5f2", ink: "#111416", accent: "#1d5fd0" },
  { id: "night", label: "Night Sky", hint: "Deep blue, for a page that should open after dark.", bg: "#071018", ink: "#eaf1f7", accent: "#67d6ff" },
  { id: "note", label: "Warm Note", hint: "Cream paper and brown ink.", bg: "#f8f1cf", ink: "#3f3024", accent: "#8d5b2a" },
  { id: "signal", label: "Signal Hacker", hint: "Near-black with a cyan signal.", bg: "#030608", ink: "#e9f8ff", accent: "#35c9ff" },
  { id: "news", label: "Grey Newspaper", hint: "Newsprint grey.", bg: "#d9d9d4", ink: "#171717", accent: "#303030" },
  { id: "draft", label: "Drafting Grid", hint: "A pale studio green.", bg: "#edf1ee", ink: "#1a2321", accent: "#52665f" },
] as const

export const THEME_IDS = PAGE_THEMES.map((theme) => theme.id).filter((id) => id !== "")
