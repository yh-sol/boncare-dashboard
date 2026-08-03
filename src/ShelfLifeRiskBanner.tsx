import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const COUPANG_MIN_REMAINING_MONTHS = 18   // 본케어/본착한생리대 공통 기준

type RiskRow = {
  sku_id: string
  warehouse_code: string
  lot_number: string | null
  qty_pcs: number
  manufacture_date: string
  expiry_date: string
  remaining_months: number
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export default function ShelfLifeRiskBanner() {
  const [riskRows, setRiskRows] = useState<RiskRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRisk()
  }, [])

  async function fetchRisk() {
    setLoading(true)

    // LOT 단위로 조회 (제조일자가 LOT마다 다르므로 LOT별로 리스크 판단)
    const { data: lotRows, error: lotError } = await supabase
      .from('tb_inventory_lot')
      .select('sku_id, warehouse_code, lot_number, manufacture_date, qty_pcs')
    if (lotError) console.error(lotError)

    const { data: skuRows, error: skuError } = await supabase
      .from('tb_sku_master')
      .select('sku_id, shelf_life_months')
    if (skuError) console.error(skuError)

    const shelfLifeMap: Record<string, number> = {}
    skuRows?.forEach((s: any) => {
      if (s.shelf_life_months) shelfLifeMap[s.sku_id] = s.shelf_life_months
    })

    const today = new Date()
    const results: RiskRow[] = []

    lotRows?.forEach((lot: any) => {
      if (!lot.manufacture_date) return   // 제조일자 미상(스냅샷) LOT은 판단 대상에서 제외
      const shelfLifeMonths = shelfLifeMap[lot.sku_id]
      if (!shelfLifeMonths) return

      const manufactureDate = new Date(lot.manufacture_date)
      const expiryDate = addMonths(manufactureDate, shelfLifeMonths)
      const remainingMonths = monthsBetween(today, expiryDate)

      if (remainingMonths < COUPANG_MIN_REMAINING_MONTHS) {
        results.push({
          sku_id: lot.sku_id,
          warehouse_code: lot.warehouse_code,
          lot_number: lot.lot_number,
          qty_pcs: lot.qty_pcs,
          manufacture_date: lot.manufacture_date,
          expiry_date: expiryDate.toISOString().slice(0, 10),
          remaining_months: remainingMonths,
        })
      }
    })

    results.sort((a, b) => a.remaining_months - b.remaining_months)
    setRiskRows(results)
    setLoading(false)
  }

  if (loading) return null
  if (riskRows.length === 0) return null

  return (
    <div
      style={{
        margin: '0 24px 16px 24px',
        padding: '12px 16px',
        border: '1px solid #dc2626',
        background: '#2a1414',
        borderRadius: '8px',
      }}
    >
      <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
        ⚠ 쿠팡 납품 가능 기한 리스크 (잔여 유통기한 {COUPANG_MIN_REMAINING_MONTHS}개월 미만) — LOT 단위
      </div>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ fontSize: '13px', color: '#aaa' }}>
            <th style={{ textAlign: 'left', padding: '4px' }}>SKU</th>
            <th style={{ textAlign: 'left', padding: '4px' }}>창고</th>
            <th style={{ textAlign: 'left', padding: '4px' }}>LOT번호</th>
            <th style={{ textAlign: 'left', padding: '4px' }}>수량</th>
            <th style={{ textAlign: 'left', padding: '4px' }}>제조일자</th>
            <th style={{ textAlign: 'left', padding: '4px' }}>유통기한</th>
            <th style={{ textAlign: 'left', padding: '4px' }}>잔여</th>
          </tr>
        </thead>
        <tbody>
          {riskRows.map((r, i) => (
            <tr key={i} style={{ fontSize: '14px' }}>
              <td style={{ padding: '4px' }}>{r.sku_id}</td>
              <td style={{ padding: '4px' }}>{r.warehouse_code}</td>
              <td style={{ padding: '4px' }}>{r.lot_number ?? '-'}</td>
              <td style={{ padding: '4px' }}>{r.qty_pcs}</td>
              <td style={{ padding: '4px' }}>{r.manufacture_date}</td>
              <td style={{ padding: '4px' }}>{r.expiry_date}</td>
              <td style={{ padding: '4px', color: r.remaining_months < 0 ? '#dc2626' : '#ea580c' }}>
                {r.remaining_months}개월
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
