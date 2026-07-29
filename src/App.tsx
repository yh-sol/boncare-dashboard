import UploadExcel from './UploadExcel'
import InventoryView from './InventoryView'
import Dashboard from './Dashboard'
import LogisticsCostView from './LogisticsCostView'

function App() {
  return (
    <div>
      <Dashboard />
      <hr />
      <div className="p-6">
        <UploadExcel />
      </div>
      <InventoryView />
      <hr />
      <LogisticsCostView />
    </div>
  )
}

export default App