// ============================================================
// LivenessAgent.ts — Rule-based liveness explainer
// ============================================================
import { LiveSet, ParsedInstruction, AgentExplanation } from "@/types"

export class LivenessAgent {
  private instructions: ParsedInstruction[]
  private liveSets: LiveSet[]
  private liveRanges: Record<string, number[]>

  constructor(
    instructions: ParsedInstruction[],
    liveSets: LiveSet[],
    liveRanges: Record<string, number[]>
  ) {
    this.instructions = instructions
    this.liveSets = liveSets
    this.liveRanges = liveRanges
  }

  explainVariable(variable: string): AgentExplanation {
    const range = this.liveRanges[variable]
    if (!range || range.length === 0) {
      return {
        agent: "liveness",
        subject: variable,
        title: `${variable} — Not Found`,
        text: `Variable ${variable} was not found in the liveness analysis. It may not be a virtual register.`,
        confidence: "low",
      }
    }

    const start = range[0]
    const end = range[range.length - 1]
    const definedAt = this.liveSets.findIndex(s => s.def.includes(variable))
    const usedAt = this.instructions
      .filter(i => i.operands.includes(variable))
      .map(i => i.id)

    const defInst = definedAt >= 0 ? this.instructions[definedAt] : null
    const lastUseInst = usedAt.length > 0 ? this.instructions[usedAt[usedAt.length - 1]] : null

    const tips: string[] = []
    if (end - start > 3) {
      tips.push(`${variable} has a long live range (${end - start + 1} instructions). This increases interference chances.`)
    }
    if (usedAt.length > 2) {
      tips.push(`${variable} is used ${usedAt.length} times — heavily used variables are better candidates to keep in registers.`)
    }

    return {
      agent: "liveness",
      subject: variable,
      title: `Liveness of ${variable}`,
      text: defInst
        ? `${variable} is first defined at instruction ${definedAt} ("${defInst.text}") and remains live until instruction ${end}${lastUseInst ? ` ("${lastUseInst.text}")` : ""}. Its live range spans instructions ${start}–${end} (${end - start + 1} instruction${end - start !== 0 ? "s" : ""}).`
        : `${variable} has a live range from instruction ${start} to ${end}.`,
      detail: usedAt.length > 0
        ? `Uses: at instruction${usedAt.length > 1 ? "s" : ""} ${usedAt.join(", ")}`
        : `No explicit uses recorded (may be a function parameter).`,
      tips,
      relatedVariables: this.getInterferingVars(variable),
      confidence: "high",
    }
  }

  explainLiveIn(variable: string, instructionId: number): AgentExplanation {
    const set = this.liveSets[instructionId]
    if (!set) return this.notFound(variable)

    const isLiveIn = set.liveIn.includes(variable)
    if (!isLiveIn) {
      return {
        agent: "liveness",
        subject: variable,
        title: `${variable} not live-in at I${instructionId}`,
        text: `${variable} is NOT live at the entry of instruction ${instructionId}. Either it hasn't been defined yet, or it won't be used again after this point.`,
        confidence: "high",
      }
    }

    const usedLater = this.liveSets.slice(instructionId + 1).some(s => s.use.includes(variable))
    const reason = usedLater
      ? `${variable} is live-in at instruction ${instructionId} because it is used again later in the program and has not been redefined between its last definition and this point.`
      : `${variable} is live-in at instruction ${instructionId} because it flows through from the previous instruction's live-out set.`

    return {
      agent: "liveness",
      subject: variable,
      title: `${variable} is Live-In at I${instructionId}`,
      text: reason,
      detail: `LIVE_IN[${instructionId}] = {${set.liveIn.join(", ")}}`,
      confidence: "high",
    }
  }

  explainLiveOut(variable: string, instructionId: number): AgentExplanation {
    const set = this.liveSets[instructionId]
    if (!set) return this.notFound(variable)

    const isLiveOut = set.liveOut.includes(variable)
    const inst = this.instructions[instructionId]

    if (!isLiveOut) {
      return {
        agent: "liveness",
        subject: variable,
        title: `${variable} not live-out at I${instructionId}`,
        text: `${variable} is NOT live at the exit of instruction ${instructionId} ("${inst?.text}"). It either dies here (last use) or hasn't started its live range yet.`,
        confidence: "high",
      }
    }

    const nextUse = this.liveSets.slice(instructionId + 1).findIndex(s => s.use.includes(variable))
    return {
      agent: "liveness",
      subject: variable,
      title: `${variable} is Live-Out at I${instructionId}`,
      text: `${variable} is live-out at instruction ${instructionId} because it will be used again${nextUse >= 0 ? ` at instruction ${instructionId + 1 + nextUse}` : " in a successor"}.`,
      detail: `LIVE_OUT[${instructionId}] = {${set.liveOut.join(", ")}}`,
      confidence: "high",
    }
  }

  explainDeath(variable: string): AgentExplanation {
    const range = this.liveRanges[variable]
    if (!range || range.length === 0) return this.notFound(variable)

    const deathPoint = range[range.length - 1]
    const deathInst = this.instructions[deathPoint]

    return {
      agent: "liveness",
      subject: variable,
      title: `${variable} Dies at I${deathPoint}`,
      text: `${variable} dies at instruction ${deathPoint} ("${deathInst?.text}"). This is its last use — after this point, no instruction reads ${variable}, so the register holding it can be reused.`,
      detail: `After instruction ${deathPoint}, ${variable} is no longer in any live-in or live-out set.`,
      confidence: "high",
    }
  }

  private getInterferingVars(variable: string): string[] {
    const range = this.liveRanges[variable] || []
    const interfering = new Set<string>()
    for (const i of range) {
      const set = this.liveSets[i]
      if (!set) continue
      for (const v of [...set.liveIn, ...set.liveOut]) {
        if (v !== variable) interfering.add(v)
      }
    }
    return Array.from(interfering)
  }

  private notFound(variable: string): AgentExplanation {
    return {
      agent: "liveness",
      subject: variable,
      title: "Variable Not Found",
      text: `Could not find liveness information for ${variable}.`,
      confidence: "low",
    }
  }
}
