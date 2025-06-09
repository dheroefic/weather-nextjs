import { NearbyLocation } from '@/types/nearbyWeather';
import { WMO_CODES, getUVCategory, getWindDirection, fetchWeatherForeacastMultipleLocationApi } from './weatherService';
import { getOpenMeteoConfig } from '@/utils/openmeteoConfig';

// Get OpenMeteo configuration
const openMeteoConfig = getOpenMeteoConfig();

/**
 * Fetches nearby weather data points around a center location with an optimized distribution pattern
 * that adjusts based on zoom level to provide a better visual experience.
 */
export async function fetchNearbyWeatherData(
  centerLat: number, 
  centerLng: number, 
  zoomLevel?: number
): Promise<NearbyLocation[]> {
  // Use zoom level to dynamically adjust the distribution radius
  // Default zoom level is 13 (from MapPanel's defaultMapConfig)
  const effectiveZoomLevel = zoomLevel || 13;
  
  // Dynamically adjust radius based on zoom level
  // At higher zoom levels (zoomed in), use smaller radius
  // At lower zoom levels (zoomed out), use larger radius
  const baseRadiusKm = 50; // Base radius
  const zoomFactor = Math.pow(0.8, effectiveZoomLevel - 13); // Exponential scaling relative to default zoom
  const radiusKm = Math.max(10, baseRadiusKm * zoomFactor); // Ensure minimum radius of 10km
  
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  
  // Dynamically adjust number of points based on zoom level
  // More points when zoomed out, fewer when zoomed in
  const baseNumPoints = 8;
  let numPoints = baseNumPoints;
  
  // When zoomed in very close, show fewer points
  if (effectiveZoomLevel >= 15) {
    numPoints = 6;
  } 
  // When zoomed out far, show more points
  else if (effectiveZoomLevel <= 10) {
    numPoints = 12;
  }
  
  const points: { latitude: number; longitude: number }[] = [];
  
  // Create two rings of points with staggered angles for better distribution
  const innerRingPoints = Math.floor(numPoints / 2);
  const outerRingPoints = numPoints - innerRingPoints;
  
  // Create inner ring (closer to center)
  for (let i = 0; i < innerRingPoints; i++) {
    const angle = (2 * Math.PI * i) / innerRingPoints;
    
    // Inner ring uses 40-60% of the radius
    const radiusVariation = 0.4 + (Math.random() * 0.2);
    const currentRadius = radiusKm * radiusVariation;
    const currentLatDelta = currentRadius / 111;
    const currentLngDelta = currentRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    
    // Calculate position using polar coordinates
    const lat = centerLat + currentLatDelta * Math.sin(angle);
    const lng = centerLng + currentLngDelta * Math.cos(angle);
    
    // Add small random jitter for more organic look
    const jitterScale = 0.1 * zoomFactor; // Less jitter when zoomed in
    const randomLat = (Math.random() - 0.5) * latDelta * jitterScale;
    const randomLng = (Math.random() - 0.5) * lngDelta * jitterScale;
    
    points.push({
      latitude: lat + randomLat,
      longitude: lng + randomLng,
    });
  }
  
  // Create outer ring (farther from center)
  for (let i = 0; i < outerRingPoints; i++) {
    // Stagger the angles between inner and outer rings
    const angleOffset = Math.PI / outerRingPoints;
    const angle = angleOffset + (2 * Math.PI * i) / outerRingPoints;
    
    // Outer ring uses 80-100% of the radius
    const radiusVariation = 0.8 + (Math.random() * 0.2);
    const currentRadius = radiusKm * radiusVariation;
    const currentLatDelta = currentRadius / 111;
    const currentLngDelta = currentRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    
    // Calculate position using polar coordinates
    const lat = centerLat + currentLatDelta * Math.sin(angle);
    const lng = centerLng + currentLngDelta * Math.cos(angle);
    
    // Add small random jitter for more organic look
    const jitterScale = 0.1 * zoomFactor; // Less jitter when zoomed in
    const randomLat = (Math.random() - 0.5) * latDelta * jitterScale;
    const randomLng = (Math.random() - 0.5) * lngDelta * jitterScale;
    
    points.push({
      latitude: lat + randomLat,
      longitude: lng + randomLng,
    });
  }

  const latitudes = points.map(point => point.latitude.toString()).join(',');
  const longitudes = points.map(point => point.longitude.toString()).join(',');
  
  try {
    const responses = await fetchWeatherForeacastMultipleLocationApi(`${openMeteoConfig.baseUrl}/forecast`, {
      latitude: latitudes,
      longitude: longitudes,
      hourly: [
        'temperature_2m',
        'weathercode',
        'windspeed_10m',
        'winddirection_10m',
        'precipitation_probability',
        'uv_index',
        'relative_humidity_2m',
        'surface_pressure'
      ],
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'weathercode',
        'precipitation_probability_max',
        'uv_index_max'
      ],
      timezone: 'auto'
    });

    const currentIndex = new Date().getHours();
    const nearbyLocations: NearbyLocation[] = [];

    // Add some variability to which data points we actually display
    // This helps prevent too many icons in one area
    const displayProbability = 0.8; // 80% chance of displaying each point

    responses.forEach((response, i) => {
      // Skip some points randomly to reduce density in areas with many weather icons
      // but ensure we always have at least 4 points
      if (nearbyLocations.length < 4 || Math.random() < displayProbability) {
        const weatherCode = response.hourly.weathercode[currentIndex];
        const weatherInfo = WMO_CODES[weatherCode] || WMO_CODES[0];

        // Generate a more descriptive name based on cardinal direction from center
        const lat = points[i].latitude;
        const lng = points[i].longitude;
        const latDiff = lat - centerLat;
        const lngDiff = lng - centerLng;
        
        // Determine cardinal direction (N, NE, E, SE, S, SW, W, NW)
        const angle = Math.atan2(latDiff, lngDiff) * (180 / Math.PI);
        let direction = '';
        
        if (angle >= -22.5 && angle < 22.5) direction = 'East';
        else if (angle >= 22.5 && angle < 67.5) direction = 'Northeast';
        else if (angle >= 67.5 && angle < 112.5) direction = 'North';
        else if (angle >= 112.5 && angle < 157.5) direction = 'Northwest';
        else if (angle >= 157.5 || angle < -157.5) direction = 'West';
        else if (angle >= -157.5 && angle < -112.5) direction = 'Southwest';
        else if (angle >= -112.5 && angle < -67.5) direction = 'South';
        else if (angle >= -67.5 && angle < -22.5) direction = 'Southeast';
        
        // Calculate approximate distance in km
        const distanceKm = Math.round(
          Math.sqrt(
            Math.pow(111 * latDiff, 2) + 
            Math.pow(111 * Math.cos(centerLat * Math.PI / 180) * lngDiff, 2)
          )
        );
        
        const nearbyLocation: NearbyLocation = {
          latitude: points[i].latitude,
          longitude: points[i].longitude,
          city: `${direction} (${distanceKm}km)`,
          country: '',
          weatherData: {
            currentWeather: {
              temperature: response.hourly.temperature_2m[currentIndex],
              humidity: response.hourly.relative_humidity_2m[currentIndex],
              pressure: response.hourly.surface_pressure[currentIndex],
              wind: {
                speed: response.hourly.windspeed_10m[currentIndex],
                direction: getWindDirection(response.hourly.winddirection_10m[currentIndex]),
              },
              icon: weatherInfo.icon,
              condition: weatherInfo.condition,
              precipitation: response.hourly.precipitation_probability[currentIndex],
              uvIndex: {
                value: response.hourly.uv_index[currentIndex],
                category: getUVCategory(response.hourly.uv_index[currentIndex]),
              },
            },
          },
        };
        nearbyLocations.push(nearbyLocation);
      }
    });

    return nearbyLocations;
  } catch (error) {
    console.error('Error fetching nearby weather data:', error);
    return [];
  }
}
