export type Simplify<T> = {
  [KeyType in keyof T]: T[KeyType];
} & {};
export type ErrorObject = {
  error: string;
};
export type PropagateErrorOr<
  Res,
  Err extends ErrorObject,
> = Res extends ErrorObject ? Res : Err;
export type Position = {
  eof: boolean;
  line: "l"[];
  col: "c"[];
};
export type Token = {
  value: string;
  type:
    | "Identifier"
    | "MultiLineComment"
    | "Numeric"
    | "Punctuator"
    | "SingleLineComment"
    | "String"
    | "TemplateHead"
    | "TemplateMiddle"
    | "TemplateTail"
    | "NoSubstitutionTemplate";
  hasPrecedingLineBreak: boolean;
  pos: Position;
};
export type Tokens = Token[];
