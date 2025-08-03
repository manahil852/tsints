import * as ts from "typescript";
import fs from "node:fs/promises";
import path from "node:path";
import * as babelParser from "@babel/parser";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { it } from "vitest";

const FIXTURES_DIR = new URL("fixtures/", import.meta.url);
const PARSER_FILE_PATH = "../parser/index.ts";

const IGNORED_AST_KEYS = new Set([
  "start",
  "end",
  "loc",
  "extra",
  "innerComments",
  "leadingComments",
  "trailingComments",
]);

function mapBabelNodeToTypeLevelNode(node: any, originalCode: string): any {
  if (!node || typeof node !== "object") {
    return node;
  }

  const newNode: any = {};
  for (const key in node) {
    if (Object.hasOwn(node, key) && !IGNORED_AST_KEYS.has(key)) {
      newNode[key] = node[key];
    }
  }

  switch (newNode.type) {
    // literals are intentionally raw-only
    case "StringLiteral":
    case "NumericLiteral":
    case "BigIntLiteral":
      return {
        type: newNode.type,
        raw: originalCode.slice(node.start, node.end),
      };
    case "TemplateLiteral": {
      return {
        type: "TemplateLiteral",
        expressions: newNode.expressions.map((expr: any) =>
          mapBabelNodeToTypeLevelNode(expr, originalCode),
        ),
        quasis: newNode.quasis.map((q: any) => ({
          type: "TemplateElement",
          raw: q.value.raw,
          tail: q.tail,
        })),
      };
    }
    default:
      for (const key in newNode) {
        if (Object.hasOwn(newNode, key)) {
          if (Array.isArray(newNode[key])) {
            newNode[key] = newNode[key].map((item: any) =>
              mapBabelNodeToTypeLevelNode(item, originalCode),
            );
          } else if (typeof newNode[key] === "object") {
            newNode[key] = mapBabelNodeToTypeLevelNode(
              newNode[key],
              originalCode,
            );
          }
        }
      }
      return newNode;
  }
}

const fixtureFiles = (await fs.readdir(FIXTURES_DIR)).filter((f) =>
  f.endsWith(".ts"),
);

for (const file of fixtureFiles) {
  it(`fixtures/${file}`, async () => {
    const code = await fs.readFile(new URL(file, FIXTURES_DIR), "utf-8");
    const fixtureName = path
      .basename(file, ".ts")
      .replace(/[^a-zA-Z0-9]/g, "_");

    const ast = babelParser.parse(code, {
      plugins: ["typescript"],
      sourceType: "module",
    });

    const typeAlias = ast.program.body[0];
    if (typeAlias?.type !== "TSTypeAliasDeclaration") {
      throw new Error(
        `Fixture ${file} must contain a single type alias like 'type _ = ...'.`,
      );
    }

    const targetAstNode = typeAlias.typeAnnotation;
    const expectedTypeString = JSON.stringify(
      mapBabelNodeToTypeLevelNode(targetAstNode, code),
    );

    const typeContent = code
      .replace(/^type\s+_\s*=\s*/, "")
      .replace(/;?\s*$/, "");

    const testFileContent = await format(
      `
      import type { Parse } from '${PARSER_FILE_PATH}';
    
      type Expected_${fixtureName} = ${expectedTypeString};
      type Actual_${fixtureName} = Parse<${JSON.stringify(typeContent)}>;
    
      const Check_1_${fixtureName}: Actual_${fixtureName} = {} as Expected_${fixtureName};
      const Check_2_${fixtureName}: Expected_${fixtureName} = {} as Actual_${fixtureName};
    `,
      { parser: "babel-ts" },
    );
    const compilerHost = ts.createCompilerHost({}, true);
    const testPath = fileURLToPath(new URL("test-case.ts", import.meta.url));
    const originalGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) => {
      if (fileName === testPath) {
        return ts.createSourceFile(
          fileName,
          testFileContent,
          languageVersion,
          true,
          ts.ScriptKind.TS,
        );
      }
      return originalGetSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    };

    const program = ts.createProgram(
      [testPath],
      {
        ...ts.getDefaultCompilerOptions(),
        strict: true,
        noEmit: true,
        noErrorTruncation: true,
      },
      compilerHost,
    );

    const allDiagnostics = ts.getPreEmitDiagnostics(program);

    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    };

    if (allDiagnostics.length) {
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(allDiagnostics, formatHost),
      );
    }
  }, 10000);
}
