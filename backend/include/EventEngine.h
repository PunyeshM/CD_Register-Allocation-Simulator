#ifndef EVENT_ENGINE_H
#define EVENT_ENGINE_H

#include <string>
#include <vector>

struct SimulationEvent {
    std::string id;
    std::string type;
    long long timestamp;
    std::string phase;
    std::string variable;
    std::string payload_json; // Store JSON as string for simplicity
    std::string explanation;

    std::string toJSON() const;
};

class EventStore {
private:
    std::vector<SimulationEvent> events;
    int nextId = 0;
    
    // Simple helper to get current timestamp
    long long getTimestamp() const;

public:
    static EventStore& getInstance() {
        static EventStore instance;
        return instance;
    }

    void emit(const std::string& type, const std::string& phase, const std::string& explanation = "", const std::string& variable = "", const std::string& payload_json = "{}");
    
    std::string toJSON() const;
    void clear();
};

#endif // EVENT_ENGINE_H
