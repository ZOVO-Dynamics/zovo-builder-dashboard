"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  email: string;
  name: string | null;
  isBusiness: boolean;
  businessNumber: string | null;
  website: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressProvince: string | null;
  addressPostalCode: string | null;
  phone: string | null;
  termsAcceptedAt: string | null;
};

const inputClass =
  "w-full rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm text-[#F5F1E8]";
const labelClass = "block text-xs text-[#9B9B95] mb-1";

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);

  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  const [isBusiness, setIsBusiness] = useState(false);
  const [businessNumber, setBusinessNumber] = useState("");
  const [website, setWebsite] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((res) => res.json())
      .then((data) => {
        const u = data?.user;
        if (!u) return;
        setAccount(u);
        setName(u.name ?? "");
        setDateOfBirth(u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : "");
        setGender(u.gender ?? "");
        setAddressStreet(u.addressStreet ?? "");
        setAddressCity(u.addressCity ?? "");
        setAddressProvince(u.addressProvince ?? "");
        setAddressPostalCode(u.addressPostalCode ?? "");
        setPhone(u.phone ?? "");
        setIsBusiness(Boolean(u.isBusiness));
        setBusinessNumber(u.businessNumber ?? "");
        setWebsite(u.website ?? "");
        setAcceptedTerms(Boolean(u.termsAcceptedAt));
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("La confirmation du nouveau mot de passe ne correspond pas");
      return;
    }

    if (isBusiness && !businessNumber.trim()) {
      setError("Le numéro d'entreprise est requis pour un compte entreprise");
      return;
    }

    if (!acceptedTerms) {
      setError("Tu dois accepter les conditions générales et la politique de confidentialité");
      return;
    }

    setSaving(true);

    const body: Record<string, string | boolean> = {
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
      website,
      acceptedTerms,
    };

    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue");
        return;
      }

      setAccount(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Modifications enregistrées.");
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-[#F5F1E8] p-6 md:p-10">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F1E8] p-6 md:p-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">
            COMPTE
          </span>
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="mt-1 text-2xl font-bold text-[#F5F1E8]"
          >
            Mon compte
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-4">
            <p className="text-sm font-medium">Informations personnelles</p>

            <div>
              <label className={labelClass}>Nom complet et prénom *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Date de naissance *</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Genre *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">Sélectionner...</option>
                <option value="femme">Femme</option>
                <option value="homme">Homme</option>
                <option value="autre">Autre</option>
                <option value="prefere-ne-pas-dire">Préfère ne pas dire</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Adresse (rue) *</label>
              <input
                type="text"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ville *</label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Province / région *</label>
                <input
                  type="text"
                  value={addressProvince}
                  onChange={(e) => setAddressProvince(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Code postal *</label>
              <input
                type="text"
                value={addressPostalCode}
                onChange={(e) => setAddressPostalCode(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-4">
            <p className="text-sm font-medium">Coordonnées</p>
            <div>
              <label className={labelClass}>Courriel</label>
              <input type="email" value={account.email} disabled className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Numéro de téléphone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isBusiness}
                onChange={(e) => setIsBusiness(e.target.checked)}
                className="h-4 w-4"
              />
              Compte entreprise
            </label>
            <div>
              <label className={labelClass}>Site web</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
            {isBusiness && (
              <div>
                <label className={labelClass}>
                  Numéro d&apos;entreprise <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-4">
            <p className="text-sm font-medium">Changer le mot de passe</p>
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
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
              className="h-4 w-4 mt-0.5"
            />
            <span>
              J&apos;ai lu et j&apos;accepte les{" "}
              <Link href="/terms" className="text-[#E8C34A] underline">
                conditions générales
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" className="text-[#E8C34A] underline">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-50 px-4 py-2 text-sm font-medium text-[#0A0A0C]"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
