import UploadExcel from './UploadExcel'
import InventoryView from './InventoryView'
import Dashboard from './Dashboard'

function App() {
  return (
    <div>
      <Dashboard />
      <hr />
      <div className="p-6">
        <UploadExcel />
      </div>
      <InventoryView />
    </div>
  )
}

export default App
