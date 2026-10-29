import Quickshell
import Quickshell.Io
import QtQuick
import qs.Commons
import "ServiceModel.js" as ServiceModel

// "svc name" / "service name" / "unit name": systemd services.
// Enter starts an inactive unit or restarts an active one; Shift+Enter stops.
Item {
  id: root
  property string sourceId: "services"
  property string groupLabel: "Services"
  property string hint: "svc name · Enter start/restart · Shift stop"
  property int maxRows: 20
  property bool enabled: true
  signal results(int serial, var rows)

  function claims(query) { return ServiceModel.claims(query) }

  function search(query, serial) {
    fetcher.run(ServiceModel.listArgs(), serial, query)
  }

  function cancel() { fetcher.cancel() }

  function activate(value, modifiers) {
    var argv = ServiceModel.argvFor(value, (modifiers & Qt.ShiftModifier) !== 0)
    if (argv.length) Util.execArgv(argv)
  }

  LatestProcess {
    id: fetcher
    onFinished: function(serial, query, exitCode, output) {
      root.results(serial, ServiceModel.rowsFor(query, exitCode, output))
    }
  }
}
