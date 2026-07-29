import { supabase } from './supabaseClient'

const LOGGABLE_STATUSES = ['CRITICAL', 'WARNING_1', 'WARNING_2']

// 현재 재고 상태를 tb_alert_log와 비교해 새 위험/주의는 기록하고, 해소된 건 자동으로 resolve 처리
export async function syncAlertLog() {
  const { data: totalRows, error: invError } = await supabase
    .from('vw_inventory_total')
    .select('sku_id, stock_status, weeks_remaining')
  if (invError) {
    console.error(invError)
    return
  }

  const { data: existingAlerts, error: alertError } = await supabase
    .from('tb_alert_log')
    .select('alert_id, sku_id, alert_type, is_resolved')
    .eq('is_resolved', false)
  if (alertError) {
    console.error(alertError)
    return
  }

  const currentRisky = (totalRows ?? []).filter((r: any) =>
    LOGGABLE_STATUSES.includes(r.stock_status)
  )

  // 1) 새로 위험/주의 상태가 된 SKU는 로그 신규 생성 (이미 동일 유형 미해결 로그가 있으면 건너뜀)
  for (const row of currentRisky) {
    const already = existingAlerts?.some(
      (a: any) => a.sku_id === row.sku_id && a.alert_type === row.stock_status
    )
    if (already) continue

    const message =
      row.stock_status === 'CRITICAL'
        ? `${row.sku_id} 위험 상태 (소진예상 ${row.weeks_remaining}주)`
        : `${row.sku_id} 주의 상태 (소진예상 ${row.weeks_remaining}주)`

    await supabase.from('tb_alert_log').insert({
      sku_id: row.sku_id,
      warehouse_code: 'TOTAL',
      alert_type: row.stock_status,
      weeks_remaining_at_alert: row.weeks_remaining,
      message,
      channel_sent: 'WEB',
      is_resolved: false,
    })
  }

  // 2) 예전엔 위험/주의였는데 지금은 정상(또는 데이터 없음)이 된 SKU는 해소 처리
  const currentRiskySkuIds = new Set(currentRisky.map((r: any) => r.sku_id))
  const toResolve = (existingAlerts ?? []).filter(
    (a: any) => !currentRiskySkuIds.has(a.sku_id)
  )
  for (const a of toResolve) {
    await supabase
      .from('tb_alert_log')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('alert_id', a.alert_id)
  }
}
