import Quickshell
import Quickshell.Io
import QtQuick
import qs.Commons
import "ImdbModel.js" as ImdbModel

// "imdb query" searches titles and names; "imdb titles query" limits the
// suggestion endpoint to titles. Enter opens the IMDb page, Shift copies it.
Item {
  id: root
  property string sourceId: "imdb"
  property string groupLabel: "IMDb"
  property string hint: "imdb query · movies/series, then people"
  property int maxRows: 14
  property bool enabled: true
  signal results(int serial, var rows)

  function claims(query) { return ImdbModel.claims(query) }

  function search(query, serial) {
    var parsed = ImdbModel.parse(query)
    if (!parsed) { root.results(serial, []); return }
    fetcher.run(ImdbModel.curlArgs(ImdbModel.apiUrl(parsed.term)), serial, query)
  }

  function cancel() { fetcher.cancel() }

  function activate(value, modifiers) {
    var argv = (modifiers & Qt.ShiftModifier) ? ImdbModel.copyArgv(value) : ImdbModel.openArgv(value)
    if (argv.length) Util.execArgv(argv)
  }

  LatestProcess {
    id: fetcher
    onFinished: function(serial, query, exitCode, output) {
      root.results(serial, ImdbModel.rowsFor(query, exitCode, output))
    }
  }
}
