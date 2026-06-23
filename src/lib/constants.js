export const DESA_LIST = ["Desa 1", "Desa 2"];

export const KELOMPOK_LIST = [
  "Kelompok 1", "Kelompok 2", "Kelompok 3", "Kelompok 4",
  "Kelompok 5", "Kelompok 6", "Kelompok 7", "Kelompok 8",
  "Kelompok 9", "Kelompok 10", "Kelompok 11", "Kelompok 12", "Kelompok 13"
];

export const DESA_KELOMPOK_MAP = {
  "Desa 1": ["Kelompok 1", "Kelompok 2", "Kelompok 3", "Kelompok 4", "Kelompok 5", "Kelompok 6", "Kelompok 7"],
  "Desa 2": ["Kelompok 8", "Kelompok 9", "Kelompok 10", "Kelompok 11", "Kelompok 12", "Kelompok 13"]
};

export const DAPUKAN_LIST = [
  "Jamaah",
  // Keimaman
  "Ki", "Wakil",
  // KU & PKU
  "KU", "PKU",
  // Penerobos
  "Penerobos",
  // Aghnia
  "Aghnia",
  // Mubaligh
  "Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok",
  // Tim & Lainnya
  "PJP", "PJK",
  // Keluarga
  "Kepala Keluarga",
];
// Dapukan pengurus (non-Jamaah), urutan tampil di Struktur
export const DAPUKAN_PENGURUS_ORDER = [
  "Ki", "Wakil",
  "KU", "PKU",
  "Penerobos",
  "Aghnia",
  "Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok",
  "PJP", "PJK",
];
export const DAPUKAN_LEVEL_LIST = ["Daerah", "Desa", "Kelompok"];
export const GENDER_LIST = ["Laki-laki", "Perempuan"];
export const MARITAL_STATUS_LIST = ["Menikah", "Belum Menikah", "Cerai", "Janda/Duda"];
export const BIRTHPLACE_LIST = ["Indonesia", "Australia", "New Zealand", "Lainnya"];
export const VISA_STATUS_LIST = ["PR", "Citizen", "Student", "Sponsor", "Bridging", "WHV", "Tourist", "Partner", "Lainnya"];
export const MUBALLIGH_STATUS_LIST = ["Muballigh", "Muballighot", "Bukan Muballigh"];
export const EMPLOYMENT_LIST = ["Bekerja", "Tidak Bekerja", "Belum Bekerja", "Student", "Retired"];
export const ATTENDANCE_STATUS_LIST = ["Hadir", "Izin Sekolah", "Izin Kerja", "Izin Telat", "Alpa"];
export const MEMBER_STATUS_LIST = ["Aktif", "Tidak Aktif"];

export const DAPUKAN_4S = [
  "Ki", "Wakil", "KU", "PKU", "Penerobos", "Aghnia",
  "Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok",
];

/**
 * Mengembalikan judul dapukan yang lengkap sesuai level.
 * Contoh: getDapukanTitle("Ki", "Daerah") => "Ki Daerah"
 *         getDapukanTitle("Wakil", "Desa") => "Wakil Ki Desa"
 *         getDapukanTitle("Penerobos", "Kelompok") => "Penerobos Kelompok"
 *         getDapukanTitle("Jamaah", "Kelompok") => "Jamaah"
 */
export function getDapukanTitle(dapukan, level) {
  if (!dapukan) return "-";
  const d = dapukan.trim();
  const l = level || "";

  // Dapukan yang perlu suffix level
  const SUFFIX_LEVEL = {
    "Ki": `Ki ${l}`,
    "Wakil": `Wakil Ki ${l}`,
    "KU": `KU ${l}`,
    "PKU": `PKU ${l}`,
    "Penerobos": `Penerobos ${l}`,
    "Aghnia": `Aghnia ${l}`,
  };

  if (SUFFIX_LEVEL[d] && l) return SUFFIX_LEVEL[d];
  return d;
}

export const EVENT_LEVEL_LIST = ["Daerah", "Desa", "Kelompok"];

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];