import { useEffect, useState } from 'react'
import {
  Download,
  Search,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getAuditLogs,
  type AdminAuditLogRecord,
} from '../../services/api/adminService'

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AdminAuditLogRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getAuditLogs().then((res) => {
      setLogs(res)
    })
  }, [])

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <AdminShell
      eyebrow="Compliance & Governance"
      title="Platform Security Audit Log"
      actions={
        <button
          onClick={() => alert('Downloading immutable audit log archive (CSV)...')}
          className="rounded-pill bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Download size={14} /> Export Immutable Log
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Immutable Operator Actions Trail ({filteredLogs.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Cryptographically timestamped record of all administrative state mutations and security events.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search audit actions or targets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-pill bg-zinc-900 border border-zinc-800 pl-8 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-terracotta w-72"
            />
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#141417]">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 font-bold">Timestamp (PKT)</th>
                <th className="py-3.5 px-4 font-bold">Operator</th>
                <th className="py-3.5 px-4 font-bold">Action</th>
                <th className="py-3.5 px-4 font-bold">Target Entity & Details</th>
                <th className="py-3.5 px-4 font-bold">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 font-sans font-semibold">
                    {log.adminEmail}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-terracotta">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-sans text-zinc-200 font-semibold">
                    {log.targetEntity}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
