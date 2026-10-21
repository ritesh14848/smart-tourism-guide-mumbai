/**
 * Interactive Leaflet Map for Mumbai & Suburbs
 * Features:
 * - Landmark, Hotel, Restaurant & Hospital markers with rich popups
 * - Browser Geolocation API live tracking with permission fallback
 * - Active Itinerary polyline route rendering
 * - Zone-based panning and zooming
 */

const MapService = {
  map: null,
  markersLayer: null,
  routeLayer: null,
  userLocationMarker: null,
  watchId: null,

  MUMBAI_CENTER: [18.9800, 72.8350], // Centered nicely between South Mumbai & Suburbs
  DEFAULT_ZOOM: 11,

  ZONES: {
    'all': { center: [18.9800, 72.8350], zoom: 11 },
    'South Mumbai': { center: [18.9350, 72.8250], zoom: 13 },
    'Central Mumbai': { center: [19.0150, 72.8350], zoom: 13 },
    'Western Suburbs': { center: [19.1000, 72.8350], zoom: 12 },
    'Borivali / National Park': { center: [19.2200, 72.8600], zoom: 13 },
    'Thane & Suburbs': { center: [19.2150, 72.9700], zoom: 13 },
    'Navi Mumbai': { center: [19.0300, 73.0400], zoom: 12 }
  },

  async initMap(mapContainerId = 'map-viewport') {
    if (!document.getElementById(mapContainerId)) return;
    if (typeof L === 'undefined') {
      console.error('Leaflet library is not loaded');
      return;
    }

    // Initialize Leaflet map
    this.map = L.map(mapContainerId).setView(this.MUMBAI_CENTER, this.DEFAULT_ZOOM);

    // OpenStreetMap tile layer (Free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);

    // Load and render all markers
    await this.loadAllMapData();

    // Check if active itinerary exists to render route
    this.renderActiveItineraryRoute();
  },

  createCustomIcon(color, iconClass) {
    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          background-color: ${color};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        ">
          <i class="fa-solid ${iconClass}" style="transform: rotate(45deg); font-size: 14px;"></i>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  },

  async loadAllMapData(filterCategory = 'all', filterZone = 'all') {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();

    try {
      const [attrRes, hotRes, restRes, hospRes] = await Promise.all([
        fetch('data/attractions.json'),
        fetch('data/hotels.json'),
        fetch('data/restaurants.json'),
        fetch('data/emergency.json')
      ]);

      const attractions = await attrRes.json();
      const hotels = await hotRes.json();
      const restaurants = await restRes.json();
      const emergency = await hospRes.json();

      // 1. Plot Attractions (Blue)
      if (filterCategory === 'all' || filterCategory === 'attraction') {
        attractions.forEach(attr => {
          if (filterZone !== 'all' && !attr.zone.toLowerCase().includes(filterZone.toLowerCase())) return;

          const marker = L.marker([attr.lat, attr.lng], {
            icon: this.createCustomIcon('#0284c7', 'fa-landmark')
          });

          marker.bindPopup(`
            <div style="min-width: 220px; font-family: inherit;">
              <span class="badge badge-primary" style="margin-bottom: 4px;">${attr.category}</span>
              <h4 style="margin: 4px 0 6px; font-size: 1.05rem;">${attr.name}</h4>
              <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 6px;">📍 ${attr.suburb} (${attr.zone})</p>
              <p style="font-size: 0.82rem; margin-bottom: 8px;">${attr.description.substring(0, 110)}...</p>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <span>⭐ ${attr.rating}/5.0</span>
                <span>🎫 ${attr.entryFee === 0 ? 'Free Entry' : '₹' + attr.entryFee}</span>
              </div>
            </div>
          `);

          this.markersLayer.addLayer(marker);
        });
      }

      // 2. Plot Hotels (Emerald Green)
      if (filterCategory === 'all' || filterCategory === 'hotel') {
        hotels.forEach(h => {
          if (filterZone !== 'all' && !h.zone.toLowerCase().includes(filterZone.toLowerCase())) return;

          const marker = L.marker([h.lat, h.lng], {
            icon: this.createCustomIcon('#10b981', 'fa-hotel')
          });

          marker.bindPopup(`
            <div style="min-width: 220px;">
              <span class="badge badge-success">${h.category}</span>
              <h4 style="margin: 4px 0 6px;">${h.name}</h4>
              <p style="font-size: 0.85rem; color: #64748b;">📍 ${h.suburb}</p>
              <p style="font-size: 0.9rem; font-weight: 800; color: #047857; margin: 4px 0;">₹${h.pricePerNight.toLocaleString()} / night</p>
              <p style="font-size: 0.8rem; color: #64748b;">📞 ${h.contact}</p>
            </div>
          `);

          this.markersLayer.addLayer(marker);
        });
      }

      // 3. Plot Food & Restaurants (Sunset Orange)
      if (filterCategory === 'all' || filterCategory === 'food') {
        restaurants.forEach(r => {
          if (filterZone !== 'all' && !r.zone.toLowerCase().includes(filterZone.toLowerCase())) return;

          const marker = L.marker([r.lat, r.lng], {
            icon: this.createCustomIcon('#f97316', 'fa-utensils')
          });

          marker.bindPopup(`
            <div style="min-width: 220px;">
              <span class="badge badge-accent">${r.cuisine}</span>
              <h4 style="margin: 4px 0 6px;">${r.name}</h4>
              <p style="font-size: 0.85rem; color: #64748b;">📍 ${r.suburb}</p>
              <p style="font-size: 0.85rem; margin: 4px 0;"><strong>Specialty:</strong> ${r.specialty}</p>
              <p style="font-size: 0.8rem; color: #64748b;">Avg Cost for Two: ₹${r.avgCostForTwo}</p>
            </div>
          `);

          this.markersLayer.addLayer(marker);
        });
      }

      // 4. Plot Hospitals & Emergency (Crimson Red)
      if (filterCategory === 'all' || filterCategory === 'hospital') {
        emergency.hospitals.forEach(hosp => {
          const marker = L.marker([hosp.lat, hosp.lng], {
            icon: this.createCustomIcon('#ef4444', 'fa-hospital')
          });

          marker.bindPopup(`
            <div style="min-width: 220px;">
              <span class="badge badge-danger">24/7 Casualty & Trauma</span>
              <h4 style="margin: 4px 0 6px; color: #b91c1c;">${hosp.name}</h4>
              <p style="font-size: 0.85rem; color: #64748b;">📍 ${hosp.address}</p>
              <div style="margin-top: 8px;">
                <a href="tel:${hosp.casualtyPhone}" class="btn btn-sm btn-danger" style="color: white; width: 100%; display: block; text-align: center;">
                  🚨 Call Casualty: ${hosp.casualtyPhone}
                </a>
              </div>
            </div>
          `);

          this.markersLayer.addLayer(marker);
        });
      }

    } catch (e) {
      console.error('Error loading map datasets:', e);
    }
  },

  // Focus on specific zone
  panToZone(zoneName) {
    if (!this.map) return;
    const zoneConfig = this.ZONES[zoneName] || this.ZONES['all'];
    this.map.flyTo(zoneConfig.center, zoneConfig.zoom, { duration: 1.2 });
  },

  // Live GPS tracking
  toggleGPS(onSuccessCallback, onErrorCallback) {
    if (!navigator.geolocation) {
      if (onErrorCallback) onErrorCallback('Geolocation is not supported by your browser.');
      return;
    }

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      if (this.userLocationMarker) {
        this.map.removeLayer(this.userLocationMarker);
        this.userLocationMarker = null;
      }
      return false; // Stopped
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latLng = [latitude, longitude];

        if (!this.userLocationMarker) {
          const pulseIcon = L.divIcon({
            className: 'gps-pulse-marker',
            html: `
              <div style="
                width: 20px;
                height: 20px;
                background-color: #2563eb;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 15px #3b82f6;
              "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          this.userLocationMarker = L.marker(latLng, { icon: pulseIcon }).addTo(this.map);
          this.userLocationMarker.bindPopup(`<b>📍 You are here</b><br>Accuracy: ~${Math.round(accuracy)}m`);
        } else {
          this.userLocationMarker.setLatLng(latLng);
        }

        this.map.flyTo(latLng, 14, { duration: 1 });
        if (onSuccessCallback) onSuccessCallback({ lat: latitude, lng: longitude, accuracy });
      },
      (err) => {
        let msg = 'Unable to fetch your location.';
        if (err.code === 1) msg = 'Location permission denied. Defaulting to Central Mumbai.';
        else if (err.code === 2) msg = 'GPS position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';

        if (onErrorCallback) onErrorCallback(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return true; // Started
  },

  // Render polyline route connecting day stops of active itinerary
  renderActiveItineraryRoute(dayIndex = 0) {
    if (!this.routeLayer) return;
    this.routeLayer.clearLayers();

    const itinerary = StorageService.getItinerary();
    if (!itinerary || !itinerary.dayPlans || !itinerary.dayPlans[dayIndex]) return;

    const dayPlan = itinerary.dayPlans[dayIndex];
    const points = [];

    dayPlan.timeline.forEach(item => {
      if (item.lat && item.lng) {
        points.push([item.lat, item.lng]);
      }
    });

    if (points.length > 1) {
      const polyline = L.polyline(points, {
        color: '#f97316',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(this.routeLayer);

      this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }
};
