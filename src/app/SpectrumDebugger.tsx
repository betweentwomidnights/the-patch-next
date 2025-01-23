import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SpectrumDataWithTime {
  magnitudes: Uint8Array;
  timeStamp: number;
  deltaTime: number;
}

interface SpectrumDebuggerProps {
  spectrumData: SpectrumDataWithTime;
  fftSize?: number;
  sampleRate?: number;
}

const SpectrumDebugger = ({ 
  spectrumData, 
  fftSize = 2048, 
  sampleRate = 44100 
}: SpectrumDebuggerProps) => {
  const [kickEnergy, setKickEnergy] = useState(0);
  const [magnitudeData, setMagnitudeData] = useState<Array<{frequency: number, magnitude: number}>>([]);
  const previousMagnitudes = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!spectrumData?.magnitudes) return;

    // Debug log raw FFT data
    console.log('Raw FFT data:', {
      maxValue: Math.max(...Array.from(spectrumData.magnitudes)),
      minValue: Math.min(...Array.from(spectrumData.magnitudes)),
      firstFewValues: Array.from(spectrumData.magnitudes.slice(0, 10)),
      timestamp: spectrumData.timeStamp
    });

    const freqResolution = sampleRate / fftSize;
    const numBins = Math.floor(spectrumData.magnitudes.length / 2);
    
    // Calculate kick energy with emphasis on characteristic kick drum spectrum
    let kickSum = 0;
    const kickStartBin = Math.floor(40 / freqResolution);
    const kickEndBin = Math.floor(100 / freqResolution);
    const subBassStartBin = Math.floor(60 / freqResolution);
    const subBassEndBin = Math.floor(120 / freqResolution);
    const snareStartBin = Math.floor(200 / freqResolution);
    const snareEndBin = Math.floor(500 / freqResolution);
    
    let subBassEnergy = 0;
    let snareEnergy = 0;
    let kickPeakEnergy = 0;

    // Calculate energies in different bands
    for (let i = kickStartBin; i <= kickEndBin; i++) {
      if (i < numBins) {
        const magnitude = spectrumData.magnitudes[i];
        kickSum += magnitude;
        if (i >= subBassStartBin && i <= subBassEndBin) {
          subBassEnergy += magnitude;
        }
        kickPeakEnergy = Math.max(kickPeakEnergy, magnitude);
      }
    }

    // Calculate snare band energy for comparison
    for (let i = snareStartBin; i <= snareEndBin; i++) {
      if (i < numBins) {
        snareEnergy += spectrumData.magnitudes[i];
      }
    }

    // Normalize energies
    const normalizedKickEnergy = kickSum / (kickEndBin - kickStartBin + 1);
    const normalizedSnareEnergy = snareEnergy / (snareEndBin - snareStartBin + 1);
    
    // Kick detection emphasizing kick characteristics and rejecting snare-heavy content
    const kickScore = (normalizedKickEnergy * subBassEnergy) / (normalizedSnareEnergy + 1);
    
    setKickEnergy(kickScore);

    // Create magnitude data points
    const newMagnitudeData = [];
    for (let i = 0; i < numBins; i += 4) {
      const frequency = i * freqResolution;
      if (frequency >= 20 && frequency <= 20000) {
        newMagnitudeData.push({
          frequency,
          magnitude: spectrumData.magnitudes[i]
        });
      }
    }
    setMagnitudeData(newMagnitudeData);

    // Store current magnitudes for next frame comparison
    previousMagnitudes.current = new Uint8Array(spectrumData.magnitudes);

    // Debug log
    console.log('Data update:', {
      kickScore,
      normalizedKickEnergy,
      normalizedSnareEnergy,
      subBassEnergy,
      kickPeakEnergy
    });

  }, [spectrumData, fftSize, sampleRate]);

  return (
    <div className="space-y-6 p-4 bg-gray-100 rounded-lg">
      <div className="p-4 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Kick Energy</h3>
        <div className="text-3xl font-bold">{kickEnergy.toFixed(2)}</div>
      </div>

      <div className="h-96 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Spectrum Magnitudes</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={magnitudeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="frequency"
              type="number"
              scale="log"
              domain={[20, 20000]}
              tickFormatter={(value) => `${value.toFixed(0)}Hz`}
            />
            <YAxis domain={[0, 255]} />
            <Tooltip />
            <Line 
              type="monotone"
              dataKey="magnitude"
              stroke="#8884d8"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpectrumDebugger;