import React, { useState, useMemo } from 'react';
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
  contributionSchedule?: Array<{ age: number; amount: number }>
): Array<{ age: number; total: number; contributed: number; growth: number }> => {
  const data = [];
  let balance = 0;
  let totalContributed = 0;
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

const KidsWealthBlueprint: React.FC = () => {
  // Interactive chart state
  const [startAge, setStartAge] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(100);
  const [annualReturn, setAnnualReturn] = useState(8.0);
  const [targetAge, setTargetAge] = useState(28);
  const [monthlyInputFocused, setMonthlyInputFocused] = useState(false);
  
  // Advanced contribution schedule (collapsible)
  const [showAdvancedContributions, setShowAdvancedContributions] = useState(false);
  const [contributionSchedule, setContributionSchedule] = useState<Array<{ age: number; amount: number }>>([]);
  const [focusedContributionIndex, setFocusedContributionIndex] = useState<number | null>(null);
  
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
    return calculateCompound(startAge, monthlyAmount, years, annualReturn, schedule);
  }, [startAge, monthlyAmount, annualReturn, targetAge, showAdvancedContributions, contributionSchedule]);

  const finalAmount = chartData[chartData.length - 1]?.total || 0;
  const totalContributed = chartData[chartData.length - 1]?.contributed || 0;
  const totalGrowth = chartData[chartData.length - 1]?.growth || 0;

  // Calculate max value for Y-axis - always show next tick above max, maximizing chart space
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1000000; // Default if no data
    
    const max = Math.max(...chartData.map(d => Math.max(d.total, d.contributed)));
    
    if (max === 0) return 1000000;
    
    // Calculate next logical tick that's just above max to maximize chart space
    if (max >= 1000000) {
      // For millions, round up to next logical increment
      const millions = max / 1000000;
      // Round up to next 0.2M, 0.5M, or 1M increment based on value
      if (millions <= 0.2) return 500000; // $0.5M
      if (millions <= 0.5) return 1000000; // $1M
      if (millions <= 1) return 1500000; // $1.5M
      if (millions <= 1.5) return 2000000; // $2M
      if (millions <= 2) return 2500000; // $2.5M
      if (millions <= 2.5) return 3000000; // $3M
      if (millions <= 3) return 4000000; // $4M
      if (millions <= 4) return 5000000; // $5M
      if (millions <= 5) return 6000000; // $6M
      if (millions <= 6) return 8000000; // $8M
      if (millions <= 8) return 10000000; // $10M
      if (millions <= 10) return 12000000; // $12M
      if (millions <= 12) return 15000000; // $15M
      if (millions <= 15) return 20000000; // $20M
      // For larger values, round up to next 5M increment
      return Math.ceil(millions / 5) * 5 * 1000000;
    } else if (max >= 100000) {
      // For hundreds of thousands, calculate tight cap to maximize chart space
      // Add only 8-12% padding above max, then round up to nearest 10k
      const padding = 1.10; // 10% above max for minimal padding
      const preciseCap = max * padding;
      // Round up to nearest 10k increment
      const roundedCap = Math.ceil(preciseCap / 10000) * 10000;
      return roundedCap;
    } else if (max >= 10000) {
      // For tens of thousands, add 10% padding and round up to nearest 5k or 10k
      const padding = 1.10;
      const preciseCap = max * padding;
      // Round up to nearest 5k, then to 10k if needed
      const roundedCap = Math.ceil(preciseCap / 5000) * 5000;
      // If it's close to a 10k boundary, round to 10k for cleaner ticks
      if (roundedCap % 10000 < 2000) {
        return Math.ceil(preciseCap / 10000) * 10000;
      }
      return roundedCap;
    } else if (max >= 1000) {
      // For thousands, add 10% padding and round up to nearest 1k
      const padding = 1.10;
      const preciseCap = max * padding;
      return Math.ceil(preciseCap / 1000) * 1000;
    } else {
      // For smaller values, add 10% padding and round up to nearest 100
      const padding = 1.10;
      const preciseCap = max * padding;
      return Math.ceil(preciseCap / 100) * 100;
    }
  }, [chartData]);

  // Calculate Y-axis ticks using $10k increments, auto-scaling to $20k if crowded
  const yAxisTicks = useMemo(() => {
    if (maxValue === 0) return [0, 1000000];
    
    // Start with $10k increments
    let increment = 10000;
    
    // For values >= $100k, use $10k increments, but auto-scale to $20k if too many ticks
    if (maxValue >= 100000) {
      // Check how many ticks we'd get with $10k increments
      const numTicksWith10k = Math.floor(maxValue / 10000) + 1;
      // If more than 12 ticks, use $20k increments instead
      if (numTicksWith10k > 12) {
        increment = 20000;
      }
    } else if (maxValue >= 10000) {
      // For $10k-$100k range, use $5k increments, scale to $10k if crowded
      increment = 5000;
      const numTicksWith5k = Math.floor(maxValue / 5000) + 1;
      if (numTicksWith5k > 12) {
        increment = 10000;
      }
    } else if (maxValue >= 1000) {
      // For $1k-$10k range, use $1k increments, scale to $2k if crowded
      increment = 1000;
      const numTicksWith1k = Math.floor(maxValue / 1000) + 1;
      if (numTicksWith1k > 12) {
        increment = 2000;
      }
    } else {
      // For smaller values, use $100 increments, scale to $200 if crowded
      increment = 100;
      const numTicksWith100 = Math.floor(maxValue / 100) + 1;
      if (numTicksWith100 > 12) {
        increment = 200;
      }
    }
    
    // Generate ticks from 0 to maxValue using the increment
    const ticks = [0];
    let current = increment;
    while (current < maxValue) {
      ticks.push(current);
      current += increment;
    }
    ticks.push(maxValue); // Always include maxValue at the top
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
              Kids Wealth Blueprint
            </span>
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mx-auto rounded-full"></div>
        </div>
        
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Set Your Kids Up For Life
        </h2>
        <p className="text-lg sm:text-xl text-gray-700 mb-6 max-w-3xl mx-auto">
          A simple blueprint any parent can use to help set your kids up.
        </p>
        <a
          href="#watch-money-grow"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 ripple-effect"
        >
          Start Their Wealth Blueprint
        </a>
      </section>

      {/* Why This Matters */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 card-interactive">
          <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">Kids Wealth Blueprint — Why This Matters</h2>
          <div className="max-w-4xl mx-auto space-y-2 text-base text-gray-700 leading-relaxed">
            <p>
              Give your kids the gift most adults wish they had — a clear, confident start with money. Show them the magic of starting early, so they grow up empowered instead of stressed or wishing someone had taught them sooner.
            </p>
            
            <p className="text-lg font-semibold text-gray-900">
              This blueprint gives your kids a better path.
            </p>
            
            <p>
              It's simple, long-term, and doesn't rely on picking winning stocks. It teaches the real secret:
            </p>
            
            <ul className="space-y-0.5 list-disc list-inside ml-4 text-base">
              <li>start early</li>
              <li>stay consistent</li>
              <li>let compounding do the work</li>
            </ul>
            
            <p>
              Kids who learn this young grow up confident, in control, and ahead of everyone else. 
              Money becomes something they understand — not something they fear.
            </p>
            
            <p>
              This money could be used for their first car, their first home, starting a business, 
              traveling the world, or simply having the freedom to make choices without financial stress. 
              It helps set them up for life — giving them options, security, and the confidence to 
              pursue their dreams. That's a really positive thing.
            </p>
            
            <div className="bg-blue-50 rounded-xl p-3 border-l-4 border-blue-600 mt-2">
              <p className="text-lg font-semibold text-gray-900 mb-0.5">And the best part?</p>
              <p className="text-base text-gray-800">
                It's easy enough for your kids to follow… yet powerful enough to shape their entire financial future.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Compounding Chart */}
      <section id="watch-money-grow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-blue-100 card-interactive">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center">
            🚀 Watch Your Money Grow!
          </h2>
          <p className="text-center text-gray-700 mb-6 text-lg font-medium">
            See what happens when you start investing early
          </p>

          {/* Interactive Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-purple-200 card-interactive ripple-effect">
              <label className="block text-base font-bold text-gray-800 mb-4">
                👶 Child's Age
              </label>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={startAge}
                onChange={(e) => {
                  const age = Number(e.target.value);
                  setStartAge(age);
                  if (age > targetAge) setTargetAge(age);
                }}
                className="w-full h-4 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600 mb-3 transition-all duration-300 hover:accent-purple-700"
              />
              <input
                type="text"
                value={startAge}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                  if (numericValue === '') {
                    setStartAge(0);
                  } else {
                    const age = Number(numericValue);
                    if (!isNaN(age)) {
                      setStartAge(age);
                      if (age > targetAge) setTargetAge(age);
                    }
                  }
                }}
                onBlur={(e) => {
                  const age = Math.max(0, Math.min(25, Number(e.target.value) || 0));
                  setStartAge(age);
                  if (age > targetAge) setTargetAge(age);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full text-2xl font-bold text-purple-600 text-center border-2 border-purple-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 input-interactive"
              />
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-blue-200 overflow-hidden card-interactive ripple-effect">
              <label className="block text-base font-bold text-gray-800 mb-4">
                💵 Monthly Investment
              </label>
              <input
                type="range"
                min="25"
                max="5000"
                step="25"
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
                        setMonthlyAmount(Math.min(5000, num));
                      }
                    }
                  }}
                  onFocus={() => setMonthlyInputFocused(true)}
                  onBlur={() => {
                    setMonthlyInputFocused(false);
                    if (monthlyAmount > 5000) setMonthlyAmount(5000);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                      setMonthlyInputFocused(false);
                      if (monthlyAmount > 5000) setMonthlyAmount(5000);
                    }
                  }}
                  className="flex-1 min-w-0 text-2xl font-bold text-blue-600 text-center border-2 border-blue-300 rounded-lg py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 input-interactive"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>$25</span>
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
                    <span>Adjust contributions by age?</span>
                  </span>
                  <span className={`transform transition-transform duration-200 ${showAdvancedContributions ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showAdvancedContributions && (
                  <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-gray-600 mb-3">
                      <strong>Optional:</strong> Set different contribution amounts at different ages. For example, parents might contribute $100 a month until age 18. And then the child increases it to $400 a month when they start working.
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
                                  updated[index] = { ...updated[index], age: startAge };
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
                                // Clamp to valid range on blur
                                const newAmount = Math.max(0, Math.min(5000, entry.amount));
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

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-green-200 card-interactive ripple-effect">
              <label className="block text-base font-bold text-gray-800 mb-4">
                📈 Return (% per year)
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
                  className="flex-1 min-w-0 text-2xl font-bold text-green-600 text-center border-2 border-green-300 rounded-lg py-2 px-2 focus:outline-none focus:ring-2 focus:ring-green-500 input-interactive"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">%</span>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>5%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-orange-200 card-interactive ripple-effect">
              <label className="block text-base font-bold text-gray-800 mb-4">
                🎯 Target Age
              </label>
              <input
                type="range"
                min={startAge}
                max="70"
                step="1"
                value={targetAge}
                onChange={(e) => setTargetAge(Number(e.target.value))}
                className="w-full h-4 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600 mb-3 transition-all duration-300 hover:accent-orange-700"
              />
              <div className="flex items-center gap-2 w-full min-w-0">
                <input
                  type="text"
                  value={targetAge}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue === '') {
                      setTargetAge(startAge);
                    } else {
                      const age = Number(numericValue);
                      if (!isNaN(age)) {
                        setTargetAge(age);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const age = Math.max(startAge, Math.min(70, Number(e.target.value) || startAge));
                    setTargetAge(age);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="flex-1 min-w-0 text-2xl font-bold text-orange-600 text-center border-2 border-orange-300 rounded-lg py-2 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500 input-interactive"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">years</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 sm:p-3 shadow-lg mb-8 w-full card-interactive">
            <ResponsiveContainer width="100%" height={550}>
              <LineChart 
                data={chartData} 
                margin={{ top: 38, right: 38, left: 38, bottom: 38 }}
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
                  strokeWidth={2}
                  tick={{ 
                    fontSize: 16, 
                    fill: '#111827',
                    fontWeight: 700
                  }}
                  tickMargin={8}
                  allowDecimals={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  scale="linear"
                  domain={[0, maxValue]}
                  stroke="#111827"
                  strokeWidth={2}
                  tick={{ 
                    fontSize: 16, 
                    fill: '#111827',
                    fontWeight: 700
                  }}
                  tickMargin={8}
                  width={60}
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
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{
                    fontWeight: 'bold',
                    fontSize: '16px',
                    marginBottom: '4px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '16px',
                    fontWeight: 700
                  }}
                  iconType="line"
                  iconSize={20}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Value"
                  stroke="#2563eb"
                  strokeWidth={5}
                  dot={false}
                  activeDot={{ r: 10, fill: '#2563eb', strokeWidth: 3, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="contributed"
                  name="Amount Invested"
                  stroke="#10b981"
                  strokeWidth={5}
                  strokeDasharray="10 5"
                  dot={false}
                  activeDot={{ r: 10, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                />
                <ReferenceLine
                  x={targetAge}
                  stroke="#9333ea"
                  strokeWidth={4}
                  strokeDasharray="10 5"
                  label={{ 
                    value: `Age ${targetAge}`, 
                    position: 'top',
                    offset: 10,
                    style: {
                      fontSize: '16px',
                      fontWeight: 'bold',
                      fill: '#9333ea',
                      textAnchor: 'middle'
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 shadow-xl text-center text-white transform hover:scale-105 transition-transform">
              <div className="text-5xl font-bold mb-3">
                ${finalAmount.toLocaleString()}
              </div>
              <div className="text-lg font-semibold">Total at Age {targetAge}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 shadow-xl text-center text-white transform hover:scale-105 transition-transform">
              <div className="text-5xl font-bold mb-3">
                ${totalContributed.toLocaleString()}
              </div>
              <div className="text-lg font-semibold">Total Invested</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 shadow-xl text-center text-white transform hover:scale-105 transition-transform">
              <div className="text-5xl font-bold mb-3">
                ${totalGrowth.toLocaleString()}
              </div>
              <div className="text-lg font-semibold">Free Money from Growth!</div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold text-gray-800 mb-2">
              🎉 Starting at age <span className="text-purple-600">{startAge}</span> with <span className="text-blue-600">${monthlyAmount}/month</span>
            </p>
            <p className="text-xl text-gray-700">
              By age <span className="text-orange-600 font-bold">{targetAge}</span>, you could have{' '}
              <span className="text-blue-600 font-bold text-3xl">${finalAmount.toLocaleString()}</span>
            </p>
            <p className="text-lg text-gray-600 mt-3">
              That's <strong>${totalGrowth.toLocaleString()}</strong> in free growth money! 🚀
            </p>
          </div>
        </div>
      </section>

      {/* 7-Step Kids Wealth Blueprint */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          7-Step Kids Wealth Blueprint
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 card-interactive">
            <div className="flex items-center justify-center mb-4">
              <Icon emoji="🏦" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">Step 1</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Open Their First Investment Account
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Help them open a basic brokerage account. No hype apps, no day trading, no distraction – 
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
              Start With a Low-Cost Index Fund
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Forget stock-picking. Show them how to buy the whole market through one low-cost index fund 
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
              Young people have one advantage adults don't: time. A small NASDAQ-style ETF gives them 
              exposure to the world's biggest tech companies and long-term innovation.
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
              Teach them that the real goal isn't just earning money – it's having money that earns for them. 
              Start with a dividend ETF and reinvest the payouts so they can see compounding in real time.
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
              consistent. Show your kids that patience beats prediction, and sticking with the plan beats 
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
              everyone else has given up. Teach them to stay invested long enough to see the payoff.
            </p>
          </div>
        </div>
      </section>

      {/* Compounding Example Highlight Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 sm:p-12 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-6 text-center">💰 The Magic of Starting Early</h2>
          <p className="text-2xl leading-relaxed text-center mb-8 font-semibold">
            Start young. Stay consistent. Watch it grow. 🚀
          </p>
          
          {/* Simple visual bars */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="text-center transform hover:scale-110 transition-transform">
              <div className="bg-white/20 rounded-xl p-6 mb-2">
                <div className="text-4xl font-bold">$0</div>
                <div className="text-base opacity-90 mt-2">Start Here</div>
              </div>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform">
              <div className="bg-white/30 rounded-xl p-6 mb-2">
                <div className="text-4xl font-bold">$200/mo</div>
                <div className="text-base opacity-90 mt-2">Keep Going</div>
              </div>
            </div>
            <div className="text-center transform hover:scale-110 transition-transform">
              <div className="bg-white/40 rounded-xl p-6 mb-2">
                <div className="text-4xl font-bold">$1.2M+</div>
                <div className="text-base opacity-90 mt-2">You Win! 🎉</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Recap Checklist */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Quick Recap: The Kids Wealth Blueprint
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
            No shortcuts. No hype. Just smart, simple, long-term wealth building for your kids.
          </p>
        </div>
      </section>

      {/* Final Call-to-Action */}
      <section id="kids-cta" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-8 sm:p-12 shadow-2xl text-white text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Build Your Kids' Wealth Blueprint?
          </h2>
          <p className="text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
            I help parents and teenagers set this up in a simple, step-by-step way – no jargon, no pressure. 
            If you'd like help designing a personalised Kids Wealth Blueprint for your family, let's talk.
          </p>
          <a
            href="https://wealthbydesign.vercel.app/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Book a Kids Wealth Blueprint Session
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

