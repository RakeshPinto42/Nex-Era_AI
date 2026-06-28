import NexCode from "@/components/code/NexCode";

// NEX Code — local AI coding runtime (Cursor / Claude Code style). Native folder
// picker via the File System Access API; real permission validation, indexing,
// project overview, search and AI edits (diff preview → apply). Reuses the
// /api/code/agent route (AI Router) + Event Bus. No pasted paths.
export default function CodeWorkspacePage() {
  return <NexCode />;
}
