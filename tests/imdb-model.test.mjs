import { test } from "node:test"
import assert from "node:assert/strict"
import { loadJsModule } from "./helpers/load-js-module.mjs"
const I = await loadJsModule("ImdbModel.js")

const RESPONSE = JSON.stringify({
  d: [
    { id: "tt1375666", l: "Inception", q: "feature", qid: "movie", s: "Leonardo DiCaprio, Joseph Gordon-Levitt", tl: "2010", y: 2010 },
    { id: "nm0000158", l: "Tom Hanks", s: "Producer, Cast Away (2000)", rank: 199 },
    { id: "/family-entertainment-guide/", l: "Halloween Family Fun", s: "Halloween movies" },
    { id: "tt9999999", l: "No Year", qid: "movie" }
  ]
})

test("imdb claims only the prefix with a query", () => {
  assert.equal(I.claims("imdb inception"), true)
  assert.equal(I.claims("imdb: inception"), true)
  assert.equal(I.claims("imdb titles inception"), true)
  assert.equal(I.claims("imdb"), false)
  assert.equal(I.claims("imdbx inception"), false)
})

test("imdb parses the optional titles-only form", () => {
  assert.deepEqual(I.parse("imdb inception"), { term: "inception", titlesOnly: false })
  assert.deepEqual(I.parse("imdb: inception"), { term: "inception", titlesOnly: false })
  assert.deepEqual(I.parse("imdb titles inception"), { term: "inception", titlesOnly: true })
  assert.deepEqual(I.parse("imdb title inception"), { term: "inception", titlesOnly: true })
})

test("imdb builds the suggestion URL for all entries or titles only", () => {
  assert.equal(I.apiUrl("tom hanks", false),
    "https://v3.sg.media-imdb.com/suggestion/x/tom%20hanks.json?includeVideos=0")
  assert.equal(I.apiUrl("inception", true),
    "https://v3.sg.media-imdb.com/suggestion/titles/x/inception.json?includeVideos=0")
})

test("imdb filters to tt/nm ids and formats titles and names", () => {
  const rows = I.rowsFor("imdb inception", 0, RESPONSE)
  assert.deepEqual(rows.map(r => r.label), ["Inception (2010)", "Tom Hanks", "No Year"])
  assert.equal(rows[0].value, "https://www.imdb.com/title/tt1375666/")
  assert.equal(rows[0].detail, "Leonardo DiCaprio, Joseph Gordon-Levitt")
  assert.equal(rows[1].value, "https://www.imdb.com/name/nm0000158/")
  assert.equal(rows[1].detail, "Producer, Cast Away (2000)")
  assert.equal(rows[2].value, "https://www.imdb.com/title/tt9999999/")
})

test("imdb reports empty and failed responses as visible rows", () => {
  assert.equal(I.rowsFor("imdb x", 0, JSON.stringify({ d: [] }))[0].label, "No IMDb results")
  assert.equal(I.rowsFor("imdb x", 7, "")[0].label, "IMDb search failed")
  assert.equal(I.rowsFor("imdb x", 0, "not json")[0].label, "IMDb search failed")
})

test("imdb opens the page, or copies it with Shift", () => {
  assert.deepEqual(I.openArgv("https://www.imdb.com/title/tt1/"), ["xdg-open", "https://www.imdb.com/title/tt1/"])
  assert.deepEqual(I.copyArgv("https://www.imdb.com/title/tt1/"), ["wl-copy", "--", "https://www.imdb.com/title/tt1/"])
  assert.deepEqual(I.openArgv(""), [])
})
