#!/bin/bash
# Register Allocation Simulator — Build Script
#
# Compiles the C++17 backend (Chaitin graph-coloring register allocator)
# using CMake.  After a successful build the executable is placed at:
#   backend/build/rasim   (Linux/macOS)
#   backend/build/Release/rasim.exe  (Windows / MSVC)

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=============================================="
echo " Register Allocation Simulator — Build"
echo "=============================================="

# Create output directory
mkdir -p backend/build
cd backend/build

echo "[1/3] Configuring with CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Release

echo "[2/3] Building..."
cmake --build . --config Release

echo "[3/3] Verifying executable..."
EXE=""
if [ -f "rasim" ]; then
    EXE="rasim"
elif [ -f "rasim.exe" ]; then
    EXE="rasim.exe"
elif [ -f "Release/rasim.exe" ]; then
    EXE="Release/rasim.exe"
fi

if [ -z "$EXE" ]; then
    echo "ERROR: Build succeeded but executable not found."
    exit 1
fi

echo ""
echo "=============================================="
echo " Build complete!"
echo " Executable : backend/build/$EXE"
echo " Usage      : ./run.sh <testcase.ll> <K>"
echo " Example    : ./run.sh testcases/simple.ll 4"
echo "=============================================="
