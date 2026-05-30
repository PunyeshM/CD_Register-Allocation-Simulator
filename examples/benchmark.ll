define i32 @benchmark(i32 %x, i32 %y, i32 %z) {
entry:
  %1 = add i32 %x, %y
  %2 = mul i32 %1, %z
  %3 = sub i32 %2, %x
  %4 = add i32 %3, %y
  %5 = mul i32 %4, %z
  %6 = sub i32 %5, %1
  %7 = add i32 %6, %2
  %8 = mul i32 %7, %3
  ret i32 %8
}
