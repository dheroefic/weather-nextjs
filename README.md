# Weather App

A modern, feature-rich weather application built with Next.js 15 that provides comprehensive weather information with an intuitive, glass-morphism interface. The app combines real-time weather data with interactive maps and dynamic backgrounds for an engaging user experience.

## ✨ Features

### 🌤️ Weather Information
- **Real-time weather data** with automatic refresh capabilities
- **Detailed hourly and daily forecasts** with extended 7-day outlook
- **Comprehensive weather metrics** including:
  - Temperature with Celsius/Fahrenheit conversion
  - Wind speed, direction, and Beaufort scale classification
  - UV index with safety recommendations
  - Precipitation probability and amounts
  - Humidity and atmospheric pressure
  - Visibility and cloud coverage
  - Sunrise/sunset times

### 🗺️ Interactive Features
- **Interactive weather maps** with nearby location data
- **Location search** with autocomplete functionality
- **Geolocation services** for automatic location detection
- **Multiple location management** for weather comparison

### 🎨 User Experience
- **Dynamic weather-based backgrounds** with both static and Unsplash API integration
- **Glass-morphism UI design** with modern, responsive layouts
- **Auto-refresh functionality** with configurable intervals
- **Temperature unit conversion** (Celsius/Fahrenheit)
- **Performance optimizations** with caching services
- **Mobile-responsive design** optimized for all devices

### 📊 Advanced Analytics
- **Vercel Analytics** integration for performance monitoring
- **Speed Insights** for optimal user experience
- **Weather pattern analysis** and historical data context

## 🛠️ Technology Stack

- **Frontend Framework**: Next.js 15.3.3 with Turbopack
- **Runtime**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4+ with custom components
- **Maps**: Leaflet with React-Leaflet integration
- **Weather Data**: OpenMeteo API with openmeteo client
- **Background Images**: Unsplash API (optional)
- **Analytics**: Vercel Analytics & Speed Insights
- **Performance**: Critters for CSS optimization
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/weather-nextjs.git
   cd weather-nextjs
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration (Optional)**
   
   For enhanced features, copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Then add your API keys to `.env.local`:
   ```bash
   # Unsplash API for dynamic backgrounds (server-side secure)
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key
   
   # Enable Unsplash backgrounds (client-side feature flag)
   NEXT_PUBLIC_ENABLE_UNSPLASH=true
   
   # Optional: Custom API endpoints
   NEXT_PUBLIC_WEATHER_API_URL=your_custom_weather_api
   ```

4. **Start the development server**
   ```bash
   pnpm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start
```

## 📁 Project Structure

```
weather-nextjs/
├── src/
│   ├── app/                    # Next.js 15 app directory
│   │   ├── components/         # App-specific components
│   │   │   ├── WeatherApp.tsx  # Main weather application
│   │   │   ├── CurrentWeather/ # Current weather display
│   │   │   ├── Forecast/       # Weather forecast components
│   │   │   ├── Maps/           # Interactive map components
│   │   │   └── BackgroundManager/ # Dynamic background system
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/             # Reusable UI components
│   │   ├── ui/                # Base UI components
│   │   ├── WeatherMetrics/    # Weather data displays
│   │   ├── LocationSearch/    # Location search functionality
│   │   └── UnitConverter/     # Temperature unit conversion
│   ├── services/              # API integration and business logic
│   │   ├── weatherService.ts  # OpenMeteo API integration
│   │   ├── locationService.ts # Geolocation services
│   │   ├── cacheService.ts    # Performance caching
│   │   └── unsplashService.ts # Background image service
│   ├── types/                 # TypeScript type definitions
│   │   ├── weather.ts         # Weather data types
│   │   └── location.ts        # Location data types
│   ├── utils/                 # Utility functions
│   │   ├── weatherUtils.ts    # Weather calculation helpers
│   │   ├── formatters.ts      # Data formatting utilities
│   │   └── constants.ts       # Application constants
│   └── hooks/                 # Custom React hooks
│       ├── useWeather.ts      # Weather data management
│       ├── useLocation.ts     # Location management
│       └── useLocalStorage.ts # Persistent storage
├── public/                    # Static assets
│   ├── weather-icons/         # Weather condition icons
│   ├── backgrounds/           # Static background images
│   └── favicon.ico           # Application favicon
└── package.json              # Project dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `UNSPLASH_ACCESS_KEY` | Unsplash API key for dynamic backgrounds (server-side only) | No |
| `NEXT_PUBLIC_ENABLE_UNSPLASH` | Feature flag to enable Unsplash backgrounds (client-side safe) | No |
| `NEXT_PUBLIC_WEATHER_API_URL` | Custom weather API endpoint | No |

### Features Configuration

The app includes several configurable features:

- **Auto-refresh intervals**: Customizable through user preferences
- **Background sources**: Toggle between static images and Unsplash API
- **Temperature units**: User-selectable Celsius/Fahrenheit
- **Map providers**: Configurable map tile sources
- **Cache duration**: Adjustable API response caching

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Credits

- **Weather Data**: [OpenMeteo](https://open-meteo.com/) - Free weather API
- **Maps**: [OpenStreetMap](https://www.openstreetmap.org/) via Leaflet
- **Background Images**: [Unsplash](https://unsplash.com/) (optional)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenMeteo for providing free, high-quality weather data
- Unsplash for beautiful weather-related imagery
- The Next.js team for an excellent framework
- The open-source community for the amazing libraries used in this project