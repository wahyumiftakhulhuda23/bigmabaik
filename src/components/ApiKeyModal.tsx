import { useState, useEffect } from "react";
import {
  Key,
  X,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getStoredApiKeysRaw, saveStoredApiKeys, getStoredApiKeys } from "../utils/storage";
import { sound } from "../utils/audio";
import { verifyApiKeys, KeyCheckResult } from "../utils/geminiClient";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  onKeysUpdated: (keys: string[]) => void;
}

export default function ApiKeyModal({ isOpen, onClose, onKeysUpdated }: ApiKeyModalProps) {
  const [keysInput, setKeysInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<Record<string, KeyCheckResult>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeysInput(getStoredApiKeysRaw());
      setSavedSuccess(false);
      setGeneralError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const detectedKeys = keysInput
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);

  // Check all entered keys for readiness and remaining token quota
  const handleCheckAllKeys = async () => {
    if (detectedKeys.length === 0) {
      sound.playWarning();
      setGeneralError("Masukkan setidaknya 1 API Key Gemini untuk diperiksa.");
      return;
    }

    sound.playTabClick();
    setIsChecking(true);
    setGeneralError(null);

    try {
      const results = await verifyApiKeys(detectedKeys);
      const resultsMap: Record<string, KeyCheckResult> = {};

      if (results && Array.isArray(results)) {
        results.forEach((r: KeyCheckResult) => {
          resultsMap[r.key] = r;
        });
      }

      setCheckResults(resultsMap);
      sound.playSuccess();
    } catch (err: any) {
      sound.playWarning();
      setGeneralError(err.message || "Terjadi kesalahan saat memeriksa API Key.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleRemoveKey = (keyToRemove: string) => {
    sound.playDelete();
    const updated = detectedKeys.filter((k) => k !== keyToRemove).join("\n");
    setKeysInput(updated);
    saveStoredApiKeys(updated);
    const parsed = getStoredApiKeys();
    onKeysUpdated(parsed);

    // Remove from check results
    const copy = { ...checkResults };
    delete copy[keyToRemove];
    setCheckResults(copy);
  };

  const handleSave = () => {
    sound.playSuccess();
    saveStoredApiKeys(keysInput);
    const parsed = getStoredApiKeys();
    onKeysUpdated(parsed);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl rounded-2xl shadow-2xl border border-slate-800 bg-slate-900 text-slate-100 p-5 sm:p-6 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Pengaturan API Key Gemini</h3>
              <p className="text-xs text-slate-400">
                Verifikasi cepat kuota token dan rotasi kunci otomatis
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTabClick();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3.5 overflow-y-auto pr-1">
          {/* Info Box */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-xs text-indigo-200">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Cek Kesiapan & Kuota Token:</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Masukkan satu atau beberapa API Key Gemini (1 baris = 1 key). Klik{" "}
                  <strong className="text-indigo-300">&quot;Cek Status API Key&quot;</strong> untuk memastikan key aktif sebelum digunakan memeriksa jawaban siswa.
                </p>
              </div>
            </div>
          </div>

          {generalError && (
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-900 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Input Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Daftar API Key Gemini (1 per baris):
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-indigo-400">
                  {detectedKeys.length} Key Terdeteksi
                </span>
                <button
                  type="button"
                  onClick={handleCheckAllKeys}
                  disabled={isChecking || detectedKeys.length === 0}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-indigo-800 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900 flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Sedang Mengecek...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      <span>Cek Status API Key</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={keysInput}
              onChange={(e) => setKeysInput(e.target.value)}
              placeholder={"AIzaSyB... (Kunci 1)\nAIzaSyD... (Kunci 2)\nAIzaSyF... (Kunci 3)"}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
          </div>

          {/* Individual Key Status List */}
          {detectedKeys.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Status Kesiapan Tiap Key
              </span>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {detectedKeys.map((k, idx) => {
                  const check = checkResults[k];
                  const maskedKey = `${k.slice(0, 8)}...${k.slice(-4)}`;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                        check?.status === "ready"
                          ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                          : check?.status === "exhausted"
                          ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                          : check?.status === "invalid"
                          ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
                          : "bg-slate-800/60 border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-mono text-[11px] font-semibold shrink-0 text-slate-300">
                          #{idx + 1} ({maskedKey})
                        </span>
                        <div className="truncate">
                          {check ? (
                            <span className="flex items-center gap-1 font-medium text-[11px]">
                              {check.status === "ready" && (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  <span className="text-emerald-300 font-bold">
                                    Siap & Token Ada
                                  </span>
                                </>
                              )}
                              {check.status === "exhausted" && (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span className="text-amber-300 font-bold">
                                    Kuota/Token Habis (429)
                                  </span>
                                </>
                              )}
                              {check.status === "invalid" && (
                                <>
                                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                  <span className="text-rose-300 font-bold">
                                    Tidak Valid
                                  </span>
                                </>
                              )}
                              {check.status === "error" && (
                                <span className="text-slate-400 font-medium">
                                  {check.message}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              Klik &apos;Cek Status API Key&apos; untuk menguji
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveKey(k)}
                        title="Hapus key ini dari daftar"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link to AI Studio */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Dapatkan API Key Gratis di Google AI Studio</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playTabClick();
              onClose();
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleCheckAllKeys}
              disabled={isChecking || detectedKeys.length === 0}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-700 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60 transition-colors disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Mengecek...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Cek Semua Key</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleSave}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer ${
                savedSuccess
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5" />
                  <span>Simpan API Key</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
