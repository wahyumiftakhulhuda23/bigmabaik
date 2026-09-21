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

  // Process image files
  const processImageFile = (file: File, target: "question" | "answer") => {
    if (!file.type.startsWith("image/")) {
      sound.playWarning();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      sound.playAddCard();
      const base64 = e.target?.result as string;
      if (target === "question") {
        onUpdate({
          gambarSoalBase64: base64,
          gambarSoalMimeType: file.type,
          gambarSoalFileName: file.name,
        });
      } else {
        onUpdate({
          jawabanGambarBase64: base64,
          jawabanGambarMimeType: file.type,
          jawabanGambarFileName: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
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
                  Hasil Analisis AI
                </span>
              </div>

              {/* Metrik Pill */}
              <div className="flex items-center space-x-2 flex-wrap">
                {/* Nilai Diberikan */}
                <div className="px-3 py-1 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 text-xs font-bold">
                  Nilai: {soal.analisis.nilaiDiberikan} / {soal.nilaiMaksimal}
                </div>

                {/* Kesesuaian */}
                <div className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-bold flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-blue-400" />
                  <span>Kesesuaian: {soal.analisis.kesesuaianPersen}%</span>
                </div>

                {/* Indikasi AI */}
                <div
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
              </div>
            </div>

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
                <span>{showDetail ? "Tutup Rincian" : "Lihat Rincian Analisis"}</span>
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
                  className="mt-3 pt-3 border-t border-slate-800/90 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
                >
                  {/* Indikator AI Terdeteksi */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-slate-200 block mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      Ciri & Indikator AI Terdeteksi:
                    </span>
                    {soal.analisis.ciriCiriAiTerdeteksi && soal.analisis.ciriCiriAiTerdeteksi.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-slate-400">
                        {soal.analisis.ciriCiriAiTerdeteksi.map((ciri, i) => (
                          <li key={i}>{ciri}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 italic">Tidak ditemukan pola khas AI.</p>
                    )}
                  </div>

                  {/* Saran & Rekomendasi Guru */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-slate-200 block mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      Saran Guru / Evaluator:
                    </span>
                    <p className="text-slate-300 leading-relaxed italic">
                      &quot;{soal.analisis.rekomendasiGuru}&quot;
                    </p>
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
