define i32 @spill_test(i32 %a, i32 %b, i32 %c, i32 %d, i32 %e, i32 %f) {
entry:
  %1 = add i32 %a, %b
  %2 = add i32 %1, %c
  %3 = add i32 %2, %d
  %4 = add i32 %3, %e
  %5 = add i32 %4, %f
  ret i32 %5
}
