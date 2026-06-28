/**
 * Command Center UI kit — the single warm-white component library.
 * Import from "@/components/uikit" everywhere; do not hand-roll card/button
 * markup in pages.
 */

export {
  Button,
  Spinner,
  Card,
  Section,
  Widget,
  Chip,
  Badge,
  Avatar,
  Stat,
  Progress,
  ProgressRing,
  Search,
  Notification,
  Input,
  Textarea,
  Select,
  Skeleton,
  EmptyState,
  inputBase,
  cx,
} from "./core";

export { Sparkline, ChartSkeleton, Legend, SERIES } from "./charts";
export type { SeriesColor } from "./charts";

export {
  ToolCard,
  AgentCard,
  LanguageCard,
  InvestmentRow,
  ActivityFeed,
  Feed,
  Table,
} from "./cards";
export type { ActivityItem } from "./cards";
