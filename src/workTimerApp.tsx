import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import TimerWITA from "./timer.tsx"; // pakai path Anda

// ===== Types dari file Anda =====
type TimeCfg = { hours: number; minutes: number; label: string };

type UserCfg = {
  rest: string; // "HH:MM"
  home: string; // "HH:MM"
};

const STORAGE_KEY = "worktimer_cfg";

function parseTimeToCfg(t: string, label: string): TimeCfg {
  // t: "HH:MM"
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  const hours = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0;
  const minutes = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
  return { hours, minutes, label };
}

function isValidTimeStr(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

// ===== Modal sederhana (Tailwind) =====
function Modal({
  isOpen,
  onClose,
  onSave,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cfg: UserCfg) => void;
  initial: UserCfg;
}): ReactElement | null {
  const [rest, setRest] = useState(initial.rest);
  const [home, setHome] = useState(initial.home);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    setRest(initial.rest);
    setHome(initial.home);
    setErr("");
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!isValidTimeStr(rest) || !isValidTimeStr(home)) {
      setErr("Format waktu harus HH:MM (24 jam).");
      return;
    }
    onSave({ rest, home });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 id="modal-title" className="text-lg font-semibold">
          Setel Jam Istirahat & Pulang
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gunakan format 24 jam (HH:MM).
        </p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Jam Istirahat</span>
            <input
              type="time"
              step={60}
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Jam Pulang</span>
            <input
              type="time"
              step={60}
              value={home}
              onChange={(e) => setHome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:opacity-90 dark:bg-gray-100 dark:text-white"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== App Wrapper =====
export default function WorkTimerApp(): ReactElement {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userCfg, setUserCfg] = useState<UserCfg>({
    rest: "11:30",
    home: "16:00",
  });

  // Load dari localStorage saat mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserCfg;
        // fallback simple validation
        setUserCfg({
          rest: isValidTimeStr(parsed.rest) ? parsed.rest : "11:30",
          home: isValidTimeStr(parsed.home) ? parsed.home : "16:00",
        });
        setShowModal(false);
      } else {
        // First visit → tampilkan modal
        setShowModal(true);
      }
    } catch {
      // jika parse gagal, fallback ke default + tampilkan modal
      setUserCfg({ rest: "11:30", home: "16:00" });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = (cfg: UserCfg) => {
    setUserCfg(cfg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  };

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center text-gray-600 dark:text-gray-300">
        Memuat...
      </div>
    );
  }

  // Konversi string ke TimeCfg untuk TimerWITA
  const restAt: TimeCfg = parseTimeToCfg(userCfg.rest, "Waktunya istirahat");
  const homeAt: TimeCfg = parseTimeToCfg(userCfg.home, "Waktunya pulang");

  return (
    <div className="relative">
      <TimerWITA restAt={restAt} homeAt={homeAt} />

      {/* Tombol ubah jam (opsional) */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg hover:opacity-90 dark:bg-gray-100 dark:text-gray-900"
          aria-label="Ubah jam istirahat & pulang"
        >
          Ubah jam
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        initial={userCfg}
      />
    </div>
  );
}
