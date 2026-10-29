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

test("imdb claims only the imdb prefix with a query", () => {
  assert.equal(I.claims("imdb inception"), true)
  assert.equal(I.claims("imdb: inception"), true)
  assert.equal(I.claims("imdb"), false)
  assert.equal(I.claims("imdbx inception"), false)
})

test("imdb parses the query after the prefix", () => {
  assert.deepEqual(I.parse("imdb inception"), { term: "inception" })
  assert.deepEqual(I.parse("imdb: inception"), { term: "inception" })
  assert.deepEqual(I.parse("imdb titles inception"), { term: "titles inception" })
})

test("imdb builds the suggestion URL", () => {
  assert.equal(I.apiUrl("tom hanks"),
    "https://v3.sg.media-imdb.com/suggestion/x/tom%20hanks.json?includeVideos=0")
})

test("imdb filters to tt/nm ids and puts titles before people", () => {
  const rows = I.rowsFor("imdb inception", 0, RESPONSE)
  assert.deepEqual(rows.map(r => r.label), ["Inception (2010)", "No Year", "Tom Hanks"])
  assert.deepEqual(rows.map(r => r.groupKey), ["titles", "titles", "people"])
  assert.deepEqual(rows.map(r => r.groupLabel), ["Movies & Series", "Movies & Series", "People"])
  assert.equal(rows[0].value, "https://www.imdb.com/title/tt1375666/")
  assert.equal(rows[0].detail, "Leonardo DiCaprio, Joseph Gordon-Levitt")
  assert.equal(rows[2].value, "https://www.imdb.com/name/nm0000158/")
  assert.equal(rows[2].detail, "Producer, Cast Away (2000)")
})

test("imdb reorders an actor-first API response into titles then people", () => {
  const actorFirst = JSON.stringify({ d: [
    { id: "nm0000158", l: "Tom Hanks", s: "Actor" },
    { id: "tt1375666", l: "Inception", qid: "movie", tl: "2010" }
  ] })
  const rows = I.rowsFor("imdb tom hanks", 0, actorFirst)
  assert.deepEqual(rows.map(r => r.label), ["Inception (2010)", "Tom Hanks"])
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
