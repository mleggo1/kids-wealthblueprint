import React from 'react';
import { buildFamilyReportHtml, type FamilyReportInput } from './familyReportHtml';
import { buildKidsReportHtml, type KidsReportInput } from './kidsReportHtml';
import { openReportPrintWindow, exportReportToPdf, downloadReportHtml } from './openReportWindow';

function nowLabel(): string {
  return new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
}

type FamilyProps = Omit<FamilyReportInput, 'generatedAt'>;

export const FamilyWealthReportExport: React.FC<FamilyProps> = (props) => {
  const build = () => {
    try {
      return buildFamilyReportHtml({
        ...props,
        generatedAt: nowLabel(),
      });
    } catch (error) {
      console.error('Failed to build family report HTML', error);
      window.alert('Sorry, report generation failed. Please try again.');
      throw error;
    }
  };

  return (
    <div className="relative z-20 mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pointer-events-auto">
      <button
        type="button"
        onClick={() => exportReportToPdf(build(), 'Family Wealth Blueprint Report')}
        className="group w-full sm:w-auto min-w-[200px] rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/35 ring-2 ring-white/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-xl" aria-hidden>📥</span>
          Export to PDF
        </span>
        <span className="mt-0.5 block text-center text-[11px] font-semibold opacity-90 normal-case">
          Optimized A4 formatting with safe page breaks
        </span>
      </button>
      <button
        type="button"
        onClick={() => openReportPrintWindow(build(), 'Family Wealth Blueprint Report')}
        className="group w-full sm:w-auto min-w-[200px] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-500/35 ring-2 ring-white/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-xl" aria-hidden>🖨️</span>
          Print report
        </span>
        <span className="mt-0.5 block text-center text-[11px] font-semibold opacity-90 normal-case">
          Print-friendly layout
        </span>
      </button>
      <button
        type="button"
        onClick={() =>
          downloadReportHtml(build(), `family-wealth-blueprint-report-${new Date().toISOString().slice(0, 10)}.html`)
        }
        className="w-full sm:w-auto min-w-[200px] rounded-xl border-2 border-indigo-300 bg-white px-6 py-3.5 text-base font-bold text-indigo-800 shadow-md transition-all hover:bg-indigo-50 hover:border-indigo-400 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-xl" aria-hidden>📄</span>
          Download HTML report
        </span>
        <span className="mt-0.5 block text-center text-[11px] font-semibold text-indigo-600/90 normal-case">
          Open in browser, then print or attach to email
        </span>
      </button>
    </div>
  );
};

type KidsProps = Omit<KidsReportInput, 'generatedAt'>;

export const KidsWealthReportExport: React.FC<KidsProps> = (props) => {
  const build = () => {
    try {
      return buildKidsReportHtml({
        ...props,
        generatedAt: nowLabel(),
      });
    } catch (error) {
      console.error('Failed to build kids report HTML', error);
      window.alert('Sorry, report generation failed. Please try again.');
      throw error;
    }
  };

  return (
    <div className="relative z-20 mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pointer-events-auto">
      <button
        type="button"
        onClick={() => exportReportToPdf(build(), 'Kids Wealth Blueprint Report')}
        className="group w-full sm:w-auto min-w-[200px] rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/35 ring-2 ring-white/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-xl" aria-hidden>📥</span>
          Export to PDF
        </span>
        <span className="mt-0.5 block text-center text-[11px] font-semibold opacity-90 normal-case">
          Optimized A4 formatting with safe page breaks
        </span>
      </button>
      <button
        type="button"
        onClick={() => openReportPrintWindow(build(), 'Kids Wealth Blueprint Report')}
        className="group w-full sm:w-auto min-w-[200px] rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-fuchsia-500/35 ring-2 ring-white/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-fuchsia-500/40 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-xl" aria-hidden>🖨️</span>
          Print report
        </span>
        <span className="mt-0.5 block text-center text-[11px] font-semibold opacity-90 normal-case">
          Great for showing a parent or teacher
        </span>
      </button>
      <button
        type="button"
        onClick={() =>
          downloadReportHtml(build(), `kids-wealth-blueprint-report-${new Date().toISOString().slice(0, 10)}.html`)
        }
        className="w-full sm:w-auto min-w-[200px] rounded-xl border-2 border-fuchsia-300 bg-white px-6 py-3.5 text-base font-bold text-fuchsia-900 shadow-md transition-all hover:bg-fuchsia-50 hover:border-fuchsia-400 active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="text-xl" aria-hidden>📄</span>
          Download HTML report
        </span>
      </button>
    </div>
  );
};
