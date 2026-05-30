#include "OptimisticColoringAllocator.h"
#include "EventEngine.h"
#include <algorithm>
#include <set>

OptimisticColoringAllocator::OptimisticColoringAllocator(InterferenceGraph& g, size_t k)
    : graph(g), K(k) {}

void OptimisticColoringAllocator::allocate() {
    // Simplified Briggs optimistic coloring
    // 1. Simplify
    // 2. If no nodes < K, push node with highest degree anyway (don't spill immediately)
    // 3. Select colors, potentially spilling only if neighborhood is fully colored

    std::vector<std::string> stack;
    std::set<std::string> remaining;
    
    // Create local adjacency list
    std::map<std::string, std::set<std::string>> adj;
    const auto& vars = graph.getVariables();
    for (const auto& v : vars) {
        remaining.insert(v);
        adj[v] = std::set<std::string>();
    }
    
    // Reconstruct edges
    const auto& edges = graph.getEdges();
    for (const auto& e : edges) {
        adj[e.source].insert(e.target);
        adj[e.target].insert(e.source);
    }
    
    while (!remaining.empty()) {
        bool found = false;
        for (const auto& v : remaining) {
            if (adj[v].size() < K) {
                stack.push_back(v);
                for (const auto& neighbor : adj[v]) {
                    adj[neighbor].erase(v);
                }
                remaining.erase(v);
                found = true;
                break;
            }
        }
        
        if (!found) {
            // Optimistic push
            std::string maxDegreeNode = *remaining.begin();
            size_t maxDeg = adj[maxDegreeNode].size();
            for (const auto& v : remaining) {
                if (adj[v].size() > maxDeg) {
                    maxDeg = adj[v].size();
                    maxDegreeNode = v;
                }
            }
            stack.push_back(maxDegreeNode);
            for (const auto& neighbor : adj[maxDegreeNode]) {
                adj[neighbor].erase(maxDegreeNode);
            }
            remaining.erase(maxDegreeNode);
        }
    }
    
    // Rebuild full adjacency
    for (const auto& v : vars) {
        adj[v] = std::set<std::string>();
    }
    for (const auto& e : edges) {
        adj[e.source].insert(e.target);
        adj[e.target].insert(e.source);
    }
    
    // Assign colors
    for (auto it = stack.rbegin(); it != stack.rend(); ++it) {
        std::string v = *it;
        std::set<int> usedColors;
        for (const auto& neighbor : adj[v]) {
            if (assignment.find(neighbor) != assignment.end()) {
                usedColors.insert(assignment[neighbor]);
            }
        }
        
        int color = -1;
        for (size_t c = 0; c < K; ++c) {
            if (usedColors.find(c) == usedColors.end()) {
                color = c;
                break;
            }
        }
        
        if (color == -1) {
            spillCandidates.push_back(v);
        } else {
            assignment[v] = color;
            EventStore::getInstance().emit("ColorAssigned", "allocation", "Optimistic assigned color", v, "{\"color\":" + std::to_string(color) + "}");
        }
    }
}

std::string OptimisticColoringAllocator::toJSON() const {
    std::string json = "{\"K\":" + std::to_string(K) + ",\"spillRequired\":" + (spillCandidates.empty() ? "false" : "true") + ",\"assignment\":{";
    bool first = true;
    for (const auto& kv : assignment) {
        if (!first) json += ",";
        json += "\"" + kv.first + "\":{\"register\":" + std::to_string(kv.second) + ",\"name\":\"R" + std::to_string(kv.second + 1) + "\"}";
        first = false;
    }
    json += "},\"spillCandidates\":[";
    for (size_t i = 0; i < spillCandidates.size(); ++i) {
        json += "\"" + spillCandidates[i] + "\"";
        if (i < spillCandidates.size() - 1) json += ",";
    }
    json += "]}";
    return json;
}
