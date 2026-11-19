import { Pipette } from 'lucide-react'
import { useState } from 'react'

interface ColorFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

const PRESETS = [
  '#C0392B', '#8E2B2B', '#E8A33D', '#4A8B5C', '#579A6B',
  '#2C2C2C', '#333333', '#FFFFFF', '#FDF9F0', '#000000',
]

export function ColorField({ label, value, onChange, disabled }: ColorFieldProps) {
  const [showEyedropperHint, setShowEyedropperHint] = useState(false)

  const pickColor = async () => {
    const EyeDropperCtor = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper
    if (!EyeDropperCtor) {
      setShowEyedropperHint(true)
      setTimeout(() => setShowEyedropperHint(false), 2500)
      return
    }
    try {
      const picker = new EyeDropperCtor()
      const result = await picker.open()
      onChange(result.sRGBHex)
    } catch {
      // 用户取消取色
    }
  }

  return (
    <div className="space-y-2" style={{ opacity: disabled ? 0.5 : 1 }}>
      <div className="flex items-center justify-between">
        <span className="text-xs">{label}</span>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">{value}</span>
          <button
            onClick={pickColor}
            disabled={disabled}
            className="rounded p-1 text-muted-foreground hover:bg-sage-50 hover:text-primary"
            title="屏幕取色"
          >
            <Pipette className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-9 cursor-pointer rounded border border-border bg-white p-0.5"
        />
        <div className="flex flex-1 flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              disabled={disabled}
              className="h-5 w-5 rounded border border-black/10 transition-transform hover:scale-110"
              style={{ background: p }}
              title={p}
            />
          ))}
        </div>
      </div>
      {showEyedropperHint && (
        <p className="text-[10px] text-amber-600">当前浏览器不支持屏幕取色，请使用颜色块或输入框。</p>
      )}
    </div>
  )
}
