import { useState } from "react";
import {
  History,
  Search,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Download,
  Calendar,
  User,
  GraduationCap,
  Bot,
  Globe,
  FileCheck,
  AlertTriangle,
  Check,
  X,
  Calculator,
  Edit3,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SesiPenilaian } from "../types";
import { exportSessionsToExcel } from "../utils/excelExport";
import { sound } from "../utils/audio";

interface HistoryViewProps {
  sessions: SesiPenilaian[];
  darkMode?: boolean;
  onOpenSession: (session: SesiPenilaian) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenReportModal: (session: SesiPenilaian) => void;
  onRequireLicense?: (action: () => void, feature: "download_report") => void;
  onReanalyzeSession?: (session: SesiPenilaian) => void;
  reanalyzingSessionId?: string | null;
  reanalyzingProgress?: {
    current: number;
    total: number;
    soalNum: number;
  } | null;
}

export default function HistoryView({
  sessions,
  onOpenSession,
  onDeleteSession,
  onOpenReportModal,
  onRequireLicense,
  onReanalyzeSession,
  reanalyzingSessionId,
  reanalyzingProgress,
}: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [sessionToDelete, setSessionToDelete] = useState<SesiPenilaian | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Get distinct classes for filtering
  const distinctClasses = Array.from(new Set(sessions.map((s) => s.kelas).filter(Boolean)));

  // Filter sessions
  const filtered = sessions.filter((s) => {
    const matchSearch =
      (s.namaSiswa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nomorInduk || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.judulUjian || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.mataPelajaran || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchClass = selectedClass === "ALL" || s.kelas === selectedClass;
    return matchSearch && matchClass;
  });

  const handleExportAllToExcel = async () => {
    if (sessions.length === 0) {
      sound.playWarning();
      setNotification("Belum ada riwayat penilaian untuk diekspor ke Excel.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    sound.playSuccess();
    const res = await exportSessionsToExcel(filtered.length > 0 ? filtered : sessions);
    if (res.success) {
      setNotification("File Excel (.xlsx) berhasil diunduh dengan format warna lengkap!");
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleConfirmDeleteSingle = () => {
    if (sessionToDelete) {
      sound.playDelete();
      const deletedName = sessionToDelete.namaSiswa || "Siswa";
      onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
      setNotification(`Riwayat penilaian untuk "${deletedName}" berhasil dihapus.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleConfirmClearAll = () => {
    sound.playDelete();
    sessions.forEach((s) => onDeleteSession(s.id));
    setIsClearingAll(false);
    setNotification("Semua daftar riwayat penilaian berhasil dibersihkan.");
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 relative text-slate-100">
      {/* Banner Notifikasi Sukses / Info */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg shadow-indigo-600/30"
          >
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Riwayat */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 transition-all shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 tracking-tight">Riwayat Evaluasi Siswa</h2>
              <p className="text-xs text-slate-400">
                Tinjau kembali data evaluasi, cetak ulang laporan PDF/JPG, atau ekspor rekapitulasi Excel
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {sessions.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  sound.playTabClick();
                  setIsClearingAll(true);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Hapus seluruh riwayat tersimpan"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Kosongkan Riwayat</span>
              </motion.button>
            )}

            {/* Mass Excel Export */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (onRequireLicense) {
                  onRequireLicense(handleExportAllToExcel, "download_report");
                } else {
                  handleExportAllToExcel();
                }
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </motion.button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="sm:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama siswa, NISN, atau judul ujian..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => {
                sound.playTabClick();
                setSelectedClass(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner"
            >
              <option value="ALL">Semua Kelas / Rombel ({sessions.length})</option>
              {distinctClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas: {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-12 text-center text-slate-400">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-slate-600 opacity-50" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">
            {sessions.length === 0 ? "Belum Ada Riwayat Tersimpan" : "Tidak Ditemukan Hasil yang Cocok"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {sessions.length === 0
              ? "Semua lembar penilaian yang Anda simpan akan tersusun rapi di sini untuk dicetak atau dianalisis ulang kapan saja."
              : "Coba sesuaikan kata kunci pencarian atau pilih filter kelas yang berbeda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => {
            const isReanalyzingThis = reanalyzingSessionId === s.id;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: isReanalyzingThis ? 0 : -2 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl border transition-all p-4 sm:p-5 shadow-lg shadow-black/20 flex flex-col justify-between ${
                  isReanalyzingThis
                    ? "border-indigo-500/80 bg-indigo-950/40 shadow-indigo-950/50"
                    : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Header Kartu */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                        {s.kelas || "Kelas Umum"}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-100 flex items-center gap-1.5 mt-0.5">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{s.namaSiswa || "(Tanpa Nama)"}</span>
                      </h3>
                    </div>

                    {/* Badge Nilai Skala 100 */}
                    <div
                      className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 border ${
                        s.nilaiSkala100 >= 75
                          ? "bg-emerald-950/80 border-emerald-800/80 text-emerald-300"
                          : s.nilaiSkala100 >= 60
                          ? "bg-amber-950/80 border-amber-800/80 text-amber-300"
                          : "bg-rose-950/80 border-rose-800/80 text-rose-300"
                      }`}
                    >
                      {s.nilaiSkala100} / 100
                    </div>
                  </div>

                  {/* Sub info */}
                  <div className="space-y-1 text-xs text-slate-400 mb-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>
                        {s.tanggal || new Date(s.createdAt).toLocaleDateString("id-ID")} • {s.soalList.length} Butir Soal
                      </span>
                    </div>
                  </div>

                  {/* Progress bar jika sedang analisis ulang */}
                  {isReanalyzingThis && reanalyzingProgress && (
                    <div className="mb-3.5 p-3 rounded-xl bg-indigo-950/90 border border-indigo-500/60 shadow-inner flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-indigo-200">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" />
                          <span className="font-semibold text-xs">
                            Menganalisis Soal #{reanalyzingProgress.soalNum} ({reanalyzingProgress.current} dari {reanalyzingProgress.total} butir)...
                          </span>
                        </div>
                        <span className="font-black text-xs text-indigo-300 bg-indigo-900/80 px-2 py-0.5 rounded-md border border-indigo-700/60">
                          {Math.round((reanalyzingProgress.current / reanalyzingProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round((reanalyzingProgress.current / reanalyzingProgress.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Indikator Metrik */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 mb-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase truncate">
                        Kesesuaian
                      </span>
                      <span className="font-bold text-blue-400 flex items-center gap-1 mt-0.5 text-xs">
                        <FileCheck className="h-3 w-3 shrink-0" />
                        {s.rataRataKesesuaianPersen}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase truncate">
                        Indikasi AI
                      </span>
                      <span
                        className={`font-bold flex items-center gap-1 mt-0.5 text-xs ${
                          s.rataRataAiPersen > 60
                            ? "text-rose-400"
                            : s.rataRataAiPersen > 30
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        <Bot className="h-3 w-3 shrink-0" />
                        {s.rataRataAiPersen}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase truncate">
                        Plagiat Web
                      </span>
                      <span
                        className={`font-bold flex items-center gap-1 mt-0.5 text-xs ${
                          (s.rataRataPlagiarismePersen || 0) > 60
                            ? "text-purple-400"
                            : (s.rataRataPlagiarismePersen || 0) > 30
                            ? "text-amber-400"
                            : "text-teal-400"
                        }`}
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        {s.rataRataPlagiarismePersen || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Rincian Poin Per Butir Soal */}
                  <div className="mb-3.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 shadow-inner">
                    <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-800/70">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Poin Per Soal ({s.soalList.length} Butir)</span>
                      </span>
                      <span className="text-[11px] font-black text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-800/60">
                        Total: {s.totalNilaiDiberikan} / {s.totalNilaiMaksimal} Poin
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {s.soalList.map((soal) => {
                        const isEvaluated = !!soal.analisis;
                        const score = soal.analisis ? soal.analisis.nilaiDiberikan : 0;
                        const max = soal.nilaiMaksimal;
                        const ratio = max > 0 ? score / max : 0;
                        const isOverride = soal.analisis?.isManualOverride;

                        return (
                          <div
                            key={soal.id || soal.nomorSoal}
                            title={
                              isEvaluated
                                ? `Soal #${soal.nomorSoal}: ${score}/${max} Poin (Kesesuaian: ${soal.analisis!.kesesuaianPersen}%, Indikasi AI: ${soal.analisis!.indikasiAiPersen}%)${
                                    isOverride ? " [Nilai disesuaikan manual oleh guru]" : ""
                                  }`
                                : `Soal #${soal.nomorSoal}: Belum dinilai`
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              !isEvaluated
                                ? "bg-slate-900/80 border-slate-800 text-slate-500"
                                : ratio >= 0.75
                                ? "bg-emerald-950/60 border-emerald-800/70 text-emerald-300"
                                : ratio >= 0.5
                                ? "bg-blue-950/60 border-blue-800/70 text-blue-300"
                                : "bg-rose-950/60 border-rose-800/70 text-rose-300"
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 font-medium">Soal {soal.nomorSoal}:</span>
                            <span className="font-extrabold text-xs">
                              {isEvaluated ? score : "-"}/{max}
                            </span>
                            {isOverride && (
                              <span
                                className="text-[9px] text-amber-300 bg-amber-950/90 px-1 py-0.2 rounded border border-amber-700/80 font-semibold"
                                title="Poin disesuaikan guru"
                              >
                                Edit
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      sound.playWarning();
                      setSessionToDelete(s);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                    title="Hapus sesi riwayat ini"
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>

                  <div className="flex items-center flex-wrap gap-2">
                    {/* Tombol Analisis Ulang */}
                    <motion.button
                      whileHover={{ scale: isReanalyzingThis ? 1 : 1.03 }}
                      whileTap={{ scale: isReanalyzingThis ? 1 : 0.97 }}
                      disabled={isReanalyzingThis || !!reanalyzingSessionId}
                      onClick={() => {
                        if (onReanalyzeSession) {
                          onReanalyzeSession(s);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer ${
                        isReanalyzingThis
                          ? "bg-amber-950/80 border-amber-600/70 text-amber-300 shadow-md shadow-amber-900/40 cursor-wait"
                          : reanalyzingSessionId
                          ? "bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed opacity-50"
                          : "border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/70 hover:border-indigo-400 text-indigo-200 hover:text-white shadow-xs"
                      }`}
                      title="Analisis ulang seluruh butir jawaban siswa ini dengan AI"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          isReanalyzingThis ? "animate-spin text-amber-400" : "text-indigo-400"
                        }`}
                      />
                      <span>
                        {isReanalyzingThis
                          ? `Menganalisis (${reanalyzingProgress?.current || 1}/${reanalyzingProgress?.total || s.soalList.length})...`
                          : "Analisis Ulang"}
                      </span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        sound.playTabClick();
                        if (onRequireLicense) {
                          onRequireLicense(() => onOpenReportModal(s), "download_report");
                        } else {
                          onOpenReportModal(s);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-400" />
                      <span>Laporan</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        sound.playTabClick();
                        onOpenSession(s);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <span>Buka & Edit</span>
                      <ExternalLink className="h-3 w-3" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Satuan */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-slate-100"
          >
            <div className="flex items-center space-x-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-900/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-100">Hapus Riwayat Penilaian?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Anda akan menghapus data penilaian untuk{" "}
              <strong className="text-white">&quot;{sessionToDelete.namaSiswa || "Siswa"}&quot;</strong> (
              {sessionToDelete.kelas || "Kelas -"}) dengan {sessionToDelete.soalList.length} butir soal. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Seluruh Riwayat */}
      {isClearingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-slate-100"
          >
            <div className="flex items-center space-x-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-900/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-100">Kosongkan Seluruh Riwayat?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Semua {sessions.length} berkas riwayat penilaian siswa akan dihapus permanen dari penyimpanan peramban Anda.
            </p>
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsClearingAll(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Ya, Kosongkan Semua
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
