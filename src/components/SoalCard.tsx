import { useState, useRef } from "react";
import {
  Trash2,
  Save,
  Sparkles,
  Check,
  Loader2,
  Image as ImageIcon,
  Clipboard,
  X,
  Bot,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Globe,
  HelpCircle,
  Calculator,
  Edit3,
  SlidersHorizontal,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SoalItem } from "../types";
import { sound } from "../utils/audio";

interface SoalCardProps {
  soal: SoalItem;
  totalSoal: number;
  darkMode?: boolean;
  onUpdate: (updated: Partial<SoalItem>) => void;
  onSave: () => void;
  onDelete: () => void;
  onClear: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function SoalCard({
  soal,
  totalSoal,
  onUpdate,
  onSave,
  onDelete,
  onClear,
  onAnalyze,
  isAnalyzing,
}: SoalCardProps) {
  const [saveNotice, setSaveNotice] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const questionFileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingScore, setIsEditingScore] = useState(false);
  const [customScoreInput, setCustomScoreInput] = useState<number | string>(() => {
    return soal.analisis ? soal.analisis.nilaiDiberikan : soal.nilaiMaksimal;
  });
  const [customReasonInput, setCustomReasonInput] = useState<string>(() => {
    return soal.analisis?.catatanPenyesuaianGuru || "";
  });

  const handleOpenScoreEditor = () => {
    sound.playTabClick();
    setCustomScoreInput(soal.analisis ? soal.analisis.nilaiDiberikan : soal.nilaiMaksimal);
    setCustomReasonInput(soal.analisis?.catatanPenyesuaianGuru || "");
    setIsEditingScore(true);
  };

  const handleSaveManualScore = () => {
    sound.playSuccess();
    const rawNum = typeof customScoreInput === "string" ? parseFloat(customScoreInput) : customScoreInput;
    const validNum = isNaN(rawNum) ? (soal.analisis?.nilaiDiberikan ?? 0) : rawNum;
    const clampedScore = Math.max(0, Math.min(soal.nilaiMaksimal, Math.round(validNum * 10) / 10));

    if (soal.analisis) {
      const originalAiScore = soal.analisis.nilaiOtomatisSebelumOverride ?? soal.analisis.nilaiDiberikan;
      const nextAnalisis = {
        ...soal.analisis,
        nilaiDiberikan: clampedScore,
        isManualOverride: true,
        nilaiOtomatisSebelumOverride: originalAiScore,
        catatanPenyesuaianGuru: customReasonInput.trim() || undefined,
      };
      onUpdate({
        analisis: nextAnalisis,
        isSaved: true,
      });
    } else {
      const nextAnalisis = {
        soalId: soal.id,
        nomorSoal: soal.nomorSoal,
        kesesuaianPersen: Math.round((clampedScore / Math.max(1, soal.nilaiMaksimal)) * 100),
        indikasiAiPersen: 0,
        indikasiPlagiarismePersen: 0,
        plagiarismeKategori: "Bebas Plagiasi",
        nilaiDiberikan: clampedScore,
        nilaiMaksimal: soal.nilaiMaksimal,
        rincianKalkulasiNilai: {
          nilaiDasarMateri: clampedScore,
          potonganAiPoin: 0,
          potonganPlagiarismePoin: 0,
          penjelasanFaktorPengurang: `Penilaian manual langsung oleh guru (${clampedScore}/${soal.nilaiMaksimal} poin)${
            customReasonInput.trim() ? `: ${customReasonInput.trim()}` : ""
          }`,
        },
        aiDugaanKategori: "Manual Guru",
        ringkasanAnalisis:
          customReasonInput.trim() ||
          `Nilai butir soal ini ditentukan secara manual oleh guru (${clampedScore}/${soal.nilaiMaksimal} poin).`,
        ciriCiriAiTerdeteksi: [],
        kelebihanJawaban: ["Dinilai langsung oleh guru mata pelajaran."],
        kelemahanJawaban: [],
        rekomendasiGuru:
          customReasonInput.trim() || "Penilaian manual telah disimpan dan diakumulasikan ke rekap nilai sesi.",
        analyzedAt: new Date().toISOString(),
        isManualOverride: true,
        nilaiOtomatisSebelumOverride: clampedScore,
        catatanPenyesuaianGuru: customReasonInput.trim() || undefined,
      };
      onUpdate({
        analisis: nextAnalisis,
        isSaved: true,
      });
    }

    setIsEditingScore(false);
    onSave();
  };

  const handleResetToAiScore = () => {
    if (!soal.analisis) return;
    sound.playSuccess();
    const originalAi = soal.analisis.nilaiOtomatisSebelumOverride ?? soal.analisis.nilaiDiberikan;
    const nextAnalisis = {
      ...soal.analisis,
      nilaiDiberikan: originalAi,
      isManualOverride: false,
      catatanPenyesuaianGuru: undefined,
    };
    onUpdate({
      analisis: nextAnalisis,
      isSaved: true,
    });
    setIsEditingScore(false);
    onSave();
  };

  const handleSaveClick = () => {
    sound.playSuccess();
    onSave();
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 1500);
  };

  const handleAnalyzeClick = () => {
    sound.playTabClick();
    onAnalyze();
  };

  // Process and compress image files for ultra-fast upload & token saving
  const processImageFile = async (file: File, target: "question" | "answer") => {
    if (!file.type.startsWith("image/")) {
      sound.playWarning();
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawBase64 = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1280;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
            sound.playAddCard();
            if (target === "question") {
              onUpdate({
                gambarSoalBase64: compressedBase64,
                gambarSoalMimeType: "image/jpeg",
                gambarSoalFileName: file.name,
              });
            } else {
              onUpdate({
                jawabanGambarBase64: compressedBase64,
                jawabanGambarMimeType: "image/jpeg",
                jawabanGambarFileName: file.name,
              });
            }
            return;
          }

          // Fallback if canvas context fails
          sound.playAddCard();
          if (target === "question") {
            onUpdate({
              gambarSoalBase64: rawBase64,
              gambarSoalMimeType: file.type,
              gambarSoalFileName: file.name,
            });
          } else {
            onUpdate({
              jawabanGambarBase64: rawBase64,
              jawabanGambarMimeType: file.type,
              jawabanGambarFileName: file.name,
            });
          }
        };

        img.onerror = () => {
          sound.playAddCard();
          if (target === "question") {
            onUpdate({
              gambarSoalBase64: rawBase64,
              gambarSoalMimeType: file.type,
              gambarSoalFileName: file.name,
            });
          } else {
            onUpdate({
              jawabanGambarBase64: rawBase64,
              jawabanGambarMimeType: file.type,
              jawabanGambarFileName: file.name,
            });
          }
        };

        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    } catch {
      sound.playWarning();
    }
  };

  // Paste from clipboard button
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `Screenshot_${Date.now()}.png`, { type: imageType });
            processImageFile(file, "answer");
            return;
          }
        }
      }

      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          sound.playAddCard();
          onUpdate({
            jawabanTeks: (soal.jawabanTeks ? soal.jawabanTeks + "\n" : "") + text,
          });
          return;
        }
      }

      sound.playWarning();
    } catch {
      sound.playWarning();
    }
  };

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0], "answer");
    }
  };

  // Paste event handler on this card
  const handleCardPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file, "answer");
          e.preventDefault();
          return;
        }
      }
    }
  };

  return (
    <div
      onPaste={handleCardPaste}
      className="rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-100 p-4 sm:p-5 shadow-lg shadow-black/20 transition-all backdrop-blur-md relative overflow-hidden"
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={questionFileInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) processImageFile(e.target.files[0], "question");
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={answerFileInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) processImageFile(e.target.files[0], "answer");
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Top Bar: Nomor Soal, Nilai Maksimal, & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30">
            {soal.nomorSoal}
          </span>
          <h3 className="font-extrabold text-sm text-slate-200">Soal #{soal.nomorSoal}</h3>
          {soal.isSaved && (
            <span className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-800/60 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Tersimpan</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {/* Nilai Maksimal Input */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl border border-slate-700 bg-slate-950 text-xs">
            <span className="text-slate-400 font-medium">Maksimal:</span>
            <input
              type="number"
              min="1"
              max="500"
              value={soal.nilaiMaksimal}
              onChange={(e) =>
                onUpdate({ nilaiMaksimal: Math.max(1, parseInt(e.target.value) || 10) })
              }
              className="w-12 text-center font-bold bg-transparent text-indigo-400 focus:outline-none"
            />
            <span className="text-slate-500 font-medium">Poin</span>
          </div>

          {/* Tombol Edit Nilai Manual */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleOpenScoreEditor}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
              isEditingScore
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30"
                : soal.analisis?.isManualOverride
                ? "bg-amber-950/80 hover:bg-amber-900/80 border-amber-700/80 text-amber-300"
                : "bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200"
            }`}
            title="Sesuaikan/edit jumlah poin soal ini secara manual dan simpan"
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {soal.analisis ? `Nilai: ${soal.analisis.nilaiDiberikan}/${soal.nilaiMaksimal}` : "Edit Nilai"}
            </span>
            {soal.analisis?.isManualOverride && (
              <span className="text-[10px] bg-amber-900/90 text-amber-200 px-1.5 py-0.2 rounded font-semibold border border-amber-700/60">
                Manual
              </span>
            )}
          </motion.button>

          {/* Tombol Simpan Soal */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveClick}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
              saveNotice
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200"
            }`}
          >
            {saveNotice ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Disimpan</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 text-indigo-400" />
                <span>Simpan</span>
              </>
            )}
          </motion.button>

          {/* Tombol Analisis AI */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAnalyzeClick}
            disabled={isAnalyzing}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
              isAnalyzing
                ? "bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />
                <span>Menganalisis...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Analisis AI</span>
              </>
            )}
          </motion.button>

          {/* Tombol Bersihkan Isian */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            title="Bersihkan semua isian pada butir soal ini"
            className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </motion.button>

          {/* Tombol Hapus Soal */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title={totalSoal > 1 ? "Hapus butir soal ini" : "Kosongkan/Reset butir soal ini"}
            className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-800/60 hover:bg-rose-950/40 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Panel Edit Nilai Manual Guru */}
      <AnimatePresence>
        {isEditingScore && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-3.5 p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-700/60 shadow-xl text-slate-100"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Edit Perolehan Poin Manual Guru (Soal #{soal.nomorSoal})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Guru dapat menentukan total poin akhir secara mandiri dan menyimpannya langsung ke akumulasi nilai sesi.
                  </p>
                </div>
              </div>

              {soal.analisis?.isManualOverride && (
                <button
                  type="button"
                  onClick={handleResetToAiScore}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Kembalikan ke nilai perhitungan AI semula"
                >
                  <RotateCcw className="h-3 w-3 text-indigo-400" />
                  <span>Reset ke Nilai AI ({soal.analisis.nilaiOtomatisSebelumOverride ?? soal.analisis.nilaiDiberikan})</span>
                </button>
              )}
            </div>

            {/* Form Input Skor & Quick Adjustment */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Angka Skor Input */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Jumlah Poin Diberikan (Maks. {soal.nilaiMaksimal}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={soal.nilaiMaksimal}
                    value={customScoreInput}
                    onChange={(e) => setCustomScoreInput(e.target.value)}
                    className="w-full px-3 py-2 text-base font-extrabold text-indigo-300 bg-slate-950 border border-indigo-500/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                    / {soal.nilaiMaksimal} Poin
                  </span>
                </div>
              </div>

              {/* Quick Adjustment Buttons */}
              <div className="md:col-span-8">
                <span className="text-[10px] text-slate-400 font-medium block mb-1">Penyesuaian Cepat:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const curr = typeof customScoreInput === "string" ? parseFloat(customScoreInput) || 0 : customScoreInput;
                      setCustomScoreInput(Math.min(soal.nilaiMaksimal, Math.max(0, Math.round((curr + 1) * 10) / 10)));
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = typeof customScoreInput === "string" ? parseFloat(customScoreInput) || 0 : customScoreInput;
                      setCustomScoreInput(Math.min(soal.nilaiMaksimal, Math.max(0, Math.round((curr + 0.5) * 10) / 10)));
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    +0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = typeof customScoreInput === "string" ? parseFloat(customScoreInput) || 0 : customScoreInput;
                      setCustomScoreInput(Math.max(0, Math.round((curr - 0.5) * 10) / 10));
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    -0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = typeof customScoreInput === "string" ? parseFloat(customScoreInput) || 0 : customScoreInput;
                      setCustomScoreInput(Math.max(0, Math.round((curr - 1) * 10) / 10));
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomScoreInput(soal.nilaiMaksimal)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 cursor-pointer"
                  >
                    Penuh ({soal.nilaiMaksimal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomScoreInput(Math.round((soal.nilaiMaksimal / 2) * 10) / 10)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 cursor-pointer"
                  >
                    Setengah ({Math.round((soal.nilaiMaksimal / 2) * 10) / 10})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomScoreInput(0)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 cursor-pointer"
                  >
                    Nol (0)
                  </button>
                </div>
              </div>
            </div>

            {/* Catatan / Alasan Penyesuaian Guru */}
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Catatan / Alasan Penyesuaian Guru (Opsional):
              </label>
              <input
                type="text"
                value={customReasonInput}
                onChange={(e) => setCustomReasonInput(e.target.value)}
                placeholder="Contoh: Jawaban benar setelah konfirmasi lisan / penalaran alternatif siswa..."
                className="w-full px-3 py-1.5 text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Aksi Simpan & Batal */}
            <div className="flex items-center justify-end gap-2 mt-3.5 pt-2.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsEditingScore(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveManualScore}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Simpan Poin & Perbarui Total</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Konten Grid: Naskah Soal & Jawaban Siswa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {/* Kolom 1: Naskah Soal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Naskah Pertanyaan:
            </label>
            <button
              type="button"
              onClick={() => questionFileInputRef.current?.click()}
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>{soal.gambarSoalBase64 ? "Ganti Gambar" : "+ Lampirkan Gambar"}</span>
            </button>
          </div>

          <textarea
            rows={4}
            value={soal.naskahSoal}
            onChange={(e) => onUpdate({ naskahSoal: e.target.value })}
            placeholder="Tulis naskah soal di sini..."
            className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />

          {/* Preview Gambar Soal */}
          {soal.gambarSoalBase64 && (
            <div className="relative inline-flex items-center gap-2 p-1.5 rounded-xl border border-slate-700 bg-slate-950">
              <img
                src={soal.gambarSoalBase64}
                alt="Lampiran Soal"
                onClick={() => setPreviewImage(soal.gambarSoalBase64!)}
                className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-90"
              />
              <span className="text-[11px] text-slate-400 max-w-[150px] truncate">
                {soal.gambarSoalFileName || "Gambar Soal"}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    gambarSoalBase64: null,
                    gambarSoalMimeType: null,
                    gambarSoalFileName: null,
                  })
                }
                className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                title="Hapus gambar soal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Kolom 2: Jawaban Siswa */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <label className="text-xs font-bold text-slate-300">
              Jawaban Siswa:
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center space-x-1 cursor-pointer"
                title="Ambil foto screenshot atau teks otomatis dari clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Tempel Screenshot (Ctrl+V)</span>
              </button>
              <button
                type="button"
                onClick={() => answerFileInputRef.current?.click()}
                className="text-xs text-slate-400 hover:text-slate-300 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Upload Foto</span>
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={soal.jawabanTeks}
            onChange={(e) => onUpdate({ jawabanTeks: e.target.value })}
            placeholder="Ketik/tempel teks jawaban atau tekan Ctrl+V untuk menempelkan foto..."
            className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />

          {/* Area Drag-and-Drop / Preview Gambar Jawaban */}
          {soal.jawabanGambarBase64 ? (
            <div className="flex items-center justify-between p-2 rounded-xl border border-slate-700 bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <img
                  src={soal.jawabanGambarBase64}
                  alt="Screenshot Jawaban"
                  onClick={() => setPreviewImage(soal.jawabanGambarBase64!)}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-90"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                    {soal.jawabanGambarFileName || "Screenshot_Jawaban.png"}
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle className="h-3 w-3" /> Foto siap dianalisis AI
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => answerFileInputRef.current?.click()}
                  className="px-2 py-1 text-[11px] font-medium border border-slate-700 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      jawabanGambarBase64: null,
                      jawabanGambarMimeType: null,
                      jawabanGambarFileName: null,
                    })
                  }
                  className="p-1 text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                  title="Hapus gambar jawaban"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border border-dashed rounded-xl p-2.5 text-center transition-all ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-950/30"
                  : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <p className="text-[11px] text-slate-400">
                Tarik & letakkan file foto jawaban di sini atau tekan{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded font-mono text-slate-300">
                  Ctrl+V
                </kbd>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hasil Analisis AI dengan Animasi Motion */}
      <AnimatePresence>
        {soal.analisis && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-3.5 border-t border-slate-800 rounded-xl p-4 bg-slate-950/70 border border-slate-800/80 shadow-inner"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Hasil Analisis Jawaban & Integritas
                </span>
              </div>

              {/* Metrik Pill */}
              <div className="flex items-center space-x-2 flex-wrap">
                {/* Nilai Diberikan */}
                <div className="px-3 py-1 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                  <span>Nilai: {soal.analisis.nilaiDiberikan} / {soal.nilaiMaksimal}</span>
                  {soal.analisis.isManualOverride ? (
                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-800/60" title="Nilai ditentukan/disesuaikan secara manual oleh guru">
                      Disesuaikan Guru
                    </span>
                  ) : soal.analisis.nilaiDiberikan < Math.round(((soal.analisis.kesesuaianPersen / 100) * soal.nilaiMaksimal) * 10) / 10 ? (
                    <span className="text-[10px] text-rose-300 font-semibold bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-800/60" title="Nilai dipotong karena terindikasi AI atau Plagiat">
                      Penalti Integritas
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleOpenScoreEditor}
                    className="ml-1 text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                {/* Kesesuaian Materi */}
                <div
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                    soal.analisis.kesesuaianPersen >= 85
                      ? "bg-emerald-950/80 border-emerald-800/80 text-emerald-300"
                      : soal.analisis.kesesuaianPersen >= 50
                      ? "bg-blue-950/80 border-blue-800/80 text-blue-300"
                      : "bg-rose-950/80 border-rose-800/80 text-rose-300"
                  }`}
                  title={
                    soal.analisis.kesesuaianPersen < 50
                      ? "Jawaban tidak sinkron / melenceng / kurang tepat terhadap pertanyaan soal"
                      : "Tingkat kesesuaian dan kebenaran materi jawaban terhadap soal"
                  }
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Kesesuaian: {soal.analisis.kesesuaianPersen}%</span>
                  {soal.analisis.kesesuaianPersen < 40 && (
                    <span className="text-[10px] font-normal text-rose-200">
                      (Tidak Sinkron)
                    </span>
                  )}
                </div>

                {/* Indikasi Jawaban AI */}
                <div
                  title="Mendeteksi apakah susunan kalimat dihasilkan oleh bot / kecerdasan buatan"
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                    soal.analisis.indikasiAiPersen > 60
                      ? "bg-rose-950/80 border-rose-800/80 text-rose-300"
                      : soal.analisis.indikasiAiPersen > 30
                      ? "bg-amber-950/80 border-amber-800/80 text-amber-300"
                      : "bg-emerald-950/80 border-emerald-800/80 text-emerald-300"
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Indikasi AI: {soal.analisis.indikasiAiPersen}%</span>
                  <span className="text-[10px] font-normal text-slate-400">({soal.analisis.aiDugaanKategori})</span>
                </div>

                {/* Indikasi Plagiarisme Internet */}
                <div
                  title="Mendeteksi kemiripan kata-kata dengan materi di internet / website / modul umum"
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                    (soal.analisis.indikasiPlagiarismePersen || 0) > 60
                      ? "bg-purple-950/80 border-purple-800/80 text-purple-300"
                      : (soal.analisis.indikasiPlagiarismePersen || 0) > 30
                      ? "bg-amber-950/80 border-amber-800/80 text-amber-300"
                      : "bg-teal-950/80 border-teal-800/80 text-teal-300"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Plagiarisme Web: {soal.analisis.indikasiPlagiarismePersen ?? 0}%</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({soal.analisis.plagiarismeKategori || "Bebas Plagiasi"})
                  </span>
                </div>
              </div>
            </div>

            {/* Alert Banner jika Jawaban Tidak Sinkron / Rendah */}
            {soal.analisis.kesesuaianPersen < 40 && (
              <div className="mb-2.5 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 flex items-start gap-2 text-rose-200 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-300 text-[11px] uppercase tracking-wider">
                    Catatan Ketidaksinkronan Jawaban:
                  </span>
                  <span className="text-[11px] text-rose-200/90 leading-relaxed">
                    Jawaban siswa dinilai belum sinkron atau melenceng dari topik yang diminta soal, sehingga persentase kesesuaian dan nilai pokok diberikan rendah.
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {soal.analisis.ringkasanAnalisis}
            </p>

            {/* Rincian Transparansi Kalkulasi Nilai & Faktor Pengurang */}
            {(() => {
              const rincian = soal.analisis.rincianKalkulasiNilai || (() => {
                const base = Math.round(((soal.analisis.kesesuaianPersen / 100) * soal.nilaiMaksimal) * 10) / 10;
                let aiRatio = 0;
                if (soal.analisis.indikasiAiPersen >= 80) aiRatio = 0.75;
                else if (soal.analisis.indikasiAiPersen >= 51) aiRatio = 0.50;
                else if (soal.analisis.indikasiAiPersen >= 25) aiRatio = 0.25;
                else aiRatio = 0; // (Bantuan AI Ringan <25%): Pemotongan 0%

                let plagiatRatio = 0;
                const plagiatPersen = soal.analisis.indikasiPlagiarismePersen || 0;
                if (plagiatPersen > 60) plagiatRatio = 0.50;
                else if (plagiatPersen > 30) plagiatRatio = 0.25;
                else plagiatRatio = 0; // (Rendah <=30%): Pemotongan 0%

                const potAi = Math.round((base * aiRatio) * 10) / 10;
                const potPlagiat = Math.round((base * plagiatRatio) * 10) / 10;
                let penjelasan = "";
                if (soal.analisis.isManualOverride) {
                  penjelasan = `Nilai disesuaikan manual oleh guru menjadi ${soal.analisis.nilaiDiberikan}/${soal.nilaiMaksimal} poin${
                    soal.analisis.catatanPenyesuaianGuru ? ` (Catatan: "${soal.analisis.catatanPenyesuaianGuru}")` : ""
                  }. (Nilai AI semula: ${soal.analisis.nilaiOtomatisSebelumOverride ?? "-"} poin).`;
                } else if (soal.analisis.kesesuaianPersen === 0) {
                  penjelasan = `Nilai 0.0/${soal.nilaiMaksimal}: Jawaban tidak sesuai/melenceng total (Kesesuaian 0%).`;
                } else {
                  const list = [`Nilai Dasar Materi: ${base}/${soal.nilaiMaksimal} (Kesesuaian ${soal.analisis.kesesuaianPersen}%)`];
                  if (potAi > 0) list.push(`Pengurangan AI: -${potAi} poin (${soal.analisis.indikasiAiPersen}%)`);
                  if (potPlagiat > 0) list.push(`Pengurangan Plagiarisme: -${potPlagiat} poin (${plagiatPersen}%)`);
                  if (potAi === 0 && potPlagiat === 0) list.push(`Tanpa Penalti Integritas (Orisinal & Bebas Plagiasi)`);
                  penjelasan = `${list.join(" | ")} → Total Nilai Akhir: ${soal.analisis.nilaiDiberikan}/${soal.nilaiMaksimal} poin.`;
                }
                return {
                  nilaiDasarMateri: base,
                  potonganAiPoin: potAi,
                  potonganPlagiarismePoin: potPlagiat,
                  penjelasanFaktorPengurang: penjelasan,
                };
              })();

              return (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-950 shadow-inner text-xs mb-3">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800 flex-wrap">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Calculator className="h-3.5 w-3.5 text-indigo-400" />
                      Rincian Penentuan Poin (Kesesuaian & Penalti Integritas)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenScoreEditor}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Buka panel untuk mengedit poin secara manual"
                      >
                        <Edit3 className="h-3 w-3 text-amber-400" />
                        <span>Edit Poin Manual</span>
                      </button>
                      <span className="font-black text-indigo-300 text-xs">
                        Nilai Akhir: {soal.analisis.nilaiDiberikan} / {soal.nilaiMaksimal}
                      </span>
                    </div>
                  </div>

                  {soal.analisis.isManualOverride && (
                    <div className="mb-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2">
                      <Edit3 className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 text-[11px] block">
                          Nilai Disesuaikan Manual oleh Guru
                        </span>
                        <span className="text-[11px] text-amber-200/90 leading-relaxed">
                          Poin ditetapkan menjadi <b>{soal.analisis.nilaiDiberikan} / {soal.nilaiMaksimal}</b>
                          {soal.analisis.nilaiOtomatisSebelumOverride !== undefined && ` (Nilai AI semula: ${soal.analisis.nilaiOtomatisSebelumOverride})`}
                          {soal.analisis.catatanPenyesuaianGuru && ` — Catatan: "${soal.analisis.catatanPenyesuaianGuru}"`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {/* Nilai Dasar Materi */}
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">1. Nilai Dasar Materi</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-bold text-blue-300 text-xs">
                          {rincian.nilaiDasarMateri} / {soal.nilaiMaksimal}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({soal.analisis.kesesuaianPersen}%)
                        </span>
                      </div>
                      {soal.analisis.kesesuaianPersen < 50 && (
                        <span className="text-[9px] text-rose-300 mt-0.5">
                          &lt; Setengah poin
                        </span>
                      )}
                    </div>

                    {/* Potongan AI */}
                    <div className={`p-2 rounded-lg bg-slate-950 border flex flex-col justify-between ${
                      rincian.potonganAiPoin > 0 ? "border-rose-900/60 bg-rose-950/20" : "border-slate-800"
                    }`}>
                      <span className="text-[10px] text-slate-400 font-medium">2. Penalti AI</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`font-bold text-xs ${rincian.potonganAiPoin > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {rincian.potonganAiPoin > 0 ? `-${rincian.potonganAiPoin} Poin` : "0 (Aman)"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({soal.analisis.indikasiAiPersen}%)
                        </span>
                      </div>
                    </div>

                    {/* Potongan Plagiarisme */}
                    <div className={`p-2 rounded-lg bg-slate-950 border flex flex-col justify-between ${
                      rincian.potonganPlagiarismePoin > 0 ? "border-purple-900/60 bg-purple-950/20" : "border-slate-800"
                    }`}>
                      <span className="text-[10px] text-slate-400 font-medium">3. Penalti Plagiarisme</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`font-bold text-xs ${rincian.potonganPlagiarismePoin > 0 ? "text-purple-400" : "text-emerald-400"}`}>
                          {rincian.potonganPlagiarismePoin > 0 ? `-${rincian.potonganPlagiarismePoin} Poin` : "0 (Aman)"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({soal.analisis.indikasiPlagiarismePersen ?? 0}%)
                        </span>
                      </div>
                    </div>

                    {/* Total Skor */}
                    <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                      soal.analisis.isManualOverride
                        ? "bg-amber-950/40 border-amber-700/80"
                        : "bg-indigo-950/60 border-indigo-800/80"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium ${soal.analisis.isManualOverride ? "text-amber-300" : "text-indigo-300"}`}>
                          {soal.analisis.isManualOverride ? "Skor Manual Guru" : "Total Skor Diberikan"}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`font-extrabold text-sm ${soal.analisis.isManualOverride ? "text-amber-200" : "text-indigo-200"}`}>
                          {soal.analisis.nilaiDiberikan}
                        </span>
                        <span className={`text-[10px] font-semibold ${soal.analisis.isManualOverride ? "text-amber-400" : "text-indigo-400"}`}>
                          / {soal.nilaiMaksimal} Poin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keterangan Terurai Faktor Pengurang */}
                  <div className="text-[11px] text-slate-300/90 leading-relaxed bg-slate-950/80 p-2 rounded-lg border border-slate-800/70">
                    <span className="text-slate-400 font-semibold">Uraian Skor: </span>
                    <span>{rincian.penjelasanFaktorPengurang}</span>
                  </div>
                </div>
              );
            })()}

            {/* Toggle Detail */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-400 font-medium">
                Dianalisis: {new Date(soal.analisis.analyzedAt).toLocaleTimeString("id-ID")}
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTabClick();
                  setShowDetail(!showDetail);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>{showDetail ? "Tutup Rincian Analisis" : "Lihat Rincian Analisis Mendalam & Integritas"}</span>
                {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Panel Rincian Detail dengan Animasi */}
            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-slate-800/90 space-y-3 text-xs"
                >
                  {/* Grid 1: Evaluasi Penguasaan Materi (Kelebihan vs Kekurangan Konsep) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Kelebihan Konsep */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-900/40 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-emerald-300 block mb-1.5 flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          Penguasaan Konsep & Kelebihan:
                        </span>
                        {soal.analisis.kelebihanJawaban && soal.analisis.kelebihanJawaban.length > 0 ? (
                          <ul className="space-y-1.5 text-slate-200 text-[11px]">
                            {soal.analisis.kelebihanJawaban.map((poin, i) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                                <span className="text-emerald-400 font-bold shrink-0">•</span>
                                <span>{poin}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-400 text-[11px]">Tidak ada kelebihan spesifik yang teridentifikasi.</p>
                        )}
                      </div>
                    </div>

                    {/* Kekurangan / Miskonsepsi */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-900/40 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-amber-300 block mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          Kekurangan / Konsep Terlewat:
                        </span>
                        {soal.analisis.kelemahanJawaban && soal.analisis.kelemahanJawaban.length > 0 ? (
                          <ul className="space-y-1.5 text-slate-200 text-[11px]">
                            {soal.analisis.kelemahanJawaban.map((poin, i) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                                <span className="text-amber-400 font-bold shrink-0">•</span>
                                <span>{poin}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-emerald-400/90 text-[11px] font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Konsep materi sudah lengkap dan tepat sesuai bobot soal.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Audit Forensik Integritas (AI & Plagiarisme Web) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Deteksi AI (Generator Sintetis) */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-900/40 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-indigo-400" />
                            Bukti Forensik Gaya Tulis AI:
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 text-[10px] font-bold border border-indigo-800/60">
                            {soal.analisis.aiDugaanKategori} ({soal.analisis.indikasiAiPersen}%)
                          </span>
                        </div>
                        {soal.analisis.ciriCiriAiTerdeteksi && soal.analisis.ciriCiriAiTerdeteksi.length > 0 ? (
                          <ul className="space-y-1 text-slate-300 text-[11px]">
                            {soal.analisis.ciriCiriAiTerdeteksi.map((ciri, i) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                                <span className="text-indigo-400 shrink-0">•</span>
                                <span>{ciri}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-emerald-400/90 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Pola kalimat organik, tidak ditemukan struktur artifisial AI.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Deteksi Plagiarisme Internet */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-teal-900/40 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-teal-300 flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-teal-400" />
                            Audit Plagiarisme Internet:
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 text-[10px] font-bold border border-teal-800/60">
                            {soal.analisis.plagiarismeKategori || "Bebas Plagiasi"} ({soal.analisis.indikasiPlagiarismePersen ?? 0}%)
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                          {soal.analisis.detailPlagiarisme ||
                            (soal.analisis.indikasiPlagiarismePersen && soal.analisis.indikasiPlagiarismePersen > 30
                              ? "Terdapat kemiripan frasa kalimat dengan materi yang beredar di web."
                              : "Tidak terdeteksi copy-paste dari sumber internet.")}
                        </p>
                        {soal.analisis.indikasiSumberPlagiarisme && soal.analisis.indikasiSumberPlagiarisme.length > 0 && (
                          <div className="mt-1 space-y-1 pt-1.5 border-t border-slate-800/60">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Dugaan Rujukan Serupa:
                            </span>
                            <ul className="list-disc list-inside text-[11px] text-teal-300/90">
                              {soal.analisis.indikasiSumberPlagiarisme.map((sbr, idx) => (
                                <li key={idx}>{sbr}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rekomendasi & Tindak Lanjut Guru */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-900/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex-1">
                      <span className="font-bold text-amber-300 block mb-1 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        Rekomendasi Bimbingan & Tindak Lanjut Guru:
                      </span>
                      <p className="text-slate-200 leading-relaxed text-[11px]">
                        {soal.analisis.rekomendasiGuru}
                      </p>
                    </div>
                    <div className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex sm:flex-col items-center justify-between gap-1">
                      <span className="text-slate-400 text-[10px]">Skor Diperoleh:</span>
                      <strong className="text-indigo-400 font-bold text-xs">
                        {soal.analisis.nilaiDiberikan} / {soal.nilaiMaksimal} Poin
                      </strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Preview Gambar Penuh */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer backdrop-blur-sm"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Perbesar Foto"
              className="max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-700"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 border border-slate-600 shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
