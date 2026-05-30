#ifndef CFG_GENERATOR_H
#define CFG_GENERATOR_H

#include <string>
#include <vector>
#include "Instruction.h"

struct CFGBlock {
    std::string id;
    std::string label;
    std::vector<Instruction> instructions;
    std::vector<std::string> successors;
    std::vector<std::string> predecessors;
    bool isEntry = false;
    bool isExit = false;
    bool isLoopHeader = false;
};

struct CFGEdge {
    std::string source;
    std::string target;
    bool isBackEdge = false;
    std::string label;
};

class CFGGenerator {
private:
    std::string ir;
    std::vector<CFGBlock> blocks;
    std::vector<CFGEdge> edges;
    std::string entryBlockId;
    std::vector<std::string> exitBlockIds;

    void parseBlocks();
    void buildEdges();

public:
    CFGGenerator(const std::string& ir);
    void generate();
    std::string toJSON() const;
    
    // Provide access to a flattened list of instructions for liveness analyzer
    std::vector<Instruction> getAllInstructions() const;
};

#endif // CFG_GENERATOR_H
