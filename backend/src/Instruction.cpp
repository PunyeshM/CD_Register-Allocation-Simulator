#include "Instruction.h"
#include <algorithm>
#include <cctype>

Instruction::Instruction() : opcode(Opcode::NOP), index(0), hasStore(false) {}

Instruction::Instruction(const std::string& res, Opcode op, const std::vector<std::string>& ops, size_t idx)
    : result(res), opcode(op), operands(ops), index(idx), hasStore(false) {}

std::string Instruction::opcodeToString(Opcode op) {
    switch (op) {
        case Opcode::ADD: return "add";
        case Opcode::SUB: return "sub";
        case Opcode::MUL: return "mul";
        case Opcode::LOAD: return "load";
        case Opcode::STORE: return "store";
        case Opcode::PHI: return "phi";
        case Opcode::RET: return "ret";
        default: return "nop";
    }
}

Opcode Instruction::stringToOpcode(const std::string& s) {
    std::string lower = s;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    if (lower == "add") return Opcode::ADD;
    if (lower == "sub") return Opcode::SUB;
    if (lower == "mul") return Opcode::MUL;
    if (lower == "load" || lower == "ld") return Opcode::LOAD;
    if (lower == "store" || lower == "st") return Opcode::STORE;
    if (lower == "phi") return Opcode::PHI;
    if (lower == "ret") return Opcode::RET;
    return Opcode::NOP;
}

std::string Instruction::toString() const {
    std::ostringstream oss;
    if (opcode == Opcode::RET) {
        oss << "ret " << (operands.empty() ? "void" : operands[0]);
    } else if (opcode == Opcode::STORE) {
        oss << "store " << operands[0] << " -> " << operands[1];
    } else if (!result.empty()) {
        oss << result << " = " << opcodeToString(opcode);
        for (const auto& op : operands) oss << " " << op;
    }
    return oss.str();
}

Instruction Instruction::parse(const std::string& line, size_t idx) {
    Instruction inst;
    inst.index = idx;
    std::string s = line;
    // Remove comment
    auto cmt = s.find(';');
    if (cmt != std::string::npos) s = s.substr(0, cmt);
    // Trim
    s.erase(0, s.find_first_not_of(" \t"));
    s.erase(s.find_last_not_of(" \t") + 1);
    if (s.empty()) return inst;

    // Check for label
    if (s.find(':') != std::string::npos) {
        inst.opcode = Opcode::NOP;
        return inst;
    }

    // Parse result
    size_t eq = s.find('=');
    if (eq != std::string::npos) {
        inst.result = s.substr(0, eq);
        inst.result.erase(0, inst.result.find_first_not_of(" \t"));
        inst.result.erase(inst.result.find_last_not_of(" \t") + 1);
        s = s.substr(eq + 1);
        s.erase(0, s.find_first_not_of(" \t"));
    }

    // Parse opcode
    size_t sp = s.find(' ');
    std::string opStr = (sp != std::string::npos) ? s.substr(0, sp) : s;
    inst.opcode = stringToOpcode(opStr);

    // Parse operands
    std::string rest;
    if (sp != std::string::npos) {
        rest = s.substr(sp + 1);
        std::string token;
        std::istringstream iss(rest);
        while (iss >> token) {
            if (!token.empty() && token[0] == '%') {
                inst.operands.push_back(token);
            } else if (token.find('%') != std::string::npos) {
                size_t p = token.find('%');
                size_t end = token.find_first_of(",;) \t", p);
                inst.operands.push_back(token.substr(p, end - p));
            }
        }
    }

    // Handle ret specially
    if (inst.opcode == Opcode::RET) {
        std::string retRest = s.substr(3);
        std::istringstream iss(retRest);
        std::string token;
        while (iss >> token) {
            if (!token.empty() && token[0] == '%') {
                inst.operands.push_back(token);
            } else if (token.find('%') != std::string::npos) {
                size_t p = token.find('%');
                size_t end = token.find_first_of(",;) \t", p);
                if (end > p) inst.operands.push_back(token.substr(p, end - p));
            }
        }
    }

    // Handle store: "store i32 %val, i32* %ptr"
    if (inst.opcode == Opcode::STORE && !rest.empty()) {
        inst.hasStore = true;
        std::istringstream iss(rest);
        std::string token;
        while (iss >> token) {
            if (!token.empty() && token[0] == '%') {
                if (std::find(inst.operands.begin(), inst.operands.end(), token) == inst.operands.end()) {
                    inst.operands.push_back(token);
                }
            } else if (token.find('%') != std::string::npos) {
                size_t p = token.find('%');
                size_t end = token.find_first_of(",;) \t", p);
                std::string var = token.substr(p, end - p);
                if (!var.empty() && std::find(inst.operands.begin(), inst.operands.end(), var) == inst.operands.end()) {
                    inst.operands.push_back(var);
                }
            }
        }
    }

    return inst;
}

std::set<std::string> Instruction::getUses() const {
    std::set<std::string> uses;
    for (const auto& op : operands) {
        if (!op.empty() && op[0] == '%') uses.insert(op);
    }
    if (opcode == Opcode::STORE && !operands.empty()) uses.insert(operands[0]);
    return uses;
}

std::set<std::string> Instruction::getDefs() const {
    std::set<std::string> defs;
    if (!result.empty() && result[0] == '%') defs.insert(result);
    if (opcode == Opcode::LOAD && !operands.empty() && !result.empty()) defs.insert(result);
    return defs;
}
