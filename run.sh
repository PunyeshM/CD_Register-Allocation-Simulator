#!/bin/bash
# Register Allocation Simulator - Run Script
# Usage: ./run.sh <path_to_ll_file> <num_registers>
#
# Examples:
#   ./run.sh testcases/simple.ll 4
#   ./run.sh testcases/spill_required.ll 2
#   ./run.sh testcases/complex_spill.ll 3

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Default values
TEST_FILE="${1:-testcases/simple.ll}"
NUM_REGS="${2:-4}"

# Determine executable path based on OS
EXE_PATH="backend/build/rasim"
if [ -f "backend/build/rasim.exe" ]; then
    EXE_PATH="backend/build/rasim.exe"
elif [ -f "backend/build/Release/rasim.exe" ]; then
    EXE_PATH="backend/build/Release/rasim.exe"
fi

# Validate executable
if [ ! -f "$EXE_PATH" ]; then
    echo "Error: Backend executable not found at '$EXE_PATH'."
    echo "       Please run './build.sh' first."
    exit 1
fi

# Validate test file
if [ ! -f "$TEST_FILE" ]; then
    echo "Error: Test file '$TEST_FILE' not found."
    echo "       Available test cases:"
    ls testcases/*.ll 2>/dev/null | sed 's/^/         /'
    exit 1
fi

echo "=============================================="
echo " Register Allocation Simulator"
echo "=============================================="
echo " Test case : $TEST_FILE"
echo " Registers : K = $NUM_REGS"
echo "=============================================="
echo ""

# Run the allocator: pass test file as first arg, and K via -k flag
"$EXE_PATH" "$TEST_FILE" -k "$NUM_REGS"

echo ""
echo "=============================================="
echo " DOT and JSON outputs saved to: graphs/"
echo "=============================================="
