"use client";

import { useState, useMemo } from "react";
import { calculateTax, PROVINCE_TAX_RATES, type ProvinceCode } from "@/lib/taxCalculator";

interface TaxBreakdownProps {
  subtotal: number;
  defaultProvince?: ProvinceCode;
  gstNumber?: string;
  pstNumber?: string;
  onProvinceChange?: (province: ProvinceCode) => void;
}

const PROVINCE_ORDER: ProvinceCode[] = [
  "QC", "ON", "NB", "NS", "PE", "NL", "AB", "BC", "SK", "MB", "YT", "NT", "NU",
];

export default function TaxBreakdown({
  subtotal,
  defaultProvince = "QC",
  gstNumber,
  pstNumber,
  onProvinceChange,
}: TaxBreakdownProps) {
  const [province, setProvince] = useState<ProvinceCode>(defaultProvince);

  const breakdown = useMemo(
    () => calculateTax(subtotal, province, { gstNumber, pstNumber }),
    [subtotal, province, gstNumber, pstNumber]
  );

  const config = PROVINCE_TAX_RATES[province];

  const handleChange = (p: ProvinceCode) => {
    setProvince(p);
    onProvinceChange?.(p);
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-200">
      <div className="mb-3">
        <label className="mb-1 block text-xs text-zinc-400">
          Province de livraison
        </label>
        <select
          value={province}
          onChange={(e) => handleChange(e.target.value as ProvinceCode)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PROVINCE_ORDER.map((code) => (
            <option key={code} value={code}>
              {PROVINCE_TAX_RATES[code].name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 border-t border-zinc-800 pt-3">
        <Row label="Sous-total" value={breakdown.subtotal} />

        {config.type === "HST" ? (
          <Row
            label={`TVH (${(config.hstRate * 100).toFixed(2)}%)`}
            value={breakdown.hst}
          />
        ) : (
          <>
            <Row label={`TPS (${(config.gstRate * 100).toFixed(2)}%)`} value={breakdown.gst} />
            {config.pstRate > 0 && (
              <Row
                label={`${province === "QC" ? "TVQ" : "TVP"} (${(config.pstRate * 100).toFixed(3)}%)`}
                value={breakdown.pst}
              />
            )}
          </>
        )}

        <div className="flex justify-between border-t border-zinc-800 pt-2 font-semibold text-white">
          <span>Total</span>
          <span>{formatCAD(breakdown.total)}</span>
        </div>
      </div>

      {(gstNumber || pstNumber) && (
        <div className="mt-3 space-y-0.5 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
          {gstNumber && <div>N° TPS : {gstNumber}</div>}
          {pstNumber && <div>N° {province === "QC" ? "TVQ" : "TVP"} : {pstNumber}</div>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-zinc-400">
      <span>{label}</span>
      <span className="text-zinc-200">{formatCAD(value)}</span>
    </div>
  );
}

function formatCAD(value: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}
