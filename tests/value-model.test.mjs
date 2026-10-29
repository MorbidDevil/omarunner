import { test } from "node:test"
import assert from "node:assert/strict"
import { loadJsModule } from "./helpers/load-js-module.mjs"
const V = await loadJsModule("ValueModel.js")

const NOW = Date.UTC(2026, 9, 29, 14, 32, 7)
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const UUID7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test("values claims its keywords and rejects lookalikes", () => {
  for (const q of ["uuid", "uuid4", "uuid7", "guid", "b64 hello", "base64 hello",
    "b64d aGVsbG8=", "sha256 hello", "md5 hello", "hex 16", "pw 24",
    "rand", "rand 1 6", "lorem", "lorem 3"]) {
    assert.equal(V.claims(q), true, q)
  }
  for (const q of ["uuidx", "hexish", "password", "sha256", "b64", "randx"]) {
    assert.equal(V.claims(q), false, q)
  }
})

test("uuid offers v4 and v7; specific versions offer one", () => {
  const both = V.rowsFor("uuid", NOW)
  assert.equal(both.length, 2)
  assert.match(both[0].value, UUID4)
  assert.match(both[1].value, UUID7)
  assert.match(V.rowsFor("uuid4", NOW)[0].value, UUID4)
  assert.match(V.rowsFor("uuid7", NOW)[0].value, UUID7)
  assert.match(V.rowsFor("guid", NOW)[0].value, UUID4)
})

test("uuid v7 starts with the current millisecond timestamp", () => {
  const value = V.rowsFor("uuid7", NOW)[0].value.replace(/-/g, "")
  assert.equal(value.slice(0, 12), Math.floor(NOW).toString(16).padStart(12, "0"))
})

test("Base64 round-trips ASCII and Unicode", () => {
  assert.equal(V.encodeBase64("hello"), "aGVsbG8=")
  assert.equal(V.decodeBase64("aGVsbG8="), "hello")
  assert.equal(V.encodeBase64("Grüße"), "R3LDvMOfZQ==")
  assert.equal(V.decodeBase64("R3LDvMOfZQ=="), "Grüße")
  const row = V.rowsFor("b64 hello")[0]
  assert.equal(row.label, "aGVsbG8=")
  assert.equal(row.value, "aGVsbG8=")
})

test("invalid Base64 becomes a visible error row", () => {
  const row = V.rowsFor("b64d !!!")[0]
  assert.equal(row.label, "Invalid input")
  assert.equal(row.value, "")
})

test("hashes are parsed from the helper's stdout", () => {
  const sha = V.hashRows("sha256 hello", 0,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -\n")[0]
  assert.equal(sha.value, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
  assert.match(sha.detail, /^SHA-256 of “hello”$/)
  assert.equal(V.hashArgs("sha256")[0], "sha256sum")
  assert.equal(V.hashArgs("md5")[0], "md5sum")
  assert.equal(V.hashRows("sha256 hello", 1, "")[0].label, "Invalid input")
})

test("random values respect the requested sizes and ranges", () => {
  const hex = V.rowsFor("hex 8")[0].value
  assert.equal(hex.length, 8)
  assert.match(hex, /^[0-9a-f]+$/)
  const pw = V.rowsFor("pw 24")[0].value
  assert.equal(pw.length, 24)
  assert.match(pw, /^[A-Za-z0-9!@#$%^&*()\-_=+]+$/)
  for (let i = 0; i < 20; i++) {
    const n = Number(V.rowsFor("rand 1 6")[0].value)
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 6)
  }
})

test("lorem returns the requested number of sentences", () => {
  const one = V.rowsFor("lorem")[0]
  assert.match(one.value, /^Lorem ipsum/)
  const two = V.rowsFor("lorem 2")[0]
  assert.equal((two.value.match(/\./g) || []).length, 2)
})

test("Enter copies the generated value", () => {
  assert.deepEqual(V.copyArgv("abc"), ["wl-copy", "--", "abc"])
  assert.deepEqual(V.copyArgv(""), [])
})
