import { test } from "node:test"
import assert from "node:assert/strict"
import { loadJsModule } from "./helpers/load-js-module.mjs"
const L = await loadJsModule("LinkdingModel.js")

const RESPONSE = JSON.stringify({
  count: 2,
  results: [
    { url: "https://example.com/a", title: "Example A", description: "A useful page",
      tag_names: ["rust", "web"] },
    { url: "https://foo.bar/b", website_title: "Foo site", tag_names: [] },
    { url: "", title: "Ignored", tag_names: [] }
  ]
})

test("linkding claims its keywords, bare or with a query", () => {
  for (const q of ["ld", "ld rust", "linkding", "linkding rust", "linkding: rust"]) {
    assert.equal(L.claims(q), true, q)
  }
  for (const q of ["ldx", "linkdingx", "l d"]) assert.equal(L.claims(q), false, q)
})

test("linkding parses the search term", () => {
  assert.deepEqual(L.parse("ld rust"), { term: "rust" })
  assert.deepEqual(L.parse("ld: rust"), { term: "rust" })
  assert.deepEqual(L.parse("ld"), { term: "" })
})

test("the instance URL gets a scheme and no trailing slash", () => {
  assert.equal(L.instanceUrl("linkding.example.com/"), "https://linkding.example.com")
  assert.equal(L.instanceUrl("http://localhost:9090/"), "http://localhost:9090")
})

test("the API URL encodes the query and asks for 20 rows", () => {
  assert.equal(L.apiUrl("https://ld.example", "rust lang"),
    "https://ld.example/api/bookmarks/?q=rust%20lang&limit=20")
  assert.equal(L.apiUrl("https://ld.example", ""),
    "https://ld.example/api/bookmarks/?limit=20")
})

test("bookmarks become rows with host, tags and description", () => {
  const rows = L.rowsFor("ld", 0, RESPONSE)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].label, "Example A")
  assert.equal(rows[0].value, "https://example.com/a")
  assert.equal(rows[0].detail, "example.com · #rust · web · A useful page")
  assert.equal(rows[1].label, "Foo site")
  assert.equal(rows[1].detail, "foo.bar")
})

test("empty and failed responses become visible rows", () => {
  assert.equal(L.rowsFor("ld", 0, JSON.stringify({ results: [] }))[0].label, "No Linkding bookmarks")
  assert.equal(L.rowsFor("ld", 4, "")[0].label, "Linkding request failed")
  assert.equal(L.rowsFor("ld", 0, "not json")[0].label, "Linkding request failed")
})

test("missing configuration is explained in the launcher", () => {
  const row = L.configRow()
  assert.equal(row.label, "Linkding not configured")
  assert.match(row.detail, /linkding\.url/)
})

test("requests send the token header and opening is xdg-open", () => {
  const args = L.curlArgs("https://ld.example/api/bookmarks/", "secret")
  assert.equal(args[0], "curl")
  assert.ok(args.includes("Authorization: Token secret"))
  assert.deepEqual(L.openArgv("https://example.com"), ["xdg-open", "https://example.com"])
  assert.deepEqual(L.copyArgv("https://example.com"), ["wl-copy", "--", "https://example.com"])
})
