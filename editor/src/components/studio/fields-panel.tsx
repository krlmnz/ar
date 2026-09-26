"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { parseDocument } from "yaml"
import { setInDocument } from "@/lib/markdown-file"
import { AUDIENCES, COST_LEVELS, DURATIONS, PLACE_TYPES, REGIONS, RESERVATIONS } from "@/lib/site-meta"
import { PAGE_THEMES } from "@/lib/themes"
import { templateById } from "@/lib/templates"

type Data = Record<string, unknown>

function asData(value: string): Data {
  try {
    const parsed = parseDocument(value).toJS()
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Data) : {}
  } catch {
    return {}
  }
}

function text(value: unknown) {
  return value == null ? "" : String(value)
}

function lines(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).join("\n") : ""
}

export function FieldsPanel({
  kind,
  value,
  onChange,
}: {
  kind: string
  value: string
  onChange: (next: string) => void
}) {
  const data = useMemo(() => asData(value), [value])
  const spec = templateById(kind)
  const [raw, setRaw] = useState(value)
  const [rawError, setRawError] = useState("")
  const rawFocus = useRef(false)

  useEffect(() => {
    if (!rawFocus.current) setRaw(value)
  }, [value])

  function update(key: string, next: unknown) {
    const doc = parseDocument(value || "")
    setInDocument(doc, key, next)
    onChange(doc.toString())
  }

  function updateList(key: string, source: string) {
    const items = source.split("\n").map((item) => item.trim()).filter(Boolean)
    update(key, items)
  }

  const theme = text(data.theme)

  return (
    <div>
      <p className="eyebrow">{spec?.title || kind}</p>
      <h2>Page details</h2>
      <p className="hint">{spec?.layout}</p>

      <label className="field">
        Title
        <input value={text(data.title)} onChange={(event) => update("title", event.target.value)} />
      </label>
      <label className="field">
        Description
        <textarea value={text(data.description)} onChange={(event) => update("description", event.target.value)} />
      </label>

      <div className="field">
        Theme
        <span className="hint">Written to theme: in front matter. Visitors keep a saved preference until they reset.</span>
        <div className="swatches">
          {PAGE_THEMES.map((item) => (
            <button
              key={item.id || "default"}
              type="button"
              className="swatch"
              aria-pressed={theme === item.id}
              onClick={() => update("theme", item.id)}
              title={item.hint}
            >
              <i style={{ background: item.bg, boxShadow: `inset 0 0 0 3px ${item.accent}` }} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <KindFields kind={kind} data={data} update={update} updateList={updateList} />

      <label className="field">
        Updated
        <input value={text(data.updated).slice(0, 10)} onChange={(event) => update("updated", event.target.value)} />
      </label>

      <details className="yaml">
        <summary>Advanced YAML</summary>
        <label className="field">
          Front matter
          <textarea
            value={raw}
            spellCheck={false}
            onFocus={() => {
              rawFocus.current = true
            }}
            onBlur={() => {
              rawFocus.current = false
              try {
                const doc = parseDocument(raw)
                if (doc.errors.length) throw doc.errors[0]
                setRawError("")
                onChange(doc.toString())
              } catch (error) {
                setRawError(error instanceof Error ? error.message : "That YAML did not parse")
              }
            }}
            onChange={(event) => setRaw(event.target.value)}
          />
        </label>
        {rawError ? <div className="banner error">{rawError}</div> : null}
      </details>
    </div>
  )
}

function KindFields({
  kind,
  data,
  update,
  updateList,
}: {
  kind: string
  data: Data
  update: (key: string, value: unknown) => void
  updateList: (key: string, source: string) => void
}) {
  const subtitle = (
    <label className="field">
      Subtitle
      <textarea value={text(data.subtitle)} onChange={(event) => update("subtitle", event.target.value)} />
    </label>
  )
  const overline = (
    <label className="field">
      Overline
      <input value={text(data.overline)} onChange={(event) => update("overline", event.target.value)} />
    </label>
  )

  if (kind === "guide") {
    return (
      <>
        <label className="field">Series<input value={text(data.series)} onChange={(event) => update("series", event.target.value)} /></label>
        {subtitle}
        <label className="field checks"><input type="checkbox" checked={data.cover === true} onChange={(event) => update("cover", event.target.checked ? true : "")} /> Cover poster</label>
        <label className="field">Cover meta<input value={text(data.cover_meta)} onChange={(event) => update("cover_meta", event.target.value)} /></label>
      </>
    )
  }
  if (kind === "reference") return <>{overline}{subtitle}</>
  if (kind === "center" || kind === "faq" || kind === "gallery" || kind === "itinerary") return subtitle
  if (kind === "dispatch") {
    return (
      <>
        {overline}
        {subtitle}
        <label className="field">Byline<input value={text(data.byline)} onChange={(event) => update("byline", event.target.value)} /></label>
      </>
    )
  }
  if (kind === "practical") {
    return (
      <>
        {subtitle}
        <label className="field">You&apos;ll need<span className="hint">One item per line.</span>
          <textarea value={lines(data.needs)} onChange={(event) => updateList("needs", event.target.value)} />
        </label>
        <label className="field">Tip<textarea value={text(data.tip)} onChange={(event) => update("tip", event.target.value)} /></label>
      </>
    )
  }
  if (kind === "place") return <PlaceFields data={data} update={update} updateList={updateList} />
  if (kind === "route") {
    return (
      <>
        {overline}
        {subtitle}
        <label className="field">Distance<input value={text(data.distance)} onChange={(event) => update("distance", event.target.value)} /></label>
        <label className="field">Days<input value={text(data.days)} onChange={(event) => update("days", event.target.value)} /></label>
        <ObjectList
          label="Stops"
          items={Array.isArray(data.stops) ? data.stops : []}
          fields={["place", "title", "day", "note", "lng", "lat"]}
          onChange={(items) => update("stops", items)}
        />
      </>
    )
  }
  if (kind === "story") {
    return (
      <>
        {overline}
        {subtitle}
        <ObjectList
          label="Steps"
          items={Array.isArray(data.steps) ? data.steps : []}
          fields={["id", "title", "body", "place", "lng", "lat", "zoom", "pitch", "bearing"]}
          onChange={(items) => update("steps", items)}
        />
      </>
    )
  }
  if (kind === "browse") {
    return (
      <>
        {overline}
        {subtitle}
        <label className="field">
          Source
          <select value={text(data.source)} onChange={(event) => update("source", event.target.value)}>
            <option value="">Hand-written cards</option>
            <option value="places">Places</option>
            <option value="demos">Demos</option>
          </select>
        </label>
        <label className="field checks"><input type="checkbox" checked={data.showMap === true} onChange={(event) => update("showMap", event.target.checked ? true : "")} /> Show map</label>
        <label className="field checks"><input type="checkbox" checked={data.needsMap === true} onChange={(event) => update("needsMap", event.target.checked ? true : "")} /> Needs map</label>
        <ObjectList label="Featured" items={Array.isArray(data.featured) ? data.featured : []} fields={["title", "url", "kicker", "summary"]} onChange={(items) => update("featured", items)} />
        <ObjectList label="Cards" items={Array.isArray(data.cards) ? data.cards : []} fields={["title", "url", "kicker", "summary"]} onChange={(items) => update("cards", items)} />
      </>
    )
  }
  return null
}

function PlaceFields({
  data,
  update,
  updateList,
}: {
  data: Data
  update: (key: string, value: unknown) => void
  updateList: (key: string, source: string) => void
}) {
  const coordinates = data.coordinates && typeof data.coordinates === "object" ? (data.coordinates as Data) : {}
  const audience = Array.isArray(data.audience) ? data.audience.map(String) : []
  return (
    <>
      <label className="field">Slug<span className="hint">Set when the page is created. The file path stays put.</span>
        <input value={text(data.slug)} readOnly />
      </label>
      <label className="field">Subtitle<textarea value={text(data.subtitle)} onChange={(event) => update("subtitle", event.target.value)} /></label>
      <label className="field">Type
        <select value={text(data.type)} onChange={(event) => update("type", event.target.value)}>
          {PLACE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className="field">Region
        <select value={text(data.region)} onChange={(event) => update("region", event.target.value)}>
          {REGIONS.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}
        </select>
      </label>
      <div className="field">Coordinates
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
          <input aria-label="Latitude" value={text(coordinates.lat)} onChange={(event) => update("coordinates.lat", event.target.value === "" ? "" : Number(event.target.value))} />
          <input aria-label="Longitude" value={text(coordinates.lng)} onChange={(event) => update("coordinates.lng", event.target.value === "" ? "" : Number(event.target.value))} />
        </div>
      </div>
      <div className="field">Audience
        <div className="checks">
          {AUDIENCES.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={audience.includes(item.id)}
                onChange={(event) => {
                  const next = event.target.checked ? [...audience, item.id] : audience.filter((id) => id !== item.id)
                  update("audience", next)
                }}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>
      <label className="field">Tags<span className="hint">One tag per line.</span>
        <textarea value={lines(data.tags)} onChange={(event) => updateList("tags", event.target.value)} />
      </label>
      <label className="field">Cost
        <select value={text(data.cost_level)} onChange={(event) => update("cost_level", event.target.value)}>
          <option value="">—</option>
          {COST_LEVELS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="field">Reservations
        <select value={text(data.reservations)} onChange={(event) => update("reservations", event.target.value)}>
          <option value="">—</option>
          {RESERVATIONS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="field">Duration
        <select value={text(data.duration)} onChange={(event) => update("duration", event.target.value)}>
          <option value="">—</option>
          {DURATIONS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="field">Tip<textarea value={text(data.tip)} onChange={(event) => update("tip", event.target.value)} /></label>
      <label className="field">Google Maps<input value={text(data.google_maps)} onChange={(event) => update("google_maps", event.target.value)} /></label>
      <label className="field">Website<input value={text(data.website)} onChange={(event) => update("website", event.target.value)} /></label>
      <label className="field">Related places<span className="hint">One slug per line.</span>
        <textarea value={lines(data.related)} onChange={(event) => updateList("related", event.target.value)} />
      </label>
    </>
  )
}

function ObjectList({
  label,
  items,
  fields,
  onChange,
}: {
  label: string
  items: unknown[]
  fields: string[]
  onChange: (items: Record<string, unknown>[]) => void
}) {
  const rows = items.map((item) =>
    item && typeof item === "object" ? (item as Record<string, unknown>) : {}
  )
  function setRow(index: number, key: string, value: string) {
    const next = rows.map((row) => ({ ...row }))
    const numeric = ["lng", "lat", "zoom", "pitch", "bearing"].includes(key)
    next[index][key] = value === "" ? "" : numeric && value.trim() !== "" && !Number.isNaN(Number(value)) ? Number(value) : value
    onChange(next.map(cleanRow))
  }
  return (
    <div className="field">
      {label}
      {rows.map((row, index) => (
        <div className="repeat" key={index}>
          {fields.map((key) => (
            <label key={key} className="hint">
              {key}
              <input value={text(row[key])} onChange={(event) => setRow(index, key, event.target.value)} />
            </label>
          ))}
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => onChange(rows.filter((_, i) => i !== index).map(cleanRow))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => onChange([...rows.map(cleanRow), Object.fromEntries(fields.map((key) => [key, ""]))])}
      >
        Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  )
}

function cleanRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== "" && value != null))
}
