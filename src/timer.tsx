import { useEffect, useRef, useState } from "react";


const WITA_TZ = "Asia/Makassar";

// ====== Types ======
type TimeCfg = { hours: number; minutes: number; label: string };

interface CountdownState {
  nowWita: Date;
  targetToday: Date;
  diffText: string;
  status: string;
  progress: number;
  isCompleted: boolean;
}

// ====== Default Config (ubah di sini kalau pakai default, atau kirim via props) ======
const DEFAULT_REST: TimeCfg = { hours: 11, minutes: 30, label: "Waktunya istirahat" };
const DEFAULT_HOME: TimeCfg = { hours: 16, minutes: 0, label: "Waktunya pulang" };

// ===== Utils zona waktu =====
function nowInTZ(tz: string = WITA_TZ): Date {
  return new Date(
    new Date().toLocaleString("en-CA", { timeZone: tz, hour12: false })
  );
}
function targetForDate(hours: number, minutes: number, baseDate: Date): Date {
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}
function formatDiff(ms: number): { text: string; days: number } {
  let total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  total %= 86400;
  const h = Math.floor(total / 3600);
  total %= 3600;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return {
    text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    days,
  };
}
function progressToTarget(target: Date, startHour: number = 8): number {
  const witaNow = nowInTZ(WITA_TZ);
  const dayStart = new Date(witaNow);
  dayStart.setHours(startHour, 0, 0, 0);

  if (target.toDateString() !== witaNow.toDateString()) {
    const temp = new Date(target);
    dayStart.setFullYear(temp.getFullYear(), temp.getMonth(), temp.getDate());
    dayStart.setHours(startHour, 0, 0, 0);
  }

  const span = target.getTime() - dayStart.getTime();
  const done = Math.max(0, Math.min(target.getTime() - witaNow.getTime(), span));
  const pct = Math.max(0, Math.min(100, (100 * (span - done)) / (span || 1)));
  return Number.isFinite(pct) ? pct : 0;
}

// ===== Hook countdown (berhenti sampai ganti hari) =====
function useCountdown({ hours, minutes, label }: TimeCfg): CountdownState {
  const [state, setState] = useState<CountdownState>(() => {
    const now = nowInTZ(WITA_TZ);
    const today = targetForDate(hours, minutes, now);
    const isCompleted = now.getTime() >= today.getTime();
    const { text } = formatDiff(Math.max(0, today.getTime() - now.getTime()));
    return {
      nowWita: now,
      targetToday: today,
      diffText: isCompleted ? "00:00:00" : text,
      status: isCompleted
        ? `${label} selesai 🎉`
        : `Target hari ini, ${today.toLocaleString("id-ID", {
            timeZone: WITA_TZ,
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}`,
      progress: isCompleted ? 100 : progressToTarget(today),
      isCompleted,
    };
  });

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function tick(): void {
      const now = nowInTZ(WITA_TZ);
      const today = targetForDate(hours, minutes, now);
      const isCompleted = now.getTime() >= today.getTime();

      let diffText = "00:00:00";
      let status: string;
      let progress: number;

      if (isCompleted) {
        status = `${label} selesai 🎉 · hitung ulang setelah 00:00 WITA`;
        progress = 100;
      } else {
        const diff = today.getTime() - now.getTime();
        diffText = formatDiff(diff).text;
        status = `Target hari ini, ${today.toLocaleString("id-ID", {
          timeZone: WITA_TZ,
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`;
        progress = progressToTarget(today);
      }

      setState({
        nowWita: now,
        targetToday: today,
        diffText,
        status,
        progress,
        isCompleted,
      });
    }

    tick();
    timerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [hours, minutes, label]);

  return state;
}

// ===== UI Card =====
function Card({
  title,
  badge,
  data,
  accent,
}: {
  title: string;
  badge: string;
  data: CountdownState;
  accent: "amber" | "emerald";
}) {
  const barColor = accent === "amber" ? "bg-amber-500" : "bg-emerald-500";
  const badgeColor =
    accent === "amber"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";

  const cardGlow = data.isCompleted
    ? "ring-2 ring-offset-2 ring-green-500/50 dark:ring-green-400/40"
    : "border border-gray-200 dark:border-gray-800";

  return (
    <article
      className={`relative rounded-2xl ${cardGlow} bg-white/70 dark:bg-gray-900/50 backdrop-blur p-6 shadow-sm`}
    >
      {data.isCompleted && (
        <div className="pointer-events-none absolute inset-0 animate-pulse opacity-70 select-none text-lg">
          <div className="absolute top-2 left-3">🎉</div>
          <div className="absolute top-6 right-6">✨</div>
          <div className="absolute bottom-4 left-10">🎊</div>
          <div className="absolute bottom-2 right-4">🥳</div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {data.isCompleted ? `${title} — Selesai 🎉` : title}
        </h2>
        <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>
      </div>

      <div className="mt-4">
        <div
          className={`text-4xl md:text-5xl font-bold tabular-nums tracking-tight ${
            data.isCompleted ? "text-green-600 dark:text-green-400" : ""
          }`}
        >
          {data.diffText}
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{data.status}</p>

        <div className="mt-4 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              data.isCompleted ? "bg-green-500 animate-pulse" : barColor
            }`}
            style={{ width: `${data.isCompleted ? 100 : data.progress}%` }}
            aria-label={data.isCompleted ? "Selesai" : "Progress menuju target"}
          />
        </div>
      </div>
    </article>
  );
}

// ===== Komponen Utama =====
export default function TimerWITA({
  restAt = DEFAULT_REST,
  homeAt = DEFAULT_HOME,
}: {
  restAt?: TimeCfg;
  homeAt?: TimeCfg;
}): JSX.Element {
  const istirahat = useCountdown(restAt);
  const pulang = useCountdown(homeAt);

  return (
    <div className="min-h-svh bg-gradient-to-b from-gray-50 to-white text-gray-900 dark:from-gray-900 dark:to-gray-950 dark:text-gray-100">
      <main className="max-w-3xl mx-auto px-4 py-10 min-h-inherit flex flex-col">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Timer Kerja (WITA)</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Zona waktu: <span className="font-medium">Asia/Makassar (WITA, UTC+08:00)</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500" aria-live="polite">
            {istirahat.nowWita.toLocaleString("id-ID", { timeZone: WITA_TZ, hour12: false })}
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 grow">
          <Card title="Menuju Istirahat" badge="11:30 WITA" data={istirahat} accent="amber" />
          <Card title="Menuju Pulang" badge="16:00 WITA" data={pulang} accent="emerald" />
        </section>

        <footer className="mt-10 text-xs text-gray-500 dark:text-gray-500">
          Setelah target lewat, status tetap <em>Selesai</em> sampai hari berganti (00:00 WITA).
        </footer>
      </main>
    </div>
  );
}
