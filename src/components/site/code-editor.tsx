interface CodeEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

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
  return "text";
}

export function CodeEditor({
  value,
  readOnly = true,
  height = "100%",
  className = "",
}: CodeEditorProps) {
  return (
    <div
      className={`overflow-auto rounded-lg bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-relaxed ${className}`}
      style={{ height, minHeight: height === "100%" ? "100%" : undefined }}
    >
      <pre className="p-3 m-0 whitespace-pre-wrap break-words">
        <code>{value}</code>
      </pre>
    </div>
  );
}
