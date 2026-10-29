// Value generator: UUIDs, Base64, hashes, random hex/passwords/numbers and
// lorem ipsum. Everything except hashing is synchronous; hashing is handed to
// ValueSource's process because QML's JS runtime has no crypto module.

var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
var LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
]

function trim(value) { return String(value || "").trim() }
function clampInt(value, fallback, min, max) {
  var n = parseInt(value, 10)
  if (!isFinite(n)) n = fallback
  return Math.max(min, Math.min(max, n))
}
function randomInt(max) { return Math.floor(Math.random() * max) }
function choose(chars) { return chars.charAt(randomInt(chars.length)) }
function padLeft(value, width) {
  var text = String(value)
  while (text.length < width) text = "0" + text
  return text
}
function randomHex(length) {
  var out = ""
  for (var i = 0; i < length; i++) out += "0123456789abcdef".charAt(randomInt(16))
  return out
}
function formatUuid(hex) {
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
    hex.slice(16, 20) + "-" + hex.slice(20)
}
function uuid4() {
  var hex = randomHex(32).split("")
  hex[12] = "4"
  hex[16] = "89ab".charAt(randomInt(4))
  return formatUuid(hex.join(""))
}
function uuid7(nowMs) {
  var time = padLeft(Math.floor(Number(nowMs) || Date.now()).toString(16), 12).slice(-12)
  var randA = randomHex(3)
  var variant = "89ab".charAt(randomInt(4))
  var randB = randomHex(15)
  return formatUuid(time + "7" + randA + variant + randB)
}

function utf8Bytes(text) {
  var bytes = []
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      var next = text.charCodeAt(++i)
      var point = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
      bytes.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

function base64FromBytes(bytes) {
  var out = ""
  for (var i = 0; i < bytes.length; i += 3) {
    var b1 = bytes[i]
    var b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
    var b3 = i + 2 < bytes.length ? bytes[i + 2] : 0
    var n = (b1 << 16) | (b2 << 8) | b3
    out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63)
    out += i + 1 < bytes.length ? B64.charAt((n >> 6) & 63) : "="
    out += i + 2 < bytes.length ? B64.charAt(n & 63) : "="
  }
  return out
}

function base64Index(ch) { return ch === "=" ? 0 : B64.indexOf(ch) }

function bytesFromBase64(text) {
  var value = String(text || "").replace(/\s+/g, "")
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return null
  if (value.length % 4 === 1) return null
  while (value.length % 4 !== 0) value += "="
  var bytes = []
  for (var i = 0; i < value.length; i += 4) {
    var a = base64Index(value.charAt(i))
    var b = base64Index(value.charAt(i + 1))
    var c = base64Index(value.charAt(i + 2))
    var d = base64Index(value.charAt(i + 3))
    if (a < 0 || b < 0 || c < 0 || d < 0) return null
    var n = (a << 18) | (b << 12) | (c << 6) | d
    bytes.push((n >> 16) & 255)
    if (value.charAt(i + 2) !== "=") bytes.push((n >> 8) & 255)
    if (value.charAt(i + 3) !== "=") bytes.push(n & 255)
  }
  return bytes
}

function textFromUtf8Bytes(bytes) {
  var out = ""
  for (var i = 0; i < bytes.length;) {
    var b = bytes[i++]
    if (b < 0x80) {
      out += String.fromCharCode(b)
    } else if ((b & 0xe0) === 0xc0) {
      if (i >= bytes.length) return null
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f))
    } else if ((b & 0xf0) === 0xe0) {
      if (i + 1 >= bytes.length) return null
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f))
    } else if ((b & 0xf8) === 0xf0) {
      if (i + 2 >= bytes.length) return null
      var point = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
      point -= 0x10000
      out += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff))
    } else {
      return null
    }
  }
  return out
}

function encodeBase64(text) { return base64FromBytes(utf8Bytes(String(text || ""))) }
function decodeBase64(text) {
  var bytes = bytesFromBase64(text)
  return bytes ? textFromUtf8Bytes(bytes) : null
}

function password(length) {
  var upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  var lower = "abcdefghijkmnopqrstuvwxyz"
  var digits = "23456789"
  var symbols = "!@#$%^&*()-_=+"
  var all = upper + lower + digits + symbols
  var chars = [choose(upper), choose(lower), choose(digits), choose(symbols)]
  while (chars.length < length) chars.push(choose(all))
  for (var i = chars.length - 1; i > 0; i--) {
    var j = randomInt(i + 1)
    var tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.join("")
}

function loremText(sentences) {
  var out = []
  for (var i = 0; i < sentences; i++) out.push(LOREM[i % LOREM.length])
  return out.join(" ")
}

function shorten(text, width) {
  var value = String(text || "").replace(/\s+/g, " ").trim()
  return value.length > width ? value.slice(0, width - 1) + "…" : value
}

function parse(query) {
  var q = trim(query)
  var m
  if (/^uuid$/i.test(q)) return { kind: "uuid", version: 0 }
  if (/^uuid4$/i.test(q)) return { kind: "uuid", version: 4 }
  if (/^uuid7$/i.test(q)) return { kind: "uuid", version: 7 }
  if (/^guid$/i.test(q)) return { kind: "uuid", version: 4 }

  if ((m = /^(?:b64|base64)\s+([\s\S]+)$/i.exec(q))) return { kind: "b64", text: m[1] }
  if ((m = /^(?:b64d|base64d)\s+(\S+)$/i.exec(q))) return { kind: "b64d", text: m[1] }
  if ((m = /^sha256\s+([\s\S]+)$/i.exec(q))) return { kind: "hash", algo: "sha256", text: m[1] }
  if ((m = /^md5\s+([\s\S]+)$/i.exec(q))) return { kind: "hash", algo: "md5", text: m[1] }
  if ((m = /^hex(?:\s+(\d+))?$/i.exec(q))) return { kind: "hex", length: clampInt(m[1], 32, 8, 256) }
  if ((m = /^pw(?:\s+(\d+))?$/i.exec(q))) return { kind: "pw", length: clampInt(m[1], 20, 8, 128) }
  if ((m = /^rand(?:\s+(\d+))?(?:\s+(\d+))?$/i.exec(q))) {
    var min = 1
    var max = 100
    if (m[1] && m[2]) {
      min = parseInt(m[1], 10)
      max = parseInt(m[2], 10)
    } else if (m[1]) {
      max = parseInt(m[1], 10)
    }
    if (!isFinite(min)) min = 1
    if (!isFinite(max)) max = 100
    if (min > max) { var swap = min; min = max; max = swap }
    return { kind: "rand", min: Math.max(-1000000000, min), max: Math.min(1000000000, max) }
  }
  if ((m = /^lorem(?:\s+(\d+))?$/i.exec(q))) return { kind: "lorem", sentences: clampInt(m[1], 1, 1, 6) }
  return null
}

function claims(query) { return parse(query) !== null }
function hashQuery(query) {
  var parsed = parse(query)
  return parsed && parsed.kind === "hash" ? parsed : null
}
function hashArgs(algo) { return [algo + "sum"] }
function hashName(algo) { return algo === "sha256" ? "SHA-256" : String(algo || "").toUpperCase() }

function row(label, detail, value, icon) {
  return {
    itemId: "values.result", kind: "source", icon: icon || "dialog-password",
    iconFont: "", appIcon: "", appId: "", label: String(label), target: "",
    detail: String(detail), path: "", childCount: 0, action: "", provider: "",
    score: 0, section: "", sourceId: "values", value: String(value)
  }
}

function errorRow(message) {
  return row("Invalid input", message, "")
}

function rowsFor(query, nowMs) {
  var parsed = parse(query)
  if (!parsed || parsed.kind === "hash") return []

  if (parsed.kind === "uuid") {
    var versions = parsed.version ? [parsed.version] : [4, 7]
    var rows = []
    for (var i = 0; i < versions.length; i++) {
      var value = versions[i] === 7 ? uuid7(nowMs) : uuid4()
      rows.push(row(value, versions[i] === 7 ? "UUID v7 · time-ordered" : "UUID v4 · random", value))
    }
    return rows
  }

  if (parsed.kind === "b64") {
    var encoded = encodeBase64(parsed.text)
    return [row(encoded, "Base64 of “" + shorten(parsed.text, 40) + "”", encoded, "text-x-generic")]
  }

  if (parsed.kind === "b64d") {
    var decoded = decodeBase64(parsed.text)
    if (decoded === null) return [errorRow("Base64 could not be decoded")]
    return [row(decoded, "Base64 decoded · " + shorten(parsed.text, 40), decoded, "text-x-generic")]
  }

  if (parsed.kind === "hex") {
    var hex = randomHex(parsed.length)
    return [row(hex, "Random hex · " + parsed.length + " characters", hex)]
  }

  if (parsed.kind === "pw") {
    var pass = password(parsed.length)
    return [row(pass, "Random password · " + parsed.length + " characters", pass)]
  }

  if (parsed.kind === "rand") {
    var n = parsed.min + randomInt(parsed.max - parsed.min + 1)
    return [row(String(n), "Random integer · " + parsed.min + "–" + parsed.max, String(n))]
  }

  if (parsed.kind === "lorem") {
    var text = loremText(parsed.sentences)
    return [row(shorten(text, 80), "Lorem ipsum · " + parsed.sentences + " sentence" + (parsed.sentences === 1 ? "" : "s"), text, "text-x-generic")]
  }

  return []
}

function hashRows(query, exitCode, output) {
  var parsed = hashQuery(query)
  if (!parsed) return []
  if (exitCode !== 0) return [errorRow(hashName(parsed.algo) + " failed")]
  var hash = String(output || "").trim().split(/\s+/)[0]
  if (!/^[0-9a-f]+$/i.test(hash)) return [errorRow(hashName(parsed.algo) + " returned no hash")]
  return [row(hash, hashName(parsed.algo) + " of “" + shorten(parsed.text, 40) + "”", hash)]
}

function copyArgv(value) { return value ? ["wl-copy", "--", String(value)] : [] }

if (typeof module !== "undefined") {
  module.exports = {
    parse: parse, claims: claims, rowsFor: rowsFor, hashQuery: hashQuery, hashArgs: hashArgs,
    hashRows: hashRows, encodeBase64: encodeBase64, decodeBase64: decodeBase64,
    uuid4: uuid4, uuid7: uuid7, password: password, copyArgv: copyArgv
  }
}
