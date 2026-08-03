export const dynamic = "force-dynamic";

import DashboardLayout from "@/components/layout/DashboardLayout";
import GeneratorPanel from "@/components/generator/GeneratorPanel";
import DashboardStats from "@/components/dashboard/DashboardStats";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <h2 className="text-3xl font-bold text-[#F5F1E8]" style={{ fontFamily: "var(--font-display)" }}>
        Welcome to ZOVO Builder 🚀
      </h2>
      <p className="mt-4 text-[#9B9B95]">
        AI Autonomous Application Builder
      </p>

      <div className="mt-8">
        <GeneratorPanel />
      </div>

      <div className="mt-12 grid min-w-0 gap-6 text-center md:grid-cols-3">
        <DashboardStats />
      </div>
    </DashboardLayout>
  );
}
