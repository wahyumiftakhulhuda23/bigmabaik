import { useState } from "react";
import {
  Infinity as InfinityIcon,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  MessageCircle,
  Heart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { activateLicense, isLicenseActive } from "../utils/license";
import { sound } from "../utils/audio";

interface DonationModalProps {
  isOpen: boolean;
  canSkip: boolean;
  triggerReason?: "first_visit" | "interval" | "new_session" | "download_report" | "manual";
  onClose: (activated: boolean) => void;
  onSuccessActivate?: () => void;
}

export default function DonationModal({
  isOpen,
  canSkip,
  triggerReason = "manual",
  onClose,
  onSuccessActivate,
}: DonationModalProps) {
  const [licenseInput, setLicenseInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState<"bri" | "ewallet" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alreadyActive = isLicenseActive();

  if (!isOpen) return null;

  const handleCopy = (text: string, type: "bri" | "ewallet") => {
    navigator.clipboard.writeText(text);
    setCopiedBank(type);
    sound.playSuccess();
    setTimeout(() => {
      setCopiedBank(null);
    }, 2000);
  };

  const handleActivate = () => {
    if (!licenseInput.trim()) {
      sound.playWarning();
      setErrorMessage("Silakan masukkan password lisensi terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    const success = activateLicense(licenseInput);

    setTimeout(() => {
      setIsSubmitting(false);
      if (success) {
        sound.playSuccess();
        setErrorMessage(null);
        if (onSuccessActivate) {
          onSuccessActivate();
        }
        onClose(true);
      } else {
        sound.playWarning();
        setErrorMessage(
          "Kode lisensi salah! Pastikan tidak ada salah ketik atau lakukan konfirmasi via WhatsApp."
        );
      }
    }, 300);
  };

  const handleClose = () => {
    sound.playTabClick();
    onClose(false);
  };

  const getTriggerNotice = () => {
    switch (triggerReason) {
      case "new_session":
        return "Fitur Sesi Baru memerlukan lisensi aktif untuk membuka seluruh fitur tanpa batas.";
      case "download_report":
        return "Fitur Unduh Laporan & Ekspor memerlukan lisensi aktif untuk membuka seluruh fitur.";
      default:
        return null;
    }
  };

  const notice = getTriggerNotice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/80 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-lg rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900 via-[#0b1120] to-[#070b14] text-slate-100 shadow-2xl shadow-black/80 overflow-hidden"
      >
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer z-10"
          title="Tutup Modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
          {/* Header Card Mirip Gambar Referensi */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50 shrink-0">
                <InfinityIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-wide text-emerald-400 uppercase">
                  LISENSI SEUMUR HIDUP
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Sekali bayar, akses selamanya
                </p>
              </div>
            </div>

            {alreadyActive && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Aktif
              </span>
            )}
          </div>

          {/* Keterangan Popup Donasi Sesuai Instruksi User */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-800/50 p-3.5 text-center">
            <p className="text-xs sm:text-sm font-semibold text-indigo-200 leading-relaxed">
              &ldquo;Donasikan untuk kemajuan pendidikan indonesia, donasi sesuai kemampuan desil anda :D&rdquo;
            </p>
          </div>

          {/* Notice jika fitur terkunci non-skippable */}
          {!canSkip && notice && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold block">Akses Fitur Terkunci:</span>
                <span>{notice}</span>
              </div>
            </div>
          )}

          {/* Alamat Pembayaran Sesuai Gambar Referensi (Tanpa Nominal) */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 sm:p-4">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Metode Pembayaran Donasi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* BRI Bank Transfer */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
                <div>
                  <div className="text-xs font-bold text-cyan-400 mb-1">
                    BRI (Bank Transfer)
                  </div>
                  <div className="font-mono text-sm sm:text-base font-black text-white tracking-wider select-all">
                    676701018421533
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">
                    WAHYU MIFTAKHUL HUDA
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy("676701018421533", "bri")}
                  className="mt-2.5 py-1 px-2.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                >
                  {copiedBank === "bri" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Salin Rekening</span>
                    </>
                  )}
                </button>
              </div>

              {/* GoPay / DANA */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
                <div>
                  <div className="text-xs font-bold text-emerald-400 mb-1">
                    GoPay / DANA
                  </div>
                  <div className="font-mono text-sm sm:text-base font-black text-white tracking-wider select-all">
                    081326187769
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">
                    WAHYU MIFTAKHUL HUDA
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy("081326187769", "ewallet")}
                  className="mt-2.5 py-1 px-2.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                >
                  {copiedBank === "ewallet" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Salin Nomor</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tombol Konfirmasi Via WhatsApp Sesuai Gambar */}
            <a
              href="https://wa.me/6281326187769?text=Halo%20Admin%20BigMA%20Baik,%20saya%20sudah%20melakukan%20donasi%20untuk%20lisensi%20aplikasi.%20Mohon%20kirimkan%20password%20lisensinya."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-white/10 transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="tracking-wide">
                KONFIRMASI VIA WHATSAPP (081326187769)
              </span>
            </a>
          </div>

          {/* Form Input Password Lisensi */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Isikan Password lisensi anda :
            </label>
            <p className="text-[11px] text-slate-400 italic">
              password lisensi ini bersifat rahasia, jangan diperlihatkan.
            </p>

            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>

              <input
                type={showPassword ? "text" : "password"}
                value={licenseInput}
                onChange={(e) => {
                  setLicenseInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleActivate();
                  }
                }}
                placeholder="Paste License Key Anda Di Sini"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-500 transition-all"
                autoComplete="off"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-300 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tombol Aktivasi Lisensi Seumur Hidup Sesuai Gambar */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            disabled={isSubmitting}
            onClick={handleActivate}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>AKTIVASI LISENSI SEUMUR HIDUP</span>
            <span>🔑</span>
          </motion.button>

          {/* Skip / Lewati Button Hanya Jika canSkip === true */}
          {canSkip && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-slate-400 hover:text-slate-200 underline decoration-slate-600 hover:decoration-slate-400 transition-all cursor-pointer py-1"
              >
                Lewati untuk sekarang & lanjut gunakan aplikasi
              </button>
            </div>
          )}

          {!canSkip && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-slate-500 hover:text-slate-400 transition-all cursor-pointer py-1"
              >
                Batalkan & Tutup (Fitur tidak akan dijalankan)
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
