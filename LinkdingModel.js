// Linkding bookmarks API. Configuration lives in omarunner.json:
//   "linkding": { "url": "https://linkding.example.com", "apiKey": "…" }
// "ld query" / "linkding query" searches; bare "ld" lists the newest bookmarks.

function trim(value) { return String(value || "").trim() }

function parse(query) {
  var q = trim(query)
  if (/^(?:ld|linkding)$/i.test(q)) return { term: "" }
  var m = /^(?:ld|linkding)(?:\s+|:)\s*([\s\S]*)$/i.exec(q)
  if (!m) return null
  return { term: trim(m[1]) }
}

function claims(query) { return parse(query) !== null }

function instanceUrl(instance) {
  var base = trim(instance).replace(/\/+$/, "")
  if (!/^https?:\/\//i.test(base)) base = "https://" + base
  return base
}

function apiUrl(instance, term) {
  var base = instanceUrl(instance)
  var query = term ? "?q=" + encodeURIComponent(term) + "&limit=20" : "?limit=20"
  return base + "/api/bookmarks/" + query
}

function curlArgs(url, apiKey) {
  return ["curl", "-fsS", "--proto", "=http,https", "--max-time", "10",
    "--compressed", "-H", "Accept: application/json",
    "-H", "Authorization: Token " + String(apiKey || ""), url]
}

function host(url) {
  var m = /^https?:\/\/([^/?#]+)/i.exec(String(url || ""))
  return m ? m[1] : ""
}

function shorten(text, width) {
  var value = String(text || "").replace(/\s+/g, " ").trim()
  return value.length > width ? value.slice(0, width - 1) + "…" : value
}

function row(label, detail, value, icon) {
  return {
    itemId: "linkding.result", kind: "source", icon: icon || "bookmarks",
    iconFont: "", appIcon: "", appId: "", label: String(label), target: "",
    detail: String(detail), path: "", childCount: 0, action: "", provider: "",
    score: 0, section: "", sourceId: "linkding", value: String(value)
  }
}

function errorRow(message) { return row("Linkding request failed", message, "") }
function noteRow() { return row("No Linkding bookmarks", "Try a different query or #tag", "") }
function configRow() {
  return row("Linkding not configured",
    "Set linkding.url and linkding.apiKey in ~/.config/omarchy/omarunner.json", "")
}

function rowsFor(query, exitCode, output) {
  if (exitCode !== 0) return [errorRow("curl exited with code " + exitCode)]
  var parsed = parse(query)
  if (!parsed) return []

  var data
  try { data = JSON.parse(String(output || "")) } catch (e) { return [errorRow("Linkding returned invalid JSON")] }
  var results = data && data.results
  if (!results || typeof results.length !== "number") return [errorRow("Linkding returned an unexpected response")]

  var rows = []
  for (var i = 0; i < results.length && rows.length < 20; i++) {
    var entry = results[i] || {}
    var url = String(entry.url || "")
    if (!url) continue
    var label = String(entry.title || entry.website_title || url)
    var tags = (entry.tag_names && entry.tag_names.length) ? entry.tag_names.join(" · ") : ""
    var detail = host(url)
    if (tags) detail += " · #" + tags
    if (entry.description) detail += " · " + shorten(entry.description, 70)
    rows.push(row(label, detail, url))
  }

  return rows.length > 0 ? rows : [noteRow()]
}

function openArgv(url) { return url ? ["xdg-open", String(url)] : [] }
function copyArgv(value) { return value ? ["wl-copy", "--", String(value)] : [] }

if (typeof module !== "undefined") {
  module.exports = {
    parse: parse, claims: claims, instanceUrl: instanceUrl, apiUrl: apiUrl,
    curlArgs: curlArgs, rowsFor: rowsFor, configRow: configRow,
    openArgv: openArgv, copyArgv: copyArgv
  }
}
