import { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import SessionHeader from "./components/SessionHeader";
import SessionActionBar from "./components/SessionActionBar";
import BatchProgressBanner, { BatchProgressData } from "./components/BatchProgressBanner";
import SoalCard from "./components/SoalCard";
import HistoryView from "./components/HistoryView";
import ReportModal from "./components/ReportModal";
import ApiKeyModal from "./components/ApiKeyModal";
import DonationModal from "./components/DonationModal";
import { SesiPenilaian, SoalItem } from "./types";
import {
  createDefaultSession,
  getStoredSessions,
  saveSessionToStorage,
  deleteSessionFromStorage,
  calculateSessionTotals,
  resetSessionAnswersForNextStudent,
  getStoredApiKeys,
} from "./utils/storage";
import {
  isLicenseActive,
  hasShownFirstVisit,
  markFirstVisitShown,
} from "./utils/license";
import { exportSessionsToExcel } from "./utils/excelExport";
import { safeFetchJson } from "./utils/apiHelper";
import { analyzeSingleQuestion } from "./utils/geminiClient";
import { CheckCircle2, AlertCircle, Info, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sound } from "./utils/audio";

export default function App() {
  // Selalu Dark Mode sesuai permintaan revisi
  const darkMode = true;

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"editor" | "history">("editor");

  // Gemini API keys
  const [apiKeys, setApiKeys] = useState<string[]>(() => getStoredApiKeys());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // License & Donation State
  const [isLicensed, setIsLicensed] = useState<boolean>(() => isLicenseActive());
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationCanSkip, setDonationCanSkip] = useState(true);
  const [donationReason, setDonationReason] = useState<
    "first_visit" | "interval" | "new_session" | "download_report" | "manual"
  >("manual");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Active Session
  const [session, setSession] = useState<SesiPenilaian>(() => {
    const stored = getStoredSessions();
    if (stored.length > 0) {
      return stored[0];
    }
    return createDefaultSession();
  });

  // History list
  const [historyList, setHistoryList] = useState<SesiPenilaian[]>(() => {
    return getStoredSessions();
  });

  // History card re-analysis state
  const [reanalyzingSessionId, setReanalyzingSessionId] = useState<string | null>(null);
  const [reanalyzingProgress, setReanalyzingProgress] = useState<{
    current: number;
    total: number;
    soalNum: number;
  } | null>(null);

  // Loading & Sequential Analysis states
  const [analyzingMap, setAnalyzingMap] = useState<Record<string, boolean>>({});
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [saveAllSuccess, setSaveAllSuccess] = useState(false);

  // Interactive Batch Progress state
  const [batchProgress, setBatchProgress] = useState<BatchProgressData>({
    isActive: false,
    currentIndex: 0,
    total: 0,
    currentSoalNumber: 1,
    percent: 0,
    statusText: "",
    succeededCount: 0,
    failedCount: 0,
    elapsedSeconds: 0,
    isCancelling: false,
  });
  const cancelBatchRef = useRef(false);

  // Timer for active batch analysis
  useEffect(() => {
    let timerInterval: any = null;
    if (batchProgress.isActive) {
      timerInterval = setInterval(() => {
        setBatchProgress((prev) => {
          if (!prev.isActive) return prev;
          return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [batchProgress.isActive]);

  // In-app Toast Notification state
  const [toast, setToast] = useState<{
    id: number;
    type: "success" | "error" | "info" | "warning";
    text: string;
  } | null>(null);

  const showToast = (
    text: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = Date.now();
    setToast({ id, type, text });

    if (type === "success") {
      sound.playSuccess();
    } else if (type === "error" || type === "warning") {
      sound.playWarning();
    } else {
      sound.playTabClick();
    }

    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3600);
  };

  // Trigger modal jika user pertama kali mengunjungi aplikasi (bisa di-skip)
  useEffect(() => {
    if (!isLicenseActive() && !hasShownFirstVisit()) {
      markFirstVisitShown();
      setDonationCanSkip(true);
      setDonationReason("first_visit");
      setIsDonationModalOpen(true);
    }
  }, []);

  // Trigger modal setiap 10 menit sekali (bisa di-skip) jika lisensi belum aktif
  useEffect(() => {
    if (isLicensed) return;

    const intervalId = setInterval(() => {
      if (!isLicenseActive()) {
        setDonationCanSkip(true);
        setDonationReason("interval");
        setIsDonationModalOpen(true);
      }
    }, 10 * 60 * 1000); // 10 menit

    return () => clearInterval(intervalId);
  }, [isLicensed]);

  // Fungsi proteksi fitur yang memerlukan lisensi (Sesi Baru & Unduh Laporan - tidak bisa di-skip)
  const requireLicenseOrRun = (
    action: () => void,
    featureName: "new_session" | "download_report"
  ) => {
    if (isLicensed || isLicenseActive()) {
      action();
    } else {
      sound.playWarning();
      setPendingAction(() => action);
      setDonationCanSkip(false);
      setDonationReason(featureName);
      setIsDonationModalOpen(true);
    }
  };

  const handleDonationClose = (activated: boolean) => {
    setIsDonationModalOpen(false);
    if (activated) {
      setIsLicensed(true);
      showToast(
        "Selamat! Lisensi Seumur Hidup berhasil diaktifkan. Seluruh fitur kini telah terbuka!",
        "success"
      );
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      if (!donationCanSkip) {
        setPendingAction(null);
        showToast(
          "Fitur terkunci. Silakan masukkan password lisensi untuk menggunakan fitur ini.",
          "error"
        );
      }
    }
  };

  // Modal report state
  const [reportModalSession, setReportModalSession] = useState<SesiPenilaian | null>(null);

  // Handle Session Header updates
  const handleUpdateSessionMeta = (updated: Partial<SesiPenilaian>) => {
    setSession((prev) => {
      const next = { ...prev, ...updated, updatedAt: new Date().toISOString() };
      return next;
    });
  };

  // Add new question
  const handleAddSoal = () => {
    sound.playAddCard();
    setSession((prev) => {
      const newNomor = prev.soalList.length + 1;
      const newSoal: SoalItem = {
        id: `soal-${Date.now()}-${newNomor}`,
        nomorSoal: newNomor,
        naskahSoal: "",
        nilaiMaksimal: 10,
        jawabanTeks: "",
        isSaved: false,
      };

      const nextSoalList = [...prev.soalList, newSoal];
      const totals = calculateSessionTotals(nextSoalList);

      return {
        ...prev,
        soalList: nextSoalList,
        ...totals,
        updatedAt: new Date().toISOString(),
      };
    });
    showToast(`Butir Soal #${session.soalList.length + 1} berhasil ditambahkan.`, "info");
  };

  // Update specific question
  const handleUpdateSoal = (id: string, updated: Partial<SoalItem>) => {
    setSession((prev) => {
      const nextSoalList = prev.soalList.map((s) =>
        s.id === id ? { ...s, ...updated, updatedAt: new Date().toISOString() } : s
      );
      const totals = calculateSessionTotals(nextSoalList);
      return {
        ...prev,
        soalList: nextSoalList,
        ...totals,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Save single question
  const handleSaveSoal = (id: string) => {
    setSession((prev) => {
      const nextSoalList = prev.soalList.map((s) =>
        s.id === id ? { ...s, isSaved: true, updatedAt: new Date().toISOString() } : s
      );
      const totals = calculateSessionTotals(nextSoalList);
      const updatedSession: SesiPenilaian = {
        ...prev,
        soalList: nextSoalList,
        ...totals,
        updatedAt: new Date().toISOString(),
      };

      const updatedHistory = saveSessionToStorage(updatedSession);
      setHistoryList(updatedHistory);
      return updatedSession;
    });
    showToast("Soal berhasil disimpan.", "success");
  };

  // Clear single question inputs
  const handleClearSoal = (id: string) => {
    sound.playDelete();
    setSession((prev) => {
      const nextSoalList = prev.soalList.map((s) =>
        s.id === id
          ? {
              ...s,
              naskahSoal: "",
              gambarSoalBase64: null,
              gambarSoalMimeType: null,
              gambarSoalFileName: null,
              jawabanTeks: "",
              jawabanGambarBase64: null,
              jawabanGambarMimeType: null,
              jawabanGambarFileName: null,
              analisis: null,
              isSaved: false,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      const totals = calculateSessionTotals(nextSoalList);
      const nextSession = {
        ...prev,
        soalList: nextSoalList,
        ...totals,
        updatedAt: new Date().toISOString(),
      };
      const updatedHistory = saveSessionToStorage(nextSession);
      setHistoryList(updatedHistory);
      return nextSession;
    });
    showToast("Isian pada butir soal ini telah dibersihkan.", "info");
  };

  // Delete question
  const handleDeleteSoal = (id: string) => {
    sound.playDelete();
    if (session.soalList.length <= 1) {
      setSession((prev) => {
        const resetList: SoalItem[] = [
          {
            id: `soal-${Date.now()}-1`,
            nomorSoal: 1,
            naskahSoal: "",
            nilaiMaksimal: 10,
            jawabanTeks: "",
            gambarSoalBase64: null,
            gambarSoalMimeType: null,
            gambarSoalFileName: null,
            jawabanGambarBase64: null,
            jawabanGambarMimeType: null,
            jawabanGambarFileName: null,
            analisis: null,
            isSaved: false,
          },
        ];
        const totals = calculateSessionTotals(resetList);
        const nextSession = {
          ...prev,
          soalList: resetList,
          ...totals,
          updatedAt: new Date().toISOString(),
        };
        const updatedHistory = saveSessionToStorage(nextSession);
        setHistoryList(updatedHistory);
        return nextSession;
      });
      showToast("Soal dikosongkan ke format awal.", "info");
      return;
    }

    setSession((prev) => {
      const filtered = prev.soalList.filter((s) => s.id !== id);
      const reindexed = filtered.map((s, idx) => ({
        ...s,
        nomorSoal: idx + 1,
      }));
      const totals = calculateSessionTotals(reindexed);
      const nextSession: SesiPenilaian = {
        ...prev,
        soalList: reindexed,
        ...totals,
        updatedAt: new Date().toISOString(),
      };

      const updatedHistory = saveSessionToStorage(nextSession);
      setHistoryList(updatedHistory);
      return nextSession;
    });
    showToast("Butir soal berhasil dihapus.", "info");
  };

  // Reset entire session to blank
  const handleResetSession = () => {
    sound.playDelete();
    const fresh = createDefaultSession();
    setSession(fresh);
    showToast("Semua data nama siswa, kelas, dan soal berhasil dikosongkan.", "info");
  };

  // Save All
  const handleSaveAll = () => {
    setSession((prev) => {
      const markedAllSaved = prev.soalList.map((s) => ({ ...s, isSaved: true }));
      const totals = calculateSessionTotals(markedAllSaved);
      const updatedSession: SesiPenilaian = {
        ...prev,
        soalList: markedAllSaved,
        ...totals,
        updatedAt: new Date().toISOString(),
      };

      const updatedHistory = saveSessionToStorage(updatedSession);
      setHistoryList(updatedHistory);
      return updatedSession;
    });

    setSaveAllSuccess(true);
    showToast("Semua soal & penilaian berhasil disimpan ke riwayat.", "success");
    setTimeout(() => setSaveAllSuccess(false), 2000);
  };

  // Tambahkan ke Riwayat & Reset Form untuk Siswa Berikutnya
  const handleAddToHistory = () => {
    const namaClean = (session.namaSiswa || "").trim();
    if (!namaClean) {
      sound.playWarning();
      showToast("Harap isi Nama Siswa terlebih dahulu sebelum menambahkan ke riwayat.", "error");
      return;
    }

    const markedAllSaved = session.soalList.map((s) => ({ ...s, isSaved: true }));
    const totals = calculateSessionTotals(markedAllSaved);
    const sessionToSave: SesiPenilaian = {
      ...session,
      namaSiswa: namaClean,
      soalList: markedAllSaved,
      ...totals,
      updatedAt: new Date().toISOString(),
    };

    // 1. Simpan sesi lengkap ke riwayat per nama dan kelas
    const updatedHistory = saveSessionToStorage(sessionToSave);
    setHistoryList(updatedHistory);

    // 2. Reset HANYA naskah jawaban siswa, nama siswa, dan kelas (naskah soal, bobot, mapel, & judul tetap)
    const freshForNextStudent = resetSessionAnswersForNextStudent(sessionToSave);
    setSession(freshForNextStudent);

    sound.playSuccess();
    showToast(
      `Nilai siswa "${namaClean}" ${session.kelas ? `(Kelas ${session.kelas})` : ""} berhasil ditambahkan ke riwayat! Form jawaban, nama, dan kelas telah direset untuk siswa berikutnya.`,
      "success"
    );
  };

  // Analyze single question
  const handleAnalyzeSingle = async (soal: SoalItem) => {
    if (!soal.jawabanTeks && !soal.jawabanGambarBase64) {
      showToast("Harap masukkan teks jawaban atau lampirkan foto/screenshot jawaban terlebih dahulu.", "error");
      return;
    }

    setAnalyzingMap((prev) => ({ ...prev, [soal.id]: true }));

    try {
      const result = await analyzeSingleQuestion({
        id: soal.id,
        nomorSoal: soal.nomorSoal,
        naskahSoal: soal.naskahSoal,
        gambarSoalBase64: soal.gambarSoalBase64,
        gambarSoalMimeType: soal.gambarSoalMimeType,
        nilaiMaksimal: soal.nilaiMaksimal,
        jawabanTeks: soal.jawabanTeks,
        jawabanGambarBase64: soal.jawabanGambarBase64,
        jawabanGambarMimeType: soal.jawabanGambarMimeType,
        apiKeys: apiKeys,
      });

      setSession((prev) => {
        const nextSoalList = prev.soalList.map((s) =>
          s.id === soal.id ? { ...s, analisis: result, isSaved: true } : s
        );
        const totals = calculateSessionTotals(nextSoalList);
        const updatedSession = {
          ...prev,
          soalList: nextSoalList,
          ...totals,
          updatedAt: new Date().toISOString(),
        };
        const updatedHistory = saveSessionToStorage(updatedSession);
        setHistoryList(updatedHistory);
        return updatedSession;
      });
      showToast(`Soal #${soal.nomorSoal} berhasil dianalisis AI!`, "success");
    } catch (err: any) {
      console.error("Gagal analisis soal:", err);
      let msg = err.message || "Terjadi kendala saat menganalisis.";
      if (msg.includes("API Key") || msg.includes("API_KEY")) {
        setIsApiKeyModalOpen(true);
      }
      if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        msg = "Server Google AI sedang mengalami lonjakan beban sementara (503). Silakan coba kembali.";
      }
      showToast(msg, "error");
    } finally {
      setAnalyzingMap((prev) => ({ ...prev, [soal.id]: false }));
    }
  };

  // Cancel batch analysis handler
  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
    setBatchProgress((prev) => ({ ...prev, isCancelling: true }));
    showToast("Menghentikan proses analisis berurutan...", "info");
  };

  // Analyze all questions sequentially one by one
  const handleAnalyzeAll = async () => {
    // Filter questions that have either text or image answers
    const questionsToAnalyze = session.soalList.filter(
      (s) => (s.jawabanTeks && s.jawabanTeks.trim().length > 0) || s.jawabanGambarBase64
    );

    if (questionsToAnalyze.length === 0) {
      sound.playWarning();
      showToast("Belum ada jawaban siswa yang diisi atau diunggah pada butir soal manapun.", "error");
      return;
    }

    cancelBatchRef.current = false;
    setIsBatchAnalyzing(true);
    sound.playTabClick();

    const total = questionsToAnalyze.length;
    setBatchProgress({
      isActive: true,
      currentIndex: 0,
      total,
      currentSoalNumber: questionsToAnalyze[0].nomorSoal,
      percent: 0,
      statusText: `Mempersiapkan analisis berurutan (${total} butir soal)...`,
      succeededCount: 0,
      failedCount: 0,
      elapsedSeconds: 0,
      isCancelling: false,
    });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < questionsToAnalyze.length; i++) {
      if (cancelBatchRef.current) {
        showToast("Analisis berurutan telah dihentikan oleh pengguna.", "info");
        break;
      }

      const currentSoal = questionsToAnalyze[i];
      const startPercent = Math.round((i / total) * 100);

      setBatchProgress((prev) => ({
        ...prev,
        currentIndex: i,
        currentSoalNumber: currentSoal.nomorSoal,
        percent: startPercent,
        statusText: `Sedang menganalisis Soal #${currentSoal.nomorSoal} (${i + 1} dari ${total})...`,
      }));

      // Highlight active question card
      setAnalyzingMap((prev) => ({ ...prev, [currentSoal.id]: true }));

      try {
        const result = await analyzeSingleQuestion({
          id: currentSoal.id,
          nomorSoal: currentSoal.nomorSoal,
          naskahSoal: currentSoal.naskahSoal,
          gambarSoalBase64: currentSoal.gambarSoalBase64,
          gambarSoalMimeType: currentSoal.gambarSoalMimeType,
          nilaiMaksimal: currentSoal.nilaiMaksimal,
          jawabanTeks: currentSoal.jawabanTeks,
          jawabanGambarBase64: currentSoal.jawabanGambarBase64,
          jawabanGambarMimeType: currentSoal.jawabanGambarMimeType,
          apiKeys: apiKeys,
        });

        succeeded++;

        // Instantly update session and storage for this question
        setSession((prev) => {
          const nextSoalList = prev.soalList.map((s) =>
            s.id === currentSoal.id ? { ...s, analisis: result, isSaved: true } : s
          );
          const totals = calculateSessionTotals(nextSoalList);
          const updatedSession = {
            ...prev,
            soalList: nextSoalList,
            ...totals,
            updatedAt: new Date().toISOString(),
          };
          const updatedHistory = saveSessionToStorage(updatedSession);
          setHistoryList(updatedHistory);
          return updatedSession;
        });

        const newPercent = Math.round(((i + 1) / total) * 100);
        setBatchProgress((prev) => ({
          ...prev,
          succeededCount: succeeded,
          percent: newPercent,
          statusText: `Soal #${currentSoal.nomorSoal} berhasil dianalisis (Nilai: ${result.nilaiDiberikan}/${currentSoal.nilaiMaksimal})`,
        }));
      } catch (err: any) {
        console.error(`Gagal analisis soal #${currentSoal.nomorSoal}:`, err);
        failed++;
        const newPercent = Math.round(((i + 1) / total) * 100);
        setBatchProgress((prev) => ({
          ...prev,
          failedCount: failed,
          percent: newPercent,
          statusText: `Soal #${currentSoal.nomorSoal} gagal dievaluasi.`,
        }));

        let msg = err.message || "Gagal";
        if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
          msg = `Soal #${currentSoal.nomorSoal}: Server Google AI sibuk (503)`;
        } else if (msg.includes("429") || msg.includes("kuota") || msg.includes("quota")) {
          msg = `Soal #${currentSoal.nomorSoal}: Kuota API Key habis (429)`;
        }
        showToast(msg, "error");
      } finally {
        setAnalyzingMap((prev) => ({ ...prev, [currentSoal.id]: false }));
      }

      // Safe pause between questions to preserve rate limits
      if (i < questionsToAnalyze.length - 1 && !cancelBatchRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    setIsBatchAnalyzing(false);
    setBatchProgress((prev) => ({
      ...prev,
      percent: 100,
      statusText: `Selesai: ${succeeded} berhasil dievaluasi, ${failed} gagal/dilewati.`,
      isCancelling: false,
    }));

    // Final outcome notification & audio
    if (succeeded > 0 && failed === 0) {
      sound.playSuccess();
      showToast(`Semua ${succeeded} butir soal berhasil dianalisis secara berurutan!`, "success");
    } else if (succeeded > 0 && failed > 0) {
      sound.playWarning();
      showToast(`Analisis berurutan selesai: ${succeeded} berhasil, ${failed} kendala.`, "warning");
    } else if (!cancelBatchRef.current) {
      sound.playWarning();
      showToast("Gagal melakukan analisis berurutan. Periksa API Key Anda.", "error");
    }

    // Auto dismiss banner after 3 seconds
    setTimeout(() => {
      setBatchProgress((prev) => ({ ...prev, isActive: false }));
    }, 3000);
  };

  // Start a new session
  const handleNewSession = () => {
    sound.playAddCard();
    const fresh = createDefaultSession();
    setSession(fresh);
    setActiveTab("editor");
    showToast("Sesi baru telah disiapkan dalam kondisi bersih.", "info");
  };

  // Delete session from history
  const handleDeleteSession = (sessionId: string) => {
    sound.playDelete();
    const updated = deleteSessionFromStorage(sessionId);
    setHistoryList(updated);
    if (session.id === sessionId) {
      if (updated.length > 0) {
        setSession(updated[0]);
      } else {
        setSession(createDefaultSession());
      }
    }
    showToast("Sesi riwayat berhasil dihapus.", "info");
  };

  // Re-analyze all questions of a specific student session in History
  const handleReanalyzeHistorySession = async (targetSession: SesiPenilaian) => {
    const questionsToAnalyze = targetSession.soalList.filter(
      (s) => (s.jawabanTeks && s.jawabanTeks.trim().length > 0) || s.jawabanGambarBase64
    );

    if (questionsToAnalyze.length === 0) {
      sound.playWarning();
      showToast(
        `Tidak ada jawaban teks maupun lampiran foto pada data siswa "${targetSession.namaSiswa || "Siswa"}".`,
        "error"
      );
      return;
    }

    setReanalyzingSessionId(targetSession.id);
    sound.playTabClick();
    showToast(
      `Mulai menganalisis ulang seluruh jawaban siswa "${targetSession.namaSiswa || "Siswa"}" (${questionsToAnalyze.length} butir)...`,
      "info"
    );

    let currentSessionState = { ...targetSession };
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < questionsToAnalyze.length; i++) {
      const currentSoal = questionsToAnalyze[i];
      setReanalyzingProgress({
        current: i + 1,
        total: questionsToAnalyze.length,
        soalNum: currentSoal.nomorSoal,
      });

      try {
        const result = await analyzeSingleQuestion({
          id: currentSoal.id,
          nomorSoal: currentSoal.nomorSoal,
          naskahSoal: currentSoal.naskahSoal,
          gambarSoalBase64: currentSoal.gambarSoalBase64,
          gambarSoalMimeType: currentSoal.gambarSoalMimeType,
          nilaiMaksimal: currentSoal.nilaiMaksimal,
          jawabanTeks: currentSoal.jawabanTeks,
          jawabanGambarBase64: currentSoal.jawabanGambarBase64,
          jawabanGambarMimeType: currentSoal.jawabanGambarMimeType,
          apiKeys: apiKeys,
        });

        succeeded++;

        const nextSoalList = currentSessionState.soalList.map((s) =>
          s.id === currentSoal.id ? { ...s, analisis: result, isSaved: true } : s
        );
        const totals = calculateSessionTotals(nextSoalList);
        currentSessionState = {
          ...currentSessionState,
          soalList: nextSoalList,
          ...totals,
          updatedAt: new Date().toISOString(),
        };

        // Simpan langsung ke localStorage riwayat
        const updatedHistory = saveSessionToStorage(currentSessionState);
        setHistoryList(updatedHistory);

        // Jika sesi ini sedang aktif dibuka di editor, ikut sinkronkan
        setSession((prev) => (prev.id === currentSessionState.id ? currentSessionState : prev));
      } catch (err: any) {
        console.error(`Gagal analisis ulang soal #${currentSoal.nomorSoal}:`, err);
        failed++;
        let msg = err.message || "Gagal";
        if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
          msg = `Soal #${currentSoal.nomorSoal}: Server AI sibuk (503)`;
        } else if (msg.includes("API Key") || msg.includes("API_KEY")) {
          setIsApiKeyModalOpen(true);
        }
        showToast(msg, "error");
      }

      if (i < questionsToAnalyze.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    setReanalyzingSessionId(null);
    setReanalyzingProgress(null);

    if (succeeded > 0 && failed === 0) {
      sound.playSuccess();
      showToast(
        `Analisis ulang berhasil! Seluruh (${succeeded}) butir jawaban siswa "${targetSession.namaSiswa || "Siswa"}" telah dievaluasi ulang oleh AI.`,
        "success"
      );
    } else if (succeeded > 0) {
      sound.playWarning();
      showToast(
        `Analisis ulang selesai: ${succeeded} butir berhasil dievaluasi, ${failed} butir terkendala.`,
        "warning"
      );
    } else {
      sound.playWarning();
      showToast("Gagal melakukan analisis ulang. Silakan periksa koneksi atau API Key Anda.", "error");
    }
  };

  // Export current session to Excel
  const handleExportCurrentToExcel = () => {
    sound.playSuccess();
    exportSessionsToExcel([session]);
    showToast("File Excel berwarna berhasil diunduh.", "success");
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Toast Notification Bar dengan Animasi Motion */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 pointer-events-auto"
          >
            <div
              className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md ${
                toast.type === "success"
                  ? "bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-950/50"
                  : toast.type === "error"
                  ? "bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/50"
                  : toast.type === "warning"
                  ? "bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-950/50"
                  : "bg-slate-900/90 text-cyan-100 border-cyan-500/30 shadow-black/60"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
              {toast.type === "error" && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
              {toast.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
              {toast.type === "info" && <Info className="h-4 w-4 text-cyan-400 shrink-0" />}
              <span className="pr-1">{toast.text}</span>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header dengan Neon Branding, Audio Toggle & Status Donasi/Lisensi */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={historyList.length}
        onNewSession={() => requireLicenseOrRun(handleNewSession, "new_session")}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        apiKeyCount={apiKeys.length}
        isLicensed={isLicensed}
        onOpenDonationModal={() => {
          setDonationCanSkip(true);
          setDonationReason("manual");
          setIsDonationModalOpen(true);
        }}
      />

      {/* Main Container dengan Animasi Perpindahan Tab */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "editor" ? (
            <motion.div
              key="tab-editor"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Identitas Siswa: Hanya Nama & Kelas */}
              <SessionHeader
                session={session}
                onChange={handleUpdateSessionMeta}
                darkMode={darkMode}
              />

              {/* Action Bar & Stats Ringkas */}
              <SessionActionBar
                session={session}
                darkMode={darkMode}
                onAddSoal={handleAddSoal}
                onSaveAll={handleSaveAll}
                onAddToHistory={handleAddToHistory}
                onAnalyzeAll={handleAnalyzeAll}
                onOpenReport={() =>
                  requireLicenseOrRun(() => {
                    sound.playTabClick();
                    setReportModalSession(session);
                  }, "download_report")
                }
                onExportExcel={() =>
                  requireLicenseOrRun(handleExportCurrentToExcel, "download_report")
                }
                onResetSession={() =>
                  requireLicenseOrRun(handleResetSession, "new_session")
                }
                isBatchAnalyzing={isBatchAnalyzing}
                saveAllSuccess={saveAllSuccess}
              />

              {/* Visual Loading Progress Bar Interaktif untuk Analisis Berurutan */}
              <BatchProgressBanner
                progress={batchProgress}
                namaSiswa={session.namaSiswa}
                onCancel={handleCancelBatch}
              />

              {/* Daftar Butir Soal dengan Animasi Stagger & Fade */}
              <div className="space-y-4">
                {session.soalList.map((soal) => (
                  <motion.div
                    key={soal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SoalCard
                      soal={soal}
                      totalSoal={session.soalList.length}
                      darkMode={darkMode}
                      onUpdate={(updated) => handleUpdateSoal(soal.id, updated)}
                      onSave={() => handleSaveSoal(soal.id)}
                      onClear={() => handleClearSoal(soal.id)}
                      onDelete={() => handleDeleteSoal(soal.id)}
                      onAnalyze={() => handleAnalyzeSingle(soal)}
                      isAnalyzing={!!analyzingMap[soal.id]}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Bottom Add Soal Button */}
              <div className="pt-2 pb-10 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleAddSoal}
                  className="px-6 py-3 rounded-2xl border border-dashed border-indigo-500/40 bg-indigo-950/20 hover:bg-indigo-900/30 text-indigo-300 text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-black/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Butir Soal #{session.soalList.length + 1}</span>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            /* Tab Riwayat */
            <motion.div
              key="tab-history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <HistoryView
                sessions={historyList}
                darkMode={darkMode}
                onOpenSession={(s) => {
                  sound.playTabClick();
                  setSession(s);
                  setActiveTab("editor");
                }}
                onDeleteSession={handleDeleteSession}
                onOpenReportModal={(s) =>
                  requireLicenseOrRun(() => {
                    sound.playTabClick();
                    setReportModalSession(s);
                  }, "download_report")
                }
                onRequireLicense={requireLicenseOrRun}
                onReanalyzeSession={handleReanalyzeHistorySession}
                reanalyzingSessionId={reanalyzingSessionId}
                reanalyzingProgress={reanalyzingProgress}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal Donasi & Aktivasi Lisensi Seumur Hidup */}
      <DonationModal
        isOpen={isDonationModalOpen}
        canSkip={donationCanSkip}
        triggerReason={donationReason}
        onClose={handleDonationClose}
        onSuccessActivate={() => {
          setIsLicensed(true);
        }}
      />

      {/* Modal Pengaturan & Verifikasi API Key Gemini */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        darkMode={darkMode}
        onKeysUpdated={(keys) => setApiKeys(keys)}
      />

      {/* Modal Laporan PDF/JPG */}
      {reportModalSession && (
        <ReportModal
          session={reportModalSession}
          darkMode={darkMode}
          onClose={() => setReportModalSession(null)}
        />
      )}
    </div>
  );
}
