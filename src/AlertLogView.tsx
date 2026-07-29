import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type AlertLog = {
  alert_id: number
  sku_id: string
  warehouse_code: string
  alert_type: string
  weeks_remaining_at_alert: number | null
  message: string
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
}

const TYPE_LABEL: Record<string, string> = {
  CRITICAL: '🔴 위험',
  WARNING_1: '🟠 주의-긴급',
  WARNING_2: '🟡 주의-일반',
}

export default function AlertLogView() {
  const [logs, setLogs] = useState<AlertLog[]>([])
  const [showResolved, setShowResolved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [showResolved])

  async function fetchLogs() {
    setLoading(true)
    let query = supabase.from('tb_alert_log').select('*').order('created_at', { ascending: false })
    if (!showResolved) query = query.eq('is_resolved', false)
    const { data, error } = await query
    if (error) console.error(error)
    setLogs((data as AlertLog[]) ?? [])
    setLoading(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">알림 로그</h1>
        <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          해소된 알림도 보기
        </label>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#888' }}>
          {showResolved ? '알림 이력이 없습니다.' : '현재 미해소 알림이 없습니다.'}
        </p>
      ) : (
        <table className="w-full border" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">유형</th>
              <th className="p-2 border">메시지</th>
              <th className="p-2 border">발생일시</th>
              <th className="p-2 border">해소일시</th>
              <th className="p-2 border">상태</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.alert_id} style={{ opacity: log.is_resolved ? 0.5 : 1 }}>
                <td className="p-2 border">{log.sku_id}</td>
                <td className="p-2 border">{TYPE_LABEL[log.alert_type] ?? log.alert_type}</td>
                <td className="p-2 border">{log.message}</td>
                <td className="p-2 border">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                <td className="p-2 border">
                  {log.resolved_at ? new Date(log.resolved_at).toLocaleString('ko-KR') : '-'}
                </td>
                <td className="p-2 border">{log.is_resolved ? '해소됨' : '진행중'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
