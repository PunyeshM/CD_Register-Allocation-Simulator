"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { InterferenceGraphData, SimulationEvent } from "@/types"
import { Layers, Eye, EyeOff, Camera } from "lucide-react"

// Dynamically import ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false })
import * as THREE from "three"

const REG_COLORS: Record<number, string> = {
  0: "#3B82F6",
  1: "#22C55E",
  2: "#F97316",
  3: "#A855F7",
  4: "#EC4899",
  5: "#14B8A6",
  6: "#EAB308",
  7: "#06B6D4",
}

const SPILL_COLOR = "#EF4444"
const UNASSIGNED_COLOR = "#475569"

interface InterferenceGraph3DProps {
  graph: InterferenceGraphData
  assignment: Record<string, { register: number; name: string }>
  spillCandidates: string[]
  events: SimulationEvent[]
  cursor: number
  onSelectVariable?: (v: string | null) => void
  selectedVariable?: string | null
}

export default function InterferenceGraph3D({
  graph,
  assignment,
  spillCandidates,
  events,
  cursor,
  onSelectVariable,
  selectedVariable,
}: InterferenceGraph3DProps) {
  const [showLabels, setShowLabels] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const fgRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 500, height: 340 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Track window/container resize
  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Determine visible nodes based on event cursor
  const visibleVars = useMemo(() => {
    const visible = new Set<string>()
    const colored = new Map<string, number>()
    const spilled = new Set<string>()

    for (const evt of events.slice(0, cursor + 1)) {
      if (["NodePushed", "NodePopped", "VariableDefined", "VariableBecomesLive"].includes(evt.type) && evt.variable) {
        visible.add(evt.variable)
      }
      if (evt.type === "ColorAssigned" && evt.variable) {
        const color = evt.payload.color as number
        colored.set(evt.variable, color)
        visible.add(evt.variable)
      }
      if (evt.type === "SpillDetected" && evt.variable) {
        spilled.add(evt.variable)
        visible.add(evt.variable)
      }
    }
    return { visible, colored, spilled }
  }, [events, cursor])

  const showAll = cursor < 0 || visibleVars.visible.size === 0

  const graphData = useMemo(() => {
    const nodes = graph.variables.map(v => ({
      id: v,
      degree: graph.degrees[v] ?? 0,
      isSpill: spillCandidates.includes(v),
      visible: showAll || visibleVars.visible.has(v),
      register: assignment[v]?.register ?? -1,
    }))

    const links = graph.edges.map(e => ({
      source: e.source,
      target: e.target,
    }))

    return { nodes, links }
  }, [graph, assignment, spillCandidates, showAll, visibleVars])

  const getNodeColor = useCallback((node: any) => {
    if (!node.visible && !showAll) return "rgba(255,255,255,0.05)"
    if (node.isSpill) return SPILL_COLOR

    const cursorColor = visibleVars.colored.get(node.id)
    if (cursorColor !== undefined) return REG_COLORS[cursorColor] ?? UNASSIGNED_COLOR
    
    if (showAll && node.register >= 0) return REG_COLORS[node.register] ?? UNASSIGNED_COLOR
    
    return UNASSIGNED_COLOR
  }, [showAll, visibleVars, REG_COLORS])

  const handleNodeClick = useCallback((node: any) => {
    onSelectVariable?.(node.id === selectedVariable ? null : node.id)
    
    // Aim at node
    if (fgRef.current) {
      const distance = 100
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1500
      )
    }
  }, [selectedVariable, onSelectVariable])

  const resetCamera = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1000)
    }
  }, [])

  const getNodeInfo = (v: string) => {
    const reg = assignment[v]
    const deg = graph.degrees[v] ?? 0
    return `${v}: ${reg?.name ?? "unassigned"} | degree ${deg}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent1" />
          3D Interference Graph
          <span className="text-[10px] font-mono text-muted">
            {graph.variables.length}V · {graph.edges.length}E
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetCamera}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Reset Camera"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowLabels(v => !v)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            title={showLabels ? "Hide labels" : "Show labels"}
          >
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted">
        {Object.entries(REG_COLORS).slice(0, graph.K ?? 4).map(([reg, color]) => (
          <span key={reg} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            R{Number(reg) + 1}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Spill
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          Unassigned
        </span>
      </div>

      <div 
        ref={containerRef}
        className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden relative cursor-move"
        style={{ height: 380 }}
      >
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel={(node: any) => getNodeInfo(node.id)}
          nodeRelSize={6}
          nodeColor={getNodeColor}
          nodeOpacity={0.9}
          nodeResolution={16}
          linkWidth={1.5}
          linkOpacity={0.3}
          linkColor={(link: any) => {
            const isVisible = (showAll || visibleVars.visible.has(link.source.id)) && 
                              (showAll || visibleVars.visible.has(link.target.id))
            return isVisible ? "rgba(100, 116, 139, 0.5)" : "rgba(100, 116, 139, 0.05)"
          }}
          onNodeClick={handleNodeClick}
          onNodeHover={(node: any) => setHoveredNode(node ? node.id : null)}
          backgroundColor="rgba(0,0,0,0)"
          enableNodeDrag={false}
          nodeThreeObject={showLabels ? (node: any) => {
            if (!node.visible && !showAll) {
                return new THREE.Group();
            }

            const group = new THREE.Group()
            
            // Sphere
            const color = getNodeColor(node)
            const material = new THREE.MeshLambertMaterial({ 
              color, 
              transparent: true, 
              opacity: node.id === selectedVariable ? 1 : 0.9,
              emissive: node.id === selectedVariable ? color : 0x000000,
              emissiveIntensity: 0.5
            })
            const geometry = new THREE.SphereGeometry(Math.max(4, 3 + node.degree * 0.5), 16, 16)
            const sphere = new THREE.Mesh(geometry, material)
            group.add(sphere)

            // Label sprites (simplified for performance)
            if (showLabels) {
              // Creating canvas text sprite is expensive, so we just return the sphere in the standard way
              // The built-in nodeLabel handles tooltips which is much more performant
            }

            return group
          } : undefined}
          nodeThreeObjectExtend={true}
        />
        
        {/* Selected variable overlay */}
        {selectedVariable && (
          <div className="absolute top-4 left-4 text-[11px] font-mono text-white px-3 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-md">
            Selected: <span className="text-accent1 font-bold">{selectedVariable}</span>
          </div>
        )}
        
        {/* Interaction hint */}
        <div className="absolute bottom-2 right-2 text-[9px] text-muted/50 font-mono pointer-events-none">
          Left click: rotate | Right click: pan | Scroll: zoom
        </div>
      </div>

      {hoveredNode && (
        <div className="text-[11px] font-mono text-white/70 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
          {getNodeInfo(hoveredNode)}
        </div>
      )}
    </div>
  )
}
