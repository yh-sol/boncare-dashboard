import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import UploadExcel from './UploadExcel'

type InventoryRow = {
  sku_id: string
  warehouse_code: string
  physical_stock_pcs: number
  weeks_remaining: number | null
  stock_status: string
}

function App() {
  const [rows, setRows] = useState<InventoryRow[]>([])

  useEffect(() => {
    async function fetchInventory() {
      const { data, error } = await supabase
        .from('vw_inventory_by_warehouse')
        .select('*')
      if (error) console.error(error)
      else setRows(data as InventoryRow[])
    }
    fetchInventory()
  }, [])

  return (
    <div className="p-6">
      <UploadExcel />
      <h1 className="text-xl font-bold mb-4">재고 현황</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">SKU</th>
            <th className="p-2 border">창고</th>
            <th className="p-2 border">재고(Pcs)</th>
            <th className="p-2 border">소진예상주수</th>
            <th className="p-2 border">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="p-2 border">{r.sku_id}</td>
              <td className="p-2 border">{r.warehouse_code}</td>
              <td className="p-2 border">{r.physical_stock_pcs}</td>
              <td className="p-2 border">{r.weeks_remaining ?? '-'}</td>
              <td className="p-2 border">{r.stock_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App