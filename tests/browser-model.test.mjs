import { test } from "node:test"
import assert from "node:assert/strict"
import { loadJsModule } from "./helpers/load-js-module.mjs"
const B = await loadJsModule("BrowserModel.js")

const TSV = [
  "Rust language\thttps://www.rust-lang.org/",
  "Docs\thttps://doc.rust-lang.org/book/",
  "Rust language\thttps://www.rust-lang.org/",
  "bad\tchrome://settings"
].join("\n") + "\n"

test("browser claims bm/bookmarks and bh/bhistory", () => {
  for (const q of ["bm", "bm rust", "bookmark rust", "bookmarks rust", "bh", "bh rust", "bhistory rust"]) {
    assert.equal(B.claims(q), true, q)
  }
  for (const q of ["bmx", "bhx", "history rust"]) assert.equal(B.claims(q), false, q)
  assert.deepEqual(B.parse("bm rust"), { kind: "bookmarks", term: "rust" })
  assert.deepEqual(B.parse("bh"), { kind: "history", term: "" })
})

test("parseTsv keeps only http(s) URLs", () => {
  assert.deepEqual(B.parseTsv(TSV), [
    { title: "Rust language", url: "https://www.rust-lang.org/" },
    { title: "Docs", url: "https://doc.rust-lang.org/book/" },
    { title: "Rust language", url: "https://www.rust-lang.org/" }
  ])
})

test("bookmark rows are grouped and deduplicated", () => {
  const rows = B.rowsFor("bm rust", 0, TSV)
  assert.deepEqual(rows.map(r => r.label), ["Rust language", "Docs"])
  assert.deepEqual(rows.map(r => r.groupKey), ["bookmarks", "bookmarks"])
  assert.equal(rows[0].detail, "www.rust-lang.org")
  assert.equal(rows[0].value, "https://www.rust-lang.org/")
  assert.equal(rows[0].groupLabel, "Bookmarks")
})

test("history rows are grouped separately", () => {
  const rows = B.rowsFor("bh doc", 0, TSV)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].label, "Docs")
  assert.equal(rows[0].groupKey, "history")
  assert.equal(rows[0].groupLabel, "History")
})

test("empty and failed browser queries are visible rows", () => {
  assert.equal(B.rowsFor("bm zzz", 0, TSV)[0].label, "No bookmarks found")
  assert.equal(B.rowsFor("bh zzz", 0, TSV)[0].label, "No history found")
  assert.equal(B.rowsFor("bm rust", 1, "")[0].label, "No browser data found")
})

test("opening and copying use the URL", () => {
  assert.deepEqual(B.openArgv("https://example.com"), ["xdg-open", "https://example.com"])
  assert.deepEqual(B.copyArgv("https://example.com"), ["wl-copy", "--", "https://example.com"])
  assert.deepEqual(B.openArgv(""), [])
})
