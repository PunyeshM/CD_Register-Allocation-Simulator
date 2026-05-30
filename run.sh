#!/bin/bash
# Register Allocation Simulator - Run Script
# Usage: ./run.sh <path_to_ll_file> <num_registers>

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Default values
TEST_FILE="${1:-testcases/simple.ll}"
NUM_REGS="${2:-4}"

# Determine executable path based on OS
EXE_PATH="backend/build/rasim"
if [ -f "backend/build/rasim.exe" ]; then
    EXE_PATH="backend/build/rasim.exe"
fi

if [ ! -f "$EXE_PATH" ]; then
    echo "Error: Backend executable not found. Please run ./build.sh first."
    exit 1
fi

if [ ! -f "$TEST_FILE" ]; then
    echo "Error: Test file $TEST_FILE not found."
    exit 1
fi

echo "Running Simulator on $TEST_FILE with $NUM_REGS registers..."
"$EXE_PATH" "$TEST_FILE" "$NUM_REGS"

echo ""
echo "Execution completed. Check 'graphs/' directory for DOT and JSON outputs."
