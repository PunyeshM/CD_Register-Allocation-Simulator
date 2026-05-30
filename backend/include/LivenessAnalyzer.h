#ifndef LIVENESSANALYZER_H
#define LIVENESSANALYZER_H

#include "BasicBlock.h"
#include <set>
#include <map>
#include <vector>
#include <string>

struct LiveSet {
    std::set<std::string> use;
    std::set<std::string> def;
    std::set<std::string> liveIn;
    std::set<std::string> liveOut;
};

struct LivenessIteration {
    std::vector<LiveSet> state;
    bool changed;
};

class LivenessAnalyzer {
public:
    BasicBlock* block;
    std::vector<LiveSet> liveSets;
    std::vector<LivenessIteration> iterations;
    std::map<std::string, std::vector<size_t>> liveRanges;

    LivenessAnalyzer(BasicBlock* b = nullptr);
    void analyze();
    void computeUseDef();
    bool computeLiveSets();
    void computeLiveRanges();
    
    std::string toString() const;
    std::string toJSON() const;
    
    const std::vector<LiveSet>& getLiveSets() const;
    const std::vector<LivenessIteration>& getIterations() const;
    const std::map<std::string, std::vector<size_t>>& getLiveRanges() const;
    std::string toDOT() const;
};

#endif
