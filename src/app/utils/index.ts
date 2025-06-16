import { useMemo } from 'react';

export function useAppUtils() {
  // Memoized utility functions to prevent unnecessary re-renders
  const formatDate = useMemo(() => (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const formatTime = useMemo(() => (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  const getWindRotationDegree = useMemo(() => (direction: string): number => {
    const directions = {
      'North': 0,
      'Northeast': 45,
      'East': 90,
      'Southeast': 135,
      'South': 180,
      'Southwest': 225,
      'West': 270,
      'Northwest': 315
    };
    return directions[direction as keyof typeof directions] || 0;
  }, []);

  return {
    formatDate,
    formatTime,
    getWindRotationDegree
  };
}
