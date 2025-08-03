type _ =
  | ((arg: string) => number)
  | ((arg1: T, arg2: U) => void)
  | ((...args: string[]) => boolean)
  | ((this: HTMLElement, event: Event) => void)
  | ((a: number, b?: string) => any)
  | (<T>(value: T) => T[])
  | (() => void);