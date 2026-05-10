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
import { buildFamilyReportHtml } from './wealthReport/familyReportHtml';
import { captureElementAsPngDataUrl } from './wealthReport/captureChartForPdf';
import { exportReportToPdf } from './wealthReport/openReportWindow';

/** Minimum selectable "current age" for the calculator (fully flexible for any age). */
const MIN_CURRENT_AGE = 1;

// Simple icon components (can be replaced with actual SVGs later)
const Icon = ({ emoji, className = '' }: { emoji: string; className?: string }) => (
  <span className={`text-4xl ${className}`}>{emoji}</span>
);

// Compounding calculator with optional age-based contribution schedule (super + personal) and separate break periods
const calculateCompound = (
  startAge: number,
  monthlySuper: number,
  monthlyPersonal: number,
  years: number,
  annualReturn: number,
  initialInvestment: number = 0,
  contributionSchedule?: Array<{ age: number; amountSuper: number; amountPersonal: number }>,
  breakPeriodsSuper?: Array<{ fromAge: number; toAge: number }>,
  breakPeriodsPersonal?: Array<{ fromAge: number; toAge: number }>
): Array<{ age: number; total: number; contributed: number; growth: number }> => {
  const data = [];
  let balance = initialInvestment;
  let totalContributed = initialInvestment;
  const monthlyReturn = annualReturn / 100 / 12;
  const totalMonths = years * 12;

  const isInBreakSuper = (age: number): boolean => {
    if (!breakPeriodsSuper?.length) return false;
    return breakPeriodsSuper.some((b) => age >= b.fromAge && age <= b.toAge);
  };
  const isInBreakPersonal = (age: number): boolean => {
    if (!breakPeriodsPersonal?.length) return false;
    return breakPeriodsPersonal.some((b) => age >= b.fromAge && age <= b.toAge);
  };

  const getSuperAtAge = (age: number): number => {
    if (isInBreakSuper(age)) return 0;
    if (!contributionSchedule?.length) return monthlySuper;
    const sorted = [...contributionSchedule].sort((a, b) => b.age - a.age);
    for (const entry of sorted) {
      if (age >= entry.age) return entry.amountSuper;
    }
    return monthlySuper;
  };
  const getPersonalAtAge = (age: number): number => {
    if (isInBreakPersonal(age)) return 0;
    if (!contributionSchedule?.length) return monthlyPersonal;
    const sorted = [...contributionSchedule].sort((a, b) => b.age - a.age);
    for (const entry of sorted) {
      if (age >= entry.age) return entry.amountPersonal;
    }
    return monthlyPersonal;
  };

  for (let month = 0; month <= totalMonths; month++) {
    const currentAge = startAge + month / 12;
    const superAmount = getSuperAtAge(currentAge);
    const personalAmount = getPersonalAtAge(currentAge);
    const currentMonthlyAmount = superAmount + personalAmount;

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

type FamilyWealthBlueprintProps = {
  pdfExportRef: React.MutableRefObject<(() => Promise<void>) | null>;
};

const FamilyWealthBlueprint: React.FC<FamilyWealthBlueprintProps> = ({ pdfExportRef }) => {
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
  const [startAge, setStartAge] = useState(30);
  const [initialInvestment, setInitialInvestment] = useState(0);
  const [monthlySuper, setMonthlySuper] = useState(50);
  const [monthlyPersonal, setMonthlyPersonal] = useState(50);
  const monthlyAmount = monthlySuper + monthlyPersonal;
  const [annualReturn, setAnnualReturn] = useState(8.0);
  const [targetAge, setTargetAge] = useState(65);
  const [monthlySuperFocused, setMonthlySuperFocused] = useState(false);
  const [monthlyPersonalFocused, setMonthlyPersonalFocused] = useState(false);
  const [initialInvestmentFocused, setInitialInvestmentFocused] = useState(false);

  // Advanced contribution schedule: super + personal per age (collapsible)
  const [showAdvancedContributions, setShowAdvancedContributions] = useState(false);
  const [contributionSchedule, setContributionSchedule] = useState<Array<{ age: number; amountSuper: number; amountPersonal: number }>>([]);
  const [focusedContributionIndex, setFocusedContributionIndex] = useState<number | null>(null);

  // Take a break: separate pause periods for super and personal
  const [showTakeABreak, setShowTakeABreak] = useState(false);
  const [breakPeriodsSuper, setBreakPeriodsSuper] = useState<Array<{ fromAge: number; toAge: number }>>([]);
  const [breakPeriodsPersonal, setBreakPeriodsPersonal] = useState<Array<{ fromAge: number; toAge: number }>>([]);
  
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
    const schedule = showAdvancedContributions && contributionSchedule.length > 0
      ? contributionSchedule
      : undefined;
    const breaksSuper = showTakeABreak && breakPeriodsSuper.length > 0 ? breakPeriodsSuper : undefined;
    const breaksPersonal = showTakeABreak && breakPeriodsPersonal.length > 0 ? breakPeriodsPersonal : undefined;
    return calculateCompound(startAge, monthlySuper, monthlyPersonal, years, annualReturn, initialInvestment, schedule, breaksSuper, breaksPersonal);
  }, [startAge, monthlySuper, monthlyPersonal, annualReturn, targetAge, initialInvestment, showAdvancedContributions, contributionSchedule, showTakeABreak, breakPeriodsSuper, breakPeriodsPersonal]);

  const finalAmount = chartData[chartData.length - 1]?.total || 0;
  const totalContributed = chartData[chartData.length - 1]?.contributed || 0;
  const totalGrowth = chartData[chartData.length - 1]?.growth || 0;

  const runPdfExport = useCallback(async () => {
    try {
      const chartImageDataUrl = await captureElementAsPngDataUrl(chartForPdfRef.current);
      const generatedAt = new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
      const html = buildFamilyReportHtml({
        generatedAt,
        startAge,
        targetAge,
        initialInvestment,
        monthlySuper,
        monthlyPersonal,
        annualReturn,
        finalAmount,
        totalContributed,
        totalGrowth,
        chartData,
        showAdvancedContributions,
        contributionSchedule,
        showTakeABreak,
        breakPeriodsSuper,
        breakPeriodsPersonal,
        chartImageDataUrl,
      });
      await exportReportToPdf(html, `family-wealth-blueprint-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error(error);
      window.alert('Could not create the PDF. Please try again.');
    }
  }, [
    startAge,
    targetAge,
    initialInvestment,
    monthlySuper,
    monthlyPersonal,
    annualReturn,
    finalAmount,
    totalContributed,
    totalGrowth,
    chartData,
    showAdvancedContributions,
    contributionSchedule,
    showTakeABreak,
    breakPeriodsSuper,
    breakPeriodsPersonal,
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
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center">
        {/* Visually Stunning Title */}
        <div className="mb-6">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-2">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Family Wealth Blueprint
            </span>
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mx-auto rounded-full"></div>
        </div>
        
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Build Your Family's Financial Future
        </h2>
        <p className="text-lg sm:text-xl text-gray-700 mb-6 max-w-3xl mx-auto">
          A simple blueprint for adults learning about investing for the first time.
        </p>
        <a
          href="#watch-money-grow"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 ripple-effect"
        >
          Start Your Wealth Blueprint
        </a>
      </section>

      {/* Why This Matters */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 card-interactive">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xl font-bold text-gray-900">Family Wealth Blueprint — Why This Matters</h2>
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
            <div className="max-w-4xl mx-auto space-y-2 text-base text-gray-700 leading-relaxed animate-in slide-in-from-top-2 duration-200">
              <p>
                If you're in your 30s and new to investing, you're not alone. Most people wish they had started earlier, but the good news is that it's never too late to begin building wealth. This blueprint gives you a clear, simple path forward.
              </p>
              
              <p className="text-lg font-semibold text-gray-900">
                This blueprint gives you a better path.
              </p>
              
              <p>
                It's simple, long-term, and doesn't rely on picking winning stocks. It teaches the real secret:
              </p>
              
              <ul className="space-y-0.5 list-disc list-inside ml-4 text-base">
                <li>start now (even if you're starting later)</li>
                <li>stay consistent</li>
                <li>let compounding do the work</li>
              </ul>
              
              <p>
                When you understand how investing works, you gain confidence and control over your financial future. 
                Money becomes something you understand — not something you fear.
              </p>
              
              <p>
                This money could be used for buying a home, starting a business, 
                traveling the world, retiring comfortably, or simply having the freedom to make choices without financial stress. 
                It helps set you up for life — giving you options, security, and the confidence to 
                pursue your dreams. That's a really positive thing.
              </p>
              
              <div className="bg-blue-50 rounded-xl p-3 border-l-4 border-blue-600 mt-2">
                <p className="text-lg font-semibold text-gray-900 mb-0.5">And the best part?</p>
                <p className="text-base text-gray-800">
                  It's simple enough to understand… yet powerful enough to shape your entire financial future.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Compounding Chart */}
      <section id="watch-money-grow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-blue-100 card-interactive">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
            🚀 Watch Your Money Grow!
          </h2>
          <p className="text-center text-gray-700 mb-4 sm:mb-6 text-base sm:text-lg font-medium">
            See what happens when you start investing early
          </p>

          {/* Interactive Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 items-start">
            {/* Current Age Card - First */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-purple-200 card-interactive ripple-effect flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4 min-h-[3rem]">
                📅 Current Age
              </label>
              <input
                type="range"
                min={MIN_CURRENT_AGE}
                max={Math.max(MIN_CURRENT_AGE, targetAge - 1)}
                step="1"
                value={startAge}
                onChange={(e) => {
                  const age = Number(e.target.value);
                  const maxAge = Math.max(MIN_CURRENT_AGE, targetAge - 1);
                  const clampedAge = Math.max(MIN_CURRENT_AGE, Math.min(age, maxAge));
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
                      setStartAge(MIN_CURRENT_AGE);
                    } else {
                      const age = Number(numericValue);
                      if (!isNaN(age) && age >= 0 && age <= 120) {
                        setStartAge(age);
                        if (age >= targetAge) {
                          setTargetAge(age + 1);
                        }
                      }
                    }
                  }}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.select();
                    }, 0);
                  }}
                  onBlur={(e) => {
                    const age = Number(e.target.value) || MIN_CURRENT_AGE;
                    const maxAge = Math.max(MIN_CURRENT_AGE, targetAge - 1);
                    const clampedAge = Math.max(MIN_CURRENT_AGE, Math.min(maxAge, age));
                    setStartAge(clampedAge);
                    if (clampedAge >= targetAge) {
                      setTargetAge(clampedAge + 1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-purple-600 text-center border-2 border-purple-300 rounded-lg py-2 px-2 h-12 focus:outline-none focus:ring-2 focus:ring-purple-500 input-interactive"
                />
                <span className="text-sm text-gray-500 flex-shrink-0 w-4"></span>
              </div>
            </div>

            {/* Initial Investment Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border-2 border-teal-200 card-interactive ripple-effect flex flex-col">
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4 min-h-[3rem]">
                🎁 Initial Investment
              </label>
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
                  inputMode="numeric"
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
                  onFocus={(e) => {
                    setInitialInvestmentFocused(true);
                    setTimeout(() => {
                      e.target.select();
                    }, 0);
                  }}
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
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-2 min-h-[2rem]">
                💵 Monthly Investment
              </label>
              <p className="text-xs text-gray-600 mb-3">Super + personal (total drives the chart)</p>

              {/* Monthly Super */}
              <div className="mb-3">
                <label id="monthly-super-label" className="block text-xs font-semibold text-gray-700 mb-1">Super ($/month)</label>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="text-sm text-gray-500 flex-shrink-0">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-labelledby="monthly-super-label"
                    value={monthlySuperFocused ? monthlySuper.toString() : monthlySuper.toLocaleString()}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      if (numericValue === '') setMonthlySuper(0);
                      else {
                        const num = Number(numericValue);
                        if (!isNaN(num) && num >= 0) setMonthlySuper(num);
                      }
                    }}
                    onFocus={(e) => { setMonthlySuperFocused(true); setTimeout(() => e.target.select(), 0); }}
                    onBlur={() => setMonthlySuperFocused(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="flex-1 min-w-0 text-lg font-bold text-blue-600 text-center border-2 border-blue-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 input-interactive"
                  />
                </div>
              </div>

              {/* Monthly Personal */}
              <div className="mb-2">
                <label id="monthly-personal-label" className="block text-xs font-semibold text-gray-700 mb-1">Personal ($/month)</label>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="text-sm text-gray-500 flex-shrink-0">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-labelledby="monthly-personal-label"
                    value={monthlyPersonalFocused ? monthlyPersonal.toString() : monthlyPersonal.toLocaleString()}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      if (numericValue === '') setMonthlyPersonal(0);
                      else {
                        const num = Number(numericValue);
                        if (!isNaN(num) && num >= 0) setMonthlyPersonal(num);
                      }
                    }}
                    onFocus={(e) => { setMonthlyPersonalFocused(true); setTimeout(() => e.target.select(), 0); }}
                    onBlur={() => setMonthlyPersonalFocused(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="flex-1 min-w-0 text-lg font-bold text-indigo-600 text-center border-2 border-indigo-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-interactive"
                  />
                </div>
              </div>
              <div className="text-sm font-bold text-gray-800 mb-3 pt-1 border-t border-blue-100">
                Total: ${monthlyAmount.toLocaleString()}/month
              </div>

              {/* Take a break (pause contributing) */}
              <div className="mb-4 pb-4 border-b border-blue-200">
                <button
                  onClick={() => {
                    if (!showTakeABreak) {
                      setBreakPeriodsSuper([]);
                      setBreakPeriodsPersonal([]);
                    }
                    setShowTakeABreak(!showTakeABreak);
                  }}
                  className="w-full flex items-center justify-between text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>⏸️</span>
                    <span>Take a break from contributing?</span>
                  </span>
                  <span className={`transform transition-transform duration-200 ${showTakeABreak ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {showTakeABreak && (
                  <div className="mt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-gray-600">
                      Pause super and/or personal contributions for a period. Your balance still grows from returns; you just don’t add new money during the break.
                    </p>
                    {/* Pause Super */}
                    <div>
                      <div className="text-xs font-semibold text-blue-700 mb-2">Pause super</div>
                      {breakPeriodsSuper.map((bp, index) => (
                        <div key={`s-${index}`} className="bg-blue-50/80 rounded-lg p-3 relative flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs text-gray-700">From age</span>
                          <input
                            type="number"
                            min={startAge}
                            max={targetAge - 1}
                            value={bp.fromAge}
                            aria-label={`Super break ${index + 1} start age`}
                            onChange={(e) => {
                              const from = Math.max(startAge, Math.min(targetAge - 1, Number(e.target.value) || startAge));
                              const updated = [...breakPeriodsSuper];
                              updated[index] = { ...updated[index], fromAge: from };
                              if (updated[index].toAge < from) updated[index].toAge = from;
                              setBreakPeriodsSuper(updated);
                            }}
                            className="w-14 text-sm font-bold text-center border border-blue-300 rounded px-1 py-1"
                          />
                          <span className="text-xs text-gray-700">to</span>
                          <input
                            type="number"
                            min={bp.fromAge}
                            max={targetAge}
                            value={bp.toAge}
                            aria-label={`Super break ${index + 1} end age`}
                            onChange={(e) => {
                              const to = Math.max(bp.fromAge, Math.min(targetAge, Number(e.target.value) || bp.fromAge));
                              const updated = [...breakPeriodsSuper];
                              updated[index] = { ...updated[index], toAge: to };
                              setBreakPeriodsSuper(updated);
                            }}
                            className="w-14 text-sm font-bold text-center border border-blue-300 rounded px-1 py-1"
                          />
                          <button type="button" onClick={() => setBreakPeriodsSuper(breakPeriodsSuper.filter((_, i) => i !== index))} className="text-blue-600 hover:text-red-600 text-xs font-bold px-2 py-0.5">Remove</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setBreakPeriodsSuper([...breakPeriodsSuper, { fromAge: startAge + 5, toAge: startAge + 7 }])} className="w-full text-xs text-blue-700 hover:text-blue-800 font-medium py-1.5 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                        + Add super break
                      </button>
                    </div>
                    {/* Pause Personal */}
                    <div>
                      <div className="text-xs font-semibold text-indigo-700 mb-2">Pause personal</div>
                      {breakPeriodsPersonal.map((bp, index) => (
                        <div key={`p-${index}`} className="bg-indigo-50/80 rounded-lg p-3 relative flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs text-gray-700">From age</span>
                          <input
                            type="number"
                            min={startAge}
                            max={targetAge - 1}
                            value={bp.fromAge}
                            aria-label={`Personal break ${index + 1} start age`}
                            onChange={(e) => {
                              const from = Math.max(startAge, Math.min(targetAge - 1, Number(e.target.value) || startAge));
                              const updated = [...breakPeriodsPersonal];
                              updated[index] = { ...updated[index], fromAge: from };
                              if (updated[index].toAge < from) updated[index].toAge = from;
                              setBreakPeriodsPersonal(updated);
                            }}
                            className="w-14 text-sm font-bold text-center border border-indigo-300 rounded px-1 py-1"
                          />
                          <span className="text-xs text-gray-700">to</span>
                          <input
                            type="number"
                            min={bp.fromAge}
                            max={targetAge}
                            value={bp.toAge}
                            aria-label={`Personal break ${index + 1} end age`}
                            onChange={(e) => {
                              const to = Math.max(bp.fromAge, Math.min(targetAge, Number(e.target.value) || bp.fromAge));
                              const updated = [...breakPeriodsPersonal];
                              updated[index] = { ...updated[index], toAge: to };
                              setBreakPeriodsPersonal(updated);
                            }}
                            className="w-14 text-sm font-bold text-center border border-indigo-300 rounded px-1 py-1"
                          />
                          <button type="button" onClick={() => setBreakPeriodsPersonal(breakPeriodsPersonal.filter((_, i) => i !== index))} className="text-indigo-600 hover:text-red-600 text-xs font-bold px-2 py-0.5">Remove</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setBreakPeriodsPersonal([...breakPeriodsPersonal, { fromAge: startAge + 5, toAge: startAge + 7 }])} className="w-full text-xs text-indigo-700 hover:text-indigo-800 font-medium py-1.5 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors">
                        + Add personal break
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Advanced Contribution Schedule */}
              <div className="mt-2 pt-2 border-t border-blue-200">
                <button
                  onClick={handleToggleAdvancedContributions}
                  className="w-full flex items-center justify-between text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Adjust contributions by age?</span>
                  </span>
                  <span className={`transform transition-transform duration-200 ${showAdvancedContributions ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showAdvancedContributions && (
                  <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-gray-600 mb-3">
                      <strong>Optional:</strong> Set different super and personal amounts at specific ages. E.g. more super after a raise, less personal while paying off debt. Breaks still apply.
                    </p>
                    {contributionSchedule.map((entry, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3 relative">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-700 font-medium mb-1">At age:</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              tabIndex={index * 3 + 1}
                              value={entry.age}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                if (numericValue === '') {
                                  const updated = [...contributionSchedule];
                                  updated[index] = { ...updated[index], age: Math.max(MIN_CURRENT_AGE, startAge) };
                                  setContributionSchedule(updated);
                                } else {
                                  const age = Number(numericValue);
                                  if (!isNaN(age) && age >= 0 && age <= 120) {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], age };
                                    setContributionSchedule(updated);
                                  }
                                }
                              }}
                              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                              onBlur={(e) => {
                                const minAge = index === 0 ? startAge : Math.max(startAge, contributionSchedule[index - 1].age);
                                const maxAge = index < contributionSchedule.length - 1 ? contributionSchedule[index + 1].age : targetAge;
                                const newAge = Math.max(minAge, Math.min(maxAge, Number(e.target.value) || minAge));
                                const updated = [...contributionSchedule];
                                updated[index] = { ...updated[index], age: newAge };
                                setContributionSchedule(updated);
                              }}
                              className="w-full text-sm font-bold text-gray-800 text-center border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-700 font-medium mb-1">Super $</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                tabIndex={index * 3 + 2}
                                value={focusedContributionIndex === index ? entry.amountSuper.toString() : (entry.amountSuper >= 1000 ? entry.amountSuper.toLocaleString() : entry.amountSuper.toString())}
                                onChange={(e) => {
                                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                  if (numericValue === '') {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], amountSuper: 0 };
                                    setContributionSchedule(updated);
                                  } else {
                                    const num = Number(numericValue);
                                    if (!isNaN(num) && num >= 0) {
                                      const updated = [...contributionSchedule];
                                      updated[index] = { ...updated[index], amountSuper: num };
                                      setContributionSchedule(updated);
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  const newAmount = Math.max(0, entry.amountSuper);
                                  if (newAmount !== entry.amountSuper) {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], amountSuper: newAmount };
                                    setContributionSchedule(updated);
                                  }
                                  setFocusedContributionIndex(null);
                                }}
                                onFocus={(e) => { setFocusedContributionIndex(index); setTimeout(() => e.target.select(), 0); }}
                                className="w-full text-sm font-bold text-blue-600 text-center border border-blue-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 font-medium mb-1">Personal $</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                tabIndex={index * 3 + 3}
                                value={focusedContributionIndex === index ? entry.amountPersonal.toString() : (entry.amountPersonal >= 1000 ? entry.amountPersonal.toLocaleString() : entry.amountPersonal.toString())}
                                onChange={(e) => {
                                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                  if (numericValue === '') {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], amountPersonal: 0 };
                                    setContributionSchedule(updated);
                                  } else {
                                    const num = Number(numericValue);
                                    if (!isNaN(num) && num >= 0) {
                                      const updated = [...contributionSchedule];
                                      updated[index] = { ...updated[index], amountPersonal: num };
                                      setContributionSchedule(updated);
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  const newAmount = Math.max(0, entry.amountPersonal);
                                  if (newAmount !== entry.amountPersonal) {
                                    const updated = [...contributionSchedule];
                                    updated[index] = { ...updated[index], amountPersonal: newAmount };
                                    setContributionSchedule(updated);
                                  }
                                  setFocusedContributionIndex(null);
                                }}
                                onFocus={(e) => { setFocusedContributionIndex(index); setTimeout(() => e.target.select(), 0); }}
                                className="w-full text-sm font-bold text-indigo-600 text-center border border-indigo-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                        {contributionSchedule.length > 1 && (
                          <button
                            onClick={() => setContributionSchedule(contributionSchedule.filter((_, i) => i !== index))}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const lastAge = contributionSchedule.length > 0 ? Math.max(...contributionSchedule.map(e => e.age)) + 1 : startAge + 1;
                        setContributionSchedule([
                          ...contributionSchedule,
                          { age: Math.min(lastAge, targetAge), amountSuper: monthlySuper, amountPersonal: monthlyPersonal }
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
                <p className="text-xs sm:text-sm text-green-700 font-medium mt-1 italic">This is how investing grows your money! See below ↓</p>
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
                  inputMode="decimal"
                  value={annualReturn}
                  onChange={(e) => {
                    let numericValue = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = numericValue.split('.');
                    if (parts.length > 2) {
                      numericValue = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (numericValue === '' || numericValue === '.') {
                      setAnnualReturn(5);
                    } else {
                      const num = Number(numericValue);
                      if (!isNaN(num) && num >= 0) {
                        setAnnualReturn(num);
                      }
                    }
                  }}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.select();
                    }, 0);
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
              <label className="block text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4 min-h-[3rem]">
                🎯 Target Age
              </label>
              <input
                type="range"
                min={startAge + 1}
                max="100"
                step="1"
                value={targetAge}
                onChange={(e) => {
                  const age = Number(e.target.value);
                  const minAge = startAge + 1;
                  setTargetAge(Math.max(minAge, age));
                }}
                className="w-full h-4 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 mb-3 transition-all duration-300 hover:accent-orange-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm text-gray-500 flex-shrink-0 w-4"></span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetAge}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue === '') {
                      setTargetAge(startAge + 1);
                    } else {
                      const age = Number(numericValue);
                      if (!isNaN(age) && age >= 0 && age <= 120) {
                        setTargetAge(age);
                      }
                    }
                  }}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.select();
                    }, 0);
                  }}
                  onBlur={(e) => {
                    const age = Number(e.target.value) || (startAge + 1);
                    const minAge = startAge + 1;
                    const clampedAge = Math.max(minAge, Math.min(100, age));
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
                      💡 This is How You Build Wealth Through Investing!
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
                  
                  {/* What is Investing - Simple Explanation for Adults - more compact */}
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-1.5 sm:p-2 mb-1 sm:mb-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5">🤔 What is Investing?</h4>
                    <p className="text-xs text-gray-700 leading-snug mb-1">
                      <strong>Investing</strong> is putting your money to work. Instead of keeping your money in a low interest bank account where it barely grows, you put it to work. 
                      You buy small pieces of companies (called stocks) or funds. As those companies grow, your money grows too! 🚀
                    </p>
                    <p className="text-xs text-gray-700 leading-snug">
                      <strong>Think of it this way:</strong> If you save $100 in a regular bank account, you might have $101 a year later (with minimal interest). 
                      But if you <strong className="text-green-700">invest</strong> that $100, it can grow to $108, $114, or more - 
                      without you doing anything except being patient!
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-700 leading-snug mb-1">
                    The <strong className="text-green-700">Return %</strong> above shows how much your money grows <strong>each full year</strong> when you <strong className="text-green-700">invest</strong> it!
                  </p>
                  
                  <div className="bg-white/80 rounded-lg p-1.5 sm:p-2 border border-green-300 mb-1 sm:mb-1.5">
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <span className="text-lg flex-shrink-0">🏦</span>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-xs">Just Saving (Low Interest Bank Account):</p>
                          <p className="text-xs text-gray-700">
                            Your ${(monthlyAmount * 12).toLocaleString()}/year stays ${(monthlyAmount * 12).toLocaleString()}. Minimal growth. 😴
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-1.5">
                        <span className="text-lg flex-shrink-0">🚀</span>
                        <div className="min-w-0">
                          <p className="font-bold text-green-700 text-xs">Investing (Like This Chart!):</p>
                          {(() => {
                            const yearlyInvestment = monthlyAmount * 12;
                            const afterOneYear = yearlyInvestment * (1 + annualReturn / 100);
                            const growth = yearlyInvestment * annualReturn / 100;
                            
                            // Calculate 20-year projection
                            const data20Years = calculateCompound(0, monthlySuper, monthlyPersonal, 20, annualReturn, 0);
                            const after20Years = data20Years[data20Years.length - 1]?.total || 0;
                            
                            // Calculate 30-year projection
                            const data30Years = calculateCompound(0, monthlySuper, monthlyPersonal, 30, annualReturn, 0);
                            const after30Years = data30Years[data30Years.length - 1]?.total || 0;
                            
                            return (
                              <>
                                <p className="text-xs text-gray-700 mb-1">
                                  If you invest <strong>${yearlyInvestment.toLocaleString()}</strong> (${monthlyAmount.toLocaleString()}/month × 12) for <strong>one full year</strong> at {annualReturn}% annual return, 
                                  it grows to <strong className="text-green-700">${Math.round(afterOneYear).toLocaleString()}</strong>! 
                                  That's <strong className="text-green-700">${Math.round(growth).toLocaleString()}</strong> of <em>free money</em> you earned! 🎉
                                </p>
                                <p className="text-xs text-gray-700">
                                  And if you keep doing that for <strong>20 years</strong>, it would grow to <strong className="text-green-700">${after20Years.toLocaleString()}</strong>, 
                                  and for <strong>30 years</strong> it would grow to <strong className="text-green-700">${after30Years.toLocaleString()}</strong>! 🚀
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
                      💰 <strong>The Secret:</strong> When you invest, your money makes money. Then that money makes more money. That's called <strong className="text-green-700">compounding</strong> - and it's how real wealth is built! 
                      Watch the blue line in the chart below grow faster and faster over time. That's the magic of investing! ✨
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
                  <div className={`${isMobile ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} font-semibold opacity-95 leading-tight`}>Free Money!</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 sm:p-6 text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">
              🎉 Starting at age <span className="text-purple-600">{startAge}</span> with{' '}
              <span className="text-blue-600">${monthlySuper}/mo super</span>
              {monthlyPersonal > 0 && (
                <>
                  {' '}+ <span className="text-indigo-600">${monthlyPersonal}/mo personal</span>
                </>
              )}
              {' '}(<span className="text-gray-700">${monthlyAmount}/month total</span>)
            </p>
            <p className="text-base sm:text-xl text-gray-700">
              By age <span className="text-orange-600 font-bold">{targetAge}</span>, you could have{' '}
              <span className="text-blue-600 font-bold text-2xl sm:text-3xl">${finalAmount.toLocaleString()}</span>
            </p>
            <p className="text-sm sm:text-lg text-gray-600 mt-3">
              That's <strong>${totalGrowth.toLocaleString()}</strong> in free growth money! 🚀
            </p>
          </div>

        </div>
      </section>

      {/* 7-Step Family Wealth Blueprint */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          7-Step Family Wealth Blueprint
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="🏦" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 1</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Open Your First Investment Account
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Open a basic brokerage account. No hype apps, no day trading, no distraction – 
              just a clean foundation to start learning how money grows.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="📈" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 2</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Start with a low-cost ETF that tracks a broad market index
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Forget stock-picking. Buy the whole market through one low-cost index fund 
              (like an S&P 500 ETF). Diversified, simple, and proven – perfect for beginners.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="💻" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 3</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Add a Small Amount of Tech Exposure
            </h3>
            <p className="text-gray-700 leading-relaxed">
              A small NASDAQ-style ETF gives you 
              exposure to the world's biggest tech companies and long-term innovation. Even starting in your 30s, you have decades for growth.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="💰" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 4</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Introduce Dividend Investing Early
            </h3>
            <p className="text-gray-700 leading-relaxed">
              The real goal isn't just earning money – it's having money that earns for you. 
              Start with a dividend ETF and reinvest the payouts so you can see compounding in real time.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="🏃" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 5</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Focus on Endurance, Not Excitement
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Most people fail not because they choose the wrong investments, but because they can't stay 
              consistent. Remember that patience beats prediction, and sticking with the plan beats 
              chasing the next hot tip.
            </p>
          </div>

          {/* Step 6 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="⚙️" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 6</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Automate Everything
            </h3>
            <p className="text-gray-700 leading-relaxed">
              The best investors don't check their portfolios every day. Set up automatic monthly investing 
              and let time do the heavy lifting. That's how real millionaires are made.
            </p>
          </div>

          {/* Step 7 */}
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="✨" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 7</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Trust the Process: Money Grows Slow, Then Suddenly
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Compounding feels slow for years, then explodes in the final decade. The magic happens when 
              everyone else has given up. Stay invested long enough to see the payoff.
            </p>
          </div>
        </div>
      </section>

      {/* Compounding Example Highlight Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl text-white">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 text-center">💰 The Magic of Starting Now</h2>
          <p className="text-base sm:text-lg md:text-2xl leading-relaxed text-center mb-4 sm:mb-6 md:mb-8 font-semibold">
            Start now. Stay consistent. Watch it grow. 🚀
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
                <div className="text-sm sm:text-xs md:text-base opacity-90 mt-2">You Win! 🎉</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Recap Checklist */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Quick Recap: The Family Wealth Blueprint
        </h2>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 sm:p-12 shadow-lg border border-gray-100 card-interactive">
          <ul className="space-y-4 text-lg text-gray-700 max-w-2xl mx-auto">
            <li className="flex items-start">
              <span className="text-green-500 mr-3 text-2xl">✓</span>
              <span>Open a brokerage account</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3 text-2xl">✓</span>
              <span>Invest in a low-cost index fund</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3 text-2xl">✓</span>
              <span>Add a little tech exposure</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3 text-2xl">✓</span>
              <span>Reinvest dividends</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3 text-2xl">✓</span>
              <span>Automate monthly investing</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3 text-2xl">✓</span>
              <span>Stay consistent for decades</span>
            </li>
          </ul>
          <p className="text-center text-xl text-gray-800 font-semibold mt-8 pt-8 border-t border-gray-200">
            No shortcuts. No hype. Just smart, simple, long-term wealth building for you and your family.
          </p>
        </div>
      </section>

      {/* Final Call-to-Action */}
      <section id="kids-cta" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-8 sm:p-12 shadow-2xl text-white text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Build Your Family Wealth Blueprint?
          </h2>
          <p className="text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
            I help adults set this up in a simple, step-by-step way – no jargon, no pressure. 
            If you'd like help designing a personalised Family Wealth Blueprint, let's talk.
          </p>
          <a
            href="https://wealthbydesign.vercel.app/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Book a Family Wealth Blueprint Session
          </a>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <p className="text-sm text-gray-500 text-center leading-relaxed">
          <strong>Disclaimer:</strong> The ideas on this page are for general educational purposes only and 
          are not personal financial advice. Do your own research and consider speaking with a licensed 
          professional before making investment decisions.
        </p>
      </section>
      </div>
    </div>
  );
};

export default FamilyWealthBlueprint;

