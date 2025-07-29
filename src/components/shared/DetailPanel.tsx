'use client';

import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useCallback
} from 'react';
import Image from 'next/image';
import type { ForecastDay, TemperatureUnit, WeatherData } from '@/types/weather';
import { getUVIndexIcon } from '@/services/weatherService';

interface DetailPanelProps {
  selectedDay: ForecastDay | null;
  weatherData: WeatherData | null;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  onClose: () => void;
  onDaySelect: (day: ForecastDay) => void;
}

const DetailPanel = memo(function DetailPanel({
  selectedDay,
  weatherData,
  tempUnit,
  convertTemp,
  onClose,
  onDaySelect
}: DetailPanelProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDay) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsVisible(true);
      panelRef.current?.scrollTo({ top: 0 });
      setSelectedHour(null);
    } else {
      setIsVisible(false);
    }
  }, [selectedDay]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  }, [onClose]);

  const handlePrevDay = useCallback(() => {
    if (!selectedDay || !weatherData?.dailyForecast) return;
    const currentIndex = weatherData.dailyForecast.findIndex(day => day.date === selectedDay.date);
    if (currentIndex > 0) {
      setTimeout(() => {
        onDaySelect(weatherData.dailyForecast[currentIndex - 1]);
      }, 250);
    }
  }, [selectedDay, weatherData, onDaySelect]);

  const handleNextDay = useCallback(() => {
    if (!selectedDay || !weatherData?.dailyForecast) return;
    const currentIndex = weatherData.dailyForecast.findIndex(day => day.date === selectedDay.date);
    if (currentIndex < weatherData.dailyForecast.length - 1) {
      setTimeout(() => {
        onDaySelect(weatherData.dailyForecast[currentIndex + 1]);
      }, 250);
    }
  }, [selectedDay, weatherData, onDaySelect]);

  if (!selectedDay) return null;

  const hourlyData = selectedDay.hourly?.map((hour, index) => ({
    ...hour,
    isSelected: selectedHour === index
  }));

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 99 }}
        onClick={handleClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full lg:inset-0 lg:flex lg:items-center lg:justify-center md:w-[400px] lg:w-auto bg-black/85 lg:bg-black/60 backdrop-blur-xl transform transition-all duration-500 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} lg:translate-x-0`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 100 }}
      >
        <div
          className="relative h-full lg:h-auto lg:max-h-[90vh] lg:w-full lg:max-w-4xl lg:rounded-2xl lg:bg-black/90 lg:backdrop-blur-xl lg:border lg:border-white/10 lg:shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={panelRef} className="relative h-full p-3 md:p-6 lg:p-8 overflow-y-auto">
            <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevDay}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!weatherData?.dailyForecast?.some(day => new Date(day.date) < new Date(selectedDay.date))}
                >
                  ←
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!weatherData?.dailyForecast?.some(day => new Date(day.date) > new Date(selectedDay.date))}
                >
                  →
                </button>
                <button
                  onClick={handleClose}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex lg:hidden items-center justify-between mb-4 md:mb-6 mt-2">
              <button
                onClick={handleClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                aria-label="Close panel"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDay}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!weatherData?.dailyForecast?.some(day => new Date(day.date) < new Date(selectedDay.date))}
                >
                  ←
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!weatherData?.dailyForecast?.some(day => new Date(day.date) > new Date(selectedDay.date))}
                >
                  →
                </button>
              </div>
            </div>

            <div className="mt-4 md:mt-6">
              <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                  year: 'numeric'
                })}
              </h2>

              {/* Summary Panel */}
              <div className="glass-container p-2.5 md:p-3 rounded-lg md:rounded-xl backdrop-blur-md bg-white/5 mb-4 md:mb-6">
                <div className="flex items-center gap-4">
                  <Image src={selectedDay.icon} alt={selectedDay.condition} width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
                  <div>
                    <div className="text-base md:text-lg font-semibold">{selectedDay.condition}</div>
                    <div className="text-xl md:text-2xl font-bold">
                      {convertTemp(selectedDay.temp.min, tempUnit)}° - {convertTemp(selectedDay.temp.max, tempUnit)}°{tempUnit}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                {[
                  {
                    label: 'Precipitation',
                    value: `${selectedDay.precipitation}%`,
                    icon: '/icons/weathers/raindrops.svg'
                  },
                  {
                    label: 'UV Index',
                    value: `${selectedDay.uvIndex.value} - ${selectedDay.uvIndex.category}`,
                    icon: getUVIndexIcon(selectedDay.uvIndex.value)
                  },
                  {
                    label: 'Humidity',
                    value: `${selectedDay.humidity}%`,
                    icon: '/icons/weathers/humidity.svg'
                  },
                  {
                    label: 'Pressure',
                    value: `${selectedDay.pressure} hPa`,
                    icon: '/icons/weathers/barometer.svg'
                  }
                ].map((item, index) => (
                  <div key={index} className="p-2.5 md:p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs md:text-sm opacity-70">{item.label}</div>
                        <div className="text-base md:text-lg font-semibold">{item.value}</div>
                      </div>
                      <Image src={item.icon} alt={item.label} width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Hourly Forecast */}
              <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-semibold mb-4">Hourly Forecast</h3>
                <div className="overflow-x-auto pb-4">
                  <div className="inline-flex gap-3">
                    {hourlyData?.map((hour, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedHour(selectedHour === index ? null : index)}
                        className={`p-2.5 md:p-3 bg-white/5 rounded-lg cursor-pointer transition-all duration-300 min-w-[120px] flex flex-col items-center gap-2 transform hover:scale-[1.002] hover:bg-white/10 hover:shadow-lg relative group overflow-hidden ${hour.isSelected ? 'bg-white/20 shadow-lg scale-[1.002] ring-2 ring-white/20' : ''}`}
                      >
                        <div className="text-xs md:text-sm">{hour.time}</div>
                        <Image src={hour.icon} alt="Weather" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
                        <div className="text-base md:text-lg font-semibold">
                          {convertTemp(hour.temp, tempUnit)}°{tempUnit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedHour !== null && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <div className="text-sm opacity-70">Selected Hour</div>
                        <div className="text-lg font-semibold">{hourlyData[selectedHour].time}</div>
                      </div>
                      <Image src={hourlyData[selectedHour].icon} alt="Weather" width={48} height={48} className="w-12 h-12 opacity-80" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: 'Temperature',
                          value: `${convertTemp(hourlyData[selectedHour].temp, tempUnit)}°${tempUnit}`,
                          icon: hourlyData[selectedHour].icon
                        },
                        {
                          label: 'Precipitation',
                          value: `${hourlyData[selectedHour].precipitation}%`,
                          icon: '/icons/weathers/raindrops.svg'
                        },
                        {
                          label: 'UV Index',
                          value: `${hourlyData[selectedHour].uvIndex.value} - ${hourlyData[selectedHour].uvIndex.category}`,
                          icon: getUVIndexIcon(hourlyData[selectedHour].uvIndex.value)
                        },
                        {
                          label: 'Humidity',
                          value: `${hourlyData[selectedHour].humidity}%`,
                          icon: '/icons/weathers/humidity.svg'
                        }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Image src={item.icon} alt={item.label} width={24} height={24} className="w-6 h-6 opacity-80" />
                          <div>
                            <div className="text-xs opacity-70">{item.label}</div>
                            <div className="text-base font-semibold">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default DetailPanel;
