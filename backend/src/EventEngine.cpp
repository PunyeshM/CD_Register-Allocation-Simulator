#include "EventEngine.h"
#include <chrono>

std::string SimulationEvent::toJSON() const {
    std::string json = "{";
    json += "\"id\":\"" + id + "\",";
    json += "\"type\":\"" + type + "\",";
    json += "\"timestamp\":" + std::to_string(timestamp) + ",";
    json += "\"phase\":\"" + phase + "\"";
    
    if (!variable.empty()) {
        json += ",\"variable\":\"" + variable + "\"";
    }
    if (!explanation.empty()) {
        // Escape quotes
        std::string escaped = explanation;
        size_t pos = 0;
        while ((pos = escaped.find("\"", pos)) != std::string::npos) {
            escaped.replace(pos, 1, "\\\"");
            pos += 2;
        }
        json += ",\"explanation\":\"" + escaped + "\"";
    }
    if (!payload_json.empty() && payload_json != "{}") {
        json += ",\"payload\":" + payload_json;
    }
    json += "}";
    return json;
}

long long EventStore::getTimestamp() const {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}

void EventStore::emit(const std::string& type, const std::string& phase, const std::string& explanation, const std::string& variable, const std::string& payload_json) {
    SimulationEvent e;
    e.id = "cpp_evt_" + std::to_string(nextId++);
    e.type = type;
    e.timestamp = getTimestamp();
    e.phase = phase;
    e.variable = variable;
    e.explanation = explanation;
    e.payload_json = payload_json;
    events.push_back(e);
}

std::string EventStore::toJSON() const {
    std::string json = "[";
    for (size_t i = 0; i < events.size(); ++i) {
        json += events[i].toJSON();
        if (i < events.size() - 1) json += ",";
    }
    json += "]";
    return json;
}

void EventStore::clear() {
    events.clear();
    nextId = 0;
}
