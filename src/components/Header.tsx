import { useState, useEffect } from "react";
import {
  BookOpen,
  History,
  Key,
  PlusCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Infinity as InfinityIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { sound } from "../utils/audio";

interface HeaderProps {
  activeTab: "editor" | "history";
  setActiveTab: (tab: "editor" | "history") => void;
  historyCount: number;
  onNewSession: () => void;
  onOpenApiKeyModal: () => void;
  apiKeyCount: number;
  isLicensed: boolean;
  onOpenDonationModal: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  historyCount,
  onNewSession,
  onOpenApiKeyModal,
  apiKeyCount,
  isLicensed,
  onOpenDonationModal,
}: HeaderProps) {
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleTabChange = (tab: "editor" | "history") => {
    if (tab !== activeTab) {
      sound.playTabClick();
      setActiveTab(tab);
    }
  };

  const handleNew = () => {
    sound.playAddCard();
    onNewSession();
  };

  const handleOpenKeys = () => {
    sound.playTabClick();
    onOpenApiKeyModal();
  };

  return (
    <header className="border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 transition-all text-slate-100 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand dengan Animasi Neon Lembut */}
          <motion.div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTabChange("editor")}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight neon-text-animated">
                BigMA Baik
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide -mt-1 hidden sm:inline-block">
                Evaluasi Jawaban Siswa & Integritas AI
              </span>
            </div>
          </motion.div>

          {/* Navigation & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* API Key Modal Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenKeys}
              title="Atur API Key Gemini untuk analisis"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all shadow-xs ${
                apiKeyCount > 0
                  ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-500/60"
                  : "border-amber-500/60 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 animate-pulse"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>
                {apiKeyCount > 0 ? `${apiKeyCount} Key Siap` : "Set API Key Gemini"}
              </span>
            </motion.button>

            {/* Tombol Donasi / Status Lisensi */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                sound.playTabClick();
                onOpenDonationModal();
              }}
              title={
                isLicensed
                  ? "Lisensi Seumur Hidup Anda Telah Aktif!"
                  : "Donasi untuk kemajuan pendidikan & buka seluruh fitur"
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
                isLicensed
                  ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
                  : "border-pink-500/50 bg-pink-950/30 text-pink-300 hover:bg-pink-900/50 hover:border-pink-500/70"
              }`}
            >
              {isLicensed ? (
                <>
                  <InfinityIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Lisensi Aktif</span>
                </>
              ) : (
                <>
                  <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400/20" />
                  <span>Donasi</span>
                </>
              )}
            </motion.button>

            {/* Sesi Baru */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNew}
              title="Buat Sesi Baru (Kosongkan Form)"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sesi Baru</span>
            </motion.button>

            {/* Tab: Koreksi */}
            <button
              onClick={() => handleTabChange("editor")}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === "editor"
                  ? "bg-slate-800/90 text-white border border-slate-700/80 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>Koreksi</span>
              {activeTab === "editor" && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-xl border border-indigo-500/30 pointer-events-none"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>

            {/* Tab: Riwayat */}
            <button
              onClick={() => handleTabChange("history")}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === "history"
                  ? "bg-slate-800/90 text-white border border-slate-700/80 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <History className="h-3.5 w-3.5 text-cyan-400" />
              <span>Riwayat</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-500 text-white">
                  {historyCount}
                </span>
              )}
              {activeTab === "history" && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-xl border border-indigo-500/30 pointer-events-none"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>

            {/* Sound Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleSound}
              title={isMuted ? "Aktifkan Efek Suara Notifikasi" : "Matikan Suara (Bisu)"}
              className={`p-2 rounded-xl border transition-all ${
                !isMuted
                  ? "bg-slate-800/80 border-slate-700 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 shadow-xs shadow-cyan-500/10"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
              }`}
            >
              {!isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}
