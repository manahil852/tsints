type _ = [
    {-readonly [K in keyof T]?: T[K]; },
    {+readonly [P in "a" | "b"]: P;},
    {[K in keyof T]+?: T[K]; },
    {[K in keyof T]-?: T[K]; },
    {[Q in string as `get${Capitalize<Q>}`]: Q;},
]