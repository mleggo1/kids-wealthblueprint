import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { buildKidsReportHtml } from './wealthReport/kidsReportHtml';
import { captureElementAsPngDataUrl } from './wealthReport/captureChartForPdf';
import { exportReportToPdf } from './wealthReport/openReportWindow';

/** Tweens & early teens — slider defaults; text field can go slightly outside for demos. */
const KID_AGE_MIN = 8;
const KID_AGE_MAX = 15;
const KID_TARGET_AGE_MAX = 40;

// Simple icon components (can be replaced with actual SVGs later)
const Icon = ({ emoji, className = '' }: { emoji: string; className?: string }) => (
  <span className={`text-4xl ${className}`}>{emoji}</span>
);

// Compounding calculator with optional age-based contribution schedule
const calculateCompound = (
  startAge: number,
  monthlyAmount: number,
  years: number,
  annualReturn: number,
  initialInvestment: number = 0,
  contributionSchedule?: Array<{ age: number; amount: number }>
): Array<{ age: number; total: number; contributed: number; growth: number }> => {
  const data = [];
  let balance = initialInvestment;
  let totalContributed = initialInvestment;
  const monthlyReturn = annualReturn / 100 / 12;
  const totalMonths = years * 12;

  // Helper to get monthly amount at a specific age
  const getMonthlyAmountAtAge = (age: number): number => {
    if (!contributionSchedule || contributionSchedule.length === 0) {
      return monthlyAmount;
    }
    // Sort schedule by age and find the most recent applicable amount
    const sorted = [...contributionSchedule].sort((a, b) => b.age - a.age);
    for (const entry of sorted) {
      if (age >= entry.age) {
        return entry.amount;
      }
    }
    return monthlyAmount; // Default to base amount
  };

  for (let month = 0; month <= totalMonths; month++) {
    const currentAge = startAge + month / 12;
    const currentMonthlyAmount = getMonthlyAmountAtAge(currentAge);
    
    if (month > 0) {
      balance = balance * (1 + monthlyReturn) + currentMonthlyAmount;
      totalContributed += currentMonthlyAmount;
    }
    const growth = balance - totalContributed;

    if (month % 12 === 0) {
      data.push({
        age: currentAge,
        total: Math.round(balance),
        contributed: Math.round(totalContributed),
        growth: Math.round(growth),
      });
    }
  }
  return data;
};

type KidsWealthBlueprintProps = {
  pdfExportRef: React.MutableRefObject<(() => Promise<void>) | null>;
};

const KidsWealthBlueprint: React.FC<KidsWealthBlueprintProps> = ({ pdfExportRef }) => {
  const chartForPdfRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Interactive chart state
  const [startAge, setStartAge] = useState(11);
  const [initialInvestment, setInitialInvestment] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(50);
  const [annualReturn, setAnnualReturn] = useState(8.0);
  const [targetAge, setTargetAge] = useState(22);

  const startAgeSliderMax = Math.min(KID_AGE_MAX, Math.max(KID_AGE_MIN, targetAge - 1));
  useEffect(() => {
    const max = Math.min(KID_AGE_MAX, Math.max(KID_AGE_MIN, targetAge - 1));
    setStartAge((a) => Math.max(KID_AGE_MIN, Math.min(max, a)));
  }, [targetAge]);
  const [monthlyInputFocused, setMonthlyInputFocused] = useState(false);
  const [initialInvestmentFocused, setInitialInvestmentFocused] = useState(false);
  
  // Advanced contribution schedule (collapsible)
  const [showAdvancedContributions, setShowAdvancedContributions] = useState(false);
  const [contributionSchedule, setContributionSchedule] = useState<Array<{ age: number; amount: number }>>([]);
  const [focusedContributionIndex, setFocusedContributionIndex] = useState<number | null>(null);
  
  // Educational section (collapsible)
  const [showEducationalSection, setShowEducationalSection] = useState(false);
  
  // Why This Matters section (collapsible)
  const [showWhyThisMatters, setShowWhyThisMatters] = useState(false);
  
  // Reset contribution schedule when opening the advanced section
  const handleToggleAdvancedContributions = () => {
    if (!showAdvancedContributions) {
      // Opening - reset to empty
      setContributionSchedule([]);
      setFocusedContributionIndex(null);
    }
    setShowAdvancedContributions(!showAdvancedContributions);
  };

  // Calculate chart data
  const chartData = useMemo(() => {
    const years = Math.max(1, targetAge - startAge);
    // Use contribution schedule only if advanced section is open and has entries
    const schedule = showAdvancedContributions && contributionSchedule.length > 0 
      ? contributionSchedule 
      : undefined;
    return calculateCompound(startAge, monthlyAmount, years, annualReturn, initialInvestment, schedule);
  }, [startAge, monthlyAmount, annualReturn, targetAge, initialInvestment, showAdvancedContributions, contributionSchedule]);

  const finalAmount = chartData[chartData.length - 1]?.total || 0;
  const totalContributed = chartData[chartData.length - 1]?.contributed || 0;
  const totalGrowth = chartData[chartData.length - 1]?.growth || 0;

  const runPdfExport = useCallback(async () => {
    try {
      const chartImageDataUrl = await captureElementAsPngDataUrl(chartForPdfRef.current);
      const generatedAt = new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
      const html = buildKidsReportHtml({
        generatedAt,
        startAge,
        targetAge,
        initialInvestment,
        monthlyAmount,
        annualReturn,
        finalAmount,
        totalContributed,
        totalGrowth,
        chartData,
        showAdvancedContributions,
        contributionSchedule,
        chartImageDataUrl,
      });
      await exportReportToPdf(html, `kids-wealth-blueprint-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error(error);
      window.alert('Could not create the PDF. Please try again.');
    }
  }, [
    startAge,
    targetAge,
    initialInvestment,
    monthlyAmount,
    annualReturn,
    finalAmount,
    totalContributed,
    totalGrowth,
    chartData,
    showAdvancedContributions,
    contributionSchedule,
  ]);

  useEffect(() => {
    pdfExportRef.current = runPdfExport;
    return () => {
      pdfExportRef.current = null;
    };
  }, [pdfExportRef, runPdfExport]);

  // Calculate max value for Y-axis - find true max across all series, then snap to first nice step above
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100000; // Default if no data
    
    // Find the true maximum across all series (Total Value and Amount Invested)
    const max = Math.max(...chartData.map(d => Math.max(d.total, d.contributed)));
    
    if (max === 0) return 100000;
    
    // Choose a "nice" step size based on magnitude
    let step: number;
    
    if (max >= 1000000) {
      // For millions, use 100k, 200k, 500k, or 1M steps
      if (max < 2000000) step = 200000;      // 0.2M steps
      else if (max < 5000000) step = 500000;  // 0.5M steps
      else if (max < 10000000) step = 1000000; // 1M steps
      else if (max < 20000000) step = 2000000; // 2M steps
      else if (max < 50000000) step = 5000000; // 5M steps
      else step = 10000000;                     // 10M steps
    } else if (max >= 100000) {
      // For hundreds of thousands, use 10k or 20k steps
      step = 10000; // Default to 10k
      const numTicksWith10k = Math.ceil(max / 10000);
      if (numTicksWith10k > 12) {
        step = 20000; // Use 20k if too many ticks
      }
    } else if (max >= 10000) {
      // For tens of thousands, use 2k, 5k, or 10k steps
      if (max < 20000) step = 2000;
      else if (max < 50000) step = 5000;
      else step = 10000;
    } else if (max >= 1000) {
      // For thousands, use 500, 1k, or 2k steps
      if (max < 2000) step = 500;
      else if (max < 5000) step = 1000;
      else step = 2000;
    } else if (max >= 100) {
      // For hundreds, use 50, 100, or 200 steps
      if (max < 200) step = 50;
      else if (max < 500) step = 100;
      else step = 200;
    } else {
      // For smaller values, use 10, 20, or 50 steps
      if (max < 20) step = 10;
      else if (max < 50) step = 20;
      else step = 50;
    }
    
    // Snap to first step ABOVE max value (no padding factor)
    const yMax = Math.ceil(max / step) * step;
    
    return yMax;
  }, [chartData]);

  // Calculate Y-axis ticks using the same step size logic as maxValue
  const yAxisTicks = useMemo(() => {
    if (maxValue === 0) return [0, 100000];
    
    // Determine step size based on maxValue (same logic as maxValue calculation)
    let step: number;
    
    if (maxValue >= 1000000) {
      if (maxValue < 2000000) step = 200000;
      else if (maxValue < 5000000) step = 500000;
      else if (maxValue < 10000000) step = 1000000;
      else if (maxValue < 20000000) step = 2000000;
      else if (maxValue < 50000000) step = 5000000;
      else step = 10000000;
    } else if (maxValue >= 100000) {
      step = 10000;
      const numTicks = Math.ceil(maxValue / 10000);
      if (numTicks > 12) {
        step = 20000;
      }
    } else if (maxValue >= 10000) {
      if (maxValue < 20000) step = 2000;
      else if (maxValue < 50000) step = 5000;
      else step = 10000;
    } else if (maxValue >= 1000) {
      if (maxValue < 2000) step = 500;
      else if (maxValue < 5000) step = 1000;
      else step = 2000;
    } else if (maxValue >= 100) {
      if (maxValue < 200) step = 50;
      else if (maxValue < 500) step = 100;
      else step = 200;
    } else {
      if (maxValue < 20) step = 10;
      else if (maxValue < 50) step = 20;
      else step = 50;
    }
    
    // Generate ticks from 0 to maxValue using the step
    const ticks = [0];
    let current = step;
    while (current <= maxValue) {
      ticks.push(current);
      current += step;
    }
    // Ensure maxValue is always included (it should be, but double-check)
    if (ticks[ticks.length - 1] !== maxValue) {
      ticks.push(maxValue);
    }
    return ticks;
  }, [maxValue]);

  return (
    <div className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 floating"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="relative z-10">
      {/* Hero Section — written for ages ~8–15 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 text-center">
        <div className="mb-4">
          <span className="inline-block rounded-full bg-fuchsia-100 text-fuchsia-800 text-xs sm:text-sm font-bold px-3 py-1 border border-fuchsia-200">
            For kids about 8–15 · grown-ups welcome too
          </span>
        </div>
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-2 leading-tight">
            <span className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Kids Wealth Blueprint
            </span>
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 mx-auto rounded-full"></div>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 max-w-2xl mx-auto">
          Level up your future money — starting right now
        </h2>
        <p className="text-base sm:text-lg text-gray-700 mb-2 max-w-2xl mx-auto leading-relaxed">
          Ever wonder how pocket money, birthday cash, or a small amount saved each month could grow over time?
          This page is your cheat code: play with the sliders, watch the graph, and see why <strong>starting early</strong> is a superpower.
        </p>
        <p className="text-sm text-gray-600 mb-6 max-w-xl mx-auto">
          Big-money accounts need a trusted adult — but <em>you</em> can still learn how it all works.
        </p>
        <a
          href="#watch-money-grow"
          className="inline-block bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-3 px-8 rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 ripple-effect"
        >
          See the money grow
        </a>
      </section>

      {/* Why This Matters */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 card-interactive">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xl font-bold text-gray-900">Why this is cool (for you)</h2>
            <button
              onClick={() => setShowWhyThisMatters(!showWhyThisMatters)}
              className="flex-shrink-0 text-gray-700 hover:text-gray-800 font-medium text-sm px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
              aria-label={showWhyThisMatters ? "Hide section" : "Show section"}
            >
              <span>{showWhyThisMatters ? "Hide" : "Show"}</span>
              <span className={`transform transition-transform duration-200 ${showWhyThisMatters ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>
          
          {showWhyThisMatters && (
            <div className="max-w-4xl mx-auto space-y-3 text-base text-gray-700 leading-relaxed animate-in slide-in-from-top-2 duration-200">
              <p>
                Most grown-ups say they wish someone had shown them this stuff earlier. You&apos;re getting a head start: 
                how saving a little, often, can team up with time to do something amazing.
              </p>

              <p className="text-lg font-semibold text-gray-900">
                You don&apos;t need to be a math genius — just curious.
              </p>

              <p>
                The big idea is simple. No picking &quot;hot&quot; stocks on your phone. Instead, think:
              </p>

              <ul className="space-y-1 list-disc list-inside ml-4 text-base">
                <li><strong>Start early</strong> — even small amounts count</li>
                <li><strong>Keep going</strong> — like leveling up a character, but with dollars</li>
                <li><strong>Let time work</strong> — that&apos;s compounding (the chart shows it)</li>
              </ul>

              <p>
                Learning this now means money feels less scary later — whether you&apos;re saving for a console, 
                a trip, study, or something way down the road. It&apos;s about <em>options</em>, not stress.
              </p>

              <div className="bg-fuchsia-50 rounded-xl p-3 border-l-4 border-fuchsia-600 mt-2">
                <p className="text-lg font-semibold text-gray-900 mb-0.5">For the adults in the room</p>
                <p className="text-base text-gray-800">
                  Use this page together: you handle accounts and products; they build confidence and habits. Everyone wins.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Compounding Chart */}
      <section id="watch-money-grow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-fuchsia-50/90 via-purple-50/90 to-indigo-50/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-fuchsia-100 card-interactive">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
            🚀 Watch your money grow (like a game graph)
          </h2>
          <p className="text-center text-gray-700 mb-4 sm:mb-6 text-base sm:text-lg font-medium max-w-2xl mx-auto">
            Move the sliders — the lines show what <em>could</em> happen over time. It&apos;s a learning toy, not a promise of real life (markets bounce around!).
          </p>

          {/* Interactive Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 items-start">
            {/* Current Age Card - First */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-purple-200 card-interactive ripple-effect flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-1 min-h-[2.5rem]">
                🎂 How old are you?
              </label>
              <p className="text-xs text-gray-500 mb-2">Slider: about {KID_AGE_MIN}–{KID_AGE_MAX} (you can type other ages too)</p>
              <input
                type="range"
                min={KID_AGE_MIN}
                max={startAgeSliderMax}
                step="1"
                value={startAge}
                onChange={(e) => {
                  const age = Number(e.target.value);
                  const clampedAge = Math.max(KID_AGE_MIN, Math.min(startAgeSliderMax, age));
                  setStartAge(clampedAge);
                  if (clampedAge >= targetAge) {
                    setTargetAge(clampedAge + 1);
                  }
                }}
                className="w-full h-4 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600 mb-3 transition-all duration-300 hover:accent-purple-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0 w-4"></span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={startAge}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue === '') {
                      setStartAge(KID_AGE_MIN);
                    } else {
                      const age = Number(numericValue);
                      if (!isNaN(age) && age >= 0 && age <= 120) {
                        const maxAge = Math.max(KID_AGE_MIN, targetAge - 1);
                        const clampedAge = Math.min(age, maxAge);
                        setStartAge(clampedAge);
                        if (clampedAge >= targetAge) {
                          setTargetAge(Math.min(KID_TARGET_AGE_MAX, clampedAge + 1));
                        }
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const raw = Number(e.target.value) || KID_AGE_MIN;
                    const maxAge = Math.max(KID_AGE_MIN, Math.min(KID_AGE_MAX, targetAge - 1));
                    const clampedAge = Math.max(KID_AGE_MIN, Math.min(maxAge, raw));
                    setStartAge(clampedAge);
                    if (clampedAge >= targetAge) {
                      setTargetAge(Math.min(KID_TARGET_AGE_MAX, clampedAge + 1));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-purple-600 text-center border-2 border-purple-300 rounded-lg py-2 px-2 h-12 focus:outline-none focus:ring-2 focus:ring-purple-500 input-interactive"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">yrs</span>
              </div>
            </div>

            {/* Initial Investment Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-teal-200 card-interactive ripple-effect flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-1 min-h-[2.5rem]">
                🎁 Starting stash
              </label>
              <p className="text-xs text-gray-500 mb-2">Money you&apos;re imagining you already have (example only)</p>
              <input
                type="range"
                min="0"
                max="100000"
                step="500"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                className="w-full h-4 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-3 transition-all duration-300 hover:accent-teal-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0">$</span>
                <input
                  type="text"
                  value={initialInvestmentFocused ? initialInvestment.toString() : initialInvestment.toLocaleString()}
                  onChange={(e) => {
                    // Remove all non-numeric characters
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue === '') {
                      setInitialInvestment(0);
                    } else {
                      const num = Number(numericValue);
                      if (!isNaN(num) && num >= 0) {
                        setInitialInvestment(num);
                      }
                    }
                  }}
                  onFocus={() => setInitialInvestmentFocused(true)}
                  onBlur={() => {
                    setInitialInvestmentFocused(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                      setInitialInvestmentFocused(false);
                    }
                  }}
                  className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-teal-600 text-center border-2 border-teal-300 rounded-lg py-2 px-2 h-12 focus:outline-none focus:ring-2 focus:ring-teal-500 input-interactive"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>$0</span>
                <span>$100k</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-blue-200 overflow-hidden card-interactive ripple-effect flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-1 min-h-[2.5rem]">
                💵 Money added each month
              </label>
              <p className="text-xs text-gray-500 mb-2">Saved or invested with a grown-up&apos;s help — try small amounts too</p>
              <input
                type="range"
                min="5"
                max="5000"
                step="5"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                className="w-full h-4 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-3 transition-all duration-300 hover:accent-blue-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0">$</span>
                <input
                  type="text"
                  value={monthlyInputFocused ? monthlyAmount.toString() : monthlyAmount.toLocaleString()}
                  onChange={(e) => {
                    // Remove all non-numeric characters
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue === '') {
                      setMonthlyAmount(0);
                    } else {
                      const num = Number(numericValue);
                      if (!isNaN(num) && num >= 0) {
                        setMonthlyAmount(num);
                      }
                    }
                  }}
                  onFocus={() => setMonthlyInputFocused(true)}
                  onBlur={() => {
                    setMonthlyInputFocused(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                      setMonthlyInputFocused(false);
                    }
                  }}
                  className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-blue-600 text-center border-2 border-blue-300 rounded-lg py-2 px-2 h-12 focus:outline-none focus:ring-2 focus:ring-blue-500 input-interactive"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>$5</span>
                <span>$5,000</span>
              </div>
              
              {/* Collapsible Advanced Contribution Schedule */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={handleToggleAdvancedContributions}
                  className="w-full flex items-center justify-between text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Change the monthly amount at different ages?</span>
                  </span>
                  <span className={`transform transition-transform duration-200 ${showAdvancedContributions ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showAdvancedContributions && (
                  <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-gray-600 mb-3">
                      <strong>Optional:</strong> Pretend the monthly amount changes as you get older — e.g. a little now, more when you&apos;re working. Just for learning how the curve moves.
                    </p>
                    {contributionSchedule.map((entry, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3 relative">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-700 font-medium mb-1">
                              At age:
                            </label>
                            <input
                              type="text"
                              tabIndex={index * 2 + 1}
                              value={entry.age}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                if (numericValue === '') {
                                  const updated = [...contributionSchedule];
                                  updated[index] = { ...updated[index], age: Math.max(KID_AGE_MIN, startAge) };
                                  setContributionSchedule(updated);
                                } else {
                                  const age = Number(numericValue);
                                  if (!isNaN(age)) {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], age: age };
                                    setContributionSchedule(updated);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // Calculate min age: startAge for first entry, previous entry's age for others
                                const minAge = index === 0 
                                  ? startAge 
                                  : Math.max(startAge, contributionSchedule[index - 1].age);
                                
                                // Calculate max age: next entry's age (if exists), or targetAge
                                const maxAge = index < contributionSchedule.length - 1
                                  ? contributionSchedule[index + 1].age
                                  : targetAge;
                                
                                const newAge = Math.max(minAge, Math.min(maxAge, Number(e.target.value) || minAge));
                                const updated = [...contributionSchedule];
                                updated[index] = { ...updated[index], age: newAge };
                                setContributionSchedule(updated);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                  // Move to amount input of same entry
                                  const nextInput = document.querySelector(
                                    `input[tabindex="${index * 2 + 2}"]`
                                  ) as HTMLInputElement;
                                  if (nextInput) {
                                    setTimeout(() => nextInput.focus(), 0);
                                  }
                                }
                              }}
                              className="w-full text-sm font-bold text-blue-600 text-center border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 font-medium mb-1">
                              Amount: $
                            </label>
                            <input
                              type="text"
                              tabIndex={index * 2 + 2}
                              value={focusedContributionIndex === index 
                                ? entry.amount.toString() 
                                : (entry.amount >= 1000 ? entry.amount.toLocaleString() : entry.amount.toString())
                              }
                              onChange={(e) => {
                                // Remove all non-numeric characters
                                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                if (numericValue === '') {
                                  const updated = [...contributionSchedule];
                                  updated[index] = { ...updated[index], amount: 0 };
                                  setContributionSchedule(updated);
                                } else {
                                  const num = Number(numericValue);
                                  if (!isNaN(num) && num >= 0) {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], amount: num };
                                    setContributionSchedule(updated);
                                  }
                                }
                              }}
                              onBlur={() => {
                                // Clamp to valid range on blur (minimum 0, no maximum)
                                const newAmount = Math.max(0, entry.amount);
                                if (newAmount !== entry.amount) {
                                  const updated = [...contributionSchedule];
                                  updated[index] = { ...updated[index], amount: newAmount };
                                  setContributionSchedule(updated);
                                }
                                setFocusedContributionIndex(null);
                              }}
                              onFocus={() => {
                                setFocusedContributionIndex(index);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                  // Move to next field: age input of next entry, or stay if last entry
                                  if (index < contributionSchedule.length - 1) {
                                    const nextInput = document.querySelector(
                                      `input[tabindex="${(index + 1) * 2 + 1}"]`
                                    ) as HTMLInputElement;
                                    if (nextInput) {
                                      setTimeout(() => nextInput.focus(), 0);
                                    }
                                  }
                                }
                              }}
                              className="w-full text-base font-bold text-blue-600 text-center border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        {contributionSchedule.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = contributionSchedule.filter((_, i) => i !== index);
                              setContributionSchedule(updated);
                            }}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const lastAge = contributionSchedule.length > 0 
                          ? Math.max(...contributionSchedule.map(e => e.age)) + 1
                          : startAge + 1;
                        setContributionSchedule([
                          ...contributionSchedule,
                          { age: Math.min(lastAge, targetAge), amount: monthlyAmount }
                        ]);
                      }}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      + Add Another Age
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-green-200 card-interactive ripple-effect relative flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4 min-h-[3rem]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>📈 Return</span>
                  <span className="text-yellow-500 text-xl sm:text-2xl animate-pulse" id="return-star" title="Learn about investing below!">⭐</span>
                  <span className="text-green-600 text-base sm:text-lg animate-bounce">↓</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-gray-800">(% per year)</div>
                <p className="text-xs sm:text-sm text-green-700 font-medium mt-1 italic">Higher % = faster growth in this pretend example. Learn more below ↓</p>
              </label>
              <input
                type="range"
                min="5"
                max="20"
                step="0.5"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                className="w-full h-4 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600 mb-3 transition-all duration-300 hover:accent-green-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0 w-4"></span>
                <input
                  type="text"
                  value={annualReturn}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
                    if (numericValue === '') {
                      setAnnualReturn(5);
                    } else {
                      const num = Number(numericValue);
                      if (!isNaN(num)) {
                        setAnnualReturn(num);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const num = Math.max(5, Math.min(20, Number(e.target.value) || 5));
                    setAnnualReturn(num);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-green-600 text-center border-2 border-green-300 rounded-lg py-2 px-2 h-12 focus:outline-none focus:ring-2 focus:ring-green-500 input-interactive"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">%</span>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>5%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-200 card-interactive ripple-effect flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-1 min-h-[2.5rem]">
                🎯 Future-you age
              </label>
              <p className="text-xs text-gray-500 mb-2">How old when you check the result? (e.g. finishing school)</p>
              <input
                type="range"
                min={startAge + 1}
                max={KID_TARGET_AGE_MAX}
                step="1"
                value={targetAge}
                onChange={(e) => {
                  const age = Number(e.target.value);
                  const minAge = startAge + 1;
                  setTargetAge(Math.max(minAge, Math.min(KID_TARGET_AGE_MAX, age)));
                }}
                className="w-full h-4 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 mb-3 transition-all duration-300 hover:accent-orange-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0 w-4"></span>
                <input
                  type="text"
                  value={targetAge}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue === '') {
                      setTargetAge(startAge + 1);
                    } else {
                      const age = Number(numericValue);
                      if (!isNaN(age) && age > startAge) {
                        setTargetAge(Math.min(KID_TARGET_AGE_MAX, age));
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const age = Number(e.target.value) || (startAge + 1);
                    const minAge = startAge + 1;
                    const clampedAge = Math.max(minAge, Math.min(KID_TARGET_AGE_MAX, age));
                    setTargetAge(clampedAge);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-orange-600 text-center border-2 border-orange-300 rounded-lg py-2 px-2 h-12 focus:outline-none focus:ring-2 focus:ring-orange-500 input-interactive"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">years</span>
              </div>
            </div>
          </div>

          {/* Educational Callout: Building Wealth Through Investing */}
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mb-2 sm:mb-3 border-2 border-green-400 shadow-md relative overflow-hidden">
            {/* Decorative elements - smaller on mobile */}
            <div className="absolute top-1 right-1 text-3xl sm:text-4xl opacity-10">💰</div>
            <div className="absolute bottom-1 left-1 text-2xl sm:text-3xl opacity-10">📈</div>
            
            <div className="relative z-10">
              <div className="flex items-start gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <span className="text-xl sm:text-2xl flex-shrink-0">⭐</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                      💡 Investing 101 (kid-friendly)
                    </h3>
                    <button
                      onClick={() => setShowEducationalSection(!showEducationalSection)}
                      className="flex-shrink-0 text-green-700 hover:text-green-800 font-medium text-xs sm:text-sm px-2 py-0.5 rounded hover:bg-green-100 transition-colors flex items-center gap-1"
                      aria-label={showEducationalSection ? "Hide section" : "Show section"}
                    >
                      <span>{showEducationalSection ? "Hide" : "Show"}</span>
                      <span className={`transform transition-transform duration-200 ${showEducationalSection ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                  </div>
                  
                  {showEducationalSection && (
                    <div className="animate-in slide-in-from-top-2 duration-200 space-y-1.5 sm:space-y-2">
                  
                  {/* What is Investing - ages ~8–15 */}
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-1.5 sm:p-2 mb-1 sm:mb-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5">🤔 What is investing?</h4>
                    <p className="text-xs text-gray-700 leading-snug mb-1">
                      <strong>Investing</strong> means letting your money work while you sleep — kind of like XP that earns more XP. 
                      People often buy tiny slices of lots of companies at once (through something called a fund) instead of betting on one company like a video game skin gamble.
                    </p>
                    <p className="text-xs text-gray-700 leading-snug">
                      <strong>Example:</strong> $100 in a piggy bank is still $100 next year. In this <em>educational</em> chart, if money grew {annualReturn}% in a year, 
                      that $100 would be more like <strong className="text-green-700">${Math.round(100 * (1 + annualReturn / 100))}</strong> — the extra is growth, not magic (real life bounces up and down).
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-700 leading-snug mb-1">
                    The <strong className="text-green-700">Return %</strong> slider is pretend growth per year so you can see how the lines move. Real markets are messier!
                  </p>
                  
                  <div className="bg-white/80 rounded-lg p-1.5 sm:p-2 border border-green-300 mb-1 sm:mb-1.5">
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <span className="text-lg flex-shrink-0">🐷</span>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-xs">Just Saving (Piggy Bank):</p>
                          <p className="text-xs text-gray-700">
                            Your ${(monthlyAmount * 12).toLocaleString()}/year stays ${(monthlyAmount * 12).toLocaleString()}. No growth. 😴
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-1.5">
                        <span className="text-lg flex-shrink-0">🚀</span>
                        <div className="min-w-0">
                          <p className="font-bold text-green-700 text-xs">Same numbers, but invested (this chart&apos;s rules):</p>
                          {(() => {
                            const yearlyInvestment = monthlyAmount * 12;
                            const afterOneYear = yearlyInvestment * (1 + annualReturn / 100);
                            const growth = yearlyInvestment * annualReturn / 100;
                            
                            const data20Years = calculateCompound(0, monthlyAmount, 20, annualReturn, 0);
                            const after20Years = data20Years[data20Years.length - 1]?.total || 0;
                            
                            const data30Years = calculateCompound(0, monthlyAmount, 30, annualReturn, 0);
                            const after30Years = data30Years[data30Years.length - 1]?.total || 0;
                            
                            return (
                              <>
                                <p className="text-xs text-gray-700 mb-1">
                                  In this <strong>made-up math world</strong>, <strong>${yearlyInvestment.toLocaleString()}</strong> a year (${monthlyAmount.toLocaleString()}/mo × 12) at {annualReturn}% becomes about{' '}
                                  <strong className="text-green-700">${Math.round(afterOneYear).toLocaleString()}</strong> after a year — extra{' '}
                                  <strong className="text-green-700">${Math.round(growth).toLocaleString()}</strong> on top of what you put in. 🎉
                                </p>
                                <p className="text-xs text-gray-700">
                                  Keep the story going: about <strong className="text-green-700">${after20Years.toLocaleString()}</strong> after 20 years and{' '}
                                  <strong className="text-green-700">${after30Years.toLocaleString()}</strong> after 30 in this demo — not a real forecast! 🚀
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border-l-2 border-yellow-400 rounded-r p-1.5 sm:p-2">
                    <p className="text-xs text-gray-800 font-semibold">
                      💰 <strong>The cool part:</strong> growth can stack on top of growth — that&apos;s <strong className="text-green-700">compounding</strong>. 
                      Watch the blue line bend upward in the chart. In real life it won&apos;t be this smooth, but the idea is real: time + steady saving = powerful. ✨
                    </p>
                  </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div
            ref={chartForPdfRef}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-2 sm:p-3 shadow-lg mb-8 w-full card-interactive relative"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 400 : 550}>
              <LineChart 
                data={chartData} 
                margin={isMobile ? { top: 20, right: 15, left: 45, bottom: 30 } : { top: 38, right: 38, left: 38, bottom: 38 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#d1d5db" 
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="age"
                  type="number"
                  scale="linear"
                  domain={['dataMin', 'dataMax']}
                  stroke="#111827"
                  strokeWidth={isMobile ? 1.5 : 2}
                  tick={{ 
                    fontSize: isMobile ? 12 : 16, 
                    fill: '#111827',
                    fontWeight: 700
                  }}
                  tickMargin={isMobile ? 5 : 8}
                  allowDecimals={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  scale="linear"
                  domain={[0, maxValue]}
                  stroke="#111827"
                  strokeWidth={isMobile ? 1.5 : 2}
                  tick={{ 
                    fontSize: isMobile ? 11 : 16, 
                    fill: '#111827',
                    fontWeight: 700
                  }}
                  tickMargin={isMobile ? 5 : 8}
                  width={isMobile ? 45 : 60}
                  allowDecimals={false}
                  ticks={yAxisTicks}
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `$${(value / 1000000).toFixed(1)}M`;
                    } else if (value >= 1000) {
                      return `$${(value / 1000).toFixed(0)}k`;
                    }
                    return `$${value.toLocaleString()}`;
                  }}
                />
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #3b82f6', 
                    borderRadius: '8px',
                    padding: isMobile ? '8px' : '12px',
                    fontSize: isMobile ? '12px' : '16px',
                    fontWeight: 600,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{
                    fontWeight: 'bold',
                    fontSize: isMobile ? '12px' : '16px',
                    marginBottom: '4px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ 
                    paddingTop: isMobile ? '10px' : '20px',
                    fontSize: isMobile ? '12px' : '16px',
                    fontWeight: 700
                  }}
                  iconType="line"
                  iconSize={isMobile ? 15 : 20}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Value"
                  stroke="#2563eb"
                  strokeWidth={isMobile ? 3 : 5}
                  dot={false}
                  activeDot={{ r: isMobile ? 6 : 10, fill: '#2563eb', strokeWidth: 3, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="contributed"
                  name="Amount Invested"
                  stroke="#10b981"
                  strokeWidth={isMobile ? 3 : 5}
                  strokeDasharray="10 5"
                  dot={false}
                  activeDot={{ r: isMobile ? 6 : 10, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                />
                <ReferenceLine
                  x={targetAge}
                  stroke="#9333ea"
                  strokeWidth={isMobile ? 3 : 4}
                  strokeDasharray="10 5"
                  label={{ 
                    value: `Age ${targetAge}`, 
                    position: 'top',
                    offset: isMobile ? 5 : 10,
                    style: {
                      fontSize: isMobile ? '12px' : '16px',
                      fontWeight: 'bold',
                      fill: '#9333ea',
                      textAnchor: 'middle'
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Summary Stats - Positioned side by side in top middle white space */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Position horizontally in top center/middle area */}
              <div 
                className={`absolute pointer-events-auto flex flex-row gap-2 z-10 ${isMobile ? 'top-2' : 'top-3'} left-1/2 transform -translate-x-1/2`}
                style={{ 
                  maxWidth: isMobile ? '95%' : '90%'
                }}
              >
                <div 
                  className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl p-2 sm:p-2.5 shadow-2xl text-center text-white transform hover:scale-105 hover:shadow-3xl hover:z-20 transition-all duration-300 cursor-pointer border-2 border-white/40 hover:border-white/60 backdrop-blur-md flex-1"
                  title={`Total value at age ${targetAge}`}
                  style={{ boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)' }}
                >
                  <div className={`${isMobile ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-extrabold mb-0.5 leading-tight`}>
                    ${finalAmount >= 1000000 ? `${(finalAmount / 1000000).toFixed(1)}M` : finalAmount >= 1000 ? `${(finalAmount / 1000).toFixed(0)}k` : finalAmount.toLocaleString()}
                  </div>
                  <div className={`${isMobile ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} font-semibold opacity-95 leading-tight`}>Total at Age {targetAge}</div>
                </div>
                <div 
                  className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-xl p-2 sm:p-2.5 shadow-2xl text-center text-white transform hover:scale-105 hover:shadow-3xl hover:z-20 transition-all duration-300 cursor-pointer border-2 border-white/40 hover:border-white/60 backdrop-blur-md flex-1"
                  title="Total amount invested over time"
                  style={{ boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}
                >
                  <div className={`${isMobile ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-extrabold mb-0.5 leading-tight`}>
                    ${totalContributed >= 1000000 ? `${(totalContributed / 1000000).toFixed(1)}M` : totalContributed >= 1000 ? `${(totalContributed / 1000).toFixed(0)}k` : totalContributed.toLocaleString()}
                  </div>
                  <div className={`${isMobile ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} font-semibold opacity-95 leading-tight`}>Total Invested</div>
                </div>
                <div 
                  className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-xl p-2 sm:p-2.5 shadow-2xl text-center text-white transform hover:scale-105 hover:shadow-3xl hover:z-20 transition-all duration-300 cursor-pointer border-2 border-white/40 hover:border-white/60 backdrop-blur-md flex-1"
                  title="Growth from compounding interest"
                  style={{ boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4)' }}
                >
                  <div className={`${isMobile ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-extrabold mb-0.5 leading-tight`}>
                    ${totalGrowth >= 1000000 ? `${(totalGrowth / 1000000).toFixed(1)}M` : totalGrowth >= 1000 ? `${(totalGrowth / 1000).toFixed(0)}k` : totalGrowth.toLocaleString()}
                  </div>
                  <div className={`${isMobile ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} font-semibold opacity-95 leading-tight`}>Extra from growth</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 sm:p-6 text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">
              🎉 In this story, age <span className="text-purple-600">{startAge}</span> + <span className="text-blue-600">${monthlyAmount}/month</span>
            </p>
            <p className="text-base sm:text-xl text-gray-700">
              By age <span className="text-orange-600 font-bold">{targetAge}</span>, the graph shows about{' '}
              <span className="text-blue-600 font-bold text-2xl sm:text-3xl">${finalAmount.toLocaleString()}</span>
            </p>
            <p className="text-sm sm:text-lg text-gray-600 mt-3">
              About <strong>${totalGrowth.toLocaleString()}</strong> of that is growth in this example — not a real-world promise! 🚀
            </p>
          </div>

        </div>
      </section>

      {/* 7 ideas — for kids ~8–15 (grown-ups help with the real accounts) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
          7 power-ups for future-you
        </h2>
        <p className="text-center text-gray-600 max-w-2xl mx-auto mb-10 text-sm sm:text-base">
          Think of these as levels in a game. Some need a parent or carer — that&apos;s normal. The win is understanding, not rushing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-fuchsia-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="🏦" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 1</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Know what an investment account is
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              It&apos;s a special place grown-ups can open so money can be invested safely and tracked — not the same as a game wallet. Ask questions; you&apos;re allowed to be curious.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-fuchsia-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="📈" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 2</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Learn what &quot;index&quot; means
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Instead of one company, picture a whole basket of companies — like a team roster instead of one player. People study these in school and on YouTube; it&apos;s a common learning topic.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-fuchsia-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="💻" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 3</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Tech &amp; innovation — a small slice of the story
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Lots of gadgets and apps you use come from listed companies. Learning how &quot;the whole market&quot; moves is often more boring — and that can be a good thing for beginners.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-fuchsia-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="💰" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 4</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Dividends = little bonuses some investments pay
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Sometimes companies share profits with investors. Reinvesting those tiny amounts is one way compounding shows up in real life — ask a trusted adult to show you an example.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-fuchsia-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="🏃" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 5</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Boring beats FOMO
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Scrolling hype and &quot;get rich quick&quot; clips is loud. Slow and steady is how many people who actually finish the race describe it. Your chart above is the quiet version.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-fuchsia-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="⚙️" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 6</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Automate = set it and forget it
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              A regular small transfer beats remembering every month. Grown-ups can help set this up so you focus on school, sport, and whatever you&apos;re into.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-fuchsia-100 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="✨" />
            </div>
            <div className="text-2xl font-bold text-fuchsia-600 mb-2">Level 7</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              The curve gets wild later — that&apos;s the point
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Early years feel flat. Later, the same habits matter more because time stacked up. You&apos;re not &quot;behind&quot; at 12 or 14 — you&apos;re early to the idea.
            </p>
          </div>
        </div>
      </section>

      {/* Compounding Example Highlight Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl text-white">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 text-center">💰 Starting early is your cheat code</h2>
          <p className="text-base sm:text-lg md:text-2xl leading-relaxed text-center mb-4 sm:mb-6 md:mb-8 font-semibold">
            Same energy as grinding a save file — but for future money. 🚀
          </p>
          
          {/* Simple visual bars - stack on mobile, horizontal on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3 md:gap-6 mt-4 sm:mt-6 md:mt-8">
            <div className="text-center transform hover:scale-110 transition-transform">
              <div className="bg-white/20 rounded-xl p-4 sm:p-3 md:p-6 mb-2">
                <div className="text-3xl sm:text-2xl md:text-4xl font-bold">$0</div>
                <div className="text-sm sm:text-xs md:text-base opacity-90 mt-2">Start Here</div>
              </div>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform">
              <div className="bg-white/30 rounded-xl p-4 sm:p-3 md:p-6 mb-2">
                <div className="text-3xl sm:text-2xl md:text-4xl font-bold">$200/mo</div>
                <div className="text-sm sm:text-xs md:text-base opacity-90 mt-2">Keep Going</div>
              </div>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform">
              <div className="bg-white/40 rounded-xl p-4 sm:p-3 md:p-6 mb-2">
                <div className="text-3xl sm:text-2xl md:text-4xl font-bold">$1.2M+</div>
                <div className="text-sm sm:text-xs md:text-base opacity-90 mt-2">High score energy 🎉</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick recap */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Your recap (stick this on a mental sticker)
        </h2>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 sm:p-12 shadow-lg border border-fuchsia-100 card-interactive">
          <ul className="space-y-4 text-base sm:text-lg text-gray-700 max-w-2xl mx-auto">
            <li className="flex items-start">
              <span className="text-fuchsia-500 mr-3 text-2xl">✓</span>
              <span>Learn what an investment account is (grown-up helps with the real one)</span>
            </li>
            <li className="flex items-start">
              <span className="text-fuchsia-500 mr-3 text-2xl">✓</span>
              <span>&quot;Index&quot; = many companies in one bundle — teamwork for dollars</span>
            </li>
            <li className="flex items-start">
              <span className="text-fuchsia-500 mr-3 text-2xl">✓</span>
              <span>Small amounts + time = the graph bends up (in our learning example)</span>
            </li>
            <li className="flex items-start">
              <span className="text-fuchsia-500 mr-3 text-2xl">✓</span>
              <span>Boring and steady often beats loud hype</span>
            </li>
            <li className="flex items-start">
              <span className="text-fuchsia-500 mr-3 text-2xl">✓</span>
              <span>Automation = less willpower needed</span>
            </li>
            <li className="flex items-start">
              <span className="text-fuchsia-500 mr-3 text-2xl">✓</span>
              <span>You&apos;re not late — you&apos;re learning early</span>
            </li>
          </ul>
          <p className="text-center text-lg sm:text-xl text-gray-800 font-semibold mt-8 pt-8 border-t border-gray-200">
            Real life has fees, taxes, and bumpy markets — this page is here to teach ideas, not predict your exact future.
          </p>
        </div>
      </section>

      {/* Final Call-to-Action */}
      <section id="kids-cta" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 rounded-2xl p-8 sm:p-12 shadow-2xl text-white text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Grown-ups: want help explaining this IRL?
          </h2>
          <p className="text-base sm:text-xl leading-relaxed mb-8 max-w-2xl mx-auto opacity-95">
            Kids can explore here for free. If you&apos;d like a calm, step-by-step walkthrough for your family — 
            no jargon, no pressure — we can book a chat.
          </p>
          <a
            href="https://wealthbydesign.vercel.app/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-fuchsia-700 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Book a family chat
          </a>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <p className="text-sm text-gray-500 text-center leading-relaxed">
          <strong>Disclaimer:</strong> The ideas on this page are for general educational purposes only and 
          are not personal financial advice. Do your own research and consider speaking with a licensed 
          professional before making investment decisions for yourself or your children.
        </p>
      </section>
      </div>
    </div>
  );
};

export default KidsWealthBlueprint;

