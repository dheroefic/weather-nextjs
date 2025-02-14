'use client';

interface ImageAttribution {
  photographerName: string;
  photographerUsername: string;
  photographerUrl: string;
}

interface FooterProps {
  imageAttribution: ImageAttribution | null;
}

export default function Footer({ imageAttribution }: FooterProps) {
  return (
    <div className="glass-container p-2 text-center text-[10px] text-white/40 rounded-lg backdrop-blur-md bg-white/5 mt-4">
      <p>
        Created with 🩷 by dheroefic • Images: {imageAttribution ? (
          <>
            Photo by <a href={imageAttribution.photographerUrl} className="hover:text-white/60" target="_blank" rel="noopener noreferrer">{imageAttribution.photographerName}</a> on <a href="https://unsplash.com" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Unsplash</a>
          </>
        ) : (
          <a href="https://unsplash.com" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Unsplash</a>
        )} • Weather Data: <a href="https://open-meteo.com" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Open Meteo</a> • Icons: <a href="https://bas.dev/about" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Bas Milius</a>
      </p>
    </div>
  );
}