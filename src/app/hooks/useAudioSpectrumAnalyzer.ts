import { useState, useEffect, useRef } from 'react';
import type { FFTProcessor } from '../lib/wasm/fft_wasm';
import { initializeWasm } from '../lib/wasm/wasm-init';

interface UseHybridAudioAnalyzerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  audioContext: AudioContext | null;
  fftWorkletNode?: AudioWorkletNode | null;
  isPlaying: boolean;
  fftSize?: number;
}

interface AudioWorkletMessage {
  buffer: Float32Array;
  timeStamp: number;
}

interface SpectrumDataWithTime {
  magnitudes: Uint8Array;
  timeStamp: number;
  deltaTime: number;
}

const useHybridAudioAnalyzer = ({
  audioRef,
  audioContext,
  fftWorkletNode,
  isPlaying,
  fftSize = 2048
}: UseHybridAudioAnalyzerProps) => {
  const [spectrumData, setSpectrumData] = useState<SpectrumDataWithTime>({
    magnitudes: new Uint8Array(fftSize / 2),
    timeStamp: 0,
    deltaTime: 0
  });
  
  const fftProcessorRef = useRef<FFTProcessor | null>(null);
  const complexBufferRef = useRef(new Float32Array(fftSize * 2));
  const frameCountRef = useRef(0);
  const frameRequestRef = useRef<number>();
  const frameCallbackRef = useRef<(timestamp: number) => void>();

  // Initialize WASM FFT
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log('Initializing WebAssembly FFT...');
      try {
        const processor = await initializeWasm(fftSize);
        if (mounted && processor) {
          fftProcessorRef.current = processor;
          console.log('WASM FFT processor initialized with size:', fftSize);
        }
      } catch (error) {
        console.error('Failed to initialize WASM FFT:', error);
      }
    };

    initialize();

    return () => {
      mounted = false;
      fftProcessorRef.current = null;
    };
  }, [fftSize]);

  // Log analysis every N frames
  const logAnalysis = (data: { [key: string]: any }) => {
    frameCountRef.current++;
    if (frameCountRef.current % 60 === 0) {
      console.log('FFT Analysis:', data);
      frameCountRef.current = 0;
    }
  };

  useEffect(() => {
    if (!isPlaying || !audioRef.current || !fftProcessorRef.current || !fftWorkletNode) {
      return;
    }

    const handleMessage = async (event: MessageEvent) => {
      const { buffer: inputData, timeStamp, deltaTime, type } = event.data;
      
      if (type !== 'frame') return;

      try {
        const processor = fftProcessorRef.current;
        if (!processor) return;

        // Process FFT
        const complexBuffer = complexBufferRef.current;
        complexBuffer.fill(0);
        for (let i = 0; i < inputData.length; i++) {
          complexBuffer[i * 2] = inputData[i];
          complexBuffer[i * 2 + 1] = 0;
        }

        const fftResult = await processor.processBuffer(complexBuffer);

        // Calculate magnitudes
        const magnitudes = new Uint8Array(fftSize / 2);
        
        for (let i = 0; i < fftSize / 2; i++) {
          const real = fftResult[i * 2];
          const imag = fftResult[i * 2 + 1];
          const magnitude = Math.sqrt(real * real + imag * imag);
          
          const normalizationFactor = 1000000;
          const normalizedMagnitude = magnitude * normalizationFactor;
          const db = 20 * Math.log10(normalizedMagnitude + 1e-6);
          const scaled = Math.max(0, Math.min(255, ((db + 100) * 255) / 100));
          
          magnitudes[i] = Math.round(scaled);
        }

        // Apply temporal smoothing
        // if (spectrumData.magnitudes.length === magnitudes.length) {
        //   for (let i = 0; i < magnitudes.length; i++) {
        //     magnitudes[i] = Math.round(
        //       magnitudes[i] * 0.7 + spectrumData.magnitudes[i] * 0.3
        //     );
        //   }
        // }

        setSpectrumData({
          magnitudes,
          timeStamp,
          deltaTime
        });

      } catch (error) {
        console.error('Error processing FFT:', error);
      }
    };

    fftWorkletNode.port.addEventListener('message', handleMessage);
    fftWorkletNode.port.start();

    return () => {
      fftWorkletNode.port.removeEventListener('message', handleMessage);
    };
  }, [isPlaying, audioRef, fftSize, fftWorkletNode]);

  return spectrumData;
};

export default useHybridAudioAnalyzer;