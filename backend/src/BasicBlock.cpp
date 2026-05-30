#include "BasicBlock.h"
#include <sstream>

BasicBlock::BasicBlock(const std::string& n) : name(n) {}

void BasicBlock::addInstruction(const Instruction& inst) {
    instructions.push_back(inst);
}

void BasicBlock::parseFromIR(const std::string& ir) {
    instructions.clear();
    std::istringstream iss(ir);
    std::string line;
    size_t idx = 0;
    while (std::getline(iss, line)) {
        // Trim
        line.erase(0, line.find_first_not_of(" \t\r\n"));
        line.erase(line.find_last_not_of(" \t\r\n") + 1);
        if (line.empty() || line[0] == ';') continue;
        if (line.find("define") != std::string::npos) continue;
        if (line.find("}") != std::string::npos) continue;
        if (line.find("entry:") != std::string::npos) continue;
        if (line.find(":") != std::string::npos && line.find("=") == std::string::npos) continue;

        Instruction inst = Instruction::parse(line, idx);
        if (inst.opcode != Opcode::NOP || !inst.result.empty()) {
            inst.index = idx++;
            instructions.push_back(inst);
        }
    }
}

std::vector<std::string> BasicBlock::getVariableNames() const {
    std::vector<std::string> vars;
    for (const auto& inst : instructions) {
        if (!inst.result.empty() && inst.result[0] == '%') {
            if (std::find(vars.begin(), vars.end(), inst.result) == vars.end())
                vars.push_back(inst.result);
        }
        for (const auto& op : inst.operands) {
            if (!op.empty() && op[0] == '%') {
                if (std::find(vars.begin(), vars.end(), op) == vars.end())
                    vars.push_back(op);
            }
        }
    }
    return vars;
}

std::string BasicBlock::toString() const {
    std::ostringstream oss;
    oss << name << ":\n";
    for (const auto& inst : instructions) {
        oss << "  " << inst.toString() << "\n";
    }
    return oss.str();
}

std::string BasicBlock::toDOT() const {
    std::ostringstream oss;
    oss << "digraph BasicBlock {\n";
    oss << "  rankdir=LR;\n";
    oss << "  node [shape=box, style=rounded, fillcolor=lightyellow, color=blue];\n";
    for (size_t i = 0; i < instructions.size(); ++i) {
        std::string label = instructions[i].toString();
        // Escape quotes
        size_t pos = 0;
        while ((pos = label.find("\"", pos)) != std::string::npos) {
            label.replace(pos, 1, "\\\"");
            pos += 2;
        }
        oss << "  I" << i << " [label=\"" << label << "\"];\n";
    }
    for (size_t i = 0; i + 1 < instructions.size(); ++i) {
        oss << "  I" << i << " -> I" << (i + 1) << ";\n";
    }
    oss << "}\n";
    return oss.str();
}

std::vector<Instruction>& BasicBlock::getInstructions() { return instructions; }
const std::vector<Instruction>& BasicBlock::getInstructions() const { return instructions; }
