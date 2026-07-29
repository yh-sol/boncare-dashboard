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

  const validRows = rows.filter((row: any) => row['품목코드'])

  const insertRows = validRows.map((row: any) => {
    const code = String(row['품목코드'])
    const isSpecial = detectSpecialOutbound(row['비고'])
    return {
      upload_batch_id: batchId,
      erp_item_code: code,
      sku_id: mappingCache[code] ?? null,
      shipment_date: toIsoDate(row['판매일자']),
      qty_pcs: parseInt(String(row['수량']).replace(/,/g, ''), 10),
      is_special_outbound: isSpecial,
      special_outbound_reason: isSpecial ? String(row['비고']) : null,
      raw_row_json: row,
    }
  })

  const { error } = await supabase.from('tb_erp_shipment').insert(insertRows)
  if (error) {
    console.error(error)
    return
  }

  const unmatchedCount = insertRows.filter((r) => !r.sku_id).length
  const specialCount = insertRows.filter((r) => r.is_special_outbound).length

  let msg = `업로드 완료! (${insertRows.length}건)`
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
