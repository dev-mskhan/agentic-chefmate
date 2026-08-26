import type { ReactNode } from 'react'

export function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto rounded-2xl bg-cream"><table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">{caption}</caption><thead className="border-b border-charcoal/10 text-xs uppercase tracking-[0.12em] text-charcoal-70"><tr>{headers.map((header) => <th className="px-4 py-3 font-semibold" key={header} scope="col">{header}</th>)}</tr></thead><tbody className="divide-y divide-charcoal/10">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td className="px-4 py-4" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
}
