/**
 * Helper utility for robust client-side API requests.
 * Prevents unhandled JSON parsing syntax errors (e.g. when server returns HTML error pages),
 * extracts clear error messages, and handles network timeouts gracefully.
 */

export async function safeFetchJson<T = any>(
  url: string,
  options: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(
      `Tidak dapat terhubung ke server (${netErr.message || "Network Error"}). Pastikan server aktif dan koneksi internet stabil.`
    );
  }

  const rawText = await response.text();
  let data: any = null;
  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      // If server returned HTML 404 or 500 page instead of JSON
      if (!response.ok) {
        throw new Error(
          `Server mengembalikan galat HTTP ${response.status} (${response.statusText || "Error"}). Endpoint: ${url}`
        );
      }
      throw new Error("Respons server bukan format JSON yang valid.");
    }
  }

  if (!response.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      `Permintaan gagal dengan kode status HTTP ${response.status} (${response.statusText || "Galat Server"}).`;
    throw new Error(errorMsg);
  }

  return (data || {}) as T;
}
