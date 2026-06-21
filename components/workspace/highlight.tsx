import { Fragment, type ReactNode } from "react";

// Tiny, dependency-free tokenizer. Good enough for an IDE-style preview;
// not a full grammar. Colors: comment, string, keyword, number, func.

const KEYWORDS: Record<string, string[]> = {
  python: ["def","class","import","from","return","if","else","elif","for","while","in","and","or","not","lambda","with","as","try","except","raise","True","False","None","self"],
  javascript: ["const","let","var","function","return","if","else","for","while","import","from","export","default","class","new","await","async","try","catch","throw","true","false","null","undefined"],
  typescript: ["const","let","var","function","return","if","else","for","while","import","from","export","default","class","new","await","async","try","catch","throw","interface","type","extends","implements","true","false","null","undefined"],
  json: ["true","false","null"],
};

const C = {
  comment: "#5c6573",
  string: "#7fe7b0",
  keyword: "#7fb4ff",
  number: "#f0c178",
  func: "#3b82f6",
  text: "#c7cdd9",
};

function tokenizeLine(line: string, lang: string, key: number): ReactNode {
  // whole-line comment / markdown heading
  const commentMatch =
    lang === "python"
      ? /^(\s*#.*)$/.exec(line)
      : lang === "markdown"
        ? /^(\s*#.*)$/.exec(line)
        : /^(\s*\/\/.*)$/.exec(line);
  if (commentMatch) {
    return (
      <span key={key} style={{ color: lang === "markdown" ? C.func : C.comment }}>
        {line}
      </span>
    );
  }

  const kws = KEYWORDS[lang] ?? [];
  // split keeping strings, numbers, words, and the rest
  const parts = line.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+\.?\d*\b|[A-Za-z_]\w*)/);
  return (
    <Fragment key={key}>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^["']/.test(p)) return <span key={i} style={{ color: C.string }}>{p}</span>;
        if (/^\d/.test(p)) return <span key={i} style={{ color: C.number }}>{p}</span>;
        if (kws.includes(p)) return <span key={i} style={{ color: C.keyword }}>{p}</span>;
        if (/^[A-Za-z_]\w*$/.test(p) && parts[i + 1]?.startsWith("("))
          return <span key={i} style={{ color: C.func }}>{p}</span>;
        return <span key={i} style={{ color: C.text }}>{p}</span>;
      })}
    </Fragment>
  );
}

export function highlight(code: string, lang: string): ReactNode {
  const lines = code.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {tokenizeLine(line, lang, i)}
      {i < lines.length - 1 ? "\n" : null}
    </Fragment>
  ));
}
