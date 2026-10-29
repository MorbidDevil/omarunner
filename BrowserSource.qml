import Quickshell
import Quickshell.Io
import QtQuick
import qs.Commons
import "BrowserModel.js" as BrowserModel

// "bm query" searches Chromium-family bookmarks; "bh query" searches history.
// Enter opens the URL, Shift+Enter copies it.
Item {
  id: root
  property string sourceId: "browser"
  property string groupLabel: "Browser"
  property string hint: "bm bookmarks · bh history"
  property int maxRows: 20
  property bool enabled: true
  signal results(int serial, var rows)

  function claims(query) { return BrowserModel.claims(query) }

  function search(query, serial) {
    var parsed = BrowserModel.parse(query)
    if (!parsed) { root.results(serial, []); return }
    var args = parsed.kind === "bookmarks" ? BrowserModel.bookmarksArgs() : BrowserModel.historyArgs()
    fetcher.run(args, serial, query)
  }

  function cancel() { fetcher.cancel() }

  function activate(value, modifiers) {
    var argv = (modifiers & Qt.ShiftModifier) ? BrowserModel.copyArgv(value) : BrowserModel.openArgv(value)
    if (argv.length) Util.execArgv(argv)
  }

  LatestProcess {
    id: fetcher
    onFinished: function(serial, query, exitCode, output) {
      root.results(serial, BrowserModel.rowsFor(query, exitCode, output))
    }
  }
}
