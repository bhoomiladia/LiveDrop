"use client"

// Onward Summit Template — a complete one-day event page in one file.
// A navy-to-white hero is a living field of tiny arrows: they lean away from
// the pointer, ripple out from a click and shimmer on their own, parting
// around the event's name. Below, on white: what to expect, with three
// gradient marks; a guest list whose pitch rewrites itself per role; an agenda
// you can filter, expand and save to your calendar; speakers drawn as arrow
// halftones; a drawn venue map; questions; and a registration band with a live
// countdown, a seat meter and a form that hands back a ticket.
//
// Everything is drawn here: the field is a canvas, the marks, portraits and map
// are SVG, the type is the system stack; nothing loads at runtime.
import * as React from "react"

export type OwsLink = { label: string; href?: string }

export type OwsGlyph = "arrow" | "plus" | "ring" | "dot"

export type OwsFeature = {
  /** One of the three drawn marks, or your own node. */
  icon?: "arrow" | "ring" | "plus" | React.ReactNode
  title: string
  text: string
}

export type OwsAudience = { role: string; pitch: string }

export type OwsSession = {
  /** 24-hour venue time, e.g. "13:30". */
  start: string
  /** Minutes. Sets the end time and the calendar entry. */
  duration: number
  title: string
  speakers?: string[]
  /** Becomes a filter chip. */
  track?: string
  description?: string
}

export type OwsSpeaker = {
  name: string
  role: string
  company?: string
  bio?: string
  /** A photo URL. Without one the speaker is drawn as an arrow halftone. */
  photo?: string
}

export type OwsVenue = {
  name: string
  address: string
  city?: string
  notes?: string[]
  /** "Get directions" link. Defaults to a maps search for the address. */
  mapHref?: string
}

export type OwsFaq = { q: string; a: string }

export type OwsRegistration = { name: string; email: string; company: string; role: string }

export type OwsPaletteName = "cobalt" | "emerald" | "dusk" | "ember"

export type OwsPalette = {
  /** Top of the hero. */
  deep: string
  /** The hero's middle, headings' accents, links. */
  mid: string
  /** Where the hero thins out toward the page. */
  light: string
  paper: string
  ink: string
  muted: string
  /** The register button. */
  accent: string
  accentInk: string
  /** Soft surfaces: the active chip, the map, the ticket. */
  tint: string
  /** Glyphs on the dark part of the field, and on the dark part. */
  glyphLight: string
  glyphDark: string
  /** The marks' gradient: light, deep. */
  icon: [string, string]
}

export interface OnwardSummitTemplateProps {
  /** Wordmark in the nav and footer. */
  brand?: string
  /** Replaces the drawn mark beside the wordmark. */
  logo?: React.ReactNode
  /** The event's name, set huge in the hero. */
  title?: string
  /** Under the name. "\n" breaks the line. */
  tagline?: string
  /** Shown in the nav as written. */
  date?: string
  city?: string
  /** ISO start with its UTC offset, e.g. "2026-11-12T08:00:00-05:00". Drives the countdown and every calendar file. */
  startsAt?: string
  /** ISO end, same form. Defaults to the end of the last session. */
  endsAt?: string
  /** The nav button. Without an href it scrolls to the form. */
  register?: OwsLink
  expect?: { title?: string; intro?: string; features?: OwsFeature[] } | null
  guests?: { title?: string; audiences?: OwsAudience[] } | null
  agenda?: { title?: string; intro?: string; sessions?: OwsSession[] } | null
  speakers?: { title?: string; intro?: string; people?: OwsSpeaker[] } | null
  venue?: (OwsVenue & { title?: string }) | null
  faq?: { title?: string; items?: OwsFaq[] } | null
  cta?: { kicker?: string; title?: string; subtitle?: string; seats?: { total: number; taken: number } } | null
  footer?: { links?: OwsLink[]; note?: string } | null
  palette?: OwsPaletteName | OwsPaletteInput
  /** The glyph the hero field and the portraits are made of. */
  glyph?: OwsGlyph
  /** Called with the form's fields. Return (or resolve to) `false`, or throw, to show an error. */
  onRegister?: (data: OwsRegistration) => unknown
  /** Minimum height of the hero. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

// #region content
export const PALETTES = {
  cobalt: {
    deep: "#06174a",
    mid: "#2659d9",
    light: "#a9c3f3",
    paper: "#ffffff",
    ink: "#0c0e13",
    muted: "#686c75",
    accent: "#e4f222",
    accentInk: "#0c0e13",
    tint: "#e9f0fd",
    glyphLight: "#dbe6ff",
    glyphDark: "#3a6be0",
    icon: ["#a3c6ff", "#2a5de0"] as [string, string],
  },
  emerald: {
    deep: "#03251d",
    mid: "#0f7a5b",
    light: "#a6dfc6",
    paper: "#ffffff",
    ink: "#0b120f",
    muted: "#66706b",
    accent: "#ffd84d",
    accentInk: "#0b120f",
    tint: "#e6f5ee",
    glyphLight: "#d4f5e5",
    glyphDark: "#17946c",
    icon: ["#9ee9c6", "#0c7a58"] as [string, string],
  },
  dusk: {
    deep: "#170a45",
    mid: "#5a3ed8",
    light: "#cbbdfa",
    paper: "#ffffff",
    ink: "#100c1a",
    muted: "#6d6878",
    accent: "#ffb8cf",
    accentInk: "#100c1a",
    tint: "#efebfe",
    glyphLight: "#e6deff",
    glyphDark: "#6a4ee6",
    icon: ["#d2c4ff", "#5536d4"] as [string, string],
  },
  ember: {
    deep: "#3a0c03",
    mid: "#d2491c",
    light: "#ffcaae",
    paper: "#ffffff",
    ink: "#140c09",
    muted: "#746964",
    accent: "#fff27a",
    accentInk: "#140c09",
    tint: "#fff0e8",
    glyphLight: "#ffe2d3",
    glyphDark: "#e0561f",
    icon: ["#ffbf9c", "#c9401a"] as [string, string],
  },
}

const DEFAULT_FEATURES: OwsFeature[] = [
  { icon: "arrow", title: "Sharper finance", text: "Field-tested playbooks from the CFOs who are setting the pace." },
  { icon: "ring", title: "Calmer workflows", text: "Retire the manual close and let operations run themselves." },
  { icon: "plus", title: "Systems that scale", text: "Prompts, processes and controls that grow with your team." },
]

const DEFAULT_AUDIENCES: OwsAudience[] = [
  {
    role: "CFO",
    pitch:
      "You're steering where the business goes next and watching which bets your peers are quietly placing. See how the best finance teams are modernizing and staying a step ahead.",
  },
  {
    role: "Controller",
    pitch:
      "You own the close, the controls and the questions nobody else can answer. Trade notes with controllers who halved their close without cutting a single corner.",
  },
  {
    role: "Head of procurement",
    pitch:
      "Every contract is a decision about cash. Learn how leading teams turn spend approval into strategy instead of paperwork, and get vendors to say yes faster.",
  },
  {
    role: "Accountants",
    pitch:
      "You're the reason the numbers hold up. Leave with the automations, prompts and shortcuts that hand your evenings back without loosening a single control.",
  },
]

const DEFAULT_SESSIONS: OwsSession[] = [
  { start: "08:00", duration: 50, title: "Doors, coffee and badge pickup", track: "Breaks", description: "Pick up your badge, find your table and meet the people you'll be trading notes with all day." },
  {
    start: "09:00",
    duration: 45,
    title: "Opening keynote: the finance team of 2030",
    speakers: ["Maya Okafor"],
    track: "Keynote",
    description: "What a ten-person finance team will be able to do in four years, and the three decisions to make this quarter so you're ready.",
  },
  {
    start: "10:00",
    duration: 50,
    title: "The five-day close, in practice",
    speakers: ["Daniel Reyes", "Priya Natarajan"],
    track: "Panel",
    description: "Two controllers walk through the exact calendar, owners and checklists that took their close from twelve days to five.",
  },
  {
    start: "11:00",
    duration: 60,
    title: "Workshop: prompting for the general ledger",
    speakers: ["Lena Fischer"],
    track: "Workshop",
    description: "Bring a laptop. Build prompts that draft accrual memos, explain variances and flag mis-codings, with guardrails your auditors will sign off on.",
  },
  { start: "12:15", duration: 60, title: "Lunch roundtables by role", track: "Roundtable", description: "Tables are grouped by role and company size, each hosted by a speaker. Pick yours at check-in." },
  {
    start: "13:30",
    duration: 45,
    title: "Spend is strategy: procurement as a profit center",
    speakers: ["Sam Whitaker", "Elena Varga"],
    track: "Panel",
    description: "How intake, approvals and renewals become a lever on margin, with the metrics that convince a board.",
  },
  {
    start: "14:30",
    duration: 60,
    title: "Workshop: a rolling forecast in an afternoon",
    speakers: ["Aiko Tanaka"],
    track: "Workshop",
    description: "Start from last year's actuals and leave with a driver-based forecast that updates itself every month.",
  },
  {
    start: "15:45",
    duration: 45,
    title: "Fireside: raising, cutting and staying calm",
    speakers: ["Jordan Blake", "Maya Okafor"],
    track: "Keynote",
    description: "An investor and an operator on the conversations a CFO has in a down round, and the ones to have before it.",
  },
  { start: "17:00", duration: 120, title: "Rooftop reception", track: "Breaks", description: "Drinks, small plates and the view. The best conversations of the day usually happen here." },
]

const DEFAULT_SPEAKERS: OwsSpeaker[] = [
  { name: "Maya Okafor", role: "CFO", company: "Northwind Labs", bio: "Took Northwind from Series A to public markets with a finance team of eleven." },
  { name: "Daniel Reyes", role: "Corporate Controller", company: "Fieldstone", bio: "Runs a five-day close across nine entities and three currencies." },
  { name: "Priya Natarajan", role: "VP Finance", company: "Arcwell", bio: "Rebuilt Arcwell's reporting stack twice and wrote the playbook both times." },
  { name: "Lena Fischer", role: "Head of Accounting Ops", company: "Lumen & Co", bio: "Ships automations to the ledger the way engineers ship code." },
  { name: "Sam Whitaker", role: "Head of Procurement", company: "Tidewater Supply", bio: "Turned a 40-day approval queue into a four-day one." },
  { name: "Aiko Tanaka", role: "FP&A Lead", company: "Kiteline", bio: "Builds forecasts that leadership actually opens on Monday mornings." },
  { name: "Jordan Blake", role: "General Partner", company: "Meridian Hill", bio: "Has sat across the table from more than two hundred CFOs." },
  { name: "Elena Varga", role: "Chief Accounting Officer", company: "Brightpath", bio: "Led three audits through migrations without a single restatement." },
]

const DEFAULT_FAQ: OwsFaq[] = [
  {
    q: "Who is Onward for?",
    a: "Finance leaders and the people who run finance with them: CFOs, controllers, procurement leads and accountants at growing companies. Register and we confirm every seat within two business days.",
  },
  { q: "What does it cost?", a: "Nothing. Onward is free for confirmed guests, including meals and the evening reception." },
  { q: "Will sessions be recorded?", a: "Keynotes are recorded and shared with every registered guest a week later. Workshops and roundtables stay in the room." },
  { q: "Can I bring a colleague?", a: "Yes. Ask them to register on their own so they get their own ticket; we seat teams together when we can." },
  { q: "Is there help with travel?", a: "We hold a room block at two hotels nearby at a reduced rate. The booking link arrives with your confirmation." },
]
// #endregion content

// #region logic
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The signed angle in (-PI, PI] that turns 0 into a.
function shortestAngle(a: number): number {
  const T = Math.PI * 2
  let r = (((a + Math.PI) % T) + T) % T - Math.PI
  if (r === -Math.PI) r = Math.PI
  return r
}

// How much of each glyph colour a cell of the field gets, at (u, v) in the
// box (0..1 each) with the box's width / height. Light glyphs live on the
// navy, dark ones on the pale, and both part around the title.
function fieldWeights(mode: "hero" | "band", u: number, v: number, aspect: number): [number, number] {
  if (mode === "band") {
    const edge = smoothstep(0, 0.14, v) * smoothstep(0, 0.14, 1 - v)
    const side = 0.25 + 0.75 * smoothstep(0.1, 0.8, u)
    return [0.55 * edge * side, 0]
  }
  const rise = 0.3 + 0.7 * smoothstep(0.02, 0.48, v)
  const light = rise * (1 - smoothstep(0.5, 0.74, v))
  const dark = smoothstep(0.54, 0.72, v) * (1 - smoothstep(0.8, 0.985, v))
  const dx = (u - 0.5) * aspect
  const dy = (v - 0.47) * 1.25
  const d = Math.sqrt(dx * dx + dy * dy)
  const part = 0.1 + 0.9 * smoothstep(0.1, 0.4, d)
  return [light * part, dark * part * 0.9]
}

function pad2(n: number | string): string {
  const s = String(n)
  return s.length < 2 ? "0" + s : s
}

function parseClock(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = +m[1]
  const mm = +m[2]
  return h > 23 || mm > 59 ? null : h * 60 + mm
}

function formatClock(hhmm: string): string {
  const t = parseClock(hhmm)
  if (t === null) return hhmm
  const h = Math.floor(t / 60)
  return (h % 12 || 12) + ":" + pad2(t % 60) + " " + (h >= 12 ? "PM" : "AM")
}

function addMinutes(hhmm: string, mins: number): string {
  const t = parseClock(hhmm)
  if (t === null) return hhmm
  const x = (((t + Math.round(mins)) % 1440) + 1440) % 1440
  return pad2(Math.floor(x / 60)) + ":" + pad2(x % 60)
}

// "2026-11-12T08:00:00-05:00" -> the venue's date and its UTC offset.
function eventParts(iso: string): { date: string; offset: string } {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T[\d:.]+)?(Z|[+-]\d{2}:\d{2})?$/.exec((iso || "").trim())
  return m ? { date: m[1], offset: m[2] || "" } : { date: "", offset: "" }
}

// A venue-time "HH:MM" on the event's day, as an instant.
function atVenueTime(iso: string, hhmm: string): Date | null {
  const p = eventParts(iso)
  const t = parseClock(hhmm)
  if (!p.date || t === null) return null
  const d = new Date(p.date + "T" + pad2(Math.floor(t / 60)) + ":" + pad2(t % 60) + ":00" + p.offset)
  return isNaN(d.getTime()) ? null : d
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/\.\d{3}/, "").replace(/[-:]/g, "")
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

// RFC 5545 caps a line at 75 octets; longer ones continue after a CRLF + space.
function icsFold(line: string): string {
  if (line.length <= 75) return line
  const out = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) out.push(" " + line.slice(i, i + 74))
  return out.join("\r\n")
}

type IcsEvent = { title: string; start: Date; end: Date; location?: string; description?: string }

function buildIcs(events: IcsEvent[], now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//onward-summit-template//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + hashString(e.title + icsStamp(e.start)).toString(36) + "@onward-summit",
      "DTSTAMP:" + icsStamp(now),
      "DTSTART:" + icsStamp(e.start),
      "DTEND:" + icsStamp(e.end),
      "SUMMARY:" + icsEscape(e.title),
    )
    if (e.location) lines.push("LOCATION:" + icsEscape(e.location))
    if (e.description) lines.push("DESCRIPTION:" + icsEscape(e.description))
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.map(icsFold).join("\r\n") + "\r\n"
}

function countdown(ms: number): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  if (!(ms > 0)) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  const s = Math.floor(ms / 1000)
  return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60, done: false }
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())
}

// A short, readable, stable ticket code: the event's first letters and four
// characters that never read as one another (no 0/O, 1/I).
function ticketCode(event: string, seed: string): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const prefix = (event.replace(/[^a-z]/gi, "").slice(0, 3) || "EVT").toUpperCase()
  const r = mulberry32(hashString(seed.trim().toLowerCase()))
  let tail = ""
  for (let i = 0; i < 4; i++) tail += A[Math.floor(r() * A.length)]
  return prefix + "-" + tail
}

function nextIndex(i: number, key: string, n: number): number {
  if (n <= 0) return 0
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return i
}

function tracksOf(sessions: OwsSession[]): string[] {
  const out = ["All"]
  for (const s of sessions) if (s.track && !out.includes(s.track)) out.push(s.track)
  return out
}

function seatsLeft(seats: { total: number; taken: number } | undefined): number {
  return seats ? Math.max(0, Math.round(seats.total - seats.taken)) : 0
}

// One glyph as a stroked path at (x, y), s across.
function glyphPath(kind: OwsGlyph, x: number, y: number, s: number): string {
  const h = s / 2
  const f = (n: number) => +n.toFixed(1)
  if (kind === "plus") return "M" + f(x - h) + " " + f(y) + "H" + f(x + h) + "M" + f(x) + " " + f(y - h) + "V" + f(y + h)
  if (kind === "ring" || kind === "dot") {
    const r = kind === "dot" ? h * 0.3 : h * 0.72
    return "M" + f(x - r) + " " + f(y) + "a" + f(r) + " " + f(r) + " 0 1 0 " + f(2 * r) + " 0a" + f(r) + " " + f(r) + " 0 1 0 " + f(-2 * r) + " 0"
  }
  return "M" + f(x - h) + " " + f(y + h) + "L" + f(x + h) + " " + f(y - h) + "M" + f(x - h * 0.2) + " " + f(y - h) + "H" + f(x + h) + "V" + f(y + h * 0.2)
}

// A head-and-shoulders bust as a halftone of glyphs, varied by the seed: four
// paths, faintest to brightest. Each part is an ellipsoid lit from one side,
// so glyphs swell where the figure catches the light and shrink in its shade.
function portraitPaths(seed: string, kind: OwsGlyph, cols = 28, rows = 33, cell = 220 / 28): string[] {
  const r = mulberry32(hashString(seed))
  const hx = 0.5 + (r() - 0.5) * 0.06
  const hy = 0.37 + (r() - 0.5) * 0.04
  const hrx = 0.145 + r() * 0.03
  const hry = 0.185 + r() * 0.025
  const style = Math.floor(r() * 3) // 0 cropped, 1 full, 2 long
  const sw = 0.4 + r() * 0.1
  const side = r() < 0.5 ? 1 : -1
  const L = [side * 0.62, -0.5, 0.6]
  const ln = Math.hypot(L[0], L[1], L[2])
  // an ellipsoid's coverage at (u, v) and how much light it catches there
  const part = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) => {
    const dx = (u - cx) / rx
    const dy = (v - cy) / ry
    const d = Math.sqrt(dx * dx + dy * dy)
    const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d) ** 2))
    const lam = Math.max(0, (dx * L[0] + dy * L[1] + nz * L[2]) / ln)
    return { m: 1 - smoothstep(0.9, 1.04, d), lam }
  }
  const out = ["", "", "", ""]
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols
      const v = (j + 0.5) / rows
      const head = part(u, v, hx, hy, hrx, hry)
      const hair =
        style === 2
          ? part(u, v, hx, hy + 0.1, hrx * 1.32, 0.33)
          : part(u, v, hx, hy - hry * (style ? 0.3 : 0.42), hrx * (style ? 1.22 : 1.06), hry * (style ? 0.86 : 0.7))
      const neck = part(u, v, hx, 0.66, hrx * 0.52, 0.16)
      const body = part(u, v, 0.5, 1.06, sw, 0.36)
      // the face sits in front of the hair; the hair is darker
      let k = 0
      let m = 0
      if (head.m > 0.02 && !(v < hy - hry * 0.45)) {
        m = head.m
        k = 0.32 + 0.8 * head.lam
      } else if (hair.m > 0.02) {
        m = hair.m
        k = 0.16 + 0.46 * hair.lam
      }
      if (body.m > m) {
        m = body.m
        k = 0.26 + 0.78 * body.lam
      }
      if (neck.m > m && v < 0.8) {
        m = neck.m
        k = 0.16 + 0.44 * neck.lam
      }
      const grain = (r() - 0.5) * 0.1
      k = m > 0.02 ? clamp(k * (0.35 + 0.65 * m) + grain, 0.06, 1) : clamp(0.03 + 0.08 * (1 - v) + grain * 0.4, 0, 0.14)
      const b = Math.min(3, Math.floor(k * 4))
      out[b] += glyphPath(kind, (i + 0.5) * cell, (j + 0.5) * cell, cell * (0.3 + 0.62 * k))
    }
  }
  return out
}

function resolvePalette(p: OwsPaletteName | OwsPaletteInput | undefined): OwsPalette {
  if (typeof p === "string") return PALETTES[p] || PALETTES.cobalt
  return { ...PALETTES.cobalt, ...(p || {}) }
}
// #endregion logic

// ---------------------------------------------------------------------------
// small hooks
// ---------------------------------------------------------------------------

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return reduced
}

function download(name: string, text: string, type: string) {
  if (typeof document === "undefined") return
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------------------
// the glyph field
// ---------------------------------------------------------------------------

function drawGlyph(ctx: CanvasRenderingContext2D, kind: OwsGlyph, s: number) {
  // in a unit box of side s, centred
  const h = s * 0.31
  const c = s / 2
  ctx.beginPath()
  if (kind === "plus") {
    ctx.moveTo(c - h, c)
    ctx.lineTo(c + h, c)
    ctx.moveTo(c, c - h)
    ctx.lineTo(c, c + h)
    ctx.stroke()
  } else if (kind === "ring") {
    ctx.arc(c, c, h * 0.78, 0, Math.PI * 2)
    ctx.stroke()
  } else if (kind === "dot") {
    ctx.arc(c, c, h * 0.42, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.moveTo(c - h, c + h)
    ctx.lineTo(c + h, c - h)
    ctx.moveTo(c - h * 0.15, c - h)
    ctx.lineTo(c + h, c - h)
    ctx.lineTo(c + h, c + h * 0.15)
    ctx.stroke()
  }
}

export function GlyphField({
  mode,
  glyph,
  light,
  dark,
  reduced,
  cell = 13,
}: {
  mode: "hero" | "band"
  glyph: OwsGlyph
  light: string
  dark: string
  reduced: boolean
  cell?: number
}) {
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)

  React.useEffect(() => {
    const wrap = wrapRef.current
    const cv = canvasRef.current
    const host = wrap?.parentElement
    if (!wrap || !cv || !host) return
    const ctx = cv.getContext("2d")
    if (!ctx) return

    let W = 0
    let H = 0
    let dpr = 1
    let n = 0
    let xs = new Float32Array(0)
    let ys = new Float32Array(0)
    let wl = new Float32Array(0)
    let wd = new Float32Array(0)
    let grain = new Float32Array(0)
    let ang = new Float32Array(0)
    let scl = new Float32Array(0)
    let spriteL: HTMLCanvasElement | null = null
    let spriteD: HTMLCanvasElement | null = null
    const ptr = { x: 0, y: 0, on: false }
    const ripples: { x: number; y: number; t0: number }[] = []
    let raf = 0
    let visible = true
    const half = cell / 2

    const sprite = (color: string) => {
      const c = document.createElement("canvas")
      const px = Math.ceil(cell * dpr * 2)
      c.width = c.height = px
      const g = c.getContext("2d")
      if (!g) return c
      g.scale(px / cell, px / cell)
      g.strokeStyle = g.fillStyle = color
      g.lineWidth = Math.max(1.05, cell * 0.105)
      g.lineCap = "square"
      g.lineJoin = "miter"
      drawGlyph(g, glyph, cell)
      return c
    }

    const layout = () => {
      const r = wrap.getBoundingClientRect()
      W = Math.max(1, r.width)
      H = Math.max(1, r.height)
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      cv.style.width = W + "px"
      cv.style.height = H + "px"
      const cols = Math.ceil(W / cell) + 1
      const rows = Math.ceil(H / cell) + 1
      n = cols * rows
      xs = new Float32Array(n)
      ys = new Float32Array(n)
      wl = new Float32Array(n)
      wd = new Float32Array(n)
      grain = new Float32Array(n)
      ang = new Float32Array(n)
      scl = new Float32Array(n).fill(1)
      const ox = (W - (cols - 1) * cell) / 2
      const oy = (H - (rows - 1) * cell) / 2
      const rand = mulberry32(cols * 977 + rows)
      for (let j = 0, k = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const x = ox + i * cell
          const y = oy + j * cell
          const w = fieldWeights(mode, x / W, y / H, W / H)
          xs[k] = x
          ys[k] = y
          wl[k] = w[0]
          wd[k] = w[1]
          grain[k] = 0.5 + 0.5 * rand()
        }
      }
      spriteL = sprite(light)
      spriteD = sprite(dark)
    }

    const draw = (t: number) => {
      if (!spriteL || !spriteD) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      const R = 150
      const R2 = R * R
      for (let q = ripples.length - 1; q >= 0; q--) if (t - ripples[q].t0 > 1900) ripples.splice(q, 1)
      let busy = ripples.length > 0
      for (let i = 0; i < n; i++) {
        const a0 = wl[i]
        const b0 = wd[i]
        if (a0 + b0 < 0.012) continue
        const x = xs[i]
        const y = ys[i]
        let tA = 0
        let tS = 1
        let boost = 0
        if (!reduced) {
          if (ptr.on) {
            const dx = x - ptr.x
            const dy = y - ptr.y
            const d2 = dx * dx + dy * dy
            if (d2 < R2) {
              let w = 1 - Math.sqrt(d2) / R
              w = w * w * (3 - 2 * w)
              tA = shortestAngle(Math.atan2(dy, dx) + Math.PI / 4) * w
              tS = 1 + 0.75 * w
              boost = 0.55 * w
            }
          }
          for (const rp of ripples) {
            const age = t - rp.t0
            const dx = x - rp.x
            const dy = y - rp.y
            const dd = Math.abs(Math.sqrt(dx * dx + dy * dy) - age * 0.62)
            if (dd < 56) {
              const k = (1 - dd / 56) * (1 - age / 1900)
              tS += 0.9 * k
              boost += 0.7 * k
              tA += shortestAngle(Math.atan2(dy, dx) + Math.PI / 4) * k * 0.6
            }
          }
          ang[i] += (tA - ang[i]) * 0.12
          scl[i] += (tS - scl[i]) * 0.16
          if (Math.abs(ang[i] - tA) > 0.004 || Math.abs(scl[i] - tS) > 0.004) busy = true
        }
        const shimmer = reduced ? 1 : 0.8 + 0.2 * Math.sin((x + y * 0.8) * 0.011 - t * 0.0012)
        const g = grain[i] * shimmer
        const tot = a0 + b0
        const la = clamp(a0 * g + boost * (a0 / tot) * 0.7, 0, 1)
        const da = clamp(b0 * g + boost * (b0 / tot) * 0.7, 0, 1)
        const a = ang[i]
        const s = scl[i]
        const plain = Math.abs(a) < 0.003 && Math.abs(s - 1) < 0.003
        if (plain) ctx.setTransform(dpr, 0, 0, dpr, dpr * x, dpr * y)
        else {
          const c = Math.cos(a) * s * dpr
          const sn = Math.sin(a) * s * dpr
          ctx.setTransform(c, sn, -sn, c, dpr * x, dpr * y)
        }
        if (la > 0.01) {
          ctx.globalAlpha = la
          ctx.drawImage(spriteL, -half, -half, cell, cell)
        }
        if (da > 0.01) {
          ctx.globalAlpha = da
          ctx.drawImage(spriteD, -half, -half, cell, cell)
        }
      }
      ctx.globalAlpha = 1
      return busy
    }

    const loop = (t: number) => {
      raf = 0
      draw(t)
      if (visible && !reduced) raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (!raf && visible && !reduced) raf = requestAnimationFrame(loop)
    }

    layout()
    draw(performance.now())

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      layout()
      draw(performance.now())
    }) : null
    ro?.observe(wrap)
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting)
      if (visible) start()
      else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }) : null
    io?.observe(wrap)

    const local = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      const p = local(e)
      ptr.x = p.x
      ptr.y = p.y
      ptr.on = true
    }
    const leave = () => {
      ptr.on = false
    }
    const down = (e: PointerEvent) => {
      if (reduced) return
      if ((e.target as HTMLElement | null)?.closest?.("a,button,input,select,textarea,label")) return
      const p = local(e)
      ripples.push({ x: p.x, y: p.y, t0: performance.now() })
      if (ripples.length > 4) ripples.shift()
    }
    host.addEventListener("pointermove", move)
    host.addEventListener("pointerleave", leave)
    host.addEventListener("pointerdown", down)
    // an opening pulse from the centre of the hero
    const intro = mode === "hero" && !reduced ? setTimeout(() => ripples.push({ x: W / 2, y: H * 0.47, t0: performance.now() }), 350) : 0
    start()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(intro)
      ro?.disconnect()
      io?.disconnect()
      host.removeEventListener("pointermove", move)
      host.removeEventListener("pointerleave", leave)
      host.removeEventListener("pointerdown", down)
    }
  }, [mode, glyph, light, dark, reduced, cell])

  return (
    <div ref={wrapRef} className="ows-field" aria-hidden="true">
      <canvas ref={canvasRef} className="ows-canvas" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// marks
// ---------------------------------------------------------------------------

function BrandMark() {
  return (
    <svg className="ows-svg" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
      <path d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FeatureMark({ kind, uid, i }: { kind: "arrow" | "ring" | "plus"; uid: string; i: number }) {
  const id = uid + "fm" + i
  const fill = "url(#" + id + ")"
  return (
    <svg className="ows-svg ows-mark" data-kind={kind} width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--ows-icon-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--ows-icon-b)" }} />
        </linearGradient>
      </defs>
      <g className="ows-mark-g">
        {kind === "arrow" && <path d="M22 6H70V54L57 41V27.5L17.2 67.3L8.7 58.8L48.5 19H35Z" fill={fill} />}
        {kind === "ring" && <circle cx="38" cy="38" r="25" fill="none" stroke={fill} strokeWidth="15" />}
        {kind === "plus" && <path d="M31 4H45V31H72V45H45V72H31V45H4V31H31Z" fill={fill} />}
      </g>
    </svg>
  )
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg className="ows-svg ows-chev" data-open={open ? "" : undefined} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg className="ows-svg" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  )
}

function BookmarkGlyph({ on }: { on: boolean }) {
  return (
    <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3.5 1.75h7v10.5L7 9.6l-3.5 2.65Z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarGlyph() {
  return (
    <svg className="ows-svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.75 5.75h10.5M4.5 1.25v2.5M9.5 1.25v2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// speaker portraits
// ---------------------------------------------------------------------------

function GlyphPortrait({ seed, glyph, uid, i }: { seed: string; glyph: OwsGlyph; uid: string; i: number }) {
  const paths = React.useMemo(() => portraitPaths(seed, glyph), [seed, glyph])
  const id = uid + "pt" + i
  const r = mulberry32(hashString(seed + "bg"))
  const x2 = (0.3 + r() * 0.7).toFixed(2)
  return (
    <svg className="ows-svg ows-portrait-svg" viewBox="0 0 220 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={x2} y2="1">
          <stop offset="0" style={{ stopColor: "var(--ows-deep)" }} />
          <stop offset="1" style={{ stopColor: "var(--ows-mid)" }} />
        </linearGradient>
      </defs>
      <rect width="220" height="260" fill={"url(#" + id + ")"} />
      <g className="ows-portrait-g" fill="none" stroke="var(--ows-glyph-light)" strokeWidth="1.15" strokeLinecap="square">
        {paths.map((d, b) => (
          <path key={b} d={d} className={"ows-pb" + b} style={{ opacity: [0.16, 0.42, 0.76, 1][b] }} />
        ))}
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// venue map
// ---------------------------------------------------------------------------

function VenueMap({ uid, name, reduced }: { uid: string; name: string; reduced: boolean }) {
  const boxRef = React.useRef(null as HTMLDivElement | null)
  const clip = uid + "mc"
  const streets: React.ReactNode[] = []
  for (let k = -12; k <= 12; k++) {
    streets.push(<line key={"s" + k} x1={-400} y1={k * 30} x2={400} y2={k * 30} className="ows-map-st" />)
  }
  for (let k = -6; k <= 6; k++) {
    streets.push(<line key={"a" + k} x1={k * 78} y1={-400} x2={k * 78} y2={400} className="ows-map-av" />)
  }
  const onMove = (e: PointerEv) => {
    const el = boxRef.current
    if (!el || reduced || e.pointerType === "touch") return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--ows-mx", (((e.clientX - r.left) / r.width - 0.5) * -14).toFixed(1) + "px")
    el.style.setProperty("--ows-my", (((e.clientY - r.top) / r.height - 0.5) * -14).toFixed(1) + "px")
  }
  const onLeave = () => {
    boxRef.current?.style.setProperty("--ows-mx", "0px")
    boxRef.current?.style.setProperty("--ows-my", "0px")
  }
  return (
    <div ref={boxRef} className="ows-map" onPointerMove={onMove} onPointerLeave={onLeave}>
      <svg className="ows-svg ows-map-svg" viewBox="0 0 560 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={"Map showing " + name}>
        <defs>
          <clipPath id={clip}>
            <rect width="560" height="400" />
          </clipPath>
        </defs>
        <g clipPath={"url(#" + clip + ")"}>
          <rect width="560" height="400" fill="var(--ows-tint)" />
          <g className="ows-map-pan">
            <g transform="translate(300 210) rotate(-29)">
              {streets}
              <rect x="70" y="-310" width="156" height="210" className="ows-map-park" />
              <rect x="-170" y="60" width="64" height="48" className="ows-map-park" />
              <line x1="-400" y1="-260" x2="400" y2="190" className="ows-map-bway" />
            </g>
            <path d="M-20 -20H86C70 60 40 120 58 190C76 260 40 330 70 430H-20Z" className="ows-map-water" />
            <path d="M600 280C540 300 500 340 470 430H600Z" className="ows-map-water" />
          </g>
        </g>
      </svg>
      <div className="ows-pin" aria-hidden="true">
        <span className="ows-pin-pulse" />
        <span className="ows-pin-dot">
          <ArrowGlyph size={11} />
        </span>
      </div>
      <div className="ows-pin-label">{name}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// registration form
// ---------------------------------------------------------------------------

type FormState = "idle" | "sending" | "done" | "error"

function RegisterForm({
  roles,
  eventTitle,
  date,
  city,
  onRegister,
  onDone,
  onCalendar,
  formId,
  nameRef,
}: {
  roles: string[]
  eventTitle: string
  date: string
  city: string
  onRegister?: (data: OwsRegistration) => unknown
  onDone: () => void
  onCalendar: () => void
  formId: string
  nameRef: { current: HTMLInputElement | null }
}) {
  const [form, setForm] = React.useState({ name: "", email: "", company: "", role: roles[0] || "" } as OwsRegistration)
  const [errors, setErrors] = React.useState({} as FieldErrors)
  const [state, setState] = React.useState("idle" as FormState)
  const [ticket, setTicket] = React.useState({ name: "", code: "" })
  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const set = (k: keyof OwsRegistration) => (e: ChangeEv) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === "sending") return
    const next: FieldErrors = {}
    if (form.name.trim().length < 2) next.name = "Tell us your name."
    if (!isEmail(form.email)) next.email = "Use a work email, like you@company.com."
    if (!form.company.trim()) next.company = "Which company are you with?"
    setErrors(next)
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0]
      ;(document.getElementById(formId + "-" + first) as HTMLElement | null)?.focus()
      return
    }
    setState("sending")
    let ok = true
    try {
      const res = onRegister ? await onRegister({ ...form, name: form.name.trim(), email: form.email.trim(), company: form.company.trim() }) : await new Promise((r) => setTimeout(r, 900))
      if (res === false) ok = false
    } catch {
      ok = false
    }
    if (!alive.current) return
    if (!ok) {
      setState("error")
      return
    }
    setTicket({ name: form.name.trim(), code: ticketCode(eventTitle, form.email) })
    setState("done")
    onDone()
  }

  if (state === "done") {
    return (
      <div className="ows-ticket" role="status">
        <div className="ows-ticket-top">
          <span className="ows-kicker">You&apos;re on the list</span>
          <p className="ows-ticket-name">{ticket.name}</p>
          <p className="ows-ticket-meta">
            {eventTitle} · {date} · {city}
          </p>
        </div>
        <div className="ows-ticket-perf" aria-hidden="true" />
        <div className="ows-ticket-bot">
          <div>
            <span className="ows-ticket-label">Ticket</span>
            <span className="ows-ticket-code">{ticket.code}</span>
          </div>
          <div className="ows-ticket-actions">
            <button type="button" className="ows-btn ows-btn--dark ows-btn--sm" onClick={onCalendar}>
              <CalendarGlyph /> Add to calendar
            </button>
            <button
              type="button"
              className="ows-link"
              onClick={() => {
                setForm({ name: "", email: "", company: "", role: roles[0] || "" })
                setState("idle")
              }}
            >
              Register someone else
            </button>
          </div>
        </div>
      </div>
    )
  }

  const field = (k: "name" | "email" | "company", label: string, type: string, auto: string) => (
    <label className="ows-field-row" htmlFor={formId + "-" + k}>
      <span className="ows-label">{label}</span>
      <input
        id={formId + "-" + k}
        ref={k === "name" ? nameRef : undefined}
        className="ows-input"
        type={type}
        autoComplete={auto}
        value={form[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? formId + "-" + k + "-err" : undefined}
      />
      {errors[k] && (
        <span id={formId + "-" + k + "-err"} className="ows-err">
          {errors[k]}
        </span>
      )}
    </label>
  )

  return (
    <form className="ows-form" onSubmit={submit} noValidate>
      {field("name", "Full name", "text", "name")}
      {field("email", "Work email", "email", "email")}
      {field("company", "Company", "text", "organization")}
      <label className="ows-field-row" htmlFor={formId + "-role"}>
        <span className="ows-label">Role</span>
        <span className="ows-select">
          <select id={formId + "-role"} className="ows-input" value={form.role} onChange={set("role")}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          <Chevron />
        </span>
      </label>
      {state === "error" && (
        <p className="ows-err ows-err--form" role="alert">
          That didn&apos;t go through. Try again in a moment.
        </p>
      )}
      <button type="submit" className="ows-btn ows-btn--accent ows-btn--wide" disabled={state === "sending"}>
        {state === "sending" ? "Saving your seat…" : "Request my seat"}
        {state !== "sending" && <ArrowGlyph />}
      </button>
      <p className="ows-fine">Free to attend. We confirm every seat within two business days.</p>
    </form>
  )
}

// ---------------------------------------------------------------------------
// the page
// ---------------------------------------------------------------------------

export default function OnwardSummitTemplate({
  brand = "keel",
  logo,
  title = "Onward",
  tagline = "Your invitation to the sharpest\nroom in finance",
  date = "November 12, 2026",
  city = "New York",
  startsAt = "2026-11-12T08:00:00-05:00",
  endsAt,
  register = { label: "Register now" },
  expect = {
    title: "On what to expect",
    intro:
      "Our first summit is a day of candid conversations with rising finance leaders, tactical sessions you can use on Monday and fresh takes on where the industry goes next. You'll leave ready to turn insight into action.",
    features: DEFAULT_FEATURES,
  },
  guests = { title: "On the guest list", audiences: DEFAULT_AUDIENCES },
  agenda = { title: "On the agenda", intro: "One room in the morning, three tracks after lunch. Save the sessions you want and take them with you.", sessions: DEFAULT_SESSIONS },
  speakers = { title: "On stage", intro: "Operators, not keynote tourists. Everyone here has run the playbook they're sharing.", people: DEFAULT_SPEAKERS },
  venue = {
    title: "On location",
    name: "Hudson Atrium",
    address: "600 West 22nd Street",
    city: "New York, NY 10011",
    notes: ["Doors open at 8:00 AM", "Business casual", "Two blocks from the High Line", "Step-free access throughout"],
  },
  faq = { title: "On your mind", items: DEFAULT_FAQ },
  cta = { kicker: "On the list", title: "Save your seat", subtitle: "Rooms stay small enough to actually talk, so seats are limited.", seats: { total: 400, taken: 287 } },
  footer = { note: "© 2026 Keel Financial, Inc. Onward is free for confirmed guests." },
  palette = "cobalt",
  glyph = "arrow",
  onRegister,
  height = "100svh",
  className = "",
}: OnwardSummitTemplateProps) {
  const uid = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const pal = resolvePalette(palette)
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const heroRef = React.useRef(null as HTMLElement | null)
  const nameRef = React.useRef(null as HTMLInputElement | null)

  const [solid, setSolid] = React.useState(false)
  const features = expect?.features && expect.features.length ? expect.features : DEFAULT_FEATURES
  const audiences = guests?.audiences && guests.audiences.length ? guests.audiences : DEFAULT_AUDIENCES
  const sessions = agenda?.sessions && agenda.sessions.length ? agenda.sessions : DEFAULT_SESSIONS
  const people = speakers?.people && speakers.people.length ? speakers.people : DEFAULT_SPEAKERS
  const faqs = faq?.items && faq.items.length ? faq.items : DEFAULT_FAQ
  const location = venue ? [venue.name, venue.address, venue.city].filter(Boolean).join(", ") : city

  // ---- guest list -----------------------------------------------------------
  const [aud, setAud] = React.useState(0)
  const [audAuto, setAudAuto] = React.useState(true)
  const [audHold, setAudHold] = React.useState(false)
  React.useEffect(() => {
    if (!audAuto || audHold || reduced || audiences.length < 2) return
    const t = setTimeout(() => setAud((i) => (i + 1) % audiences.length), 7000)
    return () => clearTimeout(t)
  }, [aud, audAuto, audHold, reduced, audiences.length])
  const audRefs = React.useRef([] as (HTMLButtonElement | null)[])
  const pickAud = (i: number, focus?: boolean) => {
    setAud(i)
    setAudAuto(false)
    if (focus) audRefs.current[i]?.focus()
  }

  // ---- agenda ---------------------------------------------------------------
  const tracks = React.useMemo(() => tracksOf(sessions), [sessions])
  const [track, setTrack] = React.useState("All")
  const [openRow, setOpenRow] = React.useState(-1)
  const [saved, setSaved] = React.useState([] as number[])
  const shown = sessions.map((s, i) => ({ s, i })).filter((x) => track === "All" || x.s.track === track)
  const toggleSave = (i: number) => setSaved((xs) => (xs.includes(i) ? xs.filter((x) => x !== i) : [...xs, i].sort((a, b) => a - b)))

  const lastEnd = React.useMemo(() => {
    const last = sessions[sessions.length - 1]
    return last ? atVenueTime(startsAt, addMinutes(last.start, last.duration)) : null
  }, [sessions, startsAt])
  const startDate = React.useMemo(() => {
    const d = new Date(startsAt)
    return isNaN(d.getTime()) ? null : d
  }, [startsAt])
  const endDate = React.useMemo(() => {
    if (endsAt) {
      const d = new Date(endsAt)
      if (!isNaN(d.getTime())) return d
    }
    return lastEnd || (startDate ? new Date(startDate.getTime() + 9 * 3600000) : null)
  }, [endsAt, lastEnd, startDate])

  const sessionEvent = (s: OwsSession): IcsEvent | null => {
    const a = atVenueTime(startsAt, s.start)
    const b = atVenueTime(startsAt, addMinutes(s.start, s.duration))
    if (!a || !b) return null
    const who = s.speakers && s.speakers.length ? "With " + s.speakers.join(", ") + ". " : ""
    return { title: title + ": " + s.title, start: a, end: b, location, description: who + (s.description || "") }
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event"
  const saveEvent = () => {
    if (!startDate || !endDate) return
    download(slug + ".ics", buildIcs([{ title, start: startDate, end: endDate, location, description: tagline.replace(/\n/g, " ") }], new Date()), "text/calendar")
  }
  const saveSessions = (idx: number[]) => {
    const evs = idx.map((i) => sessionEvent(sessions[i])).filter(Boolean) as IcsEvent[]
    if (evs.length) download(slug + (idx.length === 1 ? "-session" : "-agenda") + ".ics", buildIcs(evs, new Date()), "text/calendar")
  }

  // ---- countdown and seats --------------------------------------------------
  const [now, setNow] = React.useState(null as number | null)
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()))
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      cancelAnimationFrame(frame)
      clearInterval(t)
    }
  }, [])
  const left = now !== null && startDate ? countdown(startDate.getTime() - now) : null
  const live = left?.done && endDate && now !== null && now < endDate.getTime()
  const [taken, setTaken] = React.useState(cta?.seats?.taken ?? 0)
  const seats = cta?.seats ? { total: cta.seats.total, taken } : undefined
  const remaining = seatsLeft(seats)

  // ---- FAQ ------------------------------------------------------------------
  const [openFaq, setOpenFaq] = React.useState(0)

  // ---- in-page links --------------------------------------------------------
  const goTo = (key: string, e?: AnchorEv) => {
    const target = rootRef.current?.querySelector('[data-sec="' + key + '"]')
    if (!target) return false
    e?.preventDefault()
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    return true
  }
  const onRegisterClick = (e: AnchorEv) => {
    if (register.href && !register.href.startsWith("#")) return
    const key = register.href ? register.href.slice(1) : "register"
    if (goTo(key, e)) setTimeout(() => nameRef.current?.focus({ preventScroll: true }), reduced ? 0 : 650)
  }
  const onLink = (href: string | undefined, e: AnchorEv) => {
    if (!href || !href.startsWith("#")) return
    if (!goTo(href.slice(1), e) && href === "#") e.preventDefault()
  }

  // ---- nav turns solid once the hero is behind it ---------------------------
  React.useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = 0
      const h = heroRef.current
      if (h) setSolid(h.getBoundingClientRect().bottom < 72)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    on()
    window.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", on)
      window.removeEventListener("resize", on)
    }
  }, [])

  // ---- reveal on scroll: only what starts below the fold is hidden ----------
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || reduced || typeof IntersectionObserver === "undefined") return
    const vh = window.innerHeight || 800
    const below = Array.from(root.querySelectorAll(".ows-rise")).filter((n) => n.getBoundingClientRect().top > vh)
    below.forEach((n) => n.classList.add("ows-pre"))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.remove("ows-pre")
            io.unobserve(x.target)
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    below.forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      below.forEach((n) => n.classList.remove("ows-pre"))
    }
  }, [reduced])

  const vars = {
    "--ows-deep": pal.deep,
    "--ows-mid": pal.mid,
    "--ows-light": pal.light,
    "--ows-paper": pal.paper,
    "--ows-ink": pal.ink,
    "--ows-muted": pal.muted,
    "--ows-accent": pal.accent,
    "--ows-accent-ink": pal.accentInk,
    "--ows-tint": pal.tint,
    "--ows-glyph-light": pal.glyphLight,
    "--ows-glyph-dark": pal.glyphDark,
    "--ows-icon-a": pal.icon[0],
    "--ows-icon-b": pal.icon[1],
    "--ows-hero-h": height,
  } as React.CSSProperties

  const tagLines = tagline.split("\n")
  const pitchWords = audiences[aud]?.pitch.split(/\s+/) ?? []
  const footLinks = footer?.links ?? [
    agenda && { label: "Agenda", href: "#agenda" },
    speakers && { label: "Speakers", href: "#speakers" },
    venue && { label: "Venue", href: "#venue" },
    faq && { label: "FAQ", href: "#faq" },
    cta && { label: "Register", href: "#register" },
  ].filter(Boolean) as OwsLink[]

  return (
    <div ref={rootRef} className={"ows-root " + className} style={vars}>
      <style>{OWS_CSS}</style>

      {/* ---------------- nav ---------------- */}
      <header className="ows-nav" data-solid={solid ? "" : undefined}>
        <a href="#" className="ows-brand" onClick={(e) => {
          e.preventDefault()
          rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
        }}>
          <span className="ows-brand-word">{brand}</span>
          {logo ?? <BrandMark />}
        </a>
        <button type="button" className="ows-when" onClick={saveEvent} title="Add to calendar">
          <span>{date}</span>
          <span className="ows-when-bar" aria-hidden="true" />
          <span>{city}</span>
          <span className="ows-when-cal">
            <CalendarGlyph />
          </span>
        </button>
        <a href={register.href || "#register"} className="ows-btn ows-btn--accent ows-btn--nav" onClick={onRegisterClick}>
          <span>{register.label}</span>
          <span className="ows-btn-arrow">
            <ArrowGlyph size={10} />
          </span>
        </a>
      </header>

      {/* ---------------- hero ---------------- */}
      <section ref={heroRef} className="ows-hero" aria-label={title}>
        <div className="ows-hero-bg" aria-hidden="true" />
        <GlyphField mode="hero" glyph={glyph} light={pal.glyphLight} dark={pal.glyphDark} reduced={reduced} />
        <div className="ows-hero-copy">
          <h1 className="ows-title" aria-label={title}>
            {Array.from(title).map((ch, i) => (
              <span key={i} className="ows-title-ch" style={{ "--i": i } as React.CSSProperties} aria-hidden="true">
                {ch === " " ? "\u00a0" : ch}
              </span>
            ))}
          </h1>
          <p className="ows-tagline">
            {tagLines.map((l, i) => (
              <span key={i} className="ows-tag-line" style={{ "--i": i } as React.CSSProperties}>
                {l}
              </span>
            ))}
          </p>
        </div>
      </section>

      <main className="ows-main">
        {/* ---------------- expect ---------------- */}
        {expect && (
          <section className="ows-sec ows-wrap" data-sec="expect">
            <h2 className="ows-h2 ows-rise">{expect.title ?? "On what to expect"}</h2>
            {expect.intro && <p className="ows-intro ows-rise">{expect.intro}</p>}
            <div className="ows-features">
              {features.map((f, i) => (
                <article key={i} className="ows-feature ows-rise" style={{ "--d": i * 90 + "ms" } as React.CSSProperties}>
                  <div className="ows-feature-mark">
                    {f.icon === "arrow" || f.icon === "ring" || f.icon === "plus" || f.icon === undefined ? (
                      <FeatureMark kind={(f.icon as "arrow" | "ring" | "plus" | undefined) ?? (["arrow", "ring", "plus"] as const)[i % 3]} uid={uid} i={i} />
                    ) : (
                      f.icon
                    )}
                  </div>
                  <h3 className="ows-feature-title">{f.title}</h3>
                  <p className="ows-feature-text">{f.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- guest list ---------------- */}
        {guests && (
          <section
            className="ows-sec ows-wrap"
            data-sec="guests"
            onPointerEnter={() => setAudHold(true)}
            onPointerLeave={() => setAudHold(false)}
            onFocus={() => setAudHold(true)}
            onBlur={() => setAudHold(false)}
          >
            <h2 className="ows-h2 ows-rise">{guests.title ?? "On the guest list"}</h2>
            <div className="ows-chips ows-rise" role="tablist" aria-label="Who it's for">
              {audiences.map((a, i) => (
                <button
                  key={a.role}
                  ref={(el) => {
                    audRefs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={uid + "-aud-" + i}
                  aria-selected={i === aud}
                  aria-controls={uid + "-pitch"}
                  tabIndex={i === aud ? 0 : -1}
                  className="ows-chip"
                  data-auto={i === aud && audAuto && !audHold && !reduced ? "" : undefined}
                  onClick={() => pickAud(i)}
                  onKeyDown={(e) => {
                    const j = nextIndex(aud, e.key, audiences.length)
                    if (j !== aud) {
                      e.preventDefault()
                      pickAud(j, true)
                    }
                  }}
                >
                  {a.role}
                  <span className="ows-chip-bar" key={aud + "-" + String(audAuto)} aria-hidden="true" />
                </button>
              ))}
            </div>
            <p id={uid + "-pitch"} role="tabpanel" aria-labelledby={uid + "-aud-" + aud} className="ows-pitch ows-rise" aria-live="polite">
              <span key={aud} className="ows-pitch-in">
                {pitchWords.map((w, i) => (
                  <span key={i} className="ows-word" style={{ "--i": i } as React.CSSProperties}>
                    {w}{" "}
                  </span>
                ))}
              </span>
            </p>
          </section>
        )}

        {/* ---------------- agenda ---------------- */}
        {agenda && (
          <section className="ows-sec ows-wrap" data-sec="agenda">
            <div className="ows-sec-head">
              <div>
                <h2 className="ows-h2 ows-rise">{agenda.title ?? "On the agenda"}</h2>
                {agenda.intro && <p className="ows-intro ows-rise">{agenda.intro}</p>}
              </div>
              <div className="ows-saved ows-rise" data-on={saved.length ? "" : undefined} aria-live="polite">
                <span className="ows-saved-n">{saved.length}</span>
                <span className="ows-saved-t">{saved.length === 1 ? "session saved" : "sessions saved"}</span>
                <button type="button" className="ows-btn ows-btn--dark ows-btn--sm" disabled={!saved.length} onClick={() => saveSessions(saved)}>
                  <CalendarGlyph /> Download .ics
                </button>
              </div>
            </div>
            <div className="ows-chips ows-chips--filter ows-rise" role="group" aria-label="Filter by track">
              {tracks.map((t) => (
                <button key={t} type="button" className="ows-chip" aria-pressed={t === track} onClick={() => setTrack(t)}>
                  {t}
                  <span className="ows-chip-n">{t === "All" ? sessions.length : sessions.filter((s) => s.track === t).length}</span>
                </button>
              ))}
            </div>
            <ol className="ows-agenda ows-rise" key={track}>
              {shown.map(({ s, i }, k) => {
                const open = openRow === i
                const isSaved = saved.includes(i)
                return (
                  <li key={i} className="ows-row" data-open={open ? "" : undefined} style={{ "--k": k } as React.CSSProperties}>
                    <div className="ows-row-main">
                      <button
                        type="button"
                        className="ows-row-btn"
                        aria-expanded={open}
                        aria-controls={uid + "-row-" + i}
                        onClick={() => setOpenRow(open ? -1 : i)}
                      >
                        <span className="ows-row-time">
                          {formatClock(s.start)}
                          <span className="ows-row-end">{formatClock(addMinutes(s.start, s.duration))}</span>
                        </span>
                        <span className="ows-row-body">
                          <span className="ows-row-title">{s.title}</span>
                          {s.speakers && s.speakers.length > 0 && <span className="ows-row-who">{s.speakers.join(" · ")}</span>}
                        </span>
                        {s.track && <span className="ows-tag">{s.track}</span>}
                        <Chevron open={open} />
                      </button>
                      <button
                        type="button"
                        className="ows-save"
                        aria-pressed={isSaved}
                        aria-label={(isSaved ? "Remove " : "Save ") + s.title}
                        title={isSaved ? "Saved" : "Save to my agenda"}
                        onClick={() => toggleSave(i)}
                      >
                        <BookmarkGlyph on={isSaved} />
                      </button>
                    </div>
                    <div id={uid + "-row-" + i} className="ows-row-more" role="region" aria-label={s.title} hidden={!open && reduced ? true : undefined}>
                      <div className="ows-row-inner">
                        {s.description && <p>{s.description}</p>}
                        <button type="button" className="ows-link" tabIndex={open ? 0 : -1} onClick={() => saveSessions([i])}>
                          <CalendarGlyph /> Add this session to my calendar
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* ---------------- speakers ---------------- */}
        {speakers && (
          <section className="ows-sec ows-wrap" data-sec="speakers">
            <h2 className="ows-h2 ows-rise">{speakers.title ?? "On stage"}</h2>
            {speakers.intro && <p className="ows-intro ows-rise">{speakers.intro}</p>}
            <ul className="ows-speakers">
              {people.map((p, i) => (
                <li key={p.name} className="ows-speaker ows-rise" style={{ "--d": (i % 4) * 70 + "ms" } as React.CSSProperties} tabIndex={0}>
                  <div className="ows-portrait">
                    {p.photo ? (
                      <>
                        <img className="ows-photo" src={p.photo} alt="" width={440} height={520} loading="lazy" decoding="async" />
                        <span className="ows-photo-tint" aria-hidden="true" />
                      </>
                    ) : (
                      <GlyphPortrait seed={p.name} glyph={glyph} uid={uid} i={i} />
                    )}
                    {p.bio && <p className="ows-bio">{p.bio}</p>}
                  </div>
                  <p className="ows-speaker-name">{p.name}</p>
                  <p className="ows-speaker-role">
                    {p.role}
                    {p.company ? ", " + p.company : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------------- venue ---------------- */}
        {venue && (
          <section className="ows-sec ows-wrap" data-sec="venue">
            <h2 className="ows-h2 ows-rise">{venue.title ?? "On location"}</h2>
            <div className="ows-venue ows-rise">
              <div className="ows-venue-info">
                <p className="ows-venue-name">{venue.name}</p>
                <p className="ows-venue-addr">
                  {venue.address}
                  {venue.city && (
                    <>
                      <br />
                      {venue.city}
                    </>
                  )}
                </p>
                {venue.notes && venue.notes.length > 0 && (
                  <ul className="ows-notes">
                    {venue.notes.map((n) => (
                      <li key={n}>
                        <ArrowGlyph size={10} />
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="ows-venue-actions">
                  <a
                    className="ows-btn ows-btn--dark ows-btn--sm"
                    href={venue.mapHref || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get directions <ArrowGlyph size={10} />
                  </a>
                  <button type="button" className="ows-link" onClick={saveEvent}>
                    <CalendarGlyph /> Add the day to my calendar
                  </button>
                </div>
              </div>
              <VenueMap uid={uid} name={venue.name} reduced={reduced} />
            </div>
          </section>
        )}

        {/* ---------------- FAQ ---------------- */}
        {faq && (
          <section className="ows-sec ows-wrap" data-sec="faq">
            <h2 className="ows-h2 ows-rise">{faq.title ?? "On your mind"}</h2>
            <div className="ows-faq ows-rise">
              {faqs.map((f, i) => {
                const open = openFaq === i
                return (
                  <div key={i} className="ows-faq-item" data-open={open ? "" : undefined}>
                    <h3 className="ows-faq-h">
                      <button type="button" className="ows-faq-q" aria-expanded={open} aria-controls={uid + "-faq-" + i} id={uid + "-faqq-" + i} onClick={() => setOpenFaq(open ? -1 : i)}>
                        <span>{f.q}</span>
                        <span className="ows-faq-icon" aria-hidden="true" />
                      </button>
                    </h3>
                    <div id={uid + "-faq-" + i} role="region" aria-labelledby={uid + "-faqq-" + i} className="ows-faq-a">
                      <div className="ows-row-inner">
                        <p>{f.a}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* ---------------- register ---------------- */}
      {cta && (
        <section className="ows-band" data-sec="register">
          <GlyphField mode="band" glyph={glyph} light={pal.glyphLight} dark={pal.glyphDark} reduced={reduced} cell={15} />
          <div className="ows-wrap ows-band-grid">
            <div className="ows-band-copy">
              {cta.kicker && <span className="ows-kicker ows-kicker--light">{cta.kicker}</span>}
              <h2 className="ows-band-title">{cta.title ?? "Save your seat"}</h2>
              {cta.subtitle && <p className="ows-band-sub">{cta.subtitle}</p>}
              <div className="ows-count" aria-live="off">
                {live ? (
                  <p className="ows-count-live">
                    <span className="ows-live-dot" /> Happening now in {city}
                  </p>
                ) : left && left.done ? (
                  <p className="ows-count-live">That&apos;s a wrap. See you at the next one.</p>
                ) : (
                  <>
                    <span className="ows-count-label">Doors open in</span>
                    <div className="ows-count-cells">
                      {(
                        [
                          ["days", left?.days],
                          ["hrs", left?.hours],
                          ["min", left?.minutes],
                          ["sec", left?.seconds],
                        ] as [string, number | undefined][]
                      ).map(([k, v]) => (
                        <span key={k} className="ows-count-cell">
                          <span className="ows-count-v">{v === undefined ? "--" : k === "days" ? v : pad2(v)}</span>
                          <span className="ows-count-k">{k}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {seats && (
                <div className="ows-seats">
                  <div className="ows-seats-top">
                    <span>
                      <strong>{remaining}</strong> of {seats.total} seats left
                    </span>
                    <span>{Math.round((seats.taken / Math.max(1, seats.total)) * 100)}% claimed</span>
                  </div>
                  <div
                    className="ows-meter"
                    role="meter"
                    aria-label="Seats claimed"
                    aria-valuemin={0}
                    aria-valuemax={seats.total}
                    aria-valuenow={Math.min(seats.total, seats.taken)}
                  >
                    <i style={{ width: clamp((seats.taken / Math.max(1, seats.total)) * 100, 0, 100) + "%" }} />
                  </div>
                </div>
              )}
            </div>
            <div className="ows-card">
              <RegisterForm
                roles={audiences.map((a) => a.role)}
                eventTitle={title}
                date={date}
                city={city}
                onRegister={onRegister}
                onDone={() => setTaken((t) => t + 1)}
                onCalendar={saveEvent}
                formId={uid + "-reg"}
                nameRef={nameRef}
              />
            </div>
          </div>
        </section>
      )}

      {/* ---------------- footer ---------------- */}
      {footer && (
        <footer className="ows-foot">
          <div className="ows-wrap ows-foot-grid">
            <div className="ows-brand ows-brand--foot">
              <span className="ows-brand-word">{brand}</span>
              {logo ?? <BrandMark />}
            </div>
            <nav className="ows-foot-links" aria-label="Footer">
              {footLinks.map((l) => (
                <a key={l.label} href={l.href || "#"} onClick={(e) => onLink(l.href, e)}>
                  {l.label}
                </a>
              ))}
            </nav>
            {footer.note && <p className="ows-foot-note">{footer.note}</p>}
          </div>
          <div className="ows-foot-word" aria-hidden="true">
            {title}
          </div>
        </footer>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// styles — every selector is under .ows-
// ---------------------------------------------------------------------------

const OWS_CSS = `
.ows-root{position:relative;background:var(--ows-paper);color:var(--ows-ink);overflow-x:clip;font-family:"Inter Tight","Inter","Geist","Helvetica Neue",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.4;letter-spacing:-.006em}
.ows-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}
.ows-root :where(a){color:inherit;text-decoration:none}
.ows-root :where(p,h1,h2,h3,ul,ol){margin:0;padding:0}
.ows-root :where(ul,ol){list-style:none}
.ows-root :where(input,select){font:inherit;color:inherit}
.ows-root :where(button,a,input,select,[tabindex]):focus-visible{outline:2px solid var(--ows-mid);outline-offset:2px;border-radius:6px}
.ows-svg{display:block;max-width:none;flex:none}
.ows-wrap{width:100%;max-width:1200px;margin:0 auto;padding:0 clamp(20px,4.6vw,56px);box-sizing:border-box}

/* ---- buttons ---- */
.ows-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 18px;border-radius:5px;font-size:14px;font-weight:500;letter-spacing:-.01em;white-space:nowrap;transition:transform .25s cubic-bezier(.2,.8,.2,1),background-color .25s,box-shadow .25s,color .25s,opacity .25s}
.ows-btn:active{transform:scale(.97)}
.ows-btn[disabled]{opacity:.45;cursor:not-allowed}
.ows-btn--sm{height:34px;padding:0 13px;font-size:13px;gap:7px}
.ows-btn--wide{width:100%}
.ows-btn--accent{background:var(--ows-accent);color:var(--ows-accent-ink);box-shadow:inset 0 -1px 0 rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.14)}
.ows-btn--accent:hover{box-shadow:inset 0 -1px 0 rgba(0,0,0,.12),0 10px 26px -10px color-mix(in srgb,var(--ows-accent) 80%,#000)}
.ows-btn--dark{background:var(--ows-ink);color:var(--ows-paper)}
.ows-btn--dark:hover:not([disabled]){background:color-mix(in srgb,var(--ows-ink) 82%,var(--ows-mid))}
.ows-btn--nav{height:31px;padding:0 13px;font-size:12.5px;gap:0;overflow:hidden}
.ows-btn-arrow{display:inline-flex;width:0;opacity:0;transform:translate(-4px,4px);transition:width .3s cubic-bezier(.2,.8,.2,1),opacity .3s,transform .3s cubic-bezier(.2,.8,.2,1)}
.ows-btn--nav:hover .ows-btn-arrow,.ows-btn--nav:focus-visible .ows-btn-arrow{width:16px;opacity:1;transform:none;padding-left:6px}
.ows-link{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:500;color:var(--ows-mid);border-radius:4px;transition:color .2s}
.ows-link:hover{color:var(--ows-ink)}

/* ---- nav ---- */
.ows-nav{position:sticky;top:0;z-index:40;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:56px;margin-bottom:-56px;padding:0 clamp(16px,4.6vw,56px);color:#fff;transition:background-color .35s,color .35s,box-shadow .35s,backdrop-filter .35s}
.ows-nav[data-solid]{background:color-mix(in srgb,var(--ows-paper) 86%,transparent);color:var(--ows-ink);box-shadow:0 1px 0 color-mix(in srgb,var(--ows-ink) 9%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4)}
.ows-brand{display:inline-flex;align-items:center;gap:6px;justify-self:start;font-size:18px;font-weight:600;letter-spacing:-.04em;line-height:1}
.ows-brand-word{transform:translateY(-1px)}
.ows-brand .ows-svg{transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.ows-brand:hover .ows-svg{transform:translate(2px,-2px)}
.ows-when{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;letter-spacing:-.005em;padding:6px 10px;border-radius:6px;transition:background-color .25s}
.ows-when-bar{width:1px;height:14px;background:currentColor;opacity:.8}
.ows-when-cal{display:inline-flex;width:0;opacity:0;overflow:hidden;transition:width .3s,opacity .3s}
.ows-when:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
.ows-when:hover .ows-when-cal,.ows-when:focus-visible .ows-when-cal{width:18px;opacity:1;padding-left:4px}
.ows-nav .ows-btn--accent{justify-self:end}

/* ---- hero ---- */
.ows-hero{position:relative;min-height:max(620px,var(--ows-hero-h));display:flex;align-items:center;justify-content:center;overflow:hidden;isolation:isolate;cursor:crosshair}
.ows-hero-bg{position:absolute;inset:0;z-index:-2;background:radial-gradient(ellipse 34% 30% at 50% 47%,color-mix(in srgb,var(--ows-mid) 55%,var(--ows-light)) 0%,transparent 100%),linear-gradient(180deg,var(--ows-deep) 0%,color-mix(in srgb,var(--ows-deep) 45%,var(--ows-mid)) 16%,var(--ows-mid) 40%,color-mix(in srgb,var(--ows-mid) 45%,var(--ows-light)) 60%,var(--ows-light) 74%,color-mix(in srgb,var(--ows-light) 30%,var(--ows-paper)) 88%,var(--ows-paper) 100%)}
.ows-field{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.ows-canvas{display:block;max-width:none;position:absolute;left:0;top:0}
.ows-hero-copy{position:relative;text-align:center;color:#fff;padding:0 20px;transform:translateY(-3%);pointer-events:none}
.ows-title{display:flex;justify-content:center;font-size:clamp(64px,10.4vw,132px);font-weight:600;letter-spacing:-.055em;line-height:.98;padding-bottom:.06em;text-shadow:0 10px 50px color-mix(in srgb,var(--ows-deep) 45%,transparent)}
.ows-title-ch{display:inline-block;animation:ows-rise-in 1s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i) * 55ms + 120ms)}
.ows-tagline{margin-top:clamp(4px,1vw,10px);font-size:clamp(18px,1.95vw,24px);font-weight:450;letter-spacing:-.02em;line-height:1.22;text-shadow:0 2px 20px color-mix(in srgb,var(--ows-deep) 50%,transparent)}
.ows-tag-line{display:block;animation:ows-rise-in 1s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i) * 90ms + 520ms)}
@keyframes ows-rise-in{from{opacity:0;transform:translateY(.35em);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}

/* ---- sections ---- */
.ows-main{position:relative}
.ows-sec{padding-top:clamp(72px,10vw,120px)}
.ows-sec:last-child{padding-bottom:clamp(88px,11vw,140px)}
.ows-h2{font-size:clamp(32px,3.9vw,45px);font-weight:450;letter-spacing:-.035em;line-height:1.05}
.ows-intro{margin-top:18px;max-width:460px;font-size:15px;line-height:1.45;color:var(--ows-muted)}
.ows-sec-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap}
.ows-kicker{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ows-mid)}
.ows-kicker--light{color:color-mix(in srgb,#fff 75%,var(--ows-light))}

/* ---- features ---- */
.ows-features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(24px,4vw,56px);margin-top:clamp(40px,5vw,56px)}
.ows-feature{max-width:340px}
.ows-feature-mark{width:76px;height:76px;margin:0 0 22px -2px}
.ows-mark-g{transform-origin:38px 38px;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
.ows-feature:hover .ows-mark[data-kind=arrow] .ows-mark-g{transform:translate(5px,-5px)}
.ows-feature:hover .ows-mark[data-kind=ring] .ows-mark-g{transform:rotate(180deg) scale(1.04)}
.ows-feature:hover .ows-mark[data-kind=plus] .ows-mark-g{transform:rotate(90deg)}
.ows-feature-title{font-size:15px;font-weight:500;letter-spacing:-.01em}
.ows-feature-text{margin-top:4px;font-size:14.5px;line-height:1.45;color:var(--ows-muted)}

/* ---- chips ---- */
.ows-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.ows-chip{position:relative;display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 13px;border-radius:4px;font-size:12.5px;color:color-mix(in srgb,var(--ows-ink) 72%,transparent);background:var(--ows-paper);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ows-ink) 13%,transparent);overflow:hidden;transition:background-color .25s,box-shadow .25s,color .25s}
.ows-chip:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ows-ink) 30%,transparent);color:var(--ows-ink)}
.ows-chip[aria-selected=true],.ows-chip[aria-pressed=true]{background:var(--ows-tint);color:var(--ows-ink);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ows-mid) 45%,transparent)}
.ows-chip-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;background:var(--ows-mid);transform:scaleX(0);transform-origin:left}
.ows-chip[data-auto] .ows-chip-bar{animation:ows-bar 7s linear both}
@keyframes ows-bar{to{transform:scaleX(1)}}
.ows-chip-n{font-size:11px;font-variant-numeric:tabular-nums;color:var(--ows-muted)}
.ows-chips--filter{margin-top:28px}

/* ---- guest pitch ---- */
.ows-pitch{margin-top:18px;max-width:790px;min-height:4.4em;font-size:clamp(25px,3.15vw,38px);font-weight:450;line-height:1.12;letter-spacing:-.028em;color:color-mix(in srgb,var(--ows-ink) 58%,var(--ows-paper))}
.ows-pitch-in{display:block}
.ows-word{display:inline-block;white-space:pre;margin-right:0.25em;animation:ows-word .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i) * 18ms)}
@keyframes ows-word{from{opacity:0;transform:translateY(.3em);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}

/* ---- agenda ---- */
.ows-saved{display:flex;align-items:center;gap:10px;padding:6px 6px 6px 14px;border-radius:8px;background:var(--ows-tint);font-size:13px;color:var(--ows-muted);transition:background-color .3s}
.ows-saved-n{font-weight:600;font-variant-numeric:tabular-nums;color:var(--ows-ink);min-width:1ch}
.ows-saved[data-on] .ows-saved-n{animation:ows-pop .45s cubic-bezier(.2,.8,.2,1)}
@keyframes ows-pop{40%{transform:scale(1.35)}}
.ows-agenda{margin-top:18px;border-top:1px solid color-mix(in srgb,var(--ows-ink) 12%,transparent)}
.ows-row{border-bottom:1px solid color-mix(in srgb,var(--ows-ink) 12%,transparent);animation:ows-row-in .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--k) * 40ms)}
@keyframes ows-row-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ows-row-main{display:flex;align-items:center;gap:8px}
.ows-row-btn{flex:1;min-width:0;display:grid;grid-template-columns:118px minmax(0,1fr) auto 14px;align-items:center;gap:18px;padding:18px 6px 18px 4px;border-radius:6px;transition:background-color .25s}
.ows-row-btn:hover{background:color-mix(in srgb,var(--ows-tint) 70%,transparent)}
.ows-row-time{display:flex;flex-direction:column;font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.ows-row-end{font-size:12px;font-weight:400;color:var(--ows-muted)}
.ows-row-body{display:flex;flex-direction:column;gap:3px;min-width:0}
.ows-row-title{font-size:clamp(16px,1.6vw,19px);font-weight:450;letter-spacing:-.02em;line-height:1.25;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.ows-row-btn:hover .ows-row-title{transform:translateX(4px)}
.ows-row-who{font-size:13px;color:var(--ows-muted)}
.ows-tag{font-size:11.5px;font-weight:500;padding:3px 9px;border-radius:999px;color:var(--ows-mid);background:var(--ows-tint);white-space:nowrap}
.ows-chev{color:var(--ows-muted);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.ows-chev[data-open]{transform:rotate(180deg)}
.ows-save{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:var(--ows-muted);transition:color .2s,background-color .2s,transform .2s}
.ows-save:hover{background:var(--ows-tint);color:var(--ows-ink)}
.ows-save[aria-pressed=true]{color:var(--ows-mid)}
.ows-save[aria-pressed=true] .ows-svg{animation:ows-pop .45s cubic-bezier(.2,.8,.2,1)}
.ows-row-more,.ows-faq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.8,.2,1)}
.ows-row[data-open] .ows-row-more,.ows-faq-item[data-open] .ows-faq-a{grid-template-rows:1fr}
.ows-row-inner{overflow:hidden;min-height:0}
.ows-row-more .ows-row-inner{padding-left:140px}
.ows-row-more p{max-width:620px;font-size:14.5px;line-height:1.5;color:var(--ows-muted)}
.ows-row-more .ows-link{margin:12px 0 22px}

/* ---- speakers ---- */
.ows-speakers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(16px,2.2vw,28px);margin-top:clamp(32px,4vw,48px)}
.ows-speaker{outline:none;border-radius:10px}
.ows-portrait{position:relative;aspect-ratio:11/13;border-radius:10px;overflow:hidden;background:var(--ows-deep);isolation:isolate}
.ows-portrait-svg{position:absolute;inset:0;width:100%;height:100%}
.ows-portrait-g{transform-origin:110px 150px;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
.ows-portrait-g .ows-pb3{transition:stroke .5s}
.ows-speaker:hover .ows-portrait-g,.ows-speaker:focus-visible .ows-portrait-g{transform:scale(1.06) translateY(-4px)}
.ows-speaker:hover .ows-pb3,.ows-speaker:focus-visible .ows-pb3{stroke:var(--ows-accent)}
.ows-photo{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;filter:grayscale(1) contrast(1.05);transition:filter .6s,transform .9s cubic-bezier(.2,.8,.2,1)}
.ows-photo-tint{position:absolute;inset:0;background:linear-gradient(180deg,var(--ows-deep),var(--ows-mid));mix-blend-mode:screen;opacity:.75;transition:opacity .6s}
.ows-speaker:hover .ows-photo,.ows-speaker:focus-visible .ows-photo{filter:none;transform:scale(1.04)}
.ows-speaker:hover .ows-photo-tint,.ows-speaker:focus-visible .ows-photo-tint{opacity:0}
.ows-bio{position:absolute;left:10px;right:10px;bottom:10px;padding:10px 12px;border-radius:7px;font-size:12.5px;line-height:1.4;color:var(--ows-ink);background:color-mix(in srgb,var(--ows-paper) 90%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transform:translateY(10px);transition:opacity .35s,transform .45s cubic-bezier(.2,.8,.2,1)}
.ows-speaker:hover .ows-bio,.ows-speaker:focus-visible .ows-bio{opacity:1;transform:none}
.ows-speaker:focus-visible .ows-portrait{outline:2px solid var(--ows-mid);outline-offset:3px}
.ows-speaker-name{margin-top:12px;font-size:15px;font-weight:500;letter-spacing:-.015em}
.ows-speaker-role{margin-top:2px;font-size:13px;color:var(--ows-muted);line-height:1.35}

/* ---- venue ---- */
.ows-venue{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(24px,4vw,56px);margin-top:clamp(28px,4vw,44px);align-items:stretch}
.ows-venue-info{display:flex;flex-direction:column;gap:14px;padding-top:4px}
.ows-venue-name{font-size:clamp(22px,2.3vw,28px);font-weight:500;letter-spacing:-.03em}
.ows-venue-addr{font-size:15px;color:var(--ows-muted);line-height:1.45}
.ows-notes{display:flex;flex-direction:column;gap:8px;margin-top:8px;padding-top:16px;border-top:1px solid color-mix(in srgb,var(--ows-ink) 10%,transparent);font-size:14px}
.ows-notes li{display:flex;align-items:center;gap:10px}
.ows-notes .ows-svg{color:var(--ows-mid)}
.ows-venue-actions{display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-top:auto;padding-top:14px}
.ows-map{position:relative;min-height:340px;border-radius:12px;overflow:hidden;background:var(--ows-tint);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ows-mid) 14%,transparent)}
.ows-map-svg{position:absolute;inset:0;width:100%;height:100%}
.ows-map-pan{transform:translate(var(--ows-mx,0px),var(--ows-my,0px));transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.ows-map-st{stroke:color-mix(in srgb,var(--ows-mid) 16%,var(--ows-paper));stroke-width:2}
.ows-map-av{stroke:var(--ows-paper);stroke-width:7}
.ows-map-bway{stroke:var(--ows-paper);stroke-width:9}
.ows-map-park{fill:color-mix(in srgb,var(--ows-light) 55%,var(--ows-paper));stroke:var(--ows-paper);stroke-width:3}
.ows-map-water{fill:color-mix(in srgb,var(--ows-light) 70%,var(--ows-mid))}
.ows-pin{position:absolute;left:54%;top:52%;width:0;height:0}
.ows-pin-dot{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:var(--ows-accent);background:var(--ows-deep);box-shadow:0 8px 22px -6px color-mix(in srgb,var(--ows-deep) 70%,transparent),0 0 0 4px var(--ows-paper)}
.ows-pin-pulse{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:var(--ows-mid);animation:ows-pulse 2.4s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes ows-pulse{from{transform:scale(1);opacity:.45}to{transform:scale(3.4);opacity:0}}
.ows-pin-label{position:absolute;left:calc(54% + 28px);top:calc(52% - 15px);padding:6px 11px;border-radius:6px;font-size:13px;font-weight:500;background:var(--ows-paper);box-shadow:0 6px 20px -8px color-mix(in srgb,var(--ows-deep) 40%,transparent);white-space:nowrap}

/* ---- FAQ ---- */
.ows-faq{margin-top:clamp(24px,3vw,36px);max-width:860px;border-top:1px solid color-mix(in srgb,var(--ows-ink) 12%,transparent)}
.ows-faq-item{border-bottom:1px solid color-mix(in srgb,var(--ows-ink) 12%,transparent)}
.ows-faq-h{font:inherit}
.ows-faq-q{display:flex;width:100%;justify-content:space-between;align-items:center;gap:20px;padding:20px 2px;font-size:clamp(16px,1.6vw,19px);font-weight:450;letter-spacing:-.02em}
.ows-faq-icon{position:relative;width:14px;height:14px;flex:none}
.ows-faq-icon::before,.ows-faq-icon::after{content:"";position:absolute;left:0;top:6px;width:14px;height:2px;border-radius:1px;background:var(--ows-mid);transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.ows-faq-icon::after{transform:rotate(90deg)}
.ows-faq-item[data-open] .ows-faq-icon::after{transform:rotate(0deg)}
.ows-faq-a p{padding:0 2px 22px;max-width:680px;font-size:15px;line-height:1.55;color:var(--ows-muted)}

/* ---- register band ---- */
.ows-band{position:relative;overflow:hidden;isolation:isolate;color:#fff;padding:clamp(72px,9vw,112px) 0;background:radial-gradient(ellipse 50% 70% at 85% 50%,color-mix(in srgb,var(--ows-mid) 70%,var(--ows-light)) 0%,transparent 100%),linear-gradient(160deg,var(--ows-deep) 0%,var(--ows-mid) 100%)}
.ows-band-grid{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,440px);gap:clamp(32px,5vw,72px);align-items:center}
.ows-band-title{margin-top:10px;font-size:clamp(40px,5.6vw,72px);font-weight:600;letter-spacing:-.05em;line-height:.98}
.ows-band-sub{margin-top:14px;max-width:420px;font-size:16px;line-height:1.45;color:color-mix(in srgb,#fff 80%,var(--ows-light))}
.ows-count{margin-top:34px}
.ows-count-label{font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in srgb,#fff 70%,var(--ows-light))}
.ows-count-cells{display:flex;gap:8px;margin-top:10px}
.ows-count-cell{display:flex;flex-direction:column;align-items:center;min-width:64px;padding:10px 8px 8px;border-radius:8px;background:color-mix(in srgb,#fff 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,#fff 16%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.ows-count-v{font-size:28px;font-weight:550;letter-spacing:-.04em;font-variant-numeric:tabular-nums;line-height:1}
.ows-count-k{margin-top:4px;font-size:11px;color:color-mix(in srgb,#fff 70%,var(--ows-light))}
.ows-count-live{display:inline-flex;align-items:center;gap:10px;font-size:17px;font-weight:500}
.ows-live-dot{width:9px;height:9px;border-radius:50%;background:var(--ows-accent);box-shadow:0 0 0 0 var(--ows-accent);animation:ows-live 1.6s infinite}
@keyframes ows-live{70%{box-shadow:0 0 0 10px transparent}100%{box-shadow:0 0 0 0 transparent}}
.ows-seats{margin-top:26px;max-width:420px}
.ows-seats-top{display:flex;justify-content:space-between;font-size:13px;color:color-mix(in srgb,#fff 80%,var(--ows-light))}
.ows-seats-top strong{color:#fff;font-weight:600}
.ows-meter{position:relative;margin-top:8px;height:6px;border-radius:3px;background:color-mix(in srgb,#fff 18%,transparent);overflow:hidden}
.ows-meter i{position:absolute;left:0;top:0;height:6px;border-radius:3px;background:var(--ows-accent);transition:width .8s cubic-bezier(.2,.8,.2,1)}
.ows-card{position:relative;padding:26px;border-radius:14px;background:var(--ows-paper);color:var(--ows-ink);box-shadow:0 30px 80px -30px color-mix(in srgb,var(--ows-deep) 80%,transparent),0 0 0 1px color-mix(in srgb,#fff 30%,transparent)}

/* ---- form ---- */
.ows-form{display:flex;flex-direction:column;gap:14px}
.ows-field-row{display:flex;flex-direction:column;gap:6px}
.ows-label{font-size:12.5px;font-weight:500;color:color-mix(in srgb,var(--ows-ink) 75%,transparent)}
.ows-input{width:100%;box-sizing:border-box;height:42px;padding:0 12px;border-radius:6px;border:0;background:color-mix(in srgb,var(--ows-tint) 60%,var(--ows-paper));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ows-ink) 13%,transparent);font-size:14.5px;outline:none;transition:box-shadow .2s,background-color .2s;-webkit-appearance:none;appearance:none}
.ows-input:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ows-ink) 26%,transparent)}
.ows-input:focus{background:var(--ows-paper);box-shadow:inset 0 0 0 1.5px var(--ows-mid),0 0 0 4px color-mix(in srgb,var(--ows-mid) 16%,transparent)}
.ows-input[aria-invalid=true]{box-shadow:inset 0 0 0 1.5px #d6453d}
.ows-select{position:relative;display:block}
.ows-select .ows-input{padding-right:34px;cursor:pointer}
.ows-select .ows-chev{position:absolute;right:12px;top:15px;pointer-events:none}
.ows-err{font-size:12.5px;color:#c63b33}
.ows-err--form{padding:9px 12px;border-radius:6px;background:#fdecea}
.ows-fine{font-size:12px;color:var(--ows-muted);text-align:center}
.ows-form .ows-btn--accent{margin-top:4px;height:46px}

/* ---- ticket ---- */
.ows-ticket{border-radius:10px;background:var(--ows-tint);animation:ows-ticket .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes ows-ticket{from{opacity:0;transform:translateY(14px) rotate(-1.5deg)}to{opacity:1;transform:none}}
.ows-ticket-top{padding:22px 22px 18px}
.ows-ticket-name{margin-top:10px;font-size:28px;font-weight:600;letter-spacing:-.04em;line-height:1.05}
.ows-ticket-meta{margin-top:6px;font-size:13.5px;color:var(--ows-muted)}
.ows-ticket-perf{position:relative;height:0;margin:0 14px;border-top:2px dashed color-mix(in srgb,var(--ows-mid) 30%,transparent)}
.ows-ticket-perf::before,.ows-ticket-perf::after{content:"";position:absolute;top:-11px;width:20px;height:20px;border-radius:50%;background:var(--ows-paper)}
.ows-ticket-perf::before{left:-36px}
.ows-ticket-perf::after{right:-36px}
.ows-ticket-bot{display:flex;flex-direction:column;gap:16px;padding:18px 22px 22px}
.ows-ticket-label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ows-muted)}
.ows-ticket-code{display:block;margin-top:2px;font-size:22px;font-weight:600;letter-spacing:.06em;font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:var(--ows-mid)}
.ows-ticket-actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px}

/* ---- footer ---- */
.ows-foot{position:relative;overflow:hidden;padding-top:44px;background:var(--ows-paper)}
.ows-foot-grid{display:grid;grid-template-columns:auto 1fr;gap:18px 32px;align-items:center}
.ows-brand--foot{font-size:20px}
.ows-foot-links{display:flex;flex-wrap:wrap;gap:6px 22px;justify-content:flex-end;font-size:14px}
.ows-foot-links a{color:var(--ows-muted);transition:color .2s}
.ows-foot-links a:hover{color:var(--ows-ink)}
.ows-foot-note{grid-column:1 / -1;font-size:12.5px;color:var(--ows-muted)}
.ows-foot-word{margin-top:20px;text-align:center;font-size:clamp(90px,23vw,330px);font-weight:600;letter-spacing:-.065em;line-height:.74;color:transparent;background:linear-gradient(180deg,var(--ows-mid) 0%,var(--ows-light) 70%,var(--ows-paper) 100%);-webkit-background-clip:text;background-clip:text;user-select:none;padding-bottom:.02em}

/* ---- reveal ---- */
.ows-rise{transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.ows-rise.ows-pre{opacity:0;transform:translateY(22px)}

/* ---- small screens ---- */
@media (max-width:900px){
.ows-features{grid-template-columns:1fr;gap:34px}
.ows-feature{display:grid;grid-template-columns:64px 1fr;column-gap:18px;max-width:none}
.ows-feature-mark{grid-row:span 2;width:64px;height:64px;margin:0}
.ows-feature-mark .ows-mark{width:64px;height:64px}
.ows-speakers{grid-template-columns:repeat(2,minmax(0,1fr))}
.ows-venue{grid-template-columns:1fr}
.ows-band-grid{grid-template-columns:1fr}
.ows-row-more .ows-row-inner{padding-left:4px}
}
@media (max-width:640px){
.ows-nav{grid-template-columns:auto 1fr}
.ows-when{display:none}
.ows-row-btn{grid-template-columns:minmax(0,1fr) 14px;gap:6px 12px}
.ows-row-time{grid-column:1 / -1;flex-direction:row;gap:8px;align-items:baseline}
.ows-tag{display:none}
.ows-sec-head{align-items:flex-start}
.ows-count-cell{min-width:0;flex:1}
.ows-foot-grid{grid-template-columns:1fr}
.ows-foot-links{justify-content:flex-start}
.ows-pin-label{display:none}
}

/* ---- reduced motion ---- */
@media (prefers-reduced-motion:reduce){
.ows-root *,.ows-root *::before,.ows-root *::after{animation:none !important;transition:none !important}
.ows-rise.ows-pre{opacity:1;transform:none}
.ows-hero{cursor:auto}
}
`

// Generic types live down here, after the JSX: the 21st CLI's tokenizer reads
// a `<` before the first tag as the start of one.
export type OwsPaletteInput = Partial<OwsPalette>
type FieldErrors = Partial<Record<keyof OwsRegistration, string>>
type PointerEv = React.PointerEvent<HTMLElement>
type AnchorEv = React.MouseEvent<HTMLElement>
type ChangeEv = React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
