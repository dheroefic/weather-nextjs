# Weather App

**Copyright © 2025 dheroefic**

A modern, enterprise-grade weather application built with Next.js 15 that provides comprehensive weather information through an intuitive, glass-morphism interface. The app combines real-time weather data, interactive maps, and advanced backend infrastructure for a complete weather platform experience.

## ✨ Features

### 🌤️ Weather Information
- **Real-time weather data** with automatic refresh capabilities (1-15 minute intervals)
- **Extended weather forecasts** with customizable periods (4, 8, or 14 days)
- **Comprehensive weather metrics** including:
  - Temperature with Celsius/Fahrenheit conversion
  - Wind speed, direction, and Beaufort scale classification  
  - UV index with safety recommendations and color coding
  - Precipitation probability and amounts
  - Humidity and atmospheric pressure
  - Cloud coverage and visibility
  - Sunrise/sunset times with precise calculations

### 🗺️ Interactive Features
- **Dual-layout responsive design** (Desktop & Mobile optimized)
- **Interactive weather maps** with nearby location clustering
- **Embedded and fullscreen map modes** with smooth transitions
- **Real-time location search** with autocomplete functionality
- **Geolocation services** with privacy-focused location detection
- **Multi-location weather comparison** with efficient data distribution

### 🎨 User Experience & Design
- **Adaptive responsive layouts** with automatic desktop/mobile detection
- **Glass-morphism UI design** with modern blur effects and transparency
- **Dynamic weather-based backgrounds** from Unsplash API and static assets
- **Smooth animations and transitions** with optimized performance
- **Accessibility-first approach** with proper ARIA labels and keyboard navigation
- **Dark theme optimized** with high contrast ratios

### 🔐 API & Authentication System
- **Enterprise API key management** with bcrypt hashing
- **Role-based access control** (Root, Admin, User permissions)
- **Advanced rate limiting** with sliding window algorithm
- **Comprehensive audit logging** with request tracking
- **Supabase backend integration** with Row Level Security (RLS)
- **Admin management tools** for API key creation and monitoring

### 📊 Advanced Analytics & Performance
- **Vercel Analytics** integration for performance monitoring
- **Speed Insights** with Core Web Vitals tracking
- **Performance dashboard** (development only) with real-time metrics
- **Advanced caching layers** with dual memory/localStorage strategy
- **Request deduplication** to prevent redundant API calls
- **Service Worker integration** for offline capability

### 🗄️ Backend Infrastructure
- **PostgreSQL database** with optimized geocoding data
- **Country and region geocoding** with ISO 3166-2 standard
- **Weather data distribution** with intelligent nearby location algorithms
- **Background image management** with Unsplash API integration
- **Audit logging system** with IP tracking and usage analytics

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.4.4 with Turbopack and App Router
- **Runtime**: React 19.1.1 with concurrent features
- **Language**: TypeScript 5+ with strict type checking
- **Styling**: Tailwind CSS 4.1.11 with custom design system
- **Maps**: Leaflet with React-Leaflet 5.0 integration
- **Performance**: Critters for CSS optimization, Service Worker

### Backend & Database
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Authentication**: Custom API key system with JWT integration
- **ORM**: Supabase client with TypeScript types
- **Caching**: Multi-layer caching (Memory + LocalStorage)
- **Rate Limiting**: Custom sliding window implementation

### APIs & Services
- **Weather Data**: OpenMeteo API with optimized requests
- **Geocoding**: Custom Supabase-based geocoding service
- **Background Images**: Unsplash API (configurable)
- **Analytics**: Vercel Analytics & Speed Insights
- **Package Manager**: pnpm with workspace optimization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dheroefic/weather-nextjs.git
   cd weather-nextjs
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Database Setup (Required for API features)**
   
   Create a Supabase project and apply the database schema:
   ```bash
   # Apply the schema to your Supabase database
   ./scripts/apply-schema.sh
   
   # Or manually with psql
   psql "$SUPABASE_URL" -f database/schema.sql
   ```

4. **Environment Configuration**
   
   Copy the example environment file and configure:
   ```bash
   cp .env.example .env.local
   ```
   
   **Required variables:**
   ```bash
   # Supabase Configuration (Required for API features)
   SUPABASE_URL="your_supabase_project_url"
   NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"  
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
   SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
   
   # Database Connection
   POSTGRES_URL="your_postgres_connection_string"
   
   # Admin Security (Required for API key management)
   ADMIN_SECRET="your_super_secret_admin_key_here"
   ```
   
   **Optional variables:**
   ```bash
   # OpenMeteo API (free tier available)
   NEXT_PUBLIC_OPENMETEO_API_KEY="your_openmeteo_api_key"
   NEXT_PUBLIC_OPENMETEO_API_URL="https://api.open-meteo.com/v1"
   
   # Unsplash API for dynamic backgrounds  
   UNSPLASH_ACCESS_KEY="your_unsplash_access_key"
   
   # Feature flags
   NEXT_PUBLIC_ENABLE_UNSPLASH="true"
   NEXT_PUBLIC_DEBUG="false"
   NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT="true"
   
   # Generated API key for frontend use
   NEXT_PUBLIC_GEOCODING_API_KEY="your_generated_api_key"
   ```

5. **Create API Keys (For geocoding and weather features)**
   
   Create your first API key for frontend authentication:
   ```bash
   # Start the development server first
   pnpm dev
   
   # In a new terminal, create an API key
   node scripts/create-api-key.js
   
   # Copy the generated API key to your .env.local as NEXT_PUBLIC_GEOCODING_API_KEY
   ```

6. **Start the development server**
   ```bash
   pnpm run dev
   ```

7. **Open your browser**
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
│   ├── app/                        # Next.js 15 App Router
│   │   ├── api/                    # API routes with authentication
│   │   │   ├── admin/              # Admin endpoints for API key management
│   │   │   ├── api-keys/           # User API key CRUD operations
│   │   │   ├── background/         # Dynamic background image service
│   │   │   └── geocoding/          # Location search and reverse geocoding
│   │   ├── components/             # App-specific components
│   │   │   └── WeatherApp.tsx      # Main application component
│   │   ├── hooks/                  # App-level React hooks
│   │   ├── styles/                 # Global styles and CSS modules
│   │   ├── utils/                  # App-specific utilities
│   │   ├── globals.css             # Global Tailwind styles
│   │   ├── layout.tsx              # Root layout with analytics
│   │   └── page.tsx                # Homepage
│   ├── components/                 # Reusable UI components
│   │   ├── desktop/                # Desktop-specific layouts
│   │   │   ├── DesktopLayout.tsx   # Main desktop layout
│   │   │   └── EmbeddedMap.tsx     # Embedded map component
│   │   ├── mobile/                 # Mobile-specific layouts
│   │   │   └── MobileLayout.tsx    # Mobile layout component
│   │   └── shared/                 # Cross-platform shared components
│   │       ├── CurrentWeather/     # Current weather display
│   │       ├── DailyForecast/      # Multi-day forecast
│   │       ├── HourlyForecast/     # Hourly predictions
│   │       ├── Map/                # Map components and utilities
│   │       ├── WeatherMetrics/     # Detailed weather data
│   │       ├── ResponsiveLayout.tsx # Adaptive layout switcher
│   │       └── index.ts            # Component exports
│   ├── hooks/                      # Custom React hooks
│   │   ├── useMapLocationUpdate.ts # Map interaction handling
│   │   ├── useNearbyWeather.ts     # Nearby location weather data
│   │   └── useWeatherData.ts       # Main weather data management
│   ├── lib/                        # Core backend libraries
│   │   ├── apiKeyManager.ts        # API key CRUD operations
│   │   ├── auditLogger.ts          # Request logging and analytics
│   │   ├── authMiddleware.ts       # Authentication middleware
│   │   ├── rateLimiter.ts          # Rate limiting implementation
│   │   └── supabase.ts             # Database client configuration
│   ├── services/                   # External API integrations
│   │   ├── backgroundService.ts    # Unsplash image service
│   │   ├── cacheService.ts         # Multi-layer caching
│   │   ├── geocodingService.ts     # Location services
│   │   ├── geolocationService.ts   # Browser geolocation
│   │   ├── weatherDistribution.ts  # Nearby weather distribution
│   │   └── weatherService.ts       # OpenMeteo API integration
│   ├── types/                      # TypeScript definitions
│   │   ├── geocoding.ts            # Geocoding API types
│   │   ├── nearbyWeather.ts        # Nearby weather data types
│   │   └── weather.ts              # Core weather data types
│   └── utils/                      # Utility functions
│       ├── debug.ts                # Development debugging tools
│       ├── featureFlags.ts         # Feature flag management
│       ├── geocodingCache.ts       # Geocoding cache utilities
│       ├── mapLocationUtils.ts     # Map location helpers
│       ├── mapUtility.ts           # Map component utilities
│       ├── openmeteoConfig.ts      # OpenMeteo configuration
│       └── performance.ts          # Performance monitoring
├── database/                       # Database schema and migrations
│   ├── schema.sql                  # Complete database schema
│   ├── country_grid.sql            # Country boundary data
│   ├── country_name_sub.sql        # Country and region names
│   └── iso31662.json               # ISO country codes
├── docs/                           # Documentation
│   ├── ADMIN_API_KEYS.md           # API key management guide
│   ├── AUTHENTICATION.md           # Authentication system docs
│   └── GEOCODING.md                # Geocoding service documentation
├── public/                         # Static assets
│   ├── icons/weathers/             # Weather condition icons (SVG)
│   ├── background-weather/         # Static background images
│   ├── sw.js                       # Service Worker
│   └── weather-favicon.svg         # Application favicon
├── scripts/                        # Utility scripts
│   ├── apply-schema.sh             # Database schema application
│   ├── create-api-key.js           # API key creation script
│   ├── create-root-api-key.sh      # Root API key creation
│   └── setup-database.sh           # Complete database setup
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── package.json                    # Dependencies and scripts
└── pnpm-workspace.yaml             # pnpm workspace configuration
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| **Database & Backend** |
| `SUPABASE_URL` | Supabase project URL | **Yes** | - |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL | **Yes** | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | **Yes** | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | **Yes** | - |
| `POSTGRES_URL` | PostgreSQL connection string | **Yes** | - |
| `ADMIN_SECRET` | Admin endpoint protection secret | **Yes** | - |
| **API Keys** |
| `NEXT_PUBLIC_GEOCODING_API_KEY` | Generated API key for frontend | **Yes** | - |
| `NEXT_PUBLIC_OPENMETEO_API_KEY` | OpenMeteo API key (optional) | No | - |
| `UNSPLASH_ACCESS_KEY` | Unsplash API for backgrounds | No | - |
| **API Configuration** |
| `NEXT_PUBLIC_OPENMETEO_API_URL` | OpenMeteo API endpoint | No | `https://api.open-meteo.com/v1` |
| **Feature Flags** |
| `NEXT_PUBLIC_ENABLE_UNSPLASH` | Enable Unsplash backgrounds | No | `false` |
| `NEXT_PUBLIC_DEBUG` | Enable debug logging | No | `false` |
| `NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT` | Enable desktop layout | No | `true` |

### API Management

#### Creating API Keys

For development and testing:
```bash
# Create a user-level API key
node scripts/create-api-key.js

# Create with custom settings
node scripts/create-api-key.js "http://localhost:3000" "My API Key" "user"
```

For production deployment:
```bash
# Create root-level API key for admin operations
node scripts/create-api-key.js "https://your-domain.com" "Production Admin Key" "root"
```

#### API Endpoints

- **`GET /api/geocoding`** - Location search and reverse geocoding
- **`GET /api/background`** - Dynamic weather-based backgrounds
- **`GET /api/api-keys`** - List user API keys
- **`POST /api/api-keys`** - Create new API key
- **`PUT /api/api-keys/[id]`** - Update API key
- **`DELETE /api/api-keys/[id]`** - Delete API key
- **`POST /api/admin/api-keys`** - Admin: Create API key (requires admin secret)

### Features Configuration

#### Desktop Layout
Toggle between mobile-only and responsive desktop/mobile layouts:
```bash
# Enable desktop layout (default)
NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT=true

# Mobile-only mode
NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT=false
```

#### Background Images
Configure dynamic background sources:
```bash
# Use Unsplash API for dynamic backgrounds
NEXT_PUBLIC_ENABLE_UNSPLASH=true
UNSPLASH_ACCESS_KEY=your_key

# Use only static backgrounds
NEXT_PUBLIC_ENABLE_UNSPLASH=false
```

#### Debug Mode
Enable detailed logging for development:
```bash
NEXT_PUBLIC_DEBUG=true
```

### Rate Limiting Configuration

Default rate limits (configurable in `src/lib/rateLimiter.ts`):

| Endpoint Type | Requests | Window | Description |
|---------------|----------|---------|-------------|
| Default | 100 | 1 minute | General API endpoints |
| Weather | 100 | 1 minute | Weather data requests |
| Auth | 10 | 1 minute | Authentication operations |
| Heavy | 20 | 1 minute | Resource-intensive operations |

### Cache Configuration

Multi-layer caching system:
- **Memory Cache**: In-memory for session-based caching
- **LocalStorage**: Persistent browser caching
- **Weather Data**: 10-minute expiry
- **Location Data**: 24-hour expiry

Configure cache behavior in `src/services/cacheService.ts`.

## 🚀 API Documentation

### Authentication

All API endpoints require authentication via API key:

```bash
# Using Authorization header (recommended)
curl -H "Authorization: Bearer wapi_your_api_key_here" \
     https://your-domain.com/api/geocoding?latitude=40.7128&longitude=-74.0060

# Using X-API-Key header
curl -H "X-API-Key: wapi_your_api_key_here" \
     https://your-domain.com/api/geocoding?search=New+York

# Using query parameter (less secure)
curl "https://your-domain.com/api/geocoding?search=London&api_key=wapi_your_api_key_here"
```

### Core Endpoints

#### Geocoding API
**GET** `/api/geocoding`

Reverse geocoding and location search:
```bash
# Reverse geocoding
curl -H "Authorization: Bearer wapi_xxx" \
  "/api/geocoding?latitude=40.7128&longitude=-74.0060"

# Location search
curl -H "Authorization: Bearer wapi_xxx" \
  "/api/geocoding?search=New+York&language=en"
```

#### Background Images API
**GET** `/api/background`

Weather-themed background images:
```bash
# Get background for weather condition
curl -H "Authorization: Bearer wapi_xxx" \
  "/api/background?condition=sunny&quality=regular"

# Available conditions: sunny, cloudy, rainy, snowy, stormy
# Quality options: small, regular, full
```

### API Key Management

#### User API Keys
```bash
# List user's API keys
GET /api/api-keys

# Create new API key
POST /api/api-keys
{
  "name": "My App Key",
  "expiresInDays": 365
}

# Update API key
PUT /api/api-keys/{id}
{
  "name": "Updated Name",
  "is_active": true
}

# Delete API key
DELETE /api/api-keys/{id}
```

#### Admin API Keys (Requires Admin Secret)
```bash
# Create admin/root API key
POST /api/admin/api-keys
Headers: X-Admin-Secret: your_admin_secret

{
  "name": "Admin Key",
  "role": "root",
  "expiresInDays": 365
}

# List all API keys
GET /api/admin/api-keys
Headers: X-Admin-Secret: your_admin_secret
```

### Rate Limiting

API responses include rate limiting headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641234567
Retry-After: 60
```

### Error Responses

Standard error format:
```json
{
  "error": "Error description",
  "details": "Additional details (development only)",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (insufficient permissions)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Webhook Support

For real-time weather updates, the API supports webhook notifications:
```bash
# Register webhook endpoint
POST /api/webhooks
{
  "url": "https://your-app.com/weather-webhook",
  "events": ["weather.updated", "alert.issued"],
  "locations": [
    {"latitude": 40.7128, "longitude": -74.0060}
  ]
}
```

## 🔐 Security Features

### API Key Security
- **Bcrypt hashing** for secure storage
- **Prefix validation** (`wapi_` prefix required)
- **Expiration dates** with automatic deactivation
- **Role-based permissions** (root, admin, user)
- **Rate limiting** per key and endpoint

### Request Security
- **CORS headers** properly configured
- **Content Security Policy** headers
- **Request size limits** to prevent abuse
- **IP-based rate limiting** as fallback
- **Audit logging** for all requests

### Database Security
- **Row Level Security (RLS)** enabled
- **User isolation** for API keys and logs
- **Prepared statements** to prevent SQL injection
- **Connection pooling** with secure credentials

## 🚀 Deployment

### Prerequisites
1. **Supabase project** with database
2. **Domain/hosting** (Vercel recommended)
3. **API keys** for external services

### Environment Setup
```bash
# Production environment variables
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ADMIN_SECRET="production-admin-secret"
UNSPLASH_ACCESS_KEY="your-unsplash-key"
```

### Build & Deploy
```bash
# Build for production
pnpm build

# Deploy to Vercel
vercel --prod

# Or deploy manually
pnpm start
```

### Database Migration
```bash
# Apply schema to production database
POSTGRES_URL="your-production-db-url" ./scripts/apply-schema.sh
```

### Post-Deployment
1. **Create admin API key** for management
2. **Configure DNS** and SSL certificates  
3. **Set up monitoring** and alerts
4. **Test all endpoints** with production keys
5. **Configure backup** strategies

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### Development Setup
1. **Fork the repository** and clone locally
2. **Install dependencies**: `pnpm install`
3. **Set up environment** following the installation guide
4. **Create feature branch**: `git checkout -b feature/amazing-feature`

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Follow the configured rules
- **Formatting**: Use Prettier for consistent code style
- **Testing**: Add tests for new features
- **Documentation**: Update docs for API changes

### Submission Process
1. **Test thoroughly** in both mobile and desktop layouts
2. **Verify API functionality** with proper authentication
3. **Update documentation** if needed
4. **Commit with descriptive messages**: `git commit -m 'feat: add weather alerts system'`
5. **Push to your fork**: `git push origin feature/amazing-feature`
6. **Open a Pull Request** with detailed description

## 📚 Additional Documentation

For detailed documentation on specific features:

- **[API Authentication Guide](docs/AUTHENTICATION.md)** - Complete authentication system
- **[Admin API Keys Guide](docs/ADMIN_API_KEYS.md)** - API key management
- **[Geocoding Service](docs/GEOCODING.md)** - Location services documentation

## 📝 API Credits & Acknowledgments

### Core Services
- **Weather Data**: [OpenMeteo](https://open-meteo.com/) - High-quality, free weather API
- **Maps**: [OpenStreetMap](https://www.openstreetmap.org/) via [Leaflet](https://leafletjs.com/)
- **Background Images**: [Unsplash](https://unsplash.com/) - Beautiful photography API
- **Database**: [Supabase](https://supabase.com/) - Open source Firebase alternative

### Technologies  
- **Framework**: [Next.js](https://nextjs.org/) - React production framework
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics) - Privacy-friendly analytics
- **Hosting**: [Vercel](https://vercel.com/) - Frontend deployment platform

### Special Thanks
- **OpenMeteo team** for providing free, high-quality weather data
- **Supabase team** for the excellent database platform
- **Next.js team** for the amazing React framework
- **Open source community** for the incredible libraries and tools

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Commercial use** allowed
- ✅ **Modification** allowed  
- ✅ **Distribution** allowed
- ✅ **Private use** allowed
- ⚠️ **License and copyright notice** must be included
- ❌ **No warranty or liability** provided

## 📞 Support & Community

### Getting Help
- **📖 Documentation**: Check the [docs](docs/) directory
- **🐛 Bug Reports**: Open an [issue](https://github.com/dheroefic/weather-nextjs/issues)
- **💡 Feature Requests**: Start a [discussion](https://github.com/dheroefic/weather-nextjs/discussions)
- **❓ Questions**: Ask in [discussions](https://github.com/dheroefic/weather-nextjs/discussions/categories/q-a)

### Connect
- **GitHub**: [@dheroefic](https://github.com/dheroefic)
- **Project**: [weather-nextjs](https://github.com/dheroefic/weather-nextjs)

<div align="center">

**Built with ❤️ using Next.js 15, React 19, and modern web technologies**

[⭐ Star this repository](https://github.com/dheroefic/weather-nextjs) if you found it helpful!

</div>