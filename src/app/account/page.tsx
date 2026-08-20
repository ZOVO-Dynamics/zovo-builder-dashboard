"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SOCIAL_PROVIDERS } from "../../components/auth/SocialProviders";

type Account = {
  id: string;
  email: string;
  name: string | null;
  isBusiness: boolean;
  businessNumber: string | null;
  companyName: string | null;
  website: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressProvince: string | null;
  addressPostalCode: string | null;
  phone: string | null;
  termsAcceptedAt: string | null;
  notifyProductUpdates: boolean;
  notifyBillingAlerts: boolean;
  connectedProviders: string[];
};

type SubscriptionData = {
  hasSubscription: boolean;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  planName?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  billingInterval?: string | null;
};

type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const TABS = [
  { id: "profil", label: "Profil" },
  { id: "billing", label: "Abonnement & Facturation" },
  { id: "security", label: "Sécurité" },
  { id: "api", label: "Clés API & Préférences" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const cardClass =
  "rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all p-6 space-y-4";
const inputClass =
  "w-full rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";
const labelClass = "block text-xs text-zinc-400 mb-1";
const primaryButtonClass =
  "rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 text-black font-semibold px-4 py-2.5 text-sm shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all";


export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("profil");

  useEffect(() => {
    fetch("/api/account")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setAccount(data.user);
      });
  }, []);

  if (!account) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_20%,_var(--tw-gradient-stops))] from-[#0A0A0A] via-transparent to-transparent opacity-70"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/dashboard"
          className="text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-amber-400 transition-colors"
        >
          &larr; Retour au tableau de bord
        </Link>

        <h1 className="mt-6 text-3xl md:text-4xl font-black tracking-tight">Mon compte</h1>
        <p className="mt-2 text-zinc-500 text-sm">{account.email}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-500 text-black"
                  : "bg-white/5 border border-amber-500/20 text-zinc-400 hover:text-amber-400 hover:border-amber-500/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {activeTab === "profil" && <ProfileTab account={account} onSaved={setAccount} />}
          {activeTab === "billing" && <BillingTab />}
          {activeTab === "security" && <SecurityTab account={account} onSaved={setAccount} />}
          {activeTab === "api" && <ApiKeysTab account={account} onSaved={setAccount} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Profil                                                       */
/* ------------------------------------------------------------------ */

function ProfileTab({
  account,
  onSaved,
}: {
  account: Account;
  onSaved: (a: Account) => void;
}) {
  const [name, setName] = useState(account.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    account.dateOfBirth ? account.dateOfBirth.slice(0, 10) : ""
  );
  const [gender, setGender] = useState(account.gender ?? "");
  const [addressStreet, setAddressStreet] = useState(account.addressStreet ?? "");
  const [addressCity, setAddressCity] = useState(account.addressCity ?? "");
  const [addressProvince, setAddressProvince] = useState(account.addressProvince ?? "");
  const [addressPostalCode, setAddressPostalCode] = useState(account.addressPostalCode ?? "");
  const [phone, setPhone] = useState(account.phone ?? "");
  const [isBusiness, setIsBusiness] = useState(account.isBusiness);
  const [businessNumber, setBusinessNumber] = useState(account.businessNumber ?? "");
  const [companyName, setCompanyName] = useState(account.companyName ?? "");
  const [website, setWebsite] = useState(account.website ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isBusiness && !businessNumber.trim()) {
      setError("Le numéro d'entreprise est requis pour un compte entreprise");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          dateOfBirth,
          gender,
          addressStreet,
          addressCity,
          addressProvince,
          addressPostalCode,
          phone,
          isBusiness,
          businessNumber,
          companyName,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue");
        return;
      }
      onSaved(data.user);
      setSuccess("Profil mis à jour.");
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Informations personnelles</p>

        <div>
          <label className={labelClass}>Nom complet et prénom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date de naissance</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Genre</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
              <option value="">Sélectionner...</option>
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
              <option value="autre">Autre</option>
              <option value="prefere-ne-pas-dire">Préfère ne pas dire</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Numéro de téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Adresse de facturation</p>
        <div>
          <label className={labelClass}>Adresse (rue)</label>
          <input
            value={addressStreet}
            onChange={(e) => setAddressStreet(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Ville</label>
            <input
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Province / région</label>
            <input
              value={addressProvince}
              onChange={(e) => setAddressProvince(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Code postal</label>
          <input
            value={addressPostalCode}
            onChange={(e) => setAddressPostalCode(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className={cardClass}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isBusiness}
            onChange={(e) => setIsBusiness(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Compte entreprise
        </label>
        {isBusiness && (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nom de l&apos;entreprise</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Numéro d&apos;entreprise <span className="text-red-400">*</span>
              </label>
              <input
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Site web</label>
              <input
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? "Enregistrement..." : "Enregistrer le profil"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Abonnement & Facturation                                     */
/* ------------------------------------------------------------------ */

function BillingTab() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Impossible d'ouvrir le portail de facturation.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Plan actuel</p>
        {data?.hasSubscription ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold">{data.planName || "—"}</p>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  data.status === "active"
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-zinc-700 bg-black/50 text-zinc-400"
                }`}
              >
                {data.status}
              </span>
            </div>
            {data.priceCents != null && (
              <p className="text-sm text-zinc-400">
                {(data.priceCents / 100).toFixed(2)} {data.currency} /{" "}
                {data.billingInterval === "week" ? "semaine" : "mois"}
              </p>
            )}
            {data.currentPeriodEnd && (
              <p className="text-sm text-zinc-500">
                {data.cancelAtPeriodEnd
                  ? `Se termine le ${new Date(data.currentPeriodEnd).toLocaleDateString("fr-CA")}`
                  : `Prochain renouvellement le ${new Date(data.currentPeriodEnd).toLocaleDateString("fr-CA")}`}
              </p>
            )}
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className={primaryButtonClass}
            >
              {portalLoading ? "Ouverture..." : "Gérer mon abonnement (portail Stripe)"}
            </button>
          </>
        ) : (
          <>
            <p className="text-zinc-500">Tu n&apos;as pas encore d&apos;abonnement actif.</p>
            <a
              href="/pricing"
              className="inline-block rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              Voir les plans
            </a>
          </>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        L&apos;adresse de facturation utilisée pour tes factures est celle renseignée dans
        l&apos;onglet <span className="text-zinc-400">Profil</span>.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Sécurité                                                     */
/* ------------------------------------------------------------------ */

function SecurityTab({
  account,
  onSaved,
}: {
  account: Account;
  onSaved: (a: Account) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setError("La confirmation du nouveau mot de passe ne correspond pas");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue");
        return;
      }
      onSaved(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Mot de passe mis à jour.");
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Changer le mot de passe</p>
        <div>
          <label className={labelClass}>Mot de passe actuel</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Nouveau mot de passe</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        <button type="submit" disabled={saving || !newPassword} className={primaryButtonClass}>
          {saving ? "Enregistrement..." : "Changer le mot de passe"}
        </button>
      </form>

      <div className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Connexions sociales</p>
        {SOCIAL_PROVIDERS.map((p) => {
          const connected = account.connectedProviders.includes(p.id);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-black/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {p.icon}
                <span className="text-sm">{p.label}</span>
              </div>
              <span className={`text-xs font-medium ${connected ? "text-emerald-400" : "text-zinc-500"}`}>
                {connected ? "Connecté" : "Non connecté"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Clés API & Préférences                                       */
/* ------------------------------------------------------------------ */

function ApiKeysTab({
  account,
  onSaved,
}: {
  account: Account;
  onSaved: (a: Account) => void;
}) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);

  const [notifyProductUpdates, setNotifyProductUpdates] = useState(account.notifyProductUpdates);
  const [notifyBillingAlerts, setNotifyBillingAlerts] = useState(account.notifyBillingAlerts);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  function loadKeys() {
    setLoadingKeys(true);
    fetch("/api/account/api-keys")
      .then((res) => res.json())
      .then((data) => setKeys(data.keys ?? []))
      .finally(() => setLoadingKeys(false));
  }

  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    setKeysError(null);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeysError(data.error ?? "Erreur lors de la création de la clé");
        return;
      }
      setFreshKey(data.key.rawKey);
      setNewKeyName("");
      loadKeys();
    } catch {
      setKeysError("Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
    loadKeys();
  }

  async function savePreferences() {
    setPrefsSaving(true);
    setPrefsSuccess(false);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyProductUpdates, notifyBillingAlerts }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(data.user);
        setPrefsSuccess(true);
      }
    } finally {
      setPrefsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Clés API développeur</p>

        {freshKey && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
            <p className="text-xs text-amber-300">
              Copie cette clé maintenant, elle ne sera plus affichée en clair.
            </p>
            <code className="block break-all text-sm text-white">{freshKey}</code>
          </div>
        )}

        {loadingKeys ? (
          <p className="text-sm text-zinc-500">Chargement...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune clé API pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-zinc-700 bg-black/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm">{k.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{k.keyPrefix}••••••••</p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeKey(k.id)}
                  className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  Révoquer
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={createKey} className="flex gap-2">
          <input
            placeholder="Nom de la clé (ex: CI/CD)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="shrink-0 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 text-black font-semibold px-4 py-2.5 text-sm transition-all"
          >
            {creating ? "..." : "Créer"}
          </button>
        </form>
        {keysError && <p className="text-sm text-red-400">{keysError}</p>}
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold text-amber-400">Préférences de notification</p>
        <label className="flex items-center justify-between text-sm">
          <span>Mises à jour produit</span>
          <input
            type="checkbox"
            checked={notifyProductUpdates}
            onChange={(e) => setNotifyProductUpdates(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Alertes de facturation</span>
          <input
            type="checkbox"
            checked={notifyBillingAlerts}
            onChange={(e) => setNotifyBillingAlerts(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
        </label>
        <button
          type="button"
          onClick={savePreferences}
          disabled={prefsSaving}
          className={primaryButtonClass}
        >
          {prefsSaving ? "Enregistrement..." : "Enregistrer les préférences"}
        </button>
        {prefsSuccess && <p className="text-sm text-emerald-400">Préférences enregistrées.</p>}
      </div>
    </div>
  );
}
