import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type Sku = {
  sku_id: string
  brand_code: string
  sku_name: string
  pack_qty: number
  safety_stock_weeks: number
  shelf_life_months: number | null
  is_active: boolean
}

export default function SkuMasterManagement() {
  const [skus, setSkus] = useState<Sku[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<Sku>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newSku, setNewSku] = useState<Partial<Sku>>({
    brand_code: 'J2L',
    pack_qty: 1,
    safety_stock_weeks: 6,
    is_active: true,
  })

  useEffect(() => {
    fetchSkus()
  }, [])

  async function fetchSkus() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tb_sku_master')
      .select('*')
      .order('sku_id')
    if (error) console.error(error)
    setSkus((data as Sku[]) ?? [])
    setLoading(false)
  }

  function updateField(skuId: string, field: keyof Sku, value: any) {
    setEditing({
      ...editing,
      [skuId]: { ...editing[skuId], [field]: value },
    })
  }

  async function handleSaveRow(sku: Sku) {
    const changes = editing[sku.sku_id]
    if (!changes) return
    setSaving(sku.sku_id)
    const { error } = await supabase.from('tb_sku_master').update(changes).eq('sku_id', sku.sku_id)
    if (error) {
      console.error(error)
      alert('저장 실패: ' + error.message)
    }
    setSaving(null)
    setEditing({ ...editing, [sku.sku_id]: {} })
    fetchSkus()
  }

  async function handleCreate() {
    if (!newSku.sku_id || !newSku.sku_name) {
      alert('SKU ID와 SKU명은 필수입니다.')
      return
    }
    const { error } = await supabase.from('tb_sku_master').insert(newSku)
    if (error) {
      console.error(error)
      alert('등록 실패: ' + error.message)
      return
    }
    setNewSku({ brand_code: 'J2L', pack_qty: 1, safety_stock_weeks: 6, is_active: true })
    setShowForm(false)
    fetchSkus()
  }

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">SKU 마스터 관리</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '6px 14px', border: '1px solid #2563eb', color: '#2563eb', borderRadius: '6px' }}
        >
          {showForm ? '닫기' : '+ 새 SKU 추가'}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            border: '1px solid #2563eb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            placeholder="SKU ID (예: FA200)"
            value={newSku.sku_id ?? ''}
            onChange={(e) => setNewSku({ ...newSku, sku_id: e.target.value })}
            style={{ padding: '6px', color: '#000', width: '140px' }}
          />
          <select
            value={newSku.brand_code}
            onChange={(e) => setNewSku({ ...newSku, brand_code: e.target.value })}
            style={{ padding: '6px', color: '#000' }}
          >
            <option value="J2L">J2L (본케어)</option>
            <option value="J2LFA">J2LFA (본착한생리대)</option>
          </select>
          <input
            placeholder="SKU명"
            value={newSku.sku_name ?? ''}
            onChange={(e) => setNewSku({ ...newSku, sku_name: e.target.value })}
            style={{ padding: '6px', color: '#000', width: '220px' }}
          />
          <input
            type="number"
            placeholder="입수량"
            value={newSku.pack_qty ?? 1}
            onChange={(e) => setNewSku({ ...newSku, pack_qty: Number(e.target.value) })}
            style={{ padding: '6px', color: '#000', width: '90px' }}
          />
          <input
            type="number"
            placeholder="안전재고(주)"
            value={newSku.safety_stock_weeks ?? 6}
            onChange={(e) => setNewSku({ ...newSku, safety_stock_weeks: Number(e.target.value) })}
            style={{ padding: '6px', color: '#000', width: '110px' }}
          />
          <input
            type="number"
            placeholder="유통기한(개월)"
            value={newSku.shelf_life_months ?? ''}
            onChange={(e) => setNewSku({ ...newSku, shelf_life_months: Number(e.target.value) })}
            style={{ padding: '6px', color: '#000', width: '110px' }}
          />
          <button
            onClick={handleCreate}
            style={{ padding: '6px 14px', border: '1px solid #16a34a', color: '#16a34a', borderRadius: '6px' }}
          >
            등록
          </button>
        </div>
      )}

      <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">SKU ID</th>
            <th className="p-2 border">브랜드</th>
            <th className="p-2 border">SKU명</th>
            <th className="p-2 border">입수량</th>
            <th className="p-2 border">안전재고(주)</th>
            <th className="p-2 border">유통기한(개월)</th>
            <th className="p-2 border">저장</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => (
            <tr key={sku.sku_id}>
              <td className="p-2 border">{sku.sku_id}</td>
              <td className="p-2 border">{sku.brand_code}</td>
              <td className="p-2 border">{sku.sku_name}</td>
              <td className="p-2 border">
                <input
                  type="number"
                  defaultValue={sku.pack_qty}
                  onChange={(e) => updateField(sku.sku_id, 'pack_qty', Number(e.target.value))}
                  style={{ width: '70px', color: '#000', padding: '2px' }}
                />
              </td>
              <td className="p-2 border">
                <input
                  type="number"
                  defaultValue={sku.safety_stock_weeks}
                  onChange={(e) => updateField(sku.sku_id, 'safety_stock_weeks', Number(e.target.value))}
                  style={{ width: '70px', color: '#000', padding: '2px' }}
                />
              </td>
              <td className="p-2 border">
                <input
                  type="number"
                  defaultValue={sku.shelf_life_months ?? ''}
                  onChange={(e) => updateField(sku.sku_id, 'shelf_life_months', Number(e.target.value))}
                  style={{ width: '80px', color: '#000', padding: '2px' }}
                />
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => handleSaveRow(sku)}
                  disabled={saving === sku.sku_id || !editing[sku.sku_id]}
                  style={{ padding: '4px 12px', border: '1px solid #333', borderRadius: '4px' }}
                >
                  {saving === sku.sku_id ? '저장 중...' : '저장'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
