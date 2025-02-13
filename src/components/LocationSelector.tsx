import React, { useState, useEffect, useRef } from 'react';
import cities from '../data/cities.json';

interface LocationSelectorProps {
  onLocationSelect: (location: { city: string; country: string; coordinates?: { latitude: number; longitude: number } }) => void;
  currentLocation: { city: string; country: string; coordinates?: { latitude: number; longitude: number } };
}

export default function LocationSelector({ onLocationSelect, currentLocation }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.country.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-base md:text-xl font-semibold bg-black/40 px-3 py-1.5 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:bg-black/50 flex items-center gap-2 shadow-md"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {currentLocation.city}, {currentLocation.country}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-lg bg-black/80 backdrop-blur-xl shadow-2xl z-50 border border-white/10">
          <input
            type="text"
            placeholder="Search cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-black/60 border-none outline-none text-white placeholder-white/50 rounded-t-lg focus:bg-black/70 transition-colors duration-200"
          />
          <div className="divide-y divide-white/20">
            {filteredCities.map((city, index) => (
              <button
                key={index}
                className="w-full p-3 text-left hover:bg-white/10 transition-colors duration-200"
                onClick={() => {
                  onLocationSelect({
                    city: city.name,
                    country: city.country,
                    coordinates: {
                      latitude: city.latitude,
                      longitude: city.longitude
                    }
                  });
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <div className="font-medium text-white/90">{city.name}</div>
                <div className="text-sm text-white/60">{city.country}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}