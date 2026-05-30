"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Github, Cpu, Network, Palette, FlaskConical } from "lucide-react"
import AnimatedBackground from "./AnimatedBackground"
import ScrollReveal from "./ScrollReveal"
import { Button } from "./ui/button"

const features = [
  { icon: Cpu, title: "LLVM IR Parsing", desc: "Parse real LLVM intermediate representation" },
  { icon: Network, title: "Interference Graphs", desc: "Visualize variable interference with D3.js" },
  { icon: Palette, title: "Graph Coloring", desc: "Chaitin's algorithm for register assignment" },
  { icon: FlaskConical, title: "Spill Detection", desc: "Detect when registers are insufficient" },
]

export default function Hero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6">
        {/* Gradient Orbs - smaller on mobile */}
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-accent1/10 rounded-full blur-2xl sm:blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-accent2/10 rounded-full blur-2xl sm:blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-accent1/20 bg-accent1/5 px-3 sm:px-4 py-1 sm:py-1.5 mb-6 sm:mb-8">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent1 animate-pulse" />
            <span className="text-[10px] sm:text-xs text-accent1 font-mono">LLVM Graph Coloring Register Allocator</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Visualize How Compilers
            <br />
            <span className="bg-gradient-to-r from-accent1 via-cyan-300 to-accent2 bg-clip-text text-transparent">
              Allocate Registers
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-white/50 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
            An interactive simulator that brings compiler register allocation to life.
            Watch liveness analysis, interference graphs, and Chaitin graph coloring in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/simulator" className="w-full sm:w-auto">
              <Button size="lg" className="group text-sm sm:text-base w-full sm:w-auto">
                Start Simulation
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="https://github.com" target="_blank" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="text-sm sm:text-base w-full sm:w-auto">
                <Github className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                Source Code
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <ScrollReveal className="w-full max-w-5xl mt-12 sm:mt-16 md:mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-4 sm:p-5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-accent1/20 to-accent2/20 group-hover:from-accent1/30 group-hover:to-accent2/30 transition-all">
                    <f.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent1" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white">{f.title}</h3>
                </div>
                <p className="text-[10px] sm:text-xs text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
