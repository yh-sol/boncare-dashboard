import UploadExcel from './UploadExcel'
import InventoryView from './InventoryView'
import Dashboard from './Dashboard'
import LogisticsCostView from './LogisticsCostView'
import SkuMapping from './SkuMapping'
import ShelfLifeRiskBanner from './ShelfLifeRiskBanner'
import SkuMasterManagement from './SkuMasterManagement'

function App() {
  return (
    <div>
      <Dashboard />
      <ShelfLifeRiskBanner />
      <hr />
      <div className="p-6">
        <UploadExcel />
      </div>
      <SkuMapping />
      <hr />
      <SkuMasterManagement />
      <hr />
      <InventoryView />
      <hr />
      <LogisticsCostView />
    </div>
  )
}

export default App