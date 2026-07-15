"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface FlashSignal {
  key: number;
  type: "gold" | "void";
}

export default function ScreenFlash({ signal }: { signal: FlashSignal | null }) {
  return (
    <AnimatePresence>
      {signal && (
        <motion.div
          key={signal.key}
          className={cn(
            "pointer-events-none fixed inset-0 z-50",
            signal.type === "gold"
              ? "bg-[radial-gradient(circle,transparent_40%,rgba(250,204,21,0.35)_100%)]"
              : "bg-[radial-gradient(circle,transparent_25%,rgba(88,28,135,0.55)_100%)]",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, times: [0, 0.35, 1] }}
        />
      )}
    </AnimatePresence>
  );
}
