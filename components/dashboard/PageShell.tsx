"use client";

import { motion } from "framer-motion";

export default function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-black/45">{subtitle}</p>
            )}
          </div>
          {action}
        </motion.div>
        {children}
      </div>
    </div>
  );
}

export function GridReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
