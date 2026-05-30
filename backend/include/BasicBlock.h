#ifndef BASICBLOCK_H
#define BASICBLOCK_H

#include "Instruction.h"
#include <vector>
#include <map>

class BasicBlock {
public:
    std::string name;
    std::vector<Instruction> instructions;

    BasicBlock(const std::string& n = "");
    void addInstruction(const Instruction& inst);
    void parseFromIR(const std::string& ir);
    std::string toString() const;
    std::string toDOT() const;
    std::vector<std::string> getVariableNames() const;
    std::vector<Instruction>& getInstructions();
    const std::vector<Instruction>& getInstructions() const;
};

#endif
