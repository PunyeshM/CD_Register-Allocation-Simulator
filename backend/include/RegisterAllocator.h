#ifndef REGISTERALLOCATOR_H
#define REGISTERALLOCATOR_H

#include "InterferenceGraph.h"
#include <stack>
#include <vector>
#include <string>
#include <map>

struct AllocationStep {
    enum Type { SIMPLIFY_PUSH, SIMPLIFY_SPILL, ASSIGN, SPILL_DETECTED };
    Type type;
    std::string variable;
    int registerId;
    std::string message;
    std::map<std::string, int> currentAssignment;
    std::vector<std::string> currentStack;
    std::set<std::string> spillCandidates;
    std::map<std::string, std::set<std::string>> remainingGraph;
};

class RegisterAllocator {
public:
    InterferenceGraph& graph;
    size_t K;
    std::map<std::string, int> assignment; // var -> register (-1 = spill)
    std::stack<std::string> simplifyStack;
    std::set<std::string> spillCandidates;
    std::vector<AllocationStep> steps;
    bool spillRequired;

    RegisterAllocator(InterferenceGraph& g);
    void allocate();
    void simplify();
    bool assignColors();
    void detectSpills();
    
    std::string toString() const;
    std::string toJSON() const;
    std::string toDOT() const;
    
    const std::vector<AllocationStep>& getSteps() const;
    void recordStep(AllocationStep::Type type, const std::string& var, int reg, const std::string& msg);
};

#endif
