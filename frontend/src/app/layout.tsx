import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Register Allocation Simulator | LLVM Graph Coloring",
  description:
    "An interactive simulator for compiler register allocation. Visualize liveness analysis, interference graphs, and Chaitin graph coloring in real-time.",
  keywords: [
    "compiler",
    "register allocation",
    "LLVM",
    "graph coloring",
    "Chaitin",
    "liveness analysis",
    "interference graph",
  ],
  openGraph: {
    title: "Register Allocation Simulator",
    description: "Visualize How Compilers Allocate Registers",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
