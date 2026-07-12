#include "CFGGenerator.h"
#include <sstream>
#include <algorithm>

CFGGenerator::CFGGenerator(const std::string& ir) : ir(ir) {}

void CFGGenerator::generate() {
    parseBlocks();
    buildEdges();
}

void CFGGenerator::parseBlocks() {
    std::istringstream iss(ir);
    std::string line;
    int instId = 0;
    
    CFGBlock* currentBlock = nullptr;
    
    while (std::getline(iss, line)) {
        // Trim
        line.erase(0, line.find_first_not_of(" \t\r\n"));
        line.erase(line.find_last_not_of(" \t\r\n") + 1);
        if (line.empty() || line[0] == ';') continue;
        if (line.find("define") != std::string::npos || line == "{" || line == "}") continue;
        
        // Check for block label
        size_t colonPos = line.find(":");
        if (colonPos != std::string::npos && line.find("=") == std::string::npos && line[0] != '%') {
            std::string label = line.substr(0, colonPos);
            CFGBlock newBlock;
            newBlock.id = label;
            newBlock.label = label;
            blocks.push_back(newBlock);
            currentBlock = &blocks.back();
            continue;
        }
        
        if (!currentBlock) {
            CFGBlock newBlock;
            newBlock.id = "entry";
            newBlock.label = "entry";
            blocks.push_back(newBlock);
            currentBlock = &blocks.back();
        }
        
        // Parse instruction
        Instruction inst = Instruction::parse(line, instId);
        if (inst.opcode != Opcode::NOP || !inst.result.empty()) {
            inst.index = instId++;
            currentBlock->instructions.push_back(inst);
            
            // Detect branches
            if (line.find("br ") == 0) {
                size_t pos = 0;
                while ((pos = line.find("label %", pos)) != std::string::npos) {
                    pos += 7; // length of "label %"
                    size_t end = line.find_first_of(" ,", pos);
                    std::string target = line.substr(pos, end - pos);
                    currentBlock->successors.push_back(target);
                }
            }
        }
    }
    
    if (!blocks.empty()) {
        blocks.front().isEntry = true;
        entryBlockId = blocks.front().id;
    }
}

void CFGGenerator::buildEdges() {
    for (auto& block : blocks) {
        if (block.successors.empty()) {
            block.isExit = true;
            exitBlockIds.push_back(block.id);
        }
        for (const auto& succ : block.successors) {
            CFGEdge edge;
            edge.source = block.id;
            edge.target = succ;
            
            // Determine if back edge (target appears before source in block order)
            auto srcIt = std::find_if(blocks.begin(), blocks.end(), [&](const CFGBlock& b) { return b.id == block.id; });
            auto tgtIt = std::find_if(blocks.begin(), blocks.end(), [&](const CFGBlock& b) { return b.id == succ; });
            
            if (tgtIt <= srcIt) {
                edge.isBackEdge = true;
                edge.label = "loop back";
                if (tgtIt != blocks.end()) {
                    tgtIt->isLoopHeader = true;
                }
            }
            edges.push_back(edge);
            
            // Add predecessor
            if (tgtIt != blocks.end()) {
                tgtIt->predecessors.push_back(block.id);
            }
        }
    }
}

std::vector<Instruction> CFGGenerator::getAllInstructions() const {
    std::vector<Instruction> allInsts;
    for (const auto& b : blocks) {
        for (const auto& i : b.instructions) {
            allInsts.push_back(i);
        }
    }
    return allInsts;
}

std::string escapeJSON(const std::string& str) {
    std::string escaped;
    for (char c : str) {
        if (c == '"') escaped += "\\\"";
        else if (c == '\\') escaped += "\\\\";
        else escaped += c;
    }
    return escaped;
}

std::string CFGGenerator::toJSON() const {
    std::string json = "{\"blocks\":[";
    for (size_t i = 0; i < blocks.size(); ++i) {
        const auto& b = blocks[i];
        json += "{\"id\":\"" + b.id + "\",\"label\":\"" + b.label + "\",\"isEntry\":" + (b.isEntry ? "true" : "false") + 
                ",\"isExit\":" + (b.isExit ? "true" : "false") + ",\"isLoopHeader\":" + (b.isLoopHeader ? "true" : "false") + 
                ",\"instructions\":[";
        for (size_t j = 0; j < b.instructions.size(); ++j) {
            json += "{\"id\":" + std::to_string(b.instructions[j].index) + ",\"text\":\"" + escapeJSON(b.instructions[j].toString()) + "\"}";
            if (j < b.instructions.size() - 1) json += ",";
        }
        json += "]}";
        if (i < blocks.size() - 1) json += ",";
    }
    json += "],\"edges\":[";
    for (size_t i = 0; i < edges.size(); ++i) {
        const auto& e = edges[i];
        json += "{\"source\":\"" + e.source + "\",\"target\":\"" + e.target + "\",\"isBackEdge\":" + (e.isBackEdge ? "true" : "false") + "}";
        if (i < edges.size() - 1) json += ",";
    }
    json += "]}";
    return json;
}
