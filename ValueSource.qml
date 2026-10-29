import Quickshell
import QtQuick
import qs.Commons
import "ValueModel.js" as ValueModel

// "uuid", "b64 text", "sha256 text", "hex 32", "pw 24", "rand 1 100",
// "lorem 3": generated values. Enter copies the row's value.
Item {
  id: root
  property string sourceId: "values"
  property string groupLabel: "Values"
  property string hint: "uuid · b64 · sha256 · hex · pw · rand · lorem"
  property int maxRows: 3
  property bool enabled: true
  signal results(int serial, var rows)

  function claims(query) { return ValueModel.claims(query) }

  function search(query, serial) {
    var hash = ValueModel.hashQuery(query)
    if (hash) {
      hasher.run(ValueModel.hashArgs(hash.algo), serial, query, hash.text)
      return
    }
    hasher.cancel()
    root.results(serial, ValueModel.rowsFor(query))
  }

  function cancel() { hasher.cancel() }

  function activate(value, modifiers) {
    var argv = ValueModel.copyArgv(value)
    if (argv.length) Util.execArgv(argv)
  }

  LatestProcess {
    id: hasher
    onFinished: function(serial, query, exitCode, output) {
      root.results(serial, ValueModel.hashRows(query, exitCode, output))
    }
  }
}
