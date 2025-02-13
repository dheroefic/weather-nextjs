import React from 'react';

export const HeavyRainIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 18v4M8 18v4M12 20v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 10.1A5 5 0 0018 2a4.9 4.9 0 00-4 2.1A4 4 0 006 7a4 4 0 00.1 1A5 5 0 004 16h16a5 5 0 000-5.9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

export const PartlyCloudyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

export const FogIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 15h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const WindIcon = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);