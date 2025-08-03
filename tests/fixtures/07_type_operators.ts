type _ =
  | keyof (string | number)
  | unique symbol
  | readonly string[]
  | infer K
