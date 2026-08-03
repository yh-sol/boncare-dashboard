import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

const SNAPSHOT_LOT_NUMBER = 'SNAPSHOT'   // 제조일자 미상 스냅샷 재고를 식별하는 고정 LOT번호

async function handleFileUpload(file: File, setBusy: (b: boolean) => void) {
  setBusy(true)
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    // 등록된 SKU 목록만 대상으로 (원자재 RM 등은 자동 제외)
    const { data: skuData, error: skuError } = await supabase
      .from('tb_sku_master')
      .select('sku_id')
    if (skuError) {
      alert('SKU 목록 조회 실패: ' + skuError.message)
      return
    }
    const skuIdSet = new Set((skuData ?? []).map((s: any) => s.sku_id))

    let matchedCount = 0
    let skippedNotSku = 0
    let skippedNegative = 0

    const snapshotRows: { sku_id: string; warehouse_code: string; lot_number: string; qty_pcs: number }[] = []

    rows.forEach((row: any) => {
      const code = String(row['품목코드'] ?? '').trim()
      const warehouse = String(row['창고'] ?? '').trim()
      const qty = Number(row['현재고수량'] ?? 0)

      if (!skuIdSet.has(code)) {
        skippedNotSku++
        return
      }
      if (qty < 0) {
        skippedNegative++
        return
      }
      matchedCount++
      snapshotRows.push({
        sku_id: code,
        warehouse_code: warehouse,
        lot_number: SNAPSHOT_LOT_NUMBER,
        qty_pcs: qty,
      })
    })

    // 기존 스냅샷 재고를 전부 지우고 새로 반영 (매주 파일 전체를 그대로 덮어쓰는 방식)
    const { error: deleteError } = await supabase
      .from('tb_inventory_lot')
      .delete()
      .eq('lot_number', SNAPSHOT_LOT_NUMBER)
    if (deleteError) {
      alert('기존 스냅샷 삭제 실패: ' + deleteError.message)
      return
    }

    const { error: insertError } = await supabase.from('tb_inventory_lot').insert(
      snapshotRows.map((r) => ({
        sku_id: r.sku_id,
        warehouse_code: r.warehouse_code,
        lot_number: r.lot_number,
        manufacture_date: null,
        qty_pcs: r.qty_pcs,
      }))
    )
    if (insertError) {
      alert('스냅샷 반영 실패: ' + insertError.message)
      return
    }

    alert(
      `현재고 스냅샷 반영 완료!\n` +
        `- 반영된 SKU: ${matchedCount}건\n` +
        `- SKU 마스터에 없어 건너뜀(원자재 등): ${skippedNotSku}건\n` +
        `- 재고 음수라 건너뜀: ${skippedNegative}건`
    )
  } finally {
    setBusy(false)
  }
}

export default function CurrentStockSnapshotUpload() {
  const [busy, setBusy] = useState(false)

  return (
    <div className="p-4 border rounded mb-4">
      <h2 className="font-bold mb-2">현재고 스냅샷 업로드 (제조일자 미상)</h2>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
        비즈메카 "현재고현황" 파일을 올리면, 등록된 SKU에 한해 창고별 현재 재고 수량을 반영합니다.
        원자재(RM 등)와 음수 재고는 자동으로 제외됩니다. 다시 업로드하면 이전 스냅샷은 전부 새 값으로 교체됩니다.
        (제조일자별 LOT 재고는 이 업로드와 별개로 "생산 LOT별 재고 관리" 화면에서 직접 입력해주세요.)
      </p>
      <input
        type="file"
        accept=".xlsx,.xls"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file, setBusy)
        }}
      />
      {busy && <p style={{ fontSize: '13px', color: '#2563eb', marginTop: '8px' }}>처리 중...</p>}
    </div>
  )
}
