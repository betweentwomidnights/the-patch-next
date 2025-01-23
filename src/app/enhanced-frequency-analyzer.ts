import { useRef } from 'react';

interface FrequencyBandData {
  energy: number;
  normalized: number;
  peak: number;
  isPeak: boolean;
  rawValue: number;    // Added to preserve raw energy values
  impulse: number;     // Added for animation purposes
}

interface AnalyzedBands {
  kick: FrequencyBandData;
  bass: FrequencyBandData;
  lowMid: FrequencyBandData;
  highMid: FrequencyBandData;
}

export const useEnhancedFrequencyAnalyzer = () => {
  // Keep track of historical values and impulse states
  const historyRef = useRef({
    kick: { values: [] as number[], max: 0, min: Infinity, impulse: 0 },
    bass: { values: [] as number[], max: 0, min: Infinity, impulse: 0 },
    lowMid: { values: [] as number[], max: 0, min: Infinity, impulse: 0 },
    highMid: { values: [] as number[], max: 0, min: Infinity, impulse: 0 }
  });

  // Kick detection state
  const lastKickTimeRef = useRef(0);
  const kickStateRef = useRef({
    energy: 0,
    decay: 0.95,  // Matching original decay rate
    threshold: 175 // Adjusted based on original
  });
  
  const analyzeBands = (spectrumData: Uint8Array, timeStamp: number): AnalyzedBands => {
    // Check for inactive state
    const totalEnergy = Array.from(spectrumData).reduce((sum, val) => sum + val, 0);
    const isActive = totalEnergy > 100;

    if (!isActive) {
      // Apply decay to existing impulses
      Object.values(historyRef.current).forEach(band => {
        band.impulse *= kickStateRef.current.decay;
      });
      
      return generateInactiveBands();
    }

    const freqResolution = 44100 / 2048;
    
    // Adjusted frequency bands to match original more closely
    const bands = {
      kick: {
        start: Math.floor(20 / freqResolution),
        end: Math.floor(60 / freqResolution)
      },
      bass: {
        start: Math.floor(60 / freqResolution),
        end: Math.floor(150 / freqResolution)
      },
      lowMid: {
        start: Math.floor(150 / freqResolution),
        end: Math.floor(600 / freqResolution)
      },
      highMid: {
        start: Math.floor(600 / freqResolution),
        end: Math.floor(2000 / freqResolution)
      }
    };

    // Calculate energies
    const rawEnergies = {
      kick: calculateBandEnergy(spectrumData, bands.kick.start, bands.kick.end),
      bass: calculateBandEnergy(spectrumData, bands.bass.start, bands.bass.end),
      lowMid: calculateBandEnergy(spectrumData, bands.lowMid.start, bands.lowMid.end),
      highMid: calculateBandEnergy(spectrumData, bands.highMid.start, bands.highMid.end)
    };

    // Update history and detect peaks
    const result = {} as AnalyzedBands;
    
    Object.entries(rawEnergies).forEach(([band, energy]) => {
      const history = historyRef.current[band as keyof typeof rawEnergies];
      const bandKey = band as keyof typeof rawEnergies;
      
      // Update history
      history.values.push(energy);
      if (history.values.length > 60) {
        history.values.shift();
      }
      
      // Update running min/max with decay
      history.max = Math.max(energy, history.max * 0.99);
      history.min = Math.min(energy, history.min * 1.01);

      // Calculate normalized value
      const normalized = normalizeValue(energy, history.min, history.max);

      // Special handling for kick detection
      let isPeak = false;
      if (bandKey === 'kick') {
        const KICK_COOLDOWN = 0.1;
        const recentAvg = average(history.values.slice(-3));
        
        if (timeStamp - lastKickTimeRef.current >= KICK_COOLDOWN) {
          isPeak = energy > kickStateRef.current.threshold && 
                  energy > recentAvg * 1.2; // Similar to original threshold
          
          if (isPeak) {
            lastKickTimeRef.current = timeStamp;
            history.impulse = 1.0;
          }
        }
        
        // Update kick impulse with original decay rate
        history.impulse *= kickStateRef.current.decay;
      }

      // For other bands, detect peaks with more lenient conditions
      else {
        const recentAvg = average(history.values.slice(-3));
        isPeak = energy > recentAvg * 1.1;
        
        if (isPeak) {
          history.impulse = 1.0;
        }
        history.impulse *= 0.98; // Slower decay for non-kick bands
      }

      result[bandKey] = {
        energy,
        normalized,
        peak: energy / (average(history.values.slice(-3)) || 1),
        isPeak,
        rawValue: energy,
        impulse: history.impulse
      };
    });

    return result;
  };

  const calculateBandEnergy = (data: Uint8Array, start: number, end: number): number => {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i];
    }
    return sum / (end - start);
  };

  const normalizeValue = (value: number, min: number, max: number): number => {
    if (max === min) return 0;
    return (value - min) / (max - min);
  };

  const average = (arr: number[]): number => 
    arr.reduce((a, b) => a + b, 0) / arr.length;

  const generateInactiveBands = (): AnalyzedBands => ({
    kick: { energy: 0, normalized: 0, peak: 0, isPeak: false, rawValue: 0, impulse: 0 },
    bass: { energy: 0, normalized: 0, peak: 0, isPeak: false, rawValue: 0, impulse: 0 },
    lowMid: { energy: 0, normalized: 0, peak: 0, isPeak: false, rawValue: 0, impulse: 0 },
    highMid: { energy: 0, normalized: 0, peak: 0, isPeak: false, rawValue: 0, impulse: 0 }
  });

  return analyzeBands;
};