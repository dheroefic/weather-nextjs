'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import citiesData from '@/data/cities.json';
import type { SearchResult } from '@/services/geolocationService';
import { searchLocations } from '@/services/geolocationService';

interface LocationSelectorProps {
  onLocationSelect: (location: { city: string; country: string; coordinates?: { latitude: number; longitude: number } }) => void;
  currentLocation: { city: string; country: string; coordinates?: { latitude: number; longitude: number } };
}

export default function LocationSelector({ onLocationSelect, currentLocation }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cities] = useState<SearchResult[]>(citiesData);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
  
    setIsSearching(true);
    try {
      const response = await searchLocations(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
        console.warn('No results found or invalid response format');
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchTerm);
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, handleSearch]);

  const filteredResults = searchTerm ? searchResults : cities.slice(0, 5);

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
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {e.stopPropagation(); setIsOpen(!isOpen);} }
        className="text-base md:text-xl font-semibold bg-black/40 px-3 py-1.5 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:bg-black/50 flex items-center gap-2 shadow-md"
      >
        <svg
          className="w-4 h-4 flex-shrink-0"
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
        <div className="truncate">
          {currentLocation.city}, {currentLocation.country}
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[300px] md:w-[400px] rounded-lg bg-black/80 backdrop-blur-xl shadow-2xl z-[999] border border-white/10" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            placeholder="Search cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-black/60 border-none outline-none text-white placeholder-white/50 rounded-t-lg focus:bg-black/70 transition-colors duration-200"
          />
          <div className="max-h-[320px] overflow-y-auto divide-y divide-white/20">
            {isSearching ? (
              <div className="p-3 text-center text-white/60">
                Searching...
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-3 text-center text-white/60">
                No results found
              </div>
            ) : filteredResults.map((result, index) => (
              <button
                key={index}
                className="w-full p-3 text-left hover:bg-white/10 transition-colors duration-200"
                onClick={() => {
                  onLocationSelect({
                    city: result.name,
                    country: result.country,
                    coordinates: {
                      latitude: result.latitude,
                      longitude: result.longitude
                    }
                  });
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <div className="font-medium text-white/90 truncate max-w-[calc(100%-1rem)]">{result.name}</div>
                <div className="text-sm text-white/60 truncate max-w-[calc(100%-1rem)]">{result.country}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}