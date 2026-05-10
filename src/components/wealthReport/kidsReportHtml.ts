export type KidsChartRow = { age: number; total: number; contributed: number; growth: number };

export type KidsReportInput = {
  generatedAt: string;
  startAge: number;
  targetAge: number;
  initialInvestment: number;
  monthlyAmount: number;
  annualReturn: number;
  finalAmount: number;
  totalContributed: number;
  totalGrowth: number;
  chartData: KidsChartRow[];
  showAdvancedContributions: boolean;
  contributionSchedule: Array<{ age: number; amount: number }>;
  chartImageDataUrl: string | null;
};

function sampleRows(data: KidsChartRow[]): KidsChartRow[] {
  if (data.length <= 18) return data;
  const step = Math.max(1, Math.floor(data.length / 16));
  const out: KidsChartRow[] = [];
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

export function buildKidsReportHtml(input: KidsReportInput): string {
  const rows = sampleRows(input.chartData);

  const scheduleRows =
    input.showAdvancedContributions && input.contributionSchedule.length > 0
      ? input.contributionSchedule
          .map(
            (e) =>
              `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${e.age}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${e.amount.toLocaleString()}</td></tr>`
          )
          .join('')
      : '';

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
  <title>Kids Wealth Blueprint — Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #fff; line-height: 1.45; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 28px 32px 40px; }
    .hero { background: linear-gradient(135deg, #c026d3 0%, #9333ea 50%, #4f46e5 100%); color: #fff; padding: 22px 26px; border-radius: 12px; margin-bottom: 22px; }
    .hero h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .hero p { margin: 0; opacity: 0.95; font-size: 13px; }
    .badge { display: inline-block; margin-top: 8px; font-size: 11px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px; margin-bottom: 16px; background: #fafafa; break-inside: avoid; page-break-inside: avoid; }
    .card h2 { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #4b5563; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 14px; }
    .grid div { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .grid strong { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .highlight { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
    .stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .stat .n { font-size: 20px; font-weight: 800; color: #a21caf; }
    .stat .l { font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; break-inside: auto; page-break-inside: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
    th { text-align: left; padding: 8px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
    th.r, td.r { text-align: right; }
    .disclaimer { font-size: 11px; color: #6b7280; line-height: 1.5; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; break-inside: avoid; page-break-inside: avoid; }
    .chart-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; background: #fafafa; break-inside: avoid; page-break-inside: avoid; }
    .chart-card h2 { margin: 0 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #4b5563; }
    .chart-figure { margin: 0; width: 100%; text-align: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; box-sizing: border-box; }
    .chart-figure img { display: block; margin: 0 auto; max-width: 100%; width: auto; height: auto; max-height: 340px; object-fit: contain; }
    .chart-note { font-size: 11px; color: #6b7280; margin: 10px 0 0; text-align: center; line-height: 1.4; }
    @page { size: A4; margin: 14mm; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .wrap { padding: 0; max-width: none; }
      .hero, .highlight, .card, .chart-card, .disclaimer, .stat { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>Kids Wealth Blueprint</h1>
      <p>Learning report · ${esc(input.generatedAt)}</p>
      <span class="badge">For ages ~8–15 · educational illustration</span>
    </div>

    <div class="highlight">
      <div class="stat"><div class="n">$${input.finalAmount.toLocaleString()}</div><div class="l">Total at age ${input.targetAge}</div></div>
      <div class="stat"><div class="n">$${input.totalContributed.toLocaleString()}</div><div class="l">Total added</div></div>
      <div class="stat"><div class="n">$${input.totalGrowth.toLocaleString()}</div><div class="l">Example growth</div></div>
    </div>

    <div class="chart-card">
      <h2>Growth chart</h2>
      ${
        input.chartImageDataUrl
          ? `<figure class="chart-figure"><img src="${input.chartImageDataUrl}" alt="Example growth chart: total value and amount added by age"/></figure>
      <p class="chart-note">Snapshot from your calculator (blue = total, green = amount added). Sized to fit one page clearly.</p>`
          : `<p class="chart-note">Chart snapshot was not available. Use the on-screen graph for the full visual.</p>`
      }
    </div>

    <div class="card">
      <h2>What we assumed</h2>
      <div class="grid">
        <div><strong>Your age (start)</strong>${input.startAge}</div>
        <div><strong>Future-you age</strong>${input.targetAge}</div>
        <div><strong>Starting stash</strong>$${input.initialInvestment.toLocaleString()}</div>
        <div><strong>Return (p.a.)</strong>${input.annualReturn}%</div>
        <div><strong>Each month</strong>$${input.monthlyAmount.toLocaleString()}</div>
      </div>
    </div>

    ${
      scheduleRows
        ? `<div class="card"><h2>Different amounts by age (optional)</h2>
    <table><thead><tr><th>Age</th><th class="r">$/month</th></tr></thead><tbody>${scheduleRows}</tbody></table></div>`
        : ''
    }

    <div class="card">
      <h2>Graph numbers (sampled)</h2>
      <table>
        <thead><tr><th>Age</th><th class="r">Total</th><th class="r">Contributed</th><th class="r">Growth</th></tr></thead>
        <tbody>${projectionRows}</tbody>
      </table>
    </div>

    <p class="disclaimer">
      <strong>Note for grown-ups:</strong> This is a teaching tool only — not financial advice. Real markets, fees, and taxes
      change outcomes. For decisions about real money, consider a licensed professional.
    </p>
  </div>
</body>
</html>`;
}
