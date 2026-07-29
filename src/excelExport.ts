import * as XLSX from 'xlsx'

export function exportToExcel(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) {
    alert('다운로드할 데이터가 없습니다.')
    return
  }
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
