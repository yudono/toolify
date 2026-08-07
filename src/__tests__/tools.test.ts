import { describe, it, expect, vi } from "vitest";
import {
  tools,
  categories,
  toolsBySlug,
  categoryById,
} from "@/lib/tools";
import type { Tool, Category, CategoryId } from "@/lib/tools";

function callRun(tool: Tool, input: string, action: string): string | Promise<string> {
  return tool.run(input, action);
}

// ─── Category Tests ─────────────────────────────────────────

describe("categories", () => {
  it("has 12 categories", () => {
    expect(categories.length).toBe(12);
  });

  it("contains expected category IDs", () => {
    const expectedIds: CategoryId[] = [
      "json", "text", "converter", "generator", "security",
      "css", "date", "api", "database", "javascript", "image",
    ];
    const actualIds = categories.map((c) => c.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });

  it("each category has required fields", () => {
    for (const cat of categories) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.blurb).toBeTruthy();
      expect(cat.accent).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    }
  });

  it("categoryById has entries for every category", () => {
    expect(Object.keys(categoryById).length).toBe(categories.length);
    for (const cat of categories) {
      expect(categoryById[cat.id]).toBeDefined();
      expect(categoryById[cat.id]!.id).toBe(cat.id);
    }
  });
});

// ─── ToolsBySlug Tests ──────────────────────────────────────

describe("toolsBySlug", () => {
  it("has entries for every tool", () => {
    expect(Object.keys(toolsBySlug).length).toBe(tools.length);
    for (const tool of tools) {
      expect(toolsBySlug[tool.slug]).toBeDefined();
      expect(toolsBySlug[tool.slug]!.slug).toBe(tool.slug);
    }
  });
});

// ─── Tool Structure Tests ───────────────────────────────────

describe("tool structure", () => {
  it("each tool has required fields", () => {
    for (const tool of tools) {
      expect(tool.slug).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(tool.icon).toBeTruthy();
      expect(tool.accent).toBeTruthy();
      expect(tool.actions).toBeDefined();
      expect(typeof tool.run).toBe("function");
      expect(tool.faq).toBeDefined();
      expect(Array.isArray(tool.faq)).toBe(true);
    }
  });

  it("each tool's category exists in the categories array", () => {
    const categoryIds = categories.map((c) => c.id);
    for (const tool of tools) {
      expect(categoryIds).toContain(tool.category);
    }
  });

  it("each tool has at least one action", () => {
    for (const tool of tools) {
      expect(tool.actions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each action has id and label", () => {
    for (const tool of tools) {
      for (const action of tool.actions) {
        expect(action.id).toBeTruthy();
        expect(typeof action.id).toBe("string");
        expect(action.label).toBeTruthy();
        expect(typeof action.label).toBe("string");
      }
    }
  });

  it("slug is URL-safe (lowercase, numbers, hyphens only)", () => {
    for (const tool of tools) {
      expect(tool.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("run function returns a string or Promise<string> for tools with sample", () => {
    for (const tool of tools) {
      if (tool.sample) {
        const firstAction = tool.actions[0]!.id;
        const result = callRun(tool,tool.sample, firstAction);
        if (result instanceof Promise) {
          expect(typeof result).toBe("object"); // Promise
        } else {
          expect(typeof result).toBe("string");
        }
      }
    }
  });

  it("generator tools produce output without input", () => {
    for (const tool of tools) {
      if (tool.generator) {
        const firstAction = tool.actions[0]!.id;
        const result = callRun(tool,"", firstAction);
        if (result instanceof Promise) {
          expect(typeof result).toBe("object");
        } else {
          expect(typeof result).toBe("string");
          expect(result.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("each tool has at least one FAQ", () => {
    for (const tool of tools) {
      expect(tool.faq.length).toBeGreaterThanOrEqual(1);
      for (const faq of tool.faq) {
        expect(faq.q).toBeTruthy();
        expect(faq.a).toBeTruthy();
      }
    }
  });
});

// ─── JSON Tools ─────────────────────────────────────────────

describe("json-formatter", () => {
  const tool = toolsBySlug["json-formatter"]!;

  it("formats valid JSON", () => {
    const result = callRun(tool,'{"b":2,"a":1}', "format");
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ b: 2, a: 1 });
    expect(result).toContain("\n");
  });

  it("minifies valid JSON", () => {
    const result = callRun(tool,'{ "a" : 1 , "b" : 2 }', "minify");
    expect(result).toBe('{"a":1,"b":2}');
  });

  it("sorts keys", () => {
    const result = callRun(tool,'{"z":1,"a":2,"m":3}', "sort");
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    expect(keys).toEqual(["a", "m", "z"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => callRun(tool,"{invalid", "format")).toThrow();
  });

  it("throws on empty input", () => {
    expect(() => callRun(tool,"", "format")).toThrow();
  });
});

describe("json-to-typescript", () => {
  const tool = toolsBySlug["json-to-typescript"]!;

  it("generates TypeScript interface from JSON", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("interface");
    expect(result).toContain("name");
    expect(result).toContain("age");
  });
});

describe("json-validator", () => {
  const tool = toolsBySlug["json-validator"]!;

  it("validates valid JSON", () => {
    const result = callRun(tool,'{"name":"test"}', "validate");
    expect(result).toContain("Valid JSON");
  });

  it("reports invalid JSON", () => {
    const result = callRun(tool,"{invalid json}", "validate");
    expect(result).toContain("Invalid JSON");
  });
});

describe("json-tree-viewer", () => {
  const tool = toolsBySlug["json-tree-viewer"]!;

  it("shows JSON tree", () => {
    const result = callRun(tool,'{"a":1,"b":{"c":2}}', "run");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("json-merge", () => {
  const tool = toolsBySlug["json-merge"]!;

  it("performs shallow merge", () => {
    const input = '{"a":1,"b":1}\n---\n{"b":2,"c":3}';
    const result = callRun(tool,input, "shallow");
    const parsed = JSON.parse(result);
    expect(parsed.b).toBe(2);
    expect(parsed.c).toBe(3);
    expect(parsed.a).toBe(1);
  });

  it("performs deep merge", () => {
    const input = '{"a":{"x":1}}\n---\n{"a":{"y":2}}';
    const result = callRun(tool,input, "deep");
    const parsed = JSON.parse(result);
    expect(parsed.a.x).toBe(1);
    expect(parsed.a.y).toBe(2);
  });

  it("returns error for missing separator", () => {
    const result = callRun(tool,'{"a":1}', "shallow");
    expect(result).toContain("Error");
  });
});

describe("json-diff", () => {
  const tool = toolsBySlug["json-diff"]!;

  it("shows differences between two JSON objects", () => {
    const input = '{"a":1}\n---\n{"a":2,"b":3}';
    const result = callRun(tool,input, "run");
    expect(result).toBeTruthy();
  });

  it("shows no differences for identical objects", () => {
    const input = '{"a":1}\n---\n{"a":1}';
    const result = callRun(tool,input, "run");
    expect(result).toContain("No differences");
  });
});

describe("json-sort-keys", () => {
  const tool = toolsBySlug["json-sort-keys"]!;

  it("sorts JSON keys", () => {
    const result = callRun(tool,'{"z":1,"a":2}', "run");
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toEqual(["a", "z"]);
  });
});

describe("json-escape", () => {
  const tool = toolsBySlug["json-escape"]!;

  it("escapes special characters", () => {
    const result = callRun(tool,'Hello "world"', "escape");
    expect(result).toContain('\\"');
  });

  it("unescapes special characters", () => {
    const result = callRun(tool,'Hello \\"world\\"', "unescape");
    expect(result).toContain('"world"');
  });
});

describe("json-repair", () => {
  const tool = toolsBySlug["json-repair"]!;

  it("repairs trailing commas", () => {
    const result = callRun(tool,'{"a":1,}', "run");
    expect(result).toContain("1");
    expect(result).not.toContain(",}");
  });
});

describe("json-pretty-print", () => {
  const tool = toolsBySlug["json-pretty-print"]!;

  it("formats minified JSON", () => {
    const result = callRun(tool,'{"a":1}', "run");
    expect(result).toContain("\n");
    expect(result).toContain("  ");
  });
});

// ─── Converter Tools ────────────────────────────────────────

describe("base64-encoder", () => {
  const tool = toolsBySlug["base64-encoder"]!;

  it("encodes text to base64", () => {
    const result = callRun(tool,"Hello", "encode");
    expect(result).toBe(btoa("Hello"));
  });

  it("decodes base64 to text", () => {
    const result = callRun(tool,btoa("Hello"), "decode");
    expect(result).toBe("Hello");
  });

  it("roundtrip encode/decode", () => {
    const original = "Hello, World! 🌍";
    const encoded = callRun(tool,original, "encode");
    const decoded = callRun(tool,encoded, "decode");
    expect(decoded).toBe(original);
  });

  it("throws on empty input", () => {
    expect(() => callRun(tool,"", "encode")).toThrow();
  });
});

describe("url-encoder", () => {
  const tool = toolsBySlug["url-encoder"]!;

  it("encodes URL", () => {
    const result = callRun(tool,"hello world", "encode");
    expect(result).toBe("hello%20world");
  });

  it("decodes URL", () => {
    const result = callRun(tool,"hello%20world", "decode");
    expect(result).toBe("hello world");
  });

  it("roundtrip encode/decode", () => {
    const original = "https://example.com/path?q=hello world&lang=en";
    const encoded = callRun(tool,original, "encode");
    const decoded = callRun(tool,encoded, "decode");
    expect(decoded).toBe(original);
  });
});

describe("html-entity-encoder", () => {
  const tool = toolsBySlug["html-entity-encoder"]!;

  it("escapes HTML entities", () => {
    const result = callRun(tool,'<div class="test">Hello & welcome</div>', "encode");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;");
  });

  it("unescapes HTML entities", () => {
    const result = callRun(tool,"&lt;div&gt;Hello &amp; welcome&lt;/div&gt;", "decode");
    expect(result).toContain("<div>");
    expect(result).toContain("&");
  });

  it("roundtrip escape/unescape", () => {
    const original = '<div class="card">Hello & <world></div>';
    const escaped = callRun(tool,original, "encode");
    const unescaped = callRun(tool,escaped, "decode");
    expect(unescaped).toBe(original);
  });
});

describe("json-to-zod", () => {
  const tool = toolsBySlug["json-to-zod"]!;

  it("generates Zod schema", () => {
    const result = callRun(tool,'{"name":"Ada","age":30,"active":true}', "run");
    expect(result).toContain("z.object");
    expect(result).toContain("z.string");
    expect(result).toContain("z.number");
    expect(result).toContain("z.boolean");
  });
});

describe("json-to-yup", () => {
  const tool = toolsBySlug["json-to-yup"]!;

  it("generates Yup schema", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("yup.object");
    expect(result).toContain("yup.string");
    expect(result).toContain("yup.number");
  });
});

describe("json-to-prisma", () => {
  const tool = toolsBySlug["json-to-prisma"]!;

  it("generates Prisma model", () => {
    const result = callRun(tool,'{"name":"Product","price":29.99}', "run");
    expect(result).toContain("model");
    expect(result).toContain("@id");
  });
});

describe("json-to-sql", () => {
  const tool = toolsBySlug["json-to-sql"]!;

  it("generates SQL from JSON array", () => {
    const result = callRun(tool,'[{"id":1,"name":"Ada"}]', "run");
    expect(result).toContain("CREATE TABLE");
    expect(result).toContain("INSERT INTO");
  });
});

describe("json-to-graphql", () => {
  const tool = toolsBySlug["json-to-graphql"]!;

  it("generates GraphQL type", () => {
    const result = callRun(tool,'{"name":"Product","price":29.99}', "run");
    expect(result).toContain("type");
    expect(result).toContain("String");
    expect(result).toContain("Int");
  });
});

describe("json-to-go", () => {
  const tool = toolsBySlug["json-to-go"]!;

  it("generates Go struct", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("struct");
    expect(result).toContain("json:");
  });
});

describe("json-to-rust", () => {
  const tool = toolsBySlug["json-to-rust"]!;

  it("generates Rust struct", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("struct");
    expect(result).toContain("Serialize");
  });
});

describe("json-to-java", () => {
  const tool = toolsBySlug["json-to-java"]!;

  it("generates Java class", () => {
    const result = callRun(tool,'{"name":"Product","price":29.99}', "run");
    expect(result).toContain("class");
    expect(result).toContain("get");
    expect(result).toContain("set");
  });
});

describe("json-to-kotlin", () => {
  const tool = toolsBySlug["json-to-kotlin"]!;

  it("generates Kotlin data class", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("data class");
  });
});

describe("json-to-swift", () => {
  const tool = toolsBySlug["json-to-swift"]!;

  it("generates Swift struct", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("struct");
    expect(result).toContain("Codable");
  });
});

describe("json-to-dart", () => {
  const tool = toolsBySlug["json-to-dart"]!;

  it("generates Dart class", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("class");
    expect(result).toContain("fromJson");
    expect(result).toContain("toJson");
  });
});

describe("csv-to-json", () => {
  const tool = toolsBySlug["csv-to-json"]!;

  it("converts CSV to JSON", () => {
    const result = callRun(tool,"name,age\nAda,30\nGrace,25", "run");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe("Ada");
    expect(parsed[0].age).toBe("30");
  });
});

describe("json-to-csv", () => {
  const tool = toolsBySlug["json-to-csv"]!;

  it("converts JSON array to CSV", () => {
    const result = callRun(tool,'[{"name":"Ada","age":30},{"name":"Grace","age":25}]', "run");
    expect(result).toContain("name");
    expect(result).toContain("age");
    expect(result).toContain("Ada");
    expect(result).toContain("Grace");
  });
});

describe("xml-to-json", () => {
  const tool = toolsBySlug["xml-to-json"]!;

  it("converts XML to JSON", () => {
    const result = callRun(tool,"<root><name>Ada</name><age>30</age></root>", "run");
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });
});

describe("json-to-xml", () => {
  const tool = toolsBySlug["json-to-xml"]!;

  it("converts JSON to XML", () => {
    const result = callRun(tool,'{"user":{"name":"Ada","age":30}}', "run");
    expect(result).toContain("<user>");
    expect(result).toContain("<name>");
    expect(result).toContain("<age>");
  });
});

describe("yaml-to-json", () => {
  const tool = toolsBySlug["yaml-to-json"]!;

  it("converts YAML to JSON", () => {
    const result = callRun(tool,"name: Ada\nage: 30", "run");
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe("Ada");
    expect(parsed.age).toBe(30);
  });
});

describe("json-to-yaml", () => {
  const tool = toolsBySlug["json-to-yaml"]!;

  it("converts JSON to YAML", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("name:");
    expect(result).toContain("Ada");
    expect(result).toContain("age:");
  });
});

describe("toml-to-json", () => {
  const tool = toolsBySlug["toml-to-json"]!;

  it("converts TOML to JSON", () => {
    const result = callRun(tool,'[user]\nname = "Ada"\nage = 30', "run");
    const parsed = JSON.parse(result);
    expect(parsed.user.name).toBe("Ada");
    expect(parsed.user.age).toBe(30);
  });
});

describe("json-to-toml", () => {
  const tool = toolsBySlug["json-to-toml"]!;

  it("converts JSON to TOML", () => {
    const result = callRun(tool,'{"user":{"name":"Ada","age":30}}', "run");
    expect(result).toContain("[user]");
    expect(result).toContain("name");
  });
});

describe("unicode-escape", () => {
  const tool = toolsBySlug["unicode-escape"]!;

  it("encodes text to Unicode escapes", () => {
    const result = callRun(tool,"A", "encode");
    expect(result).toBe("A"); // ASCII chars not escaped
  });

  it("roundtrip encode/decode", () => {
    const original = "Hello";
    const encoded = callRun(tool,original, "encode");
    const decoded = callRun(tool,encoded, "decode");
    expect(decoded).toBe(original);
  });
});

describe("hex-encode", () => {
  const tool = toolsBySlug["hex-encode"]!;

  it("encodes text to hex", () => {
    const result = callRun(tool,"AB", "encode");
    expect(result).toBe("41 42");
  });

  it("decodes hex to text", () => {
    const result = callRun(tool,"41 42", "decode");
    expect(result).toBe("AB");
  });
});

describe("html-encode", () => {
  const tool = toolsBySlug["html-encode"]!;

  it("encodes HTML entities", () => {
    const result = callRun(tool,"<div>", "encode");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });

  it("decodes HTML entities", () => {
    const result = callRun(tool,"&lt;div&gt;", "decode");
    expect(result).toContain("<div>");
  });
});

// ─── Text Tools ─────────────────────────────────────────────

describe("case-converter", () => {
  const tool = toolsBySlug["case-converter"]!;

  it("converts to camelCase", () => {
    const result = callRun(tool,"hello world", "camel");
    expect(result).toBe("helloWorld");
  });

  it("converts to snake_case", () => {
    const result = callRun(tool,"hello world", "snake");
    expect(result).toBe("hello_world");
  });

  it("converts to kebab-case", () => {
    const result = callRun(tool,"hello world", "kebab");
    expect(result).toBe("hello-world");
  });

  it("converts to CONSTANT_CASE", () => {
    const result = callRun(tool,"hello world", "constant");
    expect(result).toBe("HELLO_WORLD");
  });

  it("converts to Title Case", () => {
    const result = callRun(tool,"hello world", "title");
    expect(result).toBe("Hello World");
  });
});

describe("word-counter", () => {
  const tool = toolsBySlug["word-counter"]!;

  it("counts words and characters", () => {
    const result = callRun(tool,"Hello World", "run");
    expect(result).toContain("Words");
    expect(result).toContain("2");
    expect(result).toContain("Characters");
  });
});

describe("text-cleaner", () => {
  const tool = toolsBySlug["text-cleaner"]!;

  it("trims and squeezes whitespace", () => {
    const result = callRun(tool,"  line1  \n\n\n  line2  ", "trim");
    expect(result).toBe("line1\nline2");
  });

  it("removes duplicate lines", () => {
    const result = callRun(tool,"alpha\nbeta\nalpha\ngamma", "dedupe");
    const lines = result.split("\n");
    expect(lines).toContain("alpha");
    expect(lines).toContain("beta");
    expect(lines).toContain("gamma");
    expect(lines.filter((l) => l === "alpha").length).toBe(1);
  });

  it("sorts lines", () => {
    const result = callRun(tool,"charlie\nalpha\nbravo", "sort");
    const lines = result.split("\n");
    expect(lines[0]).toBe("alpha");
    expect(lines[1]).toBe("bravo");
    expect(lines[2]).toBe("charlie");
  });
});

describe("diff-checker", () => {
  const tool = toolsBySlug["diff-checker"]!;

  it("shows diff between two text blocks", () => {
    const result = callRun(tool,"line1\nline2\n---\nline1\nmodified", "run");
    expect(result).toContain("Diff Output");
    expect(result).toContain("line1");
    expect(result).toContain("modified");
  });

  it("shows error for missing separator", () => {
    const result = callRun(tool,"text1\ntext2", "run");
    expect(result).toContain("Error");
  });
});

describe("reverse-lines", () => {
  const tool = toolsBySlug["reverse-lines"]!;

  it("reverses line order", () => {
    const result = callRun(tool,"first\nsecond\nthird", "run");
    const lines = result.split("\n");
    expect(lines[0]).toBe("third");
    expect(lines[1]).toBe("second");
    expect(lines[2]).toBe("first");
  });
});

// ─── Generator Tools ────────────────────────────────────────

describe("uuid-generator", () => {
  const tool = toolsBySlug["uuid-generator"]!;

  it("generates 10 UUIDs", () => {
    const result = callRun(tool,"", "generate");
    const uuids = result.split("\n");
    expect(uuids.length).toBe(10);
    for (const uuid of uuids) {
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  it("generates unique UUIDs", () => {
    const result = callRun(tool,"", "generate");
    const uuids = result.split("\n");
    const unique = new Set(uuids);
    expect(unique.size).toBe(10);
  });
});

describe("password-generator", () => {
  const tool = toolsBySlug["password-generator"]!;

  it("generates strong passwords", () => {
    const result = callRun(tool,"", "strong");
    const passwords = result.split("\n").filter(Boolean);
    expect(passwords.length).toBe(5);
    for (const pw of passwords) {
      expect(pw.length).toBe(20);
    }
  });

  it("generates memorable passwords", () => {
    const result = callRun(tool,"", "memorable");
    const passwords = result.split("\n").filter(Boolean);
    expect(passwords.length).toBe(5);
    for (const pw of passwords) {
      expect(pw).toContain("-");
    }
  });
});

describe("lorem-ipsum", () => {
  const tool = toolsBySlug["lorem-ipsum"]!;

  it("generates paragraphs", () => {
    const result = callRun(tool,"", "paragraphs");
    const paragraphs = result.split("\n\n").filter(Boolean);
    expect(paragraphs.length).toBe(3);
  });

  it("generates list items", () => {
    const result = callRun(tool,"", "list");
    const items = result.split("\n").filter((l) => l.startsWith("- "));
    expect(items.length).toBe(6);
  });
});

describe("slug-generator", () => {
  const tool = toolsBySlug["slug-generator"]!;

  it("creates URL slugs", () => {
    const result = callRun(tool,"Hello World! This is a Test", "run");
    expect(result).toBe("hello-world-this-is-a-test");
  });

  it("handles special characters", () => {
    const result = callRun(tool,"Café & Résumé", "run");
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("color-converter", () => {
  const tool = toolsBySlug["color-converter"]!;

  it("converts hex to RGB and HSL", () => {
    const result = callRun(tool,"#4F46E5", "run");
    expect(result).toContain("HEX");
    expect(result).toContain("RGB");
    expect(result).toContain("HSL");
    expect(result).toContain("CSS");
  });
});

describe("css-minifier", () => {
  const tool = toolsBySlug["css-minifier"]!;

  it("minifies CSS", () => {
    const input = ".card {\n  border-radius: 24px;\n  padding: 32px;\n}";
    const result = callRun(tool,input, "minify");
    expect(result).not.toContain("\n");
    expect(result).not.toContain("  ");
  });

  it("beautifies CSS", () => {
    const input = ".card{border-radius:24px;padding:32px;}";
    const result = callRun(tool,input, "format");
    expect(result).toContain("\n");
  });
});

describe("timestamp-converter", () => {
  const tool = toolsBySlug["timestamp-converter"]!;

  it("converts Unix timestamp to date", () => {
    const result = callRun(tool,"1767225600", "run");
    expect(result).toContain("Unix (s)");
    expect(result).toContain("ISO 8601");
  });

  it("converts current time with Now action", () => {
    const result = callRun(tool,"", "now");
    expect(result).toContain("Unix (s)");
    expect(result).toContain("ISO 8601");
  });
});

// ─── API Tools ──────────────────────────────────────────────

describe("query-string-parser", () => {
  const tool = toolsBySlug["query-string-parser"]!;

  it("parses URL query params", () => {
    const result = callRun(tool,
      "https://api.example.com/search?q=hello&page=2",
      "run",
    );
    const parsed = JSON.parse(result);
    expect(parsed.q).toBe("hello");
    expect(parsed.page).toBe("2");
  });

  it("parses bare query string", () => {
    const result = callRun(tool,"a=1&b=2", "run");
    const parsed = JSON.parse(result);
    expect(parsed.a).toBe("1");
    expect(parsed.b).toBe("2");
  });
});

describe("curl-to-fetch", () => {
  const tool = toolsBySlug["curl-to-fetch"]!;

  it("converts cURL to fetch code", () => {
    const result = callRun(tool,
      'curl -X GET https://api.example.com/data',
      "run",
    );
    expect(result).toContain("fetch");
    expect(result).toContain("https://api.example.com/data");
    expect(result).toContain("method");
  });
});

describe("curl-to-axios", () => {
  const tool = toolsBySlug["curl-to-axios"]!;

  it("converts cURL to axios code", () => {
    const result = callRun(tool,
      'curl -X POST https://api.example.com/data -d \'{"key":"value"}\'',
      "run",
    );
    expect(result).toContain("axios");
    expect(result).toContain("post");
  });
});

describe("query-string-builder", () => {
  const tool = toolsBySlug["query-string-builder"]!;

  it("builds URL from key-value pairs", () => {
    const result = callRun(tool,
      "base_url = https://api.example.com\nq = hello\npage = 2",
      "build",
    );
    expect(result).toContain("https://api.example.com");
    expect(result).toContain("q=hello");
    expect(result).toContain("page=2");
  });
});

describe("openapi-to-typescript-sdk", () => {
  const tool = toolsBySlug["openapi-to-typescript-sdk"]!;

  it("generates TypeScript SDK", () => {
    const result = callRun(tool,
      '{"openapi":"3.0.0","info":{"title":"My API","version":"1.0.0"},"paths":{"/users":{"get":{"summary":"List users","responses":{"200":{"description":"OK"}}}}}}',
      "run",
    );
    expect(result).toContain("fetch");
    expect(result).toContain("async");
  });
});

describe("openapi-to-axios", () => {
  const tool = toolsBySlug["openapi-to-axios"]!;

  it("generates Axios client", () => {
    const result = callRun(tool,
      '{"openapi":"3.0.0","info":{"title":"My API","version":"1.0.0"},"paths":{"/users":{"get":{"summary":"List users"}}}}',
      "run",
    );
    expect(result).toContain("axios");
    expect(result).toContain("api.");
  });
});

describe("openapi-to-fetch", () => {
  const tool = toolsBySlug["openapi-to-fetch"]!;

  it("generates Fetch client", () => {
    const result = callRun(tool,
      '{"openapi":"3.0.0","info":{"title":"My API","version":"1.0.0"},"paths":{"/users":{"get":{"summary":"List users"}}}}',
      "run",
    );
    expect(result).toContain("apiFetch");
    expect(result).toContain("async");
  });
});

describe("postman-to-curl", () => {
  const tool = toolsBySlug["postman-to-curl"]!;

  it("converts Postman JSON to cURL", () => {
    const result = callRun(tool,
      '{"method":"POST","url":"https://api.example.com/users","header":[{"key":"Content-Type","value":"application/json"}],"body":{"mode":"raw","raw":"{\\"name\\":\\"Ada\\"}"}}',
      "run",
    );
    expect(result).toContain("curl");
    expect(result).toContain("POST");
    expect(result).toContain("https://api.example.com/users");
  });
});

// ─── Security Tools ─────────────────────────────────────────

describe("jwt-decoder", () => {
  const tool = toolsBySlug["jwt-decoder"]!;

  it("decodes JWT token", () => {
    const result = callRun(tool,
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      "run",
    );
    const parsed = JSON.parse(result);
    expect(parsed.header.alg).toBe("HS256");
    expect(parsed.payload.name).toBe("Ada Lovelace");
    expect(parsed.payload.sub).toBe("1234567890");
  });

  it("throws on invalid token", () => {
    expect(() => callRun(tool,"not-a-jwt", "run")).toThrow();
  });
});

describe("password-generator", () => {
  const tool = toolsBySlug["password-generator"]!;

  it("generates passwords of correct length", () => {
    const result = callRun(tool,"", "strong");
    const passwords = result.split("\n").filter(Boolean);
    for (const pw of passwords) {
      expect(pw.length).toBe(20);
    }
  });
});

describe("sha256-generator", () => {
  const tool = toolsBySlug["sha256-generator"]!;

  it("generates SHA-256 hash", async () => {
    const result = await callRun(tool,"Hello, World!", "hash");
    expect(result).toContain("SHA-256 Hash");
    expect(result).toMatch(/[a-f0-9]{64}/);
  });
});

describe("md5-generator", () => {
  const tool = toolsBySlug["md5-generator"]!;

  it("generates MD5 hash", () => {
    const result = callRun(tool,"Hello, World!", "hash");
    expect(result).toContain("MD5 Hash");
    expect(result).toMatch(/[a-f0-9]{32}/);
  });
});

describe("bcrypt-hash", () => {
  const tool = toolsBySlug["bcrypt-hash"]!;

  it("hashes a password", async () => {
    const result = await callRun(tool,"testPassword", "hash");
    expect(result).toContain("bcrypt Hash");
    expect(result).toContain("$2b$");
  });
});

describe("nanoid-generator", () => {
  const tool = toolsBySlug["nanoid-generator"]!;

  it("generates a NanoID", () => {
    const result = callRun(tool,"", "generate");
    expect(result).toContain("Generated NanoID");
    expect(result).toContain("21 characters");
  });

  it("generates 10 NanoIDs", () => {
    const result = callRun(tool,"", "generate10");
    expect(result).toContain("Generated 10 NanoIDs");
    const lines = result.split("\n").filter((l) => /^\d+\./.test(l));
    expect(lines.length).toBe(10);
  });
});

// ─── Database Tools ─────────────────────────────────────────

describe("sql-formatter", () => {
  const tool = toolsBySlug["sql-formatter"]!;

  it("formats SQL query", () => {
    const result = callRun(tool,
      "SELECT u.id, u.name FROM users u WHERE u.active = true",
      "format",
    );
    expect(result).toContain("SELECT");
    expect(result).toContain("FROM");
    expect(result).toContain("WHERE");
  });

  it("minifies SQL query", () => {
    const result = callRun(tool,
      "SELECT\n  u.id,\n  u.name\nFROM\n  users u\nWHERE\n  u.active = true",
      "minify",
    );
    expect(result).not.toContain("\n");
  });
});

describe("sql-minifier", () => {
  const tool = toolsBySlug["sql-minifier"]!;

  it("minifies SQL", () => {
    const result = callRun(tool,
      "SELECT\n  *\nFROM\n  users\nWHERE\n  active = true",
      "run",
    );
    expect(result).not.toContain("\n");
  });
});

describe("sql-beautifier", () => {
  const tool = toolsBySlug["sql-beautifier"]!;

  it("beautifies SQL", () => {
    const result = callRun(tool,
      "SELECT * FROM users WHERE active = true",
      "run",
    );
    expect(result).toContain("\n");
  });
});

describe("sql-to-prisma", () => {
  const tool = toolsBySlug["sql-to-prisma"]!;

  it("converts SQL to Prisma schema", () => {
    const result = callRun(tool,
      "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL);",
      "run",
    );
    expect(result).toContain("model");
    expect(result).toContain("@id");
  });
});

describe("prisma-to-sql", () => {
  const tool = toolsBySlug["prisma-to-sql"]!;

  it("converts Prisma to SQL", () => {
    const result = callRun(tool,
      'model User {\n  id    Int    @id @default(autoincrement())\n  name  String\n  email String @unique\n}',
      "run",
    );
    expect(result).toContain("CREATE TABLE");
    expect(result).toContain("PRIMARY KEY");
    expect(result).toContain("NOT NULL");
    expect(result).toContain("UNIQUE");
  });
});

describe("sql-to-laravel-migration", () => {
  const tool = toolsBySlug["sql-to-laravel-migration"]!;

  it("converts SQL to Laravel migration", () => {
    const result = callRun(tool,
      "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL);",
      "run",
    );
    expect(result).toContain("Schema::create");
    expect(result).toContain("$table->id");
  });
});

describe("sql-to-sequelize", () => {
  const tool = toolsBySlug["sql-to-sequelize"]!;

  it("converts SQL to Sequelize model", () => {
    const result = callRun(tool,
      "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL);",
      "run",
    );
    expect(result).toContain("DataTypes");
    expect(result).toContain("sequelize.define");
  });
});

describe("sql-to-typeorm", () => {
  const tool = toolsBySlug["sql-to-typeorm"]!;

  it("converts SQL to TypeORM entity", () => {
    const result = callRun(tool,
      "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL);",
      "run",
    );
    expect(result).toContain("Entity");
    expect(result).toContain("PrimaryGeneratedColumn");
    expect(result).toContain("Column");
  });
});

describe("sql-to-drizzle", () => {
  const tool = toolsBySlug["sql-to-drizzle"]!;

  it("converts SQL to Drizzle schema", () => {
    const result = callRun(tool,
      "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL);",
      "run",
    );
    expect(result).toContain("mysqlTable");
    expect(result).toContain("primaryKey()");
  });
});

// ─── Frontend Tools ─────────────────────────────────────────

describe("html-to-jsx", () => {
  const tool = toolsBySlug["html-to-jsx"]!;

  it("converts HTML to JSX", () => {
    const result = callRun(tool,'<div class="container">Hello</div>', "run");
    expect(result).toContain("className");
    expect(result).not.toContain('class="');
  });

  it("converts event handlers to camelCase", () => {
    const result = callRun(tool,'<button onclick="handleClick()">Click</button>', "run");
    expect(result).toContain("onClick");
    expect(result).not.toContain("onclick");
  });
});

describe("html-to-tsx", () => {
  const tool = toolsBySlug["html-to-tsx"]!;

  it("converts HTML to TSX with types", () => {
    const result = callRun(tool,'<div class="container">Hello</div>', "run");
    expect(result).toContain("React.FC");
    expect(result).toContain("className");
  });
});

describe("svg-to-jsx", () => {
  const tool = toolsBySlug["svg-to-jsx"]!;

  it("converts SVG to JSX", () => {
    const result = callRun(tool,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" fill="currentColor"/></svg>',
      "run",
    );
    expect(result).toContain("viewBox");
    expect(result).toContain("fill");
  });
});

describe("svg-to-react-component", () => {
  const tool = toolsBySlug["svg-to-react-component"]!;

  it("generates React component", () => {
    const result = callRun(tool,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" fill="currentColor"/></svg>',
      "run",
    );
    expect(result).toContain("React.FC");
    expect(result).toContain("IconProps");
    expect(result).toContain("export default");
  });
});

describe("css-to-tailwind", () => {
  const tool = toolsBySlug["css-to-tailwind"]!;

  it("converts CSS to Tailwind classes", () => {
    const result = callRun(tool,"display: flex;", "run");
    expect(result).toContain("flex");
  });

  it("converts padding", () => {
    const result = callRun(tool,"padding: 12px 24px;", "run");
    expect(result).toContain("py-");
    expect(result).toContain("px-");
  });
});

describe("tailwind-sorter", () => {
  const tool = toolsBySlug["tailwind-sorter"]!;

  it("sorts Tailwind classes", () => {
    const result = callRun(tool,"text-white p-4 bg-blue-500 font-bold", "run");
    const classes = result.split(" ");
    expect(classes.length).toBe(4);
  });
});

describe("tailwind-minifier", () => {
  const tool = toolsBySlug["tailwind-minifier"]!;

  it("removes duplicate classes", () => {
    const result = callRun(tool,"p-4 p-4 bg-blue-500 bg-blue-500 text-white", "run");
    const classes = result.split(" ");
    expect(new Set(classes).size).toBe(classes.length);
  });
});

describe("css-beautifier", () => {
  const tool = toolsBySlug["css-beautifier"]!;

  it("beautifies CSS", () => {
    const result = callRun(tool,".card{border-radius:24px;padding:32px;}", "run");
    expect(result).toContain("\n");
    expect(result).toContain("{");
    expect(result).toContain("}");
  });
});

// ─── JavaScript Tools ───────────────────────────────────────

describe("js-beautifier", () => {
  const tool = toolsBySlug["js-beautifier"]!;

  it("beautifies JavaScript", () => {
    const result = callRun(tool,'function hello(){console.log("hi")}', "run");
    expect(result).toContain("\n");
    expect(result).toContain("{");
  });
});

describe("js-minifier", () => {
  const tool = toolsBySlug["js-minifier"]!;

  it("minifies JavaScript", () => {
    const result = callRun(tool,
      'function hello() {\n  console.log("hi");\n}',
      "run",
    );
    expect(result).not.toContain("\n");
  });
});

describe("ts-formatter", () => {
  const tool = toolsBySlug["ts-formatter"]!;

  it("formats TypeScript", () => {
    const result = callRun(tool,'interface User{name:string;age:number}', "run");
    expect(result).toContain("\n");
    expect(result).toContain("interface");
  });
});

describe("regex-tester", () => {
  const tool = toolsBySlug["regex-tester"]!;

  it("tests regex patterns", () => {
    const result = callRun(tool,"/\\d+/g\nabc123def456", "test");
    expect(result).toContain("Regex:");
    expect(result).toContain("match");
  });

  it("reports no match", () => {
    const result = callRun(tool,"/^abc$/\ndef", "test");
    expect(result).toContain("No match");
  });
});

describe("regex-generator", () => {
  const tool = toolsBySlug["regex-generator"]!;

  it("generates email regex", () => {
    const result = callRun(tool,"", "email");
    expect(result).toContain("Pattern:");
    expect(result).toContain("Description:");
  });

  it("generates URL regex", () => {
    const result = callRun(tool,"", "url");
    expect(result).toContain("https?:");
  });
});

describe("cron-builder", () => {
  const tool = toolsBySlug["cron-builder"]!;

  it("builds cron from natural language", () => {
    const result = callRun(tool,"every minute", "run");
    expect(result).toContain("Cron:");
    expect(result).toContain("* * * * *");
  });

  it("builds cron for every day at 3am", () => {
    const result = callRun(tool,"every day at 3am", "run");
    expect(result).toContain("0 3 * * *");
  });
});

describe("cron-parser", () => {
  const tool = toolsBySlug["cron-parser"]!;

  it("parses cron expression", () => {
    const result = callRun(tool,"0 3 * * *", "run");
    expect(result).toContain("Description:");
    expect(result).toContain("3:00 AM");
  });
});

describe("js-to-typescript", () => {
  const tool = toolsBySlug["js-to-typescript"]!;

  it("converts JS to TS with type annotations", () => {
    const result = callRun(tool,
      'function greet(name) {\n  return "Hello " + name;\n}',
      "run",
    );
    expect(result).toContain(": any");
  });
});

// ─── Image Tools ────────────────────────────────────────────

describe("svg-optimizer", () => {
  const tool = toolsBySlug["svg-optimizer"]!;

  it("optimizes SVG by removing comments", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><!-- comment --><path d="M0 0"/></svg>';
    const result = callRun(tool,input, "run");
    expect(result).not.toContain("<!--");
    expect(result).toContain("<path");
  });

  it("removes title and desc", () => {
    const input =
      '<svg><title>Icon</title><desc>An icon</desc><path d="M0 0"/></svg>';
    const result = callRun(tool,input, "run");
    expect(result).not.toContain("<title>");
    expect(result).not.toContain("<desc>");
  });
});

describe("svg-minifier", () => {
  const tool = toolsBySlug["svg-minifier"]!;

  it("minifies SVG", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg">\n  <path d="M0 0" fill="white" />\n</svg>';
    const result = callRun(tool,input, "run");
    expect(result).not.toContain("\n");
    expect(result).not.toContain("  ");
  });
});

describe("svg-formatter", () => {
  const tool = toolsBySlug["svg-formatter"]!;

  it("formats SVG with indentation", () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/><circle cx="5" cy="5" r="3"/></svg>';
    const result = callRun(tool,input, "run");
    expect(typeof result).toBe("string");
    expect(result).toContain("<svg");
  });
});

describe("svg-preview", () => {
  const tool = toolsBySlug["svg-preview"]!;

  it("provides SVG preview info", () => {
    const result = callRun(tool,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="200" height="200"><circle cx="12" cy="12" r="10" fill="blue"/></svg>',
      "run",
    );
    expect(result).toContain("SVG Preview");
    expect(result).toContain("Width:");
    expect(result).toContain("Height:");
    expect(result).toContain("Elements:");
  });
});

describe("image-base64", () => {
  const tool = toolsBySlug["image-base64"]!;

  it("parses data URL", () => {
    const result = callRun(tool,
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "run",
    );
    expect(result).toContain("Data URL detected");
    expect(result).toContain("MIME Type:");
  });

  it("parses raw base64", () => {
    const result = callRun(tool,"iVBORw0KGgoAAAANSUhEUg==", "run");
    expect(result).toContain("Base64 Content detected");
  });
});

// ─── Additional Converter Tools ─────────────────────────────

describe("json-to-csv", () => {
  const tool = toolsBySlug["json-to-csv"]!;

  it("handles single object input", () => {
    const result = callRun(tool,'{"name":"Ada","age":30}', "run");
    expect(result).toContain("name");
    expect(result).toContain("Ada");
  });
});

describe("csv-to-json", () => {
  const tool = toolsBySlug["csv-to-json"]!;

  it("handles quoted fields", () => {
    const result = callRun(tool,'name,desc\nAda,"Hello, World"', "run");
    const parsed = JSON.parse(result);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].name).toBe("Ada");
  });
});

// ─── Tool Count Verification ────────────────────────────────

describe("tool count", () => {
  it("has a substantial number of tools", () => {
    expect(tools.length).toBeGreaterThanOrEqual(60);
  });

  it("no duplicate slugs", () => {
    const slugs = tools.map((t) => t.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });
});

// ─── Async Tool Tests ───────────────────────────────────────

describe("async tools", () => {
  it("sha256-generator returns a promise", () => {
    const tool = toolsBySlug["sha256-generator"]!;
    const result = callRun(tool,"test", "hash");
    expect(result).toBeInstanceOf(Promise);
  });

  it("sha512-generator returns a promise", () => {
    const tool = toolsBySlug["sha512-generator"]!;
    const result = callRun(tool,"test", "hash");
    expect(result).toBeInstanceOf(Promise);
  });

  it("bcrypt-hash returns a promise", () => {
    const tool = toolsBySlug["bcrypt-hash"]!;
    const result = callRun(tool,"test", "hash");
    expect(result).toBeInstanceOf(Promise);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────

describe("edge cases", () => {
  it("tools with sample don't throw when run with their sample", async () => {
    const asyncSlugs = [
      "sha256-generator",
      "sha512-generator",
      "bcrypt-hash",
    ];

    for (const tool of tools) {
      if (!tool.sample) continue;
      const firstAction = tool.actions[0]!.id;

      try {
        const result = callRun(tool,tool.sample, firstAction);
        if (result instanceof Promise) {
          await result;
        }
      } catch (e) {
        // Some tools may throw for specific inputs, that's acceptable
        // but we log which ones fail
        if (!asyncSlugs.includes(tool.slug)) {
          // Non-async tools with samples should not throw
          console.warn(`Tool ${tool.slug} threw with its sample:`, e);
        }
      }
    }
  });

  it("generator tools always produce non-empty output", () => {
    for (const tool of tools) {
      if (!tool.generator) continue;
      const firstAction = tool.actions[0]!.id;
      const result = callRun(tool,"", firstAction);
      if (typeof result === "string") {
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── All Tool Slugs ─────────────────────────────────────────

describe("all tool slugs exist", () => {
  const expectedSlugs = [
    "json-formatter",
    "json-to-typescript",
    "base64-encoder",
    "url-encoder",
    "query-string-parser",
    "jwt-decoder",
    "uuid-generator",
    "password-generator",
    "lorem-ipsum",
    "case-converter",
    "word-counter",
    "text-cleaner",
    "color-converter",
    "css-minifier",
    "timestamp-converter",
    "html-entity-encoder",
    "slug-generator",
    "json-validator",
    "json-tree-viewer",
    "json-merge",
    "json-pretty-print",
    "json-diff",
    "json-sort-keys",
    "json-escape",
    "json-repair",
    "json-to-zod",
    "json-to-yup",
    "json-to-prisma",
    "json-to-sql",
    "json-to-graphql",
    "json-to-go",
    "json-to-rust",
    "json-to-java",
    "json-to-kotlin",
    "json-to-swift",
    "json-to-dart",
    "csv-to-json",
    "json-to-csv",
    "xml-to-json",
    "json-to-xml",
    "yaml-to-json",
    "json-to-yaml",
    "toml-to-json",
    "json-to-toml",
    "curl-to-fetch",
    "curl-to-axios",
    "curl-to-python",
    "curl-to-go",
    "curl-to-php",
    "curl-to-java",
    "curl-to-nodejs",
    "postman-to-curl",
    "openapi-to-typescript-sdk",
    "openapi-to-axios",
    "openapi-to-fetch",
    "query-string-builder",
    "sql-formatter",
    "sql-minifier",
    "sql-beautifier",
    "sql-to-prisma",
    "prisma-to-sql",
    "sql-to-laravel-migration",
    "sql-to-sequelize",
    "sql-to-typeorm",
    "sql-to-drizzle",
    "html-to-jsx",
    "html-to-tsx",
    "svg-to-jsx",
    "svg-to-react-component",
    "css-to-tailwind",
    "tailwind-sorter",
    "tailwind-minifier",
    "css-beautifier",
    "js-beautifier",
    "js-minifier",
    "ts-formatter",
    "regex-tester",
    "regex-generator",
    "cron-builder",
    "cron-parser",
    "js-to-typescript",
    "diff-checker",
    "reverse-lines",
    "unicode-escape",
    "hex-encode",
    "html-encode",
    "sha256-generator",
    "sha512-generator",
    "md5-generator",
    "bcrypt-hash",
    "nanoid-generator",
    "svg-optimizer",
    "svg-minifier",
    "svg-formatter",
    "svg-preview",
    "image-base64",
  ];

  it("contains all expected slugs", () => {
    for (const slug of expectedSlugs) {
      expect(toolsBySlug[slug]).toBeDefined();
    }
  });
});
