// ============================================================
// EventEngine.ts — Event-Driven Simulation Core
// ============================================================
import { SimulationEvent, EventType } from "@/types"

let _eventCounter = 0

function makeId(): string {
  return `evt-${++_eventCounter}-${Date.now()}`
}

// -----------------------------------------------------------
// EventStore — append-only event log
// -----------------------------------------------------------
export class EventStore {
  private events: SimulationEvent[] = []

  emit(
    type: EventType,
    phase: SimulationEvent["phase"],
    payload: Record<string, unknown>,
    opts: Partial<Pick<SimulationEvent, "instructionId" | "variable" | "explanation">> = {}
  ): SimulationEvent {
    const event: SimulationEvent = {
      id: makeId(),
      type,
      timestamp: Date.now(),
      phase,
      payload,
      ...opts,
    }
    this.events.push(event)
    return event
  }

  getAll(): SimulationEvent[] {
    return [...this.events]
  }

  getByType(type: EventType): SimulationEvent[] {
    return this.events.filter((e) => e.type === type)
  }

  getByVariable(variable: string): SimulationEvent[] {
    return this.events.filter((e) => e.variable === variable)
  }

  getByPhase(phase: SimulationEvent["phase"]): SimulationEvent[] {
    return this.events.filter((e) => e.phase === phase)
  }

  clear(): void {
    this.events = []
    _eventCounter = 0
  }

  get length(): number {
    return this.events.length
  }
}

// -----------------------------------------------------------
// EventPlayer — cursor-based playback controller
// -----------------------------------------------------------
export class EventPlayer {
  private store: EventStore
  private _cursor: number = -1
  private _playing: boolean = false
  private _speed: number = 1
  private _timer: ReturnType<typeof setTimeout> | null = null
  private _onStep?: (event: SimulationEvent, index: number) => void
  private _onComplete?: () => void

  constructor(store: EventStore) {
    this.store = store
  }

  get cursor(): number {
    return this._cursor
  }

  get isPlaying(): boolean {
    return this._playing
  }

  get speed(): number {
    return this._speed
  }

  get totalEvents(): number {
    return this.store.length
  }

  get currentEvent(): SimulationEvent | null {
    const all = this.store.getAll()
    return this._cursor >= 0 && this._cursor < all.length ? all[this._cursor] : null
  }

  get eventsUpToCursor(): SimulationEvent[] {
    return this.store.getAll().slice(0, this._cursor + 1)
  }

  onStep(cb: (event: SimulationEvent, index: number) => void): this {
    this._onStep = cb
    return this
  }

  onComplete(cb: () => void): this {
    this._onComplete = cb
    return this
  }

  setSpeed(speed: number): void {
    this._speed = Math.max(0.25, Math.min(8, speed))
  }

  jump(index: number): void {
    const all = this.store.getAll()
    this._cursor = Math.max(-1, Math.min(all.length - 1, index))
    if (this._cursor >= 0 && this._onStep) {
      this._onStep(all[this._cursor], this._cursor)
    }
  }

  next(): boolean {
    const all = this.store.getAll()
    if (this._cursor >= all.length - 1) {
      this._playing = false
      this._onComplete?.()
      return false
    }
    this._cursor++
    this._onStep?.(all[this._cursor], this._cursor)
    return true
  }

  prev(): boolean {
    if (this._cursor <= 0) {
      this._cursor = -1
      return false
    }
    this._cursor--
    const all = this.store.getAll()
    this._onStep?.(all[this._cursor], this._cursor)
    return true
  }

  play(): void {
    if (this._playing) return
    this._playing = true
    this._tick()
  }

  pause(): void {
    this._playing = false
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
  }

  reset(): void {
    this.pause()
    this._cursor = -1
  }

  private _tick(): void {
    if (!this._playing) return
    const advanced = this.next()
    if (!advanced) {
      this._playing = false
      return
    }
    const delay = 600 / this._speed
    this._timer = setTimeout(() => this._tick(), delay)
  }
}

// -----------------------------------------------------------
// ReplayController — high-level replay state
// -----------------------------------------------------------
export interface ReplayState {
  cursor: number
  totalEvents: number
  currentEvent: SimulationEvent | null
  phase: SimulationEvent["phase"] | "idle"
  isPlaying: boolean
  speed: number
  progressPct: number
}

export class ReplayController {
  readonly store: EventStore
  readonly player: EventPlayer

  constructor() {
    this.store = new EventStore()
    this.player = new EventPlayer(this.store)
  }

  getState(): ReplayState {
    const total = this.store.length
    const cursor = this.player.cursor
    return {
      cursor,
      totalEvents: total,
      currentEvent: this.player.currentEvent,
      phase: this.player.currentEvent?.phase ?? "idle",
      isPlaying: this.player.isPlaying,
      speed: this.player.speed,
      progressPct: total > 0 ? ((cursor + 1) / total) * 100 : 0,
    }
  }

  reset(): void {
    this.store.clear()
    this.player.reset()
  }
}
