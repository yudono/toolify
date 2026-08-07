"use client";

import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import yaml from "highlight.js/lib/languages/yaml";
import java from "highlight.js/lib/languages/java";
import csharp from "highlight.js/lib/languages/csharp";
import cpp from "highlight.js/lib/languages/cpp";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";
import dart from "highlight.js/lib/languages/dart";
import graphql from "highlight.js/lib/languages/graphql";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("java", java);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("php", php);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("dart", dart);
hljs.registerLanguage("graphql", graphql);

const languageMap: Record<string, string> = {
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  xml: "xml",
  python: "python",
  py: "python",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  go: "go",
  golang: "go",
  rust: "rust",
  rs: "rust",
  java: "java",
  kotlin: "kotlin",
  kt: "kotlin",
  swift: "swift",
  dart: "dart",
  php: "php",
  ruby: "ruby",
  rb: "ruby",
  c: "cpp",
  cpp: "cpp",
  "c++": "cpp",
  csharp: "csharp",
  "c#": "csharp",
  cs: "csharp",
  yaml: "yaml",
  yml: "yaml",
  toml: "yaml",
  ini: "yaml",
  markdown: "plaintext",
  md: "plaintext",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  powershell: "bash",
  zsh: "bash",
  dockerfile: "bash",
  prisma: "graphql",
  graphql: "graphql",
  svg: "xml",
  csv: "plaintext",
  text: "plaintext",
  plaintext: "plaintext",
};

function detectLanguage(code: string): string {
  const trimmed = code.trim();

  // SVG
  if (trimmed.startsWith("<svg")) return "xml";

  // JSON
  if (/^\{[\s\S]*\}$/.test(trimmed) || /^\[[\s\S]*\]$/.test(trimmed)) return "json";

  // HTML / JSX
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) return "html";
  if (trimmed.startsWith("<") && /<\/\w+>/.test(trimmed)) return "html";

  // YAML (starts with --- or key: value)
  if (/^---\n/.test(trimmed) || /^[\w-]+:\s/.test(trimmed)) return "yaml";

  // TOML
  if (/^\[[\w.]+\]/.test(trimmed)) return "yaml";

  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/i.test(trimmed)) return "sql";

  // Prisma schema
  if (/^(model|generator|datasource)\s+\w+\s*\{/.test(trimmed)) return "graphql";

  // GraphQL
  if (/^(type|input|enum|interface|union|schema)\s+\w+/.test(trimmed)) return "graphql";

  // Python
  if (/^(import |from |def |class |if __name__|async def )/.test(trimmed)) return "python";

  // Go
  if (/^(package |func |import\s+"|type\s+\w+\s+struct)/.test(trimmed)) return "go";

  // Rust
  if (/^(fn |let |mut |pub |use |struct |impl |enum |mod |trait |extern )/.test(trimmed)) return "rust";

  // Java
  if (/^(public |private |protected |class |interface |package )/.test(trimmed) && /\{/.test(trimmed)) return "java";

  // Kotlin
  if (/^(fun |val |var |data class |sealed |object |companion )/.test(trimmed)) return "kotlin";

  // Swift
  if (/^(func |let |var |struct |class |enum |import )/.test(trimmed) && /->/.test(trimmed)) return "swift";

  // Dart
  if (/^(void |class |import |Widget |State<)/.test(trimmed)) return "dart";

  // PHP
  if (/^<\?php/.test(trimmed) || (/^\$/.test(trimmed) && /->/.test(trimmed))) return "php";

  // Ruby
  if (/^(def |class |module |require |include )/.test(trimmed) && /end/.test(trimmed)) return "ruby";

  // C/C++
  if (/^(#include|void |int |char |float |double |struct |typedef )/.test(trimmed)) return "cpp";

  // C#
  if (/^(using |namespace |public class|private class)/.test(trimmed)) return "csharp";

  // CSS
  if (/^[\w.#:>\-~\s]+\{/.test(trimmed) && /:/.test(trimmed)) return "css";

  // Shell / cURL
  if (/^(curl |wget |npm |npx |yarn |pnpm |bun |git |docker |chmod |mkdir |echo |export |alias )/.test(trimmed)) return "bash";

  // CSV (lines with consistent comma/tab separation)
  const lines = trimmed.split("\n").slice(0, 3);
  if (lines.length >= 2) {
    const commaCount = lines[0].split(",").length - 1;
    if (commaCount >= 2 && lines.every((l) => Math.abs((l.split(",").length - 1) - commaCount) <= 1)) {
      return "plaintext";
    }
  }

  return "plaintext";
}

interface CodeEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

export function CodeEditor({
  value,
  language,
  readOnly = true,
  height = "100%",
  className = "",
}: CodeEditorProps) {
  const codeRef = useRef<HTMLElement>(null);

  const resolvedLang = languageMap[language ?? ""] ?? detectLanguage(value);
  const lang = resolvedLang === "plaintext" ? "plaintext" : (resolvedLang || "plaintext");

  useEffect(() => {
    if (codeRef.current && lang !== "plaintext") {
      codeRef.current.removeAttribute("data-highlighted");
      hljs.highlightElement(codeRef.current);
    }
  }, [value, lang]);

  return (
    <div
      className={`overflow-auto rounded-lg ${className}`}
      style={{ height, minHeight: height === "100%" ? "100%" : undefined }}
    >
      <pre className="p-4 m-0 whitespace-pre-wrap break-words text-[13px] leading-relaxed">
        <code ref={codeRef} className={`hljs language-${lang}`}>
          {value}
        </code>
      </pre>
    </div>
  );
}
