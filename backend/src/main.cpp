#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include "Instruction.h"
#include "BasicBlock.h"
#include "LivenessAnalyzer.h"
#include "InterferenceGraph.h"
#include "RegisterAllocator.h"

std::string readFile(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) return "";
    std::stringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

void saveToFile(const std::string& path, const std::string& content) {
    std::ofstream f(path);
    f << content;
}

int main(int argc, char* argv[]) {
    std::string ir;
    
    if (argc > 1) {
        ir = readFile(argv[1]);
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

    std::cout << "=== LLVM IR Input ===" << std::endl;
    std::cout << ir << std::endl;

    // Parse basic block
    BasicBlock bb("entry");
    bb.parseFromIR(ir);
    
    std::cout << "\n=== Parsed Instructions ===" << std::endl;
    std::cout << bb.toString() << std::endl;

    // Liveness Analysis
    LivenessAnalyzer analyzer(&bb);
    analyzer.computeLiveSets();

    std::cout << "\n=== Liveness Analysis ===" << std::endl;
    std::cout << analyzer.toString() << std::endl;

    // Save liveness DOT
    saveToFile("graphs/liveness.dot", analyzer.toDOT());

    // Interference Graph
    size_t K = 4;
    if (argc > 2) {
        K = std::stoi(argv[2]);
    }
    
    InterferenceGraph ig(K);
    ig.build(analyzer);

    std::cout << "\n=== Interference Graph ===" << std::endl;
    std::cout << ig.toString() << std::endl;

    // Save interference DOT
    saveToFile("graphs/interference.dot", ig.toDOT());

    // Register Allocation
    RegisterAllocator allocator(ig);
    allocator.allocate();

    std::cout << "\n=== Register Allocation ===" << std::endl;
    std::cout << allocator.toString() << std::endl;

    // Save allocation DOT
    saveToFile("graphs/allocation.dot", allocator.toDOT());

    // Ensure graphs directory exists
    system("mkdir -p graphs 2>/dev/null || mkdir graphs 2>nul");

    // Save JSON output (with proper escaping)
    std::string escapedIR;
    for (char c : ir) {
        if (c == '"') escapedIR += "\\\"";
        else if (c == '\\') escapedIR += "\\\\";
        else if (c == '\n') escapedIR += "\\n";
        else if (c == '\r') escapedIR += "\\r";
        else if (c == '\t') escapedIR += "\\t";
        else escapedIR += c;
    }
    std::string json = "{\n";
    json += "  \"ir\": \"" + escapedIR + "\",\n";
    json += "  \"liveness\": " + analyzer.toJSON() + ",\n";
    json += "  \"interferenceGraph\": " + ig.toJSON() + ",\n";
    json += "  \"allocation\": " + allocator.toJSON() + "\n";
    json += "}\n";
    saveToFile("graphs/analysis.json", json);

    std::cout << "\n=== Output saved to graphs/ ===" << std::endl;

    return 0;
}
