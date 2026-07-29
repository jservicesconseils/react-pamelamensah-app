import { useState, useEffect, useMemo, useRef } from "react";
import heroPortrait from "/hero.png";
import headshot from "/headshot.png";
import {
  ArrowUpRight,
  ShieldCheck,
  HeartPulse,
  Activity,
  PiggyBank,
  Ear,
  Eye,
  GraduationCap,
  HandHeart,
  Check,
  Sparkles,
  Zap,
  Star,
  Search,
  Download,
  Upload,
  Trash2,
  Eye as EyeIcon,
  LogOut,
  Lock,
  Calendar,
  Users,
  TrendingUp,
  FileJson,
  FileSpreadsheet,
  X,
  Filter,
  BarChart3,
  Mail,
  Phone,
} from "lucide-react";

type LeadStatus = "nouveau" | "lu" | "contacté";
type Lead = {
  id: number;
  date: string;
  name: string;
  email: string;
  phone: string;
  need: string;
  message: string;
  status: LeadStatus;
};

const STORAGE_KEY = "abla_leads_db";
const VISITOR_STATS_KEY = "abla_visitor_stats";
const NEEDS_LIST = [
  "Assurance vie",
  "Assurance invalidité",
  "Assurance maladies graves",
  "Épargne et REER",
  "Bilan complet",
];
const NEED_COLOR: Record<string, string> = {
  "Assurance vie": "bg-[#FF5A1F] text-white",
  "Assurance invalidité": "bg-[#FFC93C] text-[#0A1931]",
  "Assurance maladies graves": "bg-[#0E4D45] text-white",
  "Épargne et REER": "bg-[#0A1931] text-white",
  "Bilan complet": "bg-[#16A34A] text-white",
};
const NEED_BAR: Record<string, string> = {
  "Assurance vie": "bg-[#FF5A1F]",
  "Assurance invalidité": "bg-[#FFC93C]",
  "Assurance maladies graves": "bg-[#0E4D45]",
  "Épargne et REER": "bg-[#0A1931]",
  "Bilan complet": "bg-[#16A34A]",
};

const DEMO_LEADS: Lead[] = [
  {
    id: 1715600000000,
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    name: "Marie Tremblay",
    email: "marie.tremblay@email.com",
    phone: "(514) 555-0142",
    need: "Assurance vie",
    message: "Bonjour Paméla, je viens d'avoir mon deuxième enfant et je veux m'assurer que ma famille serait protégée. J'aimerais un échange pour comprendre les options.",
    status: "nouveau",
  },
  {
    id: 1715600000001,
    date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    name: "Jean-Philippe Roy",
    email: "jp.roy@exemple.ca",
    phone: "(438) 555-0291",
    need: "Épargne et REER",
    message: "Travailleur autonome depuis 3 ans, je n'ai pas encore de REER. Besoin d'aide pour optimiser.",
    status: "lu",
  },
  {
    id: 1715600000002,
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    name: "Sophie Lavoie",
    email: "sophie.lavoie@email.com",
    phone: "(514) 555-0384",
    need: "Assurance maladies graves",
    message: "J'ai vu votre approche sans pression, ça m'a parlé. Je veux comparer les protections maladies graves.",
    status: "contacté",
  },
];

function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Lead[];
    return [];
  } catch {
    return [];
  }
}
function saveLeads(leads: Lead[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  (window as any).__ABLA_DB__ = leads;
}

type VisitorStats = {
  total: number;
  perDay: Record<string, number>;
};

function loadVisitorStats(): VisitorStats {
  if (typeof window === "undefined") return { total: 0, perDay: {} };
  try {
    const raw = localStorage.getItem(VISITOR_STATS_KEY);
    if (!raw) return { total: 0, perDay: {} };
    const parsed = JSON.parse(raw);
    return {
      total: typeof parsed?.total === "number" ? parsed.total : 0,
      perDay: parsed?.perDay && typeof parsed.perDay === "object" ? parsed.perDay : {},
    };
  } catch {
    return { total: 0, perDay: {} };
  }
}

function saveVisitorStats(stats: VisitorStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VISITOR_STATS_KEY, JSON.stringify(stats));
}

function trackVisit(): VisitorStats {
  if (typeof window === "undefined") return { total: 0, perDay: {} };
  const today = new Date().toISOString().slice(0, 10);
  const stats = loadVisitorStats();
  const nextStats: VisitorStats = {
    total: stats.total + 1,
    perDay: { ...stats.perDay, [today]: (stats.perDay[today] || 0) + 1 },
  };
  saveVisitorStats(nextStats);
  return nextStats;
}

export default function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    need: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [toast, setToast] = useState<string | null>(null);

  const [isAdminView, setIsAdminView] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [filterNeed, setFilterNeed] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("Tous");
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats>({ total: 0, perDay: {} });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      const pathAdmin = window.location.pathname === "/admin";
      const hashAdmin = window.location.hash === "#admin";
      const searchAdmin = new URLSearchParams(window.location.search).has("admin");
      setIsAdminView(pathAdmin || hashAdmin || searchAdmin);
      const sess = sessionStorage.getItem("abla_admin_auth");
      setAdminAuthed(sess === "1");
    };
    check();
    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };
  }, []);

  useEffect(() => {
    setVisitorStats(trackVisit());
  }, []);

  useEffect(() => {
    if (!isAdminView) return;
    const existing = loadLeads();
    if (existing.length === 0) {
      setLeads(DEMO_LEADS);
      saveLeads(DEMO_LEADS);
    } else {
      setLeads(existing);
      (window as any).__ABLA_DB__ = existing;
    }
  }, [isAdminView]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setToast(id === "contact" ? "Formulaire →" : null);
    setTimeout(() => setToast(null), 1800);
  };

  const handleNav = (id: string, label: string) => {
    setActiveSection(id);
    setToast(label);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => setToast(null), 1800);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: Lead = {
      id: Date.now(),
      date: new Date().toISOString(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      need: form.need,
      message: form.message.trim(),
      status: "nouveau",
    };
    const current = loadLeads();
    const updated = [...current, newLead];
    saveLeads(updated);
    setSent(true);
    setToast(`Reçu ! ${updated.length} demandes au total`);
    setTimeout(() => setToast(null), 3500);
    setForm({ name: "", email: "", phone: "", need: "", message: "" });
  };

  const updateLeads = (updater: (prev: Lead[]) => Lead[]) => {
    setLeads((prev) => {
      const next = updater(prev);
      saveLeads(next);
      return next;
    });
  };
  const stats = useMemo(() => {
    const total = leads.length;
    const now = new Date();
    const thisMonth = leads.filter((l) => {
      const d = new Date(l.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const nouveaux = leads.filter((l) => l.status === "nouveau").length;
    const countByNeed: Record<string, number> = {};
    NEEDS_LIST.forEach((n) => (countByNeed[n] = 0));
    leads.forEach((l) => {
      if (countByNeed[l.need] !== undefined) countByNeed[l.need] += 1;
      else countByNeed[l.need] = 1;
    });
    let topNeed = "—";
    let max = 0;
    Object.entries(countByNeed).forEach(([k, v]) => {
      if (v > max) {
        max = v;
        topNeed = k;
      }
    });
    return { total, thisMonth, nouveaux, countByNeed, topNeed };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads
      .filter((l) => {
        const matchesSearch =
          !search ||
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.email.toLowerCase().includes(search.toLowerCase()) ||
          l.message.toLowerCase().includes(search.toLowerCase());
        const matchesNeed = filterNeed === "Tous" || l.need === filterNeed;
        const matchesStatus = filterStatus === "Tous" || l.status === filterStatus;
        return matchesSearch && matchesNeed && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [leads, search, filterNeed, filterStatus]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(leads, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "abla-leads-db.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("JSON exporté : abla-leads-db.json");
    setTimeout(() => setToast(null), 2000);
  };
  const exportCSV = () => {
    const header = ["id", "date", "name", "email", "phone", "need", "message", "status"];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = leads.map((l) =>
      [l.id, l.date, l.name, l.email, l.phone, l.need, l.message, l.status].map((x) => esc(String(x))).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "abla-leads-db.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("CSV exporté");
    setTimeout(() => setToast(null), 2000);
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("Format invalide");
        const valid = parsed.filter((x: any) => x.name && x.email) as Lead[];
        if (valid.length === 0) throw new Error("Aucune donnée valide");
        if (confirm(`Importer ${valid.length} entrées ? Cela remplacera la base actuelle.`)) {
          setLeads(valid);
          saveLeads(valid);
          setToast(`${valid.length} entrées importées`);
          setTimeout(() => setToast(null), 2500);
        }
      } catch (err: any) {
        alert("Erreur import: " + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const openDeleteModal = (lead?: Lead) => {
    setDeleteTarget(lead ?? null);
    setDeletePassword("");
    setDeleteError("");
    setShowDeleteModal(true);
  };
  const clearDB = () => {
    openDeleteModal();
  };
  const confirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    const v = deletePassword.trim();
    if (v !== "p@mel@") {
      setDeleteError("Code incorrect. Essayez p@mel@");
      return;
    }

    if (deleteTarget) {
      updateLeads((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    } else {
      setLeads([]);
      saveLeads([]);
      setToast("Base vidée");
      setTimeout(() => setToast(null), 2000);
    }

    setDeletePassword("");
    setDeleteError("");
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  if (isAdminView) {
    if (!adminAuthed) {
      return (
        <div className="min-h-screen bg-[#0A1931] flex items-center justify-center p-6 relative overflow-hidden antialiased" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap'); .serif{font-family:'Fraunces',Georgia,serif}`}</style>
          <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#FFC93C] blur-[90px] opacity-20" />
          <div className="relative w-full max-w-[420px] rounded-[28px] bg-white border border-black/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.4)] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#0A1931] grid place-items-center"><Lock className="w-5 h-5 text-white" /></div>
              <div>
                <div className="serif text-[18px] font-bold tracking-tight text-[#0A1931]">Accès conseiller</div>
                <div className="text-[12px] text-black/60 font-medium">Tableau de bord sécurisé</div>
              </div>
            </div>
            <div className="rounded-[16px] bg-[#FFF8F0] border border-black/5 p-4 mb-6 flex gap-3">
              <img src={headshot} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
              <div className="text-[13px] leading-[1.5]">
                <div className="font-bold text-[#0A1931]">Abla Etonam MENSAH (Paméla)</div>
                <div className="text-black/60">Entrez le code d'accès pour ouvrir le tableau de bord. Fichier local: abla_leads_db.json</div>
              </div>
            </div>
            <form onSubmit={(e)=>{
              e.preventDefault();
              const v = loginInput.trim();
              if(v==="p@mel@"){
                sessionStorage.setItem("abla_admin_auth","1");
                setAdminAuthed(true);
              } else {
                setLoginError("Code incorrect. Essayez p@mel@");
              }
            }} className="space-y-4">
              <label className="block">
                <span className="text-[12.5px] font-bold text-[#0A1931]">Code d'accès</span>
                <input value={loginInput} onChange={e=>{setLoginInput(e.target.value); setLoginError("")}} placeholder="2024" className="mt-2 w-full h-[52px] rounded-[14px] bg-[#FFF8F0] border-2 border-black/[0.06] px-4 text-[14px] font-medium outline-none focus:border-[#FF5A1F]/40 focus:ring-2 focus:ring-[#FF5A1F]/20" />
                {loginError && <div className="mt-2 text-[12px] text-red-600 font-medium">{loginError}</div>}
              </label>
              <button type="submit" className="w-full h-[52px] rounded-full bg-[#FF5A1F] text-white font-bold text-[14px] hover:bg-[#e04e1a] transition flex items-center justify-center gap-2">Accéder <ArrowUpRight className="w-4 h-4" /></button>
            </form>
            <div className="mt-6 flex justify-between items-center">
              <button onClick={()=>{
                const url = new URL(window.location.href);
                url.hash = "";
                url.searchParams.delete("admin");
                if (url.pathname === "/admin") url.pathname = "/";
                window.history.replaceState({}, "", url.pathname + url.search + url.hash);
                setIsAdminView(false);
              }} className="text-[12.5px] font-semibold text-black/60 hover:text-black flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Retour au site</button>
              <span className="text-[11px] text-black/40">Stockage: localStorage {STORAGE_KEY}</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FFF8F0] antialiased text-[#0A1931]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
          .serif { font-family: 'Fraunces', Georgia, serif; }
        `}</style>
        <header className="sticky top-0 z-40 bg-[#0A1931] text-white border-b border-white/10">
          <div className="mx-auto max-w-[1280px] px-6 md:px-8 h-[76px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-white"><img src={headshot} alt="" className="w-full h-full object-cover" /></div>
              <div className="leading-tight">
                <div className="serif text-[15px] md:text-[17px] font-bold tracking-tight">Tableau de bord – Abla Etonam MENSAH (Paméla)</div>
                <div className="text-[11px] text-white/60 font-medium tracking-wide flex items-center gap-2"><Calendar className="w-3 h-3" /> {new Date().toLocaleDateString('fr-CA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} · {stats.total} leads · Fichier: abla-leads-db.json</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {toast && <span className="hidden md:inline-flex bg-white text-[#0A1931] px-3 py-1 rounded-full text-[11px] font-bold">{toast}</span>}
              <button onClick={exportJSON} className="hidden md:inline-flex h-10 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-[12.5px] font-semibold items-center gap-2 transition"><FileJson className="w-4 h-4" /> JSON</button>
              <button onClick={()=>{
                const url = new URL(window.location.href);
                url.hash = "";
                url.searchParams.delete("admin");
                if (url.pathname === "/admin") url.pathname = "/";
                window.history.replaceState({}, "", url.pathname + url.search + url.hash);
                setIsAdminView(false);
              }} className="inline-flex h-10 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#e04e1a] text-white text-[13px] font-bold items-center gap-2 transition"><LogOut className="w-4 h-4" /> Retour au site</button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-6 md:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="rounded-[20px] bg-white border border-black/[0.06] p-5 shadow-[0_12px_32px_rgba(10,25,49,0.06)]">
              <div className="flex items-center justify-between"><span className="text-[11px] tracking-[0.14em] uppercase font-bold text-black/50">Total messages</span><div className="w-8 h-8 rounded-full bg-[#0A1931] grid place-items-center"><Users className="w-4 h-4 text-white" /></div></div>
              <div className="mt-3 serif text-[32px] font-bold leading-none">{stats.total}</div>
              <div className="mt-2 text-[12px] text-black/50 font-medium">Dans abla_leads_db.json</div>
            </div>
            <div className="rounded-[20px] bg-white border border-black/[0.06] p-5 shadow-[0_12px_32px_rgba(10,25,49,0.06)]">
              <div className="flex items-center justify-between"><span className="text-[11px] tracking-[0.14em] uppercase font-bold text-black/50">Ce mois-ci</span><div className="w-8 h-8 rounded-full bg-[#FF5A1F] grid place-items-center"><TrendingUp className="w-4 h-4 text-white" /></div></div>
              <div className="mt-3 serif text-[32px] font-bold leading-none">{stats.thisMonth}</div>
              <div className="mt-2 text-[12px] text-black/50 font-medium">{stats.thisMonth>0?`+${Math.round((stats.thisMonth/ Math.max(1,stats.total))*100)}% du total`:"Aucun ce mois"}</div>
            </div>
            <div className="rounded-[20px] bg-white border border-black/[0.06] p-5 shadow-[0_12px_32px_rgba(10,25,49,0.06)]">
              <div className="flex items-center justify-between"><span className="text-[11px] tracking-[0.14em] uppercase font-bold text-black/50">Besoin top</span><div className="w-8 h-8 rounded-full bg-[#FFC93C] grid place-items-center"><BarChart3 className="w-4 h-4 text-[#0A1931]" /></div></div>
              <div className="mt-3 serif text-[18px] font-bold leading-tight line-clamp-2">{stats.topNeed}</div>
              <div className="mt-2 text-[12px] text-black/50 font-medium">Le plus demandé</div>
            </div>
            <div className="rounded-[20px] bg-white border-2 border-[#FF5A1F]/20 p-5 shadow-[0_12px_32px_rgba(255,90,31,0.12)] bg-gradient-to-br from-white to-[#FFF8F0]">
              <div className="flex items-center justify-between"><span className="text-[11px] tracking-[0.14em] uppercase font-bold text-[#FF5A1F]">Nouveaux</span><div className="w-8 h-8 rounded-full bg-[#FF5A1F] grid place-items-center"><Sparkles className="w-4 h-4 text-white" /></div></div>
              <div className="mt-3 serif text-[32px] font-bold leading-none text-[#FF5A1F]">{stats.nouveaux}</div>
              <div className="mt-2 text-[12px] text-black/50 font-medium">À traiter en priorité</div>
            </div>
            <div className="rounded-[20px] bg-white border border-black/[0.06] p-5 shadow-[0_12px_32px_rgba(10,25,49,0.06)]">
              <div className="flex items-center justify-between"><span className="text-[11px] tracking-[0.14em] uppercase font-bold text-black/50">Visiteurs total</span><div className="w-8 h-8 rounded-full bg-[#0E4D45] grid place-items-center"><Activity className="w-4 h-4 text-white" /></div></div>
              <div className="mt-3 serif text-[32px] font-bold leading-none">{visitorStats.total}</div>
              <div className="mt-2 text-[12px] text-black/50 font-medium">Visites enregistrées sur la page</div>
            </div>
            <div className="rounded-[20px] bg-white border border-black/[0.06] p-5 shadow-[0_12px_32px_rgba(10,25,49,0.06)]">
              <div className="flex items-center justify-between"><span className="text-[11px] tracking-[0.14em] uppercase font-bold text-black/50">Visiteurs aujourd’hui</span><div className="w-8 h-8 rounded-full bg-[#16A34A] grid place-items-center"><Calendar className="w-4 h-4 text-white" /></div></div>
              <div className="mt-3 serif text-[32px] font-bold leading-none">{visitorStats.perDay[new Date().toISOString().slice(0, 10)] || 0}</div>
              <div className="mt-2 text-[12px] text-black/50 font-medium">Pour la journée en cours</div>
            </div>
          </div>
          <div className="mt-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-[24px] bg-white border border-black/[0.06] p-6 shadow-[0_12px_32px_rgba(10,25,49,0.06)]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="serif text-[18px] font-bold">Répartition par besoin</h3>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#0A1931] text-white">{stats.total} total</span>
              </div>
              <div className="space-y-4">
                {NEEDS_LIST.map((need)=>{
                  const count = stats.countByNeed[need]||0;
                  const pct = stats.total? Math.round((count/stats.total)*100):0;
                  return (
                    <div key={need} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-semibold flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${NEED_BAR[need]}`} />{need}</span>
                        <span className="text-[12px] font-bold">{count} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${NEED_BAR[need]} transition-all duration-500`} style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-[24px] bg-[#0A1931] text-white p-6 shadow-[0_16px_40px_rgba(10,25,49,0.25)] relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#FF5A1F]/20 to-[#FFC93C]/10 blur-[30px]" />
              <div className="relative">
                <h3 className="serif text-[18px] font-bold">Gestion fichier</h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-white/60">Votre base est stockée dans le navigateur (localStorage {STORAGE_KEY}) et accessible via window.__ABLA_DB__. Exportez régulièrement en .json pour sauvegarde fichier.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button onClick={exportJSON} className="h-11 rounded-full bg-white text-[#0A1931] font-bold text-[12.5px] flex items-center justify-center gap-2 hover:bg-[#FFC93C] transition"><FileJson className="w-4 h-4" /> Exporter JSON</button>
                  <button onClick={exportCSV} className="h-11 rounded-full bg-[#FF5A1F] text-white font-bold text-[12.5px] flex items-center justify-center gap-2 hover:bg-[#ff4a0a] transition"><FileSpreadsheet className="w-4 h-4" /> Exporter CSV</button>
                  <button onClick={()=>fileInputRef.current?.click()} className="h-11 rounded-full bg-white/10 border border-white/15 text-white font-bold text-[12.5px] flex items-center justify-center gap-2 hover:bg-white/15 transition"><Upload className="w-4 h-4" /> Importer JSON</button>
                  <button onClick={clearDB} className="h-11 rounded-full bg-transparent border border-white/15 text-white/80 font-bold text-[12.5px] flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition"><Trash2 className="w-4 h-4" /> Vider base</button>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                <div className="mt-6 rounded-[14px] bg-white/5 border border-white/10 p-3 text-[11px] text-white/60 leading-[1.5]">
                  <span className="font-bold text-white">Fichier intégré:</span> abla-leads-db.json – contient {leads.length} entrées. Import/Export pour déplacer la base. Aucune API.
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 rounded-[20px] bg-white border border-black/[0.06] p-4 shadow-[0_12px_32px_rgba(10,25,49,0.06)] flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-[360px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher nom, email, message…" className="w-full h-11 pl-10 pr-4 rounded-full bg-[#FFF8F0] border border-black/[0.06] text-[13.5px] font-medium outline-none focus:border-[#FF5A1F]/30 focus:ring-2 focus:ring-[#FF5A1F]/10" />
              </div>
              <div className="hidden md:flex items-center gap-2 text-[12px] font-semibold text-black/50"><Filter className="w-4 h-4" /> Filtres:</div>
            </div>
            <div className="flex gap-2">
              <select value={filterNeed} onChange={e=>setFilterNeed(e.target.value)} className="h-11 rounded-full bg-white border border-black/10 px-4 text-[13px] font-semibold">
                <option>Tous</option>
                {NEEDS_LIST.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="h-11 rounded-full bg-white border border-black/10 px-4 text-[13px] font-semibold">
                <option value="Tous">Tous statuts</option>
                <option value="nouveau">Nouveau</option>
                <option value="lu">Lu</option>
                <option value="contacté">Contacté</option>
              </select>
            </div>
          </div>
          <div className="mt-4 rounded-[24px] bg-white border border-black/[0.06] shadow-[0_12px_32px_rgba(10,25,49,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FFF8F0] border-b border-black/[0.06]">
                  <tr className="text-[11px] tracking-[0.12em] uppercase font-bold text-black/50">
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Nom</th>
                    <th className="px-5 py-4">Besoin</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Message</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length===0 && (
                    <tr><td colSpan={7} className="px-5 py-16 text-center text-[14px] text-black/50">Aucun message. Votre base {STORAGE_KEY} est vide.</td></tr>
                  )}
                  {filteredLeads.map((lead)=>{
                    return (
                      <tr key={lead.id} className="border-b border-black/[0.04] hover:bg-[#FFF8F0]/60 transition">
                        <td className="px-5 py-4 whitespace-nowrap text-[12.5px] font-medium text-black/70">
                          {new Date(lead.date).toLocaleDateString('fr-CA')} <span className="text-black/40">{new Date(lead.date).toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'})}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-[13.5px]">{lead.name}</div>
                          <div className="text-[11.5px] text-black/50 flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</div>
                        </td>
                        <td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${NEED_COLOR[lead.need]||"bg-black text-white"}`}>{lead.need}</span></td>
                        <td className="px-5 py-4 text-[12.5px] font-medium"><div className="flex items-center gap-1"><Phone className="w-3 h-3 opacity-60" />{lead.phone||"—"}</div></td>
                        <td className="px-5 py-4 max-w-[260px]"><div className="text-[12.5px] leading-[1.5] line-clamp-2 text-black/70">{lead.message}</div></td>
                        <td className="px-5 py-4">
                          <select value={lead.status} onChange={(e)=>updateLeads(prev=>prev.map(x=>x.id===lead.id?{...x,status:e.target.value as LeadStatus}:x))} className={`h-8 rounded-full px-3 text-[11.5px] font-bold border ${lead.status==='nouveau'?'bg-[#FF5A1F]/10 border-[#FF5A1F]/20 text-[#FF5A1F]': lead.status==='lu'?'bg-[#0A1931]/5 border-black/10':'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'}`}>
                            <option value="nouveau">nouveau</option>
                            <option value="lu">lu</option>
                            <option value="contacté">contacté</option>
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={()=>setViewLead(lead)} className="w-8 h-8 rounded-full bg-[#0A1931] text-white grid place-items-center hover:scale-110 transition"><EyeIcon className="w-4 h-4" /></button>
                            <button onClick={()=>openDeleteModal(lead)} className="w-8 h-8 rounded-full border border-black/10 grid place-items-center hover:bg-red-50 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-black/50 font-medium">
            <span>{filteredLeads.length} / {leads.length} affichés · Stockage local sans API · Fichier de référence: abla-leads-db.json</span>
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />Base connectée à window.__ABLA_DB__</span>
          </div>
          {showDeleteModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#0A1931]/70 backdrop-blur-sm">
              <div className="w-full max-w-[430px] rounded-[24px] bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] border border-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/10 text-red-600 grid place-items-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="serif text-[18px] font-bold tracking-tight text-[#0A1931]">{deleteTarget ? `Supprimer ${deleteTarget.name}` : "Vider toute la base"}</div>
                    <div className="text-[12px] text-black/60 font-medium">Cette action est irréversible.</div>
                  </div>
                </div>
                <p className="mt-4 text-[13px] leading-[1.6] text-black/70">
                  {deleteTarget
                    ? "Cette suppression effacera définitivement ce lead de la base."
                    : "Toutes les demandes seront supprimées de la base locale. Vous pouvez exporter avant si nécessaire."}
                </p>
                <form onSubmit={confirmDelete} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-[12.5px] font-bold text-[#0A1931]">Mot de passe de connexion</span>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        setDeleteError("");
                      }}
                      placeholder="2024"
                      className="mt-2 w-full h-[48px] rounded-[14px] bg-[#FFF8F0] border-2 border-black/[0.06] px-4 text-[14px] font-medium outline-none focus:border-[#FF5A1F]/40 focus:ring-2 focus:ring-[#FF5A1F]/20"
                    />
                  </label>
                  {deleteError && <div className="text-[12px] text-red-600 font-medium">{deleteError}</div>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowDeleteModal(false); setDeletePassword(""); setDeleteError(""); setDeleteTarget(null); }} className="flex-1 h-[46px] rounded-full border border-black/10 text-[13px] font-semibold text-black/70 hover:bg-black/[0.04] transition">Annuler</button>
                    <button type="submit" className="flex-1 h-[46px] rounded-full bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition">Confirmer la suppression</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
        {viewLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0A1931]/60 backdrop-blur-sm">
            <div className="w-full max-w-[560px] rounded-[28px] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.4)] p-7 relative">
              <button onClick={()=>setViewLead(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/5 grid place-items-center hover:bg-black/10 transition"><X className="w-4 h-4" /></button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-[#0A1931] text-white grid place-items-center font-bold">{viewLead.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                <div>
                  <div className="font-bold text-[16px]">{viewLead.name}</div>
                  <div className="text-[12.5px] text-black/60">{new Date(viewLead.date).toLocaleString('fr-CA')} · {viewLead.need}</div>
                </div>
              </div>
              <div className="space-y-3 text-[13.5px]">
                <div className="rounded-[14px] bg-[#FFF8F0] border border-black/5 p-4"><div className="text-[11px] uppercase font-bold tracking-wide text-black/40 mb-1">Email</div><div className="font-medium">{viewLead.email}</div></div>
                <div className="rounded-[14px] bg-[#FFF8F0] border border-black/5 p-4"><div className="text-[11px] uppercase font-bold tracking-wide text-black/40 mb-1">Téléphone</div><div className="font-medium">{viewLead.phone||"—"}</div></div>
                <div className="rounded-[14px] bg-white border-2 border-black/[0.06] p-4"><div className="text-[11px] uppercase font-bold tracking-wide text-black/40 mb-2">Message complet</div><div className="leading-[1.6] whitespace-pre-wrap">{viewLead.message}</div></div>
              </div>
              <div className="mt-6 flex gap-2">
                <button onClick={()=>{updateLeads(prev=>prev.map(x=>x.id===viewLead.id?{...x,status:"lu"}:x)); setViewLead(null)}} className="flex-1 h-11 rounded-full bg-[#0A1931] text-white font-bold text-[13px]">Marquer lu</button>
                <button onClick={()=>setViewLead(null)} className="flex-1 h-11 rounded-full border border-black/10 font-bold text-[13px]">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen antialiased overflow-x-hidden bg-white selection:bg-[#FF5A1F]/20"
      style={{ color: "#0A1931", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .sans { font-family: 'Inter', sans-serif; }
        @keyframes pulseSoft {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,90,31,0.5); transform: scale(1); }
          50% { box-shadow: 0 0 0 12px rgba(255,90,31,0); transform: scale(1.02); }
        }
        .btn-pulse { animation: pulseSoft 2.2s infinite; }
        @keyframes drift { 0%{transform: translate(0,0)} 50%{transform: translate(8px,-12px)} 100%{transform: translate(0,0)} }
      `}</style>

      {/* HEADER - WHITE PREMIUM */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-black/[0.06]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border-[3px] border-white ring-1 ring-[#FF5A1F] shadow-[0_4px_16px_rgba(0,0,0,0.14)] bg-white shrink-0">
              <img src={headshot} alt="Abla Etonam MENSAH (Paméla)" className="w-full h-full object-cover object-center" />
            </div>
            <div className="leading-none">
              <div className="serif text-[14px] md:text-[15px] font-semibold tracking-tight">Abla Etonam MENSAH (Paméla)</div>
              <div className="sans text-[10px] md:text-[11px] tracking-[0.12em] uppercase font-bold mt-[3px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" /> Conseillère en Sécurité Financière
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 sans text-[13.5px] font-semibold">
            <button onClick={() => handleNav("apropos", "À propos")} className={`transition relative ${activeSection==="apropos" ? "text-[#0A1931]" : "opacity-70 hover:opacity-100"}`}>
              À propos
              {activeSection==="apropos" && <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#FF5A1F] rounded-full" />}
            </button>
            <button onClick={() => handleNav("services", "Services")} className={`transition relative ${activeSection==="services" ? "text-[#0A1931]" : "opacity-70 hover:opacity-100"}`}>
              Services
              {activeSection==="services" && <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#FFC93C] rounded-full" />}
            </button>
            <button onClick={() => handleNav("pourquoi", "Approche")} className={`transition relative ${activeSection==="pourquoi" ? "text-[#0A1931]" : "opacity-70 hover:opacity-100"}`}>
              Approche
              {activeSection==="pourquoi" && <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#0E4D45] rounded-full" />}
            </button>
            <button onClick={() => handleNav("contact", "Contact")} className={`transition relative ${activeSection==="contact" ? "text-[#0A1931]" : "opacity-70 hover:opacity-100"}`}>
              Contact
              {activeSection==="contact" && <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#FF5A1F] rounded-full" />}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {toast && <span className="hidden md:inline-flex sans text-[11px] bg-[#0A1931] text-white px-3 py-1 rounded-full">{toast}</span>}
            <button
              onClick={() => handleNav("contact", "Rendez-vous →")}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#FF5A1F] text-white px-5 h-11 text-[13.5px] font-bold hover:bg-[#e04e1a] hover:shadow-[0_8px_24px_rgba(255,90,31,0.35)] transition-all"
            >
              Prendre rendez-vous <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNav("contact", "Contact")}
              className="md:hidden w-10 h-10 rounded-full bg-[#FF5A1F] text-white grid place-items-center shadow-lg"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO V3 - SPLIT: LEFT TEXT DARK NAVY / RIGHT PHOTO */}
      <section id="hero" className="relative bg-[#0A1931] text-white overflow-hidden">
        {/* subtle gradients */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#FFC93C] blur-[90px] opacity-[0.18]" style={{ animation: 'drift 12s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[42%] left-[18%] w-[320px] h-[320px] rounded-full bg-gradient-to-br from-[#FF5A1F]/20 to-[#0E4D45]/20 blur-[80px] opacity-40" />

        <div className="relative mx-auto max-w-[1280px] flex flex-col lg:flex-row min-h-[640px] lg:min-h-[760px]">
          {/* LEFT - TEXT */}
          <div className="relative flex-[1.1] px-6 md:px-10 pt-12 md:pt-20 pb-10 lg:pb-20 flex flex-col justify-center">
            {/* Badge with name */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 backdrop-blur px-4 py-1.5 text-[11px] tracking-[0.08em] uppercase font-bold sans">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" /> Abla Etonam MENSAH (Paméla) | Conseillère agréée
            </div>

            <h1 className="serif mt-6 md:mt-7 text-[36px] sm:text-[44px] md:text-[60px] lg:text-[62px] leading-[0.92] tracking-[-0.03em] font-[700] max-w-full break-words">
              Protéger votre
              <br />
              <span className="text-[#FF5A1F]">avenir</span> avec des
              <br />
              choix financiers
              <br />
              <span className="relative inline-block">
                éclairés.
                <span className="absolute left-0 right-0 bottom-[0.08em] h-[0.22em] bg-[#FFC93C]/30 -z-10 -rotate-1" />
              </span>
            </h1>

            <p className="sans mt-6 max-w-[46ch] text-[16px] md:text-[17px] leading-[1.65] text-white/70">
              Je vous aide à mieux comprendre votre situation, à identifier vos besoins et à choisir les solutions adaptées à votre réalité.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {[
                { label: "Écoute attentive", dot: "bg-[#FF5A1F]" },
                { label: "Conseils clairs", dot: "bg-[#FFC93C]" },
                { label: "Approche rassurante", dot: "bg-[#0E4D45]" },
              ].map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur px-4 h-9 text-[13px] font-semibold"
                >
                  <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("contact")}
                className="inline-flex items-center gap-2 rounded-full bg-[#FF5A1F] text-white px-7 h-[52px] text-[15px] font-bold hover:bg-[#ff4a0a] hover:shadow-[0_12px_32px_rgba(255,90,31,0.45)] hover:translate-y-[-1px] transition-all"
              >
                Réserver un échange <ArrowUpRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollTo("services")}
                className="inline-flex items-center gap-2 rounded-full bg-[#16A34A] border border-[#16A34A] text-white px-7 h-[52px] text-[15px] font-bold hover:bg-[#15803D] hover:shadow-[0_12px_32px_rgba(22,163,74,0.45)] hover:translate-y-[-1px] transition-all"
              >
                Explorer mes services
              </button>
            </div>

            <div className="mt-8 lg:mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full overflow-hidden border-[3px] border-white ring-1 ring-[#FF5A1F] shadow-[0_4px_16px_rgba(10,25,49,0.25)] bg-white shrink-0">
                  <img src={headshot} alt="Abla Etonam MENSAH" className="w-full h-full object-cover object-center" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#FFC93C] border-2 border-[#0A1931] grid place-items-center">
                  <Star className="w-4 h-4 text-[#0A1931] fill-[#0A1931]" />
                </div>
                <div className="w-9 h-9 rounded-full bg-white border-2 border-[#0A1931] shadow flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#FF5A1F]" />
                </div>
              </div>
              <div className="sans text-[13px] leading-tight">
                <div className="font-bold">+300 familles accompagnées</div>
                <div className="text-white/60">Disponible en virtuel partout au Québec</div>
              </div>
            </div>
          </div>

          {/* RIGHT - PHOTO */}
          <div className="relative flex-[0.9] lg:min-h-full min-h-[520px] bg-[#0A1931] overflow-hidden">
            {/* glow behind portrait to blend - enlarged + green to highlight vest */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#16A34A]/25 via-[#16A34A]/10 to-[#FF5A1F]/20 blur-[50px]" />
            <div className="pointer-events-none absolute top-[45%] right-[15%] w-[520px] h-[520px] rounded-full bg-[#16A34A]/20 blur-[70px]" />
            {/* image - brightened to make green vest pop */}
            <img
              src={heroPortrait}
              alt="Abla Etonam MENSAH (Paméla) - Conseillère en Sécurité Financière"
              className="absolute inset-0 w-full h-full object-cover object-[center_55%]"
              style={{ filter: 'brightness(1.15) saturate(1.25)' }}
            />

            {/* Floating white card */}
            <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:bottom-10 md:min-w-[320px] z-10">
              <div className="rounded-[20px] bg-white text-[#0A1931] shadow-[0_24px_64px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] p-5 border border-black/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#0A1931] grid place-items-center">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="leading-tight">
                      <div className="sans text-[13.5px] font-bold">Approche humaine,</div>
                      <div className="sans text-[13.5px] font-bold">conseils clairs</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#FFC93C] text-[#FFC93C]" />
                    ))}
                  </div>
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-2">
                  {["Sans jargon", "100% personnalisé", "Sans pression"].map((t) => (
                    <div key={t} className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8F0] border border-black/5 px-2.5 py-1.5 sans text-[10.5px] font-bold">
                      <span className="w-4 h-4 rounded-full bg-[#0A1931] grid place-items-center shrink-0"><Check className="w-2.5 h-2.5 text-white" /></span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A PROPOS - WHITE WITH ORANGE PEPS */}
      <section id="apropos" className="relative bg-white overflow-hidden">
        {/* faint orange blobs */}
        <div className="pointer-events-none absolute -top-20 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#FF5A1F]/[0.08] to-[#FFC93C]/[0.12] blur-[40px]" />
        <div className="pointer-events-none absolute top-[30%] left-[10%] w-[180px] h-[4px] bg-[#FFC93C] rotate-12 rounded-full opacity-80" />

        <div className="relative mx-auto max-w-[1280px] px-6 md:px-10 py-12 md:py-24">
          <div className="rounded-[36px] bg-white border border-black/[0.06] shadow-[0_24px_80px_rgba(10,25,49,0.08)] overflow-hidden grid lg:grid-cols-[0.9fr_1.1fr] max-w-full">
            <div className="relative bg-[#0A1931] text-white p-10 md:p-14 flex flex-col justify-between min-h-[460px] overflow-hidden">
              {/* huge A in orange very light */}
              <div className="serif absolute -top-6 -left-2 text-[220px] leading-none font-[800] text-[#FF5A1F]/[0.10] select-none">A</div>
              <div className="relative">
                <div className="inline-flex items-center gap-2 sans text-[11px] tracking-[0.2em] uppercase font-bold">
                  <span className="w-6 h-[2px] bg-[#FF5A1F]" /> À propos
                </div>
                <h2 className="serif mt-5 text-[34px] md:text-[42px] leading-[0.92] font-bold tracking-tight">
                  Une conseillère engagée au service de votre tranquillité
                </h2>
                {/* avatar */}
                <div className="mt-8 flex items-center gap-4">
                  <div className="w-[76px] h-[76px] rounded-full overflow-hidden border-[3px] border-white ring-1 ring-[#FF5A1F] shadow-[0_12px_32px_rgba(0,0,0,0.35)] bg-white shrink-0">
                    <img src={headshot} alt="Abla Etonam MENSAH (Paméla)" className="w-full h-full object-cover object-center" />
                  </div>
                  <div className="leading-tight">
                    <div className="sans text-[14px] font-bold">Abla Etonam MENSAH (Paméla)</div>
                    <div className="sans text-[12px] text-white/70">Conseillère en Sécurité Financière</div>
                    <div className="mt-1.5 flex gap-0.5">
                      {[...Array(5)].map((_,i)=><Star key={i} className="w-3 h-3 fill-[#FFC93C] text-[#FFC93C]" />)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <div className="rounded-full bg-white/10 border border-white/10 px-4 py-2 text-[11px] tracking-wide font-semibold backdrop-blur">Québec · 100% virtuel</div>
                <div className="rounded-full bg-[#FF5A1F] px-4 py-2 text-[11px] tracking-wide font-bold">Humain · Pédagogie</div>
              </div>
              <div className="pointer-events-none absolute -right-20 -bottom-20 w-[340px] h-[340px] rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#FFC93C] blur-[10px] opacity-90" />
            </div>
            <div className="p-8 md:p-14 relative">
              {/* citation deco */}
              <div className="absolute top-10 right-10 serif text-[80px] leading-none text-[#FF5A1F]/10 font-bold">“</div>
              <p className="serif text-[21px] md:text-[23px] leading-[1.4] tracking-tight">
                Je m’appelle <span className="relative inline-block font-bold">Abla Etonam MENSAH (Paméla)<span className="absolute bottom-1 left-0 right-0 h-[6px] bg-[#FFC93C]/50 -z-10" /></span>, conseillère en sécurité financière. J’accompagne les particuliers et les familles avec une approche humaine, pédagogique et sans pression.
              </p>
              <p className="sans mt-6 text-[15.5px] leading-[1.8] text-black/70 max-w-[58ch]">
                Mon rôle n’est pas de vous vendre un produit, mais de vous aider à comprendre votre situation réelle : vos protections actuelles, vos risques, vos objectifs. Ensemble, on clarifie, on priorise et on choisit des solutions qui respectent votre budget, votre réalité et vos valeurs.
              </p>
              <p className="sans mt-5 text-[15.5px] leading-[1.8] text-black/70 max-w-[58ch]">
                Chaque recommandation est expliquée simplement, avec transparence sur les avantages, les limites et les coûts. Vous repartez avec un plan clair — pas avec plus de questions qu’en arrivant.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6 border-t border-black/10 pt-8">
                <div>
                  <div className="serif text-[30px] font-bold text-[#FF5A1F]">100%</div>
                  <div className="sans text-[12.5px] font-medium leading-tight mt-1 opacity-70">Conseils vulgarisés, sans jargon</div>
                </div>
                <div>
                  <div className="serif text-[30px] font-bold text-[#0A1931]">Sans</div>
                  <div className="sans text-[12.5px] font-medium leading-tight mt-1 opacity-70">pression ni vente à tout prix</div>
                </div>
                <div>
                  <div className="serif text-[30px] font-bold text-[#0E4D45]">Clair</div>
                  <div className="sans text-[12.5px] font-medium leading-tight mt-1 opacity-70">Suivi humain et disponible</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES - CARDS WITH COLORED TOP BORDERS */}
      <section id="services" className="relative bg-[#FFFBF7] overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#FF5A1F]/[0.06] to-transparent blur-[30px]" />
        <div className="relative mx-auto max-w-[1280px] px-6 md:px-10 py-14 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <div className="sans inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase font-bold">
                <span className="w-8 h-[3px] bg-[#FF5A1F] rounded-full" /> Services
              </div>
              <h2 className="serif mt-4 text-[36px] md:text-[48px] leading-[0.92] font-bold tracking-tight text-[#0A1931]">
                Des protections pensées
                <br /> pour votre vraie vie.
              </h2>
            </div>
            <p className="sans max-w-[38ch] text-[15px] leading-[1.6] text-black/60 font-medium">
              Des solutions <span className="text-[#FF5A1F] font-bold">simples</span>, expliquées avec pédagogie, pour sécuriser ce qui compte vraiment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Assurance vie",
                desc: "Protéger vos proches advenant le pire, avec un montant adapté à vos responsabilités et à votre budget.",
                top: "bg-[#FF5A1F]",
                iconBg: "bg-[#FF5A1F]",
                hoverBorder: "group-hover:h-[8px]",
              },
              {
                icon: Activity,
                title: "Assurance invalidité",
                desc: "Maintenir votre revenu si un pépin de santé vous empêche de travailler. Essentielle pour les travailleurs autonomes.",
                top: "bg-[#FFC93C]",
                iconBg: "bg-[#FFC93C]",
                hoverBorder: "group-hover:h-[8px]",
              },
              {
                icon: HeartPulse,
                title: "Assurance maladies graves",
                desc: "Un montant non imposable à l’annonce d’un diagnostic couvert, pour vous concentrer sur votre rétablissement.",
                top: "bg-[#0E4D45]",
                iconBg: "bg-[#0E4D45]",
                hoverBorder: "group-hover:h-[8px]",
              },
              {
                icon: PiggyBank,
                title: "Épargne et REER",
                desc: "Mettre en place une épargne qui a du sens, optimisée pour vos objectifs à court, moyen et long terme.",
                top: "bg-[#0A1931]",
                iconBg: "bg-[#0A1931]",
                hoverBorder: "group-hover:h-[8px]",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="group relative rounded-[28px] bg-white border border-black/[0.06] p-7 md:p-8 shadow-[0_12px_40px_rgba(10,25,49,0.06)] hover:shadow-[0_28px_64px_rgba(10,25,49,0.16)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
              >
                {/* colored top border */}
                <div className={`absolute top-0 left-0 right-0 h-[6px] ${s.top} transition-all duration-300 ${s.hoverBorder}`} />
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-[16px] ${s.iconBg} grid place-items-center shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}>
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-9 h-9 rounded-full border-2 border-black/10 grid place-items-center opacity-0 group-hover:opacity-100 group-hover:bg-[#0A1931] group-hover:text-white group-hover:border-[#0A1931] transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="serif mt-6 text-[23px] font-bold tracking-tight text-[#0A1931]">{s.title}</h3>
                <p className="sans mt-3 text-[14.5px] leading-[1.6] text-black/60 max-w-[44ch] font-medium">{s.desc}</p>
                <div className="mt-6 inline-flex items-center gap-2.5 sans text-[12.5px] font-bold">
                  <span className={`w-8 h-[3px] ${s.top} rounded-full group-hover:w-12 transition-all`} /> En savoir plus
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI - DARK #0A1931 */}
      <section id="pourquoi" className="relative bg-[#0A1931] overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-[20%] w-[560px] h-[560px] rounded-full bg-gradient-to-br from-[#FF5A1F]/20 to-transparent blur-[70px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-[#FFC93C]/[0.08] blur-[60px]" />
        <div className="pointer-events-none absolute top-16 right-[8%] w-[200px] h-[2px] bg-gradient-to-r from-[#FFC93C]/0 via-[#FFC93C] to-[#FFC93C]/0" />

        <div className="relative mx-auto max-w-[1280px] px-6 md:px-10 py-14 md:py-20">
          <div className="flex flex-wrap justify-between gap-6 items-end">
            <h2 className="serif text-[34px] md:text-[48px] leading-[0.9] font-bold tracking-tight text-white">
              Pourquoi me <span className="text-[#FFC93C]">choisir</span> ?
            </h2>
            <div className="sans text-[14px] text-white/60 max-w-[36ch] leading-[1.6] font-medium">
              Une approche centrée sur vous, pas sur les produits. Transparente, humaine et rassurante.
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8">
            {[
              {
                icon: Ear,
                title: "Écoute",
                text: "Je prends le temps de comprendre votre histoire, votre contexte familial et vos priorités avant de proposer quoi que ce soit.",
              },
              {
                icon: Eye,
                title: "Transparence",
                text: "Chaque option est expliquée avec ses avantages, ses limites et ses coûts. Aucun jargon caché.",
              },
              {
                icon: GraduationCap,
                title: "Pédagogie",
                text: "Vous repartez en comprenant vraiment vos choix. Fini les décisions prises dans le flou.",
              },
              {
                icon: HandHeart,
                title: "Sans pression",
                text: "Mon objectif : que vous vous sentiez en confiance et sereine. Vous décidez à votre rythme.",
              },
            ].map((item) => (
              <div key={item.title} className="group relative rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur hover:bg-white/[0.07] hover:border-[#FF5A1F]/30 transition-all">
                <div className="w-14 h-14 rounded-full bg-[#FF5A1F] grid place-items-center shadow-[0_8px_24px_rgba(255,90,31,0.4)] group-hover:scale-110 transition-transform">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="serif mt-5 text-[20px] font-bold tracking-tight text-white">{item.title}</h3>
                <p className="sans mt-2 text-[13.5px] leading-[1.65] text-white/65 font-medium">{item.text}</p>
                <div className="mt-4 w-10 h-[3px] bg-[#FFC93C] rounded-full opacity-0 group-hover:opacity-100 transition" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT - #FFF8F0 PECHE */}
      <section id="contact" className="relative bg-[#FFF8F0] overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#FF5A1F]/[0.12] to-[#FFC93C]/[0.10] blur-[50px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-[#0E4D45]/[0.06] blur-[60px]" />

        <div className="relative mx-auto max-w-[1280px] px-6 md:px-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-[110px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border-2 border-[#FF5A1F]/20 px-4 py-1.5 sans text-[11px] tracking-[0.14em] uppercase font-bold text-[#FF5A1F] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" /> Parlons-en
              </div>
              <h2 className="serif mt-6 text-[38px] md:text-[50px] leading-[0.9] font-bold tracking-tight text-[#0A1931]">
                Vous souhaitez
                <br /> être <span className="text-[#FF5A1F]">recontacté</span> ?
              </h2>
              <p className="sans mt-5 max-w-[42ch] text-[15.5px] leading-[1.7] text-black/65 font-medium">
                Dites-m’en un peu plus sur votre situation. Je vous reviens rapidement avec des disponibilités pour un premier échange gratuit et sans engagement.
              </p>

              <div className="mt-8 rounded-[20px] bg-white border-2 border-[#0A1931]/5 p-5 flex gap-3 shadow-[0_16px_40px_rgba(10,25,49,0.06)] max-w-[380px]">
                <div className="w-11 h-11 rounded-full overflow-hidden border-[3px] border-white ring-1 ring-[#FF5A1F] shadow-[0_4px_16px_rgba(0,0,0,0.12)] bg-white shrink-0">
                  <img src={headshot} alt="Abla Etonam MENSAH" className="w-full h-full object-cover object-center" />
                </div>
                <div>
                  <div className="sans text-[13.5px] font-bold">Abla Etonam MENSAH (Paméla)</div>
                  <div className="sans text-[12.5px] text-black/60 font-medium">Réponse habituelle &lt; 24h · Visio ou téléphone</div>
                  <div className="mt-2 flex gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFC93C]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0E4D45]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white border-2 border-black/[0.06] shadow-[0_32px_80px_rgba(10,25,49,0.10)] p-6 md:p-8 relative">
              <div className="absolute top-0 inset-x-8 h-[4px] bg-gradient-to-r from-[#FF5A1F] via-[#FFC93C] to-[#0E4D45] rounded-full" />
              {sent ? (
                <div className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-[#FF5A1F] grid place-items-center shadow-[0_12px_32px_rgba(255,90,31,0.35)]">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="serif mt-6 text-[28px] font-bold text-[#0A1931]">Merci, c’est bien reçu !</h3>
                  <p className="sans mt-3 text-[14.5px] text-black/60 max-w-[36ch] mx-auto leading-[1.6] font-medium">
                    Votre demande a été transmise. Je vous recontacte dans les prochaines 24h avec mes disponibilités.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-8 rounded-full border-2 border-[#0A1931]/10 px-6 h-11 sans text-[13.5px] font-bold hover:bg-[#0A1931] hover:text-white transition"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    handleFormSubmit(e);
                  }}
                  className="space-y-5"
                >
                  <div className="grid md:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="sans text-[12.5px] font-bold text-[#0A1931]">Nom complet</span>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Ex: Marie Tremblay"
                        className="mt-2 w-full h-[50px] rounded-[14px] bg-[#FFF8F0] border-2 border-black/[0.06] px-4 sans text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 focus:border-[#FF5A1F]/40 transition"
                      />
                    </label>
                    <label className="block">
                      <span className="sans text-[12.5px] font-bold text-[#0A1931]">Courriel</span>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="marie@exemple.com"
                        className="mt-2 w-full h-[50px] rounded-[14px] bg-[#FFF8F0] border-2 border-black/[0.06] px-4 sans text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 focus:border-[#FF5A1F]/40 transition"
                      />
                    </label>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="sans text-[12.5px] font-bold text-[#0A1931]">Téléphone</span>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="(514) 000-0000"
                        className="mt-2 w-full h-[50px] rounded-[14px] bg-[#FFF8F0] border-2 border-black/[0.06] px-4 sans text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 focus:border-[#FF5A1F]/40 transition"
                      />
                    </label>
                    <label className="block">
                      <span className="sans text-[12.5px] font-bold text-[#0A1931]">Type de besoin</span>
                      <select
                        required
                        value={form.need}
                        onChange={(e) => setForm({ ...form, need: e.target.value })}
                        className="mt-2 w-full h-[50px] rounded-[14px] bg-[#FFF8F0] border-2 border-black/[0.06] px-4 sans text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 focus:border-[#FF5A1F]/40 transition"
                      >
                        <option value="">Sélectionner</option>
                        <option>Assurance vie</option>
                        <option>Assurance invalidité</option>
                        <option>Assurance maladies graves</option>
                        <option>Épargne et REER</option>
                        <option>Bilan complet</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="sans text-[12.5px] font-bold text-[#0A1931]">Message</span>
                    <textarea
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Parlez-moi brièvement de votre situation et de ce que vous aimeriez clarifier..."
                      rows={5}
                      className="mt-2 w-full rounded-[16px] bg-[#FFF8F0] border-2 border-black/[0.06] p-4 sans text-[14px] leading-[1.6] font-medium outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 focus:border-[#FF5A1F]/40 transition resize-none"
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="sans text-[11.5px] text-black/50 max-w-[32ch] leading-[1.5] font-medium">
                      En envoyant ce formulaire, vous acceptez d’être recontactée pour planifier un échange.
                    </p>
                    <button
                      type="submit"
                      className="btn-pulse inline-flex items-center gap-2 rounded-full bg-[#FF5A1F] text-white px-8 h-[52px] sans text-[15px] font-bold hover:bg-[#e84f1b] hover:shadow-[0_16px_32px_rgba(255,90,31,0.4)] transition"
                    >
                      Envoyer ma demande <ArrowUpRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER - DARK PREMIUM */}
      <footer className="bg-[#0A1931] border-t border-white/10">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 h-[80px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border-[3px] border-white ring-1 ring-[#FF5A1F] shadow-[0_4px_12px_rgba(0,0,0,0.2)] bg-white shrink-0"><img src={headshot} alt="" className="w-full h-full object-cover object-center" /></div>
            <span className="sans text-[12.5px] text-white/60 font-medium">© {new Date().getFullYear()} Abla Etonam MENSAH (Paméla) — Tous droits réservés</span>
          </div>
          <div className="hidden md:flex items-center gap-3 sans text-[12px] text-white/50 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
            <span>Conseillère en sécurité financière</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-[#FFC93C]" />Approche humaine et transparente</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
