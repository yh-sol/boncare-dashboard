import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type CostRow = {
  cost_id: number
  settlement_date: string
  operator_name: string
  logistics_type: string   // 'COUPANG_MILKRUN' | 'GENERAL_PARCEL' (DB 저장값, 화면엔 '화물'/'택배'로 표시)
  unit_basis: string
  unit_price: number
  qty: number
  total_cost: number
  memo: string | null
}

// DB 저장값 -> 화면 표시 라벨 (요청에 따라 '밀크런' 대신 '화물' 사용)
const TYPE_LABEL: Record<string, string> = {
  COUPANG_MILKRUN: '쿠팡 화물',
  GENERAL_PARCEL: '일반택배',
}

export default function LogisticsCostView() {
  const [rows, setRows] = useState<CostRow[]>([])
  const [selectedOperator, setSelectedOperator] = useState<string>('전체')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tb_logistics_cost')
      .select('*')
      .order('settlement_date', { ascending: false })
    if (error) console.error(error)
    setRows((data as CostRow[]) ?? [])
    setLoading(false)
  }

  const operators = Array.from(new Set(rows.map((r) => r.operator_name)))
  const filteredRows =
    selectedOperator === '전체' ? rows : rows.filter((r) => r.operator_name === selectedOperator)

  const cargoTotal = filteredRows
    .filter((r) => r.logistics_type === 'COUPANG_MILKRUN')
    .reduce((sum, r) => sum + Number(r.total_cost), 0)
  const parcelTotal = filteredRows
    .filter((r) => r.logistics_type === 'GENERAL_PARCEL')
    .reduce((sum, r) => sum + Number(r.total_cost), 0)
  const maxTotal = Math.max(cargoTotal, parcelTotal, 1)

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">물류비 정산 및 분석</h1>

      {/* 운송사 필터 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['전체', ...operators].map((op) => (
          <button
            key={op}
            onClick={() => setSelectedOperator(op)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: selectedOperator === op ? '2px solid #333' : '1px solid #ccc',
              background: selectedOperator === op ? '#f0f0f0' : 'white',
              fontWeight: selectedOperator === op ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            {op}
          </button>
        ))}
      </div>

      {/* 화물 vs 택배 비교 막대 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>쿠팡 화물 vs 일반택배 비용 비교</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '90px', fontSize: '13px' }}>쿠팡 화물</div>
            <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '20px' }}>
              <div
                style={{
                  width: `${(cargoTotal / maxTotal) * 100}%`,
                  background: '#2563eb',
                  height: '100%',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div style={{ width: '110px', fontSize: '13px', textAlign: 'right' }}>
              {cargoTotal.toLocaleString()}원
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '90px', fontSize: '13px' }}>일반택배</div>
            <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '20px' }}>
              <div
                style={{
                  width: `${(parcelTotal / maxTotal) * 100}%`,
                  background: '#16a34a',
                  height: '100%',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div style={{ width: '110px', fontSize: '13px', textAlign: 'right' }}>
              {parcelTotal.toLocaleString()}원
            </div>
          </div>
        </div>
      </div>

      {/* 정산내역 테이블 */}
      <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>정산내역</h2>
      {filteredRows.length === 0 ? (
        <p style={{ color: '#888' }}>
          표시할 정산 데이터가 없습니다. tb_logistics_cost 테이블에 데이터를 입력해주세요.
        </p>
      ) : (
        <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">정산일</th>
              <th className="p-2 border">운송사</th>
              <th className="p-2 border">유형</th>
              <th className="p-2 border">단가기준</th>
              <th className="p-2 border">단가</th>
              <th className="p-2 border">수량</th>
              <th className="p-2 border">합계금액</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.cost_id}>
                <td className="p-2 border">{r.settlement_date}</td>
                <td className="p-2 border">{r.operator_name}</td>
                <td className="p-2 border">{TYPE_LABEL[r.logistics_type] ?? r.logistics_type}</td>
                <td className="p-2 border">{r.unit_basis}</td>
                <td className="p-2 border">{Number(r.unit_price).toLocaleString()}원</td>
                <td className="p-2 border">{r.qty}</td>
                <td className="p-2 border">{Number(r.total_cost).toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
