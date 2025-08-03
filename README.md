# tsints

a parser for typescript types, written in typescript types (no js here!)

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

idk, do you want to wait 5 seconds waiting for typescript to evaluate the parsing code?
