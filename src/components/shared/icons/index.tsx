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

export const WindIcon = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PrecipitationIcon = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2v2M12 8v2M12 14v2M12 20v2M4 4l1.414 1.414M18.586 18.586L20 20M2 12h2M20 12h2M4 20l1.414-1.414M18.586 5.414L20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const UVIndexIcon = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M18.4 18.4l.7.7M18.4 5.6l-.7.7M5.6 18.4l-.7.7M17.5 12a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const HumidityIcon = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PressureIcon = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);