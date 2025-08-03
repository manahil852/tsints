type _ =
  | ((value: unknown) => asserts value is string)
  | ((this: any) => asserts this is MyType)
  | ((input: any) => input is (string | number))
  | ((arg: string) => asserts arg)