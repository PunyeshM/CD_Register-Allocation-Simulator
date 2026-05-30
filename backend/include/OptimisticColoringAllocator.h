#ifndef OPTIMISTIC_COLORING_ALLOCATOR_H
#define OPTIMISTIC_COLORING_ALLOCATOR_H

#include <string>
#include <vector>
#include <map>
#include "InterferenceGraph.h"

class OptimisticColoringAllocator {
private:
    InterferenceGraph& graph;
    size_t K;
    std::map<std::string, int> assignment;
    std::vector<std::string> spillCandidates;

public:
    OptimisticColoringAllocator(InterferenceGraph& g, size_t k);
    void allocate();
    std::string toJSON() const;
};

#endif // OPTIMISTIC_COLORING_ALLOCATOR_H
