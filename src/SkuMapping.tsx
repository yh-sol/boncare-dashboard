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
  const [autoRegistering, setAutoRegistering] = useState(false)

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

    const { data: shipments, error: shipmentError } = await supabase
      .from('tb_erp_shipment')
      .select('erp_item_code, raw_row_json')
      .is('sku_id', null)
    if (shipmentError) console.error(shipmentError)

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

  // 엑셀의 품목코드/품목명을 그대로 사용해 미매칭 품목 전체를 한 번에 SKU로 자동 등록
  async function handleAutoRegisterAll() {
    if (unmatched.length === 0) return
    const confirmed = window.confirm(
      `미매칭 품목 ${unmatched.length}건을 품목코드=SKU ID, 품목명=SKU명으로 일괄 등록하시겠습니까?\n(안전재고 주수는 기본값 6주로 설정되며, 나중에 SKU 마스터 관리 화면에서 수정 가능합니다.)`
    )
    if (!confirmed) return

    setAutoRegistering(true)

    // 1) SKU 마스터에 일괄 등록 (이미 있으면 건너뜀)
    const skuRows = unmatched.map((item) => ({
      sku_id: item.erp_item_code,
      brand_code: 'J2L',
      sku_name: item.erp_item_name,
      pack_qty: 1,
      safety_stock_weeks: 6,
      is_active: true,
    }))
    const { error: skuError } = await supabase
      .from('tb_sku_master')
      .upsert(skuRows, { onConflict: 'sku_id', ignoreDuplicates: true })
    if (skuError) {
      console.error(skuError)
      alert('SKU 자동 등록 실패: ' + skuError.message)
      setAutoRegistering(false)
      return
    }

    // 2) 매핑표에 1:1 연결 등록
    const mappingRows = unmatched.map((item) => ({
      erp_item_code: item.erp_item_code,
      erp_item_name: item.erp_item_name,
      sku_id: item.erp_item_code,
      is_confirmed: true,
      mapped_at: new Date().toISOString(),
    }))
    const { error: mapError } = await supabase
      .from('tb_erp_mapping')
      .upsert(mappingRows, { onConflict: 'erp_item_code' })
    if (mapError) {
      console.error(mapError)
      alert('매핑 자동 등록 실패: ' + mapError.message)
      setAutoRegistering(false)
      return
    }

    // 3) 기존 출고이력에 sku_id 소급 연결
    for (const item of unmatched) {
      await supabase
        .from('tb_erp_shipment')
        .update({ sku_id: item.erp_item_code })
        .eq('erp_item_code', item.erp_item_code)
        .is('sku_id', null)
    }

    setAutoRegistering(false)
    alert(`${unmatched.length}건 자동 등록 완료!`)
    fetchAll()
  }

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">SKU 매핑 관리</h1>
        {unmatched.length > 0 && (
          <button
            onClick={handleAutoRegisterAll}
            disabled={autoRegistering}
            style={{
              padding: '8px 16px',
              border: '1px solid #16a34a',
              color: '#16a34a',
              borderRadius: '6px',
              fontWeight: 'bold',
            }}
          >
            {autoRegistering ? '등록 중...' : `미매칭 ${unmatched.length}건 전체 자동 등록`}
          </button>
        )}
      </div>

      {unmatched.length === 0 ? (
        <p style={{ color: '#888' }}>미매칭 품목이 없습니다. 모두 연결되어 있습니다.</p>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            위 버튼을 누르면 품목코드를 그대로 SKU ID로, 품목명을 SKU명으로 써서 한 번에 등록합니다.
            개별적으로 기존 SKU에 연결하고 싶다면 아래에서 직접 선택해주세요.
          </p>
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
                      style={{ padding: '4px', color: '#000', background: '#fff' }}
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
        </>
      )}
    </div>
  )
}
