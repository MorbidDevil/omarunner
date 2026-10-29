// systemd service source: "svc name" / "service name" / "unit name".
// Enter starts an inactive unit or restarts an active one; Shift+Enter stops.
// Everything runs through systemctl's argv, never a shell string.

function trim(value) { return String(value || "").trim() }

function parse(query) {
  var q = trim(query)
  if (/^(?:svc|service|unit)$/i.test(q)) return { term: "" }
  var m = /^(?:svc|service|unit)(?:\s+|:)\s*([\s\S]*)$/i.exec(q)
  if (!m) return null
  return { term: trim(m[1]) }
}

function claims(query) { return parse(query) !== null }

function listArgs() {
  return ["systemctl", "list-units", "--type=service", "--all", "--no-legend", "--no-pager", "--plain"]
}

function parseOutput(output) {
  var lines = String(output || "").split("\n")
  var units = []
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) continue
    var parts = line.split(/\s+/)
    var unit = parts[0] || ""
    if (unit.indexOf(".service") < 0) continue
    units.push({
      unit: unit,
      load: parts[1] || "",
      active: parts[2] || "",
      sub: parts[3] || "",
      description: parts.slice(4).join(" ")
    })
  }
  return units
}

function matches(units, term) {
  var terms = trim(term).toLowerCase().split(/\s+/).filter(function(t) { return t.length > 0 })
  var out = []
  for (var i = 0; i < units.length && out.length < 20; i++) {
    var text = (units[i].unit + " " + units[i].description).toLowerCase()
    var match = true
    for (var t = 0; t < terms.length; t++) if (text.indexOf(terms[t]) < 0) { match = false; break }
    if (match) out.push(units[i])
  }
  return out
}

function actionSpec(unit, active) {
  return (active === "active" ? "restart:" : "start:") + unit
}

function splitAction(value) {
  var text = String(value || "")
  var at = text.indexOf(":")
  return at > 0 ? { action: text.slice(0, at), unit: text.slice(at + 1) } : { action: "", unit: text }
}

function argvFor(value, shift) {
  var spec = splitAction(value)
  var action = shift ? "stop" : spec.action
  if (["start", "restart", "stop"].indexOf(action) < 0) return []
  if (!/^[A-Za-z0-9_.@:-]+\.service$/.test(spec.unit)) return []
  return ["systemctl", action, spec.unit]
}

function row(unit) {
  return {
    itemId: "services." + unit.unit, kind: "source", icon: "system-run", iconFont: "",
    appIcon: "", appId: "", label: unit.unit, target: "",
    detail: unit.active + (unit.sub ? " (" + unit.sub + ")" : "") + (unit.description ? " · " + unit.description : ""),
    path: "", childCount: 0, action: "", provider: "", score: 0, section: "",
    sourceId: "services", value: actionSpec(unit.unit, unit.active)
  }
}

function messageRow(label, detail) {
  return {
    itemId: "services.message", kind: "source", icon: "system-run", iconFont: "",
    appIcon: "", appId: "", label: label, target: "", detail: detail, path: "",
    childCount: 0, action: "", provider: "", score: 0, section: "",
    sourceId: "services", value: ""
  }
}
function errorRow(message) { return messageRow("systemd request failed", message) }
function noteRow() { return messageRow("No services found", "Try another name") }

function rowsFor(query, exitCode, output) {
  if (exitCode !== 0) return [errorRow("systemctl exited with code " + exitCode)]
  var parsed = parse(query)
  if (!parsed) return []
  var units = matches(parseOutput(output), parsed.term)
  return units.length > 0 ? units.map(row) : [noteRow()]
}

if (typeof module !== "undefined") {
  module.exports = {
    parse: parse, claims: claims, listArgs: listArgs, parseOutput: parseOutput,
    matches: matches, actionSpec: actionSpec, splitAction: splitAction, argvFor: argvFor, rowsFor: rowsFor
  }
}
