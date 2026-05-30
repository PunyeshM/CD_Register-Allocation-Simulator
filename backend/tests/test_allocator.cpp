#include <iostream>
#include <cassert>
#include <string>
#include "Instruction.h"
#include "BasicBlock.h"
#include "LivenessAnalyzer.h"
#include "InterferenceGraph.h"
#include "RegisterAllocator.h"

int testsPassed = 0;
int testsFailed = 0;

#define TEST(name, expr) \
    do { \
        if (!(expr)) { \
            std::cerr << "FAIL: " << name << std::endl; \
            testsFailed++; \
        } else { \
            std::cout << "PASS: " << name << std::endl; \
            testsPassed++; \
        } \
    } while(0)

void test_instruction_parse() {
    Instruction inst = Instruction::parse("%1 = add i32 %a, %b", 0);
    TEST("parse add result", inst.result == "%1");
    TEST("parse add opcode", inst.opcode == Opcode::ADD);
    TEST("parse add operands size", inst.operands.size() == 2);
    TEST("parse add operands[0]", inst.operands[0] == "%a");
    TEST("parse add operands[1]", inst.operands[1] == "%b");
}

void test_instruction_uses_defs() {
    Instruction inst1 = Instruction::parse("%1 = add i32 %a, %b", 0);
    auto uses = inst1.getUses();
    auto defs = inst1.getDefs();
    TEST("uses contains %a", uses.count("%a") == 1);
    TEST("uses contains %b", uses.count("%b") == 1);
    TEST("defs contains %1", defs.count("%1") == 1);
    
    Instruction inst2 = Instruction::parse("ret i32 %3", 1);
    auto uses2 = inst2.getUses();
    auto defs2 = inst2.getDefs();
    TEST("ret uses %3", uses2.count("%3") == 1);
    TEST("ret has no defs", defs2.empty());
}

void test_basic_block_parse() {
    std::string ir = R"(
define i32 @test(i32 %a, i32 %b) {
entry:
  %1 = add i32 %a, %b
  ret i32 %1
}
)";

    BasicBlock bb("entry");
    bb.parseFromIR(ir);
    TEST("parsed 2 instructions", bb.getInstructions().size() == 2);
    TEST("first inst result", bb.getInstructions()[0].result == "%1");
}

void test_liveness_analysis() {
    std::string ir = R"(
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
)";
    BasicBlock bb("entry");
    bb.parseFromIR(ir);
    LivenessAnalyzer analyzer(&bb);
    analyzer.computeLiveSets();
    
    auto& sets = analyzer.getLiveSets();
    TEST("liveness computed", sets.size() == 4);
    TEST("liveSets size matches instructions", sets.size() == bb.getInstructions().size());
    
    // Last instruction should have liveOut empty
    TEST("last instruction liveOut empty", sets[3].liveOut.empty());
}

void test_interference_graph() {
    std::string ir = R"(
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
)";
    BasicBlock bb("entry");
    bb.parseFromIR(ir);
    LivenessAnalyzer analyzer(&bb);
    analyzer.computeLiveSets();
    
    InterferenceGraph ig(4);
    ig.build(analyzer);
    
    TEST("graph has variables", ig.getVariableCount() > 0);
    TEST("graph has edges", ig.getEdgeCount() > 0);
}

void test_spill_detection() {
    // Create 6 variables with high interference
    std::string ir = R"(
  %1 = add i32 %a, %b
  %2 = add i32 %1, %c
  %3 = add i32 %2, %d
  %4 = add i32 %3, %e
  %5 = add i32 %4, %f
  %6 = add i32 %5, %g
  ret i32 %6
)";
    BasicBlock bb("entry");
    bb.parseFromIR(ir);
    LivenessAnalyzer analyzer(&bb);
    analyzer.computeLiveSets();
    
    InterferenceGraph ig(2); // Only 2 registers
    ig.build(analyzer);
    
    RegisterAllocator allocator(ig);
    allocator.allocate();
    
    TEST("spill detected with 2 registers", allocator.spillRequired || !allocator.spillCandidates.empty());
}

void test_no_spill_with_enough_registers() {
    std::string ir = R"(
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
)";
    BasicBlock bb("entry");
    bb.parseFromIR(ir);
    LivenessAnalyzer analyzer(&bb);
    analyzer.computeLiveSets();
    
    InterferenceGraph ig(4);
    ig.build(analyzer);
    
    RegisterAllocator allocator(ig);
    allocator.allocate();
    
    TEST("no spill with 4 registers", !allocator.spillRequired);
}

int main() {
    std::cout << "=== Register Allocator Tests ===" << std::endl;
    std::cout << std::endl;
    
    test_instruction_parse();
    test_instruction_uses_defs();
    test_basic_block_parse();
    test_liveness_analysis();
    test_interference_graph();
    test_spill_detection();
    test_no_spill_with_enough_registers();
    
    std::cout << std::endl;
    std::cout << "=== Results ===" << std::endl;
    std::cout << "Passed: " << testsPassed << ", Failed: " << testsFailed << std::endl;
    
    return testsFailed > 0 ? 1 : 0;
}
