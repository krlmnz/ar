export function Wireframe({ kind }: { kind: string }) {
  const ink = "#1d5fd0"
  const soft = "#c9d7f5"
  const line = "#b7b3a8"
  if (kind === "guide") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="8" y="10" width="46" height="70" rx="4" fill={soft} />
        <rect x="64" y="14" width="120" height="8" rx="2" fill={ink} />
        <rect x="64" y="30" width="110" height="4" fill={line} />
        <rect x="64" y="40" width="100" height="4" fill={line} />
        <rect x="64" y="50" width="90" height="4" fill={line} />
      </svg>
    )
  }
  if (kind === "dispatch") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="40" y="12" width="36" height="5" fill={ink} />
        <rect x="40" y="24" width="120" height="12" rx="2" fill="#161918" />
        <rect x="40" y="42" width="110" height="5" fill={line} />
        <rect x="40" y="54" width="70" height="4" fill={soft} />
      </svg>
    )
  }
  if (kind === "place") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="12" y="12" width="70" height="66" rx="6" fill={soft} />
        <circle cx="47" cy="40" r="8" fill={ink} />
        <rect x="96" y="18" width="80" height="8" fill="#161918" />
        <rect x="96" y="34" width="70" height="4" fill={line} />
        <rect x="96" y="44" width="60" height="4" fill={line} />
      </svg>
    )
  }
  if (kind === "route" || kind === "story") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <path d="M20 70 C 50 20, 90 80, 130 30 S 180 20, 185 40" fill="none" stroke={ink} strokeWidth="2" />
        <circle cx="20" cy="70" r="4" fill={ink} />
        <circle cx="130" cy="30" r="4" fill={ink} />
        <circle cx="185" cy="40" r="4" fill={ink} />
      </svg>
    )
  }
  if (kind === "itinerary") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <path d="M28 12 v66" stroke={line} />
        <circle cx="28" cy="22" r="4" fill={ink} />
        <circle cx="28" cy="46" r="4" fill={ink} />
        <circle cx="28" cy="70" r="4" fill={ink} />
        <rect x="44" y="18" width="90" height="6" fill="#161918" />
        <rect x="44" y="42" width="80" height="6" fill="#161918" />
        <rect x="44" y="66" width="70" height="6" fill="#161918" />
      </svg>
    )
  }
  if (kind === "gallery") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="16" y="14" width="78" height="50" rx="4" fill={soft} />
        <rect x="104" y="14" width="78" height="50" rx="4" fill={soft} />
        <rect x="16" y="70" width="50" height="4" fill={line} />
        <rect x="104" y="70" width="50" height="4" fill={line} />
      </svg>
    )
  }
  if (kind === "faq" || kind === "practical") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="20" y="16" width="12" height="12" rx="2" fill={ink} />
        <rect x="40" y="19" width="120" height="6" fill="#161918" />
        <rect x="20" y="38" width="12" height="12" rx="2" fill={soft} />
        <rect x="40" y="41" width="100" height="6" fill="#161918" />
        <rect x="20" y="60" width="12" height="12" rx="2" fill={soft} />
        <rect x="40" y="63" width="90" height="6" fill="#161918" />
      </svg>
    )
  }
  if (kind === "browse") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="14" y="16" width="80" height="26" rx="4" fill={soft} />
        <rect x="104" y="16" width="80" height="26" rx="4" fill={soft} />
        <rect x="14" y="50" width="80" height="26" rx="4" fill={soft} />
        <rect x="104" y="50" width="80" height="26" rx="4" fill={soft} />
      </svg>
    )
  }
  if (kind === "center") {
    return (
      <svg viewBox="0 0 200 90" aria-hidden="true">
        <rect x="55" y="18" width="90" height="10" fill="#161918" />
        <rect x="45" y="38" width="110" height="4" fill={line} />
        <rect x="55" y="48" width="90" height="4" fill={line} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 200 90" aria-hidden="true">
      <rect x="24" y="16" width="150" height="8" fill="#161918" />
      <rect x="24" y="32" width="140" height="4" fill={line} />
      <rect x="24" y="42" width="120" height="4" fill={line} />
      <rect x="24" y="56" width="90" height="16" rx="3" fill={soft} />
    </svg>
  )
}
