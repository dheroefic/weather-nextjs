'use client';

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

export default function DailyForecast({
  forecastPeriod,
  loading,
  dailyForecast,
  tempUnit,
  convertTemp,
  onForecastPeriodChange,
  onDaySelect
}: DailyForecastProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-0">
        <div className={`text-base md:text-xl font-semibold ${loading ? 'loading-pulse' : ''}`}>Daily Weather Outlook</div>
        <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3">
          <button
            onClick={() => onForecastPeriodChange('4 days')}
            className={`px-2.5 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '4 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
          >
            4 days
          </button>
          <button
            onClick={() => onForecastPeriodChange('8 days')}
            className={`px-2.5 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '8 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
          >
            8 days
          </button>
          <button
            onClick={() => onForecastPeriodChange('14 days')}
            className={`px-2.5 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '14 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
          >
            14 days
          </button>
        </div>
      </div>

      <div className="overflow-x-auto relative -mx-2 md:-mx-0 px-2 md:px-0">
        <div className="inline-grid grid-flow-col auto-cols-[minmax(140px,1fr)] md:auto-cols-[minmax(200px,1fr)] gap-2 md:gap-4 pb-4">
          {loading ? (
            Array.from({ length: forecastPeriod === '4 days' ? 4 : forecastPeriod === '8 days' ? 8 : 14 }).map((_, index) => (
              <div key={index} className="p-2.5 md:p-4 bg-white/5 rounded-xl min-w-[140px] md:min-w-[200px]">
                <div className="loading-element w-16 md:w-24 h-4 mb-2"></div>
                <div className="loading-element w-8 md:w-10 h-8 md:h-10 mb-2"></div>
                <div className="loading-element w-24 md:w-32 h-4 mt-2"></div>
                <div className="loading-element w-16 md:w-24 h-4 mt-2"></div>
              </div>
            ))
          ) : (
            dailyForecast
              ?.slice(0, forecastPeriod === '4 days' ? 4 : forecastPeriod === '8 days' ? 8 : 14)
              .map((day, index) => {
                return (
                  <div 
                    key={index} 
                    className="p-2.5 md:p-4 bg-white/5 rounded-xl min-w-[140px] md:min-w-[200px] cursor-pointer hover:bg-white/10 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
                    onClick={() => onDaySelect(day)}
                  >
                    <div className="text-xs md:text-sm mb-2">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</div>
                    <Image
                      src={day.icon}
                      alt={day.condition}
                      width={40}
                      height={40}
                      className="weather-icon w-7 md:w-10 h-7 md:h-10"
                    />
                    <div className="text-xs md:text-sm mt-2">{day.condition}</div>
                    <div className="text-xs md:text-sm">
                      {convertTemp(day.temp.min, tempUnit)}° - {convertTemp(day.temp.max, tempUnit)}°{tempUnit}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </>
  );
}