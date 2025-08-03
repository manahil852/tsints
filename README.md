# tsints

a parser for typescript types, written in typescript types (no js here!)

## testimonials

> please no please I beg you — [@jakebailey.dev](https://bsky.app/profile/jakebailey.dev/post/3lvhyr23ir22u)

> EM WHAT THE FUCK

> ur deranged

> hell yeah

> i cant wait to do ludicrous shit with ts7 speeds

## usage

code like this

```ts
import type { Parse } from "./parser/index.ts";
type _ = Parse<"{some:[ts, 'type']}">;
```

evaluates to a `@babel/parser`-style AST

```ts
type _ = {
  type: "TSTypeLiteral";
  members: [
    {
      type: "TSPropertySignature";
      key: {
        type: "Identifier";
        name: "some";
      };
      computed: false;
      typeAnnotation: {
        type: "TSTypeAnnotation";
        typeAnnotation: {
          type: "TSTupleType";
          elementTypes: [
            {
              type: "TSTypeReference";
              typeName: {
                type: "Identifier";
                name: "ts";
              };
            },
            {
              type: "TSLiteralType";
              literal: {
                type: "StringLiteral";
                raw: "'type'";
              };
            },
          ];
        };
      };
    },
  ];
};
```

## should i use this

idk, do you want to spend 5 extra seconds every time you run tsc waiting for it to evaluate the parsing code?
