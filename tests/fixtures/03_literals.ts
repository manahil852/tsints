type _ =
    | "hello"
    | "world"
    | `template literal`
    | `template with ${"expression"}`
    | `template with number ${123}`
    | `template with ${"two"} ${456} expressions`
    | `template with empty object ${{}}`
    | `nested template ${`inner ${"expression"}`} literal`
    | 'string with \n newline \t tab \\ backslash " quote'
    | "string with ' single quote"
    | "string with \n newline \t tab \\ backslash \" quote"
    | 'string with \' single quote'
    | 123
    | 45.67
    | 123n
    | -89
    | -1.23
    | -456n
    | 0xFF
    | 0o77
    | 0b1010
    | 1.2e3
    | 1.2e-3
    | true
    | false;
