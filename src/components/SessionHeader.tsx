import { User, School } from "lucide-react";
import { SesiPenilaian } from "../types";

interface SessionHeaderProps {
  session: SesiPenilaian;
  onChange: (updated: Partial<SesiPenilaian>) => void;
  darkMode?: boolean;
}

export default function SessionHeader({ session, onChange }: SessionHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 transition-all shadow-lg shadow-black/20 backdrop-blur-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nama Siswa */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-400" />
            <span>Nama Siswa</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={session.namaSiswa}
            onChange={(e) => onChange({ namaSiswa: e.target.value })}
            placeholder="Ketik nama lengkap siswa..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />
        </div>

        {/* Kelas */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <School className="h-3.5 w-3.5 text-indigo-400" />
            <span>Kelas / Rombel</span>
          </label>
          <input
            type="text"
            value={session.kelas}
            onChange={(e) => onChange({ kelas: e.target.value })}
            placeholder="Contoh: XII RPL 1 / XI MIPA 2"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          />
        </div>
      </div>
    </div>
  );
}
