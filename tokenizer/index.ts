import type {
  Position,
  PropagateErrorOr,
  Token,
  Tokens,
} from "../common/types.ts";
import type {
  ASCII_Not_ID_Continue,
  ASCII_Not_ID_Start,
  NumberFSM,
} from "./constants.ts";

declare const fatal: unique symbol;
type fatal = typeof fatal;

type ParseTemplateBody<
  T extends string,
  A extends string,
> = T extends `\`${infer rest}`
  ? { value: A; rest: rest; end: "`" }
  : T extends `\${${infer rest}`
    ? { value: A; rest: rest; end: "${" }
    : T extends `\\\r\n${infer rest}`
      ? ParseTemplateBody<rest, `${A}\\\r\n`>
      : T extends `\\${infer char}${infer rest}`
        ? ParseTemplateBody<rest, `${A}\\${char}`>
        : T extends `${infer char}${infer rest}`
          ? ParseTemplateBody<rest, `${A}${char}`>
          : fatal;

type ParseTemplateStart<T extends string> = T extends `\`${infer rest}`
  ? ParseTemplateBody<rest, ""> extends {
      value: infer V extends string;
      rest: infer R extends string;
      end: infer E;
    }
    ? E extends "`"
      ? { value: `\`${V}\``; rest: R; type: "NoSubstitutionTemplate" }
      : E extends "${"
        ? { value: `\`${V}\${`; rest: R; type: "TemplateHead" }
        : fatal
    : fatal
  : fatal;

type ParseTemplateMiddleOrTail<T extends string> =
  ParseTemplateBody<T, ""> extends {
    value: infer V extends string;
    rest: infer R extends string;
    end: infer E;
  }
    ? E extends "`"
      ? { value: `}${V}\``; rest: R; type: "TemplateTail" }
      : E extends "${"
        ? { value: `}${V}\${`; rest: R; type: "TemplateMiddle" }
        : fatal
    : fatal;

type ParseIdentifierRest<
  T extends string,
  A extends string,
> = T extends `${infer char}${infer rest}`
  ? char extends ASCII_Not_ID_Continue
    ? { value: A; rest: T }
    : ParseIdentifierRest<rest, `${A}${char}`>
  : T extends ""
    ? { value: A; rest: T }
    : fatal;
type ParseIdentifier<T extends string> = T extends `${infer char}${infer rest}`
  ? char extends ASCII_Not_ID_Start
    ? fatal
    : ParseIdentifierRest<rest, char>
  : fatal;
type MaybeEqual<T extends string> = T extends `${
  | "&&"
  | "||"
  | "??"
  | "**"
  | "!="
  | "=="}${infer rest}`
  ? { value: T extends `${infer tok}${rest}` ? tok : fatal; rest: rest }
  : T extends `${infer tok extends
        | "+"
        | "-"
        | "%"
        | "&"
        | "|"
        | "^"
        | "*"
        | "<"
        | ">"
        | "!"
        | "="}${infer rest}`
    ? { value: tok; rest: rest }
    : T extends `/${infer rest}`
      ? rest extends `${"*" | "/"}${string}`
        ? fatal
        : { value: "/"; rest: rest }
      : fatal;
type ParseDot<T extends string> = T extends `${`?.` | "."}${infer rest}`
  ? rest extends `${
      | "0"
      | "1"
      | "2"
      | "3"
      | "4"
      | "5"
      | "6"
      | "7"
      | "8"
      | "9"}${string}`
    ? fatal
    : { value: T extends `${infer tok}${rest}` ? tok : fatal; rest: rest }
  : fatal;
type ParsePunctuator<T extends string> = T extends `${
  | "--"
  | "++"
  | "=>"
  | "..."}${infer rest}`
  ? { value: T extends `${infer tok}${rest}` ? tok : fatal; rest: rest }
  : ParseDot<T> extends infer result extends { value: string; rest: string }
    ? result
    : MaybeEqual<T> extends infer result extends { value: string; rest: string }
      ? result["rest"] extends `=${infer rest}`
        ? { value: `${result["value"]}=`; rest: rest }
        : result
      : T extends `${infer tok extends
            | "?"
            | "~"
            | ","
            | ":"
            | ";"
            | "["
            | "]"
            | "("
            | ")"
            | "{"
            | "}"}${infer rest}`
        ? { value: tok; rest: rest }
        : fatal;

type ParseStringBody<
  T extends string,
  A extends string,
  Q extends string,
> = T extends `${Q}${infer rest}`
  ? { value: `${A}${Q}`; rest: rest }
  : T extends `${"\r" | "\n"}${string}`
    ? fatal
    : T extends `\\\r\n${infer rest}`
      ? ParseStringBody<rest, `${A}\\\r\n`, Q>
      : T extends `\\${infer char}${infer rest}`
        ? ParseStringBody<rest, `${A}\\${char}`, Q>
        : T extends `${infer char}${infer rest}`
          ? ParseStringBody<rest, `${A}${char}`, Q>
          : fatal;
type ParseString<T extends string> = T extends `${infer Q extends
  | "'"
  | '"'}${infer rest}`
  ? ParseStringBody<rest, Q, Q>
  : fatal;

type FSMParse<
  Input extends string,
  States extends { initial: {} },
  State extends keyof States = "initial",
  Acc extends string = "",
> = Input extends `${infer Char}${infer Rest}`
  ? Char extends keyof States[State]
    ? States[State][Char] extends infer NewState extends keyof States
      ? FSMParse<Rest, States, NewState, `${Acc}${Char}`>
      : fatal
    : State extends `f${string}`
      ? { value: Acc; rest: Input }
      : fatal
  : State extends `f${string}`
    ? { value: Acc; rest: Input }
    : fatal;

type ParseNumber<T extends string> = FSMParse<T, NumberFSM>;

type ParseWhitespace<
  T extends string,
  A extends string = "",
> = T extends `\r\n${infer rest}`
  ? ParseWhitespace<rest, `${A}\r\n`>
  : T extends `${infer char extends
        | "\t"
        | "\v"
        | "\f"
        | "\ufeff"
        | " "
        | "\r"
        | "\n"
        | "\u2028"
        | "\u2029"}${infer rest}`
    ? ParseWhitespace<rest, `${A}${char}`>
    : A extends ""
      ? fatal
      : { value: A; rest: T };
type ParseSingleLineCommentBody<
  T extends string,
  A extends string,
> = T extends `${infer C}${infer rest}`
  ? C extends "\r" | "\n" | "\u2028" | "\u2029"
    ? { value: A; rest: T }
    : ParseSingleLineCommentBody<rest, `${A}${C}`>
  : { value: A; rest: T };
type ParseSingleLineComment<T extends string> = T extends `//${infer rest}`
  ? ParseSingleLineCommentBody<rest, "//">
  : fatal;
type ParseMultiLineCommentBody<
  T extends string,
  A extends string,
> = T extends `*/${infer rest}`
  ? { value: `${A}*/`; rest: rest }
  : T extends `${infer char}${infer rest}`
    ? ParseMultiLineCommentBody<rest, `${A}${char}`>
    : fatal;
type ParseMultiLineComment<T extends string> = T extends `/*${infer rest}`
  ? ParseMultiLineCommentBody<rest, "/*">
  : fatal;
type UpdatePos<Pos extends Position, T extends string> = Pos extends {
  line: infer Line extends "l"[];
  col: infer Col extends "c"[];
  eof: infer Eof extends boolean;
}
  ? T extends `\r\n${infer rest}`
    ? UpdatePos<{ line: [...Line, "l"]; col: []; eof: false }, rest>
    : T extends `${infer char}${infer rest}`
      ? char extends "\r" | "\n" | "\u2028" | "\u2029"
        ? UpdatePos<{ line: [...Line, "l"]; col: []; eof: false }, rest>
        : UpdatePos<{ line: Line; col: [...Col, "c"]; eof: false }, rest>
      : { line: Line; col: Col; eof: Eof }
  : { line: []; col: []; eof: false };

type RunTokenize<
  T extends string,
  Acc extends Tokens,
  HasPrecedingLineBreak extends boolean,
  Depth extends "d"[],
  Pos extends Position,
  TemplateBraceDepth extends "b"[],
  TemplateBraceDepthStack extends "b"[][],
> = Depth["length"] extends 999
  ? {
      T: T;
      Acc: Acc;
      HasPrecedingLineBreak: HasPrecedingLineBreak;
      Pos: Pos;
      TemplateBraceDepth: TemplateBraceDepth;
      TemplateBraceDepthStack: TemplateBraceDepthStack;
    }
  : T extends ""
    ? {
        T: "";
        Acc: Acc;
        HasPrecedingLineBreak: false;
        Pos: Pos;
        TemplateBraceDepth: [];
        TemplateBraceDepthStack: [];
      }
    : ParsePunctuator<T> extends {
          value: infer value extends string;
          rest: infer rest extends string;
        }
      ? value extends "{"
        ? RunTokenize<
            rest,
            [
              ...Acc,
              {
                value: value;
                type: "Punctuator";
                hasPrecedingLineBreak: HasPrecedingLineBreak;
                pos: Pos;
              },
            ],
            false,
            [...Depth, "d"],
            UpdatePos<Pos, value>,
            [...TemplateBraceDepth, "b"],
            TemplateBraceDepthStack
          >
        : value extends "}"
          ? TemplateBraceDepth extends []
            ? ParseTemplateMiddleOrTail<rest> extends {
                value: infer V_template extends string;
                rest: infer R_template extends string;
                type: infer Type_template extends Token["type"];
              }
              ? RunTokenize<
                  R_template,
                  [
                    ...Acc,
                    {
                      value: V_template;
                      type: Type_template;
                      hasPrecedingLineBreak: false;
                      pos: Pos;
                    },
                  ],
                  false,
                  [...Depth, "d"],
                  UpdatePos<Pos, V_template>,
                  Type_template extends "TemplateMiddle"
                    ? []
                    : TemplateBraceDepthStack extends [
                          infer Prev extends "b"[],
                          ...unknown[],
                        ]
                      ? Prev
                      : [],
                  Type_template extends "TemplateMiddle"
                    ? []
                    : TemplateBraceDepthStack extends [
                          unknown,
                          ...infer Rest extends "b"[][],
                        ]
                      ? Rest
                      : []
                >
              : {
                  error: `unterminated template literal`;
                  pos: UpdatePos<Pos, value>;
                }
            : RunTokenize<
                rest,
                [
                  ...Acc,
                  {
                    value: value;
                    type: "Punctuator";
                    hasPrecedingLineBreak: HasPrecedingLineBreak;
                    pos: Pos;
                  },
                ],
                false,
                [...Depth, "d"],
                UpdatePos<Pos, value>,
                TemplateBraceDepth extends ["b", ...infer Rest extends "b"[]]
                  ? Rest
                  : [],
                TemplateBraceDepthStack
              >
          : RunTokenize<
              rest,
              [
                ...Acc,
                {
                  value: value;
                  type: "Punctuator";
                  hasPrecedingLineBreak: HasPrecedingLineBreak;
                  pos: Pos;
                },
              ],
              false,
              [...Depth, "d"],
              UpdatePos<Pos, value>,
              TemplateBraceDepth,
              TemplateBraceDepthStack
            >
      : ParseTemplateStart<T> extends {
            value: infer value extends string;
            rest: infer rest extends string;
            type: infer type extends Token["type"];
          }
        ? RunTokenize<
            rest,
            [
              ...Acc,
              {
                value: value;
                type: type;
                hasPrecedingLineBreak: HasPrecedingLineBreak;
                pos: Pos;
              },
            ],
            false,
            [...Depth, "d"],
            UpdatePos<Pos, value>,
            type extends "NoSubstitutionTemplate" ? TemplateBraceDepth : [],
            type extends "NoSubstitutionTemplate"
              ? TemplateBraceDepthStack
              : [...TemplateBraceDepthStack, TemplateBraceDepth]
          >
        : ParseString<T> extends {
              value: infer value extends string;
              rest: infer rest extends string;
            }
          ? RunTokenize<
              rest,
              [
                ...Acc,
                {
                  value: value;
                  type: "String";
                  hasPrecedingLineBreak: HasPrecedingLineBreak;
                  pos: Pos;
                },
              ],
              false,
              [...Depth, "d"],
              UpdatePos<Pos, value>,
              TemplateBraceDepth,
              TemplateBraceDepthStack
            >
          : ParseNumber<T> extends {
                value: infer value extends string;
                rest: infer rest extends string;
              }
            ? RunTokenize<
                rest,
                [
                  ...Acc,
                  {
                    value: value;
                    type: "Numeric";
                    hasPrecedingLineBreak: HasPrecedingLineBreak;
                    pos: Pos;
                  },
                ],
                false,
                [...Depth, "d"],
                UpdatePos<Pos, value>,
                TemplateBraceDepth,
                TemplateBraceDepthStack
              >
            : ParseWhitespace<T> extends {
                  value: infer value extends string;
                  rest: infer rest extends string;
                }
              ? RunTokenize<
                  rest,
                  Acc,
                  value extends `${string}${"\r" | "\n" | "\u2028" | "\u2029"}${string}`
                    ? true
                    : HasPrecedingLineBreak,
                  [...Depth, "d"],
                  UpdatePos<Pos, value>,
                  TemplateBraceDepth,
                  TemplateBraceDepthStack
                >
              : ParseSingleLineComment<T> extends {
                    value: infer value extends string;
                    rest: infer rest extends string;
                  }
                ? RunTokenize<
                    rest,
                    Acc,
                    true,
                    [...Depth, "d"],
                    UpdatePos<Pos, value>,
                    TemplateBraceDepth,
                    TemplateBraceDepthStack
                  >
                : ParseMultiLineComment<T> extends {
                      value: infer value extends string;
                      rest: infer rest extends string;
                    }
                  ? RunTokenize<
                      rest,
                      Acc,
                      HasPrecedingLineBreak,
                      [...Depth, "d"],
                      UpdatePos<Pos, value>,
                      TemplateBraceDepth,
                      TemplateBraceDepthStack
                    >
                  : ParseIdentifier<T> extends {
                        value: infer value extends string;
                        rest: infer rest extends string;
                      }
                    ? RunTokenize<
                        rest,
                        [
                          ...Acc,
                          {
                            value: value;
                            type: "Identifier";
                            hasPrecedingLineBreak: HasPrecedingLineBreak;
                            pos: Pos;
                          },
                        ],
                        false,
                        [...Depth, "d"],
                        UpdatePos<Pos, value>,
                        TemplateBraceDepth,
                        TemplateBraceDepthStack
                      >
                    : { error: `failed to parse token`; pos: Pos };

export type Tokenize<
  T extends string,
  Pos extends Position = { line: []; col: []; eof: false },
  Acc extends Tokens = [],
  HasPrecedingLineBreak extends boolean = false,
  TemplateBraceDepth extends "b"[] = [],
  TemplateBraceDepthStack extends "b"[][] = [],
> =
  RunTokenize<
    T,
    Acc,
    HasPrecedingLineBreak,
    [],
    Pos,
    TemplateBraceDepth,
    TemplateBraceDepthStack
  > extends infer Result
    ? Result extends {
        T: infer T extends string;
        Acc: infer Acc extends Tokens;
        HasPrecedingLineBreak: infer HasPrecedingLineBreak extends boolean;
        Pos: infer Pos extends Position;
        TemplateBraceDepth: infer D extends "b"[];
        TemplateBraceDepthStack: infer S extends "b"[][];
      }
      ? T extends ""
        ? Acc
        : Tokenize<T, Pos, Acc, HasPrecedingLineBreak, D, S>
      : PropagateErrorOr<
          Result,
          {
            error: "internal tokenizer error: wrong shape returned";
            result: Result;
          }
        >
    : never;
