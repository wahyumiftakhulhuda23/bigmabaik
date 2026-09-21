export interface RincianKalkulasiNilai {
  nilaiDasarMateri: number; // Nilai kotor berdasarkan kesesuaian materi (kesesuaianPersen / 100) * nilaiMaksimal
  potonganAiPoin: number; // Poin pengurangan karena terindikasi AI
  potonganPlagiarismePoin: number; // Poin pengurangan karena plagiarisme
  penjelasanFaktorPengurang: string; // Penjelasan terurai rinci faktor pengurang dan asal usul nilai akhir
}

export interface AnalisisHasil {
  soalId: string;
  nomorSoal: number;
  kesesuaianPersen: number; // 0 - 100%
  indikasiAiPersen: number; // 0 - 100% (Deteksi hasil generate AI)
  indikasiPlagiarismePersen: number; // 0 - 100% (Deteksi kemiripan kata/sumber internet)
  plagiarismeKategori: string; // "Bebas Plagiasi" | "Kemiripan Rendah" | "Kemiripan Sedang" | "Terindikasi Plagiat Web"
  indikasiSumberPlagiarisme?: string[]; // Sumber rujukan online yang serupa (artikel, ensiklopedia, blog, forum)
  detailPlagiarisme?: string; // Uraian kemiripan teks thd sumber internet vs kata-kata asli siswa
  nilaiDiberikan: number; // 0 - nilaiMaksimal
  nilaiMaksimal: number;
  rincianKalkulasiNilai?: RincianKalkulasiNilai;
  aiDugaanKategori: string;
  ringkasanAnalisis: string;
  ciriCiriAiTerdeteksi: string[];
  kelebihanJawaban: string[];
  kelemahanJawaban: string[];
  rekomendasiGuru: string;
  analyzedAt: string;
  isManualOverride?: boolean; // True jika nilai disesuaikan/diedit manual oleh guru
  nilaiOtomatisSebelumOverride?: number; // Nilai asli dari AI sebelum diubah manual
  catatanPenyesuaianGuru?: string; // Catatan khusus guru mengapa nilai disesuaikan manual
}

export interface SoalItem {
  id: string;
  nomorSoal: number;
  naskahSoal: string;
  gambarSoalBase64?: string | null;
  gambarSoalMimeType?: string | null;
  gambarSoalFileName?: string | null;
  nilaiMaksimal: number;
  jawabanTeks: string;
  jawabanGambarBase64?: string | null;
  jawabanGambarMimeType?: string | null;
  jawabanGambarFileName?: string | null;
  analisis?: AnalisisHasil | null;
  isSaved?: boolean;
  updatedAt?: string;
}

export interface SesiPenilaian {
  id: string;
  namaSiswa: string;
  nomorInduk?: string;
  kelas: string;
  mataPelajaran: string;
  judulUjian: string;
  tanggal: string;
  catatanGuru?: string;
  soalList: SoalItem[];
  totalNilaiDiberikan: number;
  totalNilaiMaksimal: number;
  nilaiSkala100: number;
  rataRataAiPersen: number;
  rataRataPlagiarismePersen: number;
  rataRataKesesuaianPersen: number;
  createdAt: string;
  updatedAt: string;
}
