'use client';

import { PrecipitationIcon, UVIndexIcon, HumidityIcon, PressureIcon } from '@/components/icons';
import type { ForecastDay, WeatherData, TemperatureUnit } from '@/types/weather';
import { useState } from 'react';

interface DetailPanelProps {
  selectedDay: ForecastDay | null;
  weatherData: WeatherData | null;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  onClose: () => void;
}

export default function DetailPanel({
  selectedDay,
  weatherData,
  tempUnit,
  convertTemp,
  onClose
}: DetailPanelProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  if (!selectedDay) return null;

  const hourlyData = selectedDay.hourly?.map((hour, index) => ({
    ...hour,
    isSelected: selectedHour === index
  }));

  return (
    <div className={`fixed top-0 left-full h-full w-full md:w-[400px] bg-black/85 backdrop-blur-xl transform transition-transform duration-300 ease-in-out ${selectedDay ? '-translate-x-full' : 'translate-x-0'} z-50 overflow-hidden`}>
      <div className="relative h-full p-6 overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-6">{new Date(selectedDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</h2>
          <div className="glass-container p-4 rounded-xl backdrop-blur-md bg-white/5 mb-6">
            <div className="flex items-center gap-4">
              <selectedDay.icon className="weather-icon w-16 h-16" />
              <div>
                <div className="text-xl mb-1">{selectedDay.condition}</div>
                <div className="text-3xl font-bold">
                  {convertTemp(selectedDay.temp.min, tempUnit)}° - {convertTemp(selectedDay.temp.max, tempUnit)}°{tempUnit}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">Precipitation</div>
                  <div className="text-lg font-semibold">
                    {selectedDay.precipitation}%
                  </div>
                </div>
                <PrecipitationIcon className="w-5 h-5 opacity-70" />
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">UV Index</div>
                  <div className="text-lg font-semibold">
                    {selectedDay.uvIndex.value} - {selectedDay.uvIndex.category}
                  </div>
                </div>
                <UVIndexIcon className="w-5 h-5 opacity-70" />
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">Humidity</div>
                  <div className="text-lg font-semibold">
                    {selectedDay.humidity}%
                  </div>
                </div>
                <HumidityIcon className="w-5 h-5 opacity-70" />
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">Pressure</div>
                  <div className="text-lg font-semibold">
                    {selectedDay.pressure} hPa
                  </div>
                </div>
                <PressureIcon className="w-5 h-5 opacity-70" />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Hourly Forecast</h3>
            <div className="overflow-x-auto pb-4">
              <div className="inline-flex gap-3">
                {hourlyData?.map((hour, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedHour(index)}
                    className={`p-3 bg-white/5 rounded-lg cursor-pointer transition-all duration-300 min-w-[100px] ${hour.isSelected ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
                  >
                    <div className="text-sm text-center mb-2">{hour.time}</div>
                    <hour.icon className="weather-icon w-8 h-8 mx-auto mb-2" />
                    <div className="text-lg font-semibold text-center">
                      {convertTemp(hour.temp, tempUnit)}°{tempUnit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedHour !== null && hourlyData && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl backdrop-blur-sm transition-all duration-300">
                <div className="text-lg font-semibold mb-3">{hourlyData[selectedHour].time}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <PrecipitationIcon className="w-4 h-4 opacity-70" />
                    <span>{hourlyData[selectedHour].precipitation}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HumidityIcon className="w-4 h-4 opacity-70" />
                    <span>{hourlyData[selectedHour].humidity}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}