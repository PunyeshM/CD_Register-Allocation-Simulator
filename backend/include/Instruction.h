#ifndef INSTRUCTION_H
#define INSTRUCTION_H

#include <string>
#include <vector>
#include <set>
#include <sstream>

enum class Opcode {
    ADD, SUB, MUL, LOAD, STORE, PHI, RET, NOP
};

class Instruction {
public:
    std::string result;
    Opcode opcode;
    std::vector<std::string> operands;
    size_t index;
    bool hasStore;

    Instruction();
    Instruction(const std::string& result, Opcode op, const std::vector<std::string>& ops, size_t idx = 0);

    std::string toString() const;
    static Opcode stringToOpcode(const std::string& s);
    static Instruction parse(const std::string& line, size_t idx);
    std::set<std::string> getUses() const;
    std::set<std::string> getDefs() const;
    static std::string opcodeToString(Opcode op);
};

#endif
