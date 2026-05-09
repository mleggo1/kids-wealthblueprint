export type FamilyChartRow = { age: number; total: number; contributed: number; growth: number };

export type FamilyReportInput = {
  generatedAt: string;
  startAge: number;
  targetAge: number;
  initialInvestment: number;
  monthlySuper: number;
  monthlyPersonal: number;
  annualReturn: number;
  finalAmount: number;
  totalContributed: number;
  totalGrowth: number;
  chartData: FamilyChartRow[];
  showAdvancedContributions: boolean;
  contributionSchedule: Array<{ age: number; amountSuper: number; amountPersonal: number }>;
  showTakeABreak: boolean;
  breakPeriodsSuper: Array<{ fromAge: number; toAge: number }>;
  breakPeriodsPersonal: Array<{ fromAge: number; toAge: number }>;
};

function sampleRows(data: FamilyChartRow[]): FamilyChartRow[] {
  if (data.length <= 18) return data;
  const step = Math.max(1, Math.floor(data.length / 16));
  const out: FamilyChartRow[] = [];
  for (let i = 0; i < data.length; i += step) out.push(data[i]);
  const last = data[data.length - 1];
  if (out[out.length - 1]?.age !== last.age) out.push(last);
  return out;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildFamilyReportHtml(input: FamilyReportInput): string {
  const rows = sampleRows(input.chartData);
  const monthlyTotal = input.monthlySuper + input.monthlyPersonal;

  const scheduleRows =
    input.showAdvancedContributions && input.contributionSchedule.length > 0
      ? input.contributionSchedule
          .map(
            (e) =>
              `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${e.age}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${e.amountSuper.toLocaleString()}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${e.amountPersonal.toLocaleString()}</td></tr>`
          )
          .join('')
      : '';

  const breaksSuper =
    input.showTakeABreak && input.breakPeriodsSuper.length > 0
      ? input.breakPeriodsSuper.map((b) => `Super pause: age ${b.fromAge}–${b.toAge}`).join('; ')
      : '—';
  const breaksPersonal =
    input.showTakeABreak && input.breakPeriodsPersonal.length > 0
      ? input.breakPeriodsPersonal.map((b) => `Personal pause: age ${b.fromAge}–${b.toAge}`).join('; ')
      : '—';

  const projectionRows = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${Number(r.age).toFixed(1)}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">$${r.total.toLocaleString()}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">$${r.contributed.toLocaleString()}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">$${r.growth.toLocaleString()}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Family Wealth Blueprint — Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #fff; line-height: 1.45; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 28px 32px 40px; }
    .hero { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 45%, #7c3aed 100%); color: #fff; padding: 22px 26px; border-radius: 12px; margin-bottom: 22px; }
    .hero h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .hero p { margin: 0; opacity: 0.95; font-size: 13px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px; margin-bottom: 16px; background: #fafafa; break-inside: avoid; page-break-inside: avoid; }
    .card h2 { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #4b5563; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 14px; }
    .grid div { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .grid strong { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .highlight { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
    .stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .stat .n { font-size: 20px; font-weight: 800; color: #1d4ed8; }
    .stat .l { font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; break-inside: auto; page-break-inside: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
    th { text-align: left; padding: 8px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
    th.r, td.r { text-align: right; }
    .disclaimer { font-size: 11px; color: #6b7280; line-height: 1.5; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; break-inside: avoid; page-break-inside: avoid; }
    @page { size: A4; margin: 14mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .wrap { padding: 0; max-width: none; }
      .hero, .highlight, .card, .disclaimer, .stat { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Family Wealth Blueprint</h1>
      <p>Projection report · ${esc(input.generatedAt)}</p>
    </div>

    <div class="highlight">
      <div class="stat"><div class="n">$${input.finalAmount.toLocaleString()}</div><div class="l">Total at age ${input.targetAge}</div></div>
      <div class="stat"><div class="n">$${input.totalContributed.toLocaleString()}</div><div class="l">Total contributed</div></div>
      <div class="stat"><div class="n">$${input.totalGrowth.toLocaleString()}</div><div class="l">Growth (illustrative)</div></div>
    </div>

    <div class="card">
      <h2>Assumptions</h2>
      <div class="grid">
        <div><strong>Current age</strong>${input.startAge}</div>
        <div><strong>Target age</strong>${input.targetAge}</div>
        <div><strong>Initial amount</strong>$${input.initialInvestment.toLocaleString()}</div>
        <div><strong>Return (p.a.)</strong>${input.annualReturn}%</div>
        <div><strong>Super / month</strong>$${input.monthlySuper.toLocaleString()}</div>
        <div><strong>Personal / month</strong>$${input.monthlyPersonal.toLocaleString()}</div>
        <div><strong>Combined / month</strong>$${monthlyTotal.toLocaleString()}</div>
        <div><strong>Breaks (super)</strong>${esc(breaksSuper)}</div>
        <div><strong>Breaks (personal)</strong>${esc(breaksPersonal)}</div>
      </div>
    </div>

    ${
      scheduleRows
        ? `<div class="card"><h2>Adjust by age (when enabled)</h2>
    <table><thead><tr><th>Age</th><th class="r">Super/mo</th><th class="r">Personal/mo</th></tr></thead><tbody>${scheduleRows}</tbody></table></div>`
        : ''
    }

    <div class="card">
      <h2>Projection (sampled yearly points)</h2>
      <table>
        <thead><tr><th>Age</th><th class="r">Total</th><th class="r">Contributed</th><th class="r">Growth</th></tr></thead>
        <tbody>${projectionRows}</tbody>
      </table>
    </div>

    <p class="disclaimer">
      <strong>Disclaimer:</strong> This report is generated from the on-screen calculator for general education only.
      It does not consider your personal objectives, financial situation, or needs. It is not financial advice or a
      recommendation to buy, sell, or hold any financial product. Illustrative returns are not guaranteed.
      You should make your own decisions and consider speaking with a licensed professional before acting.
    </p>
  </div>
</body>
</html>`;
}
