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
                  {soal.analisis.nilaiDiberikan < Math.round(((soal.analisis.kesesuaianPersen / 100) * soal.nilaiMaksimal) * 10) / 10 && (
                    <span className="text-[10px] text-rose-300 font-semibold bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-800/60" title="Nilai dipotong karena terindikasi AI atau Plagiat">
                      Penalti Integritas
                    </span>
                  )}
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

            <p className="text-xs text-slate-300 leading-relaxed">
              {soal.analisis.ringkasanAnalisis}
            </p>

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
