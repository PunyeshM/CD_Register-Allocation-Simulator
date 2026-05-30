#include "RegisterAllocator.h"
#include <sstream>
#include <algorithm>
#include <iostream>

RegisterAllocator::RegisterAllocator(InterferenceGraph& g) : graph(g), K(g.K), spillRequired(false) {}

void RegisterAllocator::recordStep(AllocationStep::Type type, const std::string& var, int reg, const std::string& msg) {
    AllocationStep step;
    step.type = type;
    step.variable = var;
    step.registerId = reg;
    step.message = msg;
    step.currentAssignment = assignment;
    
    // Copy stack to vector
    std::stack<std::string> temp = simplifyStack;
    std::vector<std::string> stackVec;
    while (!temp.empty()) {
        stackVec.push_back(temp.top());
        temp.pop();
    }
    std::reverse(stackVec.begin(), stackVec.end());
    step.currentStack = stackVec;
    step.spillCandidates = spillCandidates;
    
    // Copy remaining graph
    for (const auto& [v, neighbors] : graph.adjList) {
        step.remainingGraph[v] = neighbors;
    }
    
    steps.push_back(step);
}

void RegisterAllocator::allocate() {
    steps.clear();
    assignment.clear();
    spillCandidates.clear();
    while (!simplifyStack.empty()) simplifyStack.pop();
    spillRequired = false;

    simplify();
    assignColors();
    detectSpills();
}

void RegisterAllocator::simplify() {
    // Work on a copy of the graph
    InterferenceGraph tempGraph = graph;
    
    bool changed = true;
    while (changed) {
        changed = false;
        bool found = false;

        // Find node with degree < K
        for (const auto& v : tempGraph.variables) {
            if (tempGraph.adjList.find(v) == tempGraph.adjList.end()) continue;
            if (tempGraph.adjList[v].empty() && std::find(tempGraph.variables.begin(), tempGraph.variables.end(), v) != tempGraph.variables.end()) {
                // Check if it's already removed
            }
            if (tempGraph.adjList.count(v) && tempGraph.getDegree(v) < (int)K) {
                // Push to stack and remove from graph
                simplifyStack.push(v);
                std::string msg = "PUSH " + v + " (degree " + std::to_string(tempGraph.getDegree(v)) + " < K=" + std::to_string(K) + ")";
                recordStep(AllocationStep::SIMPLIFY_PUSH, v, -1, msg);
                tempGraph.removeNode(v);
                found = true;
                changed = true;
                break;
            }
        }

        if (!found) {
            // No node with degree < K: mark spill candidate
            if (!tempGraph.variables.empty()) {
                // Find a node to spill (heuristic: highest degree)
                std::string spillVar;
                int maxDegree = -1;
                for (const auto& v : tempGraph.variables) {
                    if (tempGraph.adjList.count(v)) {
                        int deg = static_cast<int>(tempGraph.adjList[v].size());
                        if (deg > maxDegree) {
                            maxDegree = deg;
                            spillVar = v;
                        }
                    }
                }
                
                if (!spillVar.empty()) {
                    spillCandidates.insert(spillVar);
                    simplifyStack.push(spillVar);
                    std::string msg = "SPILL CANDIDATE " + spillVar + " (degree " + std::to_string(maxDegree) + " >= K=" + std::to_string(K) + ")";
                    recordStep(AllocationStep::SIMPLIFY_SPILL, spillVar, -1, msg);
                    tempGraph.removeNode(spillVar);
                    changed = true;
                }
            }
        }

        // Check if graph is empty
        bool allEmpty = true;
        for (const auto& v : tempGraph.variables) {
            if (tempGraph.adjList.count(v) && !tempGraph.adjList[v].empty()) {
                allEmpty = false;
                break;
            }
        }
        if (allEmpty && tempGraph.variables.empty()) break;
        // Rebuild tempGraph.variables
        tempGraph.variables.clear();
        for (const auto& [v, _] : tempGraph.adjList) {
            tempGraph.variables.push_back(v);
        }
    }
}

bool RegisterAllocator::assignColors() {
    const char* regNames[] = {"R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"};
    std::map<std::string, int> tempAssignment;

    // Pop from stack and assign
    while (!simplifyStack.empty()) {
        std::string var = simplifyStack.top();
        simplifyStack.pop();

        // Get neighbors that already have colors
        std::set<int> usedColors;
        for (const auto& neighbor : graph.getNeighbors(var)) {
            if (tempAssignment.count(neighbor) && tempAssignment[neighbor] >= 0) {
                usedColors.insert(tempAssignment[neighbor]);
            }
        }

        // Find available color
        int color = -1;
        for (int c = 0; c < (int)K; ++c) {
            if (usedColors.find(c) == usedColors.end()) {
                color = c;
                break;
            }
        }

        tempAssignment[var] = color;
        assignment[var] = color;

        std::string regStr = (color >= 0 && color < 8) ? regNames[color] : "SPILL";
        std::string msg = "ASSIGN " + var + " → " + regStr;
        if (color < 0) {
            msg = "SPILL " + var + " (no available register)";
            spillCandidates.insert(var);
            spillRequired = true;
        }
        
        recordStep(AllocationStep::ASSIGN, var, color, msg);
    }

    return !spillRequired;
}

void RegisterAllocator::detectSpills() {
    if (!spillCandidates.empty()) {
        spillRequired = true;
        for (const auto& var : spillCandidates) {
            std::string msg = "SPILL DETECTED: " + var + " cannot be assigned a register";
            recordStep(AllocationStep::SPILL_DETECTED, var, -1, msg);
        }
    }
}

std::string RegisterAllocator::toString() const {
    std::ostringstream oss;
    const char* regNames[] = {"R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"};
    
    oss << "Register Allocation Result:\n";
    oss << "===========================\n";
    oss << "K = " << K << " registers\n";
    oss << "Variables: " << graph.variables.size() << "\n\n";
    oss << "Assignment:\n";
    for (const auto& v : graph.variables) {
        auto it = assignment.find(v);
        if (it != assignment.end()) {
            if (it->second >= 0 && it->second < 8) {
                oss << "  " << v << " → " << regNames[it->second] << "\n";
            } else {
                oss << "  " << v << " → SPILL\n";
            }
        } else {
            oss << "  " << v << " → ?\n";
        }
    }
    
    if (spillRequired) {
        oss << "\nSPILL REQUIRED:\n";
        for (const auto& s : spillCandidates) {
            oss << "  " << s << "\n";
        }
    } else {
        oss << "\n✓ No spills required!\n";
    }
    
    oss << "\nSteps:\n";
    for (size_t i = 0; i < steps.size(); ++i) {
        oss << "  " << i << ": " << steps[i].message << "\n";
    }
    
    return oss.str();
}

std::string RegisterAllocator::toJSON() const {
    std::ostringstream oss;
    const char* regNames[] = {"R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"};
    
    oss << "{\n";
    oss << "  \"K\": " << K << ",\n";
    oss << "  \"spillRequired\": " << (spillRequired ? "true" : "false") << ",\n";
    oss << "  \"assignment\": {\n";
    size_t ai = 0;
    for (const auto& v : graph.variables) {
        auto it = assignment.find(v);
        int reg = (it != assignment.end()) ? it->second : -1;
        std::string regName = (reg >= 0 && reg < 8) ? regNames[reg] : "SPILL";
        oss << "    \"" << v << "\": {\"register\": " << reg << ", \"name\": \"" << regName << "\"}";
        if (++ai < graph.variables.size()) oss << ",";
        oss << "\n";
    }
    oss << "  },\n";
    oss << "  \"spillCandidates\": [";
    size_t si = 0;
    for (const auto& s : spillCandidates) {
        if (si++ > 0) oss << ",";
        oss << "\"" << s << "\"";
    }
    oss << "],\n";
    oss << "  \"steps\": [\n";
    for (size_t i = 0; i < steps.size(); ++i) {
        const auto& s = steps[i];
        oss << "    {\"type\": " << s.type << ", \"variable\": \"" << s.variable 
            << "\", \"register\": " << s.registerId << ", \"message\": \"" << s.message << "\"}";
        if (i + 1 < steps.size()) oss << ",";
        oss << "\n";
    }
    oss << "  ]\n";
    oss << "}\n";
    return oss.str();
}

std::string RegisterAllocator::toDOT() const {
    return graph.toDOTColored(assignment);
}

const std::vector<AllocationStep>& RegisterAllocator::getSteps() const { return steps; }
