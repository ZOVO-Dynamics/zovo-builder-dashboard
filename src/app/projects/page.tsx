"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface ProjectSummary {
  id: string;
  name: string;
  projectPath: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  _count: { versions: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setError("Impossible de charger les projets."));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">PROJETS</span>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="mt-1 text-2xl font-bold text-[#F5F1E8]">
            Tes projets
          </h1>
          <p className="mt-1 text-sm text-[#9B9B95]">
            Tous les projets generes avec ton compte, du plus recent au plus ancien.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!error && projects === null && (
          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 text-sm text-[#9B9B95]">
            Chargement...
          </div>
        )}

        {!error && projects !== null && projects.length === 0 && (
          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 text-sm text-[#9B9B95]">
            Aucun projet pour l&apos;instant.{" "}
            <Link href="/dashboard" className="text-[#E8C34A] hover:underline">
              Genere ton premier projet
            </Link>
            .
          </div>
        )}

        {!error && projects !== null && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-medium text-[#F5F1E8] break-words">{p.name}</h2>
                  <span className="shrink-0 rounded-full border border-[#C9A227]/40 px-2 py-0.5 text-[10px] text-[#E8C34A]">
                    v{p.currentVersion}
                  </span>
                </div>
                <p className="text-xs text-[#9B9B95]">
                  {p._count.versions} version{p._count.versions > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-[#6B6560]">
                  Modifie le {new Date(p.updatedAt).toLocaleDateString("fr-CA")}
                </p>
                <Link
                  href={`/dashboard?projectId=${p.id}`}
                  className="inline-block mt-2 text-xs text-[#E8C34A] hover:underline"
                >
                  Ouvrir dans le generateur
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
