import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Ekspor kumpulan halaman A4 ke satu dokumen PDF yang presisi dan rapi.
 * Setiap elemen halaman akan diposisikan tepat pada satu halaman A4 tanpa pemotongan teks acak.
 */
export async function exportPagesToPDF(
  pageIds: string[],
  filename: string
): Promise<{ success: boolean; error?: string }> {
  if (!pageIds || pageIds.length === 0) {
    return { success: false, error: "Tidak ada halaman yang ditentukan untuk dicetak." };
  }

  try {
    // Delay sejenak agar rendering font & layout selesai 100%
    await new Promise((resolve) => setTimeout(resolve, 200));

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 6; // Margin tepi rapi
    const targetWidth = pageWidth - margin * 2;
    const targetHeight = pageHeight - margin * 2;

    for (let i = 0; i < pageIds.length; i++) {
      const pageEl = document.getElementById(pageIds[i]);
      if (!pageEl) continue;

      if (i > 0) {
        pdf.addPage();
      }

      const canvas = await html2canvas(pageEl, {
        scale: 2, // Kualitas cetak tinggi (retina)
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const ratio = canvas.width / canvas.height;
      let renderWidth = targetWidth;
      let renderHeight = targetWidth / ratio;

      // Jika renderHeight melebihi batas targetHeight, sesuaikan skala
      if (renderHeight > targetHeight) {
        renderHeight = targetHeight;
        renderWidth = targetHeight * ratio;
      }

      const posX = margin + (targetWidth - renderWidth) / 2;
      const posY = margin + (targetHeight - renderHeight) / 2;

      pdf.addImage(imgData, "JPEG", posX, posY, renderWidth, renderHeight);
    }

    const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return { success: true };
  } catch (err: any) {
    console.error("Gagal membuat dokumen PDF:", err);
    return { success: false, error: err?.message || "Gagal memproses file PDF." };
  }
}

/**
 * Ekspor kumpulan halaman ke satu gambar JPG panjang berkualitas tinggi (stitched cleanly).
 */
export async function exportPagesToJPG(
  pageIds: string[],
  filename: string
): Promise<{ success: boolean; error?: string }> {
  if (!pageIds || pageIds.length === 0) {
    return { success: false, error: "Tidak ada halaman yang ditentukan untuk dicetak." };
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Ambil kanvas dari setiap halaman
    const canvases: HTMLCanvasElement[] = [];
    for (const pageId of pageIds) {
      const pageEl = document.getElementById(pageId);
      if (!pageEl) continue;

      const c = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
      });
      canvases.push(c);
    }

    if (canvases.length === 0) {
      return { success: false, error: "Gagal merender halaman dokumen." };
    }

    let finalCanvas: HTMLCanvasElement;

    if (canvases.length === 1) {
      finalCanvas = canvases[0];
    } else {
      // Gabungkan semua kanvas halaman secara vertikal dengan garis pemisah halus
      const width = canvases[0].width;
      const pageGap = 30; // Jarak visual pemisah antar halaman
      const totalHeight = canvases.reduce((acc, c) => acc + c.height, 0) + (canvases.length - 1) * pageGap;

      finalCanvas = document.createElement("canvas");
      finalCanvas.width = width;
      finalCanvas.height = totalHeight;
      const ctx = finalCanvas.getContext("2d");

      if (!ctx) {
        return { success: false, error: "Gagal membuat context 2D gambar." };
      }

      // Background putih
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, width, totalHeight);

      let currentY = 0;
      canvases.forEach((c) => {
        ctx.drawImage(c, 0, currentY);
        currentY += c.height + pageGap;
      });
    }

    const safeFilename = filename.endsWith(".jpg") ? filename : `${filename}.jpg`;

    return new Promise((resolve) => {
      finalCanvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ success: false, error: "Gagal mengonversi kanvas ke berkas JPG." });
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = safeFilename;
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 1500);

          resolve({ success: true });
        },
        "image/jpeg",
        0.95
      );
    });
  } catch (err: any) {
    console.error("Gagal mengekspor gambar JPG:", err);
    return { success: false, error: err?.message || "Gagal memproses gambar JPG." };
  }
}
