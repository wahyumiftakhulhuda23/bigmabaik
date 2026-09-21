import { SesiPenilaian, SoalItem } from "../types";

const STORAGE_KEY = "bigma_baik_sesi_penilaian_v2";
const API_KEYS_STORAGE_KEY = "bigma_baik_gemini_api_keys";

export function getStoredApiKeysRaw(): string {
  try {
    return localStorage.getItem(API_KEYS_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function getStoredApiKeys(): string[] {
  const raw = getStoredApiKeysRaw();
  return raw
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

export function saveStoredApiKeys(rawText: string): void {
  try {
    localStorage.setItem(API_KEYS_STORAGE_KEY, rawText.trim());
  } catch (e) {
    console.error("Failed to save api keys:", e);
  }
}

export function getStoredSessions(): SesiPenilaian[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load sessions from storage:", e);
    return [];
  }
}

export function saveSessionToStorage(session: SesiPenilaian): SesiPenilaian[] {
  try {
    const sessions = getStoredSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    let updated: SesiPenilaian[];

    if (existingIndex >= 0) {
      updated = [...sessions];
      updated[existingIndex] = { ...session, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...session, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...sessions];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save session to storage:", e);
    return [];
  }
}

export function deleteSessionFromStorage(sessionId: string): SesiPenilaian[] {
  try {
    const sessions = getStoredSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error("Failed to delete session:", e);
    return [];
  }
}

// Ensure all fields are 100% EMPTY when first opened
export function createDefaultSession(): SesiPenilaian {
  const initialSoal: SoalItem = {
    id: `soal-${Date.now()}-1`,
    nomorSoal: 1,
    naskahSoal: "",
    gambarSoalBase64: null,
    gambarSoalMimeType: null,
    gambarSoalFileName: null,
    nilaiMaksimal: 10,
    jawabanTeks: "",
    jawabanGambarBase64: null,
    jawabanGambarMimeType: null,
    jawabanGambarFileName: null,
    analisis: null,
    isSaved: false,
  };

  return {
    id: `sesi-${Date.now()}`,
    namaSiswa: "",
    nomorInduk: "",
    kelas: "",
    mataPelajaran: "",
    judulUjian: "",
    tanggal: new Date().toISOString().split("T")[0],
    catatanGuru: "",
    soalList: [initialSoal],
    totalNilaiDiberikan: 0,
    totalNilaiMaksimal: 10,
    nilaiSkala100: 0,
    rataRataAiPersen: 0,
    rataRataPlagiarismePersen: 0,
    rataRataKesesuaianPersen: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function calculateSessionTotals(soalList: SoalItem[]) {
  let totalDiberikan = 0;
  let totalMaks = 0;
  let totalKesesuaian = 0;
  let totalAi = 0;
  let totalPlagiat = 0;
  let analyzedCount = 0;

  for (const s of soalList) {
    totalMaks += s.nilaiMaksimal || 0;
    if (s.analisis) {
      totalDiberikan += s.analisis.nilaiDiberikan || 0;
      totalKesesuaian += s.analisis.kesesuaianPersen || 0;
      totalAi += s.analisis.indikasiAiPersen || 0;
      totalPlagiat += s.analisis.indikasiPlagiarismePersen || 0;
      analyzedCount += 1;
    }
  }

  const skala100 = totalMaks > 0 ? Math.round((totalDiberikan / totalMaks) * 100 * 10) / 10 : 0;
  const avgKesesuaian = analyzedCount > 0 ? Math.round(totalKesesuaian / analyzedCount) : 0;
  const avgAi = analyzedCount > 0 ? Math.round(totalAi / analyzedCount) : 0;
  const avgPlagiat = analyzedCount > 0 ? Math.round(totalPlagiat / analyzedCount) : 0;

  return {
    totalNilaiDiberikan: Math.round(totalDiberikan * 10) / 10,
    totalNilaiMaksimal: totalMaks,
    nilaiSkala100: skala100,
    rataRataKesesuaianPersen: avgKesesuaian,
    rataRataAiPersen: avgAi,
    rataRataPlagiarismePersen: avgPlagiat,
    analyzedCount,
    totalCount: soalList.length,
  };
}

/**
 * Reset naskah jawaban, nama siswa, dan kelas untuk penilaian siswa berikutnya,
 * sedangkan naskah soal, bobot nilai, nomor soal, mata pelajaran, dan judul ujian tetap dipertahankan.
 */
export function resetSessionAnswersForNextStudent(session: SesiPenilaian): SesiPenilaian {
  const resetSoalList: SoalItem[] = session.soalList.map((s) => ({
    ...s,
    jawabanTeks: "",
    jawabanGambarBase64: null,
    jawabanGambarMimeType: null,
    jawabanGambarFileName: null,
    analisis: null,
    isSaved: false,
    updatedAt: new Date().toISOString(),
  }));

  const totals = calculateSessionTotals(resetSoalList);

  return {
    ...session,
    id: `sesi-${Date.now()}`,
    namaSiswa: "",
    kelas: "",
    nomorInduk: "",
    soalList: resetSoalList,
    ...totals,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
