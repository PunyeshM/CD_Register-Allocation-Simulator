#include "LivenessAnalyzer.h"
#include <sstream>
#include <algorithm>
#include <iostream>

LivenessAnalyzer::LivenessAnalyzer(BasicBlock* b) : block(b) {}

void LivenessAnalyzer::computeUseDef() {
    if (!block) return;
    size_t n = block->instructions.size();
    liveSets.resize(n);
    for (size_t i = 0; i < n; ++i) {
        liveSets[i].use = block->instructions[i].getUses();
        liveSets[i].def = block->instructions[i].getDefs();
    }
}

bool LivenessAnalyzer::computeLiveSets() {
    if (!block) return false;
    size_t n = block->instructions.size();
    computeUseDef();

    iterations.clear();

    bool changed = true;
    int maxIter = 100;
    while (changed && maxIter-- > 0) {
        changed = false;

        // Compute liveOut from successors
        for (int i = n - 1; i >= 0; --i) {
            std::set<std::string> newLiveOut;
            if (i + 1 < n) {
                newLiveOut = liveSets[i + 1].liveIn;
            }

            if (newLiveOut != liveSets[i].liveOut) {
                liveSets[i].liveOut = newLiveOut;
                changed = true;
            }

            // IN = USE ∪ (OUT - DEF)
            std::set<std::string> newLiveIn = liveSets[i].use;
            for (const auto& v : liveSets[i].liveOut) {
                if (liveSets[i].def.find(v) == liveSets[i].def.end()) {
                    newLiveIn.insert(v);
                }
            }

            if (newLiveIn != liveSets[i].liveIn) {
                liveSets[i].liveIn = newLiveIn;
                changed = true;
            }
        }

        // Save iteration snapshot
        LivenessIteration iter;
        iter.changed = changed;
        iter.state = liveSets;
        iterations.push_back(iter);
    }

    computeLiveRanges();
    return true;
}

void LivenessAnalyzer::computeLiveRanges() {
    liveRanges.clear();
    if (!block) return;

    // Collect all variables
    std::set<std::string> allVars;
    for (const auto& ls : liveSets) {
        for (const auto& v : ls.liveIn) allVars.insert(v);
        for (const auto& v : ls.liveOut) allVars.insert(v);
        for (const auto& v : ls.use) allVars.insert(v);
        for (const auto& v : ls.def) allVars.insert(v);
    }

    for (const auto& var : allVars) {
        std::vector<size_t> range;
        for (size_t i = 0; i < liveSets.size(); ++i) {
            if (liveSets[i].liveIn.count(var) || liveSets[i].liveOut.count(var) ||
                liveSets[i].use.count(var) || liveSets[i].def.count(var)) {
                range.push_back(i);
            }
        }
        if (!range.empty()) {
            liveRanges[var] = range;
        }
    }
}

std::string LivenessAnalyzer::toString() const {
    std::ostringstream oss;
    oss << "Liveness Analysis:\n";
    for (size_t i = 0; i < liveSets.size(); ++i) {
        const auto& inst = block->instructions[i];
        const auto& ls = liveSets[i];
        oss << "I" << i << " " << inst.toString() << "\n";
        oss << "  USE: {";
        for (const auto& v : ls.use) oss << v << " ";
        oss << "}\n";
        oss << "  DEF: {";
        for (const auto& v : ls.def) oss << v << " ";
        oss << "}\n";
        oss << "  LIVE-IN: {";
        for (const auto& v : ls.liveIn) oss << v << " ";
        oss << "}\n";
        oss << "  LIVE-OUT: {";
        for (const auto& v : ls.liveOut) oss << v << " ";
        oss << "}\n";
    }

    oss << "\nLive Ranges:\n";
    for (const auto& [var, range] : liveRanges) {
        oss << var << ": [";
        for (size_t i = 0; i < range.size(); ++i) {
            if (i > 0) oss << ", ";
            oss << range[i];
        }
        oss << "]\n";
    }

    return oss.str();
}

std::string LivenessAnalyzer::toJSON() const {
    std::ostringstream oss;
    oss << "{\n";
    oss << "  \"iterations\": " << iterations.size() << ",\n";
    oss << "  \"instructions\": [\n";
    for (size_t i = 0; i < liveSets.size(); ++i) {
        const auto& inst = block->instructions[i];
        const auto& ls = liveSets[i];
        oss << "    {\n";
        oss << "      \"id\": " << i << ",\n";
        oss << "      \"text\": \"" << inst.toString() << "\",\n";

        auto printSet = [&](const std::set<std::string>& s) {
            oss << "[";
            size_t j = 0;
            for (const auto& v : s) {
                if (j++ > 0) oss << ",";
                oss << "\"" << v << "\"";
            }
            oss << "]";
        };

        oss << "      \"use\": "; printSet(ls.use); oss << ",\n";
        oss << "      \"def\": "; printSet(ls.def); oss << ",\n";
        oss << "      \"liveIn\": "; printSet(ls.liveIn); oss << ",\n";
        oss << "      \"liveOut\": "; printSet(ls.liveOut); oss << "\n";
        oss << "    }" << (i + 1 < liveSets.size() ? "," : "") << "\n";
    }
    oss << "  ],\n";
    oss << "  \"liveRanges\": {\n";
    size_t rIdx = 0;
    for (const auto& [var, range] : liveRanges) {
        oss << "    \"" << var << "\": [";
        for (size_t i = 0; i < range.size(); ++i) {
            if (i > 0) oss << ", ";
            oss << range[i];
        }
        oss << "]" << (++rIdx < liveRanges.size() ? "," : "") << "\n";
    }
    oss << "  }\n";
    oss << "}\n";
    return oss.str();
}

const std::vector<LiveSet>& LivenessAnalyzer::getLiveSets() const { return liveSets; }
const std::vector<LivenessIteration>& LivenessAnalyzer::getIterations() const { return iterations; }
const std::map<std::string, std::vector<size_t>>& LivenessAnalyzer::getLiveRanges() const { return liveRanges; }

std::string LivenessAnalyzer::toDOT() const {
    std::ostringstream oss;
    oss << "digraph Liveness {\n";
    oss << "  rankdir=TB;\n";
    oss << "  node [shape=plaintext];\n";
    oss << "  splines=ortho;\n\n";

    for (size_t i = 0; i < liveSets.size(); ++i) {
        const auto& inst = block->instructions[i];
        const auto& ls = liveSets[i];
        std::string label = inst.toString();
        
        auto setToString = [](const std::set<std::string>& s) -> std::string {
            if (s.empty()) return "∅";
            std::string r;
            for (const auto& v : s) r += v + " ";
            return r;
        };

        oss << "  I" << i << " [label=<\n";
        oss << "    <table border=\"0\" cellborder=\"1\" cellspacing=\"0\">\n";
        oss << "      <tr><td colspan=\"2\" bgcolor=\"#4a90d9\"><font color=\"white\">" << label << "</font></td></tr>\n";
        oss << "      <tr><td bgcolor=\"#e8f4f8\">USE</td><td>" << setToString(ls.use) << "</td></tr>\n";
        oss << "      <tr><td bgcolor=\"#e8f4f8\">DEF</td><td>" << setToString(ls.def) << "</td></tr>\n";
        oss << "      <tr><td bgcolor=\"#f0e6ff\">LIVE-IN</td><td>" << setToString(ls.liveIn) << "</td></tr>\n";
        oss << "      <tr><td bgcolor=\"#f0e6ff\">LIVE-OUT</td><td>" << setToString(ls.liveOut) << "</td></tr>\n";
        oss << "    </table>>];\n\n";
    }

    for (size_t i = 0; i + 1 < liveSets.size(); ++i) {
        oss << "  I" << i << " -> I" << (i + 1) << " [style=dashed, color=gray];\n";
    }

    oss << "}\n";
    return oss.str();
}
