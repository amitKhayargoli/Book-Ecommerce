"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DashboardTasks, DashboardTask } from "../types";

interface ActionQueueProps {
  tasks: DashboardTasks;
}

const severityColor: Record<DashboardTask["severity"], string> = {
  high: "bg-romance",
  medium: "bg-drama",
  low: "bg-text-secondary/60",
};

export function ActionQueue({ tasks }: ActionQueueProps) {
  const groups: { title: string; items: DashboardTask[] }[] = [
    { title: "Out of stock", items: tasks.outOfStockItems },
    { title: "Low stock", items: tasks.lowStockItems },
    { title: "Ready to publish", items: tasks.draftPublishCandidates },
    { title: "Orders needing attention", items: tasks.ordersNeedingAttention },
    { title: "Catalog gaps", items: tasks.catalogGaps },
  ];

  return (
    <section className="rounded-3xl border border-white/5 bg-card/40 backdrop-blur-3xl p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-1">
            Needs attention
          </p>
          <h2 className="text-base md:text-lg font-semibold">Operational queue</h2>
        </div>
      </div>

      <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
        {groups.map((group) => {
          if (!group.items.length) return null;
          return (
            <div key={group.title} className="space-y-2">
              <h3 className="text-[0.7rem] uppercase tracking-[0.26em] text-text-secondary/80">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.02 }}
                  >
                    <TaskCard task={task} />
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TaskCard({ task }: { task: DashboardTask }) {
  const color = severityColor[task.severity];

  const content = (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.01] px-4 py-3 hover:bg-white/[0.03] transition-colors">
      <div className="flex gap-3">
        <span className={`mt-1 h-2 w-2 rounded-full ${color}`} />
        <div>
          <p className="text-xs font-semibold">{task.title}</p>
          <p className="mt-1 text-[0.75rem] text-text-secondary">{task.description}</p>
        </div>
      </div>
      <span className="text-[0.65rem] text-text-secondary/80 uppercase tracking-[0.24em]">
        View
      </span>
    </div>
  );

  if (task.href) {
    return <Link href={task.href}>{content}</Link>;
  }

  return content;
}

