import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

async function handleFileUpload(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  const batchId = crypto.randomUUID()   // 이번 업로드 전체를 묶는 고유 ID

  const { error } = await supabase.from('tb_erp_shipment').insert(
    rows.map((row: any) => ({
      upload_batch_id: batchId,
      erp_item_code: row['품목코드'],
      shipment_date: row['출하일자'],
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