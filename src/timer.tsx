import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

/**
 * Timer Kerja (WITA)
 * - Sabtu: jam pulang otomatis 14:00
 * - Minggu: Libur (tanpa countdown) + badge "Libur Minggu" di header
 */

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

// ====== Default Config ======
const DEFAULT_REST: TimeCfg = { hours: 11, minutes: 30, label: "Waktunya istirahat" };
const DEFAULT_HOME: TimeCfg = { hours: 16, minutes: 0, label: "Waktunya pulang" };

// ===== Utils zona waktu & format =====
function nowInTZ(tz: string = WITA_TZ): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {} as Record<string, string>);

  const iso = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  return new Date(iso);
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

function formatBadgeTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} WITA`;
}

// ===== Hook countdown =====
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

// ===== UI: kartu libur =====
function HolidayCard() {
  return (
    <article className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Hari Minggu — Libur 🎈</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
          WITA
        </span>
      </div>

      <div className="mt-4">
        <div className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums text-green-600 dark:text-green-400">
          00:00:00
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Selamat beristirahat! Countdown kerja akan kembali besok (Senin).
        </p>
        <div className="mt-4 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-2 w-full rounded-full bg-green-500 animate-pulse" />
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
}): ReactElement {
  // Panggil hooks SELALU dalam urutan yang sama
  const istirahat = useCountdown(restAt);

  // Tentukan hari dari waktu yang sudah reaktif
  const day = istirahat.nowWita.getDay(); // 0 = Minggu, 6 = Sabtu
  const isSunday = day === 0;
  const isSaturday = day === 6;

  // Jam pulang efektif (Sabtu → 14:00)
  const effectiveHome: TimeCfg = isSaturday
    ? { ...homeAt, hours: 14, minutes: 0, label: `${homeAt.label} (Sabtu)` }
    : homeAt;

  // Selalu panggil hook, tapi saat Minggu kita tidak akan merender kartunya
  const pulang = useCountdown(effectiveHome);

  // Badge jam dinamis
  const restBadge = formatBadgeTime(restAt.hours, restAt.minutes);
  const homeBadge = formatBadgeTime(effectiveHome.hours, effectiveHome.minutes);

  // Style badge Libur Minggu
  const sundayBadgeStyle =
    "ml-3 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";

  return (
    <div className="min-h-svh bg-gradient-to-b from-gray-50 to-white text-gray-900 dark:from-gray-900 dark:to-gray-950 dark:text-gray-100">
      <main className="max-w-3xl mx-auto px-4 py-10 min-h-inherit flex flex-col">
        <header className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Timer Kerja (WITA)</h1>
            {isSunday && <span className={sundayBadgeStyle}>Libur Minggu</span>}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Zona waktu: <span className="font-medium">Asia/Makassar (WITA, UTC+08:00)</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500" aria-live="polite">
            {istirahat.nowWita.toLocaleString("id-ID", { timeZone: WITA_TZ, hour12: false })}
          </p>
        </header>

        {isSunday ? (
          <section className="grid gap-6 md:grid-cols-2 grow">
            <HolidayCard />
            <HolidayCard />
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 grow">
            <Card title="Menuju Istirahat" badge={restBadge} data={istirahat} accent="amber" />
            <Card title="Menuju Pulang" badge={homeBadge} data={pulang} accent="emerald" />
          </section>
        )}

        <footer className="mt-10 text-xs text-gray-500 dark:text-gray-500">
          {isSunday
            ? "Hari Minggu dianggap libur. Countdown kerja akan aktif kembali saat hari berganti (00:00 WITA)."
            : "Setelah target lewat, status tetap Selesai sampai hari berganti (00:00 WITA)."}
        </footer>
      </main>
    </div>
  );
}
