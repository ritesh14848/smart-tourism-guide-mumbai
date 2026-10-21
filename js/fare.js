/**
 * Mumbai Transit Fare Guidance & Fare Calculator
 * Accurate Mumbai RTO rates for Autos, Kaali-Peeli Taxis, AC Cabs, Local Trains, Metro, and BEST Buses
 */

const FareService = {
  transportData: null,

  async init() {
    try {
      const res = await fetch('data/transport.json');
      this.transportData = await res.json();
    } catch (e) {
      console.error('Failed to load transport.json', e);
    }
  },

  // Calculate distance between two coordinate points
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  },

  // Calculate fare for a given distance, mode, and time of day
  calculateFare({ modeId, distanceKm, isNight = false, fromLandmark = null, toLandmark = null }) {
    if (!this.transportData) return null;

    const mode = this.transportData.modes.find(m => m.id === modeId);
    if (!mode) return null;

    const km = Math.max(0.5, parseFloat(distanceKm) || 1);
    let baseFare = 0;
    let totalFare = 0;
    let warning = null;

    // Check South Mumbai auto restriction
    if (modeId === 'auto') {
      const soBoLandmarks = ['Gateway of India (Colaba)', 'CSMT Station (Fort)', 'Marine Drive / Chowpatty'];
      if (soBoLandmarks.includes(fromLandmark) || soBoLandmarks.includes(toLandmark)) {
        warning = '⚠️ Auto-rickshaws are strictly prohibited south of Bandra/Sion in South Mumbai. You must use a Kaali-Peeli Taxi or Local Train here.';
      }
    }

    if (modeId === 'ferry') {
      return {
        modeName: mode.name,
        distanceKm: km,
        fare: mode.baseFare,
        isNight: false,
        breakdown: '₹260 round-trip ticket from Gateway of India Jetty No. 5 to Elephanta Caves.',
        warning: null
      };
    }

    if (modeId === 'local_train') {
      let secondClass = 5;
      let firstClass = 50;
      let acLocal = 35;

      for (const slab of mode.flatSlabs) {
        if (km <= slab.maxKm) {
          secondClass = slab.secondClass;
          firstClass = slab.firstClass;
          acLocal = slab.acLocal;
          break;
        }
      }

      return {
        modeName: mode.name,
        distanceKm: km,
        fare: secondClass,
        firstClass,
        acLocal,
        isNight,
        breakdown: `2nd Class: ₹${secondClass} | 1st Class: ₹${firstClass} | AC Local: ₹${acLocal} (${km} km)`,
        warning: 'Tip: Peak commute hours are 8:30-10:30 AM south-bound & 6:00-8:30 PM north-bound. AC locals require a valid AC ticket.'
      };
    }

    if (modeId === 'metro' || modeId === 'best_bus') {
      let fare = mode.baseFare;
      for (const slab of mode.flatSlabs) {
        if (km <= slab.maxKm) {
          fare = slab.fare;
          break;
        }
      }
      return {
        modeName: mode.name,
        distanceKm: km,
        fare,
        isNight,
        breakdown: `Standard slab fare: ₹${fare} for up to ${km} km.`,
        warning: null
      };
    }

    // Auto, Kaali-Peeli Taxi, AC Cool Cab (Meter-based)
    if (km <= mode.baseDistanceKm) {
      totalFare = mode.baseFare;
    } else {
      const extraKm = km - mode.baseDistanceKm;
      totalFare = mode.baseFare + (extraKm * mode.ratePerKm);
    }

    // Night Surcharge (25% between midnight and 5:00 AM)
    let nightExtra = 0;
    if (isNight) {
      nightExtra = totalFare * (mode.nightSurchargePercent / 100);
      totalFare += nightExtra;
    }

    totalFare = Math.round(totalFare);

    return {
      modeName: mode.name,
      distanceKm: km,
      fare: totalFare,
      baseFare: mode.baseFare,
      ratePerKm: mode.ratePerKm,
      isNight,
      nightExtra: Math.round(nightExtra),
      breakdown: isNight
        ? `Base (1.5 km): ₹${mode.baseFare} + Distance Rate: ₹${mode.ratePerKm}/km + 25% Night Surcharge (₹${Math.round(nightExtra)})`
        : `Base (1.5 km): ₹${mode.baseFare} + Distance Rate: ₹${mode.ratePerKm}/km`,
      warning
    };
  }
};
