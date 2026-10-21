/**
 * Unified LocalStorage State Management for Smart Tourism Guide
 */

const STORAGE_KEYS = {
  ITINERARY: 'stg_mumbai_itinerary',
  TRIP_STATUS: 'stg_mumbai_trip_status', // 'not_started', 'in_progress', 'completed'
  TRIP_PREFS: 'stg_mumbai_trip_prefs',
  EXPENSES: 'stg_mumbai_expenses',
  FEEDBACK: 'stg_mumbai_feedback'
};

const StorageService = {
  // Itinerary
  saveItinerary(itineraryData) {
    try {
      localStorage.setItem(STORAGE_KEYS.ITINERARY, JSON.stringify(itineraryData));
      return true;
    } catch (e) {
      console.error('Failed to save itinerary to localStorage', e);
      return false;
    }
  },

  getItinerary() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ITINERARY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to retrieve itinerary', e);
      return null;
    }
  },

  clearItinerary() {
    localStorage.removeItem(STORAGE_KEYS.ITINERARY);
  },

  // Trip Preferences (for modifying preferences loop)
  savePreferences(prefs) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIP_PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  },

  getPreferences() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRIP_PREFS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // Trip Status
  getTripStatus() {
    return localStorage.getItem(STORAGE_KEYS.TRIP_STATUS) || 'not_started';
  },

  setTripStatus(status) {
    localStorage.setItem(STORAGE_KEYS.TRIP_STATUS, status);
  },

  // Expenses
  getExpenses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newEntry = {
      id: 'exp_' + Date.now(),
      date: new Date().toISOString(),
      ...expense
    };
    expenses.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return newEntry;
  },

  deleteExpense(id) {
    let expenses = this.getExpenses();
    expenses = expenses.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return expenses;
  },

  clearExpenses() {
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  },

  // Feedback
  saveFeedback(feedback) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK) || '[]');
      existing.push({
        id: 'fb_' + Date.now(),
        date: new Date().toISOString(),
        ...feedback
      });
      localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(existing));
      return true;
    } catch (e) {
      return false;
    }
  }
};
