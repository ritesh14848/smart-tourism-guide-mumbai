/**
 * Weather Service for Mumbai & Suburbs
 * Uses Open-Meteo free public API (No API key needed) with offline fallback
 */

const WeatherService = {
  MUMBAI_COORDS: {
    lat: 18.9220,
    lng: 72.8347
  },

  // WMO Weather Interpretation Codes
  WMO_MAP: {
    0: { desc: 'Clear Sunny Sky', icon: 'fa-sun', color: '#f59e0b' },
    1: { desc: 'Mainly Clear', icon: 'fa-sun', color: '#f59e0b' },
    2: { desc: 'Partly Cloudy', icon: 'fa-cloud-sun', color: '#0284c7' },
    3: { desc: 'Overcast Coastal Breeze', icon: 'fa-cloud', color: '#64748b' },
    45: { desc: 'Foggy Morning', icon: 'fa-smog', color: '#94a3b8' },
    48: { desc: 'Depositing Rime Fog', icon: 'fa-smog', color: '#94a3b8' },
    51: { desc: 'Light Mumbai Drizzle', icon: 'fa-cloud-rain', color: '#0284c7' },
    61: { desc: 'Moderate Rain Showers', icon: 'fa-cloud-showers-heavy', color: '#0369a1' },
    65: { desc: 'Heavy Monsoon Downpour', icon: 'fa-cloud-showers-water', color: '#1e3a8a' },
    80: { desc: 'Passing Rain Showers', icon: 'fa-cloud-rain', color: '#0284c7' },
    95: { desc: 'Thunderstorm with Lightning', icon: 'fa-bolt-lightning', color: '#ef4444' }
  },

  // Fallback data in case client is offline or API fails
  getFallbackWeather() {
    return {
      temp: 31,
      feelsLike: 34,
      condition: 'Warm & Tropical Coastal Breeze',
      icon: 'fa-cloud-sun',
      iconColor: '#f59e0b',
      humidity: 74,
      windSpeed: 14,
      uvIndex: 7,
      airQuality: 'Moderate (AQI 92)',
      isLive: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  },

  async fetchMumbaiWeather() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.MUMBAI_COORDS.lat}&longitude=${this.MUMBAI_COORDS.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Weather API responded with error');

      const data = await res.json();
      const current = data.current;
      const codeInfo = this.WMO_MAP[current.weather_code] || { desc: 'Pleasant Coastal Weather', icon: 'fa-cloud-sun', color: '#0284c7' };

      return {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        condition: codeInfo.desc,
        icon: codeInfo.icon,
        iconColor: codeInfo.color,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        uvIndex: 6,
        airQuality: 'Coastal Breeze (Good)',
        isLive: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch (err) {
      console.warn('Weather fetch failed, falling back to simulated Mumbai climate:', err.message);
      return this.getFallbackWeather();
    }
  },

  async renderWeatherWidget(containerId = 'mumbai-weather-widget') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show loading state briefly
    container.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: #94a3b8;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
        <p style="font-size: 0.85rem;">Fetching live Mumbai satellite weather...</p>
      </div>
    `;

    const weather = await this.fetchMumbaiWeather();

    container.innerHTML = `
      <div class="weather-header">
        <div>
          <h4 style="font-size: 1.1rem; color: white; margin-bottom: 0.2rem;">
            <i class="fa-solid fa-location-dot" style="color: #38bdf8;"></i> Mumbai Coast & Suburbs
          </h4>
          <span style="font-size: 0.75rem; color: #94a3b8;">
            ${weather.isLive ? '🟢 Live Open-Meteo Satellite' : '🟡 Typical Seasonal Climate'} &bull; ${weather.timestamp}
          </span>
        </div>
        <span class="badge ${weather.isLive ? 'badge-success' : 'badge-warning'}">
          ${weather.isLive ? 'LIVE' : 'OFFLINE MODE'}
        </span>
      </div>

      <div class="weather-temp-row">
        <i class="fa-solid ${weather.icon} weather-icon-lg" style="color: ${weather.iconColor};"></i>
        <div>
          <div class="weather-temp">${weather.temp}&deg;C</div>
          <div style="color: #cbd5e1; font-weight: 600; font-size: 0.95rem;">${weather.condition}</div>
        </div>
      </div>

      <div class="weather-meta-grid">
        <div class="weather-meta-item">
          <span>Feels Like</span>
          <strong>${weather.feelsLike}&deg;C</strong>
        </div>
        <div class="weather-meta-item">
          <span>Humidity</span>
          <strong>${weather.humidity}%</strong>
        </div>
        <div class="weather-meta-item">
          <span>Sea Wind</span>
          <strong>${weather.windSpeed} km/h</strong>
        </div>
        <div class="weather-meta-item">
          <span>Comfort</span>
          <strong>${weather.airQuality}</strong>
        </div>
      </div>
    `;
  }
};
