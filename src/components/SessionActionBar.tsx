import {
  Save,
  Sparkles,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Loader2,
  Check,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { SesiPenilaian } from "../types";
import { calculateSessionTotals } from "../utils/storage";

interface SessionActionBarProps {
  session: SesiPenilaian;
  darkMode: boolean;
  onAddSoal: () => void;
  onSaveAll: () => void;
  onAddToHistory: () => void;
  onAnalyzeAll: () => Promise<void>;
  onOpenReport: () => void;
  onExportExcel: () => void;
  onResetSession: () => void;
  isBatchAnalyzing: boolean;
  saveAllSuccess: boolean;
}

export default function SessionActionBar({
  session,
  onAddSoal,
  onSaveAll,
  onAddToHistory,
  onAnalyzeAll,
  onOpenReport,
  onExportExcel,
  onResetSession,
  isBatchAnalyzing,
  saveAllSuccess,
}: SessionActionBarProps) {
  const stats = calculateSessionTotals(session.soalList);

  return (
    <div className="space-y-3">
      {/* Strip Ringkasan Nilai Ringkas, Modern & Eksklusif Dark Mode */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 transition-all shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 divide-slate-800">
            {/* Total Nilai */}
            <div className="px-2 py-1">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                Total Nilai
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-black text-indigo-400">
                  {stats.totalNilaiDiberikan}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ {stats.totalNilaiMaksimal}</span>
              </div>
            </div>

            {/* Skala 100 */}
            <div className="px-2 py-1">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                Skala 100
              </span>
              <span
                className={`text-2xl font-black block mt-0.5 ${
                  stats.nilaiSkala100 >= 75
                    ? "text-emerald-400"
                    : stats.nilaiSkala100 >= 60
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {stats.nilaiSkala100}
              </span>
            </div>

            {/* Kesesuaian */}
            <div className="px-2 py-1">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                Rerata Kesesuaian
              </span>
              <span className="text-2xl font-black text-blue-400 block mt-0.5">
                {stats.rataRataKesesuaianPersen}%
              </span>
            </div>

            {/* Indikasi AI */}
            <div className="px-2 py-1">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                Rerata Indikasi AI
              </span>
              <span
                className={`text-2xl font-black block mt-0.5 ${
                  stats.rataRataAiPersen > 60
                    ? "text-rose-400"
                    : stats.rataRataAiPersen > 30
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {stats.rataRataAiPersen}%
              </span>
            </div>

            {/* Plagiarisme Web */}
            <div className="px-2 py-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                Rerata Plagiat Web
              </span>
              <span
                className={`text-2xl font-black block mt-0.5 ${
                  stats.rataRataPlagiarismePersen > 60
                    ? "text-purple-400"
                    : stats.rataRataPlagiarismePersen > 30
                    ? "text-amber-400"
                    : "text-teal-400"
                }`}
              >
                {stats.rataRataPlagiarismePersen}%
              </span>
            </div>
          </div>

          {/* Action Buttons dengan Animasi Motion */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
            {/* Tambahkan ke Riwayat & Siapkan Siswa Berikutnya */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAddToHistory}
              title="Simpan nilai siswa ini ke riwayat, lalu reset nama, kelas, dan jawaban untuk siswa berikutnya (soal tetap utuh)"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer border border-emerald-400/30"
            >
              <UserCheck className="h-4 w-4 text-emerald-100" />
              <span>Tambahkan ke Riwayat</span>
            </motion.button>

            {/* Simpan Semua */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onSaveAll}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
                saveAllSuccess
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20"
                  : "bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200"
              }`}
            >
              {saveAllSuccess ? (
                <>
                  <Check className="h-4 w-4 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-indigo-400" />
                  <span>Simpan Semua</span>
                </>
              )}
            </motion.button>

            {/* Analisis Semua Soal */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAnalyzeAll}
              disabled={isBatchAnalyzing}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
                isBatchAnalyzing
                  ? "bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
              }`}
            >
              {isBatchAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                  <span>Menganalisis Semua...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Analisis Semua</span>
                </>
              )}
            </motion.button>

            {/* Unduh Laporan */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenReport}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>Unduh Laporan</span>
            </motion.button>

            {/* Ekspor Excel */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onExportExcel}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Excel</span>
            </motion.button>

            {/* Reset / Kosongkan Isian */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onResetSession}
              title="Kosongkan semua isian nama, kelas, dan butir soal"
              className="p-2 text-xs rounded-xl border border-slate-700/80 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 hover:border-rose-800/60 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bar Tambah Soal */}
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-slate-400">
          Daftar Butir Soal ({session.soalList.length})
        </span>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAddSoal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-800/80 hover:bg-indigo-900/60 transition-all cursor-pointer shadow-xs"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>+ Tambah Soal</span>
        </motion.button>
      </div>
    </div>
  );
}
