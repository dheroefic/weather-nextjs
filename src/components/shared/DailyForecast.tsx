'use client';

import React, { memo, useMemo, useCallback } from 'react';
import Image from 'next/image';
import type { ForecastDay } from '@/types/weather';
import type { TemperatureUnit } from '@/types/weather';

interface DailyForecastProps {
  forecastPeriod: '4 days' | '8 days' | '14 days';
  loading: boolean;
  dailyForecast: ForecastDay[] | undefined;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  onForecastPeriodChange: (period: '4 days' | '8 days' | '14 days') => void;
  onDaySelect: (day: ForecastDay) => void;
}

const DailyForecast = memo(function DailyForecast({
  forecastPeriod,
  loading,
  dailyForecast,
  tempUnit,
  convertTemp,
  onForecastPeriodChange,
  onDaySelect
}: DailyForecastProps) {
  // Memoize the number of days to show based on period
  const daysToShow = useMemo(() => {
    switch (forecastPeriod) {
      case '4 days': return 4;
      case '8 days': return 8;
      case '14 days': return 14;
      default: return 4;
    }
  }, [forecastPeriod]);

  // Memoize filtered forecast data
  const filteredForecast = useMemo(() => {
    return dailyForecast?.slice(0, daysToShow) || [];
  }, [dailyForecast, daysToShow]);

  // Memoize loading placeholders
  const loadingPlaceholders = useMemo(() => 
    Array.from({ length: daysToShow }).map((_, index) => (
      <div key={index} className="p-2.5 md:p-4 bg-white/5 rounded-xl min-w-[140px] md:min-w-[200px]">
        <div className="loading-element w-16 md:w-24 h-4 mb-2"></div>
        <div className="loading-element w-8 md:w-10 h-8 md:h-10 mb-2"></div>
        <div className="loading-element w-24 md:w-32 h-4 mt-2"></div>
        <div className="loading-element w-16 md:w-24 h-4 mt-2"></div>
      </div>
    )), [daysToShow]);

  // Memoized day select handler
  const handleDaySelect = useCallback((day: ForecastDay) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      onDaySelect(day);
    };
  }, [onDaySelect]);

  // Memoized forecast period buttons
  const ForecastButtons = memo(() => (
    <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3">
      {(['4 days', '8 days', '14 days'] as const).map((period) => (
        <button
          key={period}
          onClick={() => onForecastPeriodChange(period)}
          className={`px-2.5 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${
            forecastPeriod === period ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  ));
  ForecastButtons.displayName = 'ForecastButtons';

  // Memoized day card component
  const DayCard = memo(({ day }: { day: ForecastDay; index: number }) => (
    <div 
      className="p-3 md:p-5 bg-white/5 rounded-xl md:rounded-2xl min-w-[150px] md:min-w-[220px] cursor-pointer hover:bg-white/10 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
      onClick={handleDaySelect(day)}
    >
      <div className="text-xs md:text-sm mb-3 opacity-80">
        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
      </div>
      <Image
        src={day.icon}
        alt={day.condition}
        width={44}
        height={44}
        className="weather-icon w-8 md:w-11 h-8 md:h-11 mb-3"
        loading="lazy"
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPC9zdmc+"
      />
      <div className="text-xs md:text-sm mt-3 mb-2 opacity-90">{day.condition}</div>
      <div className="text-sm md:text-base font-semibold">
        {convertTemp(day.temp.min, tempUnit)}° - {convertTemp(day.temp.max, tempUnit)}°{tempUnit}
      </div>
    </div>
  ));
  DayCard.displayName = 'DayCard';

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 md:mb-8 gap-4 md:gap-0">
        <div className={`text-base md:text-xl font-semibold ${loading ? 'loading-pulse' : ''}`}>
          Daily Weather Outlook
        </div>
        <ForecastButtons />
      </div>

      <div className="overflow-x-auto relative -mx-2 md:-mx-0 px-2 md:px-0">
        <div className="inline-grid grid-flow-col auto-cols-[minmax(150px,1fr)] md:auto-cols-[minmax(220px,1fr)] gap-3 md:gap-5 pb-4">
          {loading ? loadingPlaceholders : (
            filteredForecast.map((day, index) => (
              <DayCard key={`${day.date}-${index}`} day={day} index={index} />
            ))
          )}
        </div>
      </div>
    </>
  );
});

export default DailyForecast;