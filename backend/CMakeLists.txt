cmake_minimum_required(VERSION 3.14)
project(RegisterAllocator VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Sources
set(SOURCES
    src/Instruction.cpp
    src/BasicBlock.cpp
    src/LivenessAnalyzer.cpp
    src/InterferenceGraph.cpp
    src/RegisterAllocator.cpp
    src/CFGGenerator.cpp
    src/EventEngine.cpp
    src/LinearScanAllocator.cpp
    src/OptimisticColoringAllocator.cpp
    src/main.cpp
)

# Main executable
add_executable(rasim ${SOURCES})
target_include_directories(rasim PRIVATE include)

# Test executable
add_executable(run_tests
    src/Instruction.cpp
    src/BasicBlock.cpp
    src/LivenessAnalyzer.cpp
    src/InterferenceGraph.cpp
    src/RegisterAllocator.cpp
    tests/test_allocator.cpp
)
target_include_directories(run_tests PRIVATE include)

# Install
install(TARGETS rasim DESTINATION bin)
install(TARGETS run_tests DESTINATION bin)

# Custom target for graphs
add_custom_target(graphs ALL
    COMMAND ${CMAKE_COMMAND} -E make_directory "graphs"
    COMMENT "Creating graphs output directory"
)
