import { useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

const languageMap: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  json: "json",
  html: "html",
  css: "css",
  xml: "xml",
  python: "python",
  sql: "sql",
  graphql: "graphql",
  go: "go",
  rust: "rust",
  java: "java",
  kotlin: "kotlin",
  swift: "swift",
  dart: "dart",
  php: "php",
  ruby: "ruby",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  yaml: "yaml",
  toml: "toml",
  markdown: "markdown",
  bash: "shell",
  shell: "shell",
  powershell: "powershell",
  dockerfile: "dockerfile",
  ini: "ini",
  properties: "properties",
  text: "plaintext",
  plaintext: "plaintext",
};

function detectLanguage(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("<")) return "html";
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed)) return "sql";
  if (/^(import|from|def |class |if __name__)/.test(trimmed)) return "python";
  if (/^(package |func |import \")/.test(trimmed)) return "go";
  if (/^(fn |let |mut |pub |use |struct |impl )/.test(trimmed)) return "rust";
  if (/^(#include|int |void |char )/.test(trimmed)) return "c";
  if (/^(public |private |protected |class |interface )/.test(trimmed)) return "java";
  if (/^(curl |fetch |axios)/.test(trimmed)) return "shell";
  if (/^---\n/.test(trimmed)) return "yaml";
  return "plaintext";
}

export function CodeEditor({
  value,
  language,
  readOnly = true,
  height = "100%",
  className = "",
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const lang = language ?? detectLanguage(value);

  return (
    <div className={`overflow-hidden rounded-lg border-2 border-foreground ${className}`}>
      <Editor
        height={height}
        language={lang}
        value={value}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
