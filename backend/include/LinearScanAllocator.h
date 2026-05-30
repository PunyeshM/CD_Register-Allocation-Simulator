#ifndef LINEAR_SCAN_ALLOCATOR_H
#define LINEAR_SCAN_ALLOCATOR_H

#include <string>
#include <vector>
#include <map>
#include "Instruction.h"
#include "LivenessAnalyzer.h"

struct LiveInterval {
    std::string variable;
    int start;
    int end;
    int registerId = -1;
};

class LinearScanAllocator {
private:
    std::vector<Instruction> instructions;
    std::vector<LiveSet> liveSets;
    size_t K;
    
    std::vector<LiveInterval> intervals;
    std::vector<LiveInterval> active;
    std::vector<std::string> spillCandidates;
    std::map<std::string, int> assignment;

    void buildIntervals();
    void expireOldIntervals(const LiveInterval& i);
    void spillAtInterval(const LiveInterval& i);

public:
    LinearScanAllocator(const std::vector<Instruction>& insts, const std::vector<LiveSet>& sets, size_t k);
    void allocate();
    std::string toJSON() const;
};

#endif // LINEAR_SCAN_ALLOCATOR_H
