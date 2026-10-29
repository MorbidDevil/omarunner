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
  property string hint: "t · time · date · now · ts · week · t utc · t +2h"
  property int maxRows: 3
  property bool enabled: true
  signal results(int serial, var rows)

  function claims(query) { return TimeModel.claims(query) }

  function search(query, serial) {
    root.results(serial, TimeModel.rowsFor(query, Date.now()))
  }

  function cancel() {}

  function activate(value, modifiers) {
    var argv = TimeModel.copyArgv(value)
    if (argv.length) Util.execArgv(argv)
  }
}
