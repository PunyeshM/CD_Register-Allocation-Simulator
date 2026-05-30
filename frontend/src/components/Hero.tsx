"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight, Github, Cpu, Network, Palette, FlaskConical,
  Brain, GitBranch, BarChart3, Clock, Terminal, Activity, Layers
} from "lucide-react"
import AnimatedBackground from "./AnimatedBackground"
import ScrollReveal from "./ScrollReveal"
import { Button } from "./ui/button"

const features = [
  { icon: Cpu, title: "LLVM IR Parsing", desc: "Parse real LLVM IR — add, sub, mul, phi, load, store, ret", color: "#06B6D4" },
  { icon: Network, title: "Interference Graphs", desc: "Interactive D3.js force-directed graph with event-driven animation", color: "#F59E0B" },
  { icon: Palette, title: "Graph Coloring", desc: "Chaitin, Linear Scan & Optimistic Coloring with step-by-step replay", color: "#22C55E" },
  { icon: FlaskConical, title: "Spill Detection", desc: "Pressure charts, spill triggers, and optimization suggestions", color: "#EF4444" },
  { icon: Brain, title: "5 AI Agents", desc: "Liveness, Coloring, Spill, Graph & Tutor agents explain every decision", color: "#8B5CF6" },
  { icon: GitBranch, title: "CFG Visualization", desc: "Control flow graph with loop detection and back-edge highlighting", color: "#22D3EE" },
  { icon: Clock, title: "Event Timeline", desc: "13 event types, replayable simulation with play/pause/scrub controls", color: "#A855F7" },
  { icon: Terminal, title: "Machine Code", desc: "Pseudo-assembly output with physical register names and spill code", color: "#10B981" },
]

const pipeline = [
  "LLVM IR", "CFG", "Liveness Analysis", "Interference Graph", "Register Allocation", "Machine Code"
]

const comparisons = [
  { label: "Chaitin Coloring", desc: "Conservative. Safe simplification, highest-degree spill heuristic.", color: "#06B6D4" },
  { label: "Linear Scan", desc: "Fast. Single pass over live intervals, spill longest-active.", color: "#8B5CF6" },
  { label: "Optimistic Coloring", desc: "Briggs variant. Fewer spills by attempting to color all candidates.", color: "#22C55E" },
]

export default function Hero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedBackground />

      {/* Hero section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pb-24">
        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent1/8 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-accent2/8 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 bg-reg-green/4 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-5xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent1/20 bg-accent1/5 px-4 py-1.5 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-accent1 animate-pulse" />
            <span className="text-xs text-accent1 font-mono">AI-Powered Compiler Visualization Platform 2.0</span>
          </motion.div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Visualize How Compilers
            <br />
            <span className="bg-gradient-to-r from-accent1 via-cyan-300 to-accent2 bg-clip-text text-transparent">
              Allocate Registers
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 mb-10 max-w-3xl mx-auto leading-relaxed">
            A research-grade, interactive compiler visualization platform with event-driven simulation,
            AI explanation agents, 3 allocation algorithms, CFG analysis, and step-by-step replay.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/simulator">
              <Button size="lg" className="group text-base gap-2 px-8">
                Launch Platform
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="https://github.com" target="_blank">
              <Button variant="outline" size="lg" className="text-base gap-2">
                <Github className="w-5 h-5" />
                Source Code
              </Button>
            </Link>
          </div>

          {/* Mini pipeline preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-14 flex items-center justify-center gap-2 flex-wrap"
          >
            {pipeline.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] font-mono text-white/70 hover:text-white hover:border-accent1/30 transition-all">
                  {stage}
                </div>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-white/20" />
                )}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Features grid */}
      <ScrollReveal className="relative z-10 px-4 sm:px-6 pb-24 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Everything You Need</h2>
          <p className="text-white/40 text-sm">Eight powerful visualization and analysis modules in one platform</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}08, transparent 70%)` }}
              />
              <div className="relative">
                <div
                  className="inline-flex p-2.5 rounded-xl mb-3 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${f.color}15` }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollReveal>

      {/* Algorithm comparison section */}
      <ScrollReveal className="relative z-10 px-4 sm:px-6 pb-24 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 sm:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent2/20 bg-accent2/5 px-4 py-1.5 mb-4">
              <BarChart3 className="w-3.5 h-3.5 text-accent2" />
              <span className="text-xs text-accent2 font-mono">Algorithm Comparison Mode</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">3 Algorithms, 1 Program</h2>
            <p className="text-white/40 text-sm max-w-lg mx-auto">
              See how Chaitin, Linear Scan, and Optimistic Coloring perform on the same IR — compare spill counts, steps, and register utilization.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparisons.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/5 p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: c.color }} />
                <h3 className="font-semibold text-white mb-2" style={{ color: c.color }}>{c.label}</h3>
                <p className="text-[11px] text-white/40">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* CTA */}
      <ScrollReveal className="relative z-10 px-4 sm:px-6 pb-24 text-center max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Explore?</h2>
        <p className="text-white/40 text-sm mb-8">
          Load your LLVM IR, watch 13 event types fire in real time, get instant AI explanations, and understand every compiler decision.
        </p>
        <Link href="/simulator">
          <Button size="lg" className="text-base gap-2 px-10">
            Open Simulator
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </ScrollReveal>
    </div>
  )
}
