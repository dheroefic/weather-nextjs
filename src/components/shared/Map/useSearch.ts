'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchLocations, formatSearchResults } from '@/services/geolocationService';
import type { SearchResult } from '@/services/geolocationService';

export interface UseSearchResult {
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  handleSearchResultSelect: (result: SearchResult) => void;
}

export interface UseSearchProps {
  onLocationSelect: (coordinates: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }) => void;
  debounceDelay?: number;
}

export const useSearch = ({ 
  onLocationSelect, 
  debounceDelay = 500 
}: UseSearchProps): UseSearchResult => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search functionality with debouncing
  const handleSearch = useCallback(async (query: string) => {
    if (!mountedRef.current) return;
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await searchLocations(query);
      if (mountedRef.current && response.success && response.data) {
        const formattedResults = formatSearchResults(response.data);
        setSearchResults(formattedResults);
      } else if (mountedRef.current) {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      if (mountedRef.current) {
        setSearchResults([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery) {
      searchTimeoutRef.current = window.setTimeout(() => {
        handleSearch(searchQuery);
      }, debounceDelay);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch, debounceDelay]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    onLocationSelect({
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.name,
      country: result.country
    });
    setSearchQuery('');
    setSearchResults([]);
  }, [onLocationSelect]);

  return {
    searchQuery,
    searchResults,
    isSearching,
    setSearchQuery,
    handleSearchResultSelect,
  };
};
