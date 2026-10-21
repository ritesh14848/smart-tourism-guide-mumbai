/**
 * Smart Tourism Guide - Mumbai & Suburbs Itinerary Planner Algorithm
 * Features:
 * - Budget validation & realistic feasibility checks
 * - Zone-based spatial clustering (prevents cross-city commute fatigue)
 * - Proportional budget allocation (Stay, Dining, Transit, Entry)
 * - Day-wise schedule with nearby hotel & dining pairing
 */

const PlannerService = {
  MIN_DAILY_BUDGET: 1100, // ₹1,100/day minimum for Mumbai (Hostel + Meals + Local Train/Bus)
  RECOMMENDED_DAILY_BUDGET: 3000,

  // Validate user form inputs before running algorithm
  validateInputs({ days, budget, interests }) {
    const errors = [];
    const numDays = parseInt(days, 10);
    const totalBudget = parseFloat(budget);

    if (isNaN(numDays) || numDays < 1 || numDays > 7) {
      errors.push('Trip duration must be between 1 and 7 days.');
    }

    if (isNaN(totalBudget) || totalBudget <= 0) {
      errors.push('Please enter a valid trip budget in ₹ (INR).');
    } else {
      const minRequired = numDays * this.MIN_DAILY_BUDGET;
      if (totalBudget < minRequired) {
        errors.push(`Budget too low: ₹${totalBudget.toLocaleString()} is not feasible for ${numDays} days in Mumbai. Minimum realistic budget required is ₹${minRequired.toLocaleString()} (₹${this.MIN_DAILY_BUDGET}/day for basic hostel stay, meals and public transit).`);
      }
    }

    if (!interests || interests.length === 0) {
      errors.push('Please select at least one interest category.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Helper to calculate distance between two coordinates (Haversine formula in km)
  getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  },

  // Main Itinerary Generator
  async generateItinerary(formData) {
    const validation = this.validateInputs(formData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const days = parseInt(formData.days, 10);
    const totalBudget = parseFloat(formData.budget);
    const interests = formData.interests;
    const pace = formData.pace || 'moderate'; // 'relaxed' (2 stops/day), 'moderate' (3 stops), 'packed' (4 stops)

    // 1. Load Datasets
    let attractions = [];
    let hotels = [];
    let restaurants = [];
    let transport = {};

    try {
      const [attrRes, hotRes, restRes, transRes] = await Promise.all([
        fetch('data/attractions.json'),
        fetch('data/hotels.json'),
        fetch('data/restaurants.json'),
        fetch('data/transport.json')
      ]);

      attractions = await attrRes.json();
      hotels = await hotRes.json();
      restaurants = await restRes.json();
      transport = await transRes.json();
    } catch (e) {
      console.error('Error fetching Mumbai data files:', e);
      return {
        success: false,
        errors: ['Could not load Mumbai destination database. Ensure you are running this on a web server or live preview.']
      };
    }

    // 2. Budget Allocation
    const budgetStayTotal = Math.round(totalBudget * 0.40);
    const budgetFoodTotal = Math.round(totalBudget * 0.25);
    const budgetTransitTotal = Math.round(totalBudget * 0.20);
    const budgetSightseeingTotal = Math.round(totalBudget * 0.15);

    const nightlyStayBudget = Math.round(budgetStayTotal / days);
    const dailyFoodBudget = Math.round(budgetFoodTotal / days);

    // 3. Select Appropriate Hotel based on nightly budget
    let chosenHotel = hotels[0];
    let priceTier = 'budget';
    if (nightlyStayBudget >= 7000) {
      priceTier = 'luxury';
    } else if (nightlyStayBudget >= 2500) {
      priceTier = 'mid-range';
    }

    const eligibleHotels = hotels.filter(h => h.priceTier === priceTier);
    if (eligibleHotels.length > 0) {
      chosenHotel = eligibleHotels[0];
    } else {
      // Find closest by price
      chosenHotel = hotels.reduce((prev, curr) =>
        Math.abs(curr.pricePerNight - nightlyStayBudget) < Math.abs(prev.pricePerNight - nightlyStayBudget) ? curr : prev
      );
    }

    // 4. Spatial Zone Clusters in Mumbai to avoid impossible cross-city commute
    const zoneClusters = [
      {
        zoneName: 'South Mumbai Heritage & Sea',
        primaryZone: 'South Mumbai',
        theme: 'Colonial Architecture, Marine Drive & Queen\'s Necklace',
        attractionIds: ['attr-1', 'attr-2', 'attr-3', 'attr-5', 'attr-8', 'attr-18'],
        restaurantSuburbs: ['Colaba', 'Fort', 'Ballard Estate']
      },
      {
        zoneName: 'Western Suburbs & Bollywood Sea-front',
        primaryZone: 'Western Suburbs',
        theme: 'Bandra Bandstand, Portuguese Heritage, Juhu Beach & Chaat',
        attractionIds: ['attr-11', 'attr-25', 'attr-13', 'attr-17', 'attr-12'],
        restaurantSuburbs: ['Bandra West', 'Juhu', 'Vile Parle']
      },
      {
        zoneName: 'Sanjay Gandhi National Park & Ancient Caves',
        primaryZone: 'Western Suburbs (Borivali)',
        theme: 'Kanheri Buddhist Rock-cut Caves & Rainforest Wilderness',
        attractionIds: ['attr-15', 'attr-14', 'attr-16', 'attr-20'],
        restaurantSuburbs: ['Andheri West', 'Vile Parle East']
      },
      {
        zoneName: 'Central Mumbai Culture & Coastal Shrines',
        primaryZone: 'Central Mumbai',
        theme: 'Siddhivinayak Temple, Dhobi Ghat, Flower Market & Worli',
        attractionIds: ['attr-9', 'attr-10', 'attr-23', 'attr-19', 'attr-6'],
        restaurantSuburbs: ['Dadar West', 'Prabhadevi', 'Tardeo', 'Sion West']
      },
      {
        zoneName: 'Arabian Sea Islands & Malabar Hill',
        primaryZone: 'South Mumbai / Harbour',
        theme: 'UNESCO Elephanta Caves Cruise & Panoramic Malabar Gardens',
        attractionIds: ['attr-4', 'attr-7', 'attr-24', 'attr-3'],
        restaurantSuburbs: ['Colaba', 'Fort']
      },
      {
        zoneName: 'Thane Lake City & Yeoor Hills',
        primaryZone: 'Thane & Suburbs',
        theme: 'Upvan Waterfront Promenade & Yeoor Hill Forest Trails',
        attractionIds: ['attr-21', 'attr-22'],
        restaurantSuburbs: ['Vashi', 'Thane West']
      },
      {
        zoneName: 'Navi Mumbai & Modern Suburbs',
        primaryZone: 'Navi Mumbai',
        theme: 'Central Park, Kharghar Hills & Coastal Suburbia',
        attractionIds: ['attr-22', 'attr-21'],
        restaurantSuburbs: ['Vashi']
      }
    ];

    // 5. Generate Day-by-Day Schedules
    const dayPlans = [];
    let totalEstimatedSpend = 0;
    const stopsPerDay = pace === 'relaxed' ? 2 : pace === 'packed' ? 4 : 3;

    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      const cluster = zoneClusters[dayIndex % zoneClusters.length];
      
      // Filter cluster attractions by user's selected interests if possible
      let dayAttractions = attractions.filter(a => cluster.attractionIds.includes(a.id));
      const interestMatches = dayAttractions.filter(a => interests.includes(a.category));
      
      if (interestMatches.length >= stopsPerDay) {
        dayAttractions = interestMatches;
      }

      // Slice based on pace
      const selectedStops = dayAttractions.slice(0, stopsPerDay);
      if (selectedStops.length < stopsPerDay) {
        // Supplement from same zone
        const extra = attractions.filter(a => a.zone.includes(cluster.primaryZone) && !selectedStops.some(s => s.id === a.id));
        selectedStops.push(...extra.slice(0, stopsPerDay - selectedStops.length));
      }

      // Pick Lunch & Dinner from nearby restaurants
      const zoneRestaurants = restaurants.filter(r => cluster.restaurantSuburbs.some(sub => r.suburb.includes(sub))) || restaurants;
      const lunchSpot = zoneRestaurants[0] || restaurants[0];
      const dinnerSpot = zoneRestaurants[1] || restaurants[Math.min(1, restaurants.length - 1)];

      // Build Day Schedule Timeline
      const timeline = [];
      let dayEntryFees = 0;

      // Stop 1: Morning
      if (selectedStops[0]) {
        dayEntryFees += selectedStops[0].entryFee;
        timeline.push({
          time: '09:30 AM - 12:30 PM',
          type: 'attraction',
          title: selectedStops[0].name,
          category: selectedStops[0].category,
          suburb: selectedStops[0].suburb,
          entryFee: selectedStops[0].entryFee,
          description: selectedStops[0].description,
          lat: selectedStops[0].lat,
          lng: selectedStops[0].lng,
          tip: `Best time: ${selectedStops[0].bestTimeToVisit}`
        });
      }

      // Stop 2: Lunch Break
      const estLunchCost = Math.round(lunchSpot.avgCostForTwo / 2);
      timeline.push({
        time: '01:00 PM - 02:15 PM',
        type: 'food',
        title: `Lunch at ${lunchSpot.name}`,
        cuisine: lunchSpot.cuisine,
        suburb: lunchSpot.suburb,
        estimatedCost: estLunchCost,
        description: lunchSpot.description,
        specialty: lunchSpot.specialty,
        lat: lunchSpot.lat,
        lng: lunchSpot.lng
      });

      // Stop 3: Afternoon
      if (selectedStops[1]) {
        dayEntryFees += selectedStops[1].entryFee;
        timeline.push({
          time: '02:45 PM - 05:00 PM',
          type: 'attraction',
          title: selectedStops[1].name,
          category: selectedStops[1].category,
          suburb: selectedStops[1].suburb,
          entryFee: selectedStops[1].entryFee,
          description: selectedStops[1].description,
          lat: selectedStops[1].lat,
          lng: selectedStops[1].lng,
          tip: `Best time: ${selectedStops[1].bestTimeToVisit}`
        });
      }

      // Stop 4: Sunset / Evening
      if (selectedStops[2]) {
        dayEntryFees += selectedStops[2].entryFee;
        timeline.push({
          time: '05:30 PM - 07:30 PM',
          type: 'attraction',
          title: selectedStops[2].name,
          category: selectedStops[2].category,
          suburb: selectedStops[2].suburb,
          entryFee: selectedStops[2].entryFee,
          description: selectedStops[2].description,
          lat: selectedStops[2].lat,
          lng: selectedStops[2].lng,
          tip: `Best time: ${selectedStops[2].bestTimeToVisit}`
        });
      }

      // Stop 5: Dinner
      const estDinnerCost = Math.round(dinnerSpot.avgCostForTwo / 2);
      timeline.push({
        time: '08:00 PM - 09:30 PM',
        type: 'food',
        title: `Dinner at ${dinnerSpot.name}`,
        cuisine: dinnerSpot.cuisine,
        suburb: dinnerSpot.suburb,
        estimatedCost: estDinnerCost,
        description: dinnerSpot.description,
        specialty: dinnerSpot.specialty,
        lat: dinnerSpot.lat,
        lng: dinnerSpot.lng
      });

      // Estimated daily transit & meals
      const estDailyTransit = Math.min(Math.round(budgetTransitTotal / days), 350);
      const dayTotalCost = dayEntryFees + estLunchCost + estDinnerCost + estDailyTransit;
      totalEstimatedSpend += dayTotalCost;

      dayPlans.push({
        dayNumber: dayIndex + 1,
        title: `Day ${dayIndex + 1}: ${cluster.zoneName}`,
        theme: cluster.theme,
        timeline,
        summary: {
          entryFees: dayEntryFees,
          meals: estLunchCost + estDinnerCost,
          transit: estDailyTransit,
          dayTotal: dayTotalCost
        }
      });
    }

    // Add Total Hotel Cost to Estimated Spend
    const totalHotelSpend = chosenHotel.pricePerNight * days;
    totalEstimatedSpend += totalHotelSpend;

    const remainingBudget = totalBudget - totalEstimatedSpend;

    const itineraryResult = {
      destination: 'Mumbai & Suburbs',
      days,
      totalBudget,
      totalEstimatedSpend,
      remainingBudget,
      isWithinBudget: totalEstimatedSpend <= totalBudget,
      chosenHotel,
      totalHotelSpend,
      budgetBreakdown: {
        stay: totalHotelSpend,
        dining: Math.round(totalBudget * 0.25),
        transit: Math.round(totalBudget * 0.20),
        sightseeing: Math.round(totalBudget * 0.15)
      },
      interests,
      pace,
      dayPlans,
      createdAt: new Date().toISOString()
    };

    // Save to storage
    StorageService.saveItinerary(itineraryResult);
    StorageService.savePreferences(formData);

    return {
      success: true,
      data: itineraryResult
    };
  }
};
