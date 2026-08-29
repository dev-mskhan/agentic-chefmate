import { useState } from 'react'
import {
  CheckCircle2,
  Percent,
  Save,
  Server,
  Sliders,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'

export function AdminSettingsPage() {
  const [commissionRate, setCommissionRate] = useState('10')
  const [minOrderValue, setMinOrderValue] = useState('500')
  const [maxRadiusKm, setMaxRadiusKm] = useState('30')
  const [settlementDay, setSettlementDay] = useState('Friday')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 4000)
  }

  return (
    <AdminShell
      eyebrow="System Configuration"
      title="Platform Operations Settings"
      actions={
        <button
          onClick={handleSave}
          className="rounded-pill bg-terracotta hover:bg-terracotta-dark text-white px-5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Save size={14} /> Save Configuration
        </button>
      }
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {savedSuccess && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-400 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} /> Global configuration saved and broadcast to gateway nodes.
          </div>
        )}

        {/* Financial Policy */}
        <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Percent size={16} className="text-terracotta" /> Marketplace Commission & Fee Structure
          </h3>
          <p className="text-xs text-zinc-400">
            Configure platform service commissions deducted during automated order settlement.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Platform Commission Fee (%)
              </label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full rounded-pill border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-mono text-white outline-none focus:border-terracotta"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Minimum Order Value (PKR)
              </label>
              <input
                type="number"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="w-full rounded-pill border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-mono text-white outline-none focus:border-terracotta"
              />
            </div>
          </div>
        </div>

        {/* Logistics & Delivery Radius */}
        <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Sliders size={16} className="text-saffron" /> Logistics & Operating Boundaries
          </h3>
          <p className="text-xs text-zinc-400">
            Define system limits for delivery distance and weekly bank disbursement cycles.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Maximum Chef Delivery Radius (km)
              </label>
              <input
                type="number"
                value={maxRadiusKm}
                onChange={(e) => setMaxRadiusKm(e.target.value)}
                className="w-full rounded-pill border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-mono text-white outline-none focus:border-terracotta"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Automated Payout Day
              </label>
              <select
                value={settlementDay}
                onChange={(e) => setSettlementDay(e.target.value)}
                className="w-full rounded-pill border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white outline-none focus:border-terracotta"
              >
                <option value="Monday">Monday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Friday">Friday (Default)</option>
              </select>
            </div>
          </div>
        </div>

        {/* System Health & Maintenance */}
        <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Server size={16} className="text-emerald-400" /> Platform Maintenance & Emergency Controls
          </h3>

          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-xs font-bold text-white">Maintenance Mode</p>
              <p className="text-[11px] text-zinc-400">
                Temporarily pause new order placements while allowing active deliveries to settle.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                maintenanceMode ? 'bg-rose-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </form>
    </AdminShell>
  )
}
