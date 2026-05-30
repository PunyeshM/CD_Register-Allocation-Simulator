import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSet(s: Set<string> | string[]): string {
  const arr = s instanceof Set ? Array.from(s) : s
  if (arr.length === 0) return "∅"
  return "{ " + arr.join(", ") + " }"
}

export function getRegisterName(reg: number): string {
  const names = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]
  return reg >= 0 && reg < names.length ? names[reg] : "SPILL"
}

export function getRegisterColor(reg: number): string {
  const colors = [
    "#3B82F6", "#22C55E", "#F97316", "#A855F7",
    "#EF4444", "#EC4899", "#14B8A6", "#EAB308",
  ]
  return reg >= 0 && reg < colors.length ? colors[reg] : "#EF4444"
}
