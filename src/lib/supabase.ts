import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Vrai si les deux variables d'environnement sont présentes.
 * L'interface s'en sert pour afficher un message clair plutôt que de planter
 * sur un `createClient` avec des valeurs vides.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabaseConfigError =
  "Configuration Supabase manquante. Copiez .env.example vers .env.local, " +
  "renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY, puis redémarrez " +
  "le serveur de développement.";

if (!isSupabaseConfigured) {
  console.error(`[abla] ${supabaseConfigError}`);
}

/**
 * La clé « anon » est publique par conception : elle est livrée dans le bundle.
 * La protection des données repose sur les politiques RLS définies dans
 * supabase/schema.sql, appliquées par Postgres — le rôle « anon » peut insérer
 * un lead mais pas en lire un seul.
 */
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
