// IMDb suggestion API, mirroring PowerToys-Run-ImdbSearch: filter to title
// (tt…) and name (nm…) ids, show the title with its year/type, and open the
// matching IMDb page. "imdb titles …" searches titles only.

function trim(value) { return String(value || "").trim() }

function parse(query) {
  var q = trim(query)
  var m = /^imdb(?:\s+|:)\s*([\s\S]+)$/i.exec(q)
  if (!m) return null
  var term = trim(m[1])
  var titlesOnly = false
  var t = /^(?:t|title|titles)\s+([\s\S]+)$/i.exec(term)
  if (t) {
    titlesOnly = true
    term = trim(t[1])
  }
  if (!term) return null
  return { term: term, titlesOnly: titlesOnly }
}

function claims(query) { return parse(query) !== null }

function apiUrl(term, titlesOnly) {
  var base = titlesOnly
    ? "https://v3.sg.media-imdb.com/suggestion/titles/x/"
    : "https://v3.sg.media-imdb.com/suggestion/x/"
  return base + encodeURIComponent(String(term || "")) + ".json?includeVideos=0"
}

function curlArgs(url) {
  return ["curl", "-fsS", "--proto", "=https", "--max-time", "10",
    "--compressed", "-H", "Accept: application/json", url]
}

function row(label, detail, value, icon) {
  return {
    itemId: "imdb.result", kind: "source", icon: icon || "video-x-generic",
    iconFont: "", appIcon: "", appId: "", label: String(label), target: "",
    detail: String(detail), path: "", childCount: 0, action: "", provider: "",
    score: 0, section: "", sourceId: "imdb", value: String(value)
  }
}

function errorRow(message) { return row("IMDb search failed", message, "") }
function noteRow() { return row("No IMDb results", "Try a different title or name", "") }

function rowsFor(query, exitCode, output) {
  if (exitCode !== 0) return [errorRow("curl exited with code " + exitCode)]
  var parsed = parse(query)
  if (!parsed) return []

  var data
  try { data = JSON.parse(String(output || "")) } catch (e) { return [errorRow("IMDb returned invalid JSON")] }
  var list = data && data.d
  if (!list || typeof list.length !== "number") return [errorRow("IMDb returned an unexpected response")]

  var rows = []
  for (var i = 0; i < list.length && rows.length < 10; i++) {
    var entry = list[i] || {}
    var id = String(entry.id || "")
    if (id.indexOf("tt") !== 0 && id.indexOf("nm") !== 0) continue

    var isActor = id.indexOf("nm") === 0
    var title = String(entry.l || id)
    var years = String(entry.tl || entry.yr || entry.y || "")
    var label = isActor ? title : (years ? title + " (" + years + ")" : title)
    var detail = String(entry.s || entry.q || (isActor ? "IMDb name" : "IMDb title"))
    var url = isActor
      ? "https://www.imdb.com/name/" + id + "/"
      : "https://www.imdb.com/title/" + id + "/"
    rows.push(row(label, detail, url, isActor ? "user-identity" : "video-x-generic"))
  }

  return rows.length > 0 ? rows : [noteRow()]
}

function openArgv(url) { return url ? ["xdg-open", String(url)] : [] }
function copyArgv(value) { return value ? ["wl-copy", "--", String(value)] : [] }

if (typeof module !== "undefined") {
  module.exports = {
    parse: parse, claims: claims, apiUrl: apiUrl, curlArgs: curlArgs,
    rowsFor: rowsFor, openArgv: openArgv, copyArgv: copyArgv
  }
}
