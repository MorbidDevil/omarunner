import Quickshell
import QtQuick
import qs.Commons
import "TimeModel.js" as TimeModel

// Time and date: "t", "time", "date", "now", "ts", "week", plus "t utc",
// "t utc+2", "t +2h" and "t -30m". Enter copies the row's value.
Item {
  id: root
  property string sourceId: "time"
  property string groupLabel: "Time & Date"
  property string hint: "t · time · date · now · t Europe/Berlin · date format %Y-%m-%d"
  property int maxRows: 3
  property bool enabled: true
  signal results(int serial, var rows)

  function claims(query) { return TimeModel.claims(query) }

  function search(query, serial) {
    var parsed = TimeModel.parse(query)
    if (!parsed) { root.results(serial, []); return }
    if (TimeModel.needsDateProcess(parsed)) {
      runner.run(TimeModel.dateArgs(parsed, Date.now()), serial, query)
      return
    }
    root.results(serial, TimeModel.rowsFor(query, Date.now()))
  }

  function cancel() { runner.cancel() }

  function activate(value, modifiers) {
    var argv = TimeModel.copyArgv(value)
    if (argv.length) Util.execArgv(argv)
  }

  LatestProcess {
    id: runner
    onFinished: function(serial, query, exitCode, output) {
      root.results(serial, TimeModel.rowsFromDate(query, exitCode, output))
    }
  }
}
