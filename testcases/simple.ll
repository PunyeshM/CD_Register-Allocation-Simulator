define i32 @simple(i32 %a, i32 %b, i32 %c, i32 %d) {
entry:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
}
