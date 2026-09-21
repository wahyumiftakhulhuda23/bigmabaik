import { Sparkles, CheckCircle2, AlertCircle, Clock, XCircle, Bot, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface BatchProgressData {
  isActive: boolean;
  currentIndex: number; // 0-based
  total: number;
  currentSoalNumber: number;
  percent: number;
  statusText: string;
  succeededCount: number;
  failedCount: number;
  elapsedSeconds: number;
  isCancelling: boolean;
}

interface BatchProgressBannerProps {
  progress: BatchProgressData;
  namaSiswa?: string;
  onCancel: () => void;
}

export default function BatchProgressBanner({
  progress,
  namaSiswa,
  onCancel,
}: BatchProgressBannerProps) {
  if (!progress.isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="mb-5 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 p-4 sm:p-5 text-white shadow-xl shadow-indigo-950/30 backdrop-blur-md relative overflow-hidden"
      >
        {/* Animated background ambient glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-44 h-44 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">
          {/* Top Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-300">
                <Bot className="h-5 w-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                    <span>Sedang Menganalisis Jawaban Berurutan</span>
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Mode Super Cepat & Irit Kuota
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5">
                  {progress.statusText}
                  {namaSiswa ? ` • Siswa: ${namaSiswa}` : ""}
                </p>
              </div>
            </div>

            {/* Right Status / Cancel */}
            <div className="flex items-center space-x-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onCancel}
                disabled={progress.isCancelling}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-800/80 bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {progress.isCancelling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Hentikan</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Interactive Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Kemajuan Evaluasi:</span>
                <span className="text-emerald-400 font-mono">
                  {progress.currentIndex + 1} / {progress.total} Soal
                </span>
              </span>
              <span className="font-mono font-extrabold text-sm text-emerald-400">
                {progress.percent}%
              </span>
            </div>

            <div className="h-3 w-full bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 via-indigo-500 to-emerald-400 shadow-sm shadow-emerald-500/50 relative overflow-hidden"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.max(4, Math.min(100, progress.percent))}%` }}
                transition={{ ease: "easeInOut", duration: 0.35 }}
              >
                {/* Striped shimmer animation */}
                <div className="absolute inset-0 bg-white/20 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[move-stripe_1s_linear_infinite]" />
              </motion.div>
            </div>
          </div>

          {/* Quick Metrics Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <ArrowRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Soal Aktif</span>
                <span className="font-bold text-slate-200 truncate">
                  Soal #{progress.currentSoalNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Berhasil</span>
                <span className="font-bold text-emerald-400">
                  {progress.succeededCount} Soal
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Gagal/Skip</span>
                <span className="font-bold text-rose-400">
                  {progress.failedCount} Soal
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">Durasi</span>
                <span className="font-bold text-amber-300 font-mono">
                  {progress.elapsedSeconds} detik
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
