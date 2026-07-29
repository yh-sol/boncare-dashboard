import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

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

  // 기존에 확정된 매핑표를 미리 불러와 캐시로 사용 (품목코드 -> sku_id)
  const { data: mappingData } = await supabase
    .from('tb_erp_mapping')
    .select('erp_item_code, sku_id')
  const mappingCache: Record<string, string> = {}
  mappingData?.forEach((m: any) => {
    mappingCache[m.erp_item_code] = m.sku_id
  })

  const validRows = rows.filter((row: any) => row['품목코드'])

  const { error } = await supabase.from('tb_erp_shipment').insert(
    validRows.map((row: any) => {
      const code = String(row['품목코드'])
      return {
        upload_batch_id: batchId,
        erp_item_code: code,
        sku_id: mappingCache[code] ?? null,   // 매핑되어 있으면 자동 연결, 없으면 null
        shipment_date: toIsoDate(row['판매일자']),
        qty_pcs: parseInt(String(row['수량']).replace(/,/g, ''), 10),
        raw_row_json: row,   // 원본 행 보존 (매핑 화면에서 품목명 등 표시용)
      }
    })
  )
  if (error) {
    console.error(error)
    return
  }

  const unmatchedCount = validRows.filter(
    (row: any) => !mappingCache[String(row['품목코드'])]
  ).length

  if (unmatchedCount > 0) {
    alert(
      `업로드 완료! (${validRows.length}건)\n이 중 ${unmatchedCount}건은 SKU 매핑이 안 되어 있습니다. SKU 매핑 화면에서 연결해주세요.`
    )
  } else {
    alert(`업로드 완료! (${validRows.length}건, 전부 SKU 매핑됨)`)
  }
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
    </div>
  )
}

export default UploadExcel
