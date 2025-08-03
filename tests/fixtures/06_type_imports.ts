type _ = [
    import("./a"),
    import("./a").b.c,
    import("./a").b.c<T>,
    import("./a", {with:{type:"json"}}),
    import("./a", {with:{"resolution-mode": "import"}}).b.c,
    import("./a", {with:{}}).b.c<T>,
    // supported by ts but not babel:
    // import("./a", {with:{},}).b.c<T>,
]