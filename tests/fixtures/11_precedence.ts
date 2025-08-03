type _ = [
    |0,
    &0,
    1 extends 2 ? | keyof 1 & 2 | 1[] : & 1,
]