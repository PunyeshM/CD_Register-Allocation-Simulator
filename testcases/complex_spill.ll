define i32 @complex_spill(i32 %a, i32 %b, i32 %c, i32 %d, i32 %e, i32 %f, i32 %g) {
entry:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  %4 = add i32 %3, %e
  %5 = mul i32 %4, %f
  %6 = sub i32 %5, %g
  %7 = add i32 %1, %6
  %8 = mul i32 %2, %7
  %9 = add i32 %8, %3
  %10 = sub i32 %9, %4
  %11 = add i32 %10, %5
  ret i32 %11
}
