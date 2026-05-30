#ifndef INTERFERENCEGRAPH_H
#define INTERFERENCEGRAPH_H

#include "LivenessAnalyzer.h"
#include <map>
#include <set>
#include <string>
#include <vector>

struct Edge {
    std::string u;
    std::string v;
    bool operator<(const Edge& o) const {
        if (u != o.u) return u < o.u;
        return v < o.v;
    }
};

class InterferenceGraph {
public:
    std::map<std::string, std::set<std::string>> adjList;
    std::map<std::string, int> degree;
    std::set<Edge> edges;
    std::vector<std::string> variables;
    size_t K; // number of registers

    InterferenceGraph(size_t k = 4);
    void build(LivenessAnalyzer& analyzer);
    void addEdge(const std::string& a, const std::string& b);
    int getDegree(const std::string& var) const;
    std::set<std::string> getNeighbors(const std::string& var) const;
    void removeNode(const std::string& var);
    bool hasEdge(const std::string& a, const std::string& b) const;
    
    std::string toString() const;
    std::string toJSON() const;
    std::string toDOT(const std::map<std::string, int>& colors = {}) const;
    std::string toDOTColored(const std::map<std::string, int>& assignment) const;
    
    size_t getVariableCount() const;
    size_t getEdgeCount() const;
};

#endif
