import { IncidentIcon } from "@/components/ui/incident-icon";
import { formatNumber } from "@/lib/format";
import type { TypeShare } from "@/lib/server/services/stats";

// One series → one colour for every bar (validated on the dark panel surface).
const SERIES = "#3987e5";

/**
 * Share of each incident type: horizontal bars sorted by size, each row
 * labelled with its percentage and count, so no value depends on colour or hover.
 */
export function ShareBars({ shares }: { shares: TypeShare[] }) {
  const max = Math.max(...shares.map((share) => share.percent), 1);
  return (
    <table className="w-full border-separate border-spacing-y-2.5 text-sm">
      <caption className="sr-only">Répartition des incidents par type</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Type</th>
          <th scope="col">Part</th>
          <th scope="col">Incidents</th>
        </tr>
      </thead>
      <tbody>
        {shares.map((share) => (
          <tr key={share.code} className="group">
            <th scope="row" className="w-44 pr-3 text-left font-normal text-slate-300">
              <span className="flex items-center gap-2">
                <IncidentIcon code={share.code} size={14} className="text-slate-500" />
                <span className="truncate">{share.label}</span>
              </span>
            </th>
            <td className="w-full" title={`${share.label} : ${share.percent.toFixed(1)} % (${share.count})`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-2.5 rounded-r-[4px] transition-[filter] group-hover:brightness-125"
                  style={{ width: `${(share.percent / max) * 100}%`, minWidth: 3, backgroundColor: SERIES }}
                />
                <span className="whitespace-nowrap font-semibold text-slate-100">
                  {share.percent.toFixed(1).replace(".", ",")} %
                </span>
              </div>
            </td>
            <td className="whitespace-nowrap pl-3 text-right text-xs tabular-nums text-slate-500">{formatNumber(share.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
