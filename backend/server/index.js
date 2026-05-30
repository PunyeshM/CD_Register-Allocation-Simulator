const express = require("express");
const cors = require("cors");
const { runAnalysis } = require("./allocator");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── CORS ──────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));

// ─── Body parsers (try JSON first, then urlencoded) ───
app.use(express.json({ limit: "2mb", strict: false }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: "text/plain", limit: "2mb" }));

// ─── JSON parse error recovery ────────────────────────
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    // JSON parse failed — try to recover from raw body
    console.warn("JSON parse error, attempting raw body recovery");
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
        return next();
      } catch (_) {}
    }
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  next(err);
});

// ─── Request logging ──────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ─── Health check ─────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Debug: echo the received body ─────────────────────
app.post("/debug-body", (req, res) => {
  res.json({
    contentType: req.headers["content-type"],
    bodyType: typeof req.body,
    bodyKeys: Object.keys(req.body),
    bodyPreview: JSON.stringify(req.body).substring(0, 500),
  });
});

// ─── POST /analyze ─────────────────────────────────────
app.post("/analyze", (req, res) => {
  try {
    const body = req.body || {};

    // Support multiple field names for flexibility
    let ir = body.ir ?? body.IR ?? body.code ?? body.llvm ?? body.source;
    let registers = body.registers ?? body.registerCount ?? body.K ?? 4;

    // If body is a string (text/plain), try to parse it
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        ir = ir || parsed.ir || parsed.IR || parsed.code;
        registers = registers || parsed.registers || parsed.registerCount || parsed.K || 4;
      } catch (_) {
        // Body is plain text — treat the entire body as IR
        ir = body;
      }
    }

    if (!ir || typeof ir !== "string" || ir.trim().length === 0) {
      console.warn("[analyze] Invalid request body:", JSON.stringify(body).substring(0, 200));
      return res.status(400).json({
        error: "Missing or invalid 'ir' field",
        hint: "Send JSON with { ir: '...', registers: N }",
      });
    }

    const K = Math.max(1, Math.min(8, parseInt(registers, 10) || 4));

    console.log(`Analyzing IR (${ir.length} chars, K=${K})...`);

    // Check if C++ backend exists
    const fs = require('fs');
    const path = require('path');
    const { execFile } = require('child_process');
    
    // Look for the executable in the parent directory (backend root) or build directory
    const cppExePath = path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'rasim.exe' : 'rasim');
    const cppExePathFallback = path.join(__dirname, '..', process.platform === 'win32' ? 'rasim.exe' : 'rasim');
    
    const targetExe = fs.existsSync(cppExePath) ? cppExePath : (fs.existsSync(cppExePathFallback) ? cppExePathFallback : null);

    if (targetExe) {
      console.log(`  → Using C++ Backend: ${targetExe}`);
      const child = execFile(targetExe, ['--headless', '-k', K.toString()], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          console.error("C++ backend error:", error);
          console.error("Stderr:", stderr);
          return res.status(500).json({ error: "C++ backend failed", details: error.message, stderr });
        }
        
        try {
          // Find where the JSON starts
          const jsonStart = stdout.indexOf('{');
          if (jsonStart === -1) throw new Error("No JSON object found in output");
          
          const jsonStr = stdout.substring(jsonStart);
          const result = JSON.parse(jsonStr);
          console.log(`  → C++ success: ${result.instructions?.length || 0} instr`);
          res.json(result);
        } catch (parseErr) {
          console.error("Failed to parse C++ output:", parseErr);
          res.status(500).json({ error: "Invalid JSON from C++ backend", stdout: stdout.substring(0, 500) });
        }
      });
      
      // Write IR to stdin
      child.stdin.write(ir);
      child.stdin.end();
    } else {
      console.log(`  → Using JS Backend fallback`);
      const result = runAnalysis(ir, K);
      res.json(result);
    }
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({
      error: err.message,
      ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    });
  }
});

// ─── 404 handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// ─── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message || err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n  🚀 Register Allocation API Server`);
  console.log(`  ───────────────────────────────`);
  console.log(`  URL:  http://localhost:${PORT}`);
  console.log(`  POST /analyze  (body: { ir, registers })`);
  console.log(`  POST /debug-body (echoes received body)`);
  console.log(`  GET  /health\n`);
});
