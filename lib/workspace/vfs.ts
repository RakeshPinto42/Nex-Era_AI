// Virtual file system for the local workspace agent.
// Browser-only sandbox: a real folder pick (File System Access API) seeds names
// where supported; otherwise this sample project is loaded. Edits/runs are
// simulated in memory — no disk or Python process is touched.

export type VFile = {
  path: string; // e.g. "src/main.py"
  content: string;
  language: string;
  /** Marks a file the agent created/modified this session. */
  dirty?: boolean;
};

export type VFS = Record<string, VFile>;

export function langFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py":
      return "python";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "csv":
      return "csv";
    case "txt":
      return "text";
    default:
      return "text";
  }
}

export function seedWorkspace(): VFS {
  const files: Omit<VFile, "language">[] = [
    {
      path: "README.md",
      content: `# Sales Analytics Workspace

Local project managed by Mesh Coder.

- \`data/\` — raw inputs
- \`src/\` — pipeline + dashboard
- \`reports/\` — generated outputs
`,
    },
    {
      path: "requirements.txt",
      content: "pandas==2.2.2\nmatplotlib==3.9.0\ntabulate==0.9.0\n",
    },
    {
      path: "data/sales.csv",
      content: `rep,region,deals,revenue,rate
A. Mehta,West,32,420000,0.06
J. Park,East,28,358000,0.055
L. Diaz,North,24,310000,0.05
S. Khan,South,19,244000,0.05
`,
    },
    {
      path: "src/main.py",
      content: `import pandas as pd
from utils import commission

def main():
    df = pd.read_csv("data/sales.csv")
    df["commission"] = df.apply(
        lambda r: commission(r.revenue, r.rate), axis=1
    )
    print(df.to_string(index=False))

if __name__ == "__main__":
    main()
`,
    },
    {
      path: "src/utils.py",
      content: `def commission(revenue: float, rate: float) -> float:
    """Flat commission on revenue."""
    return round(revenue * rate, 2)
`,
    },
  ];

  const vfs: VFS = {};
  for (const f of files) {
    vfs[f.path] = { ...f, language: langFor(f.path) };
  }
  return vfs;
}

// ---- tree derivation ----

export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
};

export function buildTree(vfs: VFS): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };

  for (const path of Object.keys(vfs).sort()) {
    const parts = path.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      let node = cur.children!.find((c) => c.name === part);
      if (!node) {
        node = {
          name: part,
          path: childPath,
          isDir: !isLast,
          children: isLast ? undefined : [],
        };
        cur.children!.push(node);
      }
      cur = node;
    });
  }

  // dirs first, then files, each alphabetical
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
    );
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(root.children!);
  return root.children!;
}
