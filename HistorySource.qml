import Quickshell
import QtQuick
import qs.Commons
import "HistoryModel.js" as HistoryModel

// "!!" lists previously selected results; "!! query" filters them. The rows
// keep their original kind/sourceId, so activating one re-runs the original
// action (launch app, open file, start service, …).
Item {
  id: root
  property string sourceId: "history"
  property string groupLabel: "History"
  property string hint: "!! query · results you selected before"
  property int maxRows: 12
  property bool enabled: true
  property var history: []
  signal results(int serial, var rows)

  function claims(query) { return HistoryModel.claims(query) }

  function search(query, serial) {
    root.results(serial, HistoryModel.search(root.history, query, root.maxRows))
  }

  function cancel() {}
}
