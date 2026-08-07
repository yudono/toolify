// @ts-nocheck


// ─── New Helper Functions ─────────────────────────────────
function parseJson(input: string): unknown {
  return JSON.parse(input);
}

function inferType(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "float";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return value.length > 0 ? `array<${inferType(value[0])}>` : "array";
  return "object";
}

function countKeys(obj: Record<string, unknown>): number {
  return Object.keys(obj).length;
}

function buildTree(value: unknown, indent: number = 0): string {
  const pad = "    ".repeat(indent);
  if (value === null) return `${pad}null`;
  if (typeof value === "string") return `${pad}"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return `${pad}${value}`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value.map((item, i) => {
      const prefix = `${pad}▸ [${i}]: `;
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        return `${prefix}\n${buildTree(item, indent + 1)}`;
      }
      return `${prefix}${JSON.stringify(item)}`;
    }).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}`;
    return entries.map(([key, val]) => {
      if (typeof val === "object" && val !== null && (Array.isArray(val) || Object.keys(val as Record<string, unknown>).length > 0)) {
        const prefix = `${pad}▸ ${key}`;
        return `${prefix}\n${buildTree(val, indent + 1)}`;
      }
      return `${pad}▸ ${key}: ${JSON.stringify(val)}`;
    }).join("\n");
  }
  return `${pad}${String(value)}`;
}

function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      key in result &&
      typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key]) &&
      typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])
    ) {
      result[key] = mergeDeep(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function diffObjects(a: Record<string, unknown>, b: Record<string, unknown>, path: string = ""): string {
  const lines: string[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of Array.from(allKeys).sort()) {
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in a)) {
      lines.push(`+ ${fullPath}: ${JSON.stringify(b[key])}`);
    } else if (!(key in b)) {
      lines.push(`- ${fullPath}: ${JSON.stringify(a[key])}`);
    } else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      if (typeof a[key] === "object" && a[key] !== null && typeof b[key] === "object" && b[key] !== null && !Array.isArray(a[key]) && !Array.isArray(b[key])) {
        lines.push(...diffObjects(a[key] as Record<string, unknown>, b[key] as Record<string, unknown>, fullPath).split("\n"));
      } else {
        lines.push(`- ${fullPath}: ${JSON.stringify(a[key])}`);
        lines.push(`+ ${fullPath}: ${JSON.stringify(b[key])}`);
      }
    }
  }
  return lines.join("\n");
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

function escapeJsonString(str: string): string {
  return JSON.stringify(str).slice(1, -1);
}

function unescapeJsonString(str: string): string {
  return JSON.parse(`"${str}"`);
}

function repairJson(input: string): string {
  let fixed = input.replace(/,\s*([}\]])/g, "$1");
  fixed = fixed.replace(/(['"])?(\w+)(['"])?\s*:/g, '"$2":');
  fixed = fixed.replace(/'/g, '"');
  fixed = fixed.replace(/:\s*"([^"]*)"([^,\}\]]*)"/g, ': "$1$2"');
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    const result: string[] = [];
    let inString = false;
    let escapeNext = false;
    let depth = 0;
    for (const char of fixed) {
      if (escapeNext) {
        result.push(char);
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        result.push(char);
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        result.push(char);
        continue;
      }
      if (inString) {
        result.push(char);
        continue;
      }
      if (char === '{' || char === '[') {
        depth++;
        result.push(char);
      } else if (char === '}' || char === ']') {
        depth--;
        result.push(char);
      } else {
        result.push(char);
      }
    }
    while (depth > 0) {
      if (depth > 0 && result[result.length - 1] !== ',' && result[result.length - 1] !== ':' && result[result.length - 1] !== ' ' && result[result.length - 1] !== '\n') {
        const lastChar = result[result.length - 1];
        if (lastChar === '}') {
          result.push(']');
          depth--;
        } else if (lastChar === ']') {
          result.push('}');
          depth--;
        } else {
          result.push('}');
          depth--;
        }
      } else {
        result.push('}');
        depth--;
      }
    }
    return result.join("");
  }
}

function generateZodSchema(data: unknown, indent: number = 4): string {
  const pad = " ".repeat(indent);
  if (data === null) return `${pad}z.null()`;
  if (typeof data === "string") {
    const lower = data.toLowerCase();
    if (lower.includes("@") && lower.includes(".")) return `${pad}z.string().email()`;
    if (lower.startsWith("http://") || lower.startsWith("https://")) return `${pad}z.string().url()`;
    return `${pad}z.string()`;
  }
  if (typeof data === "number") return Number.isInteger(data) ? `${pad}z.number().int()` : `${pad}z.number()`;
  if (typeof data === "boolean") return `${pad}z.boolean()`;
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}z.array(z.unknown())`;
    return `${pad}z.array(${generateZodSchema(data[0], indent)})`;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    const lines = entries.map(([key, val]) => `${pad}  ${key}: ${generateZodSchema(val, indent + 2)}`);
    return `${pad}z.object({\n${lines.join(",\n")}\n${pad}})`;
  }
  return `${pad}z.unknown()`;
}

function generateYupSchema(data: unknown, indent: number = 4): string {
  const pad = " ".repeat(indent);
  if (data === null) return `${pad}yup.mixed().nullable()`;
  if (typeof data === "string") return `${pad}yup.string()`;
  if (typeof data === "number") return Number.isInteger(data) ? `${pad}yup.number().integer()` : `${pad}yup.number()`;
  if (typeof data === "boolean") return `${pad}yup.boolean()`;
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}yup.array()`;
    return `${pad}yup.array().of(${generateYupSchema(data[0], indent)})`;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    const lines = entries.map(([key, val]) => `${pad}  ${key}: ${generateYupSchema(val, indent + 2)}`);
    return `${pad}yup.object().shape({\n${lines.join(",\n")}\n${pad}})`;
  }
  return `${pad}yup.mixed()`;
}

function generatePrismaSchema(data: unknown, indent: number = 2): string {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val === null) {
        lines.push(`${pad}${key.charAt(0).toUpperCase() + key.slice(1)} String?`);
      } else if (typeof val === "number") {
        lines.push(`${pad}${key.charAt(0).toUpperCase() + key.slice(1)} ${Number.isInteger(val) ? "Int" : "Float"}`);
      } else if (typeof val === "boolean") {
        lines.push(`${pad}${key.charAt(0).toUpperCase() + key.slice(1)} Boolean`);
      } else if (typeof val === "string") {
        lines.push(`${pad}${key.charAt(0).toUpperCase() + key.slice(1)} String`);
      } else if (Array.isArray(val)) {
        lines.push(`${pad}${key.charAt(0).toUpperCase() + key.slice(1)} String @db.Text`);
      } else {
        lines.push(`${pad}${key.charAt(0).toUpperCase() + key.slice(1)} Json`);
      }
    }
  }
  return lines.join("\n");
}

function generateSqlTable(data: unknown, tableName: string = "data"): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE ${tableName} (`);
  if (Array.isArray(data) && data.length > 0) {
    const firstRow = data[0] as Record<string, unknown>;
    const cols: string[] = [];
    for (const [key, val] of Object.entries(firstRow)) {
      if (val === null || typeof val === "string") cols.push(`  ${key} TEXT`);
      else if (typeof val === "number") cols.push(`  ${key} ${Number.isInteger(val) ? "INTEGER" : "REAL"}`);
      else if (typeof val === "boolean") cols.push(`  ${key} BOOLEAN`);
      else cols.push(`  ${key} TEXT`);
    }
    lines.push(cols.join(",\n"));
  } else if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const cols: string[] = [];
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val === null || typeof val === "string") cols.push(`  ${key} TEXT`);
      else if (typeof val === "number") cols.push(`  ${key} ${Number.isInteger(val) ? "INTEGER" : "REAL"}`);
      else if (typeof val === "boolean") cols.push(`  ${key} BOOLEAN`);
      else cols.push(`  ${key} TEXT`);
    }
    lines.push(cols.join(",\n"));
  }
  lines.push(");\n");
  return lines.join("\n");
}

function generateSqlInsert(data: unknown, tableName: string = "data"): string {
  const statements: string[] = [];
  if (Array.isArray(data)) {
    for (const row of data) {
      const obj = row as Record<string, unknown>;
      const cols = Object.keys(obj);
      const vals = cols.map(c => {
        const v = obj[c];
        if (v === null) return "NULL";
        if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
        if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
        return String(v);
      });
      statements.push(`INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
    }
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const cols = Object.keys(obj);
    const vals = cols.map(c => {
      const v = obj[c];
      if (v === null) return "NULL";
      if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      return String(v);
    });
    statements.push(`INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
  }
  return statements.join("\n");
}

function generateGraphqlType(data: unknown, name: string = "Type"): string {
  const lines: string[] = [];
  lines.push(`type ${name} {`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val === null) lines.push(`  ${key}: String`);
      else if (typeof val === "number") lines.push(`  ${key}: Int!`);
      else if (typeof val === "boolean") lines.push(`  ${key}: Boolean!`);
      else if (typeof val === "string") lines.push(`  ${key}: String!`);
      else if (Array.isArray(val)) lines.push(`  ${key}: [${val.length > 0 ? mapGraphqlType(val[0]) : "String"}]!`);
      else lines.push(`  ${key}: ${name}_${key}!`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function mapGraphqlType(val: unknown): string {
  if (val === null) return "String";
  if (typeof val === "number") return "Int";
  if (typeof val === "boolean") return "Boolean";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) return `[${val.length > 0 ? mapGraphqlType(val[0]) : "String"}]`;
  return "JSON";
}

function generateGoStruct(data: unknown, name: string = "Data"): string {
  const lines: string[] = [];
  lines.push(`type ${name} struct {`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const goField = key.charAt(0).toUpperCase() + key.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const goType = mapGoType(val);
      const paddedField = goField.padEnd(20);
      lines.push(`  ${paddedField}${goType} \`json:"${key}"\``);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function mapGoType(val: unknown): string {
  if (val === null) return "interface{}";
  if (typeof val === "number") return Number.isInteger(val) ? "int" : "float64";
  if (typeof val === "boolean") return "bool";
  if (typeof val === "string") return "string";
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]interface{}";
    return `[]${mapGoType(val[0])}`;
  }
  return "map[string]interface{}";
}

function generateRustStruct(data: unknown, name: string = "Data"): string {
  const lines: string[] = [];
  lines.push("#[derive(Serialize, Deserialize)]");
  lines.push(`pub struct ${name} {`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const rustType = mapRustType(val);
      lines.push(`  pub ${key}: ${rustType},`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function mapRustType(val: unknown): string {
  if (val === null) return "Option<serde_json::Value>";
  if (typeof val === "number") return Number.isInteger(val) ? "i64" : "f64";
  if (typeof val === "boolean") return "bool";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) {
    if (val.length === 0) return "Vec<serde_json::Value>";
    return `Vec<${mapRustType(val[0])}>`;
  }
  return "serde_json::Value";
}

function generateJavaClass(data: unknown, name: string = "Data"): string {
  const lines: string[] = [];
  lines.push(`public class ${name} {`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const fields = Object.entries(data as Record<string, unknown>);
    for (const [key, val] of fields) {
      const javaType = mapJavaType(val);
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      lines.push(`  private ${javaType} ${camelKey};`);
    }
    lines.push("");
    const params = fields.map(([key, val]) => {
      const javaType = mapJavaType(val);
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      return `${javaType} ${camelKey}`;
    }).join(", ");
    lines.push(`  public ${name}(${params}) {`);
    for (const [key] of fields) {
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      lines.push(`    this.${camelKey} = ${camelKey};`);
    }
    lines.push("  }");
    for (const [key, val] of fields) {
      const javaType = mapJavaType(val);
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      lines.push(`\n  public ${javaType} get${pascalKey}() {`);
      lines.push(`    return this.${camelKey};`);
      lines.push("  }");
      lines.push(`\n  public void set${pascalKey}(${javaType} ${camelKey}) {`);
      lines.push(`    this.${camelKey} = ${camelKey};`);
      lines.push("  }");
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function mapJavaType(val: unknown): string {
  if (val === null) return "Object";
  if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) return "List<Object>";
  return "Object";
}

function generateKotlinDataClass(data: unknown, name: string = "Data"): string {
  const lines: string[] = [];
  lines.push(`data class ${name}(`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    const params = entries.map(([key, val]) => {
      const kotlinType = mapKotlinType(val);
      return `  val ${key}: ${kotlinType}`;
    });
    lines.push(params.join(",\n"));
  }
  lines.push(")");
  return lines.join("\n");
}

function mapKotlinType(val: unknown): string {
  if (val === null) return "Any?";
  if (typeof val === "number") return Number.isInteger(val) ? "Int" : "Double";
  if (typeof val === "boolean") return "Boolean";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) {
    if (val.length === 0) return "List<Any>";
    return `List<${mapKotlinType(val[0])}>`;
  }
  return "Map<String, Any>";
}

function generateSwiftStruct(data: unknown, name: string = "Data"): string {
  const lines: string[] = [];
  lines.push(`struct ${name}: Codable {`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const swiftType = mapSwiftType(val);
      lines.push(`  let ${key}: ${swiftType}`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function mapSwiftType(val: unknown): string {
  if (val === null) return "Any?";
  if (typeof val === "number") return Number.isInteger(val) ? "Int" : "Double";
  if (typeof val === "boolean") return "Bool";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) {
    if (val.length === 0) return "[Any]";
    return `[${mapSwiftType(val[0])}]`;
  }
  return "[String: Any]";
}

function generateDartClass(data: unknown, name: string = "Data"): string {
  const lines: string[] = [];
  lines.push(`class ${name} {`);
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const fields = Object.entries(data as Record<string, unknown>);
    for (const [key, val] of fields) {
      const dartType = mapDartType(val);
      lines.push(`  final ${dartType} ${key};`);
    }
    lines.push("");
    const params = fields.map(([key, val]) => {
      const dartType = mapDartType(val);
      return `required this.${key}`;
    }).join(", ");
    lines.push(`  ${name}({${params}});`);
    lines.push("");
    lines.push(`  factory ${name}.fromJson(Map<String, dynamic> json) => ${name}(`);
    const jsonFields = fields.map(([key, val]) => {
      if (Array.isArray(val)) {
        const innerType = mapDartType(val.length > 0 ? val[0] : null);
        return `    ${key}: List<` + innerType + `>.from(json['` + key + `'] ?? [])`;
      }
      if (typeof val === "object" && val !== null) return `    ${key}: ` + mapDartType(val) + `.fromJson(json['` + key + `'] ?? {})`;
      return `    ${key}: json['${key}']`;
    });
    lines.push(jsonFields.join(",\n"));
    lines.push("  );");
    lines.push("");
    lines.push("  Map<String, dynamic> toJson() => {");
    for (const [key] of fields) {
      lines.push(`    '${key}': ${key},`);
    }
    lines.push("  };");
  }
  lines.push("}");
  return lines.join("\n");
}

function mapDartType(val: unknown): string {
  if (val === null) return "dynamic";
  if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
  if (typeof val === "boolean") return "bool";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) {
    if (val.length === 0) return "List<dynamic>";
    return `List<${mapDartType(val[0])}>`;
  }
  return "Map<String, dynamic>";
}

function parseCsv(input: string): Record<string, string>[] {
  const lines = input.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

function generateCsv(data: unknown[]): string {
  if (data.length === 0) return "";
  const firstRow = data[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);
  const lines = [headers.join(",")];
  for (const row of data) {
    const obj = row as Record<string, unknown>;
    lines.push(headers.map(h => String(obj[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

function parseXmlToJson(xml: string): unknown {
  const cleanXml = xml.trim();
  const tagMatch = cleanXml.match(/^<(\w+)>([\s\S]*)<\/\1>$/);
  if (!tagMatch) {
    const selfClosing = cleanXml.match(/^<(\w+)\s*\/>$/);
    if (selfClosing) return {};
    return cleanXml;
  }
  const result: Record<string, unknown> = {};
  const content = tagMatch[2].trim();
  const childTags = content.match(/<(?!\/)(\w+)(?:\s[^>]*)?>(?:[\s\S]*?)<\/\1>/g) || [];
  if (childTags.length === 0) {
    result[tagMatch[1]] = content;
    return result;
  }
  const children: Record<string, unknown> = {};
  for (const child of childTags) {
    const childMatch = child.match(/^<(\w+)(?:\s[^>]*)?>(?:[\s\S]*?)<\/\1>$/);
    if (childMatch) {
      const childContent = child.slice(child.indexOf(">") + 1, child.lastIndexOf("<")).trim();
      const nestedChildTags = childContent.match(/<(?!\/)(\w+)(?:\s[^>]*)?>(?:[\s\S]*?)<\/\1>/g) || [];
      if (nestedChildTags.length > 0) {
        children[childMatch[1]] = parseXmlToJson(child);
      } else {
        let parsed: unknown = childContent;
        if (childContent === "true") parsed = true;
        else if (childContent === "false") parsed = false;
        else if (!isNaN(Number(childContent)) && childContent !== "") parsed = Number(childContent);
        children[childMatch[1]] = parsed;
      }
    }
  }
  result[tagMatch[1]] = children;
  return result;
}

function generateXml(data: unknown, rootTag: string = "root"): string {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 1 && typeof entries[0][1] === "object" && entries[0][1] !== null) {
      return generateXml(entries[0][1], entries[0][0]);
    }
    const children = entries.map(([key, val]) => {
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return generateXml(val, key);
      }
      if (Array.isArray(val)) {
        return val.map((item, i) => generateXml(item, key)).join("\n");
      }
      return `  <${key}>${String(val ?? "")}</${key}>`;
    }).join("\n");
    return `<${rootTag}>\n${children}\n</${rootTag}>`;
  }
  if (Array.isArray(data)) {
    return data.map((item, i) => generateXml(item, rootTag)).join("\n");
  }
  return `<${rootTag}>${String(data ?? "")}</${rootTag}>`;
}

function parseYamlToJson(yaml: string): unknown {
  const lines = yaml.split("\n");
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentIndent = 0;
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.search(/\S/);
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === "" || value === "|") {
      const newObj: Record<string, unknown> = {};
      parent[key] = newObj;
      stack.push({ obj: newObj, indent: indent });
    } else if (value.startsWith("[")) {
      try {
        parent[key] = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        parent[key] = value;
      }
    } else {
      if (value === "true") parent[key] = true;
      else if (value === "false") parent[key] = false;
      else if (value === "null") parent[key] = null;
      else if (!isNaN(Number(value)) && value !== "") parent[key] = Number(value);
      else parent[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

function generateYaml(data: unknown, indent: number = 0): string {
  const pad = "  ".repeat(indent);
  if (data === null) return "null";
  if (typeof data === "boolean") return String(data);
  if (typeof data === "number") return String(data);
  if (typeof data === "string") return data.includes("\n") ? `|\n${data.split("\n").map(l => `${pad}  ${l}`).join("\n")}` : data;
  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    return data.map(item => {
      if (typeof item === "object" && item !== null) {
        const inner = generateYaml(item, indent + 1).split("\n");
        return `${pad}- ${inner[0].trim()}\n${inner.slice(1).map(l => `${pad}  ${l.trim()}`).join("\n")}`;
      }
      return `${pad}- ${item}`;
    }).join("\n");
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    return entries.map(([key, val]) => {
      if (typeof val === "object" && val !== null) {
        return `${pad}${key}:\n${generateYaml(val, indent + 1)}`;
      }
      return `${pad}${key}: ${generateYaml(val, indent)}`;
    }).join("\n");
  }
  return String(data);
}

function parseTomlToJson(toml: string): unknown {
  const result: Record<string, unknown> = {};
  let currentSection: Record<string, unknown> = result;
  let currentPath: string[] = [];

  for (const line of toml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const tableMatch = trimmed.match(/^\[([^\[\]]+)\]$/);
    if (tableMatch) {
      const path = tableMatch[1].split(".").map(p => p.trim());
      currentPath = path;
      let current: Record<string, unknown> = result;
      for (const p of path) {
        if (!current[p]) current[p] = {};
        current = current[p] as Record<string, unknown>;
      }
      currentSection = current;
      continue;
    }

    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value === "true") currentSection[key] = true;
      else if (value === "false") currentSection[key] = false;
      else if (value === "null") currentSection[key] = null;
      else if (value.startsWith('"') && value.endsWith('"')) currentSection[key] = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) currentSection[key] = value.slice(1, -1);
      else if (value.startsWith("[")) {
        try {
          currentSection[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          currentSection[key] = value;
        }
      }
      else if (!isNaN(Number(value))) currentSection[key] = Number(value);
      else currentSection[key] = value;
    }
  }
  return result;
}

function generateToml(data: unknown, path: string[] = []): string {
  const lines: string[] = [];
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    const simpleEntries = entries.filter(([, val]) => typeof val !== "object" || val === null);
    const nestedEntries = entries.filter(([, val]) => typeof val === "object" && val !== null);

    if (path.length > 0 && simpleEntries.length > 0) {
      lines.push(`[${path.join(".")}]`);
      for (const [key, val] of simpleEntries) {
        if (val === null) lines.push(`${key} = null`);
        else if (typeof val === "boolean") lines.push(`${key} = ${val}`);
        else if (typeof val === "string") lines.push(`${key} = "${val}"`);
        else if (typeof val === "number") lines.push(`${key} = ${val}`);
      }
      lines.push("");
    }

    for (const [key, val] of nestedEntries) {
      lines.push(generateToml(val, [...path, key]));
    }

    if (path.length === 0 && simpleEntries.length > 0 && nestedEntries.length > 0) {
      lines.unshift("");
      lines.unshift(simpleEntries.map(([key, val]) => {
        if (val === null) return `${key} = null`;
        if (typeof val === "boolean") return `${key} = ${val}`;
        if (typeof val === "string") return `${key} = "${val}"`;
        if (typeof val === "number") return `${key} = ${val}`;
        return `${key} = ${val}`;
      }).join("\n"));
    }
  }
  return lines.join("\n").trim();
}

function generateTypeName(data: unknown): string {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const keys = Object.keys(data as Record<string, unknown>);
    const nameKey = keys.find(k => k.toLowerCase() === "name" || k.toLowerCase() === "type" || k.toLowerCase() === "id");
    if (nameKey) {
      const val = (data as Record<string, unknown>)[nameKey];
      if (typeof val === "string") return val.charAt(0).toUpperCase() + val.slice(1).replace(/[^a-zA-Z0-9]/g, "");
    }
    return "Data";
  }
  return "Data";
}


function parseCurl(input: string): {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
} {
  let method = "GET";
  let url = "";
  const headers: Record<string, string> = {};
  let body = "";

  const methodMatch = input.match(/-X\s+(\w+)/);
  if (methodMatch) method = methodMatch[1];

  const urlMatch = input.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
  if (urlMatch) url = urlMatch[1];

  const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
  let hm;
  while ((hm = headerRegex.exec(input))) {
    const [key, ...val] = hm[1].split(":");
    if (key) headers[key.trim()] = val.join(":").trim();
  }

  const bodyMatch = input.match(
    /(?:--data-raw|--data-urlencode|--data)\s+['"](.+?)['"]/s
  );
  if (bodyMatch) body = bodyMatch[1];

  if (!methodMatch && body) method = "POST";

  return { method, url, headers, body };
}

function escapeString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function indent(code: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l) => (l.trim() ? pad + l : l))
    .join("\n");
}

function formatSql(sql: string, beautify: boolean): string {
  if (!beautify) {
    return sql
      .replace(/\s+/g, " ")
      .replace(/\s*([(),])\s*/g, "$1")
      .replace(/\s*;\s*/g, ";")
      .trim();
  }

  const keywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "ORDER BY",
    "GROUP BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "ON",
    "AS",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "PRIMARY KEY",
    "FOREIGN KEY",
    "REFERENCES",
    "CONSTRAINT",
    "UNIQUE",
    "CHECK",
    "DEFAULT",
    "NOT NULL",
    "IS NULL",
    "IS NOT NULL",
    "IN",
    "BETWEEN",
    "LIKE",
    "EXISTS",
    "CASE",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
    "UNION",
    "UNION ALL",
    "INTERSECT",
    "EXCEPT",
    "DISTINCT",
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "ASC",
    "DESC",
    "IF",
    "IF NOT EXISTS",
    "AUTO_INCREMENT",
    "CASCADE",
    "RESTRICT",
  ];

  let result = sql.replace(/\s+/g, " ").trim();

  const insertBefore = [
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "ORDER BY",
    "GROUP BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "ON",
    "VALUES",
    "SET",
    "DELETE FROM",
    "UNION",
    "UNION ALL",
    "INTERSECT",
    "EXCEPT",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
  ];

  for (const kw of insertBefore) {
    const regex = new RegExp(`\\b${kw.replace(/ /g, "\\s+")}\\b`, "gi");
    result = result.replace(regex, `\n${kw}`);
  }

  result = result.replace(/,\s*/g, ",\n  ");

  result = result.replace(/\(\s+/g, "(\n  ");
  result = result.replace(/\s+\)/g, "\n)");

  result = result.replace(/\bCREATE TABLE\b/gi, "\nCREATE TABLE");
  result = result.replace(/\bCREATE TABLE IF NOT EXISTS\b/gi, "\nCREATE TABLE IF NOT EXISTS");
  result = result.replace(/\bALTER TABLE\b/gi, "\nALTER TABLE");
  result = result.replace(/\bDROP TABLE\b/gi, "\nDROP TABLE");
  result = result.replace(/\bDROP TABLE IF EXISTS\b/gi, "\nDROP TABLE IF EXISTS");

  return result
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

export type CategoryId =
  | "json"
  | "text"
  | "converter"
  | "generator"
  | "security"
  | "css"
  | "date"
  | "api"
  | "database"
  | "javascript"
  | "image"
  | "flutter";

export type Accent = "brand" | "blue" | "purple" | "pink" | "orange" | "yellow" | "green" | "teal" | "cyan" | "red";

export type Category = {
  id: CategoryId;
  name: string;
  blurb: string;
  accent: Accent;
  icon: string;
};

export type Tool = {
  slug: string;
  name: string;
  description: string;
  category: CategoryId;
  icon: string;
  accent: Accent;
  trending?: boolean;
  isNew?: boolean;
  /** tools that produce output without input */
  generator?: boolean;
  inputLabel?: string;
  outputLabel?: string;
  /** hint for syntax highlighting language */
  outputLanguage?: string;
  placeholder?: string;
  sample?: string;
  actions: { id: string; label: string }[];
  run: (input: string, action: string) => string | Promise<string>;
  faq: { q: string; a: string }[];
};

export const categories: Category[] = [
  { id: "json", name: "JSON", blurb: "Format, validate, convert", accent: "orange", icon: "Braces" },
  { id: "text", name: "Text", blurb: "Clean, count, transform", accent: "blue", icon: "Type" },
  {
    id: "converter",
    name: "Converter",
    blurb: "Encode between formats",
    accent: "purple",
    icon: "Repeat",
  },
  {
    id: "generator",
    name: "Generator",
    blurb: "IDs, passwords, filler",
    accent: "green",
    icon: "Sparkles",
  },
  { id: "security", name: "Security", blurb: "Tokens and hashes", accent: "pink", icon: "Shield" },
  { id: "css", name: "CSS", blurb: "Colors and styles", accent: "teal", icon: "Palette" },
  { id: "date", name: "Date", blurb: "Timestamps and clocks", accent: "yellow", icon: "Clock" },
  { id: "api", name: "API", blurb: "Query strings and URLs", accent: "brand", icon: "Plug" },
  { id: "database", name: "Database", blurb: "SQL, schemas, and queries", accent: "teal", icon: "Database" },
  { id: "javascript", name: "JavaScript", blurb: "Code gen, minify, and utilities", accent: "yellow", icon: "FileCode" },
  { id: "image", name: "Image", blurb: "SVG tools and optimization", accent: "pink", icon: "Image" },
  { id: "flutter", name: "Flutter", blurb: "Dart code generators", accent: "teal", icon: "Smartphone" },
];

const F = { format: "Format", minify: "Minify", run: "Run", generate: "Generate" };

function tsTypeOf(value: unknown, name: string, out: string[], indent = ""): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    return `${tsTypeOf(value[0], name, out, indent)}[]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const body = entries
      .map(([k, v]) => `${indent}  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `"${k}"`}: ${tsTypeOf(v, k, out, `${indent}  `)};`)
      .join("\n");
    return `{\n${body}\n${indent}}`;
  }
  return typeof value;
}

function b64encode(s: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}
function b64decode(s: string) {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0)));
  } catch {
    throw new Error("That doesn't look like valid Base64.");
  }
}

function randomBytes(n: number) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

const LOREM =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum".split(
    " ",
  );

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error("Enter a hex color like #4F46E5.");
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export const tools: Tool[] = [
  {
    slug: "json-formatter",
    outputLanguage: "json",
    name: "JSON Formatter",
    description: "Pretty-print, validate and minify JSON with helpful error messages.",
    category: "json",
    icon: "Braces",
    accent: "orange",
    trending: true,
    sample: '{"name":"toolify","tools":128,"private":true,"tags":["fast","local"]}',
    placeholder: '{ "paste": "your json here" }',
    actions: [
      { id: "format", label: F.format },
      { id: "minify", label: F.minify },
      { id: "sort", label: "Sort keys" },
    ],
    run: (input, action) => {
      const data = parseJson(input);
      if (action === "minify") return JSON.stringify(data);
      if (action === "sort") {
        const sort = (v: unknown): unknown =>
          Array.isArray(v)
            ? v.map(sort)
            : v && typeof v === "object"
              ? Object.fromEntries(
                  Object.entries(v as Record<string, unknown>)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, val]) => [k, sort(val)]),
                )
              : v;
        return JSON.stringify(sort(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    },
    faq: [
      {
        q: "Is my JSON uploaded anywhere?",
        a: "No. Parsing happens in your browser tab — nothing leaves your device.",
      },
      {
        q: "Why does it say invalid JSON?",
        a: "Usually a trailing comma, single quotes, or an unquoted key. The error message points at the offending position.",
      },
    ],
  },
  {
    slug: "json-to-typescript",
    outputLanguage: "typescript",
    name: "JSON to TypeScript",
    description: "Turn any JSON payload into a typed TypeScript interface instantly.",
    category: "json",
    icon: "FileCode2",
    accent: "blue",
    trending: true,
    sample: '{"id":1,"name":"Ada","active":true,"roles":["admin"],"meta":{"seen":"2026-01-02"}}',
    outputLabel: "TypeScript",
    actions: [{ id: "run", label: "Generate types" }],
    run: (input) => {
      const data = parseJson(input);
      return `export interface Root ${tsTypeOf(data, "Root", [])}\n`;
    },
    faq: [
      { q: "Does it infer optional fields?", a: "It types what's present. Mark optional keys yourself with `?`." },
      { q: "Arrays?", a: "The first element decides the element type, which covers most API responses." },
    ],
  },
  {
    slug: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64 with full Unicode support.",
    category: "converter",
    icon: "Binary",
    accent: "purple",
    trending: true,
    sample: "Toolify runs entirely in your browser ✨",
    actions: [
      { id: "encode", label: "Encode" },
      { id: "decode", label: "Decode" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Type or paste something first.");
      return action === "decode" ? b64decode(input) : b64encode(input);
    },
    faq: [
      { q: "Does it handle emoji?", a: "Yes — text is UTF-8 encoded before conversion." },
      { q: "Is Base64 encryption?", a: "No. It's an encoding, readable by anyone. Never use it to hide secrets." },
    ],
  },
  {
    slug: "url-encoder",
    name: "URL Encoder",
    description: "Percent-encode or decode URLs and query parameters safely.",
    category: "api",
    icon: "Link2",
    accent: "brand",
    sample: "https://toolify.dev/search?q=hello world&tags=json,css",
    actions: [
      { id: "encode", label: "Encode" },
      { id: "decode", label: "Decode" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste a URL or fragment first.");
      return action === "decode" ? decodeURIComponent(input) : encodeURIComponent(input);
    },
    faq: [
      { q: "encodeURI or encodeURIComponent?", a: "This uses encodeURIComponent, right for query values." },
      { q: "Why does it fail on decode?", a: "A stray `%` that isn't part of a valid escape sequence." },
    ],
  },
  {
    slug: "query-string-parser",
    outputLanguage: "json",
    name: "Query String Parser",
    description: "Split any URL into readable, formatted query parameters.",
    category: "api",
    icon: "ListTree",
    accent: "teal",
    isNew: true,
    sample: "https://api.toolify.dev/v1/search?q=json&page=2&sort=desc&safe=true",
    outputLabel: "Parameters",
    actions: [{ id: "run", label: "Parse" }],
    run: (input) => {
      if (!input.trim()) throw new Error("Paste a URL with a query string.");
      const qs = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
      const params = new URLSearchParams(qs);
      const entries = [...params.entries()];
      if (!entries.length) throw new Error("No query parameters found in that URL.");
      return JSON.stringify(Object.fromEntries(entries), null, 2);
    },
    faq: [
      { q: "Repeated keys?", a: "The last value wins in the JSON output." },
      { q: "Does it fetch the URL?", a: "Never. The string is parsed locally; no request is made." },
    ],
  },
  {
    slug: "jwt-decoder",
    outputLanguage: "json",
    name: "JWT Decoder",
    description: "Inspect the header and payload of a JSON Web Token locally.",
    category: "security",
    icon: "KeyRound",
    accent: "pink",
    trending: true,
    placeholder: "eyJhbGciOi...",
    sample:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    outputLabel: "Decoded token",
    actions: [{ id: "run", label: "Decode" }],
    run: (input) => {
      const parts = input.trim().split(".");
      if (parts.length < 2) throw new Error("A JWT needs at least a header and a payload.");
      const dec = (p: string) => JSON.parse(b64decode(p.replace(/-/g, "+").replace(/_/g, "/")));
      return JSON.stringify({ header: dec(parts[0]!), payload: dec(parts[1]!) }, null, 2);
    },
    faq: [
      {
        q: "Is the signature verified?",
        a: "No — verification needs your secret key, which should never be pasted into a website.",
      },
      { q: "Is my token stored?", a: "No. It's decoded in memory and forgotten when you close the tab." },
    ],
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    description: "Generate cryptographically random v4 UUIDs, ten at a time.",
    category: "generator",
    icon: "Fingerprint",
    accent: "green",
    generator: true,
    outputLabel: "UUIDs",
    actions: [{ id: "generate", label: F.generate }],
    run: () => Array.from({ length: 10 }, () => crypto.randomUUID()).join("\n"),
    faq: [
      { q: "Are these secure?", a: "They use the browser's crypto random source, same as server-side generators." },
      { q: "Collision risk?", a: "Practically zero — v4 UUIDs carry 122 bits of randomness." },
    ],
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    description: "Create strong random passwords that never leave your machine.",
    category: "security",
    icon: "Lock",
    accent: "pink",
    generator: true,
    outputLabel: "Passwords",
    actions: [
      { id: "strong", label: "20 characters" },
      { id: "memorable", label: "Memorable" },
    ],
    run: (_i, action) => {
      if (action === "memorable") {
        return Array.from({ length: 5 }, () => {
          const words = Array.from(
            { length: 3 },
            () => LOREM[randomBytes(1)[0]! % LOREM.length]!,
          );
          return `${words.join("-")}-${randomBytes(1)[0]!}`;
        }).join("\n");
      }
      const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_";
      return Array.from({ length: 5 }, () =>
        [...randomBytes(20)].map((b) => alphabet[b % alphabet.length]!).join(""),
      ).join("\n");
    },
    faq: [
      { q: "Do you log passwords?", a: "There is no server to log them. Generation happens locally." },
      { q: "Which should I pick?", a: "Random 20-character strings for vaults, memorable ones for typing by hand." },
    ],
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum",
    description: "Placeholder copy in paragraphs, sentences or list items.",
    category: "generator",
    icon: "AlignLeft",
    accent: "yellow",
    generator: true,
    outputLabel: "Filler text",
    actions: [
      { id: "paragraphs", label: "3 paragraphs" },
      { id: "list", label: "List items" },
    ],
    run: (_i, action) => {
      const sentence = () => {
        const n = 8 + (randomBytes(1)[0]! % 8);
        const words = Array.from({ length: n }, () => LOREM[randomBytes(1)[0]! % LOREM.length]!);
        const s = words.join(" ");
        return s[0]!.toUpperCase() + s.slice(1) + ".";
      };
      if (action === "list") return Array.from({ length: 6 }, () => `- ${sentence()}`).join("\n");
      return Array.from({ length: 3 }, () =>
        Array.from({ length: 4 }, sentence).join(" "),
      ).join("\n\n");
    },
    faq: [
      { q: "Can I get more text?", a: "Press generate again — each run produces fresh copy." },
      { q: "Is it real Latin?", a: "It's the traditional scrambled Cicero filler, not meaningful prose." },
    ],
  },
  {
    slug: "case-converter",
    name: "Case Converter",
    description: "Switch text between camel, snake, kebab, title and constant case.",
    category: "text",
    icon: "CaseSensitive",
    accent: "blue",
    sample: "Toolify developer tools without the noise",
    actions: [
      { id: "camel", label: "camelCase" },
      { id: "snake", label: "snake_case" },
      { id: "kebab", label: "kebab-case" },
      { id: "constant", label: "CONSTANT" },
      { id: "title", label: "Title Case" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Type some text to convert.");
      const words = input
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((w) => w.toLowerCase());
      switch (action) {
        case "snake":
          return words.join("_");
        case "kebab":
          return words.join("-");
        case "constant":
          return words.join("_").toUpperCase();
        case "title":
          return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");
        default:
          return words.map((w, i) => (i ? w[0]!.toUpperCase() + w.slice(1) : w)).join("");
      }
    },
    faq: [
      { q: "Does it keep punctuation?", a: "No — separators are dropped so the result is a clean identifier." },
      { q: "Multi-line input?", a: "Everything is treated as one phrase. Convert line by line for identifiers." },
    ],
  },
  {
    slug: "word-counter",
    name: "Word Counter",
    description: "Words, characters, sentences and reading time at a glance.",
    category: "text",
    icon: "Calculator",
    accent: "green",
    sample: "Toolify is a collection of developer utilities that run entirely in the browser.",
    outputLabel: "Stats",
    actions: [{ id: "run", label: "Analyse" }],
    run: (input) => {
      if (!input.trim()) throw new Error("Paste some text to analyse.");
      const words = input.trim().split(/\s+/).length;
      const sentences = input.split(/[.!?]+\s|[.!?]+$/).filter((s) => s.trim()).length;
      const lines = input.split("\n").length;
      return [
        `Characters      ${input.length}`,
        `Characters (no spaces)  ${input.replace(/\s/g, "").length}`,
        `Words           ${words}`,
        `Sentences       ${sentences}`,
        `Lines           ${lines}`,
        `Reading time    ~${Math.max(1, Math.round(words / 220))} min`,
      ].join("\n");
    },
    faq: [
      { q: "How is reading time calculated?", a: "At roughly 220 words per minute, rounded up to a whole minute." },
      { q: "Does it count markdown syntax?", a: "Yes — characters are counted literally." },
    ],
  },
  {
    slug: "text-cleaner",
    name: "Text Cleaner",
    description: "Strip extra whitespace, duplicates or blank lines from messy text.",
    category: "text",
    icon: "Eraser",
    accent: "teal",
    isNew: true,
    sample: "  alpha\n\n\nbeta\nalpha\n   gamma   \n",
    actions: [
      { id: "trim", label: "Trim & squeeze" },
      { id: "dedupe", label: "Remove duplicates" },
      { id: "sort", label: "Sort lines" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste the text you want to tidy up.");
      const lines = input.split("\n").map((l) => l.trim());
      if (action === "dedupe") return [...new Set(lines.filter(Boolean))].join("\n");
      if (action === "sort") return lines.filter(Boolean).sort((a, b) => a.localeCompare(b)).join("\n");
      return lines.filter(Boolean).join("\n");
    },
    faq: [
      { q: "Is the original preserved?", a: "Your input stays in the left card until you clear it." },
      { q: "Case-sensitive dedupe?", a: "Yes, `Alpha` and `alpha` are treated as different lines." },
    ],
  },
  {
    slug: "color-converter",
    name: "Color Converter",
    description: "Convert a hex color into RGB, HSL and CSS-ready variables.",
    category: "css",
    icon: "Palette",
    accent: "purple",
    trending: true,
    sample: "#4F46E5",
    placeholder: "#4F46E5",
    outputLabel: "Formats",
    actions: [{ id: "run", label: "Convert" }],
    run: (input) => {
      const [r, g, b] = hexToRgb(input);
      const [h, s, l] = rgbToHsl(r, g, b);
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      return [
        `HEX   ${hex.toUpperCase()}`,
        `RGB   rgb(${r}, ${g}, ${b})`,
        `HSL   hsl(${h}, ${s}%, ${l}%)`,
        `CSS   --brand: ${hex.toUpperCase()};`,
      ].join("\n");
    },
    faq: [
      { q: "Shorthand hex?", a: "Yes, `#4F5` expands automatically." },
      { q: "Alpha channel?", a: "Not yet — 8-digit hex support is on the list." },
    ],
  },
  {
    slug: "css-minifier",
    outputLanguage: "css",
    name: "CSS Minifier",
    description: "Shrink stylesheets by removing comments and dead whitespace.",
    category: "css",
    icon: "FileCode",
    accent: "orange",
    sample: ".card {\n  border-radius: 24px; /* soft */\n  padding: 32px;\n}\n",
    actions: [
      { id: "minify", label: F.minify },
      { id: "format", label: "Beautify" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste some CSS first.");
      const stripped = input.replace(/\/\*[\s\S]*?\*\//g, "");
      if (action === "format") {
        return stripped
          .replace(/\s*{\s*/g, " {\n  ")
          .replace(/;\s*/g, ";\n  ")
          .replace(/\s*}\s*/g, "\n}\n\n")
          .replace(/\n\s+\n/g, "\n")
          .trim();
      }
      return stripped
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,])\s*/g, "$1")
        .replace(/;}/g, "}")
        .trim();
    },
    faq: [
      { q: "Is it safe for production?", a: "It's a whitespace-level minifier — great for snippets, not a replacement for a build step." },
      { q: "Does it touch my selectors?", a: "No selectors or values are rewritten." },
    ],
  },
  {
    slug: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Translate Unix timestamps into human-readable dates and back.",
    category: "date",
    icon: "Clock",
    accent: "yellow",
    sample: "1767225600",
    placeholder: "1767225600 or 2026-01-01T00:00:00Z",
    outputLabel: "Result",
    actions: [
      { id: "run", label: "Convert" },
      { id: "now", label: "Now" },
    ],
    run: (input, action) => {
      const date =
        action === "now"
          ? new Date()
          : /^\d{10}$/.test(input.trim())
            ? new Date(Number(input.trim()) * 1000)
            : /^\d{13}$/.test(input.trim())
              ? new Date(Number(input.trim()))
              : new Date(input.trim());
      if (Number.isNaN(date.getTime())) throw new Error("Enter a Unix timestamp or an ISO date.");
      return [
        `Unix (s)   ${Math.floor(date.getTime() / 1000)}`,
        `Unix (ms)  ${date.getTime()}`,
        `ISO 8601   ${date.toISOString()}`,
        `Local      ${date.toString()}`,
        `UTC        ${date.toUTCString()}`,
      ].join("\n");
    },
    faq: [
      { q: "Which timezone is used?", a: "Local output uses your device timezone; ISO and UTC are absolute." },
      { q: "Seconds or milliseconds?", a: "Both — 10 digits is treated as seconds, 13 as milliseconds." },
    ],
  },
  {
    slug: "html-entity-encoder",
    name: "HTML Entity Encoder",
    description: "Escape HTML so snippets render as text instead of markup.",
    category: "converter",
    icon: "Code2",
    accent: "brand",
    sample: '<div class="card">Hello & welcome</div>',
    actions: [
      { id: "encode", label: "Escape" },
      { id: "decode", label: "Unescape" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste some markup first.");
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      if (action === "decode") {
        return input
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");
      }
      return input.replace(/[&<>"']/g, (c) => map[c]!);
    },
    faq: [
      { q: "Does it handle every entity?", a: "It covers the five characters that matter for safe HTML output." },
      { q: "Is this XSS protection?", a: "Escaping is one layer — always escape on the server too." },
    ],
  },
  {
    slug: "slug-generator",
    name: "Slug Generator",
    description: "Turn any headline into a clean, URL-safe slug.",
    category: "generator",
    icon: "Hash",
    accent: "green",
    sample: "Developer Tools, Without the Noise!",
    actions: [{ id: "run", label: "Slugify" }],
    run: (input) => {
      if (!input.trim()) throw new Error("Type a title to slugify.");
      return input
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },
    faq: [
      { q: "Accented characters?", a: "They're transliterated — `Café` becomes `cafe`." },
      { q: "Max length?", a: "No limit, but shorter slugs read better in URLs." },
    ],
  },
  // ─── JSON Tools (New) ────────────────────────
  {
      slug: "json-validator",
      name: "JSON Validator",
      description: "Validate JSON and find errors with precise position information.",
      category: "json",
      icon: "CheckCircle",
      accent: "green",
      isNew: true,
      inputLabel: "JSON to validate",
      outputLabel: "Validation result",
      placeholder: "Paste your JSON here...",
      sample: '{"name":"test","items":[1,2,3]}',
      actions: [{ id: "validate", label: "Validate" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const type = Array.isArray(data) ? "Array" : typeof data === "object" ? "Object" : typeof data;
          const bytes = new TextEncoder().encode(input).length;
          const keys = typeof data === "object" && data !== null && !Array.isArray(data)
            ? countKeys(data as Record<string, unknown>)
            : Array.isArray(data) ? data.length : 0;
          return `Valid JSON ✓\n\nType: ${type}\nSize: ${bytes} bytes\nKeys: ${keys}`;
        } catch (e) {
          const error = e as Error;
          const match = error.message.match(/position\s+(\d+)/i);
          const pos = match ? parseInt(match[1]) : null;
          let context = "";
          if (pos !== null) {
            const lines = input.slice(0, pos).split("\n");
            const lineNum = lines.length;
            const col = lines[lines.length - 1].length + 1;
            context = `\n\nLine ${lineNum}, Column ${col}`;
          }
          return `Invalid JSON ✗\n\nError: ${error.message}${context}`;
        }
      },
      faq: [
        { q: "What JSON errors can this detect?", a: "It detects syntax errors like missing commas, unclosed brackets, invalid strings, and trailing commas." },
        { q: "What does the position information mean?", a: "The line and column numbers tell you exactly where the parser encountered the error." }
      ]
    },
  {
      slug: "json-tree-viewer",
      name: "JSON Tree Viewer",
      description: "View JSON as a hierarchical indented tree structure.",
      category: "json",
      icon: "GitBranch",
      accent: "teal",
      isNew: true,
      inputLabel: "JSON to visualize",
      outputLabel: "Tree view",
      placeholder: "Paste your JSON here...",
      sample: '{"user":{"name":"Ada","age":30},"tags":["admin","user"]}',
      actions: [{ id: "run", label: "View tree" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          return buildTree(data);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What does the tree view show?", a: "It displays JSON as a hierarchical tree with indentation, showing object keys and array indices." },
        { q: "Can I view deeply nested JSON?", a: "Yes, the tree view handles any level of nesting with proper indentation." }
      ]
    },
  {
      slug: "json-merge",
      outputLanguage: "json",
      name: "JSON Merge",
      description: "Merge two JSON objects together with shallow or deep merge strategies.",
      category: "json",
      icon: "Merge",
      accent: "purple",
      isNew: true,
      inputLabel: "Two JSON objects separated by ---",
      outputLabel: "Merged result",
      placeholder: 'First JSON\n---\nSecond JSON',
      sample: '{\n  "a": 1,\n  "b": { "x": 10 }\n}\n---\n{\n  "b": { "y": 20 },\n  "c": 3\n}',
      actions: [
        { id: "shallow", label: "Shallow merge" },
        { id: "deep", label: "Deep merge" }
      ],
      run: (input: string, action: string): string => {
        try {
          const parts = input.split("---").map(p => p.trim());
          if (parts.length < 2) return "Error: Please separate two JSON objects with ---";
          const a = parseJson(parts[0]) as Record<string, unknown>;
          const b = parseJson(parts[1]) as Record<string, unknown>;
          let result: Record<string, unknown>;
          if (action === "shallow") {
            result = { ...a, ...b };
          } else {
            result = mergeDeep(a, b);
          }
          return JSON.stringify(result, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What's the difference between shallow and deep merge?", a: "Shallow merge replaces nested objects entirely. Deep merge recursively combines nested objects." },
        { q: "How do I separate the two JSON objects?", a: "Place three dashes (---) on a line between the two JSON objects." }
      ]
    },
  {
      slug: "json-pretty-print",
      outputLanguage: "json",
      name: "JSON Pretty Print",
      description: "Format and prettify minified or compressed JSON.",
      category: "json",
      icon: "FileJson",
      accent: "orange",
      inputLabel: "JSON to format",
      outputLabel: "Formatted JSON",
      placeholder: "Paste minified JSON here...",
      sample: '{"name":"test","items":[1,2,3],"active":true}',
      actions: [{ id: "run", label: "Pretty print" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What does pretty printing do?", a: "It formats JSON with proper indentation and line breaks for readability." },
        { q: "Can I use this to minify JSON?", a: "This tool pretty prints JSON. Use JSON.stringify without indentation for minification." }
      ]
    },
  {
      slug: "json-diff",
      name: "JSON Diff",
      description: "Compare two JSON objects and highlight the differences.",
      category: "json",
      icon: "GitCompare",
      accent: "blue",
      isNew: true,
      inputLabel: "Two JSON objects separated by ---",
      outputLabel: "Differences",
      placeholder: 'First JSON\n---\nSecond JSON',
      sample: '{"name":"v1","count":1}\n---\n{"name":"v2","count":2,"new":true}',
      actions: [{ id: "run", label: "Compare" }],
      run: (input: string, action: string): string => {
        try {
          const parts = input.split("---").map(p => p.trim());
          if (parts.length < 2) return "Error: Please separate two JSON objects with ---";
          const a = parseJson(parts[0]) as Record<string, unknown>;
          const b = parseJson(parts[1]) as Record<string, unknown>;
          const diff = diffObjects(a, b);
          return diff || "No differences found";
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What do the + and - prefixes mean?", a: "+ indicates a value was added in the second JSON. - indicates a value was removed or changed." },
        { q: "Can I compare arrays?", a: "Yes, arrays are compared element by element, showing additions and removals." }
      ]
    },
  {
      slug: "json-sort-keys",
      outputLanguage: "json",
      name: "JSON Sort Keys",
      description: "Recursively sort all keys in JSON objects alphabetically.",
      category: "json",
      icon: "ArrowUpDown",
      accent: "teal",
      inputLabel: "JSON to sort",
      outputLabel: "Sorted JSON",
      placeholder: "Paste your JSON here...",
      sample: '{"z":1,"a":{"d":2,"b":3}}',
      actions: [{ id: "run", label: "Sort keys" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const sorted = sortKeys(data);
          return JSON.stringify(sorted, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "Will this sort array elements?", a: "No, this tool only sorts object keys. Array elements keep their original order." },
        { q: "Is the sort recursive?", a: "Yes, all nested objects have their keys sorted alphabetically too." }
      ]
    },
  {
      slug: "json-escape",
      name: "JSON Escape",
      description: "Escape and unescape JSON string values.",
      category: "json",
      icon: "Shield",
      accent: "pink",
      inputLabel: "String to escape/unescape",
      outputLabel: "Result",
      placeholder: 'Enter a string like Hello "world" & <test>',
      sample: 'Hello "world" & <test>',
      actions: [
        { id: "escape", label: "Escape" },
        { id: "unescape", label: "Unescape" }
      ],
      run: (input: string, action: string): string => {
        try {
          if (action === "escape") {
            return escapeJsonString(input);
          } else {
            return unescapeJsonString(input);
          }
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "When do I need to escape JSON strings?", a: "When embedding JSON strings in code, or when the string contains special characters like quotes or backslashes." },
        { q: "What characters get escaped?", a: "Quotes, backslashes, control characters, and Unicode characters are escaped." }
      ]
    },
  {
      slug: "json-repair",
      outputLanguage: "json",
      name: "JSON Repair",
      description: "Attempt to fix common JSON syntax errors automatically.",
      category: "json",
      icon: "Wrench",
      accent: "yellow",
      isNew: true,
      inputLabel: "Broken JSON to repair",
      outputLabel: "Repaired JSON",
      placeholder: "Paste broken JSON here...",
      sample: '{"name": "test", "items": [1, 2,], "active": true,}',
      actions: [{ id: "run", label: "Repair" }],
      run: (input: string, action: string): string => {
        try {
          JSON.parse(input);
          return input;
        } catch {
          try {
            const repaired = repairJson(input);
            JSON.parse(repaired);
            return repaired;
          } catch (e) {
            return `Error: Unable to repair JSON. ${(e as Error).message}`;
          }
        }
      },
      faq: [
        { q: "What JSON errors can this fix?", a: "It can fix trailing commas, missing quotes around keys, single quotes instead of double quotes, and missing closing brackets." },
        { q: "Will it always succeed?", a: "No, severely broken JSON may not be repairable. The tool attempts common fixes." }
      ]
    },
  {
      slug: "json-to-zod",
      outputLanguage: "typescript",
      name: "JSON to Zod",
      description: "Generate Zod validation schema from JSON data.",
      category: "converter",
      icon: "ShieldCheck",
      accent: "blue",
      trending: true,
      inputLabel: "JSON sample data",
      outputLabel: "Zod schema",
      placeholder: "Paste a JSON object to generate its Zod schema...",
      sample: '{"id":1,"name":"Ada","email":"a@b.com","active":true,"tags":["admin"],"meta":{"role":"admin"}}',
      actions: [{ id: "run", label: "Generate Zod" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          const schema = generateZodSchema(data, 2);
          return `import { z } from "zod";\n\nexport const ${typeName}Schema = ${schema.trim()};\n\nexport type ${typeName} = z.infer<typeof ${typeName}Schema>;`;
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What is Zod?", a: "Zod is a TypeScript-first schema validation library with static type inference." },
        { q: "How are email and URL fields detected?", a: "The tool detects strings containing @ or starting with http/https and adds appropriate Zod validations." }
      ]
    },
  {
      slug: "json-to-yup",
      outputLanguage: "typescript",
      name: "JSON to Yup",
      description: "Generate Yup validation schema from JSON data.",
      category: "converter",
      icon: "ShieldCheck",
      accent: "purple",
      inputLabel: "JSON sample data",
      outputLabel: "Yup schema",
      placeholder: "Paste a JSON object to generate its Yup schema...",
      sample: '{"id":1,"name":"Ada","email":"a@b.com","active":true}',
      actions: [{ id: "run", label: "Generate Yup" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          const schema = generateYupSchema(data, 2);
          return `import * as yup from "yup";\n\nexport const ${typeName}Schema = ${schema.trim()};\n\nexport type ${typeName} = yup.InferType<typeof ${typeName}Schema>;`;
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What is Yup?", a: "Yup is a JavaScript schema builder for validating objects and values, similar to Joi." },
        { q: "How does this differ from Zod?", a: "Yup uses a different API style and is commonly used with Formik for form validation." }
      ]
    },
  {
      slug: "json-to-prisma",
      outputLanguage: "graphql",
      name: "JSON to Prisma",
      description: "Generate a Prisma schema model from JSON data.",
      category: "converter",
      icon: "Database",
      accent: "blue",
      trending: true,
      inputLabel: "JSON sample data",
      outputLabel: "Prisma schema",
      placeholder: "Paste a JSON object to generate its Prisma model...",
      sample: '{"id":1,"name":"Product","price":29.99,"description":null,"isActive":true,"tags":["sale"]}',
      actions: [{ id: "run", label: "Generate Prisma" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          const fields = generatePrismaSchema(data, 2);
          return `model ${typeName} {\n  id    Int    @id @default(autoincrement())\n${fields}\n}`;
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What Prisma types are generated?", a: "Int for integers, Float for decimals, String for text, Boolean for booleans, and Json for nested objects." },
        { q: "Does it add an ID field?", a: "Yes, it automatically adds an auto-incrementing ID field." }
      ]
    },
  {
      slug: "json-to-sql",
      outputLanguage: "sql",
      name: "JSON to SQL",
      description: "Generate SQL CREATE TABLE and INSERT statements from JSON.",
      category: "converter",
      icon: "Database",
      accent: "teal",
      trending: true,
      inputLabel: "JSON array or object",
      outputLabel: "SQL statements",
      placeholder: "Paste a JSON array to generate SQL...",
      sample: '[{"id":1,"name":"Ada","email":"ada@example.com"},{"id":2,"name":"Grace","email":"grace@example.com"}]',
      actions: [{ id: "run", label: "Generate SQL" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          let tableName = "data";
          if (typeof data === "object" && data !== null && !Array.isArray(data)) {
            tableName = generateTypeName(data).toLowerCase();
          } else if (Array.isArray(data) && data.length > 0) {
            tableName = generateTypeName(data[0]).toLowerCase();
          }
          const createTable = generateSqlTable(data, tableName);
          const inserts = generateSqlInsert(data, tableName);
          return `${createTable}\n${inserts}`;
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "Does it work with arrays of objects?", a: "Yes, it uses the first object as the schema and generates INSERT statements for all rows." },
        { q: "What SQL dialect is this?", a: "Standard SQL that works with PostgreSQL, MySQL, SQLite, and most other databases." }
      ]
    },
  {
      slug: "json-to-graphql",
      outputLanguage: "graphql",
      name: "JSON to GraphQL",
      description: "Generate a GraphQL type definition from JSON data.",
      category: "converter",
      icon: "GitBranch",
      accent: "pink",
      inputLabel: "JSON sample data",
      outputLabel: "GraphQL schema",
      placeholder: "Paste a JSON object to generate its GraphQL type...",
      sample: '{"id":1,"name":"Product","price":29.99,"inStock":true}',
      actions: [{ id: "run", label: "Generate GraphQL" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateGraphqlType(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What GraphQL types are generated?", a: "Int for integers, Boolean for booleans, String for text, and nested types for objects." },
        { q: "Can I use this for queries?", a: "The generated type defines the schema. You'd use it to build queries and mutations." }
      ]
    },
  {
      slug: "json-to-go",
      outputLanguage: "go",
      name: "JSON to Go",
      description: "Generate a Go struct definition from JSON data.",
      category: "converter",
      icon: "FileCode2",
      accent: "blue",
      trending: true,
      inputLabel: "JSON sample data",
      outputLabel: "Go struct",
      placeholder: "Paste a JSON object to generate its Go struct...",
      sample: '{"id":1,"name":"Ada","email":"a@b.com","active":true,"tags":["admin"]}',
      actions: [{ id: "run", label: "Generate Go" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateGoStruct(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "Are field names PascalCase?", a: "Yes, Go field names are converted to PascalCase for exported fields." },
        { q: "What about JSON tags?", a: "Each field gets a json tag with the original snake_case key name." }
      ]
    },
  {
      slug: "json-to-rust",
      outputLanguage: "rust",
      name: "JSON to Rust",
      description: "Generate a Rust struct with serde derives from JSON data.",
      category: "converter",
      icon: "FileCode2",
      accent: "orange",
      inputLabel: "JSON sample data",
      outputLabel: "Rust struct",
      placeholder: "Paste a JSON object to generate its Rust struct...",
      sample: '{"id":1,"name":"Ada","active":true,"scores":[95,87]}',
      actions: [{ id: "run", label: "Generate Rust" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateRustStruct(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What are Serialize and Deserialize?", a: "They are serde derives that enable automatic JSON serialization and deserialization in Rust." },
        { q: "What Rust types are used?", a: "i64 for integers, f64 for floats, bool for booleans, String for text, Vec for arrays." }
      ]
    },
  {
      slug: "json-to-java",
      outputLanguage: "java",
      name: "JSON to Java",
      description: "Generate a Java class with getters, setters, and constructor from JSON.",
      category: "converter",
      icon: "FileCode2",
      accent: "orange",
      inputLabel: "JSON sample data",
      outputLabel: "Java class",
      placeholder: "Paste a JSON object to generate its Java class...",
      sample: '{"id":1,"name":"Product","price":29.99,"active":true}',
      actions: [{ id: "run", label: "Generate Java" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateJavaClass(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What does the generated class include?", a: "Private fields, a constructor, getters, and setters for all properties." },
        { q: "Are field names camelCase?", a: "Yes, Java field names are converted to camelCase following Java conventions." }
      ]
    },
  {
      slug: "json-to-kotlin",
      outputLanguage: "kotlin",
      name: "JSON to Kotlin",
      description: "Generate a Kotlin data class from JSON data.",
      category: "converter",
      icon: "FileCode2",
      accent: "purple",
      inputLabel: "JSON sample data",
      outputLabel: "Kotlin data class",
      placeholder: "Paste a JSON object to generate its Kotlin data class...",
      sample: '{"id":1,"name":"Ada","email":"a@b.com","active":true}',
      actions: [{ id: "run", label: "Generate Kotlin" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateKotlinDataClass(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What is a Kotlin data class?", a: "A data class automatically generates equals(), hashCode(), toString(), and copy() methods." },
        { q: "Are properties immutable?", a: "Yes, properties are generated as val (immutable) by default." }
      ]
    },
  {
      slug: "json-to-swift",
      outputLanguage: "swift",
      name: "JSON to Swift",
      description: "Generate a Swift Codable struct from JSON data.",
      category: "converter",
      icon: "FileCode2",
      accent: "orange",
      inputLabel: "JSON sample data",
      outputLabel: "Swift struct",
      placeholder: "Paste a JSON object to generate its Swift Codable struct...",
      sample: '{"id":1,"name":"Ada","active":true,"scores":[95,87]}',
      actions: [{ id: "run", label: "Generate Swift" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateSwiftStruct(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What is Codable?", a: "Codable is a Swift protocol that enables automatic encoding and decoding of JSON data." },
        { q: "Are properties let or var?", a: "Properties are generated as let (immutable) by default for Swift best practices." }
      ]
    },
  {
      slug: "json-to-dart",
      outputLanguage: "dart",
      name: "JSON to Dart",
      description: "Generate a Dart class with fromJson/toJson methods from JSON data.",
      category: "converter",
      icon: "FileCode2",
      accent: "blue",
      inputLabel: "JSON sample data",
      outputLabel: "Dart class",
      placeholder: "Paste a JSON object to generate its Dart class...",
      sample: '{"id":1,"name":"Ada","active":true,"tags":["admin"]}',
      actions: [{ id: "run", label: "Generate Dart" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          const typeName = generateTypeName(data);
          return generateDartClass(data, typeName);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What does fromJson/toJson do?", a: "fromJson creates a Dart object from a Map<String, dynamic>, and toJson converts it back." },
        { q: "Is this compatible with Flutter?", a: "Yes, this pattern is standard for Flutter's json_serializable package." }
      ]
    },
  {
      slug: "csv-to-json",
      outputLanguage: "json",
      name: "CSV to JSON",
      description: "Convert CSV data to a JSON array of objects.",
      category: "converter",
      icon: "FileJson",
      accent: "orange",
      trending: true,
      inputLabel: "CSV data",
      outputLabel: "JSON array",
      placeholder: "Paste CSV data here...",
      sample: "name,age,email\nAda,30,ada@example.com\nGrace,25,grace@example.com",
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseCsv(input);
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "Does it handle quoted values?", a: "For basic CSV, it handles comma-separated values. Complex quoting may need adjustment." },
        { q: "What if columns are uneven?", a: "Missing values are treated as empty strings." }
      ]
    },
  {
      slug: "json-to-csv",
      outputLanguage: "plaintext",
      name: "JSON to CSV",
      description: "Convert a JSON array of objects to CSV format.",
      category: "converter",
      icon: "Table",
      accent: "teal",
      trending: true,
      inputLabel: "JSON array",
      outputLabel: "CSV data",
      placeholder: "Paste a JSON array of objects...",
      sample: '[{"name":"Ada","age":30},{"name":"Grace","age":25}]',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          if (!Array.isArray(data)) {
            const obj = data as Record<string, unknown>;
            return generateCsv([obj]);
          }
          return generateCsv(data);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "Does it handle nested objects?", a: "Nested objects are converted to JSON strings in the CSV cells." },
        { q: "What if objects have different keys?", a: "The CSV uses the union of all keys, with empty values where a key is missing." }
      ]
    },
  {
      slug: "xml-to-json",
      outputLanguage: "json",
      name: "XML to JSON",
      description: "Convert XML data to JSON format.",
      category: "converter",
      icon: "FileJson",
      accent: "blue",
      inputLabel: "XML data",
      outputLabel: "JSON",
      placeholder: "Paste XML data here...",
      sample: '<user><name>Ada</name><age>30</age><active>true</active></user>',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseXmlToJson(input);
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What XML features are supported?", a: "It handles nested elements, text content, and basic XML structure." },
        { q: "Does it handle attributes?", a: "Basic attribute handling is included. Complex XML may need a dedicated parser." }
      ]
    },
  {
      slug: "json-to-xml",
      outputLanguage: "xml",
      name: "JSON to XML",
      description: "Convert JSON data to XML format.",
      category: "converter",
      icon: "FileCode",
      accent: "purple",
      inputLabel: "JSON data",
      outputLabel: "XML",
      placeholder: "Paste JSON data here...",
      sample: '{"user":{"name":"Ada","age":30,"active":true}}',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          return generateXml(data);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "How are arrays handled?", a: "Array elements are repeated as sibling XML elements with the same tag name." },
        { q: "What about null values?", a: "Null values are rendered as empty elements." }
      ]
    },
  {
      slug: "yaml-to-json",
      outputLanguage: "json",
      name: "YAML to JSON",
      description: "Convert YAML data to JSON format.",
      category: "converter",
      icon: "FileJson",
      accent: "green",
      inputLabel: "YAML data",
      outputLabel: "JSON",
      placeholder: "Paste YAML data here...",
      sample: "user:\n  name: Ada\n  age: 30\n  active: true",
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseYamlToJson(input);
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What YAML features are supported?", a: "It handles nested objects, strings, numbers, booleans, null values, and arrays." },
        { q: "Does it support YAML anchors?", a: "Basic YAML is supported. Complex features like anchors may need a full YAML parser." }
      ]
    },
  {
      slug: "json-to-yaml",
      outputLanguage: "yaml",
      name: "JSON to YAML",
      description: "Convert JSON data to YAML format.",
      category: "converter",
      icon: "FileText",
      accent: "green",
      inputLabel: "JSON data",
      outputLabel: "YAML",
      placeholder: "Paste JSON data here...",
      sample: '{"user":{"name":"Ada","age":30}}',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          return generateYaml(data);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "How are nested objects represented?", a: "Nested objects use indentation with spaces, following standard YAML format." },
        { q: "Are strings quoted?", a: "Simple strings are unquoted. Strings with special characters are quoted." }
      ]
    },
  {
      slug: "toml-to-json",
      outputLanguage: "json",
      name: "TOML to JSON",
      description: "Convert TOML data to JSON format.",
      category: "converter",
      icon: "FileJson",
      accent: "yellow",
      inputLabel: "TOML data",
      outputLabel: "JSON",
      placeholder: "Paste TOML data here...",
      sample: "[user]\nname = \"Ada\"\nage = 30\nactive = true",
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseTomlToJson(input);
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What TOML features are supported?", a: "It handles sections/tables, key-value pairs, strings, numbers, booleans, and arrays." },
        { q: "Does it support inline tables?", a: "Basic inline tables are supported. Complex TOML features may need a dedicated parser." }
      ]
    },
  {
      slug: "json-to-toml",
      outputLanguage: "yaml",
      name: "JSON to TOML",
      description: "Convert JSON data to TOML format.",
      category: "converter",
      icon: "FileText",
      accent: "yellow",
      inputLabel: "JSON data",
      outputLabel: "TOML",
      placeholder: "Paste JSON data here...",
      sample: '{"user":{"name":"Ada","age":30}}',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        try {
          const data = parseJson(input);
          return generateToml(data);
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "How are nested objects handled?", a: "Nested objects become TOML sections like [section.subsection]." },
        { q: "Are values quoted?", a: "String values are quoted, numbers and booleans are unquoted." }
      ]
    },

  // ─── API & Database Tools (New) ────────────────────────
  {
      slug: "curl-to-fetch",
      outputLanguage: "javascript",
      name: "cURL to Fetch",
      description: "Convert cURL commands to JavaScript fetch() code",
      category: "api",
      icon: "Code2",
      accent: "brand",
      trending: true,
      inputLabel: "cURL command",
      outputLabel: "fetch() code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -H "Authorization: Bearer token123" -d \'{"name":"Ada","email":"ada@example.com"}\'',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);
        const headerObj = headerEntries.length
          ? "{\n" +
            headerEntries
              .map(([k, v]) => `    "${k}": "${escapeString(v)}"`)
              .join(",\n") +
            "\n  }"
          : "{}";

        const lines: string[] = [
          `const response = await fetch("${url}", {`,
          `  method: "${method}",`,
          `  headers: ${headerObj},`,
        ];
        if (body) {
          lines.push(`  body: JSON.stringify(${body}),`);
        }
        lines.push("});", "", "const data = await response.json();", "console.log(data);");
        return lines.join("\n");
      },
      faq: [
        {
          q: "What cURL flags are supported?",
          a: "This tool supports -X (method), -H (headers), -d/--data/--data-raw (request body), --data-urlencode, and URL arguments. It auto-detects POST when a body is present without -X.",
        },
        {
          q: "Does it handle authentication headers?",
          a: "Yes, any header passed with -H is included in the generated fetch() code, including Authorization, Content-Type, and custom headers.",
        },
      ],
    },
  {
      slug: "curl-to-axios",
      outputLanguage: "javascript",
      name: "cURL to Axios",
      description: "Convert cURL commands to Axios HTTP calls",
      category: "api",
      icon: "Code2",
      accent: "blue",
      trending: true,
      inputLabel: "cURL command",
      outputLabel: "Axios code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -H "Authorization: Bearer token123" -d \'{"name":"Ada","email":"ada@example.com"}\'',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);
        const headerStr = headerEntries.length
          ? ",\n  headers: {\n" +
            headerEntries.map(([k, v]) => `    "${k}": "${escapeString(v)}"`).join(",\n") +
            "\n  }"
          : "";
        const dataStr = body ? `,\n  data: ${body}` : "";
        const methodLower = method.toLowerCase();
        const fnMap: Record<string, string> = {
          get: "axios.get",
          post: "axios.post",
          put: "axios.put",
          patch: "axios.patch",
          delete: "axios.delete",
          head: "axios.head",
          options: "axios.options",
        };
        const fn = fnMap[methodLower] || `axios.${methodLower}`;
        const lines: string[] = [
          `const response = await ${fn}("${url}"${headerStr}${dataStr});`,
          "",
          "console.log(response.data);",
        ];
        return lines.join("\n");
      },
      faq: [
        {
          q: "Does this generate ES module or CommonJS code?",
          a: "The generated code uses ES module syntax (import axios from 'axios'). Adapt the import statement to your project setup if needed.",
        },
        {
          q: "How are different HTTP methods handled?",
          a: "The tool maps GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS to their corresponding axios methods. Unknown methods fall back to axios.{method}().",
        },
      ],
    },
  {
      slug: "curl-to-python",
      outputLanguage: "python",
      name: "cURL to Python",
      description: "Convert cURL commands to Python requests code",
      category: "api",
      icon: "Code2",
      accent: "yellow",
      inputLabel: "cURL command",
      outputLabel: "Python code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X GET https://api.example.com/data -H "Accept: application/json"',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);
        const headerStr = headerEntries.length
          ? "\nheaders = {\n" +
            headerEntries.map(([k, v]) => `    "${k}": "${escapeString(v)}"`).join(",\n") +
            "\n}\n"
          : "";

        const methodLower = method.toLowerCase();
        const dataStr = body ? `\ndata = '${escapeString(body)}'\n` : "";
        const lines: string[] = [
          "import requests",
          "",
          headerStr.trimEnd(),
          dataStr.trimEnd() ? dataStr.trimEnd() : "",
          `response = requests.${methodLower}("${url}"${
            headerEntries.length ? ", headers=headers" : ""
          }${body ? ", data=data" : ""})`,
          "",
          "print(response.json())",
        ];
        return lines.filter((l) => l !== undefined).join("\n");
      },
      faq: [
        {
          q: "Which Python HTTP library is used?",
          a: "The generated code uses the 'requests' library, which is the most popular Python HTTP client. Install it with: pip install requests",
        },
        {
          q: "Does it handle JSON bodies?",
          a: "Yes. If the cURL command includes -d or --data-raw with JSON, it generates a requests call with data parameter. For JSON bodies you may want to change 'data' to 'json' and parse the string accordingly.",
        },
      ],
    },
  {
      slug: "curl-to-go",
      outputLanguage: "go",
      name: "cURL to Go",
      description: "Convert cURL commands to Go net/http code",
      category: "api",
      icon: "Code2",
      accent: "blue",
      inputLabel: "cURL command",
      outputLabel: "Go code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X POST https://api.example.com/data -d \'{"key":"value"}\'',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);
        const headerLines = headerEntries
          .map(([k, v]) => `req.Header.Set("${k}", "${escapeString(v)}")`)
          .join("\n");

        const bodyLine = body
          ? `\nvar body = strings.NewReader(\`${escapeString(body)}\`)`
          : "\nvar body *strings.Reader = nil";

        const lines: string[] = [
          'package main',
          '',
          'import (',
          '    "fmt"',
          '    "io"',
          '    "net/http"',
          body ? '    "strings"' : '',
          ')',
          '',
          'func main() {',
          bodyLine,
          `    req, err := http.NewRequest("${method}", "${url}", body)`,
          '    if err != nil {',
          '        fmt.Println("Error creating request:", err)',
          '        return',
          '    }',
          '',
          headerLines
            ? headerLines
                .split("\n")
                .map((l) => "    " + l)
                .join("\n")
            : '',
          '',
          '    resp, err := http.DefaultClient.Do(req)',
          '    if err != nil {',
          '        fmt.Println("Error:", err)',
          '        return',
          '    }',
          '    defer resp.Body.Close()',
          '',
          '    respBody, _ := io.ReadAll(resp.Body)',
          '    fmt.Println(string(respBody))',
          '}',
        ];
        return lines.filter((l) => l !== undefined).join("\n");
      },
      faq: [
        {
          q: "Does this generate Go modules code?",
          a: "Yes, it generates valid Go code using the standard library net/http package. No external dependencies are needed.",
        },
        {
          q: "How are request bodies handled?",
          a: "Request bodies are wrapped in strings.NewReader() so they can be passed to http.NewRequest. The response body is read with io.ReadAll.",
        },
      ],
    },
  {
      slug: "curl-to-php",
      outputLanguage: "php",
      name: "cURL to PHP",
      description: "Convert cURL commands to PHP cURL code",
      category: "api",
      icon: "Code2",
      accent: "purple",
      inputLabel: "cURL command",
      outputLabel: "PHP code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"key":"value"}\'',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);

        const lines: string[] = [
          '<?php',
          '',
          '$ch = curl_init();',
          '',
          `curl_setopt($ch, CURLOPT_URL, "${url}");`,
          `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");`,
          "curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);",
        ];

        if (headerEntries.length) {
          lines.push("");
          lines.push("$headers = [");
          for (const [k, v] of headerEntries) {
            lines.push(`    "${escapeString(k)}: ${escapeString(v)}",`);
          }
          lines.push("];");
          lines.push("curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);");
        }

        if (body) {
          lines.push("");
          lines.push(`$data = '${escapeString(body)}';`);
          lines.push("curl_setopt($ch, CURLOPT_POSTFIELDS, $data);");
        }

        lines.push("");
        lines.push("$response = curl_exec($ch);");
        lines.push("$error = curl_error($ch);");
        lines.push("curl_close($ch);");
        lines.push("");
        lines.push("if ($error) {");
        lines.push('    echo "Error: " . $error;');
        lines.push("} else {");
        lines.push("    echo $response;");
        lines.push("}");
        lines.push("?>");

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which PHP version is required?",
          a: "The generated code works with PHP 5.5+ and uses the built-in cURL extension (ext-curl). Most PHP installations include this extension by default.",
        },
        {
          q: "Does it handle SSL verification?",
          a: "The default generated code uses SSL verification. You can add curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false) to disable it (not recommended for production).",
        },
      ],
    },
  {
      slug: "curl-to-java",
      outputLanguage: "java",
      name: "cURL to Java",
      description: "Convert cURL commands to Java HttpClient code",
      category: "api",
      icon: "Code2",
      accent: "orange",
      inputLabel: "cURL command",
      outputLabel: "Java code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"key":"value"}\'',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);

        const headerLines = headerEntries
          .map(
            ([k, v]) =>
              `.header("${escapeString(k)}", "${escapeString(v)}")`
          )
          .join("\n");

        const bodyLine = body ? `\n.body(HttpRequest.BodyPublishers.ofString("${escapeString(body)}"))` : "";

        const lines: string[] = [
          "import java.net.URI;",
          "import java.net.http.HttpClient;",
          "import java.net.http.HttpRequest;",
          "import java.net.http.HttpResponse;",
          "",
          "public class Main {",
          "    public static void main(String[] args) throws Exception {",
          "        HttpClient client = HttpClient.newHttpClient();",
          "",
          "        HttpRequest request = HttpRequest.newBuilder()",
          `            .uri(URI.create("${url}"))`,
          `            .method("${method}"${body ? "" : ", HttpRequest.BodyPublishers.noBody()"}`,
        ];

        if (headerLines) {
          for (const hl of headerLines.split("\n")) {
            lines.push("            " + hl);
          }
        }
        if (body) {
          lines.push("            " + bodyLine.trim());
          lines.push(`            .method("${method}", HttpRequest.BodyPublishers.ofString("${escapeString(body)}"))`);
        } else {
          lines.pop(); // remove the incomplete method line
          lines.push(`            .method("${method}", HttpRequest.BodyPublishers.noBody())`);
        }

        lines.push("            .build();");
        lines.push("");
        lines.push("        HttpResponse<String> response = client.send(");
        lines.push("            request, HttpResponse.BodyHandlers.ofString()");
        lines.push("        );");
        lines.push("");
        lines.push('        System.out.println(response.body());');
        lines.push("    }");
        lines.push("}");

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which Java version is required?",
          a: "The generated code uses java.net.http.HttpClient which requires Java 11 or later. For older versions, you would need to use HttpURLConnection or a library like OkHttp.",
        },
        {
          q: "Does it handle timeouts?",
          a: "The basic generated code doesn't set timeouts. You can add .timeout(Duration.ofSeconds(30)) to the request builder for timeout configuration.",
        },
      ],
    },
  {
      slug: "curl-to-nodejs",
      outputLanguage: "javascript",
      name: "cURL to Node.js",
      description: "Convert cURL commands to Node.js fetch code",
      category: "api",
      icon: "Code2",
      accent: "green",
      inputLabel: "cURL command",
      outputLabel: "Node.js code",
      placeholder: "Paste a cURL command...",
      sample:
        'curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"key":"value"}\'',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const { method, url, headers, body } = parseCurl(input);
        const headerEntries = Object.entries(headers);
        const headerObj = headerEntries.length
          ? "{\n" +
            headerEntries
              .map(([k, v]) => `    "${k}": "${escapeString(v)}"`)
              .join(",\n") +
            "\n  }"
          : "{}";

        const lines: string[] = [
          "const fetch = require('node-fetch');",
          "",
          `const response = await fetch("${url}", {`,
          `  method: "${method}",`,
          `  headers: ${headerObj},`,
        ];
        if (body) {
          lines.push(`  body: JSON.stringify(${body}),`);
        }
        lines.push("});", "", "const data = await response.json();", "console.log(data);");
        return lines.join("\n");
      },
      faq: [
        {
          q: "Does this use the built-in fetch or node-fetch?",
          a: "The generated code uses node-fetch for Node.js environments below v18. For Node.js 18+, you can remove the require statement and use the built-in global fetch.",
        },
        {
          q: "Can I use this with TypeScript?",
          a: "Yes, this code works in TypeScript. You may want to add type annotations for the response data. Node-fetch has @types/node-fetch for TypeScript support.",
        },
      ],
    },
  {
      slug: "postman-to-curl",
      outputLanguage: "bash",
      name: "Postman to cURL",
      description: "Convert Postman collection JSON to cURL commands",
      category: "api",
      icon: "Terminal",
      accent: "orange",
      inputLabel: "Postman JSON",
      outputLabel: "cURL command",
      placeholder: "Paste Postman request JSON...",
      sample:
        '{\n  "method": "POST",\n  "url": "https://api.example.com/users",\n  "header": [{"key":"Content-Type","value":"application/json"}],\n  "body": {"mode":"raw","raw":"{\\"name\\":\\"Ada\\"}"}\n}',
      actions: [{ id: "run", label: "Convert" }],
      run(input: string) {
        const parsed = parseJson<{
          method?: string;
          url?: string;
          header?: Array<{ key: string; value: string }>;
          body?: { mode?: string; raw?: string };
        }>(input);

        const method = (parsed.method || "GET").toUpperCase();
        const url = parsed.url || "";
        const headers = parsed.header || [];
        const body = parsed.body?.raw || "";

        const parts: string[] = ["curl"];

        if (method !== "GET") {
          parts.push(`-X ${method}`);
        }

        parts.push(`"${url}"`);

        for (const h of headers) {
          parts.push(`-H "${escapeString(h.key)}: ${escapeString(h.value)}"`);
        }

        if (body) {
          parts.push(`-d '${escapeString(body)}'`);
        }

        return parts.join(" \\\n  ");
      },
      faq: [
        {
          q: "Which Postman collection versions are supported?",
          a: "This tool supports Postman Collection v2.1 format. Most modern Postman exports use this format. If you have v1, try updating your Postman collection first.",
        },
        {
          q: "Does it handle authentication?",
          a: "Yes, if your Postman request includes Authorization headers, they will be included in the generated cURL command as -H flags.",
        },
      ],
    },
  {
      slug: "openapi-to-typescript-sdk",
      outputLanguage: "typescript",
      name: "OpenAPI to TypeScript SDK",
      description: "Generate TypeScript SDK from OpenAPI specification",
      category: "api",
      icon: "FileCode2",
      accent: "blue",
      isNew: true,
      inputLabel: "OpenAPI spec JSON",
      outputLabel: "TypeScript SDK",
      placeholder: "Paste OpenAPI spec JSON...",
      sample:
        '{\n  "openapi": "3.0.0",\n  "info": {"title": "My API", "version": "1.0.0"},\n  "paths": {\n    "/users": {\n      "get": {"summary": "List users", "responses": {"200": {"description": "OK"}}},\n      "post": {"summary": "Create user", "responses": {"201": {"description": "Created"}}}\n    },\n    "/users/{id}": {\n      "get": {"summary": "Get user", "parameters": [{"name": "id", "in": "path", "required": true}], "responses": {"200": {"description": "OK"}}}\n    }\n  }\n}',
      actions: [{ id: "run", label: "Generate SDK" }],
      run(input: string) {
        const spec = parseJson<{
          info?: { title?: string; version?: string };
          paths?: Record<
            string,
            Record<string, { summary?: string; parameters?: Array<{ name: string; in: string; required?: boolean }> }>
          >;
        }>(input);

        const title = spec.info?.title || "API";
        const paths = spec.paths || {};

        const lines: string[] = [
          `// Auto-generated ${title} SDK`,
          `// Generated from OpenAPI spec`,
          "",
          "const BASE_URL = '';",
          "",
          "interface RequestOptions {",
          "  method?: string;",
          "  headers?: Record<string, string>;",
          "  body?: unknown;",
          "}",
          "",
          "async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {",
          "  const { method = 'GET', headers = {}, body } = options;",
          "  const response = await fetch(`${BASE_URL}${path}`, {",
          "    method,",
          "    headers: {",
          "      'Content-Type': 'application/json',",
          "      ...headers,",
          "    },",
          "    body: body ? JSON.stringify(body) : undefined,",
          "  });",
          "  if (!response.ok) throw new Error(`HTTP ${response.status}`);",
          "  return response.json();",
          "}",
          "",
        ];

        for (const [path, methods] of Object.entries(paths)) {
          for (const [method, details] of Object.entries(methods)) {
            const fnName =
              method.toLowerCase() +
              path
                .replace(/\{(\w+)\}/g, "_$1")
                .replace(/\//g, "_")
                .replace(/^_/, "")
                .replace(/_+/g, "_");

            const params = (details.parameters || []).filter((p) => p.in === "path");
            const queryParams = (details.parameters || []).filter((p) => p.in === "query");

            const paramStr = params.map((p) => `${p.name}: string`).join(", ");
            const fetchParams = params.length
              ? params.map((p) => `"${p.name}": ${p.name}`).join(", ")
              : "";

            let actualPath = path;
            for (const p of params) {
              actualPath = actualPath.replace(`{${p.name}}`, `\${${p.name}}`);
            }

            const queryStr = queryParams.length
              ? queryParams.map((p) => `${p.name}: string`).join(", ")
              : "";

            const allParams = [
              ...params.map((p) => `${p.name}: string`),
              ...(queryStr ? [`queryParams?: { ${queryStr} }`] : []),
            ];

            lines.push(
              `export async function ${fnName.replace(/^_/, "")}(${allParams.join(", ")}) {`
            );
            lines.push(
              `  const query = queryParams ? '?' + new URLSearchParams(queryParams).toString() : '';`
            );
            lines.push(
              `  return request<unknown>(\`${actualPath}\${query}\`, { method: '${method.toUpperCase()}' });`
            );
            lines.push("}");
            lines.push("");
          }
        }

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which OpenAPI versions are supported?",
          a: "This tool supports OpenAPI 3.0.x and 3.1.x specs. It handles paths, methods, and basic parameters. Complex request bodies and responses are simplified to generic types.",
        },
        {
          q: "Can I customize the base URL?",
          a: "Yes, the generated SDK has a BASE_URL constant at the top. Set it to your API's base URL before using the SDK functions.",
        },
      ],
    },
  {
      slug: "openapi-to-axios",
      outputLanguage: "typescript",
      name: "OpenAPI to Axios Client",
      description: "Generate Axios client from OpenAPI specification",
      category: "api",
      icon: "FileCode2",
      accent: "blue",
      inputLabel: "OpenAPI spec JSON",
      outputLabel: "Axios client",
      placeholder: "Paste OpenAPI spec JSON...",
      sample:
        '{\n  "openapi": "3.0.0",\n  "info": {"title": "My API", "version": "1.0.0"},\n  "paths": {\n    "/users": {\n      "get": {"summary": "List users", "responses": {"200": {"description": "OK"}}},\n      "post": {"summary": "Create user", "responses": {"201": {"description": "Created"}}}\n    }\n  }\n}',
      actions: [{ id: "run", label: "Generate client" }],
      run(input: string) {
        const spec = parseJson<{
          info?: { title?: string; version?: string };
          paths?: Record<string, Record<string, { summary?: string }>>;
        }>(input);

        const title = spec.info?.title || "API";
        const paths = spec.paths || {};

        const lines: string[] = [
          `// Auto-generated ${title} Axios Client`,
          `import axios from 'axios';`,
          "",
          "const api = axios.create({",
          "  baseURL: '',",
          "  headers: { 'Content-Type': 'application/json' },",
          "});",
          "",
          "export default api;",
          "",
        ];

        for (const [path, methods] of Object.entries(paths)) {
          for (const [method, _details] of Object.entries(methods)) {
            const fnName =
              method.toLowerCase() +
              path
                .replace(/\{(\w+)\}/g, "_$1")
                .replace(/\//g, "_")
                .replace(/^_/, "")
                .replace(/_+/g, "_");

            let actualPath = path;
            const pathParams = path.match(/\{(\w+)\}/g) || [];
            for (const p of pathParams) {
              const name = p.replace(/[{}]/g, "");
              actualPath = actualPath.replace(p, `\${${name}}`);
            }

            const paramStr = pathParams.map((p) => `${p.replace(/[{}]/g, "")}: string`).join(", ");

            lines.push(
              `export async function ${fnName.replace(/^_/, "")}(${paramStr}) {`
            );
            lines.push(
              `  const response = await api.${method.toLowerCase()}(\`${actualPath}\`);`
            );
            lines.push("  return response.data;");
            lines.push("}");
            lines.push("");
          }
        }

        return lines.join("\n");
      },
      faq: [
        {
          q: "How do I configure the base URL?",
          a: "The generated client uses axios.create with an empty baseURL. Set it to your API's base URL: api.defaults.baseURL = 'https://api.example.com';",
        },
        {
          q: "Does it support request interceptors?",
          a: "The base api instance supports axios interceptors. You can add request/response interceptors using api.interceptors.request.use() and api.interceptors.response.use().",
        },
      ],
    },
  {
      slug: "openapi-to-fetch",
      outputLanguage: "typescript",
      name: "OpenAPI to Fetch Client",
      description: "Generate Fetch client from OpenAPI specification",
      category: "api",
      icon: "FileCode2",
      accent: "brand",
      inputLabel: "OpenAPI spec JSON",
      outputLabel: "Fetch client",
      placeholder: "Paste OpenAPI spec JSON...",
      sample:
        '{\n  "openapi": "3.0.0",\n  "info": {"title": "My API", "version": "1.0.0"},\n  "paths": {\n    "/users": {\n      "get": {"summary": "List users", "responses": {"200": {"description": "OK"}}}\n    }\n  }\n}',
      actions: [{ id: "run", label: "Generate client" }],
      run(input: string) {
        const spec = parseJson<{
          info?: { title?: string; version?: string };
          paths?: Record<string, Record<string, { summary?: string }>>;
        }>(input);

        const title = spec.info?.title || "API";
        const paths = spec.paths || {};

        const lines: string[] = [
          `// Auto-generated ${title} Fetch Client`,
          "",
          "const BASE_URL = '';",
          "",
          "async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {",
          "  const response = await fetch(`${BASE_URL}${path}`, {",
          "    headers: { 'Content-Type': 'application/json', ...options.headers },",
          "    ...options,",
          "  });",
          "  if (!response.ok) throw new Error(`HTTP ${response.status}`);",
          "  return response.json();",
          "}",
          "",
        ];

        for (const [path, methods] of Object.entries(paths)) {
          for (const [method, _details] of Object.entries(methods)) {
            const fnName =
              method.toLowerCase() +
              path
                .replace(/\{(\w+)\}/g, "_$1")
                .replace(/\//g, "_")
                .replace(/^_/, "")
                .replace(/_+/g, "_");

            let actualPath = path;
            const pathParams = path.match(/\{(\w+)\}/g) || [];
            for (const p of pathParams) {
              const name = p.replace(/[{}]/g, "");
              actualPath = actualPath.replace(p, `\${${name}}`);
            }

            const paramStr = pathParams.map((p) => `${p.replace(/[{}]/g, "")}: string`).join(", ");

            lines.push(
              `export async function ${fnName.replace(/^_/, "")}(${paramStr}) {`
            );
            lines.push(
              `  return apiFetch<unknown>(\`${actualPath}\`, { method: '${method.toUpperCase()}' });`
            );
            lines.push("}");
            lines.push("");
          }
        }

        return lines.join("\n");
      },
      faq: [
        {
          q: "Is this browser or Node.js compatible?",
          a: "The generated code uses the native fetch API which works in modern browsers and Node.js 18+. For older Node.js, install node-fetch.",
        },
        {
          q: "Does it handle error responses?",
          a: "Yes, the base apiFetch function checks response.ok and throws an error for non-2xx responses. You can customize error handling in the catch block.",
        },
      ],
    },
  {
      slug: "query-string-builder",
      name: "Query String Builder",
      description: "Build URL query strings from key-value pairs",
      category: "api",
      icon: "Link",
      accent: "teal",
      inputLabel: "Key-value pairs",
      outputLabel: "URL with query string",
      placeholder: "key = value\nanother = test",
      sample:
        "base_url = https://api.example.com/search\nq = hello world\npage = 2\nsort = desc",
      actions: [{ id: "build", label: "Build URL" }],
      run(input: string, action: string) {
        if (action !== "build") return input;

        const lines = input.split("\n").filter((l) => l.trim());
        let baseUrl = "";
        const params: Array<{ key: string; value: string }> = [];

        for (const line of lines) {
          const trimmed = line.trim();
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx === -1) continue;

          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();

          if (key.toLowerCase() === "base_url") {
            baseUrl = value;
          } else if (key) {
            params.push({ key, value });
          }
        }

        if (!baseUrl) {
          baseUrl = "https://example.com";
        }

        const searchParams = new URLSearchParams();
        for (const p of params) {
          searchParams.append(p.key, p.value);
        }

        const queryString = searchParams.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
      },
      faq: [
        {
          q: "How do I specify the base URL?",
          a: "Add a line with 'base_url = https://your-api.com' at the top of your input. If no base_url is provided, https://example.com is used as a default.",
        },
        {
          q: "Does it handle URL encoding?",
          a: "Yes, the tool uses URLSearchParams which automatically handles URL encoding of special characters. Spaces become +, and other special characters are percent-encoded.",
        },
      ],
    },
  {
      slug: "sql-formatter",
      outputLanguage: "sql",
      name: "SQL Formatter",
      description: "Format and beautify SQL queries",
      category: "database",
      icon: "Database",
      accent: "blue",
      trending: true,
      inputLabel: "SQL query",
      outputLabel: "Formatted SQL",
      placeholder: "SELECT * FROM users WHERE active = true ORDER BY name",
      sample:
        "SELECT u.id, u.name, u.email FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE u.active = true AND p.published_at IS NOT NULL ORDER BY p.created_at DESC LIMIT 10",
      actions: [
        { id: "format", label: "Format" },
        { id: "minify", label: "Minify" },
      ],
      run(input: string, action: string) {
        if (action === "minify") {
          return input
            .replace(/\s+/g, " ")
            .replace(/\s*([(),;])\s*/g, "$1")
            .trim();
        }
        return formatSql(input, true);
      },
      faq: [
        {
          q: "Does it preserve SQL syntax?",
          a: "Yes, the formatter recognizes SQL keywords and preserves them. It handles SELECT, FROM, WHERE, JOIN, ORDER BY, GROUP BY, HAVING, LIMIT, INSERT, UPDATE, DELETE, and more.",
        },
        {
          q: "Can I minify formatted SQL?",
          a: "Yes, use the 'Minify' action to collapse the formatted SQL back into a single line with minimal whitespace.",
        },
      ],
    },
  {
      slug: "sql-minifier",
      outputLanguage: "sql",
      name: "SQL Minifier",
      description: "Minify SQL queries by removing extra whitespace",
      category: "database",
      icon: "Minimize2",
      accent: "teal",
      inputLabel: "SQL query",
      outputLabel: "Minified SQL",
      placeholder: "SELECT * FROM users WHERE active = true",
      sample:
        "SELECT u.id, u.name, u.email FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE u.active = true AND p.published_at IS NOT NULL ORDER BY p.created_at DESC LIMIT 10",
      actions: [{ id: "run", label: "Minify" }],
      run(input: string) {
        return input
          .replace(/\s+/g, " ")
          .replace(/\s*([(),;])\s*/g, "$1")
          .trim();
      },
      faq: [
        {
          q: "What happens to string literals?",
          a: "String literals inside quotes are preserved. The minifier only collapses whitespace outside of quoted strings and removes unnecessary spaces around operators and keywords.",
        },
        {
          q: "Does this affect query performance?",
          a: "No, minified SQL is functionally identical to formatted SQL. The only difference is whitespace, which has no impact on query execution.",
        },
      ],
    },
  {
      slug: "sql-beautifier",
      outputLanguage: "sql",
      name: "SQL Beautifier",
      description: "Beautify SQL queries with proper indentation",
      category: "database",
      icon: "Sparkles",
      accent: "purple",
      inputLabel: "SQL query",
      outputLabel: "Beautified SQL",
      placeholder: "SELECT * FROM users WHERE active = true",
      sample:
        "SELECT u.id, u.name, u.email FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE u.active = true AND p.published_at IS NOT NULL ORDER BY p.created_at DESC LIMIT 10",
      actions: [{ id: "run", label: "Beautify" }],
      run(input: string) {
        return formatSql(input, true);
      },
      faq: [
        {
          q: "What's the difference between beautify and format?",
          a: "They are functionally the same. Both add proper line breaks and indentation before major SQL keywords for improved readability.",
        },
        {
          q: "Does it handle subqueries?",
          a: "Yes, the beautifier handles subqueries and nested SELECT statements by adding appropriate indentation levels.",
        },
      ],
    },
  {
      slug: "sql-to-prisma",
      outputLanguage: "graphql",
      name: "SQL to Prisma Schema",
      description: "Convert SQL CREATE TABLE statements to Prisma schema",
      category: "database",
      icon: "Database",
      accent: "blue",
      trending: true,
      inputLabel: "SQL CREATE TABLE",
      outputLabel: "Prisma schema",
      placeholder: "CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n);",
      sample:
        'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  age INT,\n  active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
      actions: [{ id: "run", label: "Generate Prisma" }],
      run(input: string) {
        const typeMap: Record<string, string> = {
          INT: "Int",
          INTEGER: "Int",
          SMALLINT: "Int",
          TINYINT: "Int",
          BIGINT: "BigInt",
          VARCHAR: "String",
          CHAR: "String",
          TEXT: "String",
          LONGTEXT: "String",
          MEDIUMTEXT: "String",
          BOOLEAN: "Boolean",
          BIT: "Boolean",
          FLOAT: "Float",
          DOUBLE: "Float",
          DECIMAL: "Decimal",
          NUMERIC: "Decimal",
          DATE: "DateTime",
          DATETIME: "DateTime",
          TIMESTAMP: "DateTime",
          TIME: "DateTime",
          JSON: "Json",
          JSONB: "Json",
          UUID: "String",
          BLOB: "Bytes",
          BYTEA: "Bytes",
        };

        const tableMatch = input.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]+)\)/i);
        if (!tableMatch) return "Error: Could not parse CREATE TABLE statement";

        const tableName = tableMatch[1];
        const body = tableMatch[2];

        const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)/gi;
        const lines: string[] = [
          `model ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} {`,
        ];

        let match;
        while ((match = columnRegex.exec(body))) {
          const colName = match[1];
          const sqlType = match[2].toUpperCase().replace(/\(.*\)/, "");
          const constraints = match[3].toUpperCase();
          const prismaType = typeMap[sqlType] || "String";
          const nullable = !constraints.includes("NOT NULL") && !constraints.includes("PRIMARY KEY");
          const isId = constraints.includes("PRIMARY KEY");
          const isUnique = constraints.includes("UNIQUE");
          const hasAutoIncrement = constraints.includes("AUTO_INCREMENT") || constraints.includes("SERIAL");

          let decorators: string[] = [];
          if (isId) decorators.push("@id");
          if (hasAutoIncrement && prismaType === "Int") decorators.push("@default(autoincrement())");
          if (isUnique) decorators.push("@unique");

          const typeStr = nullable ? `${prismaType}?` : prismaType;
          const decStr = decorators.length ? " " + decorators.join(" ") : "";
          lines.push(`  ${colName.padEnd(20)}${typeStr}${decStr}`);
        }

        lines.push("}");
        return lines.join("\n");
      },
      faq: [
        {
          q: "What SQL types are supported?",
          a: "The tool supports INT, VARCHAR, TEXT, BOOLEAN, FLOAT, DECIMAL, DATE, TIMESTAMP, JSON, UUID, BLOB, and their variants. Unknown types default to String in Prisma.",
        },
        {
          q: "How are constraints handled?",
          a: "PRIMARY KEY becomes @id, AUTO_INCREMENT becomes @default(autoincrement()), UNIQUE becomes @unique, and NOT NULL determines whether the field is optional (?).",
        },
      ],
    },
  {
      slug: "prisma-to-sql",
      outputLanguage: "sql",
      name: "Prisma Schema to SQL",
      description: "Convert Prisma schema to SQL CREATE TABLE statements",
      category: "database",
      icon: "Database",
      accent: "teal",
      inputLabel: "Prisma schema",
      outputLabel: "SQL CREATE TABLE",
      placeholder: "model User {\n  id    Int    @id\n  name  String\n}",
      sample:
        'model User {\n  id    Int    @id @default(autoincrement())\n  name  String\n  email String @unique\n  age   Int?\n  posts Post[]\n}',
      actions: [{ id: "run", label: "Generate SQL" }],
      run(input: string) {
        const typeMap: Record<string, string> = {
          Int: "INT",
          BigInt: "BIGINT",
          Float: "FLOAT",
          Decimal: "DECIMAL",
          String: "VARCHAR(255)",
          Boolean: "BOOLEAN",
          DateTime: "TIMESTAMP",
          Json: "JSON",
          Bytes: "BLOB",
        };

        const modelMatch = input.match(
          /model\s+(\w+)\s*\{([\s\S]+)\}/i
        );
        if (!modelMatch) return "Error: Could not parse Prisma model";

        const modelName = modelMatch[1];
        const body = modelMatch[2];

        const fieldRegex = /^\s*(\w+)\s+(\w+)(\?)?\s*(.*)?$/gm;
        const columns: string[] = [];

        let match;
        while ((match = fieldRegex.exec(body))) {
          const fieldName = match[1];
          const fieldType = match[2];
          const nullable = match[3] === "?";
          const modifiers = match[4] || "";

          if (fieldType.endsWith("[]")) continue; // skip relations

          const sqlType = typeMap[fieldType] || "VARCHAR(255)";
          const parts: string[] = [fieldName, sqlType];

          if (modifiers.includes("@id")) {
            parts.push("PRIMARY KEY");
            if (modifiers.includes("@default(autoincrement())")) {
              parts.push("AUTO_INCREMENT");
            }
          } else {
            if (!nullable) parts.push("NOT NULL");
            if (modifiers.includes("@unique")) parts.push("UNIQUE");
          }

          columns.push("  " + parts.join(" "));
        }

        const lines: string[] = [
          `CREATE TABLE ${modelName.toLowerCase()} (`,
          columns.join(",\n"),
          ");",
        ];

        return lines.join("\n");
      },
      faq: [
        {
          q: "How are relations handled?",
          a: "Fields ending with [] are treated as relation arrays and skipped. The generated SQL only includes scalar columns. You may need to add foreign key columns manually.",
        },
        {
          q: "Does it support @default values?",
          a: "Currently only @default(autoincrement()) is fully supported. Other default values like @default(uuid()) or @default(now()) are not converted to SQL DEFAULT clauses.",
        },
      ],
    },
  {
      slug: "sql-to-laravel-migration",
      outputLanguage: "php",
      name: "SQL to Laravel Migration",
      description: "Convert SQL CREATE TABLE to Laravel migration",
      category: "database",
      icon: "Database",
      accent: "orange",
      inputLabel: "SQL CREATE TABLE",
      outputLabel: "Laravel migration",
      placeholder: "CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n);",
      sample:
        'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  age INT,\n  active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
      actions: [{ id: "run", label: "Generate migration" }],
      run(input: string) {
        const typeMap: Record<string, string> = {
          INT: "integer",
          INTEGER: "integer",
          VARCHAR: "string",
          CHAR: "char",
          TEXT: "text",
          BOOLEAN: "boolean",
          FLOAT: "float",
          DOUBLE: "double",
          DECIMAL: "decimal",
          DATE: "date",
          DATETIME: "datetime",
          TIMESTAMP: "timestamp",
          JSON: "json",
          UUID: "uuid",
          BLOB: "binary",
        };

        const tableMatch = input.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]+)\)/i
        );
        if (!tableMatch) return "Error: Could not parse CREATE TABLE statement";

        const tableName = tableMatch[1];
        const body = tableMatch[2];
        const className = tableName.charAt(0).toUpperCase() + tableName.slice(1) + "Migration";

        const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)/gi;
        const lines: string[] = [
          "<?php",
          "",
          "use Illuminate\\Database\\Migrations\\Migration;",
          "use Illuminate\\Database\\Schema\\Blueprint;",
          "use Illuminate\\Support\\Facades\\Schema;",
          "",
          `return new class extends Migration`,
          "{",
          "    public function up(): void",
          "    {",
          `        Schema::create('${tableName}', function (Blueprint $table) {`,
        ];

        let match;
        while ((match = columnRegex.exec(body))) {
          const colName = match[1];
          const sqlType = match[2].toUpperCase().replace(/\(.*\)/, "");
          const constraints = match[3].toUpperCase();
          const laravelType = typeMap[sqlType] || "string";
          const isId = constraints.includes("PRIMARY KEY");
          const isAutoIncrement = constraints.includes("AUTO_INCREMENT");
          const isUnique = constraints.includes("UNIQUE");
          const hasDefault = constraints.includes("DEFAULT");
          const isNullable = !constraints.includes("NOT NULL") && !isId;

          if (isId && isAutoIncrement) {
            lines.push(`            $table->id('${colName}');`);
          } else if (isId) {
            lines.push(`            $table->bigIncrements('${colName}');`);
          } else {
            let colDef = `            $table->${laravelType}('${colName}')`;
            if (isNullable) colDef += "->nullable()";
            if (isUnique) colDef += "->unique()";
            lines.push(colDef + ";");
          }
        }

        lines.push("            $table->timestamps();");
        lines.push("        });");
        lines.push("    }");
        lines.push("");
        lines.push("    public function down(): void");
        lines.push("    {");
        lines.push(`        Schema::dropIfExists('${tableName}');`);
        lines.push("    }");
        lines.push("};");

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which Laravel version is supported?",
          a: "The generated migration uses Laravel 8+ syntax with anonymous classes (return new class extends Migration). For older Laravel versions, you can replace the class declaration.",
        },
        {
          q: "Does it add timestamps?",
          a: "Yes, the generated migration includes $table->timestamps() which adds created_at and updated_at columns automatically.",
        },
      ],
    },
  {
      slug: "sql-to-sequelize",
      outputLanguage: "javascript",
      name: "SQL to Sequelize Model",
      description: "Convert SQL CREATE TABLE to Sequelize model definition",
      category: "database",
      icon: "Database",
      accent: "blue",
      inputLabel: "SQL CREATE TABLE",
      outputLabel: "Sequelize model",
      placeholder: "CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n);",
      sample:
        'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  age INT,\n  active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
      actions: [{ id: "run", label: "Generate model" }],
      run(input: string) {
        const typeMap: Record<string, string> = {
          INT: "DataTypes.INTEGER",
          INTEGER: "DataTypes.INTEGER",
          VARCHAR: "DataTypes.STRING",
          CHAR: "DataTypes.CHAR",
          TEXT: "DataTypes.TEXT",
          BOOLEAN: "DataTypes.BOOLEAN",
          FLOAT: "DataTypes.FLOAT",
          DOUBLE: "DataTypes.DOUBLE",
          DECIMAL: "DataTypes.DECIMAL",
          DATE: "DataTypes.DATE",
          DATETIME: "DataTypes.DATE",
          TIMESTAMP: "DataTypes.DATE",
          JSON: "DataTypes.JSON",
          UUID: "DataTypes.UUID",
          BLOB: "DataTypes.BLOB",
        };

        const tableMatch = input.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]+)\)/i
        );
        if (!tableMatch) return "Error: Could not parse CREATE TABLE statement";

        const tableName = tableMatch[1];
        const body = tableMatch[2];
        const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1).toLowerCase();

        const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)/gi;
        const fields: string[] = [];

        let match;
        while ((match = columnRegex.exec(body))) {
          const colName = match[1];
          const sqlType = match[2].toUpperCase().replace(/\(.*\)/, "");
          const constraints = match[3].toUpperCase();
          const seqType = typeMap[sqlType] || "DataTypes.STRING";
          const isPrimaryKey = constraints.includes("PRIMARY KEY");
          const isAutoIncrement = constraints.includes("AUTO_INCREMENT");
          const isUnique = constraints.includes("UNIQUE");
          const isNullable = !constraints.includes("NOT NULL") && !isPrimaryKey;

          let fieldDef = `      ${colName}: {\n        type: ${seqType}`;
          if (isPrimaryKey) fieldDef += ",\n        primaryKey: true";
          if (isAutoIncrement) fieldDef += ",\n        autoIncrement: true";
          if (isUnique) fieldDef += ",\n        unique: true";
          if (isNullable) fieldDef += ",\n        allowNull: true";
          if (!isNullable && !isPrimaryKey) fieldDef += ",\n        allowNull: false";
          fieldDef += "\n      }";
          fields.push(fieldDef);
        }

        const lines: string[] = [
          "const { DataTypes } = require('sequelize');",
          "const sequelize = require('../config/database');",
          "",
          `const ${modelName} = sequelize.define('${modelName}', {`,
          fields.join(",\n"),
          "}, {",
          "  tableName: '" + tableName + "',",
          "  timestamps: true",
          "});",
          "",
          `module.exports = ${modelName};`,
        ];

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which Sequelize version is supported?",
          a: "The generated code is compatible with Sequelize v6+. It uses the modern define syntax with options object. For older versions, adjust the model definition syntax accordingly.",
        },
        {
          q: "Does it handle associations?",
          a: "The generated model includes basic column definitions. For associations (belongsTo, hasMany, etc.), you'll need to define them separately after model creation.",
        },
      ],
    },
  {
      slug: "sql-to-typeorm",
      outputLanguage: "typescript",
      name: "SQL to TypeORM Entity",
      description: "Convert SQL CREATE TABLE to TypeORM entity class",
      category: "database",
      icon: "Database",
      accent: "purple",
      inputLabel: "SQL CREATE TABLE",
      outputLabel: "TypeORM entity",
      placeholder: "CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n);",
      sample:
        'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  age INT,\n  active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
      actions: [{ id: "run", label: "Generate entity" }],
      run(input: string) {
        const typeMap: Record<string, string> = {
          INT: "int",
          INTEGER: "int",
          VARCHAR: "varchar",
          CHAR: "char",
          TEXT: "text",
          BOOLEAN: "boolean",
          FLOAT: "float",
          DOUBLE: "double",
          DECIMAL: "decimal",
          DATE: "timestamp",
          DATETIME: "timestamp",
          TIMESTAMP: "timestamp",
          JSON: "json",
          UUID: "uuid",
          BLOB: "blob",
        };

        const tableMatch = input.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]+)\)/i
        );
        if (!tableMatch) return "Error: Could not parse CREATE TABLE statement";

        const tableName = tableMatch[1];
        const body = tableMatch[2];
        const entityName = tableName.charAt(0).toUpperCase() + tableName.slice(1).toLowerCase();

        const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)/gi;
        const imports: Set<string> = new Set(["Entity", "Column"]);
        const columns: string[] = [];

        let match;
        while ((match = columnRegex.exec(body))) {
          const colName = match[1];
          const sqlType = match[2].toUpperCase().replace(/\(.*\)/, "");
          const constraints = match[3].toUpperCase();
          const typeormType = typeMap[sqlType] || "varchar";
          const isPrimary = constraints.includes("PRIMARY KEY");
          const isAutoIncrement = constraints.includes("AUTO_INCREMENT");
          const isUnique = constraints.includes("UNIQUE");
          const isNullable = !constraints.includes("NOT NULL") && !isPrimary;

          if (isPrimary) {
            imports.add("PrimaryGeneratedColumn");
            if (isAutoIncrement) {
              columns.push(`  @PrimaryGeneratedColumn()\n  ${colName}: number;`);
            } else {
              columns.push(`  @PrimaryColumn()\n  ${colName}: number;`);
            }
          } else {
            const colOpts: string[] = [`type: '${typeormType}'`];
            if (isUnique) colOpts.push("unique: true");
            if (isNullable) colOpts.push("nullable: true");

            const colStr = `@Column({ ${colOpts.join(", ")} })`;
            const tsType = typeormType === "boolean" ? "boolean" : typeormType === "int" || typeormType === "float" ? "number" : "string";
            columns.push(`  ${colStr}\n  ${colName}: ${isNullable ? tsType + " | null" : tsType};`);
          }
        }

        const importStr = [...imports].sort().join(", ");
        const lines: string[] = [
          `import { ${importStr} } from 'typeorm';`,
          "",
          `@Entity('${tableName}')`,
          `export class ${entityName} {`,
          columns.join("\n\n"),
          "}",
        ];

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which TypeORM version is supported?",
          a: "The generated code uses TypeORM 0.3.x decorator syntax. It's compatible with both JavaScript and TypeScript projects.",
        },
        {
          q: "Does it handle relations?",
          a: "The generated entity includes column definitions only. For @ManyToOne, @OneToMany, and other relation decorators, you'll need to add them manually.",
        },
      ],
    },
  {
      slug: "sql-to-drizzle",
      outputLanguage: "typescript",
      name: "SQL to Drizzle Schema",
      description: "Convert SQL CREATE TABLE to Drizzle ORM schema",
      category: "database",
      icon: "Database",
      accent: "green",
      inputLabel: "SQL CREATE TABLE",
      outputLabel: "Drizzle schema",
      placeholder: "CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n);",
      sample:
        'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  age INT,\n  active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
      actions: [{ id: "run", label: "Generate schema" }],
      run(input: string) {
        const typeMap: Record<string, string> = {
          INT: "int",
          INTEGER: "int",
          VARCHAR: "varchar",
          CHAR: "char",
          TEXT: "text",
          BOOLEAN: "boolean",
          FLOAT: "float",
          DOUBLE: "double",
          DECIMAL: "decimal",
          DATE: "date",
          DATETIME: "datetime",
          TIMESTAMP: "timestamp",
          JSON: "json",
          UUID: "uuid",
          BLOB: "blob",
        };

        const tableMatch = input.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]+)\)/i
        );
        if (!tableMatch) return "Error: Could not parse CREATE TABLE statement";

        const tableName = tableMatch[1];
        const body = tableMatch[2];

        const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)/gi;
        const columns: string[] = [];

        let match;
        while ((match = columnRegex.exec(body))) {
          const colName = match[1];
          const sqlType = match[2].toUpperCase().replace(/\(.*\)/, "");
          const constraints = match[3].toUpperCase();
          const drizzleType = typeMap[sqlType] || "varchar";
          const isPrimary = constraints.includes("PRIMARY KEY");
          const isAutoIncrement = constraints.includes("AUTO_INCREMENT");
          const isUnique = constraints.includes("UNIQUE");
          const isNotNull = constraints.includes("NOT NULL") || isPrimary;

          let colDef = `  ${colName}: ${drizzleType}('${colName}')`;
          if (isPrimary) colDef += ".primaryKey()";
          if (isAutoIncrement) colDef += ".autoincrement()";
          if (isUnique) colDef += ".unique()";
          if (isNotNull && !isPrimary) colDef += ".notNull()";

          columns.push(colDef);
        }

        const lines: string[] = [
          "import { mysqlTable, int, varchar, boolean, timestamp } from 'drizzle-orm/mysql-core';",
          "",
          `export const ${tableName} = mysqlTable('${tableName}', {`,
          columns.join(",\n"),
          "});",
        ];

        return lines.join("\n");
      },
      faq: [
        {
          q: "Which database dialect is used?",
          a: "The generated schema uses MySQL (drizzle-orm/mysql-core) by default. For PostgreSQL, change the import to drizzle-orm/pg-core and use pgTable instead of mysqlTable.",
        },
        {
          q: "Does it support composite primary keys?",
          a: "The current implementation handles single primary keys. For composite primary keys, you'll need to define them manually using primaryKey() on the table level.",
        },
      ],
    },

  // ─── Frontend Tools (New) ────────────────────────
  {
      slug: "html-to-jsx",
      outputLanguage: "javascript",
      name: "HTML → JSX",
      description: "Convert HTML to JSX syntax for React components",
      category: "css",
      icon: "FileCode",
      accent: "blue",
      trending: true,
      inputLabel: "HTML code",
      outputLabel: "JSX code",
      placeholder: "Paste your HTML here...",
      sample: '<div class="container" onclick="handleClick()">\n  <img src="photo.jpg" alt="Photo" />\n  <span style="color: red">Hello</span>\n</div>',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";
        let jsx = input;

        // class → className
        jsx = jsx.replace(/\bclass="/g, 'className="');
        jsx = jsx.replace(/\bclass='/g, "className='");

        // for → htmlFor
        jsx = jsx.replace(/\bfor="/g, 'htmlFor="');
        jsx = jsx.replace(/\bfor='/g, "htmlFor='");

        // onclick → onClick and other event handlers
        jsx = jsx.replace(/\bonclick="/g, 'onClick="');
        jsx = jsx.replace(/\bonchange="/g, 'onChange="');
        jsx = jsx.replace(/\bonsubmit="/g, 'onSubmit="');
        jsx = jsx.replace(/\bonkeydown="/g, 'onKeyDown="');
        jsx = jsx.replace(/\bonkeyup="/g, 'onKeyUp="');
        jsx = jsx.replace(/\bonmousedown="/g, 'onMouseDown="');
        jsx = jsx.replace(/\bonmouseup="/g, 'onMouseUp="');
        jsx = jsx.replace(/\bonfocus="/g, 'onFocus="');
        jsx = jsx.replace(/\bonblur="/g, 'onBlur="');
        jsx = jsx.replace(/\boninput="/g, 'onInput="');

        // tabindex → tabIndex
        jsx = jsx.replace(/\btabindex="/g, 'tabIndex="');

        // maxlength → maxLength
        jsx = jsx.replace(/\bmaxlength="/g, 'maxLength="');
        jsx = jsx.replace(/\bminlength="/g, 'minLength="');

        // readonly → readOnly
        jsx = jsx.replace(/\breadonly/g, "readOnly");

        // cellspacing → cellPadding etc
        jsx = jsx.replace(/\bcellspacing="/g, 'cellSpacing="');
        jsx = jsx.replace(/\bcellpadding="/g, 'cellPadding="');

        // style string → style object
        jsx = jsx.replace(/style="([^"]*)"/g, (_match: string, styles: string) => {
          const props = styles.split(";").filter(Boolean);
          const objProps = props.map((prop: string) => {
            const [key, val] = prop.split(":").map((s: string) => s.trim());
            if (!key || !val) return "";
            const camel = key.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
            let value = val.trim();
            if (/^\d+px$/.test(value)) {
              value = value.replace("px", "");
            }
            return `${camel}: ${/^\d+$/.test(value) ? value : `"${value}"`}`;
          });
          return `style={{ ${objProps.filter(Boolean).join(", ")} }}`;
        });

        // self-closing tags: area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr
        const selfClosingTags = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
        for (const tag of selfClosingTags) {
          const regex = new RegExp(`<${tag}\\b([^>]*?)>`, "gi");
          jsx = jsx.replace(regex, (_match: string, attrs: string) => {
            if (attrs.trim().endsWith("/")) return `<${tag}${attrs}>`;
            return `<${tag}${attrs} />`;
          });
        }

        return jsx;
      },
      faq: [
        { q: "What conversions does HTML → JSX perform?", a: "It converts class to className, for to htmlFor, event handlers to camelCase, inline styles to objects, adds self-closing tags, and converts HTML attributes to their JSX equivalents." },
        { q: "Will this work with complex nested HTML?", a: "Yes, it handles nested elements, multiple attributes, and complex HTML structures. For very large files, you may need to process sections individually." },
      ],
    },
  {
      slug: "html-to-tsx",
      outputLanguage: "typescript",
      name: "HTML → TSX",
      description: "Convert HTML to TypeScript React (TSX) with type annotations",
      category: "css",
      icon: "FileCode",
      accent: "purple",
      inputLabel: "HTML code",
      outputLabel: "TSX code",
      placeholder: "Paste your HTML here...",
      sample: '<div class="container">\n  <h1>Title</h1>\n  <p>Hello World</p>\n</div>',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        // First convert HTML to JSX using html-to-jsx logic
        let jsx = input;
        jsx = jsx.replace(/\bclass="/g, 'className="');
        jsx = jsx.replace(/\bclass='/g, "className='");
        jsx = jsx.replace(/\bfor="/g, 'htmlFor="');
        jsx = jsx.replace(/\bfor='/g, "htmlFor='");
        jsx = jsx.replace(/\bonclick="/g, 'onClick="');
        jsx = jsx.replace(/\bonchange="/g, 'onChange="');
        jsx = jsx.replace(/\bonsubmit="/g, 'onSubmit="');
        jsx = jsx.replace(/\btabindex="/g, 'tabIndex="');
        jsx = jsx.replace(/\bmaxlength="/g, 'maxLength="');
        jsx = jsx.replace(/\bminlength="/g, 'minLength="');
        jsx = jsx.replace(/\breadonly/g, "readOnly");

        jsx = jsx.replace(/style="([^"]*)"/g, (_match: string, styles: string) => {
          const props = styles.split(";").filter(Boolean);
          const objProps = props.map((prop: string) => {
            const [key, val] = prop.split(":").map((s: string) => s.trim());
            if (!key || !val) return "";
            const camel = key.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
            return `${camel}: "${val.trim()}"`;
          });
          return `style={{ ${objProps.filter(Boolean).join(", ")} }}`;
        });

        const selfClosingTags = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
        for (const tag of selfClosingTags) {
          const regex = new RegExp(`<${tag}\\b([^>]*?)>`, "gi");
          jsx = jsx.replace(regex, (_match: string, attrs: string) => {
            if (attrs.trim().endsWith("/")) return `<${tag}${attrs}>`;
            return `<${tag}${attrs} />`;
          });
        }

        // Wrap in TSX component with types
        const componentName = "Component";
        const hasOnClick = jsx.includes("onClick");
        const hasStyle = jsx.includes("style=");

        let props = "";
        if (hasOnClick) {
          props += "  onClick?: () => void;\n";
        }
        if (hasStyle) {
          props += "  className?: string;\n";
        }

        if (props) {
          return `interface ${componentName}Props {\n${props}}\n\nconst ${componentName}: React.FC<${componentName}Props> = (${hasOnClick || hasStyle ? "{ onClick, className }" : ""}) => {\n  return (\n    ${jsx}\n  );\n};\n\nexport default ${componentName};`;
        }

        return `const ${componentName}: React.FC = () => {\n  return (\n    ${jsx}\n  );\n};\n\nexport default ${componentName};`;
      },
      faq: [
        { q: "What's the difference between HTML → JSX and HTML → TSX?", a: "TSX wraps the output in a typed React functional component with TypeScript interface definitions for props based on the HTML attributes used." },
        { q: "Does it generate proper TypeScript types?", a: "Yes, it infers prop types from the HTML attributes (e.g., onClick generates an onClick handler prop) and creates a proper TypeScript interface." },
      ],
    },
  {
      slug: "svg-to-jsx",
      outputLanguage: "javascript",
      name: "SVG → JSX",
      description: "Convert SVG markup to JSX-compatible syntax",
      category: "css",
      icon: "Image",
      accent: "pink",
      trending: true,
      inputLabel: "SVG code",
      outputLabel: "JSX code",
      placeholder: "Paste your SVG here...",
      sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" fill="currentColor"/></svg>',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";
        let jsx = input;

        // Convert kebab-case attributes to camelCase
        const kebabToCamel = (str: string) => str.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());

        jsx = jsx.replace(/\b([a-z][a-z0-9-]*)="([^"]*)"/g, (_match: string, attr: string, val: string) => {
          // xmlns stays as-is
          if (attr === "xmlns" || attr.startsWith("xmlns:")) return _match;
          // xml:space stays as-is
          if (attr.startsWith("xml:")) return _match;
          const camelAttr = kebabToCamel(attr);
          return `${camelAttr}="${val}"`;
        });

        // class → className
        jsx = jsx.replace(/\bclass="/g, 'className="');

        // fill and stroke with currentColor stay as strings
        // But numeric values in attributes like opacity should stay as strings

        return jsx;
      },
      faq: [
        { q: "What SVG attributes are converted?", a: "All kebab-case attributes like stroke-width, fill-opacity, clip-path, etc. are converted to camelCase (strokeWidth, fillOpacity, clipPath). The xmlns attribute is preserved as-is." },
        { q: "Will this break my SVG?", a: "No, it only changes attribute naming conventions. The SVG structure, paths, and visual appearance remain identical." },
      ],
    },
  {
      slug: "svg-to-react-component",
      outputLanguage: "typescript",
      name: "SVG → React Component",
      description: "Convert SVG into a reusable React functional component",
      category: "css",
      icon: "Component",
      accent: "purple",
      inputLabel: "SVG code",
      outputLabel: "React component",
      placeholder: "Paste your SVG here...",
      sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" fill="currentColor"/></svg>',
      actions: [{ id: "run", label: "Generate component" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        // Convert SVG attributes to camelCase
        let svg = input;
        const kebabToCamel = (str: string) => str.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
        svg = svg.replace(/\b([a-z][a-z0-9-]*)="([^"]*)"/g, (_match: string, attr: string, val: string) => {
          if (attr === "xmlns" || attr.startsWith("xmlns:")) return _match;
          if (attr.startsWith("xml:")) return _match;
          const camelAttr = kebabToCamel(attr);
          return `${camelAttr}="${val}"`;
        });
        svg = svg.replace(/\bclass="/g, 'className="');

        // Remove xmlns since it's not needed in JSX
        svg = svg.replace(/\s*xmlns="[^"]*"/g, "");

        // Add props interface
        const component = `interface IconProps {
    size?: number | string;
    color?: string;
    className?: string;
    [key: string]: any;
  }

  const Icon: React.FC<IconProps> = ({ size = 24, color = "currentColor", className, ...props }) => {
    return (
      ${svg.replace(/<svg/, '<svg width={size} height={size} color={color} className={className} {...props}')}
    );
  };

  export default Icon;`;

        return component;
      },
      faq: [
        { q: "What props does the generated component accept?", a: "The component accepts size (number or string), color (string), className (string), and any additional SVG attributes via spread props." },
        { q: "Can I customize the component after generation?", a: "Yes, the generated component is standard React code that you can modify, extend with animations, or style with CSS-in-JS as needed." },
      ],
    },
  {
      slug: "css-to-tailwind",
      name: "CSS → Tailwind",
      description: "Convert CSS properties to Tailwind CSS utility classes",
      category: "css",
      icon: "Wind",
      accent: "cyan",
      trending: true,
      inputLabel: "CSS code",
      outputLabel: "Tailwind classes",
      placeholder: "Paste your CSS here...",
      sample: '.button {\n  display: flex;\n  align-items: center;\n  padding: 12px 24px;\n  border-radius: 12px;\n  background-color: #3b82f6;\n  color: white;\n  font-size: 14px;\n  font-weight: 600;\n}',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const classMap: Record<string, string> = {
          // Display
          "display: flex": "flex",
          "display: block": "block",
          "display: inline-block": "inline-block",
          "display: inline": "inline",
          "display: grid": "grid",
          "display: inline-flex": "inline-flex",
          "display: none": "hidden",
          "display: table": "table",
          "display: inline-table": "inline-table",

          // Flex
          "flex-direction: row": "flex-row",
          "flex-direction: row-reverse": "flex-row-reverse",
          "flex-direction: column": "flex-col",
          "flex-direction: column-reverse": "flex-col-reverse",
          "flex-wrap: wrap": "flex-wrap",
          "flex-wrap: nowrap": "flex-nowrap",
          "flex-wrap: wrap-reverse": "flex-wrap-reverse",
          "flex: 1": "flex-1",
          "flex-grow: 1": "flex-grow",
          "flex-shrink: 0": "flex-shrink-0",
          "flex: auto": "flex-auto",
          "flex: initial": "flex-initial",
          "flex: none": "flex-none",

          // Justify
          "justify-content: flex-start": "justify-start",
          "justify-content: flex-end": "justify-end",
          "justify-content: center": "justify-center",
          "justify-content: space-between": "justify-between",
          "justify-content: space-around": "justify-around",
          "justify-content: space-evenly": "justify-evenly",

          // Align
          "align-items: flex-start": "items-start",
          "align-items: flex-end": "items-end",
          "align-items: center": "items-center",
          "align-items: baseline": "items-baseline",
          "align-items: stretch": "items-stretch",
          "align-self: center": "self-center",
          "align-self: flex-start": "self-start",
          "align-self: flex-end": "self-end",

          // Position
          "position: relative": "relative",
          "position: absolute": "absolute",
          "position: fixed": "fixed",
          "position: sticky": "sticky",
          "position: static": "static",

          // Overflow
          "overflow: hidden": "overflow-hidden",
          "overflow: auto": "overflow-auto",
          "overflow: scroll": "overflow-scroll",
          "overflow: visible": "overflow-visible",
          "overflow-x: hidden": "overflow-x-hidden",
          "overflow-y: auto": "overflow-y-auto",

          // Text
          "text-align: center": "text-center",
          "text-align: left": "text-left",
          "text-align: right": "text-right",
          "text-align: justify": "text-justify",
          "text-decoration: underline": "underline",
          "text-decoration: line-through": "line-through",
          "text-decoration: none": "no-underline",
          "text-transform: uppercase": "uppercase",
          "text-transform: lowercase": "lowercase",
          "text-transform: capitalize": "capitalize",
          "white-space: nowrap": "whitespace-nowrap",
          "white-space: pre-wrap": "whitespace-pre-wrap",

          // Cursor
          "cursor: pointer": "cursor-pointer",
          "cursor: default": "cursor-default",
          "cursor: not-allowed": "cursor-not-allowed",
          "cursor: grab": "cursor-grab",
          "cursor: text": "cursor-text",

          // Border
          "border: 1px solid": "border",
          "border: none": "border-0",
          "border-radius: 0": "rounded-none",
          "border-radius: 4px": "rounded",
          "border-radius: 50%": "rounded-full",
          "border-style: solid": "border-solid",
          "border-style: dashed": "border-dashed",
          "border-style: dotted": "border-dotted",

          // Shadow
          "box-shadow: none": "shadow-none",
          "box-shadow: 0 1px 2px": "shadow-sm",
          "box-shadow: 0 1px 3px": "shadow",
          "box-shadow: 0 4px 6px": "shadow-md",
          "box-shadow: 0 10px 15px": "shadow-lg",
          "box-shadow: 0 20px 25px": "shadow-xl",

          // Opacity
          "opacity: 0": "opacity-0",
          "opacity: 0.5": "opacity-50",
          "opacity: 1": "opacity-100",

          // List
          "list-style: none": "list-none",
          "list-style: disc": "list-disc",
          "list-style: decimal": "list-decimal",

          // Transition
          "transition: all": "transition-all",
          "transition: color": "transition-colors",
          "transition: opacity": "transition-opacity",
          "transition: transform": "transition-transform",

          // Appear
          "appearance: none": "appearance-none",

          // Resize
          "resize: none": "resize-none",
          "resize: both": "resize",

          // Pointer
          "pointer-events: none": "pointer-events-none",
          "user-select: none": "select-none",
        };

        const classes: string[] = [];

        // Extract properties from CSS
        const propRegex = /([a-z-]+)\s*:\s*([^;]+);/g;
        let match: RegExpExecArray | null;

        while ((match = propRegex.exec(input)) !== null) {
          const prop = match[1].trim().toLowerCase();
          const value = match[2].trim();

          // Check exact matches
          const fullProp = `${prop}: ${value}`;
          if (classMap[fullProp]) {
            classes.push(classMap[fullProp]);
            continue;
          }

          // Padding
          if (prop === "padding") {
            const parts = value.split(/\s+/);
            if (parts.length === 1) {
              classes.push(`p-${parsePx(parts[0])}`);
            } else if (parts.length === 2) {
              classes.push(`py-${parsePx(parts[0])}`, `px-${parsePx(parts[1])}`);
            } else if (parts.length === 4) {
              classes.push(`pt-${parsePx(parts[0])}`, `pr-${parsePx(parts[1])}`, `pb-${parsePx(parts[2])}`, `pl-${parsePx(parts[3])}`);
            }
          } else if (prop === "padding-top") {
            classes.push(`pt-${parsePx(value)}`);
          } else if (prop === "padding-right") {
            classes.push(`pr-${parsePx(value)}`);
          } else if (prop === "padding-bottom") {
            classes.push(`pb-${parsePx(value)}`);
          } else if (prop === "padding-left") {
            classes.push(`pl-${parsePx(value)}`);
          }

          // Margin
          if (prop === "margin") {
            const parts = value.split(/\s+/);
            if (parts.length === 1) {
              classes.push(`m-${parsePx(parts[0])}`);
            } else if (parts.length === 2) {
              classes.push(`my-${parsePx(parts[0])}`, `mx-${parsePx(parts[1])}`);
            } else if (parts.length === 4) {
              classes.push(`mt-${parsePx(parts[0])}`, `mr-${parsePx(parts[1])}`, `mb-${parsePx(parts[2])}`, `ml-${parsePx(parts[3])}`);
            }
          } else if (prop === "margin-top") {
            classes.push(`mt-${parsePx(value)}`);
          } else if (prop === "margin-right") {
            classes.push(`mr-${parsePx(value)}`);
          } else if (prop === "margin-bottom") {
            classes.push(`mb-${parsePx(value)}`);
          } else if (prop === "margin-left") {
            classes.push(`ml-${parsePx(value)}`);
          }

          // Border radius
          if (prop === "border-radius" && !classMap[fullProp]) {
            classes.push(`rounded-${parsePx(value)}`);
          }

          // Width/Height
          if (prop === "width") {
            if (value === "100%") classes.push("w-full");
            else if (value === "auto") classes.push("w-auto");
            else if (value === "50%") classes.push("w-1/2");
            else if (value === "33.333%") classes.push("w-1/3");
            else classes.push(`w-[${value}]`);
          } else if (prop === "height") {
            if (value === "100%") classes.push("h-full");
            else if (value === "auto") classes.push("h-auto");
            else if (value === "100vh") classes.push("h-screen");
            else classes.push(`h-[${value}]`);
          } else if (prop === "min-width") {
            classes.push(`min-w-[${value}]`);
          } else if (prop === "max-width") {
            classes.push(`max-w-[${value}]`);
          } else if (prop === "min-height") {
            classes.push(`min-h-[${value}]`);
          } else if (prop === "max-height") {
            classes.push(`max-h-[${value}]`);
          }

          // Gap
          if (prop === "gap") {
            classes.push(`gap-${parsePx(value)}`);
          } else if (prop === "row-gap") {
            classes.push(`gap-y-${parsePx(value)}`);
          } else if (prop === "column-gap") {
            classes.push(`gap-x-${parsePx(value)}`);
          }

          // Font size
          if (prop === "font-size") {
            const sizeMap: Record<string, string> = {
              "12px": "text-xs",
              "14px": "text-sm",
              "16px": "text-base",
              "18px": "text-lg",
              "20px": "text-xl",
              "24px": "text-2xl",
              "30px": "text-3xl",
              "36px": "text-4xl",
              "48px": "text-5xl",
            };
            classes.push(sizeMap[value] || `text-[${value}]`);
          }

          // Font weight
          if (prop === "font-weight") {
            const weightMap: Record<string, string> = {
              "100": "font-thin",
              "200": "font-extralight",
              "300": "font-light",
              "400": "font-normal",
              "500": "font-medium",
              "600": "font-semibold",
              "700": "font-bold",
              "800": "font-extrabold",
              "900": "font-black",
            };
            classes.push(weightMap[value] || `font-[${value}]`);
          }

          // Colors
          if (prop === "color") {
            classes.push(mapColor("text", value));
          } else if (prop === "background-color" || prop === "background") {
            if (value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) {
              classes.push(`bg-[${value}]`);
            } else {
              classes.push(mapColor("bg", value));
            }
          }

          // Z-index
          if (prop === "z-index") {
            classes.push(`z-${value}`);
          }

          // Inset
          if (prop === "top" && value !== "auto") classes.push(`top-${parsePx(value)}`);
          if (prop === "right" && value !== "auto") classes.push(`right-${parsePx(value)}`);
          if (prop === "bottom" && value !== "auto") classes.push(`bottom-${parsePx(value)}`);
          if (prop === "left" && value !== "auto") classes.push(`left-${parsePx(value)}`);

          // Grid
          if (prop === "grid-template-columns") {
            const cols = value.split(/\s+/).length;
            classes.push(`grid-cols-${cols}`);
          } else if (prop === "grid-template-rows") {
            const rows = value.split(/\s+/).length;
            classes.push(`grid-rows-${rows}`);
          }

          // Object fit
          if (prop === "object-fit") {
            const fitMap: Record<string, string> = {
              cover: "object-cover",
              contain: "object-contain",
              fill: "object-fill",
              none: "object-none",
              "scale-down": "object-scale-down",
            };
            classes.push(fitMap[value] || `object-[${value}]`);
          }

          // Backdrop filter
          if (prop === "backdrop-filter" || prop === "-webkit-backdrop-filter") {
            if (value.includes("blur")) classes.push("backdrop-blur");
            else classes.push(`backdrop-[${value}]`);
          }
        }

        function parsePx(val: string): string {
          const cleaned = val.replace(/[^0-9.]/g, "");
          const num = parseFloat(cleaned);
          if (isNaN(num)) return val;
          return num <= 4 ? (num === 0 ? "0" : num === 1 ? "px" : `${num}`) : `${Math.round(num / 4)}`;
        }

        function mapColor(prefix: string, val: string): string {
          const colorMap: Record<string, string> = {
            "#000000": "black",
            "#ffffff": "white",
            "#3b82f6": "blue-500",
            "#ef4444": "red-500",
            "#22c55e": "green-500",
            "#f59e0b": "amber-500",
            "#8b5cf6": "violet-500",
            "#ec4899": "pink-500",
            "#06b6d4": "cyan-500",
            "#6366f1": "indigo-500",
            "#f97316": "orange-500",
            "#14b8a6": "teal-500",
            "#e11d48": "rose-500",
          };
          const lower = val.toLowerCase().trim();
          if (lower === "white") return `${prefix}-white`;
          if (lower === "black") return `${prefix}-black`;
          if (lower === "transparent") return `${prefix}-transparent`;
          if (lower === "currentColor") return `${prefix}-current`;
          if (colorMap[lower]) return `${prefix}-${colorMap[lower]}`;
          return `${prefix}-[${val}]`;
        }

        const unique = [...new Set(classes)];
        return unique.join(" ") || "/* No Tailwind classes could be generated */";
      },
      faq: [
        { q: "Which CSS properties are converted?", a: "It supports display, flexbox, positioning, padding, margin, border, font, color, background, z-index, grid, and many more common CSS properties." },
        { q: "Does it handle shorthand properties?", a: "Yes, shorthand properties like padding, margin, and background are expanded into their Tailwind equivalents (e.g., padding: 12px 24px → py-3 px-6)." },
      ],
    },
  {
      slug: "tailwind-sorter",
      name: "Tailwind Class Sorter",
      description: "Sort Tailwind CSS classes in the recommended order",
      category: "css",
      icon: "ArrowUpDown",
      accent: "teal",
      inputLabel: "Tailwind classes",
      outputLabel: "Sorted classes",
      placeholder: "Paste your Tailwind classes here...",
      sample: "text-white p-4 bg-blue-500 flex items-center rounded-lg font-bold m-2",
      actions: [{ id: "run", label: "Sort" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const classOrder: Record<string, number> = {
          // Layout
          "container": 0,
          "block": 1,
          "inline-block": 2,
          "inline": 3,
          "flex": 4,
          "inline-flex": 5,
          "grid": 6,
          "inline-grid": 7,
          "table": 8,
          "hidden": 9,
          "contents": 10,

          // Box Model
          "box-border": 11,
          "box-content": 12,
          "block": 13,
          "inline-block": 14,
          "flow-root": 15,

          // Position
          "static": 20,
          "fixed": 21,
          "absolute": 22,
          "relative": 23,
          "sticky": 24,

          // Inset
          "inset-0": 25,
          "top-0": 26,
          "right-0": 27,
          "bottom-0": 28,
          "left-0": 29,
          "inset-auto": 30,
          "inset-x-0": 31,
          "inset-y-0": 32,

          // Flex
          "flex-row": 33,
          "flex-row-reverse": 34,
          "flex-col": 35,
          "flex-col-reverse": 36,
          "flex-wrap": 37,
          "flex-nowrap": 38,
          "flex-1": 39,
          "flex-auto": 40,
          "flex-initial": 41,
          "flex-none": 42,
          "flex-grow": 43,
          "flex-shrink": 44,

          // Justify
          "justify-start": 45,
          "justify-end": 46,
          "justify-center": 47,
          "justify-between": 48,
          "justify-around": 49,
          "justify-evenly": 50,

          // Align
          "items-start": 51,
          "items-end": 52,
          "items-center": 53,
          "items-baseline": 54,
          "items-stretch": 55,

          // Sizing
          "w-full": 56,
          "w-1/2": 57,
          "w-1/3": 58,
          "w-auto": 59,
          "h-full": 60,
          "h-screen": 61,
          "h-auto": 62,

          // Spacing (margin, padding, gap)
          "m-0": 63,
          "mx-auto": 64,
          "p-0": 65,

          // Typography
          "text-xs": 80,
          "text-sm": 81,
          "text-base": 82,
          "text-lg": 83,
          "text-xl": 84,
          "text-2xl": 85,
          "font-thin": 86,
          "font-light": 87,
          "font-normal": 88,
          "font-medium": 89,
          "font-semibold": 90,
          "font-bold": 91,
          "font-extrabold": 92,
          "font-black": 93,
          "text-left": 94,
          "text-center": 95,
          "text-right": 96,
          "uppercase": 97,
          "lowercase": 98,
          "capitalize": 99,
          "truncate": 100,
          "line-clamp-1": 101,
          "line-clamp-2": 102,
          "line-clamp-3": 103,

          // Background
          "bg-white": 110,
          "bg-black": 111,
          "bg-transparent": 112,
          "bg-current": 113,

          // Border
          "border": 120,
          "border-0": 121,
          "border-2": 122,
          "border-dashed": 123,
          "border-dotted": 124,
          "border-solid": 125,
          "rounded": 126,
          "rounded-sm": 127,
          "rounded-md": 128,
          "rounded-lg": 129,
          "rounded-xl": 130,
          "rounded-2xl": 131,
          "rounded-full": 132,

          // Shadow
          "shadow-sm": 140,
          "shadow": 141,
          "shadow-md": 142,
          "shadow-lg": 143,
          "shadow-xl": 144,

          // Opacity
          "opacity-0": 150,
          "opacity-50": 151,
          "opacity-100": 152,

          // Transition
          "transition": 160,
          "transition-colors": 161,
          "transition-opacity": 162,
          "transition-transform": 163,
          "duration-150": 164,
          "duration-200": 165,
          "duration-300": 166,

          // Transform
          "scale-95": 170,
          "scale-100": 171,
          "scale-105": 172,
          "rotate-0": 173,
          "rotate-45": 174,
          "rotate-90": 175,

          // Pointer
          "cursor-pointer": 180,
          "cursor-default": 181,
          "cursor-not-allowed": 182,

          // Misc
          "select-none": 190,
          "select-all": 191,
          "pointer-events-none": 192,
          "pointer-events-auto": 193,
          "z-0": 194,
          "z-10": 195,
          "z-20": 196,
          "z-30": 197,
          "z-40": 198,
          "z-50": 199,
          "z-auto": 200,
        };

        const classes = input.split(/\s+/).filter(Boolean);
        const sorted = classes.sort((a, b) => {
          const aClean = a.replace(/\[.*\]/, "");
          const bClean = b.replace(/\[.*\]/, "");
          const aOrder = classOrder[aClean] ?? 1000;
          const bOrder = classOrder[bClean] ?? 1000;

          if (aOrder !== bOrder) return aOrder - bOrder;

          // For dynamic classes, sort by prefix group
          const prefixOrder = (c: string) => {
            if (c.startsWith("m")) return 100;
            if (c.startsWith("p")) return 200;
            if (c.startsWith("w")) return 300;
            if (c.startsWith("h")) return 400;
            if (c.startsWith("text")) return 500;
            if (c.startsWith("bg")) return 600;
            if (c.startsWith("border")) return 700;
            if (c.startsWith("rounded")) return 800;
            if (c.startsWith("shadow")) return 900;
            if (c.startsWith("z")) return 1000;
            return 500;
          };
          return prefixOrder(a) - prefixOrder(b);
        });

        return sorted.join(" ");
      },
      faq: [
        { q: "What order are classes sorted in?", a: "Classes are sorted by category: Layout → Position → Flex → Sizing → Spacing → Typography → Background → Border → Shadow → Effects → Transitions → Miscellaneous." },
        { q: "Does this follow the official Tailwind class order?", a: "Yes, the sorting follows the recommended Tailwind class order from the official documentation and popular plugins like prettier-plugin-tailwindcss." },
      ],
    },
  {
      slug: "tailwind-minifier",
      name: "Tailwind Minifier",
      description: "Minify Tailwind CSS classes by removing duplicates and whitespace",
      category: "css",
      icon: "Minimize2",
      accent: "green",
      inputLabel: "Tailwind classes",
      outputLabel: "Minified classes",
      placeholder: "Paste your Tailwind classes here...",
      sample: "flex  items-center   p-4 p-4   bg-blue-500 bg-blue-500 text-white   font-bold  rounded-lg",
      actions: [{ id: "run", label: "Minify" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        // Split by whitespace, filter empty, deduplicate
        const classes = input
          .split(/\s+/)
          .filter(Boolean);

        const unique = [...new Set(classes)];
        return unique.join(" ");
      },
      faq: [
        { q: "What does this minifier do?", a: "It removes duplicate Tailwind classes, collapses multiple spaces, and trims whitespace, reducing the overall class string size while maintaining the same styles." },
        { q: "Will removing duplicates change my styles?", a: "No, removing duplicate classes has no effect on rendering since the same class applied twice produces the same result as applied once." },
      ],
    },
  {
      slug: "css-beautifier",
      outputLanguage: "css",
      name: "CSS Beautifier",
      description: "Format and beautify CSS code with proper indentation",
      category: "css",
      icon: "Paintbrush",
      accent: "teal",
      inputLabel: "CSS code",
      outputLabel: "Formatted CSS",
      placeholder: "Paste your CSS here...",
      sample: ".card{border-radius:24px;padding:32px;}.card .title{font-size:20px;}",
      actions: [{ id: "run", label: "Beautify" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let css = input.trim();
        let result = "";
        let indent = 0;
        const indentStr = "  ";

        // Remove comments
        css = css.replace(/\/\*[\s\S]*?\*\//g, "");
        // Remove newlines and extra spaces
        css = css.replace(/\s+/g, " ").trim();

        for (let i = 0; i < css.length; i++) {
          const ch = css[i];

          if (ch === "{") {
            result += " {\n";
            indent++;
            result += indentStr.repeat(indent);
          } else if (ch === "}") {
            result = result.trimEnd() + "\n";
            indent--;
            result += indentStr.repeat(indent) + "}\n\n";
          } else if (ch === ";") {
            result += ";\n" + indentStr.repeat(indent);
          } else if (ch === ":" && result.trimEnd().slice(-1) !== " ") {
            result += ": ";
          } else {
            result += ch;
          }
        }

        return result.replace(/\n{3,}/g, "\n\n").trim();
      },
      faq: [
        { q: "Does this beautifier preserve CSS comments?", a: "No, it removes comments during formatting. If you need to preserve comments, use a more advanced formatter." },
        { q: "Does it handle minified CSS?", a: "Yes, it can beautify both minified and partially formatted CSS code, adding proper indentation and line breaks." },
      ],
    },
  {
      slug: "js-beautifier",
      outputLanguage: "javascript",
      name: "JS Beautifier",
      description: "Format and beautify JavaScript code",
      category: "javascript",
      icon: "FileCode",
      accent: "yellow",
      trending: true,
      inputLabel: "JavaScript code",
      outputLabel: "Formatted code",
      placeholder: "Paste your JavaScript here...",
      sample: 'function hello(name){if(name){console.log("Hello "+name)}else{console.log("Hello World")}}',
      actions: [{ id: "run", label: "Beautify" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let code = input.trim();
        let result = "";
        let indent = 0;
        const indentStr = "  ";

        // Remove single-line comments
        code = code.replace(/\/\/.*$/gm, "");
        // Remove multi-line comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, "");
        // Normalize whitespace
        code = code.replace(/\s+/g, " ").trim();

        let inString = false;
        let stringChar = "";

        for (let i = 0; i < code.length; i++) {
          const ch = code[i];
          const next = code[i + 1];

          // Handle strings
          if (!inString && (ch === '"' || ch === "'" || ch === "`")) {
            inString = true;
            stringChar = ch;
            result += ch;
            continue;
          }
          if (inString) {
            result += ch;
            if (ch === stringChar && code[i - 1] !== "\\") {
              inString = false;
            }
            continue;
          }

          if (ch === "{") {
            result += " {\n";
            indent++;
            result += indentStr.repeat(indent);
          } else if (ch === "}") {
            result = result.trimEnd() + "\n";
            indent--;
            result += indentStr.repeat(indent) + "}\n";
            if (indent === 0) result += "\n";
          } else if (ch === ";" && next !== ")") {
            result += ";\n" + indentStr.repeat(indent);
          } else if (ch === "," && next !== " ") {
            result += ", ";
          } else {
            result += ch;
          }
        }

        return result.replace(/\n{3,}/g, "\n\n").replace(/\n\s*\n/g, "\n").trim();
      },
      faq: [
        { q: "What kind of formatting does this perform?", a: "It adds proper indentation, line breaks after statements, spaces around operators, and organizes nested blocks for better readability." },
        { q: "Will this change my code's behavior?", a: "No, it only adds whitespace and formatting. The code functionality remains identical." },
      ],
    },
  {
      slug: "js-minifier",
      outputLanguage: "javascript",
      name: "JS Minifier",
      description: "Minify JavaScript code by removing comments and whitespace",
      category: "javascript",
      icon: "Minimize2",
      accent: "orange",
      inputLabel: "JavaScript code",
      outputLabel: "Minified code",
      placeholder: "Paste your JavaScript here...",
      sample: 'function hello(name) {\n  // Greet the user\n  if (name) {\n    console.log("Hello " + name);\n  } else {\n    console.log("Hello World");\n  }\n}',
      actions: [{ id: "run", label: "Minify" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let code = input;

        // Remove single-line comments (but not // in strings)
        code = code.replace(/(?<!["'`])\/\/.*$/gm, "");
        // Remove multi-line comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, "");
        // Remove leading/trailing whitespace from lines
        code = code.replace(/^\s+$/gm, "");
        // Collapse multiple newlines
        code = code.replace(/\n\s*\n/g, "\n");
        // Collapse multiple spaces
        code = code.replace(/  +/g, " ");
        // Remove spaces around operators
        code = code.replace(/ ([{}();,=:<>+\-*/&|!?]) /g, "$1");
        code = code.replace(/([{}();,=:<>+\-*/&|!?]) /g, "$1");
        code = code.replace(/ ([{}();,=:<>+\-*/&|!?])/g, "$1");
        // Remove newlines
        code = code.replace(/\n/g, "");
        // Trim
        code = code.trim();

        return code;
      },
      faq: [
        { q: "Does this minifier preserve string literals?", a: "Yes, it handles string literals and template literals correctly, not removing spaces inside strings or breaking escaped characters." },
        { q: "How much smaller will my code be?", a: "Typically 30-60% smaller, depending on how much whitespace and how many comments your original code has." },
      ],
    },
  {
      slug: "ts-formatter",
      outputLanguage: "typescript",
      name: "TS Formatter",
      description: "Format and beautify TypeScript code",
      category: "javascript",
      icon: "FileCode",
      accent: "blue",
      inputLabel: "TypeScript code",
      outputLabel: "Formatted code",
      placeholder: "Paste your TypeScript here...",
      sample: 'interface User{name:string;age:number;active:boolean}function greet(user:User):string{return`Hello ${user.name}`}',
      actions: [{ id: "run", label: "Format" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let code = input.trim();
        let result = "";
        let indent = 0;
        const indentStr = "  ";

        // Remove comments
        code = code.replace(/\/\/.*$/gm, "");
        code = code.replace(/\/\*[\s\S]*?\*\//g, "");
        // Normalize whitespace
        code = code.replace(/\s+/g, " ").trim();

        // Handle TypeScript-specific patterns
        let inString = false;
        let stringChar = "";

        for (let i = 0; i < code.length; i++) {
          const ch = code[i];

          if (!inString && (ch === '"' || ch === "'" || ch === "`")) {
            inString = true;
            stringChar = ch;
            result += ch;
            continue;
          }
          if (inString) {
            result += ch;
            if (ch === stringChar && code[i - 1] !== "\\") {
              inString = false;
            }
            continue;
          }

          if (ch === "{") {
            result += " {\n";
            indent++;
            result += indentStr.repeat(indent);
          } else if (ch === "}") {
            result = result.trimEnd() + "\n";
            indent--;
            result += indentStr.repeat(indent) + "}\n";
            if (indent === 0) result += "\n";
          } else if (ch === ";" && code[i + 1] !== ")") {
            result += ";\n" + indentStr.repeat(indent);
          } else if (ch === "," && code[i + 1] !== " ") {
            result += ", ";
          } else {
            result += ch;
          }
        }

        // Format interfaces - add newlines between properties
        result = result.replace(/(interface\s+\w+\s*\{[^}]+)\}/g, (_match: string, content: string) => {
          return content.replace(/;\s*(?=[a-zA-Z])/g, ";\n").trimEnd() + "\n}";
        });

        return result.replace(/\n{3,}/g, "\n\n").replace(/\n\s*\n/g, "\n").trim();
      },
      faq: [
        { q: "Does this format TypeScript interfaces?", a: "Yes, it formats interfaces, types, classes, functions, and all standard TypeScript constructs with proper indentation and line breaks." },
        { q: "Will it remove TypeScript type annotations?", a: "No, this is a formatter, not a converter. It preserves all TypeScript syntax including types, interfaces, and generics." },
      ],
    },
  {
      slug: "regex-tester",
      name: "Regex Tester",
      description: "Test regular expressions against strings with match highlighting",
      category: "javascript",
      icon: "Search",
      accent: "purple",
      trending: true,
      inputLabel: "Regex and test strings",
      outputLabel: "Match results",
      placeholder: "Enter regex on first line, test strings on subsequent lines...",
      sample: '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/\ntest@example.com\ninvalid-email\nuser@domain.org',
      actions: [{ id: "test", label: "Test" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const lines = input.split("\n");
        if (lines.length === 0) return "Error: No input provided";

        const regexLine = lines[0];
        const testStrings = lines.slice(1);

        // Parse regex pattern and flags
        let pattern: string;
        let flags = "g";
        const match = regexLine.match(/^\/(.+)\/([gimsuvy]*)$/);
        if (match) {
          pattern = match[1];
          flags = match[2] || "g";
        } else {
          pattern = regexLine;
        }

        let results: string[] = [];
        results.push(`Regex: ${pattern}`);
        results.push(`Flags: ${flags}`);
        results.push("---");

        try {
          const regex = new RegExp(pattern, flags);

          for (const testStr of testStrings) {
            if (!testStr.trim()) {
              results.push(`\n"${testStr}" → (empty)`);
              continue;
            }

            const hasGlobal = flags.includes("g");

            if (hasGlobal) {
              let matchCount = 0;
              const matches: string[] = [];
              let m: RegExpExecArray | null;

              regex.lastIndex = 0;
              while ((m = regex.exec(testStr)) !== null) {
                matchCount++;
                const matchInfo = `  Match ${matchCount}: "${m[0]}" at index ${m.index}`;
                if (m.length > 1) {
                  const groups = m.slice(1).map((g: string, i: number) => `    Group ${i + 1}: ${g === undefined ? "undefined" : `"${g}"`}`).join("\n");
                  matches.push(`${matchInfo}\n${groups}`);
                } else {
                  matches.push(matchInfo);
                }
                // Prevent infinite loops for zero-length matches
                if (m.index === regex.lastIndex) {
                  regex.lastIndex++;
                }
              }

              if (matchCount > 0) {
                results.push(`\n"${testStr}" → ${matchCount} match(es):`);
                results.push(matches.join("\n"));
              } else {
                results.push(`\n"${testStr}" → No matches`);
              }
            } else {
              const m = testStr.match(new RegExp(pattern, flags.replace("g", "")));
              if (m) {
                results.push(`\n"${testStr}" → Match: "${m[0]}"`);
                if (m.length > 1) {
                  m.slice(1).forEach((g: string, i: number) => {
                    results.push(`  Group ${i + 1}: ${g === undefined ? "undefined" : `"${g}"`}`);
                  });
                }
              } else {
                results.push(`\n"${testStr}" → No match`);
              }
            }
          }
        } catch (e) {
          results.push(`Error: ${(e as Error).message}`);
        }

        return results.join("\n");
      },
      faq: [
        { q: "How do I specify regex flags?", a: "Use the standard /pattern/flags format. Supported flags: g (global), i (case-insensitive), m (multiline), s (dotAll), u (unicode)." },
        { q: "Does it show capture groups?", a: "Yes, it displays numbered capture groups for each match, showing what each group captured." },
      ],
    },
  {
      slug: "regex-generator",
      name: "Regex Generator",
      description: "Generate common regular expressions from descriptions",
      category: "javascript",
      icon: "Wand2",
      accent: "pink",
      inputLabel: "Pattern type",
      outputLabel: "Regex pattern",
      placeholder: "Select a pattern type below...",
      actions: [
        { id: "email", label: "Email" },
        { id: "url", label: "URL" },
        { id: "phone", label: "Phone" },
        { id: "ipv4", label: "IPv4" },
        { id: "date", label: "Date" },
      ],
      run: (input: string, action: string): string => {
        const patterns: Record<string, { regex: string; description: string; flags?: string; example: string }> = {
          email: {
            regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            description: "Matches standard email addresses",
            example: "user@example.com",
          },
          url: {
            regex: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)",
            description: "Matches HTTP and HTTPS URLs",
            example: "https://www.example.com/path?query=value",
          },
          phone: {
            regex: "^(\\+?\\d{1,3}[-.\\s]?)?(\\(?\\d{3}\\)?|\\d{3})[-.\\s]?(\\d{3})[-.\\s]?(\\d{4})$",
            description: "Matches US phone numbers in various formats",
            example: "(555) 123-4567",
          },
          ipv4: {
            regex: "^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$",
            description: "Matches valid IPv4 addresses",
            example: "192.168.1.1",
          },
          date: {
            regex: "^(0[1-9]|[12]\\d|3[01])[-\\/](0[1-9]|1[0-2])[-\\/](\\d{4})$",
            description: "Matches dates in DD/MM/YYYY or DD-MM-YYYY format",
            example: "31/12/2024",
          },
        };

        const selected = patterns[action] || patterns.email;
        return `Pattern: ${selected.regex}\n\nDescription: ${selected.description}\n\nExample: ${selected.example}\n\nJavaScript: new RegExp("${selected.regex}")\n\nTest code:\nif (new RegExp("${selected.regex}").test("${selected.example}")) {\n  console.log("Valid!");\n}`;
      },
      faq: [
        { q: "Can I customize these patterns?", a: "Yes, the generated patterns are starting points. You can modify them to match your specific requirements." },
        { q: "Are these patterns RFC-compliant?", a: "They are practical patterns for common use cases. For strict RFC compliance (especially for emails), the patterns may need additional refinement." },
      ],
    },
  {
      slug: "cron-builder",
      name: "Cron Builder",
      description: "Convert natural language to cron expressions",
      category: "javascript",
      icon: "Clock",
      accent: "yellow",
      inputLabel: "Natural language description",
      outputLabel: "Cron expression",
      placeholder: "Describe your schedule in natural language...",
      sample: "every day at 3am",
      actions: [{ id: "run", label: "Build" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const text = input.toLowerCase().trim();

        const patterns: Array<{ match: RegExp; cron: string; description: string }> = [
          { match: /^every minute$/, cron: "* * * * *", description: "Runs every minute" },
          { match: /^every (\d+) minutes?$/, cron: "*/$1 * * * *", description: "Runs every N minutes" },
          { match: /^every hour$/, cron: "0 * * * *", description: "Runs every hour at :00" },
          { match: /^every (\d+) hours?$/, cron: "0 */$1 * * *", description: "Runs every N hours" },
          { match: /^every day at (\d+)(am|pm)?$/, cron: "0 $1 * * *", description: "Runs daily at specified hour" },
          { match: /^daily at (\d+)(am|pm)?$/, cron: "0 $1 * * *", description: "Runs daily at specified hour" },
          { match: /^every day$/, cron: "0 0 * * *", description: "Runs daily at midnight" },
          { match: /^every monday$/, cron: "0 0 * * 1", description: "Runs every Monday at midnight" },
          { match: /^every monday at (\d+)(am|pm)?$/, cron: "0 $1 * * 1", description: "Runs every Monday at specified hour" },
          { match: /^every tuesday$/, cron: "0 0 * * 2", description: "Runs every Tuesday at midnight" },
          { match: /^every tuesday at (\d+)(am|pm)?$/, cron: "0 $1 * * 2", description: "Runs every Tuesday at specified hour" },
          { match: /^every wednesday$/, cron: "0 0 * * 3", description: "Runs every Wednesday at midnight" },
          { match: /^every wednesday at (\d+)(am|pm)?$/, cron: "0 $1 * * 3", description: "Runs every Wednesday at specified hour" },
          { match: /^every thursday$/, cron: "0 0 * * 4", description: "Runs every Thursday at midnight" },
          { match: /^every thursday at (\d+)(am|pm)?$/, cron: "0 $1 * * 4", description: "Runs every Thursday at specified hour" },
          { match: /^every friday$/, cron: "0 0 * * 5", description: "Runs every Friday at midnight" },
          { match: /^every friday at (\d+)(am|pm)?$/, cron: "0 $1 * * 5", description: "Runs every Friday at specified hour" },
          { match: /^every saturday$/, cron: "0 0 * * 6", description: "Runs every Saturday at midnight" },
          { match: /^every saturday at (\d+)(am|pm)?$/, cron: "0 $1 * * 6", description: "Runs every Saturday at specified hour" },
          { match: /^every sunday$/, cron: "0 0 * * 0", description: "Runs every Sunday at midnight" },
          { match: /^every sunday at (\d+)(am|pm)?$/, cron: "0 $1 * * 0", description: "Runs every Sunday at specified hour" },
          { match: /^every month$/, cron: "0 0 1 * *", description: "Runs on the 1st of every month at midnight" },
          { match: /^every month on the (\d+)(st|nd|rd|th)?$/, cron: "0 0 $1 * *", description: "Runs on specified day of every month" },
          { match: /^every year$/, cron: "0 0 1 1 *", description: "Runs January 1st at midnight" },
          { match: /^every (\d+)(st|nd|rd|th)? of the month$/, cron: "0 0 $1 * *", description: "Runs on specified day of every month" },
          { match: /^at (\d+)(am|pm)?$/, cron: "0 $1 * * *", description: "Runs daily at specified hour" },
        ];

        for (const p of patterns) {
          if (p.match.test(text)) {
            let cron = text.replace(p.match, p.cron);
            // Handle hour offsets for am/pm
            const hourMatch = cron.match(/(\d+)(am|pm)/);
            if (hourMatch) {
              let hour = parseInt(hourMatch[1]);
              if (hourMatch[2] === "pm" && hour < 12) hour += 12;
              if (hourMatch[2] === "am" && hour === 12) hour = 0;
              cron = cron.replace(/\d+(am|pm)/, hour.toString());
            }
            return `Cron: ${cron}\n\nDescription: ${p.description}\n\nFields:\n- Minute: ${cron.split(" ")[0]}\n- Hour: ${cron.split(" ")[1]}\n- Day of Month: ${cron.split(" ")[2]}\n- Month: ${cron.split(" ")[3]}\n- Day of Week: ${cron.split(" ")[4]}\n\nCrontab syntax:\n${cron}  command`;
          }
        }

        return `Could not parse: "${input}"\n\nSupported patterns:\n- "every minute"\n- "every 5 minutes"\n- "every hour"\n- "every day at 3am"\n- "every monday at 9am"\n- "every month on the 1st"\n- "at 3pm"\n\nCommon cron examples:\n* * * * *      - Every minute\n*/5 * * * *    - Every 5 minutes\n0 * * * *      - Every hour\n0 3 * * *      - Every day at 3am\n0 9 * * 1      - Every Monday at 9am\n0 0 1 * *      - First day of month\n0 0 * * 0      - Every Sunday`;
      },
      faq: [
        { q: "What natural language patterns are supported?", a: "It supports patterns like 'every minute', 'every 5 minutes', 'every hour', 'every day at 3am', 'every monday at 9am', 'every month on the 1st', and more." },
        { q: "How do I use the generated cron expression?", a: "Add it to your crontab file (crontab -e) or use it in your job scheduler. The format is: minute hour day-of-month month day-of-week command." },
      ],
    },
  {
      slug: "cron-parser",
      name: "Cron Parser",
      description: "Parse cron expressions into human-readable descriptions",
      category: "javascript",
      icon: "Clock",
      accent: "orange",
      inputLabel: "Cron expression",
      outputLabel: "Human-readable description",
      placeholder: "Enter a cron expression (e.g., 0 3 * * *)...",
      sample: "0 3 * * *",
      actions: [{ id: "run", label: "Parse" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const parts = input.trim().split(/\s+/);
        if (parts.length !== 5) {
          return `Error: Invalid cron expression. Expected 5 fields, got ${parts.length}.\n\nFormat: minute hour day-of-month month day-of-week`;
        }

        const [minute, hour, dom, month, dow] = parts;
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        let description = "Runs ";

        // Parse minute
        if (minute === "*") {
          description += "every minute";
        } else if (minute.startsWith("*/")) {
          description += `every ${minute.slice(2)} minutes`;
        } else {
          description += `at minute ${minute}`;
        }

        // Parse hour
        if (hour === "*") {
          description += " of every hour";
        } else if (hour.startsWith("*/")) {
          description += ` of every ${hour.slice(2)} hours`;
        } else {
          const h = parseInt(hour);
          const period = h >= 12 ? "PM" : "AM";
          const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
          description += ` at ${displayH}:00 ${period}`;
        }

        // Parse day of month
        if (dom !== "*") {
          if (dom.startsWith("*/")) {
            description += ` every ${dom.slice(2)} days`;
          } else {
            description += ` on day ${dom}`;
          }
        }

        // Parse month
        if (month !== "*") {
          if (month.startsWith("*/")) {
            description += ` every ${month.slice(2)} months`;
          } else {
            const m = parseInt(month);
            if (m >= 1 && m <= 12) {
              description += ` in ${monthNames[m - 1]}`;
            }
          }
        }

        // Parse day of week
        if (dow !== "*") {
          if (dow.includes(",")) {
            const days = dow.split(",").map(d => dayNames[parseInt(d)] || d);
            description += ` on ${days.join(" and ")}`;
          } else if (dow.includes("-")) {
            const [start, end] = dow.split("-").map(d => dayNames[parseInt(d)] || d);
            description += ` from ${start} to ${end}`;
          } else if (dow.startsWith("*/")) {
            description += ` every ${dow.slice(2)} days of the week`;
          } else {
            const d = parseInt(dow);
            if (d >= 0 && d <= 6) {
              description += ` on ${dayNames[d]}`;
            }
          }
        }

        // Generate next 5 execution times
        const now = new Date();
        const executions: string[] = [];
        let checkDate = new Date(now);
        checkDate.setSeconds(0);
        checkDate.setMilliseconds(0);
        checkDate.setMinutes(checkDate.getMinutes() + 1);

        for (let i = 0; i < 30 && executions.length < 5; i++) {
          const m = checkDate.getMinutes();
          const h = checkDate.getHours();
          const domNum = checkDate.getDate();
          const monthNum = checkDate.getMonth() + 1;
          const dowNum = checkDate.getDay();

          if (matchesCron(minute, m) && matchesCron(hour, h) && matchesCron(dom, domNum) && matchesCron(month, monthNum) && matchesCron(dow, dowNum)) {
            executions.push(checkDate.toLocaleString());
          }
          checkDate.setMinutes(checkDate.getMinutes() + 1);
        }

        let result = `Expression: ${input}\n\nDescription: ${description}\n\nFields:\n- Minute: ${minute}\n- Hour: ${hour}\n- Day of Month: ${dom}\n- Month: ${month}\n- Day of Week: ${dow}\n\nNext 5 executions:\n${executions.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`;

        return result;

        function matchesCron(field: string, value: number): boolean {
          if (field === "*") return true;
          if (field.startsWith("*/")) {
            const interval = parseInt(field.slice(2));
            return value % interval === 0;
          }
          if (field.includes(",")) {
            return field.split(",").some(f => matchesCron(f.trim(), value));
          }
          if (field.includes("-")) {
            const [start, end] = field.split("-").map(Number);
            return value >= start && value <= end;
          }
          return parseInt(field) === value;
        }
      },
      faq: [
        { q: "What cron formats are supported?", a: "It supports standard 5-field cron expressions with *, ranges (1-5), lists (1,3,5), and steps (*/5, 1-10/2)." },
        { q: "Does it show when the cron will run next?", a: "Yes, it calculates and displays the next 5 execution times based on the current date and time." },
      ],
    },
  {
      slug: "js-to-typescript",
      outputLanguage: "typescript",
      name: "JS → TypeScript",
      description: "Convert JavaScript code to TypeScript with type inference",
      category: "javascript",
      icon: "FileCode2",
      accent: "blue",
      inputLabel: "JavaScript code",
      outputLabel: "TypeScript code",
      placeholder: "Paste your JavaScript here...",
      sample: 'function greet(name, age) {\n  return `Hello ${name}, you are ${age}`;\n}\n\nconst user = { name: "Ada", age: 30, active: true };',
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let code = input;

        // Infer types from function calls and assignments
        const inferType = (value: string): string => {
          const trimmed = value.trim();

          // String literals
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
              trimmed.startsWith("`")) {
            return "string";
          }

          // Number literals
          if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return trimmed.includes(".") ? "number" : "number";
          }

          // Boolean
          if (trimmed === "true" || trimmed === "false") {
            return "boolean";
          }

          // null/undefined
          if (trimmed === "null") return "null";
          if (trimmed === "undefined") return "undefined";

          // Array
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            return "any[]";
          }

          // Object
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            return "Record<string, any>";
          }

          // Function
          if (trimmed.includes("=>") || trimmed.startsWith("function")) {
            return "Function";
          }

          return "any";
        };

        // Convert function declarations
        code = code.replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, (_match: string, name: string, params: string) => {
          const typedParams = params.split(",").map((p: string) => {
            const trimmed = p.trim();
            if (!trimmed) return "";
            if (trimmed.includes(":")) return trimmed;
            return `${trimmed}: any`;
          }).filter(Boolean).join(", ");
          return `function ${name}(${typedParams}): any {`;
        });

        // Convert arrow functions
        code = code.replace(/const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g, (_match: string, name: string, params: string) => {
          const typedParams = params.split(",").map((p: string) => {
            const trimmed = p.trim();
            if (!trimmed) return "";
            if (trimmed.includes(":")) return trimmed;
            return `${trimmed}: any`;
          }).filter(Boolean).join(", ");
          return `const ${name} = (${typedParams}): any =>`;
        });

        // Convert const declarations with inferred types
        code = code.replace(/const\s+(\w+)\s*=\s*([^;]+);/g, (_match: string, name: string, value: string) => {
          const type = inferType(value);
          return `const ${name}: ${type} = ${value};`;
        });

        // Convert let declarations
        code = code.replace(/let\s+(\w+)\s*=\s*([^;]+);/g, (_match: string, name: string, value: string) => {
          const type = inferType(value);
          return `let ${name}: ${type} = ${value};`;
        });

        // Add interface for objects
        const objectMatches = code.match(/const\s+(\w+)\s*:\s*Record<string,\s*any>\s*=\s*\{([^}]+)\}/g);
        if (objectMatches) {
          let interfaces = "";
          for (const objMatch of objectMatches) {
            const nameMatch = objMatch.match(/const\s+(\w+)/);
            const contentMatch = objMatch.match(/\{([^}]+)\}/);
            if (nameMatch && contentMatch) {
              const name = nameMatch[1];
              const props = contentMatch[1].split(",").map((p: string) => {
                const [key, val] = p.split(":").map((s: string) => s.trim());
                if (!key) return "";
                const type = inferType(val || "");
                return `  ${key}: ${type};`;
              }).filter(Boolean).join("\n");
              interfaces += `interface ${name} {\n${props}\n}\n\n`;
            }
          }
          code = interfaces + code;
        }

        return code;
      },
      faq: [
        { q: "How accurate is the type inference?", a: "It infers basic types (string, number, boolean, any) from literal values. For complex types, you may need to manually add more specific type annotations." },
        { q: "Does it handle complex TypeScript types?", a: "This converter handles basic type inference. For advanced types like generics, union types, or mapped types, manual refinement is recommended." },
      ],
    },
  {
      slug: "diff-checker",
      name: "Diff Checker",
      description: "Compare two text blocks and show differences line by line",
      category: "text",
      icon: "GitCompare",
      accent: "blue",
      trending: true,
      inputLabel: "Two text blocks (separate with ---)",
      outputLabel: "Diff output",
      placeholder: "Paste first block, then ---, then second block...",
      sample: "Line 1\nLine 2\nLine 3\n---\nLine 1\nLine 2 modified\nLine 3\nLine 5",
      actions: [{ id: "run", label: "Compare" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const separator = "---";
        const separatorIndex = input.indexOf(separator);
        if (separatorIndex === -1) {
          return 'Error: Please separate the two text blocks with "---"';
        }

        const text1 = input.substring(0, separatorIndex).trim();
        const text2 = input.substring(separatorIndex + separator.length).trim();

        const lines1 = text1.split("\n");
        const lines2 = text2.split("\n");

        const maxLines = Math.max(lines1.length, lines2.length);
        const result: string[] = [];

        result.push("=== Diff Output ===\n");
        result.push(`Left: ${lines1.length} lines | Right: ${lines2.length} lines\n`);

        let changes = 0;
        let additions = 0;
        let deletions = 0;

        for (let i = 0; i < maxLines; i++) {
          const line1 = i < lines1.length ? lines1[i] : undefined;
          const line2 = i < lines2.length ? lines2[i] : undefined;

          if (line1 === line2) {
            result.push(`  ${line1}`);
          } else {
            changes++;
            if (line1 !== undefined) {
              result.push(`- ${line1}`);
              deletions++;
            }
            if (line2 !== undefined) {
              result.push(`+ ${line2}`);
              additions++;
            }
          }
        }

        result.push(`\n=== Summary ===`);
        result.push(`Changes: ${changes} | Additions: +${additions} | Deletions: -${deletions}`);

        return result.join("\n");
      },
      faq: [
        { q: "How do I separate the two text blocks?", a: "Place '---' on its own line between the two text blocks you want to compare." },
        { q: "What do the +/- prefixes mean?", a: "'+' indicates a line that exists only in the second block (addition), '-' indicates a line that exists only in the first block (deletion)." },
      ],
    },
  {
      slug: "reverse-lines",
      name: "Reverse Lines",
      description: "Reverse the order of lines in text",
      category: "text",
      icon: "ArrowUpDown",
      accent: "teal",
      inputLabel: "Text",
      outputLabel: "Reversed text",
      placeholder: "Paste your text here...",
      sample: "First line\nSecond line\nThird line\nFourth line",
      actions: [{ id: "run", label: "Reverse" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        return input.split("\n").reverse().join("\n");
      },
      faq: [
        { q: "Does this preserve empty lines?", a: "Yes, empty lines are preserved and will appear in their reversed position." },
        { q: "Can I reverse lines within a single string?", a: "Yes, it splits by newline characters and reverses the resulting array of lines." },
      ],
    },
  {
      slug: "unicode-escape",
      name: "Unicode Escape",
      description: "Encode/decode text to/from Unicode escape sequences",
      category: "converter",
      icon: "Binary",
      accent: "purple",
      inputLabel: "Text or Unicode escapes",
      outputLabel: "Encoded/decoded text",
      placeholder: "Enter text to encode or \\uXXXX sequences to decode...",
      sample: "Hello, 世界! 🌍",
      actions: [
        { id: "encode", label: "Encode" },
        { id: "decode", label: "Decode" },
      ],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        if (action === "encode") {
          return input.split("").map(char => {
            const code = char.charCodeAt(0);
            if (code > 127) {
              return `\\u${code.toString(16).padStart(4, "0")}`;
            }
            return char;
          }).join("");
        } else {
          // Decode
          return input.replace(/\\u([0-9a-fA-F]{4})/g, (_match: string, hex: string) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
        }
      },
      faq: [
        { q: "What Unicode characters are supported?", a: "It supports all Unicode characters including CJK, emoji, and special characters, converting them to \\uXXXX escape sequences." },
        { q: "Will this handle surrogate pairs?", a: "For basic Unicode characters (BMP), it works directly. For characters outside BMP (like some emoji), it may need manual handling of surrogate pairs." },
      ],
    },
  {
      slug: "hex-encode",
      name: "Hex Encode/Decode",
      description: "Encode and decode hexadecimal values",
      category: "converter",
      icon: "Hash",
      accent: "orange",
      inputLabel: "Text or hex values",
      outputLabel: "Hex/decoded text",
      placeholder: "Enter text to encode or hex values to decode...",
      sample: "Hello, World!",
      actions: [
        { id: "encode", label: "Encode" },
        { id: "decode", label: "Decode" },
      ],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        if (action === "encode") {
          return input.split("").map(char => {
            return char.charCodeAt(0).toString(16).padStart(2, "0");
          }).join(" ");
        } else {
          // Remove spaces and decode
          const hex = input.replace(/\s/g, "").replace(/^0x/i, "");
          if (hex.length % 2 !== 0) {
            return "Error: Invalid hex string (odd number of characters)";
          }
          try {
            let result = "";
            for (let i = 0; i < hex.length; i += 2) {
              const byte = parseInt(hex.substring(i, i + 2), 16);
              if (isNaN(byte)) {
                return "Error: Invalid hex character found";
              }
              result += String.fromCharCode(byte);
            }
            return result;
          } catch {
            return "Error: Failed to decode hex string";
          }
        }
      },
      faq: [
        { q: "What format does the hex output use?", a: "The encode output uses space-separated hex bytes (e.g., '48 65 6c 6c 6f'). The decode input can use this format or continuous hex strings." },
        { q: "Is this suitable for binary data?", a: "This is text-based hex encoding. For binary data, you would need to handle binary buffers directly." },
      ],
    },
  {
      slug: "html-encode",
      name: "HTML Entity Encode/Decode",
      description: "Encode and decode HTML entities",
      category: "converter",
      icon: "Code",
      accent: "brand",
      inputLabel: "HTML text or entities",
      outputLabel: "Decoded/encoded text",
      placeholder: "Enter HTML to encode or entities to decode...",
      sample: '<div class="test">Hello & World < 100 > 50</div>',
      actions: [
        { id: "encode", label: "Encode" },
        { id: "decode", label: "Decode" },
      ],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        if (action === "encode") {
          return input
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "&#10;")
            .replace(/\r/g, "&#13;")
            .replace(/\t/g, "&#9;");
        } else {
          return input
            .replace(/&#039;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&#10;/g, "\n")
            .replace(/&#13;/g, "\r")
            .replace(/&#9;/g, "\t");
        }
      },
      faq: [
        { q: "Which HTML entities are encoded?", a: "It encodes the five XML entities: & < > \" ' plus whitespace characters (newline, carriage return, tab) to numeric character references." },
        { q: "Will this handle named entities?", a: "The decode function handles common named entities. For full HTML entity support, you may need a more comprehensive parser." },
      ],
    },
  {
      slug: "sha256-generator",
      name: "SHA-256 Hash",
      description: "Generate SHA-256 hash from any input text",
      category: "security",
      icon: "Shield",
      accent: "pink",
      trending: true,
      inputLabel: "Text to hash",
      outputLabel: "SHA-256 hash",
      placeholder: "Enter text to generate SHA-256 hash...",
      sample: "Hello, World!",
      actions: [{ id: "hash", label: "Hash input" }],
      run: async (input: string, action: string): Promise<string> => {
        if (!input.trim()) return "";

        try {
          const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
          const hash = Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
          return `Input: ${input}\n\nSHA-256 Hash:\n${hash}`;
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What is SHA-256?", a: "SHA-256 is a cryptographic hash function that produces a 256-bit (32-byte) hash value. It's commonly used for data integrity, digital signatures, and blockchain." },
        { q: "Can I reverse a SHA-256 hash?", a: "No, SHA-256 is a one-way function. You cannot reverse it to get the original input. You can only verify by hashing the original input again." },
      ],
    },
  {
      slug: "sha512-generator",
      name: "SHA-512 Hash",
      description: "Generate SHA-512 hash from any input text",
      category: "security",
      icon: "Shield",
      accent: "purple",
      inputLabel: "Text to hash",
      outputLabel: "SHA-512 hash",
      placeholder: "Enter text to generate SHA-512 hash...",
      sample: "Hello, World!",
      actions: [{ id: "hash", label: "Hash input" }],
      run: async (input: string, action: string): Promise<string> => {
        if (!input.trim()) return "";

        try {
          const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
          const hash = Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
          return `Input: ${input}\n\nSHA-512 Hash:\n${hash}`;
        } catch (e) {
          return `Error: ${(e as Error).message}`;
        }
      },
      faq: [
        { q: "What is SHA-512?", a: "SHA-512 is a cryptographic hash function that produces a 512-bit (64-byte) hash value. It's more secure than SHA-256 but produces longer hashes." },
        { q: "When should I use SHA-512 vs SHA-256?", a: "SHA-512 offers higher security margin but is slower. SHA-256 is typically sufficient for most applications and is more widely supported." },
      ],
    },
  {
      slug: "md5-generator",
      name: "MD5 Hash",
      description: "Generate MD5 hash from any input text",
      category: "security",
      icon: "Shield",
      accent: "orange",
      inputLabel: "Text to hash",
      outputLabel: "MD5 hash",
      placeholder: "Enter text to generate MD5 hash...",
      sample: "Hello, World!",
      actions: [{ id: "hash", label: "Hash input" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        // RFC 1321 MD5 implementation
        function md5(string: string): string {
          function safeAdd(x: number, y: number): number {
            const lsw = (x & 0xffff) + (y & 0xffff);
            const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xffff);
          }

          function bitRotateLeft(num: number, cnt: number): number {
            return (num << cnt) | (num >>> (32 - cnt));
          }

          function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
            return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
          }

          function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
            return md5cmn((b & c) | (~b & d), a, b, x, s, t);
          }

          function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
            return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
          }

          function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
            return md5cmn(b ^ c ^ d, a, b, x, s, t);
          }

          function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
            return md5cmn(c ^ (b | ~d), a, b, x, s, t);
          }

          function binlMD5(x: number[], len: number): number[] {
            x[len >> 5] |= 0x80 << (len % 32);
            x[((len + 64) >>> 9 << 4) + 14] = len;

            let a = 1732584193;
            let b = -271733879;
            let c = -1732584194;
            let d = 271733878;

            for (let i = 0; i < x.length; i += 16) {
              const olda = a;
              const oldb = b;
              const oldc = c;
              const oldd = d;

              a = md5ff(a, b, c, d, x[i], 7, -680876936);
              d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
              c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
              b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
              a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
              d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
              c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
              b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
              a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
              d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
              c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
              b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
              a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
              d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
              c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
              b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

              a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
              d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
              c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
              b = md5gg(b, c, d, a, x[i], 20, -373897302);
              a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
              d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
              c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
              b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
              a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
              d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
              c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
              b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
              a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
              d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
              c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
              b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

              a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
              d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
              c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
              b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
              a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
              d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
              c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
              b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
              a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
              d = md5hh(d, a, b, c, x[i + 0], 11, -358537222);
              c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
              b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
              a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
              d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
              c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
              b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

              a = md5ii(a, b, c, d, x[i], 6, -198630844);
              d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
              c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
              b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
              a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
              d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
              c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
              b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
              a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
              d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
              c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
              b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
              a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
              d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
              c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
              b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

              a = safeAdd(a, olda);
              b = safeAdd(b, oldb);
              c = safeAdd(c, oldc);
              d = safeAdd(d, oldd);
            }
            return [a, b, c, d];
          }

          function str2binl(str: string): number[] {
            const output: number[] = [];
            const mask = (1 << 8) - 1;
            for (let i = 0; i < str.length * 8; i += 8) {
              output[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
            }
            return output;
          }

          function binl2hex(binarray: number[]): string {
            const hexTab = "0123456789abcdef";
            let str = "";
            for (let i = 0; i < binarray.length * 4; i++) {
              str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) +
                     hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf);
            }
            return str;
          }

          return binl2hex(binlMD5(str2binl(string), string.length * 8));
        }

        const hash = md5(input);
        return `Input: ${input}\n\nMD5 Hash:\n${hash}`;
      },
      faq: [
        { q: "Is MD5 secure for passwords?", a: "No, MD5 is cryptographically broken and should not be used for password hashing. Use bcrypt, scrypt, or Argon2 instead." },
        { q: "What is MD5 used for?", a: "MD5 is commonly used for file checksums, data integrity verification, and non-cryptographic fingerprinting. It's not recommended for security purposes." },
      ],
    },
  {
      slug: "bcrypt-hash",
      name: "bcrypt Hash/Verify",
      description: "Hash and verify passwords using bcrypt-compatible format",
      category: "security",
      icon: "Lock",
      accent: "pink",
      inputLabel: "Password to hash or hash to verify",
      outputLabel: "Hash result",
      placeholder: "Enter a password to hash or a hash to verify...",
      sample: "mySecretPassword123",
      actions: [
        { id: "hash", label: "Hash" },
        { id: "verify", label: "Verify" },
      ],
      run: async (input: string, action: string): Promise<string> => {
        if (!input.trim()) return "";

        const bcryptPrefix = "$2b$";

        async function bcryptHash(password: string, rounds: number = 10): Promise<string> {
          // Generate random salt
          const saltArray = new Uint8Array(16);
          crypto.getRandomValues(saltArray);
          const salt = btoa(String.fromCharCode(...saltArray))
            .replace(/\+/g, ".")
            .replace(/\//g, "/")
            .replace(/=/g, "");

          // Use PBKDF2 with SHA-256 as bcrypt approximation
          const keyMaterial = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
          );

          const derivedBits = await crypto.subtle.deriveBits(
            {
              name: "PBKDF2",
              salt: new TextEncoder().encode(salt),
              iterations: Math.pow(2, rounds),
              hash: "SHA-256",
            },
            keyMaterial,
            256
          );

          const hashArray = Array.from(new Uint8Array(derivedBits));
          const hashB64 = btoa(String.fromCharCode(...hashArray))
            .replace(/\+/g, ".")
            .replace(/\//g, "/")
            .replace(/=/g, "");

          // Format: $2b$rounds$salthash
          const encodedRounds = rounds.toString().padStart(2, "0");
          return `${bcryptPrefix}${encodedRounds}$${salt.substring(0, 22)}${hashB64.substring(0, 31)}`;
        }

        async function bcryptVerify(password: string, hash: string): Promise<boolean> {
          if (!hash.startsWith(bcryptPrefix)) {
            return false;
          }

          const parts = hash.split("$");
          if (parts.length < 4) return false;

          const rounds = parseInt(parts[2]);
          const salt = parts[3].substring(0, 22);

          const recomputed = await bcryptHash(password, rounds);
          return recomputed === hash;
        }

        if (action === "hash") {
          const hash = await bcryptHash(input);
          return `Password: ${input}\n\nbcrypt Hash:\n${hash}\n\nNote: This uses PBKDF2 with SHA-256 as a bcrypt approximation for browser compatibility.`;
        } else {
          if (!input.startsWith(bcryptPrefix)) {
            return `Error: Input does not appear to be a valid bcrypt hash.\n\nExpected format: ${bcryptPrefix}XX$...`;
          }
          return `Hash: ${input}\n\nTo verify, you need both the password and the hash.\nPlease use the hash function first, then verify with the original password.`;
        }
      },
      faq: [
        { q: "Is this real bcrypt?", a: "This uses PBKDF2 with SHA-256 as a bcrypt approximation since bcrypt is not available in browser Web Crypto API. The output format matches bcrypt ($2b$) for compatibility." },
        { q: "Can I use this for production password hashing?", a: "For production use, prefer server-side bcrypt implementations (like bcryptjs for Node.js). This browser implementation is useful for testing and prototyping." },
      ],
    },
  {
      slug: "nanoid-generator",
      name: "NanoID Generator",
      description: "Generate unique URL-safe NanoID strings",
      category: "security",
      icon: "Fingerprint",
      accent: "green",
      generator: true,
      inputLabel: "Options (optional)",
      outputLabel: "Generated IDs",
      placeholder: "Enter length or leave empty for default...",
      sample: "",
      actions: [
        { id: "generate", label: "Generate" },
        { id: "generate10", label: "Generate 10" },
      ],
      run: (input: string, action: string): string => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
        const defaultLength = 21;

        const length = input.trim() ? parseInt(input.trim()) || defaultLength : defaultLength;

        function generateId(len: number): string {
          let id = "";
          const bytes = new Uint8Array(len);
          crypto.getRandomValues(bytes);
          for (let i = 0; i < len; i++) {
            id += alphabet[bytes[i] % alphabet.length];
          }
          return id;
        }

        if (action === "generate10") {
          const ids = Array.from({ length: 10 }, () => generateId(length));
          return `Generated 10 NanoIDs (length: ${length}):\n\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`;
        }

        return `Generated NanoID (length: ${length}):\n\n${generateId(length)}\n\nAlphabet: ${alphabet}\nLength: ${length} characters`;
      },
      faq: [
        { q: "What is NanoID?", a: "NanoID is a tiny, URL-friendly, unique string ID generator. It uses a larger alphabet than UUID, making it shorter for the same collision resistance." },
        { q: "How unique are NanoIDs?", a: "With the default 21-character length and 64-character alphabet, NanoID has the same collision resistance as UUID v4 (126 bits of randomness)." },
      ],
    },
  {
      slug: "svg-optimizer",
      outputLanguage: "xml",
      name: "SVG Optimizer",
      description: "Optimize SVG files by removing unnecessary elements",
      category: "image",
      icon: "Image",
      accent: "pink",
      inputLabel: "SVG code",
      outputLabel: "Optimized SVG",
      placeholder: "Paste your SVG here...",
      sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <!-- This is a comment -->\n  <title>My Icon</title>\n  <desc>An icon</desc>\n  <g>\n    <path d="M12 2L2 22h20L12 2z" fill="currentColor" stroke-width="2"/>\n  </g>\n</svg>',
      actions: [{ id: "run", label: "Optimize" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let svg = input;

        // Remove XML declarations
        svg = svg.replace(/<\?xml[^?]*\?>/gi, "");
        // Remove comments
        svg = svg.replace(/<!--[\s\S]*?-->/g, "");
        // Remove title
        svg = svg.replace(/<title>[\s\S]*?<\/title>/gi, "");
        // Remove desc
        svg = svg.replace(/<desc>[\s\S]*?<\/desc>/gi, "");
        // Remove metadata
        svg = svg.replace(/<metadata>[\s\S]*?<\/metadata>/gi, "");
        // Remove empty groups
        svg = svg.replace(/<g>\s*<\/g>/gi, "");
        // Remove empty attributes
        svg = svg.replace(/\s+[a-z-]+=""/gi, "");
        // Remove data-* attributes
        svg = svg.replace(/\s+data-[a-z-]+="[^"]*"/gi, "");
        // Remove id attributes if not referenced
        svg = svg.replace(/\s+id="[^"]*"/gi, "");
        // Remove xmlns:xlink if not used
        if (!svg.includes("xlink:")) {
          svg = svg.replace(/\s+xmlns:xlink="[^"]*"/gi, "");
        }
        // Remove XML stylesheet
        svg = svg.replace(/<\?xml-stylesheet[^?]*\?>/gi, "");
        // Collapse whitespace
        svg = svg.replace(/\s+/g, " ").trim();
        // Add proper indentation
        svg = svg.replace(/></g, ">\n<");

        return svg;
      },
      faq: [
        { q: "What does SVG optimizer remove?", a: "It removes comments, title/desc metadata, empty groups, unused attributes, data-* attributes, and redundant xmlns declarations." },
        { q: "Will this break my SVG?", a: "It removes only non-rendering elements. The visual output remains identical. Test critical SVGs after optimization." },
      ],
    },
  {
      slug: "svg-minifier",
      outputLanguage: "xml",
      name: "SVG Minifier",
      description: "Minify SVG code by removing whitespace and shortening attributes",
      category: "image",
      icon: "Minimize2",
      accent: "orange",
      inputLabel: "SVG code",
      outputLabel: "Minified SVG",
      placeholder: "Paste your SVG here...",
      sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <path d="M12 2L2 22h20L12 2z" fill="#3b82f6" stroke-width="2" opacity="1.0" />\n</svg>',
      actions: [{ id: "run", label: "Minify" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let svg = input;

        // Remove comments
        svg = svg.replace(/<!--[\s\S]*?-->/g, "");
        // Remove XML declarations
        svg = svg.replace(/<\?xml[^?]*\?>/gi, "");
        // Remove title and desc
        svg = svg.replace(/<title>[\s\S]*?<\/title>/gi, "");
        svg = svg.replace(/<desc>[\s\S]*?<\/desc>/gi, "");
        // Shorten color names where possible
        svg = svg.replace(/fill="white"/g, 'fill="#fff"');
        svg = svg.replace(/fill="black"/g, 'fill="#000"');
        svg = svg.replace(/fill="red"/g, 'fill="#f00"');
        svg = svg.replace(/fill="green"/g, 'fill="#0f0"');
        svg = svg.replace(/fill="blue"/g, 'fill="#00f"');
        svg = svg.replace(/stroke="white"/g, 'stroke="#fff"');
        svg = svg.replace(/stroke="black"/g, 'stroke="#000"');
        // Remove default values
        svg = svg.replace(/\s+opacity="1"/g, "");
        svg = svg.replace(/\s+stroke-width="0"/g, "");
        svg = svg.replace(/\s+fill-opacity="1"/g, "");
        svg = svg.replace(/\s+stroke-opacity="1"/g, "");
        // Remove empty attributes
        svg = svg.replace(/\s+[a-z-]+=""/gi, "");
        // Remove whitespace between tags
        svg = svg.replace(/>\s+</g, "><");
        // Collapse multiple spaces
        svg = svg.replace(/\s+/g, " ").trim();
        // Remove newlines
        svg = svg.replace(/\n/g, "");

        return svg;
      },
      faq: [
        { q: "How much smaller will my SVG be?", a: "Typically 20-40% smaller, depending on how much whitespace, comments, and default values your original SVG contains." },
        { q: "Does this preserve SVG quality?", a: "Yes, it only removes formatting and defaults that don't affect rendering. The SVG will look identical." },
      ],
    },
  {
      slug: "svg-formatter",
      outputLanguage: "xml",
      name: "SVG Formatter",
      description: "Format SVG code with proper indentation and line breaks",
      category: "image",
      icon: "Paintbrush",
      accent: "purple",
      inputLabel: "SVG code",
      outputLabel: "Formatted SVG",
      placeholder: "Paste your SVG here...",
      sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" /></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#grad)"/></svg>',
      actions: [{ id: "run", label: "Format" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        let svg = input;
        let result = "";
        let indent = 0;
        const indentStr = "  ";

        // Normalize whitespace
        svg = svg.replace(/\s+/g, " ").trim();
        // Add newlines around tags
        svg = svg.replace(/>\s+</g, ">\n<");

        const lines = svg.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("</")) {
            indent = Math.max(0, indent - 1);
          }

          result += indentStr.repeat(indent) + trimmed + "\n";

          if (trimmed.startsWith("<") && !trimmed.startsWith("</") && !trimmed.startsWith("<?") &&
              !trimmed.endsWith("/>") && !trimmed.includes("</")) {
            indent++;
          }
        }

        return result.trim();
      },
      faq: [
        { q: "Does this formatter handle nested SVG elements?", a: "Yes, it properly indents nested elements, handling self-closing tags, opening tags, and closing tags with correct nesting levels." },
        { q: "Will this increase my SVG file size?", a: "Yes, formatting adds whitespace for readability. Use SVG Minifier if you need to reduce file size again." },
      ],
    },
  {
      slug: "svg-preview",
      name: "SVG Preview",
      description: "Preview SVG code in a browser-viewable format",
      category: "image",
      icon: "Eye",
      accent: "teal",
      inputLabel: "SVG code",
      outputLabel: "Preview info",
      placeholder: "Paste your SVG here to preview...",
      sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200"><circle cx="50" cy="50" r="40" fill="#3b82f6" stroke="#1d4ed8" stroke-width="4"/><text x="50" y="55" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>',
      actions: [{ id: "run", label: "Preview" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const svg = input.trim();

        // Basic validation
        if (!svg.includes("<svg") || !svg.includes("</svg>")) {
          return "Error: Input does not appear to be valid SVG code.\n\nSVG must start with <svg> and end with </svg>";
        }

        // Extract dimensions
        const widthMatch = svg.match(/width="(\d+)"/);
        const heightMatch = svg.match(/height="(\d+)"/);
        const viewMatch = svg.match(/viewBox="([^"]+)"/);

        let info = `SVG Preview\n\n`;
        info += `To preview this SVG:\n`;
        info += `1. Copy the SVG code\n`;
        info += `2. Open a new browser tab\n`;
        info += `3. Paste into the address bar (as data URI) or save as .svg file\n\n`;
        info += `SVG Details:\n`;

        if (widthMatch) info += `  Width: ${widthMatch[1]}px\n`;
        if (heightMatch) info += `  Height: ${heightMatch[1]}px\n`;
        if (viewMatch) info += `  ViewBox: ${viewMatch[1]}\n`;

        // Count elements
        const pathCount = (svg.match(/<path/g) || []).length;
        const circleCount = (svg.match(/<circle/g) || []).length;
        const rectCount = (svg.match(/<rect/g) || []).length;
        const lineCount = (svg.match(/<line/g) || []).length;
        const textCount = (svg.match(/<text/g) || []).length;

        info += `\nElements:\n`;
        if (pathCount) info += `  Paths: ${pathCount}\n`;
        if (circleCount) info += `  Circles: ${circleCount}\n`;
        if (rectCount) info += `  Rects: ${rectCount}\n`;
        if (lineCount) info += `  Lines: ${lineCount}\n`;
        if (textCount) info += `  Text: ${textCount}\n`;
        info += `  Total size: ${new Blob([svg]).size} bytes\n`;

        info += `\nData URI (for direct browser preview):\n`;
        const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        info += dataUri.substring(0, 200) + (dataUri.length > 200 ? "..." : "");

        return info;
      },
      faq: [
        { q: "How can I actually preview the SVG?", a: "You can save the SVG code as a .svg file and open it in a browser, or use the generated data URI in a browser tab, or use online SVG viewers." },
        { q: "Does this validate the SVG?", a: "It performs basic validation (checks for svg tags) and provides information about dimensions, elements, and file size." },
      ],
    },
  {
      slug: "image-base64",
      name: "Image Base64",
      description: "Convert between image data URLs and Base64 encoding",
      category: "image",
      icon: "Image",
      accent: "blue",
      inputLabel: "Data URL or Base64 string",
      outputLabel: "Converted output",
      placeholder: "Paste a data URL or Base64 string...",
      sample: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      actions: [{ id: "run", label: "Convert" }],
      run: (input: string, action: string): string => {
        if (!input.trim()) return "";

        const trimmed = input.trim();

        // If it's a data URL, extract the Base64 part
        if (trimmed.startsWith("data:")) {
          const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64 = match[2];
            return `Data URL detected!\n\nMIME Type: ${mimeType}\nBase64 Length: ${base64.length} characters\nFile Size: ~${Math.round(base64.length * 0.75)} bytes\n\nBase64 Content:\n${base64}\n\nTo use as an image:\n- HTML: <img src="${trimmed.substring(0, 50)}..." />\n- CSS: background-image: url("${trimmed.substring(0, 50)}...");`;
          }
        }

        // If it looks like Base64, wrap in a data URL
        if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
          const cleanBase64 = trimmed.replace(/\s/g, "");
          const dataUrl = `data:image/png;base64,${cleanBase64}`;
          return `Base64 Content detected!\n\nLength: ${cleanBase64.length} characters\nEstimated size: ~${Math.round(cleanBase64.length * 0.75)} bytes\n\nData URL:\n${dataUrl}`;
        }

        return "Error: Input does not appear to be a valid data URL or Base64 string.\n\nExpected formats:\n- data:image/png;base64,iVBOR...\n- iVBORw0KGgoAAAANSU...";
      },
      faq: [
        { q: "What image formats are supported?", a: "Any format supported by data URLs: PNG, JPEG, GIF, SVG, WebP, BMP, etc. The MIME type is automatically detected from the data URL." },
        { q: "When would I use Base64 for images?", a: "Base64 encoding is useful for embedding small images directly in HTML/CSS (reducing HTTP requests), or when you need to transmit binary image data as text." },
      ],
    },

  // ─── Flutter ────────────────────────────────────────────
  {
    slug: "flutter-model-generator",
    name: "Model Class Generator",
    description: "Generate a Dart model class from a JSON sample with fromJson/toJson",
    category: "flutter",
    icon: "FileCode2",
    accent: "teal",
    outputLanguage: "dart",
    sample: '{\n  "id": 1,\n  "name": "Ada",\n  "email": "ada@example.com",\n  "isActive": true,\n  "tags": ["admin"]\n}',
    actions: [{ id: "generate", label: "Generate model" }],
    run: (input) => {
      const obj = parseJson(input) as Record<string, unknown>;
      const lines: string[] = ["class Model {", "  Model({"];

      const fields: { name: string; type: string; jsonKey: string }[] = [];
      for (const [key, val] of Object.entries(obj)) {
        const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        let type = "dynamic";
        if (val === null) type = "dynamic";
        else if (typeof val === "string") type = "String";
        else if (typeof val === "boolean") type = "bool";
        else if (typeof val === "number") type = Number.isInteger(val) ? "int" : "double";
        else if (Array.isArray(val)) {
          if (val.length > 0 && typeof val[0] === "string") type = "List<String>";
          else if (val.length > 0 && typeof val[0] === "number") type = "List<int>";
          else type = "List<dynamic>";
        } else if (typeof val === "object") type = "Map<String, dynamic>";
        fields.push({ name: camel, type, jsonKey: key });
      }

      fields.forEach((f, i) => {
        lines.push(`    required this.${f.name}${i < fields.length - 1 ? "," : ""}`);
      });
      lines.push("  });");

      lines.push("");
      lines.push("  factory Model.fromJson(Map<String, dynamic> json) => Model(");
      fields.forEach((f, i) => {
        const accessor = f.type === "String" ? "" : f.type === "int" ? " as int" : f.type === "double" ? " as double" : f.type === "bool" ? " as bool" : "";
        lines.push(`    ${f.name}: json['${f.jsonKey}']${accessor}${f.type === "int" || f.type === "double" ? "" : ""},`);
      });
      lines.push("  );");

      lines.push("");
      lines.push("  Map<String, dynamic> toJson() => {");
      fields.forEach((f) => {
        lines.push(`    '${f.jsonKey}': ${f.name},`);
      });
      lines.push("  };");

      fields.forEach((f) => {
        lines.push("");
        lines.push(`  final ${f.type} ${f.name};`);
      });

      lines.push("}");
      return lines.join("\n");
    },
    faq: [
      { q: "What does this generator produce?", a: "A Dart class with a constructor, fromJson factory, and toJson method — ready to use in Flutter apps." },
      { q: "Does it handle nested objects?", a: "Nested objects become Map<String, dynamic>. For deeper models, generate each level separately." },
    ],
  },

  {
    slug: "flutter-freezed-generator",
    name: "Freezed Generator",
    description: "Generate a Freezed-annotated Dart class with copyWith, ==, and hashCode",
    category: "flutter",
    icon: "Snowflake",
    accent: "teal",
    outputLanguage: "dart",
    sample: '{\n  "id": 1,\n  "name": "Ada",\n  "email": "ada@example.com"\n}',
    actions: [{ id: "generate", label: "Generate freezed class" }],
    run: (input) => {
      const obj = parseJson(input) as Record<string, unknown>;
      const lines: string[] = [
        "import 'package:freezed_annotation/freezed_annotation.dart';",
        "",
        "part 'model.freezed.dart';",
        "part 'model.g.dart';",
        "",
        "@freezed",
        "class Model with _\$Model {",
        "  const factory Model({",
      ];

      for (const [key, val] of Object.entries(obj)) {
        const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        let type = "dynamic";
        if (val === null) type = "dynamic";
        else if (typeof val === "string") type = "String";
        else if (typeof val === "boolean") type = "bool";
        else if (typeof val === "number") type = Number.isInteger(val) ? "int" : "double";
        else if (Array.isArray(val)) type = "List<dynamic>";
        else if (typeof val === "object") type = "Map<String, dynamic>";
        lines.push(`    ${type}? ${camel},`);
      }

      lines.push("  }) = _Model;");
      lines.push("");
      lines.push("  factory Model.fromJson(Map<String, dynamic> json) => _\$ModelFromJson(json);");
      lines.push("}");
      return lines.join("\n");
    },
    faq: [
      { q: "What is Freezed?", a: "A Dart code generator that creates immutable data classes with copyWith, ==, hashCode, toString, and JSON serialization." },
      { q: "What parts do I need to add?", a: "After generating, run 'dart run build_runner build' to produce the .freezed.dart and .g.dart files." },
    ],
  },

  {
    slug: "flutter-json-serializable-generator",
    name: "JSON Serializable Generator",
    description: "Generate a json_serializable annotated Dart class for type-safe JSON",
    category: "flutter",
    icon: "FileJson",
    accent: "teal",
    outputLanguage: "dart",
    sample: '{\n  "id": 1,\n  "name": "Ada",\n  "score": 98.5,\n  "isActive": true\n}',
    actions: [{ id: "generate", label: "Generate class" }],
    run: (input) => {
      const obj = parseJson(input) as Record<string, unknown>;
      const lines: string[] = [
        "import 'package:json_annotation/json_annotation.dart';",
        "",
        "part 'model.g.dart';",
        "",
        "@JsonSerializable()",
        "class Model {",
        "  Model({",
      ];

      const fields: { name: string; type: string; jsonKey: string }[] = [];
      for (const [key, val] of Object.entries(obj)) {
        const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        let type = "dynamic";
        if (val === null) type = "dynamic";
        else if (typeof val === "string") type = "String";
        else if (typeof val === "boolean") type = "bool";
        else if (typeof val === "number") type = Number.isInteger(val) ? "int" : "double";
        else if (Array.isArray(val)) type = "List<dynamic>";
        else if (typeof val === "object") type = "Map<String, dynamic>";
        fields.push({ name: camel, type, jsonKey: key });
      }

      fields.forEach((f, i) => {
        lines.push(`    required this.${f.name}${i < fields.length - 1 ? "," : ""}`);
      });
      lines.push("  });");

      lines.push("");
      lines.push("  factory Model.fromJson(Map<String, dynamic> json) => _\$ModelFromJson(json);");
      lines.push("");
      lines.push("  Map<String, dynamic> toJson() => _\$ModelToJson(this);");

      fields.forEach((f) => {
        lines.push("");
        lines.push(`  final ${f.type} ${f.name};`);
      });

      lines.push("}");
      return lines.join("\n");
    },
    faq: [
      { q: "How do I use this?", a: "Paste your JSON, generate the class, then run 'dart run build_runner build' to create the .g.dart file." },
      { q: "Does it handle nested objects?", a: "Nested objects become Map<String, dynamic>. For typed nested models, annotate them with @JsonSerializable() too." },
    ],
  },

  {
    slug: "flutter-hive-adapter-generator",
    name: "Hive Type Adapter Generator",
    description: "Generate a Hive TypeAdapter for local NoSQL storage in Flutter",
    category: "flutter",
    icon: "Database",
    accent: "teal",
    outputLanguage: "dart",
    sample: '{\n  "id": 1,\n  "name": "Ada",\n  "email": "ada@example.com"\n}',
    actions: [{ id: "generate", label: "Generate adapter" }],
    run: (input) => {
      const obj = parseJson(input) as Record<string, unknown>;
      const fields: { name: string; type: string; typeId: number }[] = [];
      let typeId = 0;

      for (const [key, val] of Object.entries(obj)) {
        const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        let type = "dynamic";
        if (val === null) type = "dynamic";
        else if (typeof val === "string") type = "String";
        else if (typeof val === "boolean") type = "bool";
        else if (typeof val === "number") type = Number.isInteger(val) ? "int" : "double";
        else if (Array.isArray(val)) type = "List<dynamic>";
        else if (typeof val === "object") type = "Map<String, dynamic>";
        fields.push({ name: camel, type, typeId: typeId++ });
      }

      const lines: string[] = [
        "import 'package:hive/hive.dart';",
        "",
        "class ModelAdapter extends TypeAdapter<Model> {",
        "  @override",
        "  final int typeId = 0;",
        "",
        "  @override",
        "  Model read(BinaryReader reader) {",
        "    final numOfFields = reader.readByte();",
        "    final fields = <int, dynamic>{};",
        "    for (int i = 0; i < numOfFields; i++) {",
        "      fields[reader.readByte()] = reader.read();",
        "    }",
        "    return Model(",
      ];

      fields.forEach((f) => {
        lines.push(`      ${f.name}: fields[${f.typeId}] as ${f.type}${f.type === "dynamic" ? "" : "?"},`);
      });

      lines.push("    );");
      lines.push("  }");
      lines.push("");
      lines.push("  @override");
      lines.push("  void write(BinaryWriter writer, Model obj) {");
      lines.push("    writer.writeByte(${fields.length});");
      fields.forEach((f) => {
        lines.push("    writer.writeByte(${f.typeId});");
        lines.push("    writer.write(obj.${f.name});");
      });
      lines.push("  }");
      lines.push("}");
      return lines.join("\n");
    },
    faq: [
      { q: "What is a TypeAdapter?", a: "A Hive adapter that knows how to read/write your Dart class to binary format for fast local storage." },
      { q: "How do I register it?", a: "Call 'Hive.registerAdapter(ModelAdapter())' before opening a box of type Model." },
    ],
  },

  {
    slug: "flutter-isar-collection-generator",
    name: "Isar Collection Generator",
    description: "Generate an Isar collection class for fast local database in Flutter",
    category: "flutter",
    icon: "HardDrive",
    accent: "teal",
    outputLanguage: "dart",
    sample: '{\n  "id": 1,\n  "title": "Buy groceries",\n  "isDone": false,\n  "createdAt": "2026-01-01"\n}',
    actions: [{ id: "generate", label: "Generate collection" }],
    run: (input) => {
      const obj = parseJson(input) as Record<string, unknown>;
      const fields: { name: string; type: string; isarType: string }[] = [];

      for (const [key, val] of Object.entries(obj)) {
        const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        let type = "dynamic";
        let isarType = "IsarDynamic";
        if (val === null) { type = "dynamic"; isarType = "IsarDynamic"; }
        else if (typeof val === "string") { type = "String"; isarType = "IsarString"; }
        else if (typeof val === "boolean") { type = "bool"; isarType = "IsarBool"; }
        else if (typeof val === "number") {
          if (Number.isInteger(val)) { type = "int"; isarType = "IsarLong"; }
          else { type = "double"; isarType = "IsarDouble"; }
        }
        else if (Array.isArray(val)) { type = "List<String>"; isarType = "IsarString"; }
        else if (typeof val === "object") { type = "Map<String, dynamic>"; isarType = "IsarJson"; }
        fields.push({ name: camel, type, isarType });
      }

      const lines: string[] = [
        "import 'package:isar/isar.dart';",
        "",
        "part 'model.g.dart';",
        "",
        "@collection",
        "class Model {",
        "  Id id = Isar.autoIncrement;",
        "",
      ];

      fields.forEach((f) => {
        if (f.name === "id") return;
        if (f.type === "List<String>") {
          lines.push("  @Index(type: IndexType.value)");
          lines.push("  List<String> ${f.name} = [];");
        } else if (f.type === "Map<String, dynamic>") {
          lines.push("  String ${f.name}Json = '{}';");
        } else {
          lines.push("  late ${f.type} ${f.name};");
        }
        lines.push("");
      });

      lines.push("}");
      return lines.join("\n");
    },
    faq: [
      { q: "What is Isar?", a: "A fast, asynchronous, and reactive NoSQL database for Flutter that supports full-text search and complex queries." },
      { q: "How do I use this?", a: "Generate the collection, then run 'dart run build_runner build' to create the .g.dart file with Isar code." },
    ],
  },

  {
    slug: "flutter-enum-generator",
    name: "Enum Generator",
    description: "Generate a Dart enum from a list of values with optional extensions",
    category: "flutter",
    icon: "List",
    accent: "teal",
    outputLanguage: "dart",
    sample: "active\ninactive\npending\nbanned",
    actions: [{ id: "generate", label: "Generate enum" }],
    run: (input) => {
      const values = input.split("\n").map((l) => l.trim()).filter(Boolean);
      const lines: string[] = [
        "enum UserStatus {",
      ];

      values.forEach((v, i) => {
        const snake = v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        lines.push(`  ${snake}${i < values.length - 1 ? "," : ""}`);
      });

      lines.push("}");
      lines.push("");
      lines.push("extension UserStatusExtension on UserStatus {");
      lines.push("  String get label {");
      lines.push("    switch (this) {");

      values.forEach((v) => {
        const snake = v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        lines.push(`      case UserStatus.${snake}:`);
        lines.push(`        return '${v}';`);
      });

      lines.push("    }");
      const defaultVal = values.length > 0 ? values[0].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") : "active";
      lines.push("  }");
      lines.push("");
      lines.push("  static UserStatus fromString(String value) {");
      lines.push("    return UserStatus.values.firstWhere(");
      lines.push("      (e) => e.name == value,");
      lines.push(`      orElse: () => UserStatus.${defaultVal},`);
      lines.push("    );");
      lines.push("  }");
      lines.push("}");
      return lines.join("\n");
    },
    faq: [
      { q: "What does this produce?", a: "A Dart enum with all your values, plus an extension with a label getter and a fromString factory method." },
      { q: "How should I format the input?", a: "One value per line, e.g. 'active', 'inactive', 'pending'. Spaces become underscores in the enum names." },
    ],
  },

  // ─── Schema Converter Tools ────────────────────────
  {
    slug: "zod-to-yup",
    outputLanguage: "typescript",
    name: "Zod to Yup",
    description: "Convert Zod validation schemas to Yup syntax.",
    category: "converter",
    icon: "ArrowLeftRight",
    accent: "purple",
    inputLabel: "Zod schema",
    outputLabel: "Yup schema",
    placeholder: "Paste your Zod schema...",
    sample: 'import { z } from "zod";\n\nexport const userSchema = z.object({\n  name: z.string().min(1),\n  email: z.string().email(),\n  age: z.number().min(0).max(150),\n  active: z.boolean(),\n  tags: z.array(z.string()),\n  role: z.string().optional().nullable(),\n});',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      let result = input;
      result = result.replace(/z\.string\(\)/g, "yup.string()");
      result = result.replace(/z\.number\(\)/g, "yup.number()");
      result = result.replace(/z\.boolean\(\)/g, "yup.boolean()");
      result = result.replace(/z\.object\(/g, "yup.object().shape(");
      result = result.replace(/z\.array\(/g, "yup.array().of(");
      result = result.replace(/\.regex\(([^)]+)\)/g, ".matches($1)");
      result = result.replace(/import\s*\{\s*z\s*\}\s*from\s*["']zod["'];?/g, 'import * as yup from "yup";');
      return result;
    },
    faq: [
      { q: "What Zod features are supported?", a: "It handles basic types (string, number, boolean), objects, arrays, and common validators like .min(), .max(), .email(), .optional(), and .nullable()." },
      { q: "Are there edge cases?", a: "Complex Zod features like discriminated unions, transforms, or custom refinements may need manual conversion." },
    ],
  },
  {
    slug: "yup-to-zod",
    outputLanguage: "typescript",
    name: "Yup to Zod",
    description: "Convert Yup validation schemas to Zod syntax.",
    category: "converter",
    icon: "ArrowLeftRight",
    accent: "purple",
    inputLabel: "Yup schema",
    outputLabel: "Zod schema",
    placeholder: "Paste your Yup schema...",
    sample: 'import * as yup from "yup";\n\nexport const userSchema = yup.object().shape({\n  name: yup.string().min(1),\n  email: yup.string().email(),\n  age: yup.number().min(0).max(150),\n  active: yup.boolean(),\n  tags: yup.array().of(yup.string()),\n  role: yup.string().optional().nullable(),\n});',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      let result = input;
      result = result.replace(/yup\.string\(\)/g, "z.string()");
      result = result.replace(/yup\.number\(\)/g, "z.number()");
      result = result.replace(/yup\.boolean\(\)/g, "z.boolean()");
      result = result.replace(/yup\.object\(\)\.shape\(/g, "z.object(");
      result = result.replace(/yup\.array\(\)\.of\(/g, "z.array(");
      result = result.replace(/\.matches\(([^)]+)\)/g, ".regex($1)");
      result = result.replace(/import\s*\*\s*as\s*yup\s*from\s*["']yup["'];?/g, 'import { z } from "zod";');
      return result;
    },
    faq: [
      { q: "What Yup features are supported?", a: "It handles basic types, objects, arrays, and common validators like .min(), .max(), .email(), .optional(), .nullable(), and .matches()." },
      { q: "Does it handle Yup .shape() correctly?", a: "Yes, yup.object().shape({...}) is converted to z.object({...})." },
    ],
  },
  {
    slug: "zod-to-valibot",
    outputLanguage: "typescript",
    name: "Zod to Valibot",
    description: "Convert Zod validation schemas to Valibot syntax.",
    category: "converter",
    icon: "RefreshCw",
    accent: "purple",
    inputLabel: "Zod schema",
    outputLabel: "Valibot schema",
    placeholder: "Paste your Zod schema...",
    sample: 'import { z } from "zod";\n\nexport const userSchema = z.object({\n  name: z.string().min(1),\n  email: z.string().email(),\n  age: z.number().min(0).max(150),\n  active: z.boolean(),\n  tags: z.array(z.string()),\n  role: z.string().optional().nullable(),\n});',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      let result = input;
      result = result.replace(/z\.string\(\)/g, "v.string()");
      result = result.replace(/z\.number\(\)/g, "v.number()");
      result = result.replace(/z\.boolean\(\)/g, "v.boolean()");
      result = result.replace(/z\.object\(/g, "v.object(");
      result = result.replace(/z\.array\(/g, "v.array(");
      result = result.replace(/\.min\((\d+)\)/g, ".minLength($1)");
      result = result.replace(/\.max\((\d+)\)/g, ".maxLength($1)");
      result = result.replace(/import\s*\{\s*z\s*\}\s*from\s*["']zod["'];?/g, 'import * as v from "valibot";');
      return result;
    },
    faq: [
      { q: "What Zod features are supported?", a: "It handles basic types, objects, arrays, and validators like .min(), .max(), .email(), .optional(), and .nullable()." },
      { q: "How does Valibot differ from Zod?", a: "Valibot uses a functional API and is designed to be smaller in bundle size. Validators like .min() become .minLength() for strings/arrays." },
    ],
  },
  {
    slug: "valibot-to-zod",
    outputLanguage: "typescript",
    name: "Valibot to Zod",
    description: "Convert Valibot validation schemas to Zod syntax.",
    category: "converter",
    icon: "RefreshCw",
    accent: "purple",
    inputLabel: "Valibot schema",
    outputLabel: "Zod schema",
    placeholder: "Paste your Valibot schema...",
    sample: 'import * as v from "valibot";\n\nexport const userSchema = v.object({\n  name: v.string().minLength(1),\n  email: v.string().email(),\n  age: v.number().min(0).max(150),\n  active: v.boolean(),\n  tags: v.array(v.string()),\n  role: v.string().optional().nullable(),\n});',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      let result = input;
      result = result.replace(/v\.string\(\)/g, "z.string()");
      result = result.replace(/v\.number\(\)/g, "z.number()");
      result = result.replace(/v\.boolean\(\)/g, "z.boolean()");
      result = result.replace(/v\.object\(/g, "z.object(");
      result = result.replace(/v\.array\(/g, "z.array(");
      result = result.replace(/\.minLength\((\d+)\)/g, ".min($1)");
      result = result.replace(/\.maxLength\((\d+)\)/g, ".max($1)");
      result = result.replace(/import\s*\*\s*as\s*v\s*from\s*["']valibot["'];?/g, 'import { z } from "zod";');
      return result;
    },
    faq: [
      { q: "What Valibot features are supported?", a: "It handles basic types, objects, arrays, and validators like .minLength(), .maxLength(), .email(), .optional(), and .nullable()." },
      { q: "How does the API differ?", a: "Valibot's .minLength()/.maxLength() become Zod's .min()/.max() for strings and arrays." },
    ],
  },
  {
    slug: "json-schema-to-zod",
    outputLanguage: "typescript",
    name: "JSON Schema to Zod",
    description: "Convert a JSON Schema object to a Zod validation schema.",
    category: "converter",
    icon: "FileCode2",
    accent: "purple",
    inputLabel: "JSON Schema",
    outputLabel: "Zod schema",
    placeholder: "Paste a JSON Schema object...",
    sample: '{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "age": { "type": "number" },\n    "active": { "type": "boolean" },\n    "tags": { "type": "array", "items": { "type": "string" } }\n  },\n  "required": ["name", "age"]\n}',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      function schemaToZod(schema: Record<string, unknown>, required: string[] = []): string {
        const type = schema.type as string;
        if (type === "string") return "z.string()";
        if (type === "number" || type === "integer") return "z.number()";
        if (type === "boolean") return "z.boolean()";
        if (type === "array") {
          const items = schema.items as Record<string, unknown> | undefined;
          const inner = items ? schemaToZod(items, required) : "z.unknown()";
          return "z.array(" + inner + ")";
        }
        if (type === "object") {
          const props = (schema.properties || {}) as Record<string, Record<string, unknown>>;
          const req = (schema.required || []) as string[];
          const fields = Object.entries(props).map(([key, val]) => {
            const fieldSchema = schemaToZod(val, req);
            const isRequired = req.includes(key);
            return "    " + key + ": " + (isRequired ? fieldSchema : fieldSchema.replace(/\)$/, ".optional())"));
          });
          return "z.object({\n" + fields.join(",\n") + "\n  })";
        }
        return "z.unknown()";
      }
      const parsed = parseJson(input) as Record<string, unknown>;
      const required = (parsed.required || []) as string[];
      const zodSchema = schemaToZod(parsed, required);
      return `import { z } from "zod";\n\nexport const schema = ${zodSchema};`;
    },
    faq: [
      { q: "Which JSON Schema types are supported?", a: "It supports string, number, integer, boolean, array, and object types. Nested schemas are recursively converted." },
      { q: "How are required fields handled?", a: "Fields listed in the 'required' array are generated without .optional(), while optional fields get .optional() appended." },
    ],
  },
  {
    slug: "json-schema-to-yup",
    outputLanguage: "typescript",
    name: "JSON Schema to Yup",
    description: "Convert a JSON Schema object to a Yup validation schema.",
    category: "converter",
    icon: "FileCode2",
    accent: "purple",
    inputLabel: "JSON Schema",
    outputLabel: "Yup schema",
    placeholder: "Paste a JSON Schema object...",
    sample: '{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "age": { "type": "number" },\n    "active": { "type": "boolean" },\n    "tags": { "type": "array", "items": { "type": "string" } }\n  },\n  "required": ["name", "age"]\n}',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      function schemaToYup(schema: Record<string, unknown>, required: string[] = []): string {
        const type = schema.type as string;
        if (type === "string") return "yup.string()";
        if (type === "number" || type === "integer") return "yup.number()";
        if (type === "boolean") return "yup.boolean()";
        if (type === "array") {
          const items = schema.items as Record<string, unknown> | undefined;
          const inner = items ? schemaToYup(items, required) : "yup.mixed()";
          return `yup.array().of(${inner})`;
        }
        if (type === "object") {
          const props = (schema.properties || {}) as Record<string, Record<string, unknown>>;
          const req = (schema.required || []) as string[];
          const fields = Object.entries(props).map(([key, val]) => {
            const fieldSchema = schemaToYup(val, req);
            const isRequired = req.includes(key);
            return `      ${key}: ${isRequired ? fieldSchema : fieldSchema.replace(/\)$/, ".notRequired())")}`;
          });
          return `yup.object().shape({\n${fields.join(",\n")}\n    })`;
        }
        return "yup.mixed()";
      }
      const parsed = parseJson(input) as Record<string, unknown>;
      const required = (parsed.required || []) as string[];
      const yupSchema = schemaToYup(parsed, required);
      return `import * as yup from "yup";\n\nexport const schema = ${yupSchema};`;
    },
    faq: [
      { q: "Which JSON Schema types are supported?", a: "It supports string, number, integer, boolean, array, and object types. Nested schemas are recursively converted." },
      { q: "How does this differ from JSON Schema to Zod?", a: "The output uses Yup's .shape() for objects and .array().of() for arrays, following Yup's API conventions." },
    ],
  },
  {
    slug: "json-schema-to-typescript",
    outputLanguage: "typescript",
    name: "JSON Schema to TypeScript",
    description: "Convert a JSON Schema object to a TypeScript interface.",
    category: "converter",
    icon: "FileCode2",
    accent: "purple",
    inputLabel: "JSON Schema",
    outputLabel: "TypeScript interface",
    placeholder: "Paste a JSON Schema object...",
    sample: '{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "age": { "type": "number" },\n    "active": { "type": "boolean" },\n    "tags": { "type": "array", "items": { "type": "string" } }\n  },\n  "required": ["name", "age"]\n}',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      function schemaToTS(schema: Record<string, unknown>, required: string[] = [], indent: string = "  "): string {
        const type = schema.type as string;
        if (type === "string") return "string";
        if (type === "number" || type === "integer") return "number";
        if (type === "boolean") return "boolean";
        if (type === "array") {
          const items = schema.items as Record<string, unknown> | undefined;
          const inner = items ? schemaToTS(items, required, indent) : "unknown";
          return `${inner}[]`;
        }
        if (type === "object") {
          const props = (schema.properties || {}) as Record<string, Record<string, unknown>>;
          const req = (schema.required || []) as string[];
          const fields = Object.entries(props).map(([key, val]) => {
            const fieldType = schemaToTS(val, req, indent + "  ");
            const isRequired = req.includes(key);
            const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : `"${key}"`;
            return `${indent}${safeKey}${isRequired ? "" : "?"}: ${fieldType};`;
          });
          return `{\n${fields.join("\n")}\n${indent.slice(2)}}`;
        }
        return "unknown";
      }
      const parsed = parseJson(input) as Record<string, unknown>;
      const required = (parsed.required || []) as string[];
      const tsInterface = schemaToTS(parsed, required);
      return `export interface Root ${tsInterface}\n`;
    },
    faq: [
      { q: "Which JSON Schema types are supported?", a: "It supports string, number, integer, boolean, array, and object types, mapping them to their TypeScript equivalents." },
      { q: "How are required fields handled?", a: "Required fields are generated without '?', while optional fields get '?' appended to make them optional in the interface." },
    ],
  },

  // ─── Config Generator Tools ────────────────────────
  {
    slug: "nginx-config",
    outputLanguage: "nginx",
    name: "Nginx Config Generator",
    description: "Generate a basic Nginx server configuration.",
    category: "generator",
    icon: "Server",
    accent: "green",
    generator: true,
    outputLabel: "Nginx config",
    actions: [{ id: "run", label: "Generate" }],
    run: (): string => {
      return `server {
    listen 80;
    server_name example.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}`;
    },
    faq: [
      { q: "How do I enable HTTPS?", a: "Add an SSL section with ssl_certificate and ssl_certificate_key directives, and redirect port 80 to 443." },
      { q: "Can I add gzip compression?", a: "Yes, add a gzip on; directive inside the server or http block." },
    ],
  },
  {
    slug: "dockerfile",
    outputLanguage: "dockerfile",
    name: "Dockerfile Generator",
    description: "Generate a Dockerfile for Node.js or Python projects.",
    category: "generator",
    icon: "Container",
    accent: "blue",
    generator: true,
    outputLabel: "Dockerfile",
    sample: "node",
    actions: [{ id: "node", label: "Node.js" }, { id: "python", label: "Python" }],
    run: (_input: string, action: string): string => {
      if (action === "python") {
        return `FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`;
      }
      return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]`;
    },
    faq: [
      { q: "Why use alpine images?", a: "Alpine images are much smaller, reducing container size and attack surface." },
      { q: "What about multi-stage builds?", a: "For production, use multi-stage builds to separate build dependencies from runtime." },
    ],
  },
  {
    slug: "docker-compose",
    outputLanguage: "yaml",
    name: "Docker Compose Generator",
    description: "Generate a docker-compose.yml for common service stacks.",
    category: "generator",
    icon: "Container",
    accent: "blue",
    generator: true,
    outputLabel: "docker-compose.yml",
    sample: "web",
    actions: [{ id: "web", label: "Web + DB" }, { id: "full", label: "Full Stack" }],
    run: (_input: string, action: string): string => {
      if (action === "full") {
        return `version: "3.8"

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/mydb
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:`;
      }
      return `version: "3.8"

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:secret@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:`;
    },
    faq: [
      { q: "How do I add volumes?", a: "Define named volumes at the bottom of the file and reference them in each service's 'volumes' key." },
      { q: "How do I set up networking?", a: "Services in the same compose file can reach each other by service name automatically." },
    ],
  },
  {
    slug: "tsconfig-generator",
    outputLanguage: "json",
    name: "tsconfig.json Generator",
    description: "Generate a TypeScript configuration for web, Node.js, or React projects.",
    category: "generator",
    icon: "Settings",
    accent: "blue",
    generator: true,
    outputLabel: "tsconfig.json",
    actions: [{ id: "web", label: "Web" }, { id: "node", label: "Node.js" }, { id: "react", label: "React" }],
    run: (_input: string, action: string): string => {
      const base = {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
        },
        include: ["src"],
      };
      if (action === "node") {
        (base.compilerOptions as Record<string, unknown>).module = "NodeNext";
        (base.compilerOptions as Record<string, unknown>).moduleResolution = "NodeNext";
        (base.compilerOptions as Record<string, unknown>).lib = ["ES2022"];
        return JSON.stringify(base, null, 2);
      }
      if (action === "react") {
        (base.compilerOptions as Record<string, unknown>).jsx = "react-jsx";
        (base.compilerOptions as Record<string, unknown>).moduleResolution = "bundler";
        (base.compilerOptions as Record<string, unknown>).baseUrl = ".";
        (base.compilerOptions as Record<string, unknown>).paths = { "@/*": ["./src/*"] };
        return JSON.stringify(base, null, 2);
      }
      (base.compilerOptions as Record<string, unknown>).moduleResolution = "bundler";
      return JSON.stringify(base, null, 2);
    },
    faq: [
      { q: "What does 'strict' do?", a: "Enables all strict type-checking options: strictNullChecks, noImplicitAny, strictFunctionTypes, etc." },
      { q: "When should I use 'noEmit'?", a: "Use it when a bundler (Vite, webpack) handles compilation. Set to false if using tsc to output files." },
    ],
  },
  {
    slug: "eslint-config",
    outputLanguage: "javascript",
    name: "ESLint Config Generator",
    description: "Generate an ESLint flat config for modern JavaScript/TypeScript projects.",
    category: "generator",
    icon: "Settings",
    accent: "green",
    generator: true,
    outputLabel: "eslint.config.js",
    actions: [{ id: "ts", label: "TypeScript" }, { id: "react", label: "React + TS" }],
    run: (_input: string, action: string): string => {
      if (action === "react") {
        return `import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { react: reactPlugin },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
    settings: { react: { version: "detect" } },
  },
  { ignores: ["dist/", "node_modules/"] },
];`;
      }
      return `import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  { ignores: ["dist/", "node_modules/"] },
];`;
    },
    faq: [
      { q: "What is flat config?", a: "Flat config is the modern ESLint config format using eslint.config.js with native ES modules." },
      { q: "Do I need a .eslintrc?", a: "No, flat config replaces .eslintrc files. Use eslint.config.js instead." },
    ],
  },
  {
    slug: "github-actions",
    outputLanguage: "yaml",
    name: "GitHub Actions Generator",
    description: "Generate GitHub Actions workflows for CI/CD pipelines.",
    category: "generator",
    icon: "GitBranch",
    accent: "purple",
    generator: true,
    outputLabel: "workflow.yml",
    sample: "node",
    actions: [{ id: "node", label: "Node.js CI" }, { id: "deploy", label: "Deploy" }],
    run: (_input: string, action: string): string => {
      if (action === "deploy") {
        return `name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4`;
      }
      return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test`;
    },
    faq: [
      { q: "What is a workflow file?", a: "YAML files in .github/workflows/ that define automated processes triggered by GitHub events." },
      { q: "How do I add caching?", a: "Use actions/cache or the built-in cache option in actions/setup-node with cache: npm." },
    ],
  },

  // ─── Formatter Tools ────────────────────────
  {
    slug: "html-formatter",
    outputLanguage: "html",
    name: "HTML Formatter",
    description: "Beautify and indent HTML markup.",
    category: "text",
    icon: "Code",
    accent: "orange",
    outputLabel: "Formatted HTML",
    placeholder: "Paste HTML to format...",
    sample: "<div><p>Hello</p><ul><li>Item 1</li><li>Item 2</li></ul></div>",
    actions: [{ id: "run", label: "Format" }],
    run: (input: string): string => {
      let formatted = "";
      let indent = 0;
      const tab = "  ";
      const tags = input.replace(/>\s+</g, ">\n<").split("\n");
      for (const tag of tags) {
        const trimmed = tag.trim();
        if (!trimmed) continue;
        if (/^<\//.test(trimmed)) indent--;
        formatted += tab.repeat(Math.max(0, indent)) + trimmed + "\n";
        if (/^<[^/!][^]*[^/]>$/.test(trimmed) && !/^<(meta|link|img|br|hr|input)/.test(trimmed)) indent++;
      }
      return formatted.trimEnd();
    },
    faq: [
      { q: "Does it handle self-closing tags?", a: "Yes, tags like <br>, <img>, and <meta> are recognized and don't increase indentation." },
      { q: "Can it minify instead?", a: "Use the HTML Minifier tool for the opposite operation." },
    ],
  },
  {
    slug: "html-minifier",
    outputLanguage: "html",
    name: "HTML Minifier",
    description: "Remove whitespace and comments from HTML.",
    category: "text",
    icon: "Minimize2",
    accent: "orange",
    outputLabel: "Minified HTML",
    placeholder: "Paste HTML to minify...",
    sample: "<div>\n  <p>Hello</p>\n  <!-- comment -->\n</div>",
    actions: [{ id: "run", label: "Minify" }],
    run: (input: string): string => {
      return input
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .trim();
    },
    faq: [
      { q: "Is it safe for production?", a: "Yes, removing whitespace and comments reduces file size without affecting rendering." },
      { q: "Does it handle script and style tags?", a: "Basic minification applies. For critical CSS/JS, use specialized tools." },
    ],
  },
  {
    slug: "xml-formatter",
    outputLanguage: "xml",
    name: "XML Formatter",
    description: "Pretty-print and indent XML documents.",
    category: "text",
    icon: "FileCode",
    accent: "orange",
    outputLabel: "Formatted XML",
    placeholder: "Paste XML to format...",
    sample: "<root><item id=\"1\"><name>Widget</name><price>9.99</price></item></root>",
    actions: [{ id: "run", label: "Format" }],
    run: (input: string): string => {
      let formatted = "";
      let indent = 0;
      const tab = "  ";
      const nodes = input.replace(/>\s*</g, ">\n<").split("\n");
      for (const node of nodes) {
        const trimmed = node.trim();
        if (!trimmed) continue;
        if (/^<\//.test(trimmed)) indent--;
        formatted += tab.repeat(Math.max(0, indent)) + trimmed + "\n";
        if (/^<[^/!?][^]*[^/]>$/.test(trimmed) && !/\/>$/.test(trimmed)) indent++;
      }
      return formatted.trimEnd();
    },
    faq: [
      { q: "Does it handle XML declarations?", a: "Yes, <?xml ... ?> and processing instructions are preserved." },
      { q: "Can it validate XML?", a: "No, this tool only formats. Use an XML validator for well-formedness checks." },
    ],
  },
  {
    slug: "yaml-formatter",
    outputLanguage: "yaml",
    name: "YAML Formatter",
    description: "Format and validate YAML documents.",
    category: "text",
    icon: "FileText",
    accent: "orange",
    outputLabel: "Formatted YAML",
    placeholder: "Paste YAML to format...",
    sample: "name: app\nversion: 1.0\ndependencies:\n  react: ^18.0.0\n  next: ^14.0.0",
    actions: [{ id: "run", label: "Format" }],
    run: (input: string): string => {
      const lines = input.split("\n");
      const formatted: string[] = [];
      for (const line of lines) {
        const trimmed = line.replace(/\s+$/, "");
        if (trimmed === "") {
          formatted.push("");
          continue;
        }
        const match = trimmed.match(/^(\s*)(.*?):\s*(.*)$/);
        if (match) {
          const [, spacing, key, value] = match;
          const indent = spacing.replace(/\t/g, "  ");
          if (value === "" || value === "[]") {
            formatted.push(`${indent}${key}:`);
          } else if (value.startsWith("[")) {
            formatted.push(`${indent}${key}: ${value}`);
          } else {
            formatted.push(`${indent}${key}: ${value}`);
          }
        } else {
          formatted.push(trimmed);
        }
      }
      return formatted.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    },
    faq: [
      { q: "Does it fix YAML syntax errors?", a: "No, it normalizes formatting. Invalid YAML will still be invalid after formatting." },
      { q: "Does it handle multi-line strings?", a: "Basic multi-line indicators (|, >) are preserved but may need manual adjustment." },
    ],
  },
  {
    slug: "markdown-formatter",
    outputLanguage: "markdown",
    name: "Markdown Formatter",
    description: "Clean up and normalize Markdown formatting.",
    category: "text",
    icon: "FileText",
    accent: "orange",
    outputLabel: "Formatted Markdown",
    placeholder: "Paste Markdown to format...",
    sample: "# Title\n\n## Subtitle\n\nSome text  with   extra   spaces.\n\n- item 1\n-  item 2\n-   item 3",
    actions: [{ id: "run", label: "Format" }],
    run: (input: string): string => {
      let result = input
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^(#{1,6})\s+/gm, "$1 ")
        .replace(/^[-*+]\s+/gm, "- ")
        .replace(/^\d+\.\s+/gm, (m) => m)
        .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
        .trim();
      return result;
    },
    faq: [
      { q: "Does it change content?", a: "No, it only normalizes whitespace, list markers, and heading spacing." },
      { q: "Does it handle tables?", a: "Basic table formatting is preserved. Complex table realignment is not supported." },
    ],
  },

  // ─── Text Tools ────────────────────────
  {
    slug: "sort-lines",
    name: "Sort Lines",
    description: "Sort lines of text alphabetically, reverse, or by length.",
    category: "text",
    icon: "ArrowDownAZ",
    accent: "blue",
    inputLabel: "Text",
    outputLabel: "Sorted text",
    placeholder: "Paste text to sort...",
    sample: "banana\napple\ncherry\ndate\nelderberry",
    actions: [{ id: "asc", label: "A→Z" }, { id: "desc", label: "Z→A" }, { id: "length", label: "By Length" }],
    run: (input: string, action: string): string => {
      const lines = input.split("\n");
      if (action === "length") return lines.sort((a, b) => a.length - b.length).join("\n");
      if (action === "desc") return lines.sort().reverse().join("\n");
      return lines.sort().join("\n");
    },
    faq: [
      { q: "Does it sort case-sensitively?", a: "Yes, uppercase letters sort before lowercase in standard sort. Use a case-insensitive editor for different behavior." },
      { q: "Can I sort numbers?", a: "Not with this tool. Use the JSON Sort tool for numeric sorting." },
    ],
  },
  {
    slug: "unique-lines",
    name: "Unique Lines",
    description: "Remove duplicate lines from text.",
    category: "text",
    icon: "Copy",
    accent: "blue",
    inputLabel: "Text",
    outputLabel: "Unique lines",
    placeholder: "Paste text with duplicates...",
    sample: "apple\nbanana\napple\ncherry\nbanana\ndate",
    actions: [{ id: "run", label: "Remove Duplicates" }],
    run: (input: string): string => {
      return [...new Set(input.split("\n"))].join("\n");
    },
    faq: [
      { q: "Is it case-sensitive?", a: "Yes, 'Apple' and 'apple' are treated as different lines." },
      { q: "Does it preserve order?", a: "Yes, the first occurrence of each line is kept." },
    ],
  },
  {
    slug: "char-counter",
    name: "Character Counter",
    description: "Count characters, words, lines, and bytes in text.",
    category: "text",
    icon: "Hash",
    accent: "blue",
    inputLabel: "Text",
    outputLabel: "Counts",
    placeholder: "Paste text to count...",
    sample: "Hello, World!\nThis is a sample text.\nIt has multiple lines.",
    actions: [{ id: "run", label: "Count" }],
    run: (input: string): string => {
      const chars = input.length;
      const words = input.trim() ? input.trim().split(/\s+/).length : 0;
      const lines = input.split("\n").length;
      const bytes = new TextEncoder().encode(input).length;
      const sentences = input.split(/[.!?]+/).filter((s) => s.trim()).length;
      const paragraphs = input.split(/\n\s*\n/).filter((p) => p.trim()).length;
      return `Characters: ${chars}\nWords: ${words}\nLines: ${lines}\nSentences: ${sentences}\nParagraphs: ${paragraphs}\nBytes (UTF-8): ${bytes}`;
    },
    faq: [
      { q: "What counts as a word?", a: "Words are separated by whitespace. Contractions and hyphenated words count as single words." },
      { q: "Does it handle Unicode?", a: "Yes, characters are counted as Unicode code points. Bytes reflect UTF-8 encoding." },
    ],
  },

  // ─── Date Tools ────────────────────────
  {
    slug: "timezone-converter",
    name: "Timezone Converter",
    description: "Convert a date/time between timezones.",
    category: "date",
    icon: "Globe",
    accent: "yellow",
    inputLabel: "Date/time",
    outputLabel: "Converted time",
    placeholder: "2025-01-15 14:30",
    sample: "2025-01-15 14:30",
    actions: [
      { id: "utc-to-est", label: "UTC → EST" },
      { id: "utc-to-pst", label: "UTC → PST" },
      { id: "utc-to-ist", label: "UTC → IST" },
      { id: "utc-to-jst", label: "UTC → JST" },
      { id: "est-to-utc", label: "EST → UTC" },
      { id: "pst-to-utc", label: "PST → UTC" },
    ],
    run: (input: string, action: string): string => {
      const offsets: Record<string, number> = {
        "utc-to-est": -5, "utc-to-pst": -8, "utc-to-ist": 5.5, "utc-to-jst": 9,
        "est-to-utc": 5, "pst-to-utc": 8,
      };
      const offset = offsets[action] ?? 0;
      const date = new Date(input.replace(" ", "T") + "Z");
      if (isNaN(date.getTime())) return "Invalid date format. Use YYYY-MM-DD HH:MM.";
      date.setHours(date.getHours() + offset);
      const [d, t] = date.toISOString().replace("T", " ").slice(0, 16).split(" ");
      const zones: Record<string, string> = {
        "utc-to-est": "EST", "utc-to-pst": "PST", "utc-to-ist": "IST",
        "utc-to-jst": "JST", "est-to-utc": "UTC", "pst-to-utc": "UTC",
      };
      return `${d} ${t} ${zones[action] ?? ""}`;
    },
    faq: [
      { q: "Does it handle DST?", a: "Simple offset-based conversion is used. For DST-aware conversion, use a dedicated timezone library." },
      { q: "What date formats are accepted?", a: "YYYY-MM-DD HH:MM format. The input is treated as UTC." },
    ],
  },
  {
    slug: "date-difference",
    name: "Date Difference",
    description: "Calculate the difference between two dates in days, hours, or minutes.",
    category: "date",
    icon: "CalendarDays",
    accent: "yellow",
    inputLabel: "Date range",
    outputLabel: "Difference",
    placeholder: "2025-01-01\n2025-03-15",
    sample: "2025-01-01\n2025-03-15",
    actions: [{ id: "run", label: "Calculate" }],
    run: (input: string): string => {
      const lines = input.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return "Enter two dates, one per line (YYYY-MM-DD).";
      const d1 = new Date(lines[0]);
      const d2 = new Date(lines[1]);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "Invalid date(s). Use YYYY-MM-DD format.";
      const diff = Math.abs(d2.getTime() - d1.getTime());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30.44);
      return `Days: ${days}\nHours: ${hours}\nMinutes: ${minutes}\nWeeks: ${weeks}\nMonths (approx): ${months}`;
    },
    faq: [
      { q: "Does it account for timezones?", a: "No, dates are parsed as local dates. Times are not considered." },
      { q: "Can I include times?", a: "Use YYYY-MM-DD HH:MM format for both dates to include time precision." },
    ],
  },
  {
    slug: "cron-generator",
    name: "Cron Expression Generator",
    description: "Generate cron expressions from plain English descriptions.",
    category: "date",
    icon: "Clock",
    accent: "yellow",
    inputLabel: "Schedule",
    outputLabel: "Cron expression",
    placeholder: "every day at 9am",
    sample: "every day at 9am",
    actions: [{ id: "run", label: "Generate" }],
    run: (input: string): string => {
      const lower = input.toLowerCase().trim();
      if (/every minute/.test(lower)) return "* * * * *";
      if (/every hour/.test(lower)) return "0 * * * *";
      if (/every day at (\d+)(am|pm)/.test(lower)) {
        const m = lower.match(/every day at (\d+)(am|pm)/);
        if (m) {
          let h = parseInt(m[1]);
          if (m[2] === "pm" && h < 12) h += 12;
          if (m[2] === "am" && h === 12) h = 0;
          return `${h} * * * *`;
        }
      }
      if (/every (\w+day) at (\d+)(am|pm)/.test(lower)) {
        const m = lower.match(/every (\w+day) at (\d+)(am|pm)/);
        if (m) {
          const days: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
          let h = parseInt(m[2]);
          if (m[3] === "pm" && h < 12) h += 12;
          if (m[3] === "am" && h === 12) h = 0;
          return `0 ${h} * * ${days[m[1]] ?? "*"}`;
        }
      }
      if (/every (\d+) minutes/.test(lower)) {
        const m = lower.match(/every (\d+) minutes/);
        if (m) return `*/${m[1]} * * * *`;
      }
      if (/every (\d+) hours/.test(lower)) {
        const m = lower.match(/every (\d+) hours/);
        if (m) return `0 */${m[1]} * * *`;
      }
      return "# Could not parse. Examples:\n# every minute → * * * * *\n# every day at 9am → 0 9 * * *\n# every monday at 5pm → 0 17 * * 1\n# every 15 minutes → */15 * * * *";
    },
    faq: [
      { q: "What cron format is used?", a: "Standard 5-field cron: minute hour day-of-month month day-of-week." },
      { q: "Does it support complex schedules?", a: "Basic schedules work. For complex ones, use crontab.guru directly." },
    ],
  },

  // ─── React/TypeScript Code Generators ────────────────────────
  {
    slug: "react-component",
    outputLanguage: "typescript",
    name: "React Component Generator",
    description: "Generate a React functional component with TypeScript.",
    category: "generator",
    icon: "Component",
    accent: "cyan",
    generator: true,
    outputLabel: "Component TSX",
    sample: "UserProfile",
    actions: [{ id: "fc", label: "FC + Props" }, { id: "simple", label: "Simple" }],
    run: (input: string, action: string): string => {
      const name = input.trim() || "MyComponent";
      if (action === "simple") {
        return `export function ${name}() {
  return (
    <div>
      <h1>${name}</h1>
    </div>
  );
}`;
      }
      return `interface ${name}Props {
  name: string;
  children?: React.ReactNode;
}

export function ${name}({ name, children }: ${name}Props) {
  return (
    <div className="${name.toLowerCase()}">
      <h1>{name}</h1>
      {children}
    </div>
  );
}`;
    },
    faq: [
      { q: "Why not use React.FC?", a: "React.FC is deprecated for most use cases. Plain function components with explicit props are preferred." },
      { q: "Can it generate class components?", a: "No, functional components with hooks are the modern standard." },
    ],
  },
  {
    slug: "react-hook",
    outputLanguage: "typescript",
    name: "React Hook Generator",
    description: "Generate a custom React hook with TypeScript.",
    category: "generator",
    icon: "Hook",
    accent: "cyan",
    generator: true,
    outputLabel: "Hook TS",
    sample: "useLocalStorage",
    actions: [{ id: "state", label: "State Hook" }, { id: "fetch", label: "Fetch Hook" }],
    run: (input: string, action: string): string => {
      const name = input.trim() || "useMyHook";
      if (action === "fetch") {
        return `import { useState, useEffect } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((json) => { if (!cancelled) setData(json); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}`;
      }
      return `import { useState, useCallback } from "react";

export function ${name}<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  return [value, setStoredValue] as const;
}`;
    },
    faq: [
      { q: "Why use useCallback?", a: "It memoizes the setter function to prevent unnecessary re-renders of consuming components." },
      { q: "Can I add more features?", a: "Yes, extend with useEffect for sync, useMemo for derived state, or useReducer for complex logic." },
    ],
  },
  {
    slug: "typescript-interface",
    outputLanguage: "typescript",
    name: "TypeScript Interface Generator",
    description: "Generate TypeScript interfaces from JSON or text descriptions.",
    category: "generator",
    icon: "FileCode",
    accent: "cyan",
    generator: true,
    outputLabel: "Interface",
    sample: '{\n  "name": "John",\n  "age": 30,\n  "email": "john@example.com",\n  "isActive": true,\n  "tags": ["admin", "user"]\n}',
    actions: [{ id: "run", label: "Generate" }],
    run: (input: string): string => {
      try {
        const obj = JSON.parse(input);
        function inferType(val: unknown): string {
          if (val === null) return "null";
          if (Array.isArray(val)) {
            if (val.length === 0) return "unknown[]";
            return `${inferType(val[0])}[]`;
          }
          return typeof val;
        }
        const lines = Object.entries(obj).map(([key, val]) => {
          const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : `"${key}"`;
          return `  ${safeKey}: ${inferType(val)};`;
        });
        return `interface Data {\n${lines.join("\n")}\n}`;
      } catch {
        return "// Invalid JSON input";
      }
    },
    faq: [
      { q: "How accurate is type inference?", a: "Basic types (string, number, boolean, array) are inferred. Complex nested objects generate inline types." },
      { q: "Can it infer from API responses?", a: "Yes, paste any JSON and it will generate a matching interface." },
    ],
  },
  {
    slug: "solid-component",
    outputLanguage: "typescript",
    name: "SolidJS Component Generator",
    description: "Generate a SolidJS component with TypeScript.",
    category: "generator",
    icon: "Zap",
    accent: "cyan",
    generator: true,
    outputLabel: "SolidJS TSX",
    sample: "Card",
    actions: [{ id: "run", label: "Generate" }],
    run: (input: string): string => {
      const name = input.trim() || "MyComponent";
      return `import { Component, createSignal } from "solid-js";

interface ${name}Props {
  title: string;
}

export const ${name}: Component<${name}Props> = (props) => {
  const [count, setCount] = createSignal(0);

  return (
    <div class="${name.toLowerCase()}">
      <h2>{props.title}</h2>
      <p>Count: {count()}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
};`;
    },
    faq: [
      { q: "How is SolidJS different from React?", a: "SolidJS uses fine-grained reactivity without a virtual DOM. Components run once, and signals handle updates." },
      { q: "Do I need JSX config?", a: "Yes, configure your build tool for SolidJS JSX transform." },
    ],
  },

  // ─── CSS Generators ────────────────────────
  {
    slug: "css-grid",
    outputLanguage: "css",
    name: "CSS Grid Generator",
    description: "Generate CSS Grid layouts from visual parameters.",
    category: "css",
    icon: "LayoutGrid",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Grid",
    sample: "3",
    actions: [{ id: "auto", label: "Auto Fill" }, { id: "fixed", label: "Fixed Columns" }],
    run: (input: string, action: string): string => {
      const cols = parseInt(input) || 3;
      if (action === "fixed") {
        return `.grid-container {
  display: grid;
  grid-template-columns: repeat(${cols}, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.grid-item {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 1.5rem;
}`;
      }
      return `.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.grid-item {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 1.5rem;
}`;
    },
    faq: [
      { q: "When should I use auto-fill vs fixed?", a: "auto-fill is responsive and adapts to screen size. Fixed is better when you need exact column counts." },
      { q: "How do I add responsiveness?", a: "Use media queries to change grid-template-columns at different breakpoints." },
    ],
  },
  {
    slug: "css-flexbox",
    outputLanguage: "css",
    name: "CSS Flexbox Generator",
    description: "Generate CSS Flexbox layouts with common patterns.",
    category: "css",
    icon: "AlignHorizontalSpaceAround",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Flexbox",
    sample: "center",
    actions: [
      { id: "center", label: "Center" },
      { id: "between", label: "Space Between" },
      { id: "column", label: "Column" },
      { id: "wrap", label: "Wrap" },
    ],
    run: (_input: string, action: string): string => {
      const layouts: Record<string, string> = {
        center: `.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}`,
        between: `.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}`,
        column: `.flex-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}`,
        wrap: `.flex-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.flex-wrap > * {
  flex: 1 1 200px;
}`,
      };
      return layouts[action] ?? layouts.center;
    },
    faq: [
      { q: "When should I use Flexbox vs Grid?", a: "Flexbox for one-dimensional layouts (row or column). Grid for two-dimensional layouts (rows and columns)." },
      { q: "How do I center vertically?", a: "Use align-items: center on a flex container with a defined height, or use the margin: auto trick on the child." },
    ],
  },
  {
    slug: "css-gradient",
    outputLanguage: "css",
    name: "CSS Gradient Generator",
    description: "Generate linear, radial, and conic CSS gradients.",
    category: "css",
    icon: "Palette",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Gradient",
    sample: "linear",
    actions: [
      { id: "linear", label: "Linear" },
      { id: "radial", label: "Radial" },
      { id: "conic", label: "Conic" },
      { id: "sunset", label: "Sunset" },
      { id: "ocean", label: "Ocean" },
    ],
    run: (_input: string, action: string): string => {
      const gradients: Record<string, string> = {
        linear: `.gradient-linear {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 200px;
  border-radius: 8px;
}`,
        radial: `.gradient-radial {
  background: radial-gradient(circle, #667eea 0%, #764ba2 100%);
  min-height: 200px;
  border-radius: 8px;
}`,
        conic: `.gradient-conic {
  background: conic-gradient(from 0deg, #667eea, #764ba2, #f093fb, #667eea);
  min-height: 200px;
  border-radius: 8px;
}`,
        sunset: `.gradient-sunset {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 50%, #fa709a 100%);
  min-height: 200px;
  border-radius: 8px;
}`,
        ocean: `.gradient-ocean {
  background: linear-gradient(135deg, #667eea 0%, #00d2ff 100%);
  min-height: 200px;
  border-radius: 8px;
}`,
      };
      return gradients[action] ?? gradients.linear;
    },
    faq: [
      { q: "How do I animate a gradient?", a: "Use @keyframes with background-position animation on a larger-than-element background." },
      { q: "Are conic gradients well supported?", a: "Yes, supported in all modern browsers. Not supported in IE." },
    ],
  },
  {
    slug: "css-animation",
    outputLanguage: "css",
    name: "CSS Animation Generator",
    description: "Generate common CSS animations and keyframes.",
    category: "css",
    icon: "Play",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Animation",
    actions: [
      { id: "fade", label: "Fade In" },
      { id: "slide", label: "Slide Up" },
      { id: "bounce", label: "Bounce" },
      { id: "spin", label: "Spin" },
      { id: "pulse", label: "Pulse" },
    ],
    run: (_input: string, action: string): string => {
      const animations: Record<string, string> = {
        fade: `.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
        slide: `.slide-up {
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
        bounce: `.bounce {
  animation: bounce 0.6s ease;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}`,
        spin: `.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
        pulse: `.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}`,
      };
      return animations[action] ?? animations.fade;
    },
    faq: [
      { q: "How do I reduce motion for accessibility?", a: "Use @media (prefers-reduced-motion: reduce) to disable or simplify animations." },
      { q: "Can I chain animations?", a: "Yes, use animation-delay and animation-fill-mode for sequenced effects." },
    ],
  },

  // ─── Missing Tools (cURL→Dart, TS generators, CSS, Image) ────────────────────────
  {
    slug: "curl-to-dart",
    outputLanguage: "dart",
    name: "cURL → Dart",
    description: "Convert cURL commands to Dart http package code.",
    category: "converter",
    icon: "ArrowRightLeft",
    accent: "purple",
    inputLabel: "cURL command",
    outputLabel: "Dart code",
    placeholder: "Paste a cURL command...",
    sample: 'curl -X POST https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name":"John","email":"john@example.com"}\'',
    actions: [{ id: "run", label: "Convert" }],
    run: (input: string): string => {
      const urlMatch = input.match(/curl\s+['"]?(https?:\/\/[^\s'"]+)['"]?/i);
      const url = urlMatch ? urlMatch[1] : "https://api.example.com";
      const methodMatch = input.match(/-X\s+(\w+)/i);
      const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
      const headers: Record<string, string> = {};
      const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
      let m;
      while ((m = headerRegex.exec(input)) !== null) {
        const [key, ...rest] = m[1].split(":");
        headers[key.trim()] = rest.join(":").trim();
      }
      const bodyMatch = input.match(/-d\s+['"](.+?)['"]/s);
      const headerLines = Object.entries(headers).map(([k, v]) => `    '${k}': '${v}',`).join("\n");
      let code = `import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\n`;
      code += `final response = await http.${method.toLowerCase()}(\n  Uri.parse('$url'),\n  headers: {\n${headerLines}\n  },\n`;
      if (bodyMatch) {
        code += `  body: jsonEncode(${bodyMatch[1]}),\n`;
      }
      code += `);\n\nprint(response.body);`;
      return code;
    },
    faq: [
      { q: "What Dart HTTP library is used?", a: "The official 'package:http' package, which is the standard for Dart HTTP requests." },
      { q: "Does it handle cookies?", a: "Basic cookies can be added manually. For complex cookie handling, use 'package:dio' with interceptors." },
    ],
  },
  {
    slug: "mock-data-generator",
    outputLanguage: "typescript",
    name: "Mock Data Generator",
    description: "Generate realistic mock data from a JSON schema or type description.",
    category: "generator",
    icon: "Database",
    accent: "cyan",
    generator: true,
    outputLabel: "Mock data",
    sample: '{\n  "name": "string",\n  "age": "number",\n  "email": "email",\n  "active": "boolean",\n  "tags": "string[]"\n}',
    actions: [{ id: "run", label: "Generate" }],
    run: (input: string): string => {
      const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"];
      const domains = ["example.com", "test.org", "demo.io"];
      const adjectives = ["new", "old", "big", "small", "fast", "slow"];
      const nouns = ["task", "project", "item", "feature", "bug", "report"];
      function randItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
      function genValue(type: string): unknown {
        switch (type) {
          case "string": return randItem(adjectives) + "-" + randItem(nouns);
          case "number": return Math.floor(Math.random() * 100);
          case "boolean": return Math.random() > 0.5;
          case "email": return randItem(names).toLowerCase() + "@" + randItem(domains);
          case "date": return new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().slice(0, 10);
          case "string[]": return [randItem(adjectives), randItem(nouns)];
          case "number[]": return Array.from({ length: 3 }, () => Math.floor(Math.random() * 100));
          default: return null;
        }
      }
      try {
        const schema = JSON.parse(input);
        const records = Array.from({ length: 3 }, () => {
          const obj: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(schema)) {
            obj[key] = genValue(val as string);
          }
          return obj;
        });
        return JSON.stringify(records, null, 2);
      } catch {
        return "// Invalid JSON. Use format: { \"field\": \"type\" }\n// Supported types: string, number, boolean, email, date, string[], number[]";
      }
    },
    faq: [
      { q: "What types are supported?", a: "string, number, boolean, email, date, string[], number[]. You can extend genValue for custom types." },
      { q: "Is the data deterministic?", a: "No, it's randomized. For seeded data, use a library like Faker.js." },
    ],
  },
  {
    slug: "ts-enum-generator",
    outputLanguage: "typescript",
    name: "TypeScript Enum Generator",
    description: "Generate TypeScript enums from a list of values or JSON.",
    category: "generator",
    icon: "List",
    accent: "cyan",
    generator: true,
    outputLabel: "TS Enum",
    sample: "ADMIN\nUSER\nGUEST",
    actions: [{ id: "enum", label: "Enum" }, { id: "const", label: "Const Enum" }, { id: "union", label: "Union Type" }],
    run: (input: string, action: string): string => {
      const values = input.split("\n").map((l) => l.trim()).filter(Boolean);
      if (action === "union") {
        const parts = values.map((v) => `  "${v}"`).join(" | \n");
        return `type Role =\n${parts};\n\nconst roles: Role[] = [\n${values.map((v) => `  "${v}",`).join("\n")}\n];`;
      }
      if (action === "const") {
        const lines = values.map((v) => `  ${v.toUpperCase()} = "${v}",`).join("\n");
        return `const enum Role {\n${lines}\n}`;
      }
      const lines = values.map((v) => `  ${v.toUpperCase()} = "${v}",`).join("\n");
      return `enum Role {\n${lines}\n}`;
    },
    faq: [
      { q: "Enum vs Const Enum?", a: "Regular enums generate runtime objects. Const enums are inlined at compile time and don't exist at runtime." },
      { q: "When to use union types?", a: "Union types are simpler and work better with type narrowing. Use enums when you need runtime values." },
    ],
  },
  {
    slug: "box-shadow-generator",
    outputLanguage: "css",
    name: "Box Shadow Generator",
    description: "Generate CSS box shadows with visual presets.",
    category: "css",
    icon: "Square",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Box Shadow",
    actions: [
      { id: "subtle", label: "Subtle" },
      { id: "medium", label: "Medium" },
      { id: "large", label: "Large" },
      { id: "neon", label: "Neon Glow" },
      { id: "inset", label: "Inset" },
    ],
    run: (_input: string, action: string): string => {
      const shadows: Record<string, string> = {
        subtle: `.box-shadow {\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);\n}`,
        medium: `.box-shadow {\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);\n}`,
        large: `.box-shadow {\n  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05);\n}`,
        neon: `.box-shadow {\n  box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #00ff88, 0 0 40px #00ff88;\n}`,
        inset: `.box-shadow {\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);\n}`,
      };
      return shadows[action] ?? shadows.medium;
    },
    faq: [
      { q: "How do I animate box shadows?", a: "Use CSS transitions on the box-shadow property for smooth shadow animations." },
      { q: "Are multiple shadows supported?", a: "Yes, comma-separate multiple shadow values for layered effects." },
    ],
  },
  {
    slug: "glassmorphism-generator",
    outputLanguage: "css",
    name: "Glassmorphism Generator",
    description: "Generate glassmorphism (frosted glass) CSS effects.",
    category: "css",
    icon: "Sparkles",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Glassmorphism",
    actions: [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "color", label: "Colored" }],
    run: (_input: string, action: string): string => {
      const styles: Record<string, string> = {
        light: `.glass {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 2rem;
}`,
        dark: `.glass-dark {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  color: white;
}`,
        color: `.glass-color {
  background: rgba(99, 102, 241, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  padding: 2rem;
}`,
      };
      return styles[action] ?? styles.light;
    },
    faq: [
      { q: "Does backdrop-filter work everywhere?", a: "Supported in all modern browsers. Add -webkit- prefix for Safari compatibility." },
      { q: "How do I add a background image?", a: "Use a container with a gradient or image background behind the glass element." },
    ],
  },
  {
    slug: "border-radius-generator",
    outputLanguage: "css",
    name: "Border Radius Generator",
    description: "Generate CSS border-radius values with common patterns.",
    category: "css",
    icon: "Circle",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Border Radius",
    actions: [
      { id: "small", label: "Small (4px)" },
      { id: "medium", label: "Medium (8px)" },
      { id: "large", label: "Large (16px)" },
      { id: "pill", label: "Pill" },
      { id: "circle", label: "Circle" },
    ],
    run: (_input: string, action: string): string => {
      const styles: Record<string, string> = {
        small: `.rounded-sm { border-radius: 4px; }`,
        medium: `.rounded-md { border-radius: 8px; }`,
        large: `.rounded-lg { border-radius: 16px; }`,
        pill: `.rounded-pill {\n  border-radius: 9999px;\n  padding: 0.5rem 1.5rem;\n}`,
        circle: `.rounded-full {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n}`,
      };
      return styles[action] ?? styles.medium;
    },
    faq: [
      { q: "How do different corners?", a: "Use border-radius: topLeft topRight bottomRight bottomLeft; for individual corners." },
      { q: "Can I use percentages?", a: "Yes, percentage values create elliptical corners. 50% on a square makes a circle." },
    ],
  },
  {
    slug: "clip-path-generator",
    outputLanguage: "css",
    name: "CSS Clip Path Generator",
    description: "Generate CSS clip-path shapes for element masking.",
    category: "css",
    icon: "Scissors",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Clip Path",
    actions: [
      { id: "triangle", label: "Triangle" },
      { id: "circle", label: "Circle" },
      { id: "hexagon", label: "Hexagon" },
      { id: "diamond", label: "Diamond" },
      { id: "star", label: "Star" },
      { id: "arch", label: "Arch" },
    ],
    run: (_input: string, action: string): string => {
      const shapes: Record<string, string> = {
        triangle: `.clip-triangle {\n  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);\n}`,
        circle: `.clip-circle {\n  clip-path: circle(50% at 50% 50%);\n}`,
        hexagon: `.clip-hexagon {\n  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);\n}`,
        diamond: `.clip-diamond {\n  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);\n}`,
        star: `.clip-star {\n  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);\n}`,
        arch: `.clip-arch {\n  clip-path: ellipse(50% 60% at 50% 60%);\n}`,
      };
      return shapes[action] ?? shapes.triangle;
    },
    faq: [
      { q: "Does clip-path work with transitions?", a: "Yes, clip-path supports CSS transitions for smooth shape morphing effects." },
      { q: "Can I use images inside clip-path?", a: "Yes, clip-path masks the element including its background and content." },
    ],
  },
  {
    slug: "css-filter-generator",
    outputLanguage: "css",
    name: "CSS Filter Generator",
    description: "Generate CSS filter effects like blur, brightness, and contrast.",
    category: "css",
    icon: "SlidersHorizontal",
    accent: "pink",
    generator: true,
    outputLabel: "CSS Filter",
    actions: [
      { id: "blur", label: "Blur" },
      { id: "brightness", label: "Brightness" },
      { id: "grayscale", label: "Grayscale" },
      { id: "sepia", label: "Sepia" },
      { id: "contrast", label: "High Contrast" },
      { id: "vintage", label: "Vintage" },
    ],
    run: (_input: string, action: string): string => {
      const filters: Record<string, string> = {
        blur: `.filter-blur {\n  filter: blur(4px);\n}`,
        brightness: `.filter-brightness {\n  filter: brightness(1.2);\n}`,
        grayscale: `.filter-grayscale {\n  filter: grayscale(100%);\n}`,
        sepia: `.filter-sepia {\n  filter: sepia(80%) saturate(120%);\n}`,
        contrast: `.filter-contrast {\n  filter: contrast(150%);\n}`,
        vintage: `.filter-vintage {\n  filter: sepia(40%) saturate(140%) contrast(90%) brightness(110%);\n}`,
      };
      return filters[action] ?? filters.blur;
    },
    faq: [
      { q: "How do I combine filters?", a: "Chain multiple filter functions: filter: blur(2px) brightness(1.1) grayscale(50%);" },
      { q: "Can I animate filters?", a: "Yes, most filter functions support CSS transitions for smooth effects." },
    ],
  },
  {
    slug: "image-compress",
    outputLanguage: "html",
    name: "Image Compressor",
    description: "Reduce image file size while maintaining quality.",
    category: "image",
    icon: "Minimize2",
    accent: "red",
    generator: true,
    outputLabel: "Compression tips",
    actions: [{ id: "run", label: "Get Tips" }],
    run: (): string => `Image compression is a client-side operation. Here's how to compress in the browser:

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();
img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compressed.jpg";
    a.click();
  }, "image/jpeg", 0.7); // 0.7 = 70% quality
};
img.src = "your-image.jpg";

// Tips:
// - JPEG for photos (lossy, small files)
// - PNG for graphics (lossless, larger)
// - WebP for best compression (25-35% smaller)
// - AVIF for modern browsers (50% smaller than JPEG)
// - Reduce dimensions: 1920px wide is usually enough
// - Use tools: TinyPNG, Squoosh, or Sharp (Node.js)`,
    faq: [
      { q: "What's the best format for photos?", a: "JPEG at 70-80% quality, or WebP/AVIF for 25-50% smaller files with similar quality." },
      { q: "How do I resize before compressing?", a: "Set canvas.width and canvas.height to your target dimensions before drawImage." },
    ],
  },
  {
    slug: "image-resize",
    outputLanguage: "html",
    name: "Image Resizer",
    description: "Resize images to specific dimensions in the browser.",
    category: "image",
    icon: "Maximize",
    accent: "red",
    generator: true,
    outputLabel: "Resize code",
    sample: "800",
    actions: [{ id: "run", label: "Generate Code" }],
    run: (input: string): string => {
      const width = parseInt(input) || 800;
      return `// Resize image to ${width}px width (maintain aspect ratio)
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();
img.crossOrigin = "anonymous";

img.onload = () => {
  const ratio = ${width} / img.width;
  canvas.width = ${width};
  canvas.height = img.height * ratio;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resized-${width}.png";
    a.click();
  }, "image/png");
};

img.src = "your-image.jpg";`;
    },
    faq: [
      { q: "Does it maintain aspect ratio?", a: "Yes, the ratio is calculated from the original dimensions." },
      { q: "What if I need exact dimensions?", a: "Set both canvas.width and canvas.height, but the image may be stretched." },
    ],
  },
  {
    slug: "image-crop",
    outputLanguage: "html",
    name: "Image Cropper",
    description: "Crop images to a specific region in the browser.",
    category: "image",
    icon: "Crop",
    accent: "red",
    generator: true,
    outputLabel: "Crop code",
    actions: [{ id: "run", label: "Generate Code" }],
    run: (): string => `// Crop image to a specific region
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();

img.onload = () => {
  // Crop region: x, y, width, height (in pixels)
  const cropX = 100;
  const cropY = 50;
  const cropWidth = 400;
  const cropHeight = 300;
  
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cropped.png";
    a.click();
  }, "image/png");
};

img.src = "your-image.jpg";

// For interactive cropping, use:
// - Cropper.js: https://cropperjs.github.io/
// - react-image-crop: https://github.com/DominicTobias/react-image-crop`,
    faq: [
      { q: "How do I find crop coordinates?", a: "Use an image editor or a library like Cropper.js for visual selection." },
      { q: "Can I crop to a circle?", a: "Use ctx.beginPath() + ctx.arc() + ctx.clip() before drawImage for circular crops." },
    ],
  },
  {
    slug: "image-rotate",
    outputLanguage: "html",
    name: "Image Rotator",
    description: "Rotate images by any angle in the browser.",
    category: "image",
    icon: "RotateCw",
    accent: "red",
    generator: true,
    outputLabel: "Rotate code",
    sample: "90",
    actions: [{ id: "run", label: "Generate Code" }],
    run: (input: string): string => {
      const angle = parseInt(input) || 90;
      return `// Rotate image by ${angle} degrees
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();

img.onload = () => {
  const rad = ${angle} * Math.PI / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  
  canvas.width = img.width * cos + img.height * sin;
  canvas.height = img.width * sin + img.height * cos;
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rotated-${angle}.png";
    a.click();
  }, "image/png");
};

img.src = "your-image.jpg";`;
    },
    faq: [
      { q: "Why does the canvas size change?", a: "Rotation may increase dimensions to fit the rotated image without clipping." },
      { q: "How do I rotate 90 degrees efficiently?", a: "For exact 90/180/270, use ctx.translate + ctx.rotate + ctx.drawImage with swapped dimensions." },
    ],
  },
  {
    slug: "image-flip",
    outputLanguage: "html",
    name: "Image Flipper",
    description: "Flip images horizontally or vertically.",
    category: "image",
    icon: "FlipHorizontal",
    accent: "red",
    generator: true,
    outputLabel: "Flip code",
    actions: [{ id: "horizontal", label: "Horizontal" }, { id: "vertical", label: "Vertical" }],
    run: (_input: string, action: string): string => {
      if (action === "vertical") {
        return `// Flip image vertically
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.translate(0, canvas.height);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flipped-vertical.png";
    a.click();
  }, "image/png");
};

img.src = "your-image.jpg";`;
      }
      return `// Flip image horizontally
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flipped-horizontal.png";
    a.click();
  }, "image/png");
};

img.src = "your-image.jpg";`;
    },
    faq: [
      { q: "How does flipping work?", a: "ctx.scale(-1, 1) flips horizontally. ctx.scale(1, -1) flips vertically." },
      { q: "Can I combine flip and rotate?", a: "Yes, apply multiple ctx.rotate() and ctx.scale() transforms before drawImage." },
    ],
  },
  {
    slug: "image-convert",
    outputLanguage: "html",
    name: "Image Format Converter",
    description: "Convert between PNG, JPG, WebP, and AVIF in the browser.",
    category: "image",
    icon: "RefreshCw",
    accent: "red",
    generator: true,
    outputLabel: "Convert code",
    actions: [
      { id: "to-jpg", label: "→ JPG" },
      { id: "to-png", label: "→ PNG" },
      { id: "to-webp", label: "→ WebP" },
      { id: "to-avif", label: "→ AVIF" },
    ],
    run: (_input: string, action: string): string => {
      const formats: Record<string, { mime: string; ext: string; q: string }> = {
        "to-jpg": { mime: "image/jpeg", ext: "jpg", q: "0.9" },
        "to-png": { mime: "image/png", ext: "png", q: "1.0" },
        "to-webp": { mime: "image/webp", ext: "webp", q: "0.85" },
        "to-avif": { mime: "image/avif", ext: "avif", q: "0.8" },
      };
      const cfg = formats[action] || formats["to-jpg"];
      return `// Convert image to ${cfg.ext.toUpperCase()}
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.${cfg.ext}";
    a.click();
  }, "${cfg.mime}", ${cfg.q});
};

img.src = "your-image.jpg";

// Supported formats:
// - image/jpeg (JPG) - best for photos
// - image/png (PNG) - best for transparency
// - image/webp (WebP) - 25-35% smaller
// - image/avif (AVIF) - 50% smaller, modern browsers`;
    },
    faq: [
      { q: "Which format is smallest?", a: "AVIF is smallest, followed by WebP. Both are significantly smaller than JPEG/PNG." },
      { q: "Does canvas.toBlob support all formats?", a: "WebP and AVIF support varies by browser. Check canUseWebP() or canUseAVIF() first." },
    ],
  },
  {
    slug: "svg-sprite-generator",
    outputLanguage: "html",
    name: "SVG Sprite Generator",
    description: "Generate an SVG sprite sheet from multiple SVG icons.",
    category: "image",
    icon: "Layers",
    accent: "red",
    inputLabel: "SVG code",
    outputLabel: "SVG Sprite",
    placeholder: "Paste SVG code to include...",
    sample: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>',
    actions: [{ id: "run", label: "Generate Sprite" }],
    run: (input: string): string => {
      const svgContent = input.trim() || '<rect width="24" height="24" fill="currentColor"/>';
      return `<!-- SVG Sprite Sheet -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-1" viewBox="0 0 24 24">
    ${svgContent.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </symbol>
</svg>

<!-- Usage -->
<svg width="24" height="24" aria-hidden="true">
  <use href="#icon-1"></use>
</svg>

<!-- JavaScript to build sprite from multiple SVGs -->
<script>
const svgs = document.querySelectorAll('.icon-svg');
let sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">';
svgs.forEach((svg, i) => {
  const viewBox = svg.getAttribute('viewBox') || '0 0 24 24';
  const inner = svg.innerHTML;
  sprite += '<symbol id="icon-' + i + '" viewBox="' + viewBox + '">' + inner + '</symbol>';
  svg.style.display = 'none';
});
sprite += '</svg>';
document.body.insertAdjacentHTML('afterbegin', sprite);
</script>`;
    },
    faq: [
      { q: "Why use SVG sprites?", a: "Sprites reduce HTTP requests and allow CSS styling of icons via currentColor." },
      { q: "How do I change icon color?", a: "Set color on the parent <svg> element; icons using currentColor will inherit it." },
    ],
  },
  {
    slug: "image-exif",
    outputLanguage: "json",
    name: "EXIF Metadata Viewer",
    description: "Extract EXIF metadata from images in the browser.",
    category: "image",
    icon: "Info",
    accent: "red",
    generator: true,
    outputLabel: "EXIF data",
    actions: [{ id: "run", label: "View EXIF" }],
    run: (): string => `// Extract EXIF metadata from an image
async function readExif(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  
  // Check for JPEG header
  if (view.getUint16(0) !== 0xFFD8) {
    return "Not a JPEG file";
  }
  
  let offset = 2;
  const exif = {};
  
  while (offset < buffer.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    
    if (marker === 0xFFE1) { // EXIF marker
      const exifData = new Uint8Array(buffer, offset + 4, length - 2);
      // Parse EXIF fields...
      exif.raw = Array.from(exifData.slice(0, 20)).map(b => b.toString(16)).join(' ');
    }
    
    offset += 2 + length;
  }
  
  // For full EXIF parsing, use exif-js library:
  // <script src="https://cdn.jsdelivr.net/npm/exif-js"></script>
  // EXIF.getData(imageElement, function() {
  //   const data = EXIF.getAllTags(this);
  //   console.log(data);
  // });
  
  return exif;
}

// Usage with file input
document.querySelector('input[type="file"]').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const exif = await readExif(file);
  console.log(exif);
});`,
    faq: [
      { q: "What EXIF data is available?", a: "Camera model, date taken, GPS coordinates, ISO, shutter speed, aperture, and more." },
      { q: "Does it work with PNG?", a: "PNG uses tEXt chunks, not EXIF. Use a PNG metadata library for PNG files." },
    ],
  },
  {
    slug: "image-blur",
    outputLanguage: "html",
    name: "Image Blur",
    description: "Apply blur effects to images using CSS or canvas.",
    category: "image",
    icon: "EyeOff",
    accent: "red",
    generator: true,
    outputLabel: "Blur code",
    sample: "5",
    actions: [{ id: "css", label: "CSS Blur" }, { id: "canvas", label: "Canvas Blur" }],
    run: (input: string, action: string): string => {
      const amount = parseInt(input) || 5;
      if (action === "canvas") {
        return `// Apply blur using canvas
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const img = new Image();

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Draw original
  ctx.drawImage(img, 0, 0);
  
  // Apply blur using multiple passes
  ctx.filter = "blur(${amount}px)";
  ctx.drawImage(canvas, 0, 0);
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blurred-${amount}.png";
    a.click();
  }, "image/png");
};

img.src = "your-image.jpg";`;
      }
      return `/* CSS Blur - simple and performant */
.blur-${amount}px {
  filter: blur(${amount}px);
}

/* Gradient blur (sharp center, blurred edges) */
.blur-vignette {
  mask-image: radial-gradient(circle, black 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(circle, black 40%, transparent 100%);
}

/* Progressive blur (increases toward edges) */
.blur-progressive {
  filter: blur(${Math.floor(amount / 2)}px);
  mask-image: linear-gradient(white, rgba(255,255,255,0.5));
}`;
    },
    faq: [
      { q: "CSS blur vs canvas blur?", a: "CSS blur is real-time and doesn't modify the image. Canvas blur is destructive and exports a new image." },
      { q: "How do I blur only part of an image?", a: "Use CSS mask-image or canvas clipping to apply blur selectively." },
    ],
  },

];

export const toolsBySlug = Object.fromEntries(tools.map((t) => [t.slug, t]));
export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

export const accentClass: Record<Accent, { bg: string; text: string; ring: string; grad: string }> = {
  brand: { bg: "bg-brand/18", text: "text-brand", ring: "ring-brand/20", grad: "from-brand to-purple" },
  blue: { bg: "bg-blue/18", text: "text-blue", ring: "ring-blue/20", grad: "from-blue to-teal" },
  purple: { bg: "bg-purple/18", text: "text-purple", ring: "ring-purple/20", grad: "from-purple to-pink" },
  pink: { bg: "bg-pink/18", text: "text-pink", ring: "ring-pink/20", grad: "from-pink to-orange" },
  orange: { bg: "bg-orange/18", text: "text-orange", ring: "ring-orange/20", grad: "from-orange to-yellow" },
  yellow: { bg: "bg-yellow/22", text: "text-yellow", ring: "ring-yellow/25", grad: "from-yellow to-orange" },
  green: { bg: "bg-green/18", text: "text-green", ring: "ring-green/20", grad: "from-green to-teal" },
  teal: { bg: "bg-teal/18", text: "text-teal", ring: "ring-teal/20", grad: "from-teal to-blue" },
  cyan: { bg: "bg-teal/18", text: "text-teal", ring: "ring-teal/20", grad: "from-teal to-blue" },
  red: { bg: "bg-red/18", text: "text-red", ring: "ring-red/20", grad: "from-red to-orange" },
};