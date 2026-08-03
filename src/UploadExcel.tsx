import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

// 확정된 특수출고 판정 키워드 (2단계 결정사항)
const SPECIAL_KEYWORDS = ['샘플', '증정', '직원구매', '프로모션', '이벤트']

function detectSpecialOutbound(remark: any): boolean {
  const text = String(remark ?? '')
  return SPECIAL_KEYWORDS.some((kw) => text.includes(kw))
}

async function handleFileUpload(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  const batchId = crypto.randomUUID()

  function toIsoDate(raw: any): string | null {
    const s = String(raw).trim()
    if (s.length !== 8) return null
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }

  const { data: mappingData } = await supabase
    .from('tb_erp_mapping')
    .select('erp_item_code, sku_id')
  const mappingCache: Record<string, string> = {}
  mappingData?.forEach((m: any) => {
    mappingCache[m.erp_item_code] = m.sku_id
  })

  // 이미 DB에 있는 (품목코드+판매일자+수량) 조합을 미리 불러와 중복 업로드 방지에 사용
  const { data: existingShipments } = await supabase
    .from('tb_erp_shipment')
    .select('erp_item_code, shipment_date, qty_pcs')
  const existingKeySet = new Set(
    (existingShipments ?? []).map(
      (s: any) => `${s.erp_item_code}_${s.shipment_date}_${s.qty_pcs}`
    )
  )

  const validRows = rows.filter((row: any) => row['품목코드'])

  const candidateRows = validRows.map((row: any) => {
    const code = String(row['품목코드'])
    const isSpecial = detectSpecialOutbound(row['비고'])
    const isoDate = toIsoDate(row['판매일자'])
    const qty = parseInt(String(row['수량']).replace(/,/g, ''), 10)
    return {
      key: `${code}_${isoDate}_${qty}`,
      upload_batch_id: batchId,
      erp_item_code: code,
      sku_id: mappingCache[code] ?? null,
      shipment_date: isoDate,
      qty_pcs: qty,
      is_special_outbound: isSpecial,
      special_outbound_reason: isSpecial ? String(row['비고']) : null,
      raw_row_json: row,
    }
  })

  // 이미 DB에 존재하는 (품목코드+판매일자+수량) 조합은 건너뛰어 중복 적재 방지
  const insertRows = candidateRows.filter((r) => !existingKeySet.has(r.key))
  const duplicateSkippedCount = candidateRows.length - insertRows.length
  // insert 페이로드에는 key 필드가 필요 없으므로 제거
  const finalRows = insertRows.map(({ key, ...rest }) => rest)

  const { error } = await supabase.from('tb_erp_shipment').insert(finalRows)
  if (error) {
    console.error(error)
    return
  }

  const unmatchedCount = finalRows.filter((r) => !r.sku_id).length
  const specialCount = finalRows.filter((r) => r.is_special_outbound).length

  let msg = `업로드 완료! (${finalRows.length}건)`
  if (duplicateSkippedCount > 0) msg += `\n이 중 ${duplicateSkippedCount}건은 이미 등록된 데이터와 동일하여 건너뛰었습니다.`
  if (specialCount > 0) msg += `\n이 중 ${specialCount}건은 특수출고로 자동 분류되어 주평균출고 계산에서 제외됩니다.`
  if (unmatchedCount > 0) msg += `\n이 중 ${unmatchedCount}건은 SKU 매핑이 안 되어 있습니다.`
  alert(msg)
}

function UploadExcel() {
  return (
    <div className="p-4 border rounded mb-4">
      <h2 className="font-bold mb-2">ERP 엑셀 업로드</h2>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
        }}
      />
      <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
        비고란에 "샘플/증정/직원구매/프로모션/이벤트" 키워드가 있으면 자동으로 특수출고로 분류됩니다.
      </p>
    </div>
  )
}

export default UploadExcel
