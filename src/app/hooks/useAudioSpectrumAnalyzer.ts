import { useState, useEffect } from 'react';
import { AudioContext, IAnalyserNode } from 'standardized-audio-context';

interface UseAudioSpectrumAnalyzerProps {
  audioContext: AudioContext | null;
  analyser: IAnalyserNode<AudioContext> | null;
  isPlaying: boolean;
}

const useAudioSpectrumAnalyzer = ({
  audioContext,
  analyser,
  isPlaying
}: UseAudioSpectrumAnalyzerProps): Uint8Array => {
  const [spectrumData, setSpectrumData] = useState(new Uint8Array());

  useEffect(() => {
    const processData = () => {
      if (!isPlaying || !analyser) {
        setSpectrumData(new Uint8Array(analyser ? analyser.frequencyBinCount : 0));
        return;
      }

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      setSpectrumData(frequencyData);

      requestAnimationFrame(processData);
    };

    processData();

    return () => {
      setSpectrumData(new Uint8Array(analyser ? analyser.frequencyBinCount : 0));
    };
  }, [isPlaying, analyser]);

  return spectrumData;
};

export default useAudioSpectrumAnalyzer;
