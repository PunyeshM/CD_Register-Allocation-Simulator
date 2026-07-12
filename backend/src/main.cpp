#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <chrono>
#include <iomanip>
#include "Instruction.h"
#include "BasicBlock.h"
#include "LivenessAnalyzer.h"
#include "InterferenceGraph.h"
#include "RegisterAllocator.h"
#include "CFGGenerator.h"
#include "EventEngine.h"

// ── helpers ──────────────────────────────────────────────────────────────────

std::string readFile(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) return "";
    std::stringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

std::string readCin() {
    std::stringstream ss;
    ss << std::cin.rdbuf();
    return ss.str();
}

void saveToFile(const std::string& path, const std::string& content) {
    std::ofstream f(path);
    f << content;
}

std::string escapeJSONString(const std::string& str) {
    std::string escaped;
    for (char c : str) {
        if      (c == '"')  escaped += "\\\"";
        else if (c == '\\') escaped += "\\\\";
        else if (c == '\n') escaped += "\\n";
        else if (c == '\r') escaped += "\\r";
        else if (c == '\t') escaped += "\\t";
        else                escaped += c;
    }
    return escaped;
}

// Pretty-print the final allocation result to stdout (assignment-compliant)
void printAllocationResult(const RegisterAllocator& allocator,
                           const InterferenceGraph&  ig,
                           double liveUs, double igUs, double colorUs)
{
    const char* regNames[] = {"R1","R2","R3","R4","R5","R6","R7","R8"};

    std::cout << "\n";
    std::cout << "==============================================\n";
    std::cout << "  REGISTER ALLOCATION RESULT\n";
    std::cout << "==============================================\n";
    std::cout << "  K (physical registers) : " << ig.K  << "\n";
    std::cout << "  Variables              : " << ig.variables.size() << "\n";
    std::cout << "----------------------------------------------\n";

    if (allocator.spillRequired) {
        // ── Assignment-required output when coloring fails ──
        std::cout << "\n  *** SPILL REQUIRED ***\n\n";
        std::cout << "  The interference graph cannot be K-colored.\n";
        std::cout << "  Spill candidates (highest degree heuristic):\n";
        for (const auto& s : allocator.spillCandidates) {
            std::cout << "    " << s << "  (degree=" << ig.getDegree(s) << ")\n";
        }
    } else {
        std::cout << "\n  No spills required — all variables allocated.\n\n";
    }

    // Always print the full assignment table
    std::cout << "  Variable Assignment:\n";
    size_t assigned = 0;
    for (const auto& v : ig.variables) {
        auto it = allocator.assignment.find(v);
        int reg = (it != allocator.assignment.end()) ? it->second : -1;
        if (reg >= 0 && reg < 8) {
            std::cout << "    " << std::setw(8) << std::left << v
                      << "  ->  " << regNames[reg] << "\n";
            ++assigned;
        } else {
            std::cout << "    " << std::setw(8) << std::left << v
                      << "  ->  SPILL\n";
        }
    }

    double efficiency = ig.variables.empty() ? 100.0
        : (100.0 * static_cast<double>(assigned) / ig.variables.size());

    std::cout << "----------------------------------------------\n";
    std::cout << "  Allocation efficiency  : " << assigned << "/"
              << ig.variables.size() << "  ("
              << std::fixed << std::setprecision(1) << efficiency << "%)\n";
    std::cout << "\n  Phase timing (µs):\n";
    std::cout << "    Liveness analysis    : " << std::fixed << std::setprecision(2) << liveUs  << " µs\n";
    std::cout << "    Interference graph   : " << std::fixed << std::setprecision(2) << igUs    << " µs\n";
    std::cout << "    Chaitin coloring     : " << std::fixed << std::setprecision(2) << colorUs << " µs\n";
    std::cout << "    Total                : " << std::fixed << std::setprecision(2)
              << (liveUs + igUs + colorUs) << " µs\n";
    std::cout << "==============================================\n";
}

// ── main ─────────────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    std::string ir;
    size_t K = 4;

    // Argument parsing
    // Supported forms:
    //   rasim                           -> default IR, K=4
    //   rasim <file.ll>                 -> file IR, K=4
    //   rasim <file.ll> -k <N>          -> file IR, K=N
    //   rasim --headless -k <N>         -> stdin IR, K=N (JSON-only output)
    bool headless = false;
    std::string inputFile;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--headless") {
            headless = true;
        } else if (arg == "-k" && i + 1 < argc) {
            try { K = std::stoi(argv[++i]); } catch (...) { K = 4; }
        } else if (arg[0] != '-') {
            inputFile = arg;
        }
    }

    if (headless) {
        ir = readCin();
    } else {
        if (!inputFile.empty()) {
            ir = readFile(inputFile);
            if (ir.empty()) {
                std::cerr << "Error: Could not read '" << inputFile << "'.\n";
                return 1;
            }
        }
        if (ir.empty()) {
            ir = R"(
define i32 @example(i32 %a, i32 %b, i32 %c, i32 %d) {
entry:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
}
)";
        }
        std::cout << "=== LLVM IR Input ===\n" << ir << "\n";
    }

    EventStore::getInstance().clear();
    EventStore::getInstance().emit("PhaseStarted", "parsing", "Parsing IR started");

    // ── CFG (for JSON output) ──
    CFGGenerator cfgGen(ir);
    cfgGen.generate();
    std::vector<Instruction> instructions = cfgGen.getAllInstructions();
    EventStore::getInstance().emit("PhaseCompleted", "parsing", "Parsing complete");

    // ── Liveness Analysis ──
    EventStore::getInstance().emit("PhaseStarted", "liveness", "Liveness analysis started");
    BasicBlock bb("entry");
    bb.parseFromIR(ir);

    auto t0 = std::chrono::high_resolution_clock::now();
    LivenessAnalyzer analyzer(&bb);
    analyzer.computeLiveSets();
    auto t1 = std::chrono::high_resolution_clock::now();
    double liveUs = std::chrono::duration<double, std::micro>(t1 - t0).count();

    EventStore::getInstance().emit("PhaseCompleted", "liveness", "Liveness analysis complete");

    // ── Interference Graph ──
    EventStore::getInstance().emit("PhaseStarted", "interference", "Interference graph construction started");
    auto t2 = std::chrono::high_resolution_clock::now();
    InterferenceGraph ig(K);
    ig.build(analyzer);
    auto t3 = std::chrono::high_resolution_clock::now();
    double igUs = std::chrono::duration<double, std::micro>(t3 - t2).count();

    EventStore::getInstance().emit("PhaseCompleted", "interference", "Interference graph complete");

    // ── Chaitin Graph Coloring ──
    EventStore::getInstance().emit("PhaseStarted", "allocation", "Chaitin graph coloring started");
    auto t4 = std::chrono::high_resolution_clock::now();
    RegisterAllocator allocator(ig);
    allocator.allocate();
    auto t5 = std::chrono::high_resolution_clock::now();
    double colorUs = std::chrono::duration<double, std::micro>(t5 - t4).count();

    EventStore::getInstance().emit("PhaseCompleted", "allocation", "Chaitin graph coloring complete");

    // ── Build JSON ──
    std::string json = "{\n";
    json += "  \"instructions\": [";
    for (size_t i = 0; i < instructions.size(); ++i) {
        json += "{\"id\":" + std::to_string(instructions[i].index)
              + ",\"text\":\"" + escapeJSONString(instructions[i].toString()) + "\"}";
        if (i < instructions.size() - 1) json += ",";
    }
    json += "],\n";
    json += "  \"cfg\": "              + cfgGen.toJSON()     + ",\n";
    json += "  \"liveness\": "         + analyzer.toJSON()   + ",\n";
    json += "  \"interferenceGraph\": "+ ig.toJSON()          + ",\n";
    json += "  \"allocation\": "       + allocator.toJSON()  + ",\n";
    json += "  \"timing\": {\"livenessUs\":" + std::to_string(liveUs)
          + ",\"interferenceUs\":"           + std::to_string(igUs)
          + ",\"coloringUs\":"               + std::to_string(colorUs) + "},\n";
    json += "  \"events\": "           + EventStore::getInstance().toJSON() + "\n";
    json += "}\n";

    if (headless) {
        std::cout << json;
    } else {
        // Human-readable assignment-compliant output
        printAllocationResult(allocator, ig, liveUs, igUs, colorUs);

        // Save DOT + JSON graphs
#if defined(_WIN32)
        system("if not exist graphs mkdir graphs");
#else
        system("mkdir -p graphs 2>/dev/null");
#endif
        saveToFile("graphs/liveness.dot",    analyzer.toDOT());
        saveToFile("graphs/interference.dot", ig.toDOT(allocator.assignment));
        saveToFile("graphs/allocation.dot",   allocator.toDOT());
        saveToFile("graphs/analysis.json",    json);

        std::cout << "\n  Output saved to: graphs/\n"
                  << "    liveness.dot   interference.dot\n"
                  << "    allocation.dot analysis.json\n\n";
    }

    return allocator.spillRequired ? 2 : 0;
}
