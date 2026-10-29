// Chromium-family browser bookmarks and history.
// "bm query" searches bookmarks; "bh query" searches history. Both read the
// browser profile read-only through jq/sqlite3; the history DB is copied to a
// temp file first so an open browser does not lock it.

function trim(value) { return String(value || "").trim() }

function parse(query) {
  var q = trim(query)
  if (/^(?:bm|bookmarks?)$/i.test(q)) return { kind: "bookmarks", term: "" }
  if (/^(?:bh|bhistory)$/i.test(q)) return { kind: "history", term: "" }
  var m = /^(?:bm|bookmarks?)(?:\s+|:)\s*([\s\S]*)$/i.exec(q)
  if (m) return { kind: "bookmarks", term: trim(m[1]) }
  m = /^(?:bh|bhistory)(?:\s+|:)\s*([\s\S]*)$/i.exec(q)
  if (m) return { kind: "history", term: trim(m[1]) }
  return null
}

function claims(query) { return parse(query) !== null }

function bookmarksArgs() {
  return ["bash", "-lc",
    'for p in "$HOME/.config/chromium/Default/Bookmarks" "$HOME/.config/google-chrome/Default/Bookmarks" ' +
    '"$HOME/.config/BraveSoftware/Brave-Browser/Default/Bookmarks" "$HOME/.config/microsoft-edge/Default/Bookmarks"; do ' +
    '[ -f "$p" ] || continue; ' +
    'jq -r \'.. | objects | select(.type? == "url") | [.name, .url] | @tsv\' "$p" && exit 0; done; exit 1']
}

function historyArgs() {
  return ["bash", "-lc",
    'for p in "$HOME/.config/chromium/Default/History" "$HOME/.config/google-chrome/Default/History" ' +
    '"$HOME/.config/BraveSoftware/Brave-Browser/Default/History" "$HOME/.config/microsoft-edge/Default/History"; do ' +
    '[ -f "$p" ] || continue; ' +
    'tmp=$(mktemp "${TMPDIR:-/tmp}/omarunner-history.XXXXXX") || continue; ' +
    'cp -- "$p" "$tmp" 2>/dev/null || { rm -f -- "$tmp"; continue; }; ' +
    'sqlite3 -separator $\'\\t\' "$tmp" \'SELECT title,url FROM urls ORDER BY last_visit_time DESC LIMIT 500;\' ' +
    '&& { rm -f -- "$tmp"; exit 0; }; rm -f -- "$tmp"; done; exit 1']
}

function host(url) {
  var m = /^https?:\/\/([^/?#]+)/i.exec(String(url || ""))
  return m ? m[1] : ""
}

function parseTsv(output) {
  var lines = String(output || "").split("\n")
  var entries = []
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (!line) continue
    var tab = line.indexOf("\t")
    var title = tab >= 0 ? line.slice(0, tab) : ""
    var url = tab >= 0 ? line.slice(tab + 1) : ""
    if (!url || !/^https?:\/\//i.test(url)) continue
    entries.push({ title: title, url: url })
  }
  return entries
}

function row(label, detail, value, icon, groupKey, groupLabel) {
  return {
    itemId: "browser." + groupKey + "." + value, kind: "source", icon: icon,
    iconFont: "", appIcon: "", appId: "", label: String(label), target: "",
    detail: String(detail), path: "", childCount: 0, action: "", provider: "",
    score: 0, section: "", sourceId: "browser", value: String(value),
    groupKey: groupKey, groupLabel: groupLabel
  }
}

function messageRow(label, detail, groupKey, groupLabel) {
  return row(label, detail, "", "bookmarks", groupKey, groupLabel)
}

function rowsFor(query, exitCode, output) {
  var parsed = parse(query)
  if (!parsed) return []
  var groupLabel = parsed.kind === "bookmarks" ? "Bookmarks" : "History"
  if (exitCode !== 0) return [messageRow("No browser data found",
    "No Chromium/Chrome/Brave/Edge profile found", parsed.kind, groupLabel)]

  var terms = parsed.term.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 0 })
  var entries = parseTsv(output)
  var seen = ({})
  var rows = []
  for (var i = 0; i < entries.length && rows.length < 20; i++) {
    var entry = entries[i]
    if (seen[entry.url]) continue
    var text = (entry.title + " " + entry.url).toLowerCase()
    var match = true
    for (var t = 0; t < terms.length; t++) if (text.indexOf(terms[t]) < 0) { match = false; break }
    if (!match) continue
    seen[entry.url] = true
    var label = entry.title || entry.url
    var detail = host(entry.url) || entry.url
    rows.push(row(label, detail, entry.url,
      parsed.kind === "bookmarks" ? "bookmarks" : "view-history", parsed.kind, groupLabel))
  }
  return rows.length > 0 ? rows : [messageRow(
    parsed.kind === "bookmarks" ? "No bookmarks found" : "No history found",
    "Try another query", parsed.kind, groupLabel)]
}

function openArgv(url) { return url ? ["xdg-open", String(url)] : [] }
function copyArgv(value) { return value ? ["wl-copy", "--", String(value)] : [] }

if (typeof module !== "undefined") {
  module.exports = {
    parse: parse, claims: claims, bookmarksArgs: bookmarksArgs, historyArgs: historyArgs,
    parseTsv: parseTsv, rowsFor: rowsFor, openArgv: openArgv, copyArgv: copyArgv
  }
}
