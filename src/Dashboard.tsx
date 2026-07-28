import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type InventoryRow = {
  sku_id: string
  warehouse_code: string
  physical_stock_pcs: number
  weeks_remaining: number | null
  stock_status: string
}

const STATUS_LABEL: Record<string, string> = {
  CRITICAL: '🔴 위험',
  WARNING_1: '🟠 주의-긴급',
  WARNING_2: '🟡 주의-일반',
  WARNING_3: '🟡 주의-완화',
  NORMAL: '🟢 정상',
  NO_DATA: '⚪ 데이터부족',
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${tone}`,
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: tone }}>{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    // 통합(TOTAL) 기준으로 위험도를 판단 (창고별 중복 카운트 방지)
    const { data, error } = await supabase.from('vw_inventory_total').select('*')
    if (error) console.error(error)
    setRows((data as InventoryRow[]) ?? [])
    setLoading(false)
  }

  const totalSku = rows.length
  const criticalRows = rows.filter((r) => r.stock_status === 'CRITICAL')
  const warningRows = rows.filter((r) => r.stock_status.startsWith('WARNING'))
  const alertRows = [...criticalRows, ...warningRows].sort(
    (a, b) => (a.weeks_remaining ?? 999) - (b.weeks_remaining ?? 999)
  )

  // D-Day 차트용: weeks_remaining이 있는 SKU만, 짧은 순으로 정렬
  const dDayRows = rows
    .filter((r) => r.weeks_remaining !== null)
    .sort((a, b) => (a.weeks_remaining ?? 0) - (b.weeks_remaining ?? 0))
    .slice(0, 10)
  const maxWeeks = Math.max(...dDayRows.map((r) => r.weeks_remaining ?? 0), 1)

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">메인 대시보드</h1>

      {/* KPI 카드 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <KpiCard label="총 SKU수" value={totalSku} tone="#6b7280" />
        <KpiCard label="🔴 위험" value={criticalRows.length} tone="#dc2626" />
        <KpiCard label="🟡 주의" value={warningRows.length} tone="#ca8a04" />
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Alert Center */}
        <div style={{ flex: 6 }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Alert Center</h2>
          {alertRows.length === 0 ? (
            <p style={{ color: '#888' }}>현재 위험/주의 SKU가 없습니다.</p>
          ) : (
            <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">소진예상주수</th>
                  <th className="p-2 border">상태</th>
                </tr>
              </thead>
              <tbody>
                {alertRows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{r.sku_id}</td>
                    <td className="p-2 border">{r.weeks_remaining}주</td>
                    <td className="p-2 border">{STATUS_LABEL[r.stock_status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* D-Day 시각화 (간단 막대) */}
        <div style={{ flex: 4 }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>소진 D-Day (짧은 순)</h2>
          {dDayRows.length === 0 ? (
            <p style={{ color: '#888' }}>데이터가 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dDayRows.map((r, i) => {
                const widthPct = ((r.weeks_remaining ?? 0) / maxWeeks) * 100
                const color =
                  r.stock_status === 'CRITICAL'
                    ? '#dc2626'
                    : r.stock_status.startsWith('WARNING')
                    ? '#ca8a04'
                    : '#16a34a'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '70px', fontSize: '13px' }}>{r.sku_id}</div>
                    <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '18px' }}>
                      <div
                        style={{
                          width: `${widthPct}%`,
                          background: color,
                          height: '100%',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div style={{ width: '40px', fontSize: '13px', textAlign: 'right' }}>
                      {r.weeks_remaining}주
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
