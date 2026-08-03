import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type Lot = {
  lot_id: number
  sku_id: string
  warehouse_code: string
  lot_number: string | null
  manufacture_date: string | null
  qty_pcs: number
  created_at: string
}

type SkuOption = { sku_id: string; sku_name: string }

const inputStyle = { color: '#000', background: '#fff', padding: '4px' }

export default function InventoryLotManagement() {
  const [lots, setLots] = useState<Lot[]>([])
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSku, setFilterSku] = useState('')

  const [form, setForm] = useState({
    sku_id: '',
    warehouse_code: 'GANGCHON',
    lot_number: '',
    manufacture_date: '',
    qty_pcs: 0,
  })

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [lotRes, skuRes] = await Promise.all([
      supabase.from('tb_inventory_lot').select('*').order('manufacture_date', { ascending: true }),
      supabase.from('tb_sku_master').select('sku_id, sku_name').eq('is_active', true).order('sku_id'),
    ])
    if (lotRes.error) console.error(lotRes.error)
    if (skuRes.error) console.error(skuRes.error)
    setLots((lotRes.data as Lot[]) ?? [])
    setSkuOptions((skuRes.data as SkuOption[]) ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.sku_id || !form.warehouse_code || !form.manufacture_date || !form.qty_pcs) {
      alert('SKU, 창고, 제조일자, 수량은 필수입니다.')
      return
    }
    const { error } = await supabase.from('tb_inventory_lot').insert({
      sku_id: form.sku_id,
      warehouse_code: form.warehouse_code,
      lot_number: form.lot_number || null,
      manufacture_date: form.manufacture_date,
      qty_pcs: form.qty_pcs,
    })
    if (error) {
      console.error(error)
      alert('등록 실패: ' + error.message)
      return
    }
    setForm({ ...form, lot_number: '', manufacture_date: '', qty_pcs: 0 })
    fetchAll()
  }

  async function handleDelete(lotId: number) {
    if (!window.confirm('이 LOT을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('tb_inventory_lot').delete().eq('lot_id', lotId)
    if (error) {
      console.error(error)
      alert('삭제 실패: ' + error.message)
      return
    }
    fetchAll()
  }

  const displayLots = filterSku ? lots.filter((l) => l.sku_id === filterSku) : lots

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">생산 LOT별 재고 관리</h1>

      {/* LOT 추가 폼 */}
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
        <select
          value={form.sku_id}
          onChange={(e) => setForm({ ...form, sku_id: e.target.value })}
          style={{ ...inputStyle, width: '220px' }}
        >
          <option value="">-- SKU 선택 --</option>
          {skuOptions.map((s) => (
            <option key={s.sku_id} value={s.sku_id}>
              {s.sku_id} ({s.sku_name})
            </option>
          ))}
        </select>
        <input
          placeholder="창고코드 (예: GANGCHON)"
          value={form.warehouse_code}
          onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })}
          style={{ ...inputStyle, width: '130px' }}
        />
        <input
          placeholder="LOT 번호 (선택)"
          value={form.lot_number}
          onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
          style={{ ...inputStyle, width: '120px' }}
        />
        <input
          type="date"
          value={form.manufacture_date}
          onChange={(e) => setForm({ ...form, manufacture_date: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="수량(Pcs)"
          value={form.qty_pcs || ''}
          onChange={(e) => setForm({ ...form, qty_pcs: Number(e.target.value) })}
          style={{ ...inputStyle, width: '100px' }}
        />
        <button
          onClick={handleAdd}
          style={{ padding: '6px 14px', border: '1px solid #16a34a', color: '#16a34a', borderRadius: '6px' }}
        >
          LOT 등록
        </button>
      </div>

      {/* SKU 필터 */}
      <div style={{ marginBottom: '12px' }}>
        <select
          value={filterSku}
          onChange={(e) => setFilterSku(e.target.value)}
          style={{ ...inputStyle, width: '220px' }}
        >
          <option value="">전체 SKU 보기</option>
          {skuOptions.map((s) => (
            <option key={s.sku_id} value={s.sku_id}>
              {s.sku_id} ({s.sku_name})
            </option>
          ))}
        </select>
      </div>

      {displayLots.length === 0 ? (
        <p style={{ color: '#888' }}>등록된 LOT이 없습니다.</p>
      ) : (
        <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">창고</th>
              <th className="p-2 border">LOT번호</th>
              <th className="p-2 border">제조일자</th>
              <th className="p-2 border">수량(Pcs)</th>
              <th className="p-2 border">삭제</th>
            </tr>
          </thead>
          <tbody>
            {displayLots.map((lot) => (
              <tr key={lot.lot_id}>
                <td className="p-2 border">{lot.sku_id}</td>
                <td className="p-2 border">{lot.warehouse_code}</td>
                <td className="p-2 border">{lot.lot_number ?? '-'}</td>
                <td className="p-2 border">{lot.manufacture_date ?? '미상(스냅샷)'}</td>
                <td className="p-2 border">{lot.qty_pcs}</td>
                <td className="p-2 border">
                  <button
                    onClick={() => handleDelete(lot.lot_id)}
                    style={{ padding: '4px 12px', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '4px' }}
                  >
                    삭제
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
