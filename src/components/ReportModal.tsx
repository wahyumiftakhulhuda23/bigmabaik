import { useState } from "react";
import { X, Download, FileText, Check, Loader2, AlertCircle, Printer, FileSpreadsheet } from "lucide-react";
import { SesiPenilaian, SoalItem } from "../types";
import { calculateSessionTotals } from "../utils/storage";
import { exportPagesToPDF, exportPagesToJPG } from "../utils/pdfExport";
import { exportSessionsToExcel } from "../utils/excelExport";

interface ReportModalProps {
  session: SesiPenilaian;
  darkMode: boolean;
  onClose: () => void;
}

export default function ReportModal({ session, darkMode, onClose }: ReportModalProps) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingJPG, setIsExportingJPG] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const stats = calculateSessionTotals(session.soalList);

  const cleanStudentName = session.namaSiswa
    ? session.namaSiswa.replace(/[^a-zA-Z0-9]/g, "_")
    : "Siswa";
  const todayStr = new Date().toISOString().split("T")[0];

  // Smart Pagination: Hitung pembagian soal per lembar A4
  // Halaman 1 memiliki Kop Surat + Identitas + 4 Box Metrik, sehingga muat maksimal 2 soal agar tidak padat.
  // Halaman selanjutnya memuat hingga 3 soal per halaman + tanda tangan di halaman terakhir.
  const totalSoal = session.soalList.length;
  const pagesData: { pageIndex: number; totalPages: number; soalItems: SoalItem[]; isFirst: boolean; isLast: boolean }[] = [];

  if (totalSoal <= 2) {
    // Muat 1 Halaman Saja
    pagesData.push({
      pageIndex: 1,
      totalPages: 1,
      soalItems: session.soalList,
      isFirst: true,
      isLast: true,
    });
  } else {
    // Halaman 1: Soal 0 s.d 1 (2 soal)
    const firstPageItems = session.soalList.slice(0, 2);
    const remainingItems = session.soalList.slice(2);
    const subsequentPages: SoalItem[][] = [];

    for (let i = 0; i < remainingItems.length; i += 3) {
      subsequentPages.push(remainingItems.slice(i, i + 3));
    }

    const totalPagesCount = 1 + subsequentPages.length;

    pagesData.push({
      pageIndex: 1,
      totalPages: totalPagesCount,
      soalItems: firstPageItems,
      isFirst: true,
      isLast: totalPagesCount === 1,
    });

    subsequentPages.forEach((items, idx) => {
      const pageNumber = 2 + idx;
      pagesData.push({
        pageIndex: pageNumber,
        totalPages: totalPagesCount,
        soalItems: items,
        isFirst: false,
        isLast: pageNumber === totalPagesCount,
      });
    });
  }

  const pageElementIds = pagesData.map((p) => `laporan-lembar-a4-${p.pageIndex}`);

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    setExportError(null);
    setExportSuccess(null);

    const result = await exportPagesToPDF(
      pageElementIds,
      `Laporan_Nilai_${cleanStudentName}_${todayStr}.pdf`
    );

    setIsExportingPDF(false);
    if (result.success) {
      setExportSuccess("File PDF resmi berhasil diunduh dengan tata letak A4 rapi!");
      setTimeout(() => setExportSuccess(null), 3500);
    } else {
      setExportError(result.error || "Gagal mengunduh file PDF.");
    }
  };

  const handleDownloadJPG = async () => {
    setIsExportingJPG(true);
    setExportError(null);
    setExportSuccess(null);

    const result = await exportPagesToJPG(
      pageElementIds,
      `Laporan_Nilai_${cleanStudentName}_${todayStr}.jpg`
    );

    setIsExportingJPG(false);
    if (result.success) {
      setExportSuccess("Berkas gambar JPG beresolusi tinggi berhasil diunduh!");
      setTimeout(() => setExportSuccess(null), 3500);
    } else {
      setExportError(result.error || "Gagal mengunduh gambar JPG.");
    }
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    const result = await exportSessionsToExcel(
      [session],
      `Rekap_Nilai_${cleanStudentName}_${todayStr}.xlsx`
    );
    setIsExportingExcel(false);
    if (result.success) {
      setExportSuccess("File Excel (.xlsx) dengan kolom berwarna berhasil diunduh!");
      setTimeout(() => setExportSuccess(null), 3500);
    } else {
      setExportError(result.error || "Gagal mengunduh file Excel.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Laporan Evaluasi & Rekapitulasi Siswa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format lembar resmi A4 ({pagesData.length} Halaman) siap diunduh dalam PDF, JPG, atau Excel
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tombol Unduh Excel */}
            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel || isExportingPDF || isExportingJPG}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Unduh rekap data sesi ini ke format Excel berwarna"
            >
              {isExportingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Tombol Unduh JPG */}
            <button
              onClick={handleDownloadJPG}
              disabled={isExportingJPG || isExportingPDF}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isExportingJPG ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>Unduh JPG</span>
            </button>

            {/* Tombol Unduh PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF || isExportingJPG}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              {isExportingPDF ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Unduh PDF (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {exportSuccess && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium shrink-0 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {exportError && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium shrink-0 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Printable Report Preview Container */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center gap-6">
          {pagesData.map((page) => (
            <div
              key={page.pageIndex}
              id={`laporan-lembar-a4-${page.pageIndex}`}
              style={{
                width: "794px", // Standard A4 width at 96 DPI
                minHeight: "1122px", // Standard A4 height at 96 DPI
                backgroundColor: "#ffffff",
                color: "#0f172a",
                padding: "36px 42px",
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                fontSize: "11.5px",
                lineHeight: 1.45,
                boxSizing: "border-box",
                borderRadius: "2px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {/* Content Area */}
              <div>
                {/* KOP SURAT (HANYA DI HALAMAN 1) */}
                {page.isFirst && (
                  <div
                    style={{
                      borderBottom: "2px solid #1e293b",
                      paddingBottom: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: 900,
                            color: "#3730a3",
                            letterSpacing: "-0.5px",
                          }}
                        >
                          BigMA Baik
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            fontWeight: 600,
                            paddingLeft: "6px",
                            borderLeft: "1.5px solid #cbd5e1",
                          }}
                        >
                          Sistem Evaluasi Jawaban & Pengawasan Integritas AI
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          color: "#334155",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Dokumen Resmi Penilaian
                      </span>
                    </div>

                    <h2
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 800,
                        margin: "0 0 2px 0",
                        textTransform: "uppercase",
                        color: "#0f172a",
                        letterSpacing: "0.2px",
                      }}
                    >
                      Laporan Hasil Penilaian & Analisis Orisinalitas Siswa
                    </h2>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#64748b" }}>
                      Rekapitulasi evaluasi bobot jawaban, ketepatan substansi, serta identifikasi indikator kecerdasan buatan
                    </p>
                  </div>
                )}

                {/* HEADER LANJUTAN (UNTUK HALAMAN 2 DST) */}
                {!page.isFirst && (
                  <div
                    style={{
                      borderBottom: "1.5px solid #cbd5e1",
                      paddingBottom: "10px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#3730a3" }}>
                        BigMA Baik
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
                        Lanjutan Laporan Evaluasi Jawaban Siswa
                      </span>
                    </div>
                    <span style={{ fontSize: "10.5px", color: "#475569", fontWeight: 600 }}>
                      {session.namaSiswa || "Siswa"} • Kelas: {session.kelas || "-"}
                    </span>
                  </div>
                )}

                {/* IDENTITAS SISWA & UJIAN (HALAMAN 1) */}
                {page.isFirst && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1fr",
                      gap: "10px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      marginBottom: "16px",
                      fontSize: "11px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: "9.5px", fontWeight: 700 }}>
                        NAMA LENGKAP SISWA:
                      </span>
                      <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a" }}>
                        {session.namaSiswa || "(Belum Diisi)"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: "9.5px", fontWeight: 700 }}>
                        KELAS & NOMOR INDUK:
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                        {session.kelas || "-"} {session.nomorInduk ? `• ${session.nomorInduk}` : ""}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: "9.5px", fontWeight: 700 }}>
                        MATA PELAJARAN / TANGGAL:
                      </span>
                      <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#334155" }}>
                        {session.mataPelajaran || "-"} • {session.tanggal || new Date().toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4 KOTAK RINGKASAN METRIK NILAI (HALAMAN 1) */}
                {page.isFirst && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "8px",
                      marginBottom: "18px",
                    }}
                  >
                    {/* Box 1: Total Poin */}
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Total Nilai
                      </div>
                      <div style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a", margin: "2px 0" }}>
                        {stats.totalNilaiDiberikan}
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#64748b" }}>
                        dari maks {stats.totalNilaiMaksimal}
                      </div>
                    </div>

                    {/* Box 2: Skala 100 */}
                    <div
                      style={{
                        backgroundColor: stats.nilaiSkala100 >= 75 ? "#ecfdf5" : stats.nilaiSkala100 >= 60 ? "#fffbeb" : "#fef2f2",
                        border: `1px solid ${stats.nilaiSkala100 >= 75 ? "#a7f3d0" : stats.nilaiSkala100 >= 60 ? "#fde68a" : "#fecaca"}`,
                        borderRadius: "6px",
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: stats.nilaiSkala100 >= 75 ? "#065f46" : stats.nilaiSkala100 >= 60 ? "#92400e" : "#991b1b",
                          textTransform: "uppercase",
                        }}
                      >
                        Skala 100
                      </div>
                      <div
                        style={{
                          fontSize: "17px",
                          fontWeight: 900,
                          color: stats.nilaiSkala100 >= 75 ? "#047857" : stats.nilaiSkala100 >= 60 ? "#b45309" : "#dc2626",
                          margin: "2px 0",
                        }}
                      >
                        {stats.nilaiSkala100}
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color: stats.nilaiSkala100 >= 75 ? "#059669" : stats.nilaiSkala100 >= 60 ? "#d97706" : "#ef4444",
                        }}
                      >
                        {stats.nilaiSkala100 >= 75 ? "TUNTAS" : "REMEDIAL"}
                      </div>
                    </div>

                    {/* Box 3: Kesesuaian */}
                    <div
                      style={{
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                        Rerata Kesesuaian
                      </div>
                      <div style={{ fontSize: "17px", fontWeight: 900, color: "#1d4ed8", margin: "2px 0" }}>
                        {stats.rataRataKesesuaianPersen}%
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#2563eb", fontWeight: 600 }}>
                        Akurasi Materi
                      </div>
                    </div>

                    {/* Box 4: Indikasi AI */}
                    <div
                      style={{
                        backgroundColor:
                          stats.rataRataAiPersen > 60 ? "#fff1f2" : stats.rataRataAiPersen > 30 ? "#fffbeb" : "#f0fdf4",
                        border: `1px solid ${
                          stats.rataRataAiPersen > 60 ? "#fecdd3" : stats.rataRataAiPersen > 30 ? "#fde68a" : "#bbf7d0"
                        }`,
                        borderRadius: "6px",
                        padding: "8px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color:
                            stats.rataRataAiPersen > 60 ? "#9f1239" : stats.rataRataAiPersen > 30 ? "#92400e" : "#166534",
                          textTransform: "uppercase",
                        }}
                      >
                        Rerata Indikasi AI
                      </div>
                      <div
                        style={{
                          fontSize: "17px",
                          fontWeight: 900,
                          color:
                            stats.rataRataAiPersen > 60 ? "#be123c" : stats.rataRataAiPersen > 30 ? "#b45309" : "#15803d",
                          margin: "2px 0",
                        }}
                      >
                        {stats.rataRataAiPersen}%
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color:
                            stats.rataRataAiPersen > 60 ? "#e11d48" : stats.rataRataAiPersen > 30 ? "#d97706" : "#16a34a",
                        }}
                      >
                        {stats.rataRataAiPersen > 60
                          ? "Dominan AI"
                          : stats.rataRataAiPersen > 30
                          ? "Campuran AI"
                          : "Aman (Orisinal)"}
                      </div>
                    </div>
                  </div>
                )}

                {/* TABEL PER BUTIR SOAL PADA HALAMAN INI */}
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      color: "#334155",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      Rincian Evaluasi Jawaban Siswa {page.totalPages > 1 ? `(Bagian ${page.pageIndex} dari ${page.totalPages})` : ""}
                    </span>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
                      {session.judulUjian || "Ujian Esai"}
                    </span>
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #cbd5e1",
                      fontSize: "10.5px",
                      tableLayout: "fixed",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1.5px solid #94a3b8" }}>
                        <th style={{ width: "32px", padding: "7px 4px", textAlign: "center", fontWeight: 800, color: "#1e293b" }}>
                          No
                        </th>
                        <th style={{ width: "185px", padding: "7px 8px", textAlign: "left", fontWeight: 800, color: "#1e293b" }}>
                          Pertanyaan / Soal
                        </th>
                        <th style={{ width: "180px", padding: "7px 8px", textAlign: "left", fontWeight: 800, color: "#1e293b" }}>
                          Jawaban Siswa
                        </th>
                        <th style={{ width: "65px", padding: "7px 4px", textAlign: "center", fontWeight: 800, color: "#1e293b" }}>
                          Nilai
                        </th>
                        <th style={{ width: "70px", padding: "7px 4px", textAlign: "center", fontWeight: 800, color: "#1e293b" }}>
                          Kesesuaian
                        </th>
                        <th style={{ width: "70px", padding: "7px 4px", textAlign: "center", fontWeight: 800, color: "#1e293b" }}>
                          Indikasi AI
                        </th>
                        <th style={{ width: "148px", padding: "7px 8px", textAlign: "left", fontWeight: 800, color: "#1e293b" }}>
                          Catatan & Kategori
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.soalItems.map((soal, idx) => (
                        <tr
                          key={soal.id}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                          }}
                        >
                          {/* Nomor */}
                          <td
                            style={{
                              padding: "8px 4px",
                              textAlign: "center",
                              fontWeight: 700,
                              color: "#334155",
                              verticalAlign: "top",
                            }}
                          >
                            #{soal.nomorSoal}
                          </td>

                          {/* Soal */}
                          <td
                            style={{
                              padding: "8px 8px",
                              color: "#1e293b",
                              verticalAlign: "top",
                              wordBreak: "break-word",
                            }}
                          >
                            {soal.naskahSoal?.trim() ? (
                              <div style={{ lineHeight: 1.4 }}>{soal.naskahSoal.trim()}</div>
                            ) : (
                              <div style={{ color: "#64748b", fontStyle: "italic" }}>
                                {soal.gambarSoalFileName
                                  ? `Lampiran: ${soal.gambarSoalFileName}`
                                  : "(Soal Tanpa Teks)"}
                              </div>
                            )}
                          </td>

                          {/* Jawaban */}
                          <td
                            style={{
                              padding: "8px 8px",
                              color: "#1e293b",
                              verticalAlign: "top",
                              wordBreak: "break-word",
                            }}
                          >
                            {soal.jawabanTeks?.trim() ? (
                              <div style={{ lineHeight: 1.4 }}>{soal.jawabanTeks.trim()}</div>
                            ) : soal.jawabanGambarBase64 ? (
                              <div style={{ color: "#4338ca", fontStyle: "italic" }}>
                                [Foto/Berkas Jawaban Terlampir]
                              </div>
                            ) : (
                              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                (Tidak Diisi / Kosong)
                              </div>
                            )}
                          </td>

                          {/* Nilai */}
                          <td
                            style={{
                              padding: "8px 4px",
                              textAlign: "center",
                              verticalAlign: "top",
                            }}
                          >
                            <span style={{ fontWeight: 800, fontSize: "11.5px", color: "#0f172a" }}>
                              {soal.analisis ? soal.analisis.nilaiDiberikan : 0}
                            </span>
                            <span style={{ fontSize: "9.5px", color: "#64748b", display: "block" }}>
                              / {soal.nilaiMaksimal}
                            </span>
                          </td>

                          {/* Kesesuaian */}
                          <td
                            style={{
                              padding: "8px 4px",
                              textAlign: "center",
                              verticalAlign: "top",
                            }}
                          >
                            {soal.analisis ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  fontWeight: 700,
                                  color: "#1d4ed8",
                                  backgroundColor: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                }}
                              >
                                {soal.analisis.kesesuaianPersen}%
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>

                          {/* Indikasi AI */}
                          <td
                            style={{
                              padding: "8px 4px",
                              textAlign: "center",
                              verticalAlign: "top",
                            }}
                          >
                            {soal.analisis ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  fontWeight: 700,
                                  color:
                                    soal.analisis.indikasiAiPersen > 60
                                      ? "#b91c1c"
                                      : soal.analisis.indikasiAiPersen > 30
                                      ? "#b45309"
                                      : "#15803d",
                                  backgroundColor:
                                    soal.analisis.indikasiAiPersen > 60
                                      ? "#fef2f2"
                                      : soal.analisis.indikasiAiPersen > 30
                                      ? "#fffbeb"
                                      : "#f0fdf4",
                                  border: `1px solid ${
                                    soal.analisis.indikasiAiPersen > 60
                                      ? "#fecaca"
                                      : soal.analisis.indikasiAiPersen > 30
                                      ? "#fde68a"
                                      : "#bbf7d0"
                                  }`,
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                }}
                              >
                                {soal.analisis.indikasiAiPersen}%
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>

                          {/* Catatan Analisis */}
                          <td
                            style={{
                              padding: "8px 8px",
                              verticalAlign: "top",
                              color: "#334155",
                              fontSize: "10px",
                              lineHeight: 1.35,
                              wordBreak: "break-word",
                            }}
                          >
                            {soal.analisis ? (
                              <div>
                                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "2px" }}>
                                  {soal.analisis.aiDugaanKategori}
                                </div>
                                <div style={{ color: "#475569" }}>
                                  {soal.analisis.ringkasanAnalisis}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                Belum dianalisis
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* CATATAN GURU & TANDA TANGAN (HANYA PADA HALAMAN TERAKHIR) */}
                {page.isLast && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1fr",
                      gap: "20px",
                      borderTop: "1.5px solid #cbd5e1",
                      paddingTop: "14px",
                      fontSize: "10.5px",
                      marginTop: "14px",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, color: "#1e293b", display: "block", marginBottom: "4px" }}>
                        Catatan & Arahan Guru Evaluator:
                      </span>
                      <p style={{ margin: 0, color: "#475569", lineHeight: 1.5, fontStyle: "italic" }}>
                        {session.catatanGuru ||
                          "Penilaian telah disesuaikan secara berimbang antara ketepatan pemahaman siswa serta indikator orisinalitas dalam menjawab butir soal."}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 2px 0", color: "#64748b", fontSize: "10px" }}>
                        Diperiksa pada: {session.tanggal || new Date().toLocaleDateString("id-ID")}
                      </p>
                      <p style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>
                        Guru Pengampu / Penilai,
                      </p>
                      <div style={{ paddingTop: "40px" }}>
                        <div
                          style={{
                            borderBottom: "1px solid #475569",
                            width: "160px",
                            marginLeft: "auto",
                            marginBottom: "4px",
                          }}
                        />
                        <span style={{ fontSize: "9.5px", color: "#64748b", fontWeight: 600 }}>
                          Tanda Tangan & Nama Terang
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER HALAMAN DOKUMEN CETAK */}
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "8px",
                  marginTop: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  color: "#94a3b8",
                }}
              >
                <span>Dicetak melalui BigMA Baik • Sistem Penilaian & Integritas AI Siswa</span>
                <span style={{ fontWeight: 700, color: "#64748b" }}>
                  Halaman {page.pageIndex} dari {page.totalPages}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
