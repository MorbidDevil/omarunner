// Time & date source: "t", "time", "date", "now", "ts", "week" and the
// "t <zone>" forms (UTC, UTC+2, +2h, -30m). Formatting is done here so the
// rows are copyable strings and the model stays testable without a QML host.

var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
var MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"]

function trim(value) { return String(value || "").trim() }

function pad2(value) {
  var n = Math.floor(Math.abs(Number(value) || 0))
  return n < 10 ? "0" + n : String(n)
}

function localZone() { return { kind: "local", shift: 0, useUTC: false, label: "Local time", tz: "" } }

function relativeLabel(sign, amount, unit) {
  var noun = unit === "h"
    ? (amount === 1 ? " hour" : " hours")
    : (amount === 1 ? " minute" : " minutes")
  return sign === "+" ? "In " + amount + noun : amount + noun + " ago"
}

function parseZone(arg) {
  var low = trim(arg).toLowerCase()
  if (!low) return localZone()
  if (low === "utc" || low === "gmt" || low === "z") return { kind: "utc", shift: 0, useUTC: true, label: "UTC", tz: "UTC" }

  var m = /^utc([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(low)
  if (m) {
    var hours = parseInt(m[2], 10)
    var minutes = m[3] ? parseInt(m[3], 10) : 0
    if (!isFinite(hours) || !isFinite(minutes) || hours > 14 || minutes > 59) return null
    var sign = m[1] === "-" ? -1 : 1
    return {
      kind: "offset",
      shift: sign * (hours * 60 + minutes) * 60000,
      useUTC: true,
      label: "UTC" + m[1] + hours + (minutes ? ":" + pad2(minutes) : ""),
      tz: "UTC"
    }
  }

  m = /^([+-])(\d+)([hm])$/.exec(low)
  if (m) {
    var amount = parseInt(m[2], 10)
    if (!isFinite(amount) || amount <= 0) return null
    var unit = m[3]
    var delta = (unit === "h" ? amount * 3600000 : amount * 60000) * (m[1] === "-" ? -1 : 1)
    return { kind: "relative", shift: delta, useUTC: false, label: relativeLabel(m[1], amount, unit), tz: "" }
  }

  m = /^([+-])(\d{1,2}):(\d{2})$/.exec(low)
  if (m) {
    var h = parseInt(m[2], 10)
    var min = parseInt(m[3], 10)
    if (!isFinite(h) || !isFinite(min) || min > 59) return null
    var total = h * 3600000 + min * 60000
    var dir = m[1] === "-" ? -1 : 1
    return {
      kind: "relative",
      shift: dir * total,
      useUTC: false,
      label: (m[1] === "+" ? "In " : "") + h + "h" + pad2(min) + (m[1] === "+" ? "" : " ago"),
      tz: ""
    }
  }

  // IANA names always contain a slash (Europe/Berlin, America/New_York,
  // Etc/GMT+2). Keeping the slash requirement avoids claiming ordinary words.
  if (/^[A-Za-z][A-Za-z0-9_+\-]*(?:\/[A-Za-z0-9_+\-]+)+$/.test(arg)) {
    return { kind: "named", shift: 0, useUTC: false, label: arg, tz: arg }
  }

  return null
}

function parse(query) {
  var q = trim(query)
  var m = /^(t|time|now|date)(?:\s+(.*))?$/i.exec(q)
  if (m) {
    var key = m[1].toLowerCase()
    var arg = trim(m[2] || "")
    var mode = key === "time" ? "time" : key === "date" ? "date" : "now"

    // "t time utc", "t utc date", "t week Europe/Berlin"
    var modeMatch = /^(time|date|now|week|ts|unix)\b(?:\s+([\s\S]*))?$/i.exec(arg)
    if (modeMatch) {
      mode = modeMatch[1].toLowerCase()
      if (mode === "unix") mode = "ts"
      arg = trim(modeMatch[2] || "")
    }

    // "t format %Y-%m-%d", "t Europe/Berlin format %H:%M"
    var format = ""
    if (arg) {
      var fm = /^(.*?)\s+format\s+([\s\S]+)$/i.exec(arg)
      if (fm) {
        arg = trim(fm[1])
        format = trim(fm[2])
      } else {
        var onlyFormat = /^format\s+([\s\S]+)$/i.exec(arg)
        if (onlyFormat) {
          arg = ""
          format = trim(onlyFormat[1])
        } else if (/^format$/i.test(arg)) {
          return null
        }
      }
    }

    var zone = localZone()
    if (arg) {
      zone = parseZone(arg)
      if (!zone) return null
    }
    if (format) {
      format = format.replace(/^\s*\+/, "").trim()
      if (!format || format.length > 120) return null
    }
    return { mode: mode, zone: zone, arg: arg, format: format }
  }

  if (/^(ts|unix)$/i.test(q)) return { mode: "ts", zone: localZone(), arg: "", format: "" }
  if (/^week$/i.test(q)) return { mode: "week", zone: localZone(), arg: "", format: "" }
  return null
}

function shifted(now, zone) {
  return new Date(now.getTime() + (zone && zone.shift || 0))
}

function yearFor(date, useUTC) { return useUTC ? date.getUTCFullYear() : date.getFullYear() }
function monthFor(date, useUTC) { return useUTC ? date.getUTCMonth() : date.getMonth() }
function dayFor(date, useUTC) { return useUTC ? date.getUTCDate() : date.getDate() }
function weekdayFor(date, useUTC) { return useUTC ? date.getUTCDay() : date.getDay() }

function formatTime(date, useUTC) {
  var h = useUTC ? date.getUTCHours() : date.getHours()
  var m = useUTC ? date.getUTCMinutes() : date.getMinutes()
  var s = useUTC ? date.getUTCSeconds() : date.getSeconds()
  return pad2(h) + ":" + pad2(m) + ":" + pad2(s)
}

function formatDateValue(date, useUTC) {
  return String(yearFor(date, useUTC)) + "-" + pad2(monthFor(date, useUTC) + 1) + "-" + pad2(dayFor(date, useUTC))
}

function formatDateHuman(date, useUTC) {
  return WEEKDAYS[weekdayFor(date, useUTC)] + ", " + dayFor(date, useUTC) + " " +
    MONTHS[monthFor(date, useUTC)] + " " + yearFor(date, useUTC)
}

// ISO-8601 week. Constructing the helper date in UTC avoids DST gaps.
function isoWeek(date, useUTC) {
  var y = yearFor(date, useUTC)
  var m = monthFor(date, useUTC)
  var d = dayFor(date, useUTC)
  var target = new Date(Date.UTC(y, m, d))
  var dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  var yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  var week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7)
  return { year: target.getUTCFullYear(), week: week }
}

function row(label, detail, value, icon) {
  return {
    itemId: "time.result", kind: "source", icon: icon || "preferences-system-time",
    iconFont: "", appIcon: "", appId: "", label: String(label), target: "",
    detail: String(detail), path: "", childCount: 0, action: "", provider: "",
    score: 0, section: "", sourceId: "time", value: String(value)
  }
}

function rowsFor(query, nowMs) {
  var parsed = parse(query)
  if (!parsed) return []
  if (parsed.format) return []
  if (parsed.zone.kind === "named" && parsed.mode !== "ts") return []
  var now = new Date(Number(nowMs) || Date.now())
  var zone = parsed.zone
  var date = shifted(now, zone)

  if (parsed.mode === "ts") {
    var seconds = Math.floor(date.getTime() / 1000)
    return [row(String(seconds), "Unix timestamp · " + date.toISOString(), String(seconds))]
  }

  if (parsed.mode === "week") {
    var week = isoWeek(date, zone.useUTC)
    var weekValue = String(week.year) + "-W" + pad2(week.week)
    return [row(weekValue, "ISO week · " + formatDateHuman(date, zone.useUTC), weekValue, "x-office-calendar")]
  }

  var clock = formatTime(date, zone.useUTC)
  var human = formatDateHuman(date, zone.useUTC)
  var iso = formatDateValue(date, zone.useUTC)
  var isoWeekInfo = isoWeek(date, zone.useUTC)

  var timeRow = row(clock, zone.label + " · " + human, clock)
  var dateRow = row(human, iso + " · ISO week " + isoWeekInfo.week, iso, "x-office-calendar")

  if (parsed.mode === "time") return [timeRow]
  if (parsed.mode === "date") return [dateRow]
  return [timeRow, dateRow]
}

function needsDateProcess(parsed) {
  return !!parsed && (!!parsed.format || (parsed.zone.kind === "named" && parsed.mode !== "ts"))
}

function dateArgs(parsed, nowMs) {
  var now = Number(nowMs) || Date.now()
  var seconds = Math.floor((now + (parsed.zone.shift || 0)) / 1000)
  var pattern = parsed.format || "%Y-%m-%d|%H:%M:%S|%A|%B|%G|%V"
  var args = ["env", "LC_ALL=C"]
  if (parsed.zone.kind === "named") args.push("TZ=" + parsed.zone.tz)
  else if (parsed.zone.useUTC) args.push("TZ=UTC")
  args.push("date", "-d", "@" + seconds, "+" + pattern)
  return args
}

function rowsFromDate(query, exitCode, output) {
  var parsed = parse(query)
  if (!parsed) return []
  if (exitCode !== 0) return [row("Time zone not found", "Check the IANA zone name", "", "preferences-system-time")]

  var text = String(output || "").trim()
  if (!text) return [row("Time zone not found", "Check the IANA zone name", "", "preferences-system-time")]

  if (parsed.format) {
    return [row(text, "Format · " + parsed.format, text, "x-office-calendar")]
  }

  var parts = text.split("|")
  if (parts.length < 6) return [row("Time zone not found", "Check the IANA zone name", "", "preferences-system-time")]
  var iso = parts[0].trim()
  var clock = parts[1].trim()
  var weekday = parts[2].trim()
  var month = parts[3].trim()
  var isoYear = parts[4].trim()
  var week = parts[5].trim()
  var day = Number(iso.slice(8, 10))
  if (!isFinite(day)) day = 1
  var human = weekday + ", " + day + " " + month + " " + iso.slice(0, 4)
  var zoneLabel = parsed.zone.label

  if (parsed.mode === "week") {
    var weekValue = isoYear + "-W" + pad2(Number(week))
    return [row(weekValue, "ISO week · " + human, weekValue, "x-office-calendar")]
  }

  var timeRow = row(clock, zoneLabel + " · " + human, clock)
  var dateRow = row(human, iso + " · ISO week " + Number(week), iso, "x-office-calendar")
  if (parsed.mode === "time") return [timeRow]
  if (parsed.mode === "date") return [dateRow]
  return [timeRow, dateRow]
}

function claims(query) { return parse(query) !== null }

function copyArgv(value) { return value ? ["wl-copy", "--", String(value)] : [] }

if (typeof module !== "undefined") {
  module.exports = {
    parse: parse, claims: claims, rowsFor: rowsFor, copyArgv: copyArgv,
    needsDateProcess: needsDateProcess, dateArgs: dateArgs, rowsFromDate: rowsFromDate,
    formatTime: formatTime, formatDateValue: formatDateValue, formatDateHuman: formatDateHuman, isoWeek: isoWeek
  }
}
