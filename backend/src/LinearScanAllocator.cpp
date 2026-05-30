#include "LinearScanAllocator.h"
#include "EventEngine.h"
#include <algorithm>
#include <set>

LinearScanAllocator::LinearScanAllocator(const std::vector<Instruction>& insts, const std::vector<LiveSet>& sets, size_t k)
    : instructions(insts), liveSets(sets), K(k) {}

void LinearScanAllocator::buildIntervals() {
    std::set<std::string> allVars;
    for (const auto& s : liveSets) {
        for (const auto& v : s.liveIn) allVars.insert(v);
        for (const auto& v : s.liveOut) allVars.insert(v);
        for (const auto& v : s.use) allVars.insert(v);
        for (const auto& v : s.def) allVars.insert(v);
    }

    for (const auto& v : allVars) {
        int start = -1;
        int end = -1;
        for (size_t i = 0; i < liveSets.size(); ++i) {
            const auto& s = liveSets[i];
            bool contains = std::find(s.liveIn.begin(), s.liveIn.end(), v) != s.liveIn.end() ||
                            std::find(s.liveOut.begin(), s.liveOut.end(), v) != s.liveOut.end() ||
                            std::find(s.use.begin(), s.use.end(), v) != s.use.end() ||
                            std::find(s.def.begin(), s.def.end(), v) != s.def.end();
            if (contains) {
                if (start == -1) start = i;
                end = i;
            }
        }
        if (start != -1) {
            intervals.push_back({v, start, end, -1});
        }
    }

    std::sort(intervals.begin(), intervals.end(), [](const LiveInterval& a, const LiveInterval& b) {
        return a.start < b.start;
    });
}

void LinearScanAllocator::expireOldIntervals(const LiveInterval& i) {
    std::sort(active.begin(), active.end(), [](const LiveInterval& a, const LiveInterval& b) {
        return a.end < b.end;
    });

    auto it = active.begin();
    while (it != active.end()) {
        if (it->end >= i.start) break;
        it = active.erase(it);
    }
}

void LinearScanAllocator::spillAtInterval(const LiveInterval& i) {
    auto spillIt = active.back();
    if (spillIt.end > i.end) {
        assignment[i.variable] = spillIt.registerId;
        spillCandidates.push_back(spillIt.variable);
        active.pop_back();
        active.push_back(i);
        std::sort(active.begin(), active.end(), [](const LiveInterval& a, const LiveInterval& b) {
            return a.end < b.end;
        });
    } else {
        spillCandidates.push_back(i.variable);
    }
}

void LinearScanAllocator::allocate() {
    buildIntervals();
    
    std::vector<int> freeRegisters(K);
    for (size_t i = 0; i < K; ++i) freeRegisters[i] = i;

    for (auto& i : intervals) {
        expireOldIntervals(i);
        
        if (active.size() == K) {
            spillAtInterval(i);
        } else {
            // Find a free register
            std::set<int> used;
            for (const auto& a : active) used.insert(a.registerId);
            
            int reg = -1;
            for (int r = 0; r < K; ++r) {
                if (used.find(r) == used.end()) {
                    reg = r;
                    break;
                }
            }
            
            i.registerId = reg;
            assignment[i.variable] = reg;
            active.push_back(i);
        }
    }
    
    // Fire events (simplified for this extension)
    for (const auto& kv : assignment) {
        EventStore::getInstance().emit("RegisterAllocated", "allocation", "Linear scan assigned register", kv.first, "{\"color\":" + std::to_string(kv.second) + "}");
    }
}

std::string LinearScanAllocator::toJSON() const {
    // Basic output format matching the Chaitin one for now
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
