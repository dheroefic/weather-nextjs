import './globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL('http://weather.dheroefic.my.id'),
  title: 'Real-Time Weather Updates & Forecasts',
  description: 'Get accurate real-time weather updates, hourly forecasts, and multi-day predictions. Features dynamic weather visualization and location-based updates.',
  keywords: 'weather app, weather forecast, real-time weather, hourly forecast, local weather, weather predictions, weather updates',
  authors: [{ name: 'Weather App Team' }],
  openGraph: {
    title: 'Real-Time Weather Updates & Forecasts',
    description: 'Get accurate real-time weather updates, hourly forecasts, and multi-day predictions.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/background-weather/a-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Weather App Preview'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real-Time Weather Updates & Forecasts',
    description: 'Get accurate real-time weather updates, hourly forecasts, and multi-day predictions with our modern weather application.',
    images: ['/background-weather/a-default.jpg']
  },
  alternates: {
    canonical: 'https://weather.app'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-T52GQPGR');
          `}
        </Script>
        <link rel="icon" href="/weather-favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-T52GQPGR"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
        <Analytics />
        <SpeedInsights />
        
        <Script id="service-worker-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
