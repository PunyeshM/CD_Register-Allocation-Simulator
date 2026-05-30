define i32 @high_pressure(i32 %a, i32 %b, i32 %c, i32 %d, i32 %e, i32 %f, i32 %g) {
entry:
  %1 = add i32 %a, %b
  %2 = add i32 %c, %d
  %3 = add i32 %e, %f
  %4 = add i32 %1, %2
  %5 = add i32 %3, %4
  %6 = add i32 %5, %g
  ret i32 %6
}
