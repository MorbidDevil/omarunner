import { test } from "node:test"
import assert from "node:assert/strict"
import { loadJsModule } from "./helpers/load-js-module.mjs"
const T = await loadJsModule("TimeModel.js")

const NOW = Date.UTC(2026, 9, 29, 14, 32, 7) // Thursday, 29 October 2026 14:32:07 UTC

test("time claims its keywords and offset forms, not lookalikes", () => {
  for (const q of ["t", "t utc", "t utc+2", "t +2h", "t -30m", "time", "time utc",
    "date", "date utc", "now", "ts", "unix", "week"]) {
    assert.equal(T.claims(q), true, q)
  }
  for (const q of ["taco", "time warp", "t nope", "uuid", "datex"]) {
    assert.equal(T.claims(q), false, q)
  }
})

test("t shows local time and date, with ISO week in the date row", () => {
  const rows = T.rowsFor("t utc", NOW)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].label, "14:32:07")
  assert.equal(rows[0].value, "14:32:07")
  assert.equal(rows[0].detail, "UTC · Thursday, 29 October 2026")
  assert.equal(rows[1].label, "Thursday, 29 October 2026")
  assert.equal(rows[1].value, "2026-10-29")
  assert.equal(rows[1].detail, "2026-10-29 · ISO week 44")
})

test("time and date return only their own row", () => {
  assert.deepEqual(T.rowsFor("time utc", NOW).map(r => r.label), ["14:32:07"])
  assert.deepEqual(T.rowsFor("date utc", NOW).map(r => r.value), ["2026-10-29"])
})

test("timestamps and ISO weeks are copyable values", () => {
  const ts = T.rowsFor("ts", NOW)[0]
  assert.equal(ts.value, String(Math.floor(NOW / 1000)))
  assert.match(ts.detail, /^Unix timestamp · 2026-10-29T14:32:07\.000Z$/)
  const week = T.rowsFor("week", NOW)[0]
  assert.equal(week.value, "2026-W44")
  assert.equal(week.label, "2026-W44")
})

const localClock = (ms) => {
  const d = new Date(ms)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, "0")).join(":")
}

test("UTC offsets and relative shifts change the clock", () => {
  assert.equal(T.rowsFor("t utc+2", NOW)[0].label, "16:32:07")
  assert.match(T.rowsFor("t utc+2", NOW)[0].detail, /^UTC\+2 ·/)
  assert.equal(T.rowsFor("t utc-5", NOW)[0].label, "09:32:07")
  assert.equal(T.rowsFor("t +2h", NOW)[0].label, localClock(NOW + 2 * 3600000))
  assert.match(T.rowsFor("t +2h", NOW)[0].detail, /^In 2 hours ·/)
  assert.equal(T.rowsFor("t -30m", NOW)[0].label, localClock(NOW - 30 * 60000))
  assert.match(T.rowsFor("t -30m", NOW)[0].detail, /^30 minutes ago ·/)
})

test("named IANA zones and custom date formats are claimed", () => {
  for (const q of ["t Europe/Berlin", "date America/New_York", "t utc format %H:%M",
    "date Europe/Berlin format %Y-%m-%d", "t format %A"]) {
    assert.equal(T.claims(q), true, q)
  }
  for (const q of ["t Nope", "t format", "t Europe", "taco"]) assert.equal(T.claims(q), false, q)
  assert.equal(T.parse("t Europe/Berlin").zone.kind, "named")
  assert.equal(T.parse("t Europe/Berlin").zone.tz, "Europe/Berlin")
  assert.equal(T.parse("t time utc format %H").mode, "time")
  assert.equal(T.parse("date Europe/Berlin format %Y").format, "%Y")
})

test("named zones use date with TZ and a fixed field pattern", () => {
  const parsed = T.parse("t Europe/Berlin")
  assert.equal(T.needsDateProcess(parsed), true)
  const args = T.dateArgs(parsed, NOW)
  assert.deepEqual(args.slice(0, 3), ["env", "LC_ALL=C", "TZ=Europe/Berlin"])
  assert.equal(args[3], "date")
  assert.ok(args.includes("@" + Math.floor(NOW / 1000)))
  assert.ok(args[args.length - 1].indexOf("%Y-%m-%d") >= 0)
})

test("rowsFromDate formats named-zone time and custom formats", () => {
  const rows = T.rowsFromDate("t Europe/Berlin", 0,
    "2026-10-29|16:32:07|Thursday|October|2026|44")
  assert.deepEqual(rows.map(r => r.label), ["16:32:07", "Thursday, 29 October 2026"])
  assert.equal(rows[0].detail, "Europe/Berlin · Thursday, 29 October 2026")
  assert.equal(rows[1].value, "2026-10-29")
  assert.equal(rows[1].detail, "2026-10-29 · ISO week 44")

  const formatted = T.rowsFromDate("date Europe/Berlin format %Y-%m-%d %H:%M", 0, "2026-10-29 16:32")
  assert.equal(formatted.length, 1)
  assert.equal(formatted[0].label, "2026-10-29 16:32")
  assert.equal(formatted[0].detail, "Format · %Y-%m-%d %H:%M")
  assert.equal(formatted[0].value, "2026-10-29 16:32")
})

test("unknown zones and date failures become visible rows", () => {
  assert.equal(T.rowsFromDate("t Europe/Berlin", 1, "")[0].label, "Time zone not found")
  assert.equal(T.rowsFromDate("t Europe/Berlin", 0, "")[0].label, "Time zone not found")
  assert.deepEqual(T.rowsFor("t Europe/Berlin", NOW), [])
})

test("Enter copies the shown value", () => {
  assert.deepEqual(T.copyArgv("14:32:07"), ["wl-copy", "--", "14:32:07"])
  assert.deepEqual(T.copyArgv(""), [])
})
