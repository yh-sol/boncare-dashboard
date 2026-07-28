import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

async function handleFileUpload(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  const batchId = crypto.randomUUID()

  // "20260223" 형태의 숫자/문자를 "2026-02-23"로 변환
  function toIsoDate(raw: any): string | null {
    const s = String(raw).trim()
    if (s.length !== 8) return null
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }

  const { error } = await supabase.from('tb_erp_shipment').insert(
    rows.map((row: any) => ({
      upload_batch_id: batchId,
      erp_item_code: row['품목코드'],
      shipment_date: toIsoDate(row['판매일자']),
      qty_pcs: parseInt(String(row['수량']).replace(/,/g, ''), 10),
    }))
  )
  if (error) console.error(error)
  else alert('업로드 완료!')
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