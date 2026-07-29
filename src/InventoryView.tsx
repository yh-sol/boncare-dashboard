import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import RecalcButton from './RecalcButton'
import { exportToExcel } from './excelExport'

type InventoryRow = {
  sku_id: string
  warehouse_code: string
  physical_stock_pcs: number
  incoming_expected_pcs: number
  avg_weekly_outbound_pcs: number | null
  weeks_remaining: number | null
  stock_status: string
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: '🔴 위험', color: '#dc2626' },
  WARNING_1: { label: '🟠 주의-긴급', color: '#ea580c' },
  WARNING_2: { label: '🟡 주의-일반', color: '#ca8a04' },
  WARNING_3: { label: '🟡 주의-완화', color: '#a16207' },
  NORMAL: { label: '🟢 정상', color: '#16a34a' },
  NO_DATA: { label: '⚪ 데이터부족', color: '#6b7280' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.NO_DATA
  return (
    <span
      style={{
        color: s.color,
        border: `1px solid ${s.color}`,
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '13px',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  )
}

export default function InventoryView() {
  const [warehouseRows, setWarehouseRows] = useState<InventoryRow[]>([])
  const [totalRows, setTotalRows] = useState<InventoryRow[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('TOTAL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [byWarehouse, total] = await Promise.all([
      supabase.from('vw_inventory_by_warehouse').select('*'),
      supabase.from('vw_inventory_total').select('*'),
    ])
    if (byWarehouse.error) console.error(byWarehouse.error)
    if (total.error) console.error(total.error)
    setWarehouseRows((byWarehouse.data as InventoryRow[]) ?? [])
    setTotalRows(
      ((total.data as any[]) ?? []).map((r) => ({ ...r, warehouse_code: 'TOTAL' }))
    )
    setLoading(false)
  }

  const warehouseCodes = Array.from(new Set(warehouseRows.map((r) => r.warehouse_code)))
  const tabs = ['TOTAL', ...warehouseCodes]

  const displayRows =
    selectedWarehouse === 'TOTAL'
      ? totalRows
      : warehouseRows.filter((r) => r.warehouse_code === selectedWarehouse)


  function handleDownload() {
    const statusLabel: Record<string, string> = {
      CRITICAL: '위험', WARNING_1: '주의-긴급', WARNING_2: '주의-일반',
      WARNING_3: '주의-완화', NORMAL: '정상', NO_DATA: '데이터부족',
    }
    const exportRows = displayRows.map((r) => ({
      SKU: r.sku_id,
      창고: r.warehouse_code,
      '물리재고(Pcs)': r.physical_stock_pcs,
      입고예정: r.incoming_expected_pcs,
      주평균출고: r.avg_weekly_outbound_pcs ?? '',
      소진예상주수: r.weeks_remaining ?? '',
      상태: statusLabel[r.stock_status] ?? r.stock_status,
    }))
    exportToExcel(exportRows, `재고현황_${selectedWarehouse}_${new Date().toISOString().slice(0, 10)}`)
  }

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">재고 현황</h1>
        <div>
          <button onClick={fetchAll} className="text-sm border rounded px-3 py-1">
            새로고침
          </button>
          <RecalcButton onDone={fetchAll} />
          <button
            onClick={handleDownload}
            className="text-sm border rounded px-3 py-1"
            style={{ marginLeft: '8px', border: '1px solid #16a34a', color: '#16a34a' }}
          >
            엑셀 다운로드
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {tabs.map((code) => (
          <button
            key={code}
            onClick={() => setSelectedWarehouse(code)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: selectedWarehouse === code ? '2px solid #333' : '1px solid #ccc',
              background: selectedWarehouse === code ? '#f0f0f0' : 'white',
              fontWeight: selectedWarehouse === code ? 'bold' : 'normal',
              cursor: 'pointer',
              color: '#000',
            }}
          >
            {code === 'TOTAL' ? '통합' : code}
          </button>
        ))}
      </div>

      {displayRows.length === 0 ? (
        <p style={{ color: '#888' }}>
          표시할 재고 데이터가 없습니다. tb_sku_master / tb_inventory / tb_sku_weekly_stats에 데이터를 입력해주세요.
        </p>
      ) : (
        <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">물리재고(Pcs)</th>
              <th className="p-2 border">입고예정</th>
              <th className="p-2 border">주평균출고</th>
              <th className="p-2 border">소진예상주수</th>
              <th className="p-2 border">상태</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r, i) => (
              <tr key={i}>
                <td className="p-2 border">{r.sku_id}</td>
                <td className="p-2 border">{r.physical_stock_pcs}</td>
                <td className="p-2 border">{r.incoming_expected_pcs}</td>
                <td className="p-2 border">{r.avg_weekly_outbound_pcs ?? '-'}</td>
                <td className="p-2 border">{r.weeks_remaining ?? '-'}</td>
                <td className="p-2 border">
                  <StatusBadge status={r.stock_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
