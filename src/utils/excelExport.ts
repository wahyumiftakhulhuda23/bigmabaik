import ExcelJS from "exceljs";
import { SesiPenilaian } from "../types";

/**
 * Ekspor data sesi penilaian ke Excel dengan format rapi dan baris serta kolom berwarna.
 */
export async function exportSessionsToExcel(
  sessions: SesiPenilaian[],
  customFilename?: string
): Promise<{ success: boolean; error?: string }> {
  if (!sessions || sessions.length === 0) {
    return { success: false, error: "Tidak ada data riwayat penilaian untuk diekspor." };
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BigMA Baik";
    workbook.lastModifiedBy = "BigMA Baik Evaluator";
    workbook.created = new Date();
    workbook.modified = new Date();

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    // ==========================================
    // SHEET 1: REKAPITULASI NILAI SISWA
    // ==========================================
    const summarySheet = workbook.addWorksheet("Rekap Nilai Siswa", {
      views: [{ showGridLines: true }],
    });

    // 1. Title Banner
    summarySheet.mergeCells("A1:P1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = "REKAPITULASI PENILAIAN SISWA & DETEKSI INTEGRITAS AI & PLAGIARISME";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E1B4B" }, // Deep Navy
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    summarySheet.getRow(1).height = 34;

    // 2. Subtitle / Info
    summarySheet.mergeCells("A2:P2");
    const subtitleCell = summarySheet.getCell("A2");
    const printDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    subtitleCell.value = `Dicetak dari BigMA Baik pada: ${printDate} | Total Data: ${sessions.length} Siswa`;
    subtitleCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF475569" } };
    subtitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
    summarySheet.getRow(2).height = 20;

    // Spacer
    summarySheet.getRow(3).height = 10;

    // 3. Headers Kolom
    const summaryHeaders = [
      "No",
      "Tanggal",
      "Nama Siswa",
      "NIS / NISN",
      "Kelas",
      "Mata Pelajaran",
      "Judul Ujian",
      "Poin Diberikan",
      "Poin Maksimal",
      "Nilai (Skala 100)",
      "Rerata Kesesuaian",
      "Rerata Indikasi AI",
      "Status AI",
      "Rerata Plagiat Web",
      "Status Plagiat Web",
      "Catatan Evaluasi Guru",
    ];

    const headerRow = summarySheet.getRow(4);
    headerRow.values = summaryHeaders;
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3730A3" }, // Indigo
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "medium", color: { argb: "FF1E1B4B" } },
        bottom: { style: "medium", color: { argb: "FF1E1B4B" } },
        left: { style: "thin", color: { argb: "FF4338CA" } },
        right: { style: "thin", color: { argb: "FF4338CA" } },
      };
    });

    // 4. Data Rows
    sessions.forEach((item, index) => {
      const rowIndex = 5 + index;
      const isEven = index % 2 === 1;
      const rowBg = isEven ? "FFF8FAFC" : "FFFFFFFF"; // Alternating row color

      let aiStatus = "Aman (Orisinal)";
      let aiStatusColor = "FF15803D"; // Green
      let aiStatusBg = "FFDCFCE7";

      if (item.rataRataAiPersen > 60) {
        aiStatus = "Dominan AI (Tinggi)";
        aiStatusColor = "FFB91C1C"; // Red
        aiStatusBg = "FFFEE2E2";
      } else if (item.rataRataAiPersen > 30) {
        aiStatus = "Campuran AI (Sedang)";
        aiStatusColor = "FFB45309"; // Amber
        aiStatusBg = "FFFEF3C7";
      }

      const plagPersen = item.rataRataPlagiarismePersen ?? 0;
      let plagStatus = "Bebas Web (<30%)";
      let plagStatusColor = "FF0F766E"; // Teal
      let plagStatusBg = "FFCCFBF1";

      if (plagPersen > 60) {
        plagStatus = "Tinggi (>60%)";
        plagStatusColor = "FF7E22CE"; // Purple
        plagStatusBg = "FFF3E8FF";
      } else if (plagPersen > 30) {
        plagStatus = "Sedang (30-60%)";
        plagStatusColor = "FFB45309"; // Amber
        plagStatusBg = "FFFEF3C7";
      }

      // Format nilai skala 100 color
      let nilaiBg = "FFDCFCE7";
      let nilaiColor = "FF166534";
      if (item.nilaiSkala100 < 60) {
        nilaiBg = "FFFEE2E2";
        nilaiColor = "FF991B1B";
      } else if (item.nilaiSkala100 < 75) {
        nilaiBg = "FFFEF3C7";
        nilaiColor = "FF92400E";
      }

      const row = summarySheet.getRow(rowIndex);
      row.values = [
        index + 1,
        item.tanggal || "-",
        item.namaSiswa || "Tanpa Nama",
        item.nomorInduk || "-",
        item.kelas || "-",
        item.mataPelajaran || "-",
        item.judulUjian || "-",
        item.totalNilaiDiberikan,
        item.totalNilaiMaksimal,
        item.nilaiSkala100,
        `${item.rataRataKesesuaianPersen}%`,
        `${item.rataRataAiPersen}%`,
        aiStatus,
        `${plagPersen}%`,
        plagStatus,
        item.catatanGuru || "-",
      ];
      row.height = 24;

      // Style every cell in row
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
        cell.border = borderStyle;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBg },
        };

        // Alignments
        if ([1, 2, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15].includes(colNumber)) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }

        // Highlight: Nilai Skala 100
        if (colNumber === 10) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: nilaiBg },
          };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: nilaiColor } };
        }

        // Highlight: Kesesuaian (%)
        if (colNumber === 11) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0F2FE" }, // Soft Sky Blue
          };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0369A1" } };
        }

        // Highlight: Indikasi AI (%)
        if (colNumber === 12) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: aiStatusBg },
          };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: aiStatusColor } };
        }

        // Highlight: Status AI
        if (colNumber === 13) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: aiStatusBg },
          };
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: aiStatusColor } };
        }

        // Highlight: Plagiat Web (%)
        if (colNumber === 14) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: plagStatusBg },
          };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: plagStatusColor } };
        }

        // Highlight: Status Plagiat Web
        if (colNumber === 15) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: plagStatusBg },
          };
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: plagStatusColor } };
        }
      });
    });

    // Set Column Widths for Sheet 1
    summarySheet.columns = [
      { width: 6 },  // No
      { width: 14 }, // Tanggal
      { width: 28 }, // Nama
      { width: 18 }, // NIS
      { width: 14 }, // Kelas
      { width: 24 }, // Mapel
      { width: 28 }, // Judul
      { width: 15 }, // Poin Diberikan
      { width: 15 }, // Poin Maksimal
      { width: 18 }, // Skala 100
      { width: 20 }, // Kesesuaian
      { width: 20 }, // Indikasi AI
      { width: 22 }, // Status AI
      { width: 20 }, // Plagiat Web
      { width: 22 }, // Status Plagiat
      { width: 36 }, // Catatan
    ];

    // ==========================================
    // SHEET 2: RINCIAN PER BUTIR SOAL
    // ==========================================
    const detailSheet = workbook.addWorksheet("Rincian Butir Soal", {
      views: [{ showGridLines: true }],
    });

    // 1. Title Banner
    detailSheet.mergeCells("A1:O1");
    const detailTitleCell = detailSheet.getCell("A1");
    detailTitleCell.value = "RINCIAN EVALUASI & ANALISIS JAWABAN PER BUTIR SOAL";
    detailTitleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    detailTitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF064E3B" }, // Deep Emerald
    };
    detailTitleCell.alignment = { vertical: "middle", horizontal: "center" };
    detailSheet.getRow(1).height = 34;

    // 2. Subtitle
    detailSheet.mergeCells("A2:O2");
    const detailSubtitleCell = detailSheet.getCell("A2");
    detailSubtitleCell.value = "Analisis komprehensif butir soal, skor perolehan, kesesuaian materi, deteksi AI, dan plagiarisme internet";
    detailSubtitleCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF475569" } };
    detailSubtitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" },
    };
    detailSubtitleCell.alignment = { vertical: "middle", horizontal: "center" };
    detailSheet.getRow(2).height = 20;

    // Spacer
    detailSheet.getRow(3).height = 10;

    // 3. Detail Headers
    const detailHeaders = [
      "No",
      "Nama Siswa",
      "Kelas",
      "Mata Pelajaran",
      "Nomor Soal",
      "Naskah Pertanyaan",
      "Nilai Diberikan",
      "Nilai Maksimal",
      "Kesesuaian",
      "Indikasi AI",
      "Kategori AI",
      "Plagiat Web",
      "Kategori Plagiat",
      "Ringkasan Analisis & Integritas",
      "Rekomendasi Guru",
    ];

    const detailHeaderRow = detailSheet.getRow(4);
    detailHeaderRow.values = detailHeaders;
    detailHeaderRow.height = 28;

    detailHeaderRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF059669" }, // Emerald 600
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "medium", color: { argb: "FF064E3B" } },
        bottom: { style: "medium", color: { argb: "FF064E3B" } },
        left: { style: "thin", color: { argb: "FF10B981" } },
        right: { style: "thin", color: { argb: "FF10B981" } },
      };
    });

    let detailCounter = 1;
    let currentDetailRow = 5;

    sessions.forEach((session) => {
      session.soalList.forEach((soal) => {
        const isEven = detailCounter % 2 === 0;
        const rowBg = isEven ? "FFF8FAFC" : "FFFFFFFF";

        const naskahText = soal.naskahSoal?.trim()
          ? soal.naskahSoal.trim()
          : soal.gambarSoalFileName
          ? `[Lampiran Gambar: ${soal.gambarSoalFileName}]`
          : "(Pertanyaan Tanpa Teks)";

        const nilaiDiberikan = soal.analisis ? soal.analisis.nilaiDiberikan : 0;
        const kesesuaianPersen = soal.analisis ? soal.analisis.kesesuaianPersen : 0;
        const aiPersen = soal.analisis ? soal.analisis.indikasiAiPersen : 0;
        const kategoriAi = soal.analisis ? soal.analisis.aiDugaanKategori : "Belum Dianalisis";
        const plagPersen = soal.analisis ? (soal.analisis.indikasiPlagiarismePersen ?? 0) : 0;
        const kategoriPlag = soal.analisis ? (soal.analisis.plagiarismeKategori || "Bebas") : "-";
        const ringkasan = soal.analisis ? soal.analisis.ringkasanAnalisis : "-";
        const rekomendasi = soal.analisis ? soal.analisis.rekomendasiGuru : "-";

        const row = detailSheet.getRow(currentDetailRow);
        row.values = [
          detailCounter++,
          session.namaSiswa || "Tanpa Nama",
          session.kelas || "-",
          session.mataPelajaran || "-",
          `Soal #${soal.nomorSoal}`,
          naskahText,
          nilaiDiberikan,
          soal.nilaiMaksimal,
          `${kesesuaianPersen}%`,
          `${aiPersen}%`,
          kategoriAi,
          `${plagPersen}%`,
          kategoriPlag,
          ringkasan,
          rekomendasi,
        ];
        row.height = 36; // Give enough space for wrapped text

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: "Arial", size: 9.5, color: { argb: "FF0F172A" } };
          cell.border = borderStyle;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rowBg },
          };

          // Center small columns
          if ([1, 3, 5, 7, 8, 9, 10, 11, 12, 13].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }

          // Nilai Diberikan
          if (colNumber === 7) {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
          }

          // Kesesuaian
          if (colNumber === 9) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE0F2FE" },
            };
            cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF0369A1" } };
          }

          // Indikasi AI
          if (colNumber === 10) {
            let aiBg = "FFDCFCE7";
            let aiColor = "FF15803D";
            if (aiPersen > 60) {
              aiBg = "FFFEE2E2";
              aiColor = "FFB91C1C";
            } else if (aiPersen > 30) {
              aiBg = "FFFEF3C7";
              aiColor = "FFB45309";
            }
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: aiBg },
            };
            cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: aiColor } };
          }

          // Plagiat Web (%)
          if (colNumber === 12) {
            let pBg = "FFCCFBF1";
            let pColor = "FF0F766E";
            if (plagPersen > 60) {
              pBg = "FFF3E8FF";
              pColor = "FF7E22CE";
            } else if (plagPersen > 30) {
              pBg = "FFFEF3C7";
              pColor = "FFB45309";
            }
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: pBg },
            };
            cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: pColor } };
          }
        });

        currentDetailRow++;
      });
    });

    // Set Column Widths for Sheet 2
    detailSheet.columns = [
      { width: 6 },  // No
      { width: 26 }, // Siswa
      { width: 14 }, // Kelas
      { width: 20 }, // Mapel
      { width: 14 }, // Nomor Soal
      { width: 38 }, // Naskah
      { width: 15 }, // Nilai Diberikan
      { width: 14 }, // Nilai Maksimal
      { width: 16 }, // Kesesuaian
      { width: 16 }, // Indikasi AI
      { width: 22 }, // Kategori AI
      { width: 16 }, // Plagiat Web
      { width: 20 }, // Kategori Plagiat
      { width: 42 }, // Ringkasan
      { width: 42 }, // Rekomendasi
    ];

    // Export to Excel buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const today = new Date().toISOString().split("T")[0];
    const filename = customFilename || `Rekap_Nilai_BigMA_Baik_${today}.xlsx`;

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }, 1500);

    return { success: true };
  } catch (err: any) {
    console.error("Failed to generate styled Excel file:", err);
    return { success: false, error: err?.message || "Gagal membuat file Excel." };
  }
}
