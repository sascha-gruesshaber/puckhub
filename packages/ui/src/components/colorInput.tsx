import { Input } from "./input"

interface ColorInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

function ColorInput({ value, onChange, className }: ColorInputProps) {
  return (
    <div className={className ?? "flex gap-2"}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 cursor-pointer rounded border border-input p-1"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={value}
        className="font-mono text-sm"
      />
    </div>
  )
}

export { ColorInput, type ColorInputProps }
