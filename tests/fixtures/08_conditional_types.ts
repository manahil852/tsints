type _ =
  | (A extends B ? C : D)
  | (T extends (infer U)[] ? U : T)
  | (SomeType extends infer R ? (R extends string ? number : boolean) : never)
  | SomeType extends infer R ? R extends string ? number : boolean : never;