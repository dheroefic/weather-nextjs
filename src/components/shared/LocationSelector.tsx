'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import citiesData from '@/data/cities.json';
import type { SearchResult } from '@/services/geolocationService';
import { searchLocations } from '@/services/geolocationService';

interface LocationSelectorProps {
  onLocationSelect: (location: { city: string; country: string; coordinates?: { latitude: number; longitude: number } }) => void;
  currentLocation: { city: string; country: string; coordinates?: { latitude: number; longitude: number } };
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function LocationSelector({ onLocationSelect, currentLocation, isOpen: externalIsOpen, onToggle }: LocationSelectorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cities] = useState<SearchResult[]>(citiesData);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use external isOpen if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const handleLocationSelect = (location: { city: string; country: string; coordinates?: { latitude: number; longitude: number } }) => {
    onLocationSelect(location);
    if (onToggle) {
      onToggle(); // Close the dropdown
    } else {
      setInternalIsOpen(false);
    }
    setSearchTerm('');
  };

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
        if (onToggle) {
          onToggle();
        } else {
          setInternalIsOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onToggle]);
  
  return (
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {e.stopPropagation(); handleToggle();} }
        className="desktop-control-button flex items-center gap-2 text-sm font-medium text-tertiary hover:text-secondary transition-all duration-200"
      >
        <svg
          className="w-4 h-4 flex-shrink-0 text-tertiary"
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
        <svg
          className={`w-4 h-4 flex-shrink-0 text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-[350px] z-[999] rounded-xl shadow-2xl" 
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="p-4">
            <input
              type="text"
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg outline-none text-white placeholder-white/60 focus:bg-white/15 focus:border-white/30 transition-all duration-200 mb-3"
            />
            <div className="max-h-[280px] overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-white/70">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </div>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="p-4 text-center text-white/70">
                  No results found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredResults.map((result, index) => (
                    <button
                      key={index}
                      className="w-full p-3 text-left rounded-lg hover:bg-white/15 transition-all duration-200 group"
                      onClick={() => handleLocationSelect({
                        city: result.name,
                        country: result.country,
                        coordinates: {
                          latitude: result.latitude,
                          longitude: result.longitude
                        }
                      })}
                    >
                      <div className="font-medium text-white/90 group-hover:text-white truncate">{result.name}</div>
                      <div className="text-sm text-white/70 group-hover:text-white/85 truncate">{result.country}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}