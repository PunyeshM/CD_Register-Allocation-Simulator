"use strict";

/**
 * Register Allocator - Backend Analysis Engine
 * Implements LLVM IR parsing, liveness analysis, interference graph,
 * and Chaitin graph coloring.
 */

// ─── Parsing ────────────────────────────────────────────

function parseInstructions(ir) {
  const lines = ir.split("\n");
  const instructions = [];
  let id = 0;

  for (const raw of lines) {
    let line = raw.replace(/;.*$/, "").trim();
    if (!line) continue;
    if (line.startsWith("define") || line.startsWith("}") || line.includes(":")) continue;
    if (line.startsWith("entry:") || line.startsWith("{")) continue;

    let result = "";
    let rest = line;

    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      result = line.substring(0, eqIdx).trim();
      rest = line.substring(eqIdx + 1).trim();
    }

    const parts = rest.split(/\s+/);
    const opcode = parts[0];
    if (!["add", "sub", "mul", "load", "store", "phi", "ret"].includes(opcode)) continue;

    const operands = [];
    if (opcode === "ret") {
      const retRest = rest.replace("ret", "").trim();
      retRest.split(/\s+/).forEach((p) => {
        if (p.startsWith("%")) operands.push(p);
      });
    } else {
      const opRest = rest.substring(opcode.length).trim();
      opRest.split(/[\s,]+/).forEach((t) => {
        if (t.startsWith("%")) operands.push(t);
      });
    }

    instructions.push({ id: id++, result, opcode, operands, text: line.trim() });
  }

  return instructions;
}

// ─── Liveness Analysis ──────────────────────────────────

function computeUseDef(inst) {
  const use = [];
  const def = [];
  for (const op of inst.operands) {
    if (op.startsWith("%") && !use.includes(op)) use.push(op);
  }
  if (inst.result.startsWith("%") && !def.includes(inst.result)) def.push(inst.result);
  return { use, def };
}

function analyzeLiveness(instructions) {
  const n = instructions.length;
  let sets = instructions.map((inst) => {
    const { use, def } = computeUseDef(inst);
    return { use, def, liveIn: [], liveOut: [] };
  });

  const iterations = [];
  let changed = true;
  let maxIter = 100;

  while (changed && maxIter-- > 0) {
    changed = false;
    for (let i = n - 1; i >= 0; i--) {
      const newLiveOut = [];
      if (i + 1 < n) {
        for (const v of sets[i + 1].liveIn) {
          if (!newLiveOut.includes(v)) newLiveOut.push(v);
        }
      }

      if (!arraysEqual(newLiveOut, sets[i].liveOut)) {
        sets[i].liveOut = newLiveOut;
        changed = true;
      }

      const newLiveIn = [...sets[i].use];
      for (const v of sets[i].liveOut) {
        if (!sets[i].def.includes(v) && !newLiveIn.includes(v)) newLiveIn.push(v);
      }

      if (!arraysEqual(newLiveIn, sets[i].liveIn)) {
        sets[i].liveIn = newLiveIn;
        changed = true;
      }
    }
    iterations.push({ state: JSON.parse(JSON.stringify(sets)), changed });
  }

  // Live ranges
  const allVars = new Set();
  for (const s of sets) {
    for (const v of [...s.liveIn, ...s.liveOut, ...s.use, ...s.def]) allVars.add(v);
  }

  const liveRanges = {};
  for (const v of allVars) {
    const range = [];
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      if (s.liveIn.includes(v) || s.liveOut.includes(v) || s.use.includes(v) || s.def.includes(v)) {
        range.push(i);
      }
    }
    if (range.length > 0) liveRanges[v] = range;
  }

  return { sets, iterations, liveRanges };
}

// ─── Interference Graph ─────────────────────────────────

function buildInterferenceGraph(instructions, liveSets, K) {
  const adjList = {};
  const degree = {};
  const edgeSet = new Set();
  const edges = [];

  const allVars = new Set();
  for (const s of liveSets) {
    for (const v of [...s.liveOut, ...s.def, ...s.use]) allVars.add(v);
  }

  for (const v of allVars) {
    adjList[v] = new Set();
    degree[v] = 0;
  }

  for (let i = 0; i < liveSets.length; i++) {
    const { liveOut, def } = liveSets[i];

    for (let j = 0; j < liveOut.length; j++) {
      for (let k = j + 1; k < liveOut.length; k++) {
        const u = liveOut[j] < liveOut[k] ? liveOut[j] : liveOut[k];
        const v = liveOut[j] < liveOut[k] ? liveOut[k] : liveOut[j];
        const key = `${u}|${v}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: u, target: v });
          if (adjList[u]) adjList[u].add(v);
          if (adjList[v]) adjList[v].add(u);
          if (degree[u] !== undefined) degree[u]++;
          if (degree[v] !== undefined) degree[v]++;
        }
      }
    }

    for (const d of def) {
      for (const lo of liveOut) {
        if (d !== lo) {
          const u = d < lo ? d : lo;
          const v = d < lo ? lo : d;
          const key = `${u}|${v}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source: u, target: v });
            if (adjList[d]) adjList[d].add(lo);
            if (adjList[lo]) adjList[lo].add(d);
            if (degree[d] !== undefined) degree[d]++;
            if (degree[lo] !== undefined) degree[lo]++;
          }
        }
      }
    }
  }

  return {
    K,
    variables: Array.from(allVars),
    degrees: degree,
    edges,
  };
}

// ─── Chaitin Graph Coloring ─────────────────────────────

function allocateRegisters(graph, instructions) {
  const K = graph.K;

  // Build adjacency list from edges
  const adjList = {};
  for (const v of graph.variables) {
    adjList[v] = graph.edges
      .filter((e) => e.source === v || e.target === v)
      .map((e) => (e.source === v ? e.target : e.source));
  }

  // Copy for simplification
  const tempAdj = {};
  for (const v of graph.variables) {
    tempAdj[v] = new Set(adjList[v] || []);
  }

  const stack = [];
  const spillCandidates = [];
  const steps = [];
  const remaining = new Set(graph.variables);

  const getDegree = (v) => tempAdj[v]?.size || 0;

  const recordStep = (type, variable, registerId, message, currentAssignment, remainingGraph) => {
    const rem = {};
    for (const [k, vs] of Object.entries(tempAdj)) {
      rem[k] = Array.from(vs);
    }
    steps.push({
      type,
      variable,
      registerId,
      message,
      currentAssignment: { ...currentAssignment },
      currentStack: [...stack],
      spillCandidates: [...spillCandidates],
      remainingGraph: rem,
    });
  };

  // Simplify phase
  while (remaining.size > 0) {
    let found = false;
    for (const v of remaining) {
      if (getDegree(v) < K) {
        stack.push(v);
        const msg = `PUSH ${v} (degree ${getDegree(v)} < K=${K})`;
        recordStep("SIMPLIFY_PUSH", v, -1, msg);

        for (const n of tempAdj[v] || []) {
          tempAdj[n]?.delete(v);
        }
        delete tempAdj[v];
        remaining.delete(v);
        found = true;
        break;
      }
    }

    if (!found) {
      let maxDeg = -1;
      let spillVar = "";
      for (const v of remaining) {
        if (getDegree(v) > maxDeg) {
          maxDeg = getDegree(v);
          spillVar = v;
        }
      }
      if (spillVar) {
        spillCandidates.push(spillVar);
        stack.push(spillVar);
        const msg = `SPILL CANDIDATE ${spillVar} (degree ${maxDeg} >= K=${K})`;
        recordStep("SIMPLIFY_SPILL", spillVar, -1, msg);

        for (const n of tempAdj[spillVar] || []) {
          tempAdj[n]?.delete(spillVar);
        }
        delete tempAdj[spillVar];
        remaining.delete(spillVar);
      } else {
        break;
      }
    }
  }

  // Assign colors
  const assignment = {};
  const revStack = [...stack].reverse();

  for (const v of revStack) {
    const usedColors = new Set();
    for (const n of adjList[v] || []) {
      if (assignment[n] !== undefined && assignment[n] >= 0) {
        usedColors.add(assignment[n]);
      }
    }

    let color = -1;
    for (let c = 0; c < K; c++) {
      if (!usedColors.has(c)) {
        color = c;
        break;
      }
    }

    assignment[v] = color;
    const regNames = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];
    const regStr = color >= 0 ? regNames[color] || `R${color + 1}` : "SPILL";
    const msg = color >= 0 ? `ASSIGN ${v} → ${regStr}` : `SPILL ${v} (no available register)`;

    if (color < 0 && !spillCandidates.includes(v)) spillCandidates.push(v);

    recordStep("ASSIGN", v, color, msg, assignment);
  }

  const spillRequired = spillCandidates.length > 0;

  for (const s of spillCandidates) {
    recordStep("SPILL_DETECTED", s, -1, `SPILL DETECTED: ${s} cannot be assigned a register`, assignment);
  }

  const regNames = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];
  const namedAssignment = {};
  for (const [v, r] of Object.entries(assignment)) {
    namedAssignment[v] = {
      register: r,
      name: r >= 0 ? regNames[r] || `R${r + 1}` : "SPILL",
    };
  }

  return {
    K,
    spillRequired,
    assignment: namedAssignment,
    spillCandidates,
    steps,
  };
}

// ─── Main Entry Point ──────────────────────────────────

function runAnalysis(ir, K = 4) {
  const instructions = parseInstructions(ir);
  const { sets, iterations, liveRanges } = analyzeLiveness(instructions);
  const interferenceGraph = buildInterferenceGraph(instructions, sets, K);
  const allocation = allocateRegisters(interferenceGraph, instructions);

  return {
    instructions,
    liveness: { sets, iterations, liveRanges },
    interferenceGraph,
    allocation,
  };
}

// ─── Utility ────────────────────────────────────────────

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const v of sa) if (!sb.has(v)) return false;
  return true;
}

module.exports = { runAnalysis, parseInstructions, analyzeLiveness, buildInterferenceGraph, allocateRegisters };
