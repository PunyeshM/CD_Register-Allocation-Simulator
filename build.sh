#!/bin/bash
# Register Allocation Simulator - Build Script

# Ensure we're in the right directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Building the Backend C++ Simulator..."
mkdir -p backend/build
cd backend/build
cmake ..
cmake --build . --config Release

echo "Build complete! Backend executable available at backend/build/rasim"
