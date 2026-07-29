import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type UnmatchedItem = {
  erp_item_code: string
  erp_item_name: string
}

type SkuOption = {
  sku_id: string
  sku_name: string
}

export default function SkuMapping() {
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([])
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([])
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)

    const { data: skus, error: skuError } = await supabase
      .from('tb_sku_master')
      .select('sku_id, sku_name')
      .eq('is_active', true)
    if (skuError) console.error(skuError)
    setSkuOptions((skus as SkuOption[]) ?? [])

    // sku_id가 비어있는(미매핑) 출고 이력만 조회
    const { data: shipments, error: shipmentError } = await supabase
      .from('tb_erp_shipment')
      .select('erp_item_code, raw_row_json')
      .is('sku_id', null)
    if (shipmentError) console.error(shipmentError)

    // 품목코드 기준으로 중복 제거
    const seen = new Map<string, UnmatchedItem>()
    ;(shipments ?? []).forEach((row: any) => {
      if (!seen.has(row.erp_item_code)) {
        seen.set(row.erp_item_code, {
          erp_item_code: row.erp_item_code,
          erp_item_name: row.raw_row_json?.['품목명'] ?? '(품목명 없음)',
        })
      }
    })
    setUnmatched(Array.from(seen.values()))
    setLoading(false)
  }

  async function handleSave(item: UnmatchedItem) {
    const skuId = selection[item.erp_item_code]
    if (!skuId) {
      alert('연결할 SKU를 먼저 선택해주세요.')
      return
    }
    setSaving(item.erp_item_code)

    // 1) 매핑표에 upsert
    const { error: mapError } = await supabase.from('tb_erp_mapping').upsert(
      {
        erp_item_code: item.erp_item_code,
        erp_item_name: item.erp_item_name,
        sku_id: skuId,
        is_confirmed: true,
        mapped_at: new Date().toISOString(),
      },
      { onConflict: 'erp_item_code' }
    )
    if (mapError) {
      console.error(mapError)
      alert('매핑 저장 실패: ' + mapError.message)
      setSaving(null)
      return
    }

    // 2) 이미 저장된 과거 출고이력도 소급 연결
    const { error: updateError } = await supabase
      .from('tb_erp_shipment')
      .update({ sku_id: skuId })
      .eq('erp_item_code', item.erp_item_code)
      .is('sku_id', null)
    if (updateError) {
      console.error(updateError)
      alert('과거 이력 연결 실패: ' + updateError.message)
      setSaving(null)
      return
    }

    setSaving(null)
    fetchAll()
  }

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">SKU 매핑 관리</h1>
      {unmatched.length === 0 ? (
        <p style={{ color: '#888' }}>미매칭 품목이 없습니다. 모두 연결되어 있습니다.</p>
      ) : (
        <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">ERP 품목코드</th>
              <th className="p-2 border">ERP 품목명</th>
              <th className="p-2 border">연결할 SKU</th>
              <th className="p-2 border">저장</th>
            </tr>
          </thead>
          <tbody>
            {unmatched.map((item) => (
              <tr key={item.erp_item_code} style={{ background: '#fff3f3' }}>
                <td className="p-2 border">{item.erp_item_code}</td>
                <td className="p-2 border">{item.erp_item_name}</td>
                <td className="p-2 border">
                  <select
                    value={selection[item.erp_item_code] ?? ''}
                    onChange={(e) =>
                      setSelection({ ...selection, [item.erp_item_code]: e.target.value })
                    }
                    style={{ padding: '4px', color: '#000' }}
                  >
                    <option value="">-- 선택 --</option>
                    {skuOptions.map((sku) => (
                      <option key={sku.sku_id} value={sku.sku_id}>
                        {sku.sku_id} ({sku.sku_name})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border">
                  <button
                    onClick={() => handleSave(item)}
                    disabled={saving === item.erp_item_code}
                    style={{ padding: '4px 12px', border: '1px solid #333', borderRadius: '4px' }}
                  >
                    {saving === item.erp_item_code ? '저장 중...' : '저장'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
