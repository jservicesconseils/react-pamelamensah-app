import { supabase } from "./supabase";

export type LeadStatus = "nouveau" | "lu" | "contacté";

export type Lead = {
  id: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  need: string;
  message: string;
  status: LeadStatus;
};

export type NewLead = Omit<Lead, "id" | "date" | "status">;

export type VisitorStats = {
  total: number;
  perDay: Record<string, number>;
};

/** Doit rester identique au fuseau utilisé par la fonction SQL `visit_stats`. */
const STATS_TIMEZONE = "America/Toronto";

/**
 * Date du jour au format YYYY-MM-DD dans le fuseau du Québec. Passer par l'UTC
 * décalerait le compteur « aujourd'hui » en soirée : après 20 h, l'UTC est déjà
 * le lendemain, et la clé recherchée n'existerait pas encore.
 */
export function todayLocalKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: STATS_TIMEZONE });
}

type LeadRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  need: string | null;
  message: string | null;
  status: string | null;
};

/**
 * Traduit une ligne Postgres vers la forme attendue par l'interface.
 * `created_at` devient `date` pour éviter de renommer les ~15 références UI.
 */
function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    date: row.created_at,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    need: row.need ?? "",
    message: row.message ?? "",
    status: (row.status as LeadStatus) ?? "nouveau",
  };
}

/** Lecture de la base. Nécessite une session authentifiée (RLS). */
export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, created_at, name, email, phone, need, message, status")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toLead);
}

/** Envoi du formulaire public. Autorisé au rôle « anon » en insertion seule. */
export async function insertLead(input: NewLead): Promise<void> {
  const { error } = await supabase.from("leads").insert({
    name: input.name,
    email: input.email,
    phone: input.phone,
    need: input.need,
    message: input.message,
  });

  if (error) throw new Error(error.message);
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Purge complète. Le filtre `not id is null` est requis par l'API REST. */
export async function deleteAllLeads(): Promise<void> {
  const { error } = await supabase.from("leads").delete().not("id", "is", null);
  if (error) throw new Error(error.message);
}

/** Remet le compteur de visites à zéro. Réservé à un utilisateur authentifié. */
export async function deleteAllVisits(): Promise<void> {
  const { error } = await supabase.from("visits").delete().not("id", "is", null);
  if (error) throw new Error(error.message);
}

/** Import d'un fichier JSON exporté précédemment. */
export async function bulkInsertLeads(leads: NewLead[]): Promise<void> {
  if (leads.length === 0) return;

  const { error } = await supabase.from("leads").insert(
    leads.map((l) => ({
      name: l.name,
      email: l.email,
      phone: l.phone,
      need: l.need,
      message: l.message,
    }))
  );

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Statistiques de visite
// ---------------------------------------------------------------------------

const VISIT_SESSION_KEY = "abla_visit_counted";

/**
 * Compte une visite, au plus une par session de navigation.
 * Le compteur vit maintenant côté serveur : une visite depuis n'importe quel
 * appareil est visible dans le tableau de bord.
 *
 * Le drapeau est posé AVANT l'insertion, pas après. Sinon deux appels lancés
 * dans le même tick passent tous les deux la vérification et la visite compte
 * double : c'est exactement ce que produit React StrictMode, qui monte chaque
 * effet deux fois en développement — le compteur avançait de 2 en 2. Une
 * écriture dans sessionStorage étant synchrone, poser le drapeau d'abord rend
 * la séquence lire-puis-écrire atomique.
 */
export async function trackVisit(): Promise<void> {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(VISIT_SESSION_KEY) === "1") return;
  sessionStorage.setItem(VISIT_SESSION_KEY, "1");

  const { error } = await supabase.from("visits").insert({});
  if (error) {
    // Une visite non comptée ne doit jamais casser la page. On relâche le
    // drapeau pour que la navigation suivante puisse réessayer.
    sessionStorage.removeItem(VISIT_SESSION_KEY);
    console.warn("[abla] visite non enregistrée :", error.message);
  }
}

/** Total et répartition par jour. Nécessite une session authentifiée (RLS). */
export async function fetchVisitorStats(): Promise<VisitorStats> {
  const [totalResult, perDayResult] = await Promise.all([
    supabase.from("visits").select("id", { count: "exact", head: true }),
    supabase.rpc("visit_stats"),
  ]);

  if (totalResult.error) throw new Error(totalResult.error.message);
  if (perDayResult.error) throw new Error(perDayResult.error.message);

  const perDay: Record<string, number> = {};
  for (const row of (perDayResult.data ?? []) as Array<{ day: string; count: number }>) {
    perDay[row.day] = Number(row.count);
  }

  return { total: totalResult.count ?? 0, perDay };
}

// ---------------------------------------------------------------------------
// Synchronisation temps réel
// ---------------------------------------------------------------------------

/**
 * S'abonne aux changements de la table `leads`.
 *
 * C'est ce qui remplace l'ancienne synchro par `storage` / `BroadcastChannel` :
 * ces mécanismes ne franchissaient jamais les limites d'un navigateur, donc une
 * soumission faite sur téléphone n'atteignait jamais le tableau de bord. Ici le
 * changement transite par Supabase, donc il arrive sur tous les appareils.
 *
 * Retourne une fonction de désabonnement.
 */
export function subscribeToLeads(onChange: () => void): () => void {
  const channel = supabase
    .channel("leads-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
