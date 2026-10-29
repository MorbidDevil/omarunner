import Quickshell
import Quickshell.Io
import QtQuick
import qs.Commons
import "LinkdingModel.js" as LinkdingModel

// "ld query" / "linkding query" searches the configured Linkding instance;
// bare "ld" lists the newest bookmarks. Enter opens the bookmark, Shift copies
// its URL. Configure linkding.url and linkding.apiKey in omarunner.json.
Item {
  id: root
  property string sourceId: "linkding"
  property string groupLabel: "Linkding"
  property string hint: "ld query · linkding bookmarks"
  property int maxRows: 20
  property bool enabled: true
  property var linkdingConfig: ({})
  readonly property string instance: String(root.linkdingConfig && root.linkdingConfig.url || "")
  readonly property string apiKey: String(root.linkdingConfig && root.linkdingConfig.apiKey || "")
  signal results(int serial, var rows)

  function claims(query) { return LinkdingModel.claims(query) }

  function search(query, serial) {
    if (!root.instance || !root.apiKey) {
      root.results(serial, [LinkdingModel.configRow()])
      return
    }
    var parsed = LinkdingModel.parse(query)
    if (!parsed) { root.results(serial, []); return }
    fetcher.run(LinkdingModel.curlArgs(LinkdingModel.apiUrl(root.instance, parsed.term), root.apiKey), serial, query)
  }

  function cancel() { fetcher.cancel() }

  function activate(value, modifiers) {
    var argv = (modifiers & Qt.ShiftModifier) ? LinkdingModel.copyArgv(value) : LinkdingModel.openArgv(value)
    if (argv.length) Util.execArgv(argv)
  }

  LatestProcess {
    id: fetcher
    onFinished: function(serial, query, exitCode, output) {
      root.results(serial, LinkdingModel.rowsFor(query, exitCode, output))
    }
  }
}
