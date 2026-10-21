/**
 * Voice & Text Translator for Mumbai Visitors
 * Features:
 * - Web Speech API (SpeechRecognition for voice input & SpeechSynthesis for audio pronunciation)
 * - Curated Mumbai Local Phrasebook (English, Marathi, Hindi)
 * - Free MyMemory Translation API with local offline dictionary fallback
 */

const TranslateService = {
  recognition: null,
  isRecording: false,

  // Curated Mumbai Local Travel Phrases
  PHRASES: [
    {
      category: 'Transport & Auto',
      english: 'Will you go to Bandra Station?',
      marathi: 'वांद्रे स्टेशनला जाणार का? (Vandre station la janar ka?)',
      hindi: 'बांद्रा स्टेशन जाओगे क्या? (Bandra station jaoge kya?)'
    },
    {
      category: 'Transport & Auto',
      english: 'Please run by the meter.',
      marathi: 'कृपया मीटरने चला. (Krupaya meter ne chala.)',
      hindi: 'मीटर से चलो भाई साहब. (Meter se chalo bhai sahab.)'
    },
    {
      category: 'Transport & Auto',
      english: 'How much is the fare?',
      marathi: 'भाडे किती झाले? (Bhade kiti jhale?)',
      hindi: 'कितना किराया हुआ? (Kitna kiraya hua?)'
    },
    {
      category: 'Food & Dining',
      english: 'Please give one cutting chai.',
      marathi: 'एक कटिंग चहा द्या. (Ek cutting chaha dya.)',
      hindi: 'एक कटिंग चाय देना. (Ek cutting chai dena.)'
    },
    {
      category: 'Food & Dining',
      english: 'Do not make it too spicy.',
      marathi: 'जास्त तिखट करू नका. (Jasta tikhat karu naka.)',
      hindi: 'ज्यादा तीखा मत बनाना. (Zyada teekha mat banana.)'
    },
    {
      category: 'Food & Dining',
      english: 'Is this vegetarian?',
      marathi: 'हे शाकाहारी आहे का? (He shakahari aahe ka?)',
      hindi: 'क्या यह शाकाहारी है? (Kya yeh shakahari hai?)'
    },
    {
      category: 'Shopping & Bargaining',
      english: 'Please give a discount / reduce the price.',
      marathi: 'थोडे पैसे कमी करा ना. (Thode paise kami kara na.)',
      hindi: 'भैया थोड़ा कम करो ना. (Bhaiya thoda kam karo na.)'
    },
    {
      category: 'Shopping & Bargaining',
      english: 'How much does this cost?',
      marathi: 'याची किंमत काय आहे? (Yachi kimmat kaay aahe?)',
      hindi: 'यह कितने का है? (Yeh kitne ka hai?)'
    },
    {
      category: 'Emergency & Directions',
      english: 'I need urgent help.',
      marathi: 'मला तातडीने मदतीची गरज आहे. (Mala tatadine madatichi garaj aahe.)',
      hindi: 'मुझे तुरंत मदद चाहिए. (Mujhe turant madad chahiye.)'
    },
    {
      category: 'Emergency & Directions',
      english: 'Where is the nearest police station or hospital?',
      marathi: 'जवळचे पोलीस स्टेशन किंवा हॉस्पिटल कुठे आहे? (Javalche police station kiva hospital kuthe aahe?)',
      hindi: 'पास में पुलिस स्टेशन या अस्पताल कहाँ है? (Paas mein police station ya aspatal kahan hai?)'
    }
  ],

  initSpeechRecognition(onResultCallback, onErrorCallback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onErrorCallback) onErrorCallback('Web Speech Recognition is not supported in this browser. Please use Google Chrome or type your text.');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.lang = 'en-IN';
    this.recognition.interimResults = false;

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResultCallback) onResultCallback(transcript);
    };

    this.recognition.onerror = (event) => {
      if (onErrorCallback) onErrorCallback(`Microphone error: ${event.error}`);
    };

    return true;
  },

  startVoiceInput(onResult, onError) {
    if (!this.recognition) {
      const ready = this.initSpeechRecognition(onResult, onError);
      if (!ready) return;
    }

    try {
      this.recognition.start();
      this.isRecording = true;
    } catch (e) {
      console.warn('Speech recognition already active');
    }
  },

  stopVoiceInput() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  },

  // Text-to-Speech playback
  speakText(text, lang = 'hi-IN') {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported on your browser.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower for clear Indian pronunciation
    window.speechSynthesis.speak(utterance);
  },

  // Online translation with MyMemory + offline fallback
  async translateText(text, targetLang = 'mr') {
    if (!text || !text.trim()) return '';

    // Check offline phrasebook first
    const cleanText = text.trim().toLowerCase();
    const match = this.PHRASES.find(p => p.english.toLowerCase().includes(cleanText) || cleanText.includes(p.english.toLowerCase()));
    if (match) {
      return targetLang === 'mr' ? match.marathi : match.hindi;
    }

    try {
      // MyMemory free public translation API
      const langPair = `en|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    } catch (e) {
      console.warn('Online translation failed, using fallback dictionary:', e.message);
    }

    // Fallback dictionary
    const quickDict = {
      'hello': { mr: 'नमस्कार (Namaskar)', hi: 'नमस्ते (Namaste)' },
      'thank you': { mr: 'धन्यवाद (Dhanyavaad)', hi: 'धन्यवाद (Dhanyavaad)' },
      'yes': { mr: 'होय (Hoy)', hi: 'हाँ (Haan)' },
      'no': { mr: 'नाही (Naahi)', hi: 'नहीं (Nahin)' },
      'how much': { mr: 'किती रुपये? (Kiti rupaye?)', hi: 'कितने पैसे? (Kitne paise?)' },
      'water': { mr: 'पाणी (Paani)', hi: 'पानी (Paani)' },
      'food': { mr: 'जेवण (Jevan)', hi: 'खाना (Khaana)' },
      'police': { mr: 'पोलीस (Police)', hi: 'पुलिस (Police)' },
      'hospital': { mr: 'रुग्णालय (Rugnalay)', hi: 'अस्पताल (Aspataal)' }
    };

    for (const [key, val] of Object.entries(quickDict)) {
      if (cleanText.includes(key)) {
        return targetLang === 'mr' ? val.mr : val.hi;
      }
    }

    return `[Translated ${targetLang === 'mr' ? 'Marathi' : 'Hindi'}]: ${text}`;
  }
};
