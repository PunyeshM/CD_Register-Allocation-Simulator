#include "InterferenceGraph.h"
#include <sstream>
#include <algorithm>
#include <queue>

InterferenceGraph::InterferenceGraph(size_t k) : K(k) {}

void InterferenceGraph::build(LivenessAnalyzer& analyzer) {
    adjList.clear();
    degree.clear();
    edges.clear();
    variables.clear();

    if (!analyzer.block) return;

    auto& insts = analyzer.block->getInstructions();
    auto& liveSets = analyzer.getLiveSets();

    // Collect all variables
    std::set<std::string> allVars;
    for (size_t i = 0; i < liveSets.size(); ++i) {
        for (const auto& v : liveSets[i].liveOut) allVars.insert(v);
        for (const auto& v : liveSets[i].def) allVars.insert(v);
        for (const auto& v : liveSets[i].use) allVars.insert(v);
    }
    variables.assign(allVars.begin(), allVars.end());

    // Initialize adjList and degree
    for (const auto& v : variables) {
        adjList[v] = {};
        degree[v] = 0;
    }

    // Add edges based on liveOut sets
    for (size_t i = 0; i < liveSets.size(); ++i) {
        const auto& liveOut = liveSets[i].liveOut;
        const auto& def = liveSets[i].def;
        
        // Variables in liveOut interfere with each other
        std::vector<std::string> liveList(liveOut.begin(), liveOut.end());
        for (size_t j = 0; j < liveList.size(); ++j) {
            for (size_t k = j + 1; k < liveList.size(); ++k) {
                addEdge(liveList[j], liveList[k]);
            }
        }

        // Variables defined interfere with liveOut (except the defined one)
        for (const auto& d : def) {
            for (const auto& lo : liveOut) {
                if (d != lo) {
                    addEdge(d, lo);
                }
            }
        }
    }
}

void InterferenceGraph::addEdge(const std::string& a, const std::string& b) {
    if (a == b) return;
    std::string u = (a < b) ? a : b;
    std::string v = (a < b) ? b : a;
    
    if (edges.count({u, v})) return;
    
    edges.insert({u, v});
    adjList[a].insert(b);
    adjList[b].insert(a);
    degree[a]++;
    degree[b]++;
}

int InterferenceGraph::getDegree(const std::string& var) const {
    auto it = degree.find(var);
    return (it != degree.end()) ? it->second : 0;
}

std::set<std::string> InterferenceGraph::getNeighbors(const std::string& var) const {
    auto it = adjList.find(var);
    return (it != adjList.end()) ? it->second : std::set<std::string>();
}

void InterferenceGraph::removeNode(const std::string& var) {
    if (adjList.find(var) == adjList.end()) return;
    
    for (const auto& neighbor : adjList[var]) {
        adjList[neighbor].erase(var);
        degree[neighbor]--;
        std::string u = (var < neighbor) ? var : neighbor;
        std::string v = (var < neighbor) ? neighbor : var;
        edges.erase({u, v});
    }
    
    adjList.erase(var);
    degree.erase(var);
}

bool InterferenceGraph::hasEdge(const std::string& a, const std::string& b) const {
    std::string u = (a < b) ? a : b;
    std::string v = (a < b) ? b : a;
    return edges.count({u, v}) > 0;
}

std::string InterferenceGraph::toString() const {
    std::ostringstream oss;
    oss << "Interference Graph (K=" << K << "):\n";
    oss << "Variables: ";
    for (const auto& v : variables) oss << v << " ";
    oss << "\n";
    oss << "Edges:\n";
    for (const auto& e : edges) {
        oss << "  " << e.u << " -- " << e.v << "\n";
    }
    oss << "Degrees:\n";
    for (const auto& v : variables) {
        auto it = degree.find(v);
        oss << "  " << v << ": " << (it != degree.end() ? it->second : 0) << "\n";
    }
    return oss.str();
}

std::string InterferenceGraph::toJSON() const {
    std::ostringstream oss;
    oss << "{\n";
    oss << "  \"K\": " << K << ",\n";
    oss << "  \"variables\": [";
    for (size_t i = 0; i < variables.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "\"" << variables[i] << "\"";
    }
    oss << "],\n";
    oss << "  \"degrees\": {\n";
    for (size_t i = 0; i < variables.size(); ++i) {
        auto it = degree.find(variables[i]);
        oss << "    \"" << variables[i] << "\": " << (it != degree.end() ? it->second : 0);
        if (i + 1 < variables.size()) oss << ",";
        oss << "\n";
    }
    oss << "  },\n";
    oss << "  \"edges\": [\n";
    size_t ei = 0;
    for (const auto& e : edges) {
        oss << "    {\"source\": \"" << e.u << "\", \"target\": \"" << e.v << "\"}";
        if (++ei < edges.size()) oss << ",";
        oss << "\n";
    }
    oss << "  ]\n";
    oss << "}\n";
    return oss.str();
}

std::string InterferenceGraph::toDOT(const std::map<std::string, int>& colors) const {
    std::ostringstream oss;
    oss << "graph Interference {\n";
    oss << "  layout=neato;\n";
    oss << "  overlap=false;\n";
    oss << "  splines=true;\n";
    oss << "  node [shape=circle, style=filled, fontcolor=white, fontsize=12, width=0.5];\n";
    oss << "  edge [color=gray50, penwidth=1.5];\n\n";

    const char* colorNames[] = {"#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#ec4899", "#14b8a6", "#eab308"};

    for (const auto& v : variables) {
        std::string color = "#4a5568"; // default gray
        auto cit = colors.find(v);
        if (cit != colors.end() && cit->second >= 0) {
            color = colorNames[cit->second % 8];
        }
        oss << "  \"" << v << "\" [fillcolor=\"" << color << "\", label=\"" << v << "\"];\n";
    }

    oss << "\n";
    for (const auto& e : edges) {
        oss << "  \"" << e.u << "\" -- \"" << e.v << "\";\n";
    }

    oss << "}\n";
    return oss.str();
}

std::string InterferenceGraph::toDOTColored(const std::map<std::string, int>& assignment) const {
    return toDOT(assignment);
}

size_t InterferenceGraph::getVariableCount() const { return variables.size(); }
size_t InterferenceGraph::getEdgeCount() const { return edges.size(); }
