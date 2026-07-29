import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function RecalcButton({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false)

  async function handleRecalc() {
    setRunning(true)

    const { data: skus, error: skuError } = await supabase
      .from('tb_sku_master')
      .select('sku_id')
    if (skuError) {
      console.error(skuError)
      setRunning(false)
      return
    }

    // 최근 4주(28일) 기준, 특수출고 제외
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const isoDate = fourWeeksAgo.toISOString().slice(0, 10)

    const { data: shipments, error: shipmentError } = await supabase
      .from('tb_erp_shipment')
      .select('sku_id, qty_pcs')
      .eq('is_special_outbound', false)
      .gte('shipment_date', isoDate)
      .not('sku_id', 'is', null)
    if (shipmentError) {
      console.error(shipmentError)
      setRunning(false)
      return
    }

    const sums: Record<string, number> = {}
    shipments?.forEach((s: any) => {
      sums[s.sku_id] = (sums[s.sku_id] ?? 0) + Number(s.qty_pcs)
    })

    for (const sku of skus ?? []) {
      const avg = (sums[sku.sku_id] ?? 0) / 4
      const { error } = await supabase.from('tb_sku_weekly_stats').upsert(
        {
          sku_id: sku.sku_id,
          avg_weekly_outbound_pcs: avg,
          observation_weeks: 4,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: 'sku_id' }
      )
      if (error) console.error(error)
    }

    setRunning(false)
    alert('주평균출고량 재계산이 완료되었습니다.')
    onDone?.()
  }

  return (
    <button
      onClick={handleRecalc}
      disabled={running}
      style={{
        padding: '6px 14px',
        border: '1px solid #2563eb',
        color: '#2563eb',
        borderRadius: '6px',
        marginLeft: '8px',
      }}
    >
      {running ? '계산 중...' : '주평균출고 재계산'}
    </button>
  )
}
