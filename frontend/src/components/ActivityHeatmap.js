import { useState } from "react";
import { Flame, Mail, CalendarDays, Zap } from "lucide-react";

const HEAT_LEVELS = [
  { color: "#e2e8f0", label: "None" },
  { color: "#fed7aa", label: "1" },
  { color: "#fb923c", label: "2-3" },
  { color: "#f97316", label: "4-5" },
  { color: "#c2410c", label: "6+" },
];

function getHeatColor(count, maxCount) {
  if (count === 0 || !count) return HEAT_LEVELS[0].color;
  const ratio = count / Math.max(maxCount, 1);
  if (ratio <= 0.15) return HEAT_LEVELS[1].color;
  if (ratio <= 0.35) return HEAT_LEVELS[2].color;
  if (ratio <= 0.65) return HEAT_LEVELS[3].color;
  return HEAT_LEVELS[4].color;
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    const firstActiveDay = week.days.find(d => d.date);
    if (!firstActiveDay) return;
    const month = new Date(firstActiveDay.date).toLocaleDateString("en-GB", { month: "short" });
    if (month !== lastMonth) {
      labels.push({ index: wi, label: month });
      lastMonth = month;
    }
  });
  return labels;
}

export default function ActivityHeatmap({ data }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data) return null;

  const { weeks, max_count, total_emails, active_days, streak } = data;
  const monthLabels = getMonthLabels(weeks);

  const summaryStats = [
    { icon: Mail, label: "Emails sent (year)", value: total_emails, color: "text-orange-500" },
    { icon: CalendarDays, label: "Active days", value: active_days, color: "text-blue-500" },
    { icon: Flame, label: "Current streak", value: `${streak}d`, color: "text-red-500" },
  ];

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      data-testid="activity-heatmap"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-900">
        <Zap className="w-4 h-4 text-orange-400" />
        <h2 className="font-bold text-sm text-white uppercase tracking-widest">
          Recruiting Activity
        </h2>
        <span className="ml-auto text-xs text-slate-400 font-medium">Past 12 months</span>
      </div>

      <div className="p-5">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {summaryStats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <p className="text-xl font-black text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: 680 }}>
            {/* Month labels */}
            <div className="flex mb-1 pl-8">
              {weeks.map((week, wi) => {
                const label = monthLabels.find(m => m.index === wi);
                return (
                  <div key={wi} style={{ width: 13, marginRight: 2, flexShrink: 0 }}>
                    {label && (
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        {label.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid: day labels + cells */}
            <div className="flex gap-0">
              {/* Day labels */}
              <div className="flex flex-col gap-0.5 mr-1.5 justify-start">
                {DAY_LABELS.map((d, i) => (
                  <div key={i} style={{ height: 11, fontSize: 9 }} className="text-slate-400 flex items-center leading-none">
                    {d}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              <div className="flex gap-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.days.map((day, di) => {
                      const bg = day.date
                        ? getHeatColor(day.count, max_count)
                        : "#f8fafc";
                      const isToday = day.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div
                          key={di}
                          data-testid={day.date ? `heatmap-day-${day.date}` : undefined}
                          style={{
                            width: 11,
                            height: 11,
                            backgroundColor: bg,
                            borderRadius: 2,
                            border: isToday ? "1.5px solid #f97316" : "none",
                            cursor: day.date ? "pointer" : "default",
                            transition: "transform 0.1s",
                          }}
                          onMouseEnter={e => {
                            if (!day.date) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltip({
                              date: day.date,
                              count: day.count,
                              x: rect.left + window.scrollX,
                              y: rect.top + window.scrollY,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pl-8">
              <span className="text-xs text-slate-400 mr-1">Less</span>
              {HEAT_LEVELS.map(({ color }) => (
                <div key={color} style={{ width: 11, height: 11, backgroundColor: color, borderRadius: 2 }} />
              ))}
              <span className="text-xs text-slate-400 ml-1">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl"
          style={{ left: tooltip.x - 50, top: tooltip.y - 52 }}
        >
          <p className="font-bold">
            {tooltip.count === 0 ? "No emails" : `${tooltip.count} email${tooltip.count !== 1 ? "s" : ""}`}
          </p>
          <p className="text-slate-400">
            {new Date(tooltip.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}
