"use client"

import { useState } from "react"
import { Play, RotateCcw, FileCode, Plus, Minus } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

const EXAMPLES = [
  {
    name: "Simple (4 regs)",
    ir: `define i32 @simple(i32 %a, i32 %b, i32 %c, i32 %d) {
entry:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
}`,
  },
  {
    name: "Spill Required (2 regs)",
    ir: `define i32 @spill_test(i32 %a, i32 %b, i32 %c, i32 %d, i32 %e, i32 %f) {
entry:
  %1 = add i32 %a, %b
  %2 = add i32 %1, %c
  %3 = add i32 %2, %d
  %4 = add i32 %3, %e
  %5 = add i32 %4, %f
  ret i32 %5
}`,
  },
  {
    name: "Chain",
    ir: `define i32 @chain(i32 %x, i32 %y) {
entry:
  %1 = add i32 %x, %y
  %2 = mul i32 %1, %x
  %3 = sub i32 %2, %y
  %4 = add i32 %3, %1
  %5 = mul i32 %4, %x
  ret i32 %5
}`,
  },
  {
    name: "High Pressure",
    ir: `define i32 @high_pressure(i32 %a, i32 %b, i32 %c, i32 %d, i32 %e, i32 %f, i32 %g) {
entry:
  %1 = add i32 %a, %b
  %2 = add i32 %c, %d
  %3 = add i32 %e, %f
  %4 = add i32 %1, %2
  %5 = add i32 %3, %4
  %6 = add i32 %5, %g
  ret i32 %6
}`,
  },
]

interface IREditorProps {
  value: string
  onChange: (val: string) => void
  onRun: () => void
  registerCount: number
  onRegisterCountChange: (n: number) => void
  disabled?: boolean
}

export default function IREditor({
  value,
  onChange,
  onRun,
  registerCount,
  onRegisterCountChange,
  disabled,
}: IREditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onRun()
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={onRun} disabled={disabled} className="gap-2">
          <Play className="w-4 h-4" />
          Run
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange("")}
          disabled={disabled}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="h-6 w-px bg-white/10 mx-1" />
        <span className="text-xs text-muted font-mono mr-2">Register Count:</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-7 h-7 p-0"
            onClick={() => onRegisterCountChange(Math.max(1, registerCount - 1))}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-sm font-mono text-white w-6 text-center">{registerCount}</span>
          <Button
            size="sm"
            variant="ghost"
            className="w-7 h-7 p-0"
            onClick={() => onRegisterCountChange(Math.min(8, registerCount + 1))}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex-1 min-h-[200px]">
        <div className="absolute inset-0 rounded-lg border border-white/10 bg-[#0a0e1a] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface/50">
            <FileCode className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs text-muted font-mono">input.ll</span>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-[calc(100%-36px)] bg-transparent text-sm font-mono text-white/90 p-4 resize-none focus:outline-none focus:ring-0 placeholder:text-white/10"
            placeholder="; Enter LLVM IR here..."
            spellCheck={false}
          />
        </div>
      </div>

      {/* Examples */}
      <div>
        <span className="text-xs text-muted font-mono mb-2 block">Examples:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              onClick={() => onChange(ex.ir)}
              className="text-left text-xs text-white/50 hover:text-white/80 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg px-3 py-2 border border-white/5 hover:border-white/10 transition-all truncate"
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
