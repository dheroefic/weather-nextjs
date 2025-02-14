import './globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL('http://localhost:3001'),
  title: 'AI-Powered Weather App | Real-Time Weather Updates & Forecasts',
  description: 'Get accurate real-time weather updates, hourly forecasts, and multi-day predictions with our modern AI-powered weather application. Features dynamic weather visualization and location-based updates.',
  keywords: 'weather app, weather forecast, real-time weather, hourly forecast, local weather, AI weather app, weather predictions, weather updates',
  authors: [{ name: 'Weather App Team' }],
  openGraph: {
    title: 'AI-Powered Weather App | Real-Time Weather Updates & Forecasts',
    description: 'Get accurate real-time weather updates, hourly forecasts, and multi-day predictions with our modern AI-powered weather application.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/background-weather/a-default.jpg',
        width: 1200,
        height: 630,
        alt: 'AI-Powered Weather App Preview'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI-Powered Weather App | Real-Time Weather Updates & Forecasts',
    description: 'Get accurate real-time weather updates, hourly forecasts, and multi-day predictions with our modern AI-powered weather application.',
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
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-T52GQPGR');`
        }} />
        {/* End Google Tag Manager */}
        <link rel="icon" href="/weather-favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{
          __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T52GQPGR"
          height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }} />
        {/* End Google Tag Manager (noscript) */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
