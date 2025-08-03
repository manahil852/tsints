type _ = {
    a: _
    b: _
    ;
    c?: _,
    [d](): _;
    readonly e: _;
    readonly f: _;
    readonly g: _;
    readonly [h]: _;
    readonly [h: i]: _;
    i?(): _;
    j?<T>(): _;
    get k(): _;
    set k(l);
    get l(): _;
    set l(l);
    get?: _,
    m;
    (): a;
    new (): a;
    <T>(): a;
    new <T>(): a;
    nested1?: {
        nested2: {}
        ,
    };
};
