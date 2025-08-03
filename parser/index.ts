import type {
  ErrorObject,
  Position,
  PropagateErrorOr,
  Simplify,
  Token,
  Tokens,
} from "../common/types.ts";
import type { Tokenize } from "../tokenizer/index.ts";
import type { TSKeywordMap } from "./constants.ts";
type ContextError<M extends string, T extends Tokens> = {
  error: M;
  pos: T extends [{ pos: infer Pos extends Position }, ...Tokens]
    ? Pos
    : { line: []; col: []; eof: true };
};
type ExpectedToken<Type extends string, T extends Tokens> = ContextError<
  `expected ${Type extends Token["type"]
    ? `token of type ${Type}`
    : `'${Type}'`}, but got ${T extends [
    {
      type: infer ActualType extends string;
      value: infer Value extends string;
    },
    ...Tokens,
  ]
    ? Type extends Token["type"]
      ? `${ActualType} '${Value}'`
      : `'${Value}'`
    : "end of input"}`,
  T
>;
type TSFillSignature<Base, T extends Tokens> =
  TSParseTypeParameters<T> extends infer Res
    ? Res extends {
        value: infer TypeParameters;
        rest: infer T extends Tokens;
      }
      ? TSParseFunctionSignatureParams<T> extends infer Res
        ? Res extends {
            value: infer ParamTypes;
            rest: [
              {
                value: "=>";
                type: "Punctuator";
              },
              ...infer rest extends Tokens,
            ];
          }
          ? TSParseReturnType<rest> extends infer Res
            ? Res extends {
                value: infer returnType extends object;
                rest: infer rest extends Tokens;
              }
              ? {
                  value: Simplify<
                    Base &
                      (TypeParameters extends undefined
                        ? {}
                        : {
                            typeParameters: TypeParameters;
                          }) & {
                        parameters: ParamTypes;
                        typeAnnotation: returnType;
                      }
                  >;
                  rest: rest;
                }
              : PropagateErrorOr<
                  Res,
                  ContextError<"TSParseReturnType failed", rest>
                >
            : never
          : PropagateErrorOr<
              Res,
              ContextError<"TSParseFunctionSignatureParams failed", T>
            >
        : never
      : PropagateErrorOr<Res, ContextError<"TSParseTypeParameters failed", T>>
    : never;
type TSParseEntityName<T extends Tokens, V = undefined> = T extends [
  {
    value: ".";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? Rest extends [
      {
        value: infer Name;
        type: "Identifier";
      },
      ...infer Rest extends Tokens,
    ]
    ? TSParseEntityName<
        Rest,
        V extends undefined
          ? {
              type: "Identifier";
              name: Name;
            }
          : {
              type: "TSQualifiedName";
              left: V;
              right: {
                type: "Identifier";
                name: Name;
              };
            }
      >
    : ExpectedToken<"Identifier", Rest>
  : {
      value: V;
      rest: T;
    };
type TSParseTypeQuery<T extends Tokens> = T extends [
  {
    value: infer Identifier;
    type: "Identifier";
  },
  ...infer Rest extends Tokens,
]
  ? (
      Identifier extends "import"
        ? TSParseImportType<Rest>
        : TSParseEntityName<
            Rest,
            {
              type: "Identifier";
              name: Identifier;
            }
          >
    ) extends infer Res
    ? Res extends {
        value: infer ExprName;
        rest: infer Rest extends Tokens;
      }
      ? TSParseTypeArguments<Rest> extends infer Res
        ? Res extends {
            value: infer Arguments;
            rest: infer Rest extends Tokens;
          }
          ? {
              value: Simplify<
                {
                  type: "TSTypeQuery";
                  exprName: ExprName;
                } & (Arguments extends undefined
                  ? {}
                  : {
                      typeArguments: Arguments;
                    })
              >;
              rest: Rest;
            }
          : PropagateErrorOr<
              Res,
              ContextError<"TSParseTypeArguments failed", Rest>
            >
        : never
      : PropagateErrorOr<Res, ContextError<"TSParseEntityName failed", Rest>>
    : never
  : ExpectedToken<"Identifier", T>;
type TSParseImportType<T extends Tokens> = T extends [
  {
    value: "(";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? Rest extends [
      {
        value: infer Argument;
        type: "String";
      },
      ...infer Rest extends Tokens,
    ]
    ? (
        Rest extends [
          {
            value: ",";
            type: "Punctuator";
          },
          ...infer Rest extends Tokens,
        ]
          ? Rest extends [
              {
                value: "{";
                type: "Punctuator";
              },
              ...infer Rest extends Tokens,
            ]
            ? Rest extends [
                {
                  value: "with";
                  type: "Identifier";
                },
                ...infer Rest extends Tokens,
              ]
              ? Rest extends [
                  {
                    value: ":";
                    type: "Punctuator";
                  },
                  ...infer Rest extends Tokens,
                ]
                ? Rest extends [
                    {
                      value: "{";
                      type: "Punctuator";
                    },
                    ...infer Rest extends Tokens,
                  ]
                  ? TSParseImportAttributes<Rest> extends infer Res
                    ? Res extends {
                        value: infer Value;
                        rest: infer Rest extends Tokens;
                      }
                      ? (
                          Rest extends [
                            {
                              value: ",";
                              type: "Punctuator";
                            },
                            ...infer Rest extends Tokens,
                          ]
                            ? Rest
                            : Rest
                        ) extends infer Rest extends Tokens
                        ? Rest extends [
                            {
                              value: "}";
                              type: "Punctuator";
                            },
                            ...infer Rest extends Tokens,
                          ]
                          ? {
                              options: {
                                type: "ObjectExpression";
                                properties: [
                                  {
                                    type: "ObjectProperty";
                                    method: false;
                                    key: { type: "Identifier"; name: "with" };
                                    computed: false;
                                    shorthand: false;
                                    value: Value;
                                  },
                                ];
                              };
                              rest: Rest;
                            }
                          : ExpectedToken<"}", Rest>
                        : never
                      : PropagateErrorOr<
                          Res,
                          ContextError<"TSParseTypeLiteral failed", Rest>
                        >
                    : never
                  : ExpectedToken<"{", Rest>
                : ExpectedToken<":", Rest>
              : ExpectedToken<"with", Rest>
            : ExpectedToken<"{", Rest>
          : { options: null; rest: Rest }
      ) extends infer Res
      ? Res extends { options: infer Options; rest: infer Rest extends Tokens }
        ? Rest extends [
            {
              value: ")";
              type: "Punctuator";
            },
            ...infer Rest extends Tokens,
          ]
          ? TSParseEntityName<Rest> extends infer Res
            ? Res extends {
                value: infer Qualifier;
                rest: infer Rest extends Tokens;
              }
              ? TSParseTypeArguments<Rest> extends infer Res
                ? Res extends {
                    value: infer Arguments;
                    rest: infer Rest extends Tokens;
                  }
                  ? {
                      value: Simplify<
                        {
                          type: "TSImportType";
                          argument: {
                            type: "StringLiteral";
                            raw: Argument;
                          };
                          options: Options;
                        } & (Qualifier extends undefined
                          ? {}
                          : {
                              qualifier: Qualifier;
                            }) &
                          (Arguments extends undefined
                            ? {}
                            : {
                                typeParameters: Arguments;
                              })
                      >;
                      rest: Rest;
                    }
                  : PropagateErrorOr<
                      Res,
                      ContextError<"TSParseTypeArguments failed", Rest>
                    >
                : never
              : PropagateErrorOr<
                  Res,
                  ContextError<"TSParseEntityName failed", Rest>
                >
            : never
          : ExpectedToken<")", Rest>
        : PropagateErrorOr<
            Res,
            ContextError<"failed to check for import attributes", Rest>
          >
      : never
    : ExpectedToken<"String", Rest>
  : ExpectedToken<"(", T>;
type TSParseImportAttribute<T extends Tokens> = T extends [
  {
    type: infer KeyType extends "String" | "Identifier";
    value: infer Key extends string;
  },
  ...infer Rest extends Tokens,
]
  ? Rest extends [
      {
        type: "Punctuator";
        value: ":";
      },
      ...infer Rest extends Tokens,
    ]
    ? Rest extends [
        {
          type: "String";
          value: infer Value;
        },
        ...infer Rest extends Tokens,
      ]
      ? {
          value: {
            type: "ObjectProperty";
            method: false;
            key: KeyType extends "Identifier"
              ? { type: "Identifier"; name: Key }
              : { type: "StringLiteral"; raw: Key };
            computed: false;
            shorthand: false;
            value: { type: "StringLiteral"; raw: Value };
          };
          rest: Rest;
        }
      : ExpectedToken<"String", Rest>
    : ExpectedToken<":", Rest>
  : ExpectedToken<"String' or 'Identifier", T>;
type TSParseImportAttributes<
  T extends Tokens,
  Acc extends any[] = [],
> = T extends [
  {
    value: "}";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: {
        type: "ObjectExpression";
        properties: Acc;
      };
      rest: Rest;
    }
  : T extends []
    ? ExpectedToken<",' or '}", T>
    : TSParseImportAttribute<T> extends infer Res
      ? Res extends {
          value: infer Attr;
          rest: infer AfterAttr extends Tokens;
        }
        ? AfterAttr extends [
            {
              value: ",";
              type: "Punctuator";
            },
            ...infer AfterComma extends Tokens,
          ]
          ? TSParseImportAttributes<AfterComma, [...Acc, Attr]>
          : AfterAttr extends [
                {
                  value: "}";
                  type: "Punctuator";
                },
                ...infer AfterAngle extends Tokens,
              ]
            ? {
                value: {
                  type: "ObjectExpression";
                  properties: [...Acc, Attr];
                };
                rest: AfterAngle;
              }
            : ExpectedToken<",' or '}", AfterAttr>
        : PropagateErrorOr<
            Res,
            ContextError<"TSParseImportAttribute failed", T>
          >
      : never;
type TSParseTupleElement<T extends Tokens> = (
  T extends [
    {
      value: "...";
      type: "Punctuator";
    },
    ...infer Rest extends Tokens,
  ]
    ? {
        restElement: true;
        rest: Rest;
      }
    : {
        restElement: false;
        rest: T;
      }
) extends {
  restElement: infer RestElement;
  rest: infer AfterRest extends Tokens;
}
  ? TSParseType<AfterRest> extends infer Res
    ? Res extends {
        value: infer Type;
        rest: infer Rest extends Tokens;
      }
      ? TSParseOptional<Rest> extends infer Res
        ? Res extends {
            optional: infer Optional;
            rest: infer Rest extends Tokens;
          }
          ? (
              Rest extends [
                {
                  type: "Punctuator";
                  value: ":";
                },
                ...infer Rest extends Tokens,
              ]
                ? AfterRest extends [
                    {
                      value: infer Name;
                    },
                    ...Tokens,
                  ]
                  ? TSParseType<Rest> extends infer Res
                    ? Res extends {
                        value: infer Type;
                        rest: infer Rest extends Tokens;
                      }
                      ? {
                          value: {
                            type: "TSNamedTupleMember";
                            optional: Optional;
                            label: {
                              type: "Identifier";
                              name: Name;
                            };
                            elementType: Type;
                          };
                          rest: Rest;
                        }
                      : PropagateErrorOr<
                          Res,
                          ContextError<"TSParseType failed", Rest>
                        >
                    : never
                  : ContextError<
                      "failed to get name for tuple. this shouldn't be possible?",
                      AfterRest
                    >
                : Optional extends true
                  ? {
                      value: {
                        type: "TSOptionalType";
                        typeAnnotation: Type;
                      };
                      rest: Rest;
                    }
                  : {
                      value: Type;
                      rest: Rest;
                    }
            ) extends infer Res
            ? Res extends {
                value: infer Type;
                rest: infer Rest extends Tokens;
              }
              ? {
                  value: RestElement extends true
                    ? {
                        type: "TSRestType";
                        typeAnnotation: Type;
                      }
                    : Type;
                  rest: Rest;
                }
              : PropagateErrorOr<
                  Res,
                  ContextError<"failed to parse tuple content", AfterRest>
                >
            : never
          : PropagateErrorOr<Res, ContextError<"TSParseOptional failed", Rest>>
        : never
      : PropagateErrorOr<Res, ContextError<"TSParseType failed", AfterRest>>
    : never
  : ContextError<"failed to check for `...`. this shouldn't be possible?", T>;
type TSParseTuple<T extends Tokens, Acc extends any[] = []> = T extends [
  {
    value: "]";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: {
        type: "TSTupleType";
        elementTypes: Acc;
      };
      rest: Rest;
    }
  : T extends []
    ? ExpectedToken<",' or ']", T>
    : TSParseTupleElement<T> extends infer Res
      ? Res extends {
          value: infer Element;
          rest: infer AfterElement extends Tokens;
        }
        ? AfterElement extends [
            {
              value: ",";
              type: "Punctuator";
            },
            ...infer AfterComma extends Tokens,
          ]
          ? TSParseTuple<AfterComma, [...Acc, Element]>
          : AfterElement extends [
                {
                  value: "]";
                  type: "Punctuator";
                },
                ...infer AfterAngle extends Tokens,
              ]
            ? {
                value: {
                  type: "TSTupleType";
                  elementTypes: [...Acc, Element];
                };
                rest: AfterAngle;
              }
            : ExpectedToken<",' or ']", AfterElement>
        : PropagateErrorOr<Res, ContextError<"TSParseTupleElement failed", T>>
      : never;
type TSParseTemplateLiteral<
  T extends Tokens,
  Quasis extends {
    type: "TemplateElement";
    raw: string;
    tail: boolean;
  }[],
  Expressions extends unknown[],
> =
  TSParseType<T> extends infer Res
    ? Res extends {
        value: infer Type;
        rest: infer Rest extends Tokens;
      }
      ? Rest extends [
          {
            value: `}${infer Raw extends string}\${`;
            type: "TemplateMiddle";
          },
          ...infer Rest extends Tokens,
        ]
        ? TSParseTemplateLiteral<
            Rest,
            [
              ...Quasis,
              {
                type: "TemplateElement";
                raw: Raw;
                tail: false;
              },
            ],
            [...Expressions, Type]
          >
        : Rest extends [
              {
                value: `}${infer Raw extends string}\``;
                type: "TemplateTail";
              },
              ...infer Rest extends Tokens,
            ]
          ? {
              value: {
                type: "TSLiteralType";
                literal: {
                  type: "TemplateLiteral";
                  expressions: [...Expressions, Type];
                  quasis: [
                    ...Quasis,
                    {
                      type: "TemplateElement";
                      raw: Raw;
                      tail: true;
                    },
                  ];
                };
              };
              rest: Rest;
            }
          : ExpectedToken<"}", Rest>
      : PropagateErrorOr<Res, ContextError<"TSParseType failed", T>>
    : never;
type TSParseNonArrayType<T extends Tokens> = T extends [
  {
    value: infer Raw extends string;
    type: infer Type extends "String" | "Numeric";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: {
        type: "TSLiteralType";
        literal: {
          type: `${Raw extends `${string}n` ? "BigInt" : Type}Literal`;
          raw: Raw;
        };
      };
      rest: Rest;
    }
  : T extends [
        {
          value: `\`${infer Raw extends string}\``;
          type: "NoSubstitutionTemplate";
        },
        ...infer Rest extends Tokens,
      ]
    ? {
        value: {
          type: "TSLiteralType";
          literal: {
            type: "TemplateLiteral";
            expressions: [];
            quasis: [
              {
                type: "TemplateElement";
                raw: Raw;
                tail: true;
              },
            ];
          };
        };
        rest: Rest;
      }
    : T extends [
          {
            value: `\`${infer Raw extends string}\${`;
            type: "TemplateHead";
          },
          ...infer Rest extends Tokens,
        ]
      ? TSParseTemplateLiteral<
          Rest,
          [
            {
              type: "TemplateElement";
              raw: Raw;
              tail: false;
            },
          ],
          []
        >
      : T extends [
            {
              value: "-";
              type: "Punctuator";
            },
            {
              value: infer Raw extends string;
              type: "Numeric";
            },
            ...infer Rest extends Tokens,
          ]
        ? {
            value: {
              type: "TSLiteralType";
              literal: {
                type: "UnaryExpression";
                operator: "-";
                prefix: true;
                argument: {
                  type: `${Raw extends `${string}n` ? "BigInt" : "Numeric"}Literal`;
                  raw: Raw;
                };
              };
            };
            rest: Rest;
          }
        : T extends [
              {
                value: infer Raw extends "true" | "false";
                type: "Identifier";
              },
              ...infer Rest extends Tokens,
            ]
          ? {
              value: {
                type: "TSLiteralType";
                literal: {
                  type: "BooleanLiteral";
                  value: Raw extends "true" ? true : false;
                };
              };
              rest: Rest;
            }
          : T extends [
                {
                  value: "import";
                  type: "Identifier";
                },
                ...infer Rest extends Tokens,
              ]
            ? TSParseImportType<Rest>
            : T extends [
                  {
                    value: "[";
                    type: "Punctuator";
                  },
                  ...infer Rest extends Tokens,
                ]
              ? TSParseTuple<Rest>
              : T extends [
                    {
                      value: "typeof";
                      type: "Identifier";
                    },
                    ...infer Rest extends Tokens,
                  ]
                ? TSParseTypeQuery<Rest>
                : T extends [
                      {
                        value: "(";
                        type: "Punctuator";
                      },
                      ...infer Rest extends Tokens,
                    ]
                  ? TSParseType<Rest> extends infer Res
                    ? Res extends {
                        value: infer Value;
                        rest: [
                          {
                            value: ")";
                            type: "Punctuator";
                          },
                          ...infer Rest extends Tokens,
                        ];
                      }
                      ? {
                          value: {
                            type: "TSParenthesizedType";
                            typeAnnotation: Value;
                          };
                          rest: Rest;
                        }
                      : PropagateErrorOr<
                          Res,
                          ContextError<"TSParseType failed", Rest>
                        >
                    : never
                  : T extends [
                        {
                          value: infer Name;
                          type: "Identifier";
                        },
                        ...infer Rest extends Tokens,
                      ]
                    ? (
                        Name extends infer KeywordType extends
                          keyof TSKeywordMap
                          ? Rest extends [
                              {
                                value: ".";
                                type: "Punctuator";
                              },
                              ...Tokens,
                            ]
                            ? undefined
                            : KeywordType
                          : undefined
                      ) extends infer KeywordType extends keyof TSKeywordMap
                      ? {
                          value: {
                            type: TSKeywordMap[KeywordType];
                          };
                          rest: Rest;
                        }
                      : TSParseEntityName<
                            Rest,
                            {
                              type: "Identifier";
                              name: Name;
                            }
                          > extends infer Res
                        ? Res extends {
                            value: infer TypeName;
                            rest: infer Rest extends Tokens;
                          }
                          ? TSParseTypeArguments<Rest> extends infer Res
                            ? Res extends {
                                value: infer Arguments;
                                rest: infer Rest extends Tokens;
                              }
                              ? {
                                  value: Simplify<
                                    {
                                      type: "TSTypeReference";
                                      typeName: TypeName;
                                    } & (Arguments extends undefined
                                      ? {}
                                      : {
                                          typeParameters: Arguments;
                                        })
                                  >;
                                  rest: Rest;
                                }
                              : PropagateErrorOr<
                                  Res,
                                  ContextError<
                                    "TSParseTypeArguments failed",
                                    Rest
                                  >
                                >
                            : never
                          : PropagateErrorOr<
                              Res,
                              ContextError<"TSParseEntityName failed", Rest>
                            >
                        : never
                    : T extends [
                          {
                            value: "{";
                            type: "Punctuator";
                          },
                          ...infer Rest extends Tokens,
                        ]
                      ? TSIsStartOfMappedType<Rest> extends true
                        ? TSParseMappedType<Rest>
                        : TSParseTypeLiteral<Rest>
                      : ContextError<`expected a type`, T>;

type TSParsePropertyName<T extends Tokens> = T extends [
  infer NameToken extends {
    value: string | number;
    type: "Identifier" | "String" | "Numeric";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: NameToken["type"] extends "Identifier"
        ? {
            type: "Identifier";
            name: NameToken["value"];
          }
        : {
            type: "Literal";
            raw: NameToken["value"];
          };
      rest: Rest;
    }
  : ContextError<"expected a property name (identifier, string, or number)", T>;

type TSParseMethodLikeSignatureBody<T extends Tokens> =
  TSParseTypeParameters<T> extends infer Res
    ? Res extends {
        value: infer TypeParameters;
        rest: infer AfterTParams extends Tokens;
      }
      ? TSParseFunctionSignatureParams<AfterTParams> extends infer Res
        ? Res extends {
            value: infer Parameters;
            rest: infer AfterParams extends Tokens;
          }
          ? TSParseTypeAnnotation<AfterParams> extends infer Res
            ? Res extends {
                typeAnnotation: infer ReturnType;
                rest: infer FinalRest extends Tokens;
              }
              ? {
                  value: {
                    parameters: Parameters;
                  } & (TypeParameters extends undefined
                    ? {}
                    : { typeParameters: TypeParameters }) &
                    (ReturnType extends undefined
                      ? {}
                      : { typeAnnotation: ReturnType });
                  rest: FinalRest;
                }
              : PropagateErrorOr<
                  Res,
                  ContextError<"failed to parse return type", AfterParams>
                >
            : never
          : PropagateErrorOr<
              Res,
              ContextError<"failed to parse parameters", AfterTParams>
            >
        : never
      : PropagateErrorOr<
          Res,
          ContextError<"failed to parse type parameters", T>
        >
    : never;
type TSParseComputedPropertyMember<
  T extends Tokens,
  IsReadonly extends boolean,
> = T extends [{ value: "["; type: "Punctuator" }, ...infer R extends Tokens]
  ? R extends [
      { value: infer Key extends string; type: "Identifier" },
      ...infer AfterKey extends Tokens,
    ]
    ? AfterKey extends [
        { value: "]"; type: "Punctuator" },
        ...infer AfterBracket extends Tokens,
      ]
      ? AfterBracket extends [{ value: "<" | "(" }, ...any]
        ? TSParseMethodLikeSignatureBody<AfterBracket> extends infer SigRes
          ? SigRes extends { value: infer Body; rest: infer Rest }
            ? {
                value: Simplify<
                  {
                    type: "TSMethodSignature";
                    kind: "method";
                    key: {
                      type: "Identifier";
                      name: Key;
                    };
                    computed: true;
                  } & (IsReadonly extends true ? { readonly: true } : {}) &
                    Body
                >;
                rest: Rest;
              }
            : PropagateErrorOr<
                SigRes,
                ContextError<"invalid method signature", AfterBracket>
              >
          : never
        : TSParseOptional<AfterBracket> extends {
              optional: infer IsOptional;
              rest: infer AfterOptional extends Tokens;
            }
          ? TSParseTypeAnnotation<AfterOptional> extends infer AnnRes
            ? AnnRes extends {
                typeAnnotation: infer TypeAnn;
                rest: infer FinalRest;
              }
              ? {
                  value: Simplify<
                    {
                      type: "TSPropertySignature";
                      key: {
                        type: "Identifier";
                        name: Key;
                      };
                      computed: true;
                    } & (TypeAnn extends undefined
                      ? {}
                      : { typeAnnotation: TypeAnn }) &
                      (IsOptional extends true ? { optional: true } : {}) &
                      (IsReadonly extends true ? { readonly: true } : {})
                  >;
                  rest: FinalRest;
                }
              : PropagateErrorOr<
                  AnnRes,
                  ContextError<
                    "expected type annotation for property",
                    AfterOptional
                  >
                >
            : never
          : never
      : ExpectedToken<"]", AfterKey>
    : ExpectedToken<"Identifier", R>
  : never;

type TSParseIndexSignature<T extends Tokens> = T extends [
  { value: infer Name extends string; type: "Identifier" },
  ...infer AfterName extends Tokens,
]
  ? TSParseTypeAnnotation<AfterName> extends infer KeyRes
    ? KeyRes extends {
        typeAnnotation: infer KeyType;
        rest: infer AfterKeyType extends Tokens;
      }
      ? AfterKeyType extends [
          { value: "]"; type: "Punctuator" },
          ...infer AfterBracket extends Tokens,
        ]
        ? TSParseTypeAnnotation<AfterBracket> extends infer ValueRes
          ? ValueRes extends {
              typeAnnotation: infer ValueType;
              rest: infer FinalRest extends Tokens;
            }
            ? ValueType extends undefined
              ? ContextError<
                  "index signature must have a type annotation",
                  AfterBracket
                >
              : {
                  value: {
                    type: "TSIndexSignature";
                    parameters: [
                      {
                        type: "Identifier";
                        name: Name;
                        typeAnnotation: KeyType;
                      },
                    ];
                    typeAnnotation: ValueType;
                  };
                  rest: FinalRest;
                }
            : PropagateErrorOr<
                ValueRes,
                ContextError<
                  "failed to parse index signature type",
                  AfterBracket
                >
              >
          : never
        : ExpectedToken<"]", AfterKeyType>
      : PropagateErrorOr<
          KeyRes,
          ContextError<"failed to parse index signature parameter", AfterName>
        >
    : never
  : ExpectedToken<"Identifier", T>;

type TSParseTypeMember<T extends Tokens> = T extends [
  { value: "<" | "(" },
  ...any,
]
  ? TSParseMethodLikeSignatureBody<T> extends infer Res
    ? Res extends { value: infer Body; rest: infer Rest }
      ? {
          value: Simplify<{ type: "TSCallSignatureDeclaration" } & Body>;
          rest: Rest;
        }
      : PropagateErrorOr<Res, ContextError<"invalid call signature", T>>
    : never
  : T extends [{ value: "new"; type: "Identifier" }, ...infer R extends Tokens]
    ? TSParseMethodLikeSignatureBody<R> extends infer Res
      ? Res extends { value: infer Body; rest: infer Rest }
        ? {
            value: Simplify<{ type: "TSConstructSignatureDeclaration" } & Body>;
            rest: Rest;
          }
        : PropagateErrorOr<Res, ContextError<"invalid construct signature", R>>
      : never
    : (
          T extends [{ value: "readonly"; type: "Identifier" }, ...infer R]
            ? { readonly: true; rest: R }
            : { readonly: false; rest: T }
        ) extends {
          readonly: infer IsReadonly extends boolean;
          rest: infer AfterReadonly extends Tokens;
        }
      ? AfterReadonly extends [
          { value: "get" | "set"; type: "Identifier" },
          ...infer R,
        ]
        ? TSParseAccessorMember<AfterReadonly, IsReadonly> extends infer Res
          ? Res extends { value: infer Accessor; rest: infer Rest }
            ? { value: Accessor; rest: Rest }
            : TSParseRegularMember<AfterReadonly, IsReadonly>
          : never
        : AfterReadonly extends [
              { value: "["; type: "Punctuator" },
              ...infer R extends Tokens,
            ]
          ? TSParseComputedOrIndexSignature<
              AfterReadonly,
              IsReadonly
            > extends infer Res
            ? Res extends { value: infer Member; rest: infer Rest }
              ? { value: Member; rest: Rest }
              : PropagateErrorOr<
                  Res,
                  ContextError<
                    "invalid computed or index signature",
                    AfterReadonly
                  >
                >
            : never
          : TSParseRegularMember<AfterReadonly, IsReadonly>
      : never;

type TSParseRegularMember<T extends Tokens, IsReadonly extends boolean> =
  TSParsePropertyName<T> extends infer NameRes
    ? NameRes extends { value: infer Key; rest: infer AfterName extends Tokens }
      ? TSParseOptional<AfterName> extends {
          optional: infer IsOptional;
          rest: infer AfterOptional extends Tokens;
        }
        ? AfterOptional extends [{ value: "<" | "(" }, ...any]
          ? TSParseMethodLikeSignatureBody<AfterOptional> extends infer SigRes
            ? SigRes extends { value: infer Body; rest: infer Rest }
              ? {
                  value: Simplify<
                    {
                      type: "TSMethodSignature";
                      computed: false;
                      key: Key;
                      kind: "method";
                    } & (IsOptional extends true ? { optional: true } : {}) &
                      (IsReadonly extends true ? { readonly: true } : {}) &
                      Body
                  >;
                  rest: Rest;
                }
              : PropagateErrorOr<
                  SigRes,
                  ContextError<"invalid method signature", AfterOptional>
                >
            : never
          : TSParseTypeAnnotation<AfterOptional> extends infer AnnRes
            ? AnnRes extends {
                typeAnnotation: infer TypeAnn;
                rest: infer FinalRest;
              }
              ? {
                  value: Simplify<
                    {
                      type: "TSPropertySignature";
                      key: Key;
                      computed: false;
                    } & (TypeAnn extends undefined
                      ? {}
                      : { typeAnnotation: TypeAnn }) &
                      (IsOptional extends true ? { optional: true } : {}) &
                      (IsReadonly extends true ? { readonly: true } : {})
                  >;
                  rest: FinalRest;
                }
              : {
                  value: Simplify<
                    {
                      type: "TSPropertySignature";
                      key: Key;
                      computed: false;
                    } & (IsOptional extends true ? { optional: true } : {}) &
                      (IsReadonly extends true ? { readonly: true } : {})
                  >;
                  rest: AfterOptional;
                }
            : PropagateErrorOr<
                NameRes,
                ContextError<"failed to check for optional", AfterName>
              >
        : never
      : PropagateErrorOr<NameRes, ContextError<"expected property name", T>>
    : never;

type TSParseAccessorMember<
  T extends Tokens,
  IsReadonly extends boolean,
> = T extends [
  { value: infer Kind extends "get" | "set" },
  ...infer R extends Tokens,
]
  ? TSParsePropertyName<R> extends infer NameRes
    ? NameRes extends { value: infer Key; rest: infer AfterName extends Tokens }
      ? AfterName extends [{ value: "(" }, ...any]
        ? TSParseMethodLikeSignatureBody<AfterName> extends infer SigRes
          ? SigRes extends { value: infer Body; rest: infer Rest }
            ? {
                value: Simplify<
                  {
                    type: "TSMethodSignature";
                    computed: false;
                    key: Key;
                    kind: Kind;
                  } & (IsReadonly extends true ? { readonly: true } : {}) &
                    Body
                >;
                rest: Rest;
              }
            : PropagateErrorOr<
                SigRes,
                ContextError<`invalid ${Kind} signature`, AfterName>
              >
          : never
        : ContextError<`expected accessor signature for "${Kind}"`, AfterName>
      : PropagateErrorOr<
          NameRes,
          ContextError<"expected property name for accessor", R>
        >
    : never
  : ContextError<"not an accessor", T>;

type TSParseComputedOrIndexSignature<
  T extends Tokens,
  IsReadonly extends boolean,
> = T extends [{ value: "["; type: "Punctuator" }, ...infer R extends Tokens]
  ? R extends [{ type: "Identifier" }, { value: ":" }, ...any]
    ? TSParseIndexSignature<R> extends infer Res
      ? Res extends { value: infer IndexSig; rest: infer Rest }
        ? {
            value: Simplify<
              IndexSig & (IsReadonly extends true ? { readonly: true } : {})
            >;
            rest: Rest;
          }
        : PropagateErrorOr<Res, ContextError<"invalid index signature", R>>
      : never
    : TSParseComputedPropertyMember<T, IsReadonly>
  : ContextError<"not a computed or index signature", T>;

type TSParseTypeMemberList<
  T extends Tokens,
  Acc extends any[] = [],
> = T extends [{ value: "}" }, ...any] | []
  ? { value: Acc; rest: T }
  : TSParseTypeMember<T> extends infer Res
    ? Res extends {
        value: infer Member;
        rest: infer Rest extends Tokens;
      }
      ? (
          Rest extends [
            { value: "," | ";"; type: "Punctuator" },
            ...infer AfterSep,
          ]
            ? AfterSep
            : Rest
        ) extends infer NextTokens extends Tokens
        ? TSParseTypeMemberList<NextTokens, [...Acc, Member]>
        : never
      : Res extends ErrorObject
        ? Res
        : { value: Acc; rest: T }
    : never;

type TSParseTypeLiteral<T extends Tokens> =
  TSParseTypeMemberList<T> extends infer Res
    ? Res extends {
        value: infer Members;
        rest: infer AfterMembers extends Tokens;
      }
      ? AfterMembers extends [
          { value: "}"; type: "Punctuator" },
          ...infer FinalRest,
        ]
        ? {
            value: {
              type: "TSTypeLiteral";
              members: Members;
            };
            rest: FinalRest;
          }
        : ExpectedToken<"}', ',', or ';", AfterMembers>
      : PropagateErrorOr<
          Res,
          ContextError<"failed to parse type literal members", T>
        >
    : never;
type TSTypeParameter<
  T extends {
    type: "TSTypeParameter";
    name: string;
    constraint?: unknown;
    default?: unknown;
  },
> = Simplify<
  {
    type: "TSTypeParameter";
    name: T["name"];
  } & (T extends { constraint: infer Constraint extends object }
    ? { constraint: Constraint }
    : {}) &
    (T extends { default: infer Default extends object }
      ? { default: Default }
      : {})
>;
type TSParseMappedType<T extends Tokens> = (
  T extends [
    {
      value: infer Readonly extends "+" | "-";
      type: "Punctuator";
    },
    ...infer AfterPlusMinus extends Tokens,
  ]
    ? AfterPlusMinus extends [
        {
          value: "readonly";
          type: "Identifier";
        },
        ...infer Rest extends Tokens,
      ]
      ? { rest: Rest; readonly: Readonly }
      : ExpectedToken<"readonly", AfterPlusMinus>
    : T extends [
          {
            value: "readonly";
            type: "Identifier";
          },
          ...infer Rest extends Tokens,
        ]
      ? { rest: Rest; readonly: true }
      : { rest: T }
) extends infer ReadonlyRes
  ? ReadonlyRes extends {
      rest: infer Rest extends Tokens;
      readonly?: true | "+" | "-";
    }
    ? Rest extends [
        {
          value: "[";
          type: "Punctuator";
        },
        ...infer Rest extends Tokens,
      ]
      ? Rest extends [
          {
            value: infer Name extends string;
            type: "Identifier";
          },
          ...infer Rest extends Tokens,
        ]
        ? Rest extends [
            {
              value: "in";
              type: "Identifier";
            },
            ...infer Rest extends Tokens,
          ]
          ? TSParseType<Rest> extends infer Res
            ? Res extends {
                rest: infer Rest extends Tokens;
                value: infer Constraint;
              }
              ? (
                  Rest extends [
                    {
                      value: "as";
                      type: "Identifier";
                    },
                    ...infer Rest extends Tokens,
                  ]
                    ? TSParseType<Rest> extends infer Res
                      ? Res extends {
                          rest: infer Rest extends Tokens;
                          value: infer NameType;
                        }
                        ? {
                            nameType: NameType;
                            rest: Rest;
                          }
                        : PropagateErrorOr<
                            Res,
                            ContextError<"TSParseType failed", Rest>
                          >
                      : never
                    : {
                        nameType: null;
                        rest: Rest;
                      }
                ) extends infer Res
                ? Res extends {
                    nameType: infer NameType;
                    rest: infer Rest extends Tokens;
                  }
                  ? Rest extends [
                      {
                        value: "]";
                        type: "Punctuator";
                      },
                      ...infer Rest extends Tokens,
                    ]
                    ? (
                        Rest extends [
                          {
                            value: infer Optional extends "+" | "-";
                            type: "Punctuator";
                          },
                          ...infer AfterPlusMinus extends Tokens,
                        ]
                          ? AfterPlusMinus extends [
                              {
                                value: "?";
                                type: "Punctuator";
                              },
                              ...infer Rest extends Tokens,
                            ]
                            ? {
                                rest: Rest;
                                optional: Optional;
                              }
                            : ExpectedToken<"?", AfterPlusMinus>
                          : Rest extends [
                                {
                                  value: "?";
                                  type: "Punctuator";
                                },
                                ...infer Rest extends Tokens,
                              ]
                            ? { rest: Rest; optional: true }
                            : { rest: Rest }
                      ) extends infer OptionalRes
                      ? OptionalRes extends {
                          rest: infer Rest extends Tokens;
                          optional?: true | "+" | "-";
                        }
                        ? TSParseTypeAnnotation<Rest> extends infer Res
                          ? Res extends {
                              typeAnnotation: {
                                type: "TSTypeAnnotation";
                                typeAnnotation: infer TypeAnnotation;
                              };
                              rest: infer Rest extends Tokens;
                            }
                            ? (
                                Rest extends [
                                  {
                                    value: ";";
                                    type: "Punctuator";
                                  },
                                  ...infer Rest extends Tokens,
                                ]
                                  ? Rest
                                  : Rest
                              ) extends infer Rest extends Tokens
                              ? Rest extends [
                                  {
                                    value: "}";
                                    type: "Punctuator";
                                  },
                                  ...infer Rest extends Tokens,
                                ]
                                ? {
                                    value: Simplify<
                                      {
                                        type: "TSMappedType";
                                      } & Pick<
                                        ReadonlyRes,
                                        keyof ReadonlyRes & "readonly"
                                      > & {
                                          typeParameter: TSTypeParameter<{
                                            type: "TSTypeParameter";
                                            name: Name;
                                            constraint: Constraint;
                                          }>;
                                          nameType: NameType;
                                        } & Pick<
                                          OptionalRes,
                                          keyof OptionalRes & "optional"
                                        > & {
                                          typeAnnotation: TypeAnnotation;
                                        }
                                    >;
                                    rest: Rest;
                                  }
                                : ExpectedToken<"}", Rest>
                              : never
                            : PropagateErrorOr<
                                Res,
                                ContextError<"expected value", Rest>
                              >
                          : never
                        : PropagateErrorOr<
                            ReadonlyRes,
                            ContextError<"failed to check for optional", T>
                          >
                      : never
                    : ExpectedToken<"]", Rest>
                  : PropagateErrorOr<
                      Res,
                      ContextError<"failed to parse 'as <type>'", Rest>
                    >
                : never
              : PropagateErrorOr<Res, ContextError<"TSParseType failed", Rest>>
            : never
          : ExpectedToken<"in", Rest>
        : ExpectedToken<"String", Rest>
      : ExpectedToken<"[", Rest>
    : PropagateErrorOr<
        ReadonlyRes,
        ContextError<"failed to check for readonly", T>
      >
  : never;
type TSIsStartOfMappedType<T extends Tokens> = T extends [
  {
    value: "+" | "-";
    type: "Punctuator";
  },
  ...Tokens,
]
  ? true
  : (
        T extends [
          {
            value: "readonly";
            type: "Identifier";
          },
          ...infer Rest extends Tokens,
        ]
          ? Rest
          : T
      ) extends [
        {
          value: "[";
          type: "Punctuator";
        },
        {
          type: "Identifier";
        },
        {
          value: "in";
          type: "Identifier";
        },
        ...Tokens,
      ]
    ? true
    : false;
type IndexingAndArrays<Type, T extends Tokens> = T extends [
  {
    hasPrecedingLineBreak: true;
  },
  ...Tokens,
]
  ? {
      value: Type;
      rest: T;
    }
  : T extends [
        {
          value: "[";
          type: "Punctuator";
        },
        ...infer Rest extends Tokens,
      ]
    ? Rest extends [
        {
          value: "]";
          type: "Punctuator";
        },
        ...infer Rest extends Tokens,
      ]
      ? IndexingAndArrays<
          {
            type: "TSArrayType";
            elementType: Type;
          },
          Rest
        >
      : TSParseType<Rest> extends infer Res
        ? Res extends {
            value: infer IndexType;
            rest: [
              {
                value: "]";
                type: "Punctuator";
              },
              ...infer Rest extends Tokens,
            ];
          }
          ? IndexingAndArrays<
              {
                type: "TSIndexedAccessType";
                objectType: Type;
                indexType: IndexType;
              },
              Rest
            >
          : PropagateErrorOr<
              Res,
              ContextError<"expected valid type followed by ']'", Rest>
            >
        : never
    : {
        value: Type;
        rest: T;
      };
type TSParseArrayTypeOrHigher<T extends Tokens> =
  TSParseNonArrayType<T> extends infer Res
    ? Res extends {
        value: infer Type;
        rest: infer Rest extends Tokens;
      }
      ? IndexingAndArrays<Type, Rest>
      : PropagateErrorOr<Res, ContextError<"TSParseNonArrayType failed", T>>
    : never;
type TSParseTypeOperatorOrHigher<T extends Tokens> = T extends [
  {
    value: infer Operator extends "keyof" | "readonly" | "unique";
    type: "Identifier";
  },
  ...infer Rest extends Tokens,
]
  ? TSParseTypeOperatorOrHigher<Rest> extends infer Res
    ? Res extends {
        value: infer Type extends {};
        rest: infer Rest extends Tokens;
      }
      ? {
          value: {
            type: "TSTypeOperator";
            operator: Operator;
            typeAnnotation: Type;
          };
          rest: Rest;
        }
      : PropagateErrorOr<
          Res,
          ContextError<"TSParseTypeOperatorOrHigher failed", Rest>
        >
    : never
  : T extends [
        {
          value: "infer";
          type: "Identifier";
        },
        {
          value: infer Name extends string;
          type: "Identifier";
        },
        {
          value: "extends";
          type: "Identifier";
        },
        ...infer Rest extends Tokens,
      ]
    ? TSParseNonConditionalType<Rest> extends infer Res
      ? Res extends {
          value: infer Constraint;
          rest: infer Rest extends Tokens;
        }
        ? {
            value: {
              type: "TSInferType";
              typeParameter: TSTypeParameter<{
                type: "TSTypeParameter";
                name: Name;
                constraint: Constraint;
              }>;
            };
            rest: Rest;
          }
        : PropagateErrorOr<
            Res,
            ContextError<"TSParseNonConditionalType failed", Rest>
          >
      : never
    : T extends [
          {
            value: "infer";
            type: "Identifier";
          },
          {
            value: infer Name extends string;
            type: "Identifier";
          },
          ...infer Rest extends Tokens,
        ]
      ? {
          value: {
            type: "TSInferType";
            typeParameter: TSTypeParameter<{
              type: "TSTypeParameter";
              name: Name;
            }>;
          };
          rest: Rest;
        }
      : TSParseArrayTypeOrHigher<T>;
type TSParseIntersectionList<T extends Tokens, Acc extends any[]> =
  TSParseTypeOperatorOrHigher<T> extends infer Res
    ? Res extends {
        value: infer V;
        rest: infer R extends Tokens;
      }
      ? R extends [
          {
            value: "&";
            type: "Punctuator";
          },
          ...infer AfterOp extends Tokens,
        ]
        ? TSParseIntersectionList<AfterOp, [...Acc, V]>
        : {
            value: [...Acc, V];
            rest: R;
          }
      : Res extends ErrorObject
        ? Res
        : {
            value: Acc;
            rest: T;
          }
    : never;
type TSParseIntersectionTypeOrHigher<T extends Tokens> = T extends [
  {
    value: "&";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? TSParseIntersectionList<Rest, []> extends infer Res
    ? Res extends {
        value: infer Types;
        rest: infer R extends Tokens;
      }
      ? Types extends []
        ? ContextError<"TSParseIntersectionList returned an empty list", Rest>
        : {
            value: {
              type: "TSIntersectionType";
              types: Types;
            };
            rest: R;
          }
      : PropagateErrorOr<
          Res,
          ContextError<"TSParseIntersectionList failed", Rest>
        >
    : never
  : TSParseIntersectionList<T, []> extends infer Res
    ? Res extends {
        value: infer Types;
        rest: infer R extends Tokens;
      }
      ? Types extends [infer Single]
        ? {
            value: Single;
            rest: R;
          }
        : Types extends []
          ? PropagateErrorOr<
              Res,
              ContextError<"TSParseIntersectionList returned an empty list", T>
            >
          : {
              value: {
                type: "TSIntersectionType";
                types: Types;
              };
              rest: R;
            }
      : PropagateErrorOr<Res, ContextError<"TSParseIntersectionList failed", T>>
    : never;
type TSParseUnionList<T extends Tokens, Acc extends any[]> =
  TSParseIntersectionTypeOrHigher<T> extends infer Res
    ? Res extends {
        value: infer V;
        rest: infer R extends Tokens;
      }
      ? R extends [
          {
            value: "|";
            type: "Punctuator";
          },
          ...infer AfterOp extends Tokens,
        ]
        ? TSParseUnionList<AfterOp, [...Acc, V]>
        : {
            value: [...Acc, V];
            rest: R;
          }
      : Res extends ErrorObject
        ? Res
        : {
            value: Acc;
            rest: T;
          }
    : never;
type TSParseUnionTypeOrHigher<T extends Tokens> = T extends [
  {
    value: "|";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? TSParseUnionList<Rest, []> extends infer Res
    ? Res extends {
        value: infer Types;
        rest: infer R extends Tokens;
      }
      ? Types extends []
        ? PropagateErrorOr<
            Res,
            ContextError<"TSParseUnionList returned an empty list", Rest>
          >
        : {
            value: {
              type: "TSUnionType";
              types: Types;
            };
            rest: R;
          }
      : PropagateErrorOr<Res, ContextError<"TSParseUnionList failed", Rest>>
    : never
  : TSParseUnionList<T, []> extends infer Res
    ? Res extends {
        value: infer Types;
        rest: infer R extends Tokens;
      }
      ? Types extends [infer Single]
        ? {
            value: Single;
            rest: R;
          }
        : Types extends []
          ? PropagateErrorOr<
              Res,
              ContextError<"TSParseUnionList returned an empty list", T>
            >
          : {
              value: {
                type: "TSUnionType";
                types: Types;
              };
              rest: R;
            }
      : PropagateErrorOr<Res, ContextError<"TSParseUnionList failed", T>>
    : never;
type TSParseOptional<T extends Tokens> = T extends [
  {
    value: "?";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? {
      optional: true;
      rest: Rest;
    }
  : {
      optional: false;
      rest: T;
    };
type TSParseTypeAnnotation<T extends Tokens> = T extends [
  {
    value: ":";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? TSParseType<Rest> extends infer Res
    ? Res extends {
        value: infer Type;
        rest: infer AfterType extends Tokens;
      }
      ? {
          typeAnnotation: {
            type: "TSTypeAnnotation";
            typeAnnotation: Type;
          };
          rest: AfterType;
        }
      : PropagateErrorOr<Res, ContextError<"TSParseType failed", Rest>>
    : never
  : {
      typeAnnotation: undefined;
      rest: T;
    };
type TSMakePredicate<
  Name extends string,
  Type,
  Rest extends Tokens,
  IsAsserts extends boolean,
> = {
  value: {
    type: "TSTypeAnnotation";
    typeAnnotation: {
      type: "TSTypePredicate";
      parameterName: Name extends "this"
        ? {
            type: "TSThisType";
          }
        : {
            type: "Identifier";
            name: Name;
          };
      typeAnnotation: Type extends undefined
        ? null
        : {
            type: "TSTypeAnnotation";
            typeAnnotation: Type;
          };
      asserts: IsAsserts;
    };
  };
  rest: Rest;
};
type TSParseReturnType<T extends Tokens> = T extends [
  {
    value: "asserts";
    type: "Identifier";
  },
  ...infer AfterAsserts extends Tokens,
]
  ? AfterAsserts extends [
      {
        value: infer Name extends string;
        type: "Identifier";
      },
      ...infer Tail extends Tokens,
    ]
    ? Tail extends [
        {
          value: "is";
          type: "Identifier";
        },
        ...infer AfterIs extends Tokens,
      ]
      ? TSParseType<AfterIs> extends infer Res
        ? Res extends {
            value: infer Type;
            rest: infer R extends Tokens;
          }
          ? TSMakePredicate<Name, Type, R, true>
          : PropagateErrorOr<Res, ContextError<"TSParseType failed", AfterIs>>
        : never
      : TSMakePredicate<Name, undefined, Tail, true>
    : ExpectedToken<"Identifier", AfterAsserts>
  : T extends [
        {
          value: infer Name extends string;
          type: "Identifier";
        },
        {
          value: "is";
          type: "Identifier";
        },
        ...infer AfterIs extends Tokens,
      ]
    ? TSParseType<AfterIs> extends infer Res
      ? Res extends {
          value: infer Type;
          rest: infer R extends Tokens;
        }
        ? TSMakePredicate<Name, Type, R, false>
        : PropagateErrorOr<Res, ContextError<"TSParseType failed", AfterIs>>
      : never
    : TSParseType<T> extends infer Res
      ? Res extends { rest: infer Rest extends Tokens; value: infer Type }
        ? Type extends undefined
          ? null
          : {
              value: {
                type: "TSTypeAnnotation";
                typeAnnotation: Type;
              };
              rest: Rest;
            }
        : PropagateErrorOr<Res, ContextError<"TSParseType failed", T>>
      : never;
// TODO(maybe): destructuring??
type TSParseParameterForSignature<T extends Tokens> = T extends [
  {
    value: "...";
    type: "Punctuator";
  },
  {
    value: infer Name;
    type: "Identifier";
  },
  ...infer Rest extends Tokens,
]
  ? TSParseTypeAnnotation<Rest> extends infer Res
    ? Res extends {
        typeAnnotation: infer Type;
        rest: infer AfterType extends Tokens;
      }
      ? {
          value: {
            type: "RestElement";
            argument: {
              type: "Identifier";
              name: Name;
            };
            typeAnnotation: Type;
          };
          rest: AfterType;
        }
      : PropagateErrorOr<
          Res,
          ContextError<"TSParseTypeAnnotation failed", Rest>
        >
    : never
  : T extends [
        {
          value: infer Name;
          type: "Identifier";
        },
        ...infer Rest extends Tokens,
      ]
    ? TSParseOptional<Rest> extends infer Res
      ? Res extends {
          optional: infer IsOptional;
          rest: infer AfterOptional extends Tokens;
        }
        ? TSParseTypeAnnotation<AfterOptional> extends infer Res
          ? Res extends {
              typeAnnotation: infer Type;
              rest: infer AfterType extends Tokens;
            }
            ? {
                value: Simplify<
                  {
                    type: "Identifier";
                    name: Name;
                  } & (Type extends undefined
                    ? {}
                    : {
                        typeAnnotation: Type;
                      }) &
                    (IsOptional extends true ? { optional: true } : {})
                >;
                rest: AfterType;
              }
            : PropagateErrorOr<
                Res,
                ContextError<"TSParseTypeAnnotation failed", AfterOptional>
              >
          : never
        : PropagateErrorOr<Res, ContextError<"TSParseOptional failed", Rest>>
      : never
    : ExpectedToken<"Identifier", T>;
type TSParseBindingListForSignature<
  T extends Tokens,
  Acc extends any[] = [],
> = T extends [
  {
    value: ")";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: Acc;
      rest: Rest;
    }
  : T extends []
    ? ExpectedToken<",' or ')", T>
    : TSParseParameterForSignature<T> extends infer Res
      ? Res extends {
          value: infer Param;
          rest: infer AfterParam extends Tokens;
        }
        ? AfterParam extends [
            {
              value: ",";
              type: "Punctuator";
            },
            ...infer AfterComma extends Tokens,
          ]
          ? AfterComma extends [
              {
                value: ")";
                type: "Punctuator";
              },
              ...infer AfterParen extends Tokens,
            ]
            ? {
                value: [...Acc, Param];
                rest: AfterParen;
              }
            : TSParseBindingListForSignature<AfterComma, [...Acc, Param]>
          : AfterParam extends [
                {
                  value: ")";
                  type: "Punctuator";
                },
                ...infer AfterParen extends Tokens,
              ]
            ? {
                value: [...Acc, Param];
                rest: AfterParen;
              }
            : ExpectedToken<",' or ')", AfterParam>
        : PropagateErrorOr<
            Res,
            ContextError<"TSParseParameterForSignature failed", T>
          >
      : never;
type TSParseFunctionSignatureParams<T extends Tokens> = T extends [
  {
    value: "(";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? TSParseBindingListForSignature<Rest>
  : ExpectedToken<"(", T>;
type TSParseTypeParameter<T extends Tokens> = T extends [
  {
    value: infer Name extends string;
    type: "Identifier";
  },
  ...infer Rest extends Tokens,
]
  ? Rest extends [
      {
        value: "extends";
        type: "Identifier";
      },
      ...infer AfterExtends extends Tokens,
    ]
    ? TSParseType<AfterExtends> extends infer Res
      ? Res extends {
          value: infer Constraint;
          rest: infer AfterConstraint extends Tokens;
        }
        ? AfterConstraint extends [
            {
              value: "=";
              type: "Punctuator";
            },
            ...infer AfterEquals extends Tokens,
          ]
          ? TSParseType<AfterEquals> extends infer Res
            ? Res extends {
                value: infer DefaultType;
                rest: infer AfterDefault extends Tokens;
              }
              ? {
                  value: TSTypeParameter<{
                    type: "TSTypeParameter";
                    name: Name;
                    constraint: Constraint;
                    default: DefaultType;
                  }>;
                  rest: AfterDefault;
                }
              : PropagateErrorOr<
                  Res,
                  ContextError<"TSParseType failed", AfterEquals>
                >
            : never
          : {
              value: TSTypeParameter<{
                type: "TSTypeParameter";
                name: Name;
                constraint: Constraint;
                default: undefined;
              }>;
              rest: AfterConstraint;
            }
        : ContextError<"TSParseType failed", AfterExtends>
      : never
    : Rest extends [
          {
            value: "=";
            type: "Punctuator";
          },
          ...infer AfterEquals extends Tokens,
        ]
      ? TSParseType<AfterEquals> extends infer Res
        ? Res extends {
            value: infer DefaultType;
            rest: infer AfterDefault extends Tokens;
          }
          ? {
              value: TSTypeParameter<{
                type: "TSTypeParameter";
                name: Name;
                constraint: undefined;
                default: DefaultType;
              }>;
              rest: AfterDefault;
            }
          : ContextError<"TSParseType failed", AfterEquals>
        : never
      : {
          value: TSTypeParameter<{
            type: "TSTypeParameter";
            name: Name;
            constraint: undefined;
            default: undefined;
          }>;
          rest: Rest;
        }
  : ExpectedToken<"Identifier", T>;
type TSParseTypeParameterList<
  T extends Tokens,
  Acc extends any[] = [],
> = T extends [
  {
    value: ">";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: Acc;
      rest: Rest;
    }
  : T extends []
    ? ExpectedToken<",' or '>", T>
    : TSParseTypeParameter<T> extends infer Res
      ? Res extends {
          value: infer Param;
          rest: infer AfterParam extends Tokens;
        }
        ? AfterParam extends [
            {
              value: ",";
              type: "Punctuator";
            },
            ...infer AfterComma extends Tokens,
          ]
          ? TSParseTypeParameterList<AfterComma, [...Acc, Param]>
          : AfterParam extends [
                {
                  value: ">";
                  type: "Punctuator";
                },
                ...infer AfterAngle extends Tokens,
              ]
            ? {
                value: [...Acc, Param];
                rest: AfterAngle;
              }
            : ExpectedToken<",' or '>", AfterParam>
        : PropagateErrorOr<Res, ContextError<"TSParseTypeParameter failed", T>>
      : never;
type TSParseTypeArguments<T extends Tokens> = T extends [
  {
    value: "<";
    type: "Punctuator";
  },
  {
    value: ">";
    type: "Punctuator";
  },
  ...Tokens,
]
  ? ContextError<"type arguments can't be empty", T>
  : T extends [
        {
          value: "<";
          type: "Punctuator";
        },
        ...infer Rest extends Tokens,
      ]
    ? TSParseTypeArgumentList<Rest> extends infer Res
      ? Res extends {
          value: infer value;
          rest: infer rest extends Tokens;
        }
        ? {
            value: {
              type: "TSTypeParameterInstantiation";
              params: value;
            };
            rest: rest;
          }
        : PropagateErrorOr<
            Res,
            ContextError<"TSParseTypeArgumentList failed", Rest>
          >
      : never
    : {
        value: undefined;
        rest: T;
      };
type TSParseTypeArgumentList<
  T extends Tokens,
  Acc extends any[] = [],
> = T extends [
  {
    value: ">";
    type: "Punctuator";
  },
  ...infer Rest extends Tokens,
]
  ? {
      value: Acc;
      rest: Rest;
    }
  : T extends []
    ? ExpectedToken<",' or '>", T>
    : TSParseType<T> extends infer Res
      ? Res extends {
          value: infer Argument;
          rest: infer AfterArgument extends Tokens;
        }
        ? AfterArgument extends [
            {
              value: ",";
              type: "Punctuator";
            },
            ...infer AfterComma extends Tokens,
          ]
          ? TSParseTypeArgumentList<AfterComma, [...Acc, AfterArgument]>
          : AfterArgument extends [
                {
                  value: ">";
                  type: "Punctuator";
                },
                ...infer AfterAngle extends Tokens,
              ]
            ? {
                value: [...Acc, Argument];
                rest: AfterAngle;
              }
            : ExpectedToken<",' or '>", AfterArgument>
        : PropagateErrorOr<Res, ContextError<"TSParseType failed", T>>
      : never;
type TSParseTypeParameters<T extends Tokens> = T extends [
  {
    value: "<";
    type: "Punctuator";
  },
  {
    value: ">";
    type: "Punctuator";
  },
  ...Tokens,
]
  ? ContextError<"type parameters can't be empty", T>
  : T extends [
        {
          value: "<";
          type: "Punctuator";
        },
        ...infer Rest extends Tokens,
      ]
    ? TSParseTypeParameterList<Rest> extends infer Res
      ? Res extends {
          value: infer value;
          rest: infer rest extends Tokens;
        }
        ? {
            value: {
              type: "TSTypeParameterDeclaration";
              params: value;
            };
            rest: rest;
          }
        : PropagateErrorOr<
            Res,
            ContextError<"TSParseTypeParameterList failed", Rest>
          >
      : never
    : {
        value: undefined;
        rest: T;
      };
type TSParseNonConditionalType<T extends Tokens> =
  TSIsStartOfFunctionType<T> extends true
    ? TSFillSignature<
        {
          type: "TSFunctionType";
        },
        T
      >
    : T extends [
          {
            value: "new";
            type: "Identifier";
          },
          ...infer rest extends Tokens,
        ]
      ? TSFillSignature<
          {
            type: "TSConstructorType";
            abstract: false;
          },
          rest
        >
      : T extends [
            {
              value: "abstract";
              type: "Identifier";
            },
            {
              value: "new";
              type: "Identifier";
            },
            ...infer rest extends Tokens,
          ]
        ? TSFillSignature<
            {
              type: "TSConstructorType";
              abstract: true;
            },
            rest
          >
        : TSParseUnionTypeOrHigher<T>;
type TSEatParamSoup<T extends Tokens, D extends never[] = []> = T extends [
  infer first,
  ...infer rest extends Tokens,
]
  ? (
      D extends []
        ? first extends {
            value: ")";
            type: "Punctuator";
          }
          ? true
          : false
        : false
    ) extends true
    ? rest
    : TSEatParamSoup<
        rest,
        first extends {
          value: "{";
          type: "Punctuator";
        }
          ? [...D, never]
          : first extends {
                value: "}";
                type: "Punctuator";
              }
            ? D extends [never, ...infer rest]
              ? rest
              : D
            : D
      >
  : [];
type TSIsStartOfFunctionType<T extends Tokens> = T extends [
  {
    value: "<";
    type: "Punctuator";
  },
  ...Tokens,
]
  ? true
  : T extends [
        {
          value: "(";
          type: "Punctuator";
        },
        ...infer rest extends Tokens,
      ]
    ? rest extends [
        {
          value: ")" | "...";
          type: "Punctuator";
        },
        ...Tokens,
      ]
      ? true
      : TSEatParamSoup<rest> extends [
            {
              value: "=>";
              type: "Punctuator";
            },
            ...Tokens,
          ]
        ? true
        : false
    : false;
type TSParseType<T extends Tokens> =
  TSParseNonConditionalType<T> extends infer Res
    ? Res extends {
        value: infer value extends object;
        rest: infer rest extends Tokens;
      }
      ? (
          rest extends [
            {
              hasPrecedingLineBreak: true;
            },
            ...Tokens,
          ]
            ? false
            : rest extends [
                  {
                    value: "extends";
                    type: "Identifier";
                  },
                  ...Tokens,
                ]
              ? true
              : false
        ) extends true
        ? rest extends [{}, ...infer rest extends Tokens]
          ? TSParseNonConditionalType<rest> extends infer Res
            ? Res extends {
                value: infer extendsType extends object;
                rest: infer rest extends Tokens;
              }
              ? rest extends [
                  {
                    value: "?";
                    type: "Punctuator";
                  },
                  ...infer rest extends Tokens,
                ]
                ? TSParseType<rest> extends infer Res
                  ? Res extends {
                      value: infer trueType extends object;
                      rest: infer rest extends Tokens;
                    }
                    ? rest extends [
                        {
                          value: ":";
                          type: "Punctuator";
                        },
                        ...infer rest extends Tokens,
                      ]
                      ? TSParseType<rest> extends infer Res
                        ? Res extends {
                            value: infer falseType extends object;
                            rest: infer rest extends Tokens;
                          }
                          ? {
                              value: {
                                type: "TSConditionalType";
                                checkType: value;
                                extendsType: extendsType;
                                trueType: trueType;
                                falseType: falseType;
                              };
                              rest: rest;
                            }
                          : PropagateErrorOr<
                              Res,
                              ContextError<"TSParseType failed", rest>
                            >
                        : never
                      : ExpectedToken<":", rest>
                    : PropagateErrorOr<
                        Res,
                        ContextError<"TSParseType failed", rest>
                      >
                  : never
                : ExpectedToken<"?", rest>
              : PropagateErrorOr<
                  Res,
                  ContextError<"TSParseNonConditionalType failed", rest>
                >
            : never
          : ContextError<
              "failed to skip extends token. this shouldn't be possible?",
              rest
            >
        : {
            value: value;
            rest: rest;
          }
      : PropagateErrorOr<
          Res,
          ContextError<"TSParseNonConditionalType failed", T>
        >
    : never;

type CodeFrame<E extends ErrorObject> = Simplify<
  Omit<E, "pos"> &
    (E extends { pos: infer Pos extends Position }
      ? {
          at: Pos["eof"] extends true
            ? "end of input"
            : `line ${["l", ...Pos["line"]]["length"] extends infer N extends
                number
                ? N
                : 1} column ${[
                "c",
                ...Pos["col"],
              ]["length"] extends infer N extends number
                ? N
                : 1}`;
        }
      : {})
>;
export type Parse<S extends string> = (
  Tokenize<S> extends infer Res
    ? Res extends Tokens
      ? TSParseType<Res> extends infer Res
        ? Res extends { rest: infer Rest extends Tokens; value: infer Value }
          ? Rest extends [{ value: infer Value extends string }, ...Tokens]
            ? ContextError<`expected end of input, but got '${Value}'`, Rest>
            : Value
          : Res
        : never
      : Res
    : never
) extends infer Res
  ? Res extends ErrorObject
    ? CodeFrame<Res>
    : Res
  : never;
