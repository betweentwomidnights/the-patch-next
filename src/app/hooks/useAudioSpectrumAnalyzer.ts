import { useState, useEffect, useRef } from 'react';
import type { FFTProcessor } from '../lib/wasm/fft_wasm';
import { detectIOS } from '../utils/detectIOS';

interface UseHybridAudioAnalyzerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  fftWorkletNode?: AudioWorkletNode | null;
  isPlaying: boolean;
  fftSize?: number;
}

const useHybridAudioAnalyzer = ({
  audioRef,
  audioContext,
  analyser,
  fftWorkletNode,
  isPlaying,
  fftSize = 2048
}: UseHybridAudioAnalyzerProps): Uint8Array => {
  const [spectrumData, setSpectrumData] = useState(new Uint8Array(fftSize / 2));
  const isIOS = useRef(detectIOS());
  const fftProcessorRef = useRef<FFTProcessor | null>(null);

  // Buffers and counters for iOS FFT processing
  const timeBufferRef = useRef(new Float32Array(fftSize * 2));
  const bufferIndexRef = useRef(0);
  const frameCountRef = useRef(0);

  // Generate default spectrum for when audio data is unavailable
  const generateDefaultSpectrum = () => {
    const time = Date.now() / 1000;
    return new Uint8Array(fftSize / 2).map((_, i) => {
      const normalizedIndex = i / (fftSize / 2);
      
      if (normalizedIndex < 0.25) {
        // Bass frequencies - slow, strong pulses
        return Math.floor((Math.sin(time * 0.5) * 0.5 + 0.5) * 255);
      } else if (normalizedIndex < 0.5) {
        // Low-mids - medium speed waves
        return Math.floor((Math.sin(time * 1.0 + i * 0.1) * 0.4 + 0.4) * 255);
      } else if (normalizedIndex < 0.75) {
        // High-mids - faster oscillation
        return Math.floor((Math.sin(time * 1.5 + i * 0.2) * 0.3 + 0.3) * 255);
      } else {
        // Treble - rapid, subtle movements
        return Math.floor((Math.sin(time * 2.0 + i * 0.3) * 0.2 + 0.2) * 255);
      }
    });
  };

  // Initialize WASM FFT for iOS
  useEffect(() => {
    if (isIOS.current) {
      console.log('iOS device detected, initializing WebAssembly FFT');
      (async () => {
        try {
          console.log('Starting WASM initialization');
          const { default: init, FFTProcessor } = await import('../lib/wasm/fft_wasm');
          await init('/wasm/fft_wasm_bg.wasm');

          fftProcessorRef.current = new FFTProcessor(fftSize);
          console.log('FFT processor created with size:', fftSize);
        } catch (error) {
          console.error('WASM initialization failed:', error);
        }
      })();
    }
  }, [fftSize]);

  // Non-iOS path: Use AnalyserNode with requestAnimationFrame
  useEffect(() => {
    if (isIOS.current) return;
    if (!isPlaying || !analyser) {
      setSpectrumData(new Uint8Array(fftSize / 2));
      return;
    }

    const processData = () => {
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      
      // Use default spectrum if no audio data
      const hasAudioData = frequencyData.some(value => value > 0);
      setSpectrumData(hasAudioData ? frequencyData : generateDefaultSpectrum());
      
      requestAnimationFrame(processData);
    };

    processData();
    return () => {
      setSpectrumData(new Uint8Array(analyser ? analyser.frequencyBinCount : 0));
    };
  }, [isPlaying, analyser, fftSize]);

  // iOS path: Use AudioWorkletNode messages for raw audio samples
  useEffect(() => {
    if (!isIOS.current || !isPlaying || !audioRef.current || !fftProcessorRef.current) {
      return;
    }

    if (!fftWorkletNode) {
      console.warn('FFT Worklet Node not available on iOS, using default spectrum');
      const defaultAnimation = () => {
        setSpectrumData(generateDefaultSpectrum());
        requestAnimationFrame(defaultAnimation);
      };
      defaultAnimation();
      return;
    }

    const handleMessage = (event: MessageEvent<Float32Array>) => {
      const inputData = event.data;
      const timeBuffer = timeBufferRef.current;
      let bufferIndex = bufferIndexRef.current;
      let frameCount = frameCountRef.current;

      if (frameCount % 60 === 0) {
        const hasNonZeroData = inputData.some(v => v !== 0);
        console.log('Audio processing frame (iOS):', {
          frame: frameCount,
          hasNonZeroData,
          firstFewSamples: Array.from(inputData.slice(0, 5))
        });

        // If no valid audio data, use default spectrum
        if (!hasNonZeroData) {
          setSpectrumData(generateDefaultSpectrum());
          return;
        }
      }
      frameCount++;

      // Fill timeBuffer with Real/Imag (Imag = 0)
      for (let i = 0; i < inputData.length; i++) {
        timeBuffer[bufferIndex * 2] = inputData[i];
        timeBuffer[bufferIndex * 2 + 1] = 0;
        bufferIndex = (bufferIndex + 1) % fftSize;
      }

      // If buffer is full, process FFT
      if (bufferIndex === 0) {
        console.log('Processing full buffer with FFT (iOS)');
        fftProcessorRef.current?.apply_window(timeBuffer);
        fftProcessorRef.current?.process(timeBuffer);

        const magnitudes = new Uint8Array(fftSize / 2);
        for (let i = 0; i < fftSize / 2; i++) {
          const real = timeBuffer[i * 2];
          const imag = timeBuffer[i * 2 + 1];
          const magnitude = Math.sqrt(real * real + imag * imag);
          const db = 20 * Math.log10(magnitude);
          magnitudes[i] = Math.max(0, Math.min(255, Math.floor((db + 100) * 2.55)));
        }

        setSpectrumData(magnitudes);
      }

      bufferIndexRef.current = bufferIndex;
      frameCountRef.current = frameCount;
    };

    fftWorkletNode.port.addEventListener('message', handleMessage as EventListener);
    fftWorkletNode.port.start();

    return () => {
      console.log('Cleaning up iOS audio processing');
      fftWorkletNode.port.removeEventListener('message', handleMessage as EventListener);
    };
  }, [isPlaying, audioRef, fftSize, fftWorkletNode]);

  return spectrumData;
};

export default useHybridAudioAnalyzer;