# Weather App

A modern weather application that provides detailed weather information and forecasts using the OpenMeteo API.

## Features

- Real-time weather information
- Hourly and daily weather forecasts
- Detailed weather metrics including:
  - Temperature
  - Wind speed and direction
  - UV index
  - Precipitation probability
  - Humidity
  - Atmospheric pressure
- Location search functionality
- Responsive design with glass-morphism UI
- Dynamic weather-based backgrounds

## Technology Stack

- **Frontend Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: 
  - Tailwind CSS
  - CSS Modules
- **Weather Data**: OpenMeteo API
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/app` - Next.js application pages and layouts
- `/src/components` - Reusable React components
- `/src/services` - API integration and business logic
- `/src/types` - TypeScript type definitions
- `/src/utils` - Utility functions
- `/public` - Static assets including weather icons and backgrounds

## License

This project is licensed under the MIT License - see the LICENSE file for details.