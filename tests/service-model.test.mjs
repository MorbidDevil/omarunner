import { test } from "node:test"
import assert from "node:assert/strict"
import { loadJsModule } from "./helpers/load-js-module.mjs"
const S = await loadJsModule("ServiceModel.js")

const OUTPUT = [
  "foo.service loaded active running Foo daemon",
  "bar.service loaded inactive dead Bar helper",
  "baz.service loaded failed failed Baz worker",
  "not-a-service loaded active running ignored"
].join("\n") + "\n"

test("services claim svc, service and unit", () => {
  for (const q of ["svc", "svc foo", "service foo", "service: foo", "unit foo"]) assert.equal(S.claims(q), true, q)
  for (const q of ["svcfoo", "unitx foo", "services"]) assert.equal(S.claims(q), false, q)
  assert.deepEqual(S.parse("svc foo"), { term: "foo" })
  assert.deepEqual(S.parse("svc"), { term: "" })
})

test("parseOutput keeps service units and their state", () => {
  const units = S.parseOutput(OUTPUT)
  assert.deepEqual(units.map(u => u.unit), ["foo.service", "bar.service", "baz.service"])
  assert.equal(units[0].active, "active")
  assert.equal(units[0].sub, "running")
  assert.equal(units[1].description, "Bar helper")
})

test("matches searches unit names and descriptions", () => {
  const units = S.parseOutput(OUTPUT)
  assert.deepEqual(S.matches(units, "foo").map(u => u.unit), ["foo.service"])
  assert.deepEqual(S.matches(units, "helper").map(u => u.unit), ["bar.service"])
  assert.deepEqual(S.matches(units, "baz worker").map(u => u.unit), ["baz.service"])
  assert.deepEqual(S.matches(units, "zzz"), [])
})

test("Enter starts or restarts; Shift stops; only valid units become argv", () => {
  assert.equal(S.actionSpec("foo.service", "active"), "restart:foo.service")
  assert.equal(S.actionSpec("bar.service", "inactive"), "start:bar.service")
  assert.deepEqual(S.splitAction("restart:foo.service"), { action: "restart", unit: "foo.service" })
  assert.deepEqual(S.argvFor("restart:foo.service", false), ["systemctl", "restart", "foo.service"])
  assert.deepEqual(S.argvFor("start:bar.service", false), ["systemctl", "start", "bar.service"])
  assert.deepEqual(S.argvFor("restart:foo.service", true), ["systemctl", "stop", "foo.service"])
  for (const bad of ["restart:foo", "restart:foo.service; rm -rf /", "rm:foo.service", "start:"]) {
    assert.deepEqual(S.argvFor(bad, false), [], bad)
  }
})

test("rowsFor maps matches and reports empty/error responses", () => {
  const rows = S.rowsFor("svc foo", 0, OUTPUT)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].label, "foo.service")
  assert.equal(rows[0].detail, "active (running) · Foo daemon")
  assert.equal(rows[0].value, "restart:foo.service")
  assert.equal(S.rowsFor("svc zzz", 0, OUTPUT)[0].label, "No services found")
  assert.equal(S.rowsFor("svc foo", 1, "")[0].label, "systemd request failed")
})
