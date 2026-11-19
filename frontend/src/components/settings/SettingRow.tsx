import type { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  value?: string
  children: ReactNode
}

export function SettingRow({ label, value, children }: SettingRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">{label}</span>
        {value && <span className="text-[11px] tabular-nums text-muted-foreground">{value}</span>}
      </div>
      {children}
    </div>
  )
}
