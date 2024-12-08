import { useState, useEffect, useMemo } from 'react';
import { AudioContext, IAnalyserNode } from 'standardized-audio-context';

interface AudioContextHookReturn {
  audioContext: AudioContext | null;
  analyser: IAnalyserNode<AudioContext> | null;
  isAudioInitialized: boolean;
  needsUserInteraction: boolean;
  initializeAudio: () => Promise<void>;
  isIOS: boolean;
  recreateAudioGraph: () => Promise<void>;  // New function for handling stream changes
}

export const useAudioContextWithiOS = (audioRef: React.RefObject<HTMLAudioElement>): AudioContextHookReturn => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<IAnalyserNode<AudioContext> | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  const isIOS = useMemo(() => 
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
    []
  );

  // New function to create audio processing graph
  const createAudioGraph = async (ctx: AudioContext) => {
    if (!audioRef.current) return null;

    const source = ctx.createMediaElementSource(audioRef.current);
    const newAnalyser = ctx.createAnalyser();
    
    newAnalyser.fftSize = 2048;
    newAnalyser.smoothingTimeConstant = 0.8;
    
    source.connect(newAnalyser);
    newAnalyser.connect(ctx.destination);
    
    return newAnalyser;
  };

  const initializeAudio = async () => {
    try {
      if (!audioRef.current) {
        console.error('No audio element reference available');
        return;
      }

      console.log('Initializing audio...', {
        isAudioInitialized,
        hasContext: !!audioContext,
        hasAnalyser: !!analyser
      });

      // If we already have an initialized context, don't recreate it
      if (isAudioInitialized && audioContext && analyser) {
        await audioContext.resume();
        return;
      }

      const ctx = new AudioContext();
      await ctx.resume();
      const source = ctx.createMediaElementSource(audioRef.current);
      const newAnalyser = ctx.createAnalyser();
      
      newAnalyser.fftSize = 2048;
      newAnalyser.smoothingTimeConstant = 0.8;
      
      source.connect(newAnalyser);
      newAnalyser.connect(ctx.destination);
      
      console.log('Audio initialized with new context and analyser');

      setAudioContext(ctx);
      setAnalyser(newAnalyser);
      setIsAudioInitialized(true);
      setNeedsUserInteraction(false);
    } catch (error) {
      console.error('Error initializing audio context:', error);
      setNeedsUserInteraction(true);
    }
};

  // New function to handle stream changes
  const recreateAudioGraph = async () => {
    if (!audioContext || !audioRef.current) return;

    try {
      // Suspend the context while we recreate the graph
      await audioContext.suspend();

      // Disconnect old nodes
      if (analyser) {
        analyser.disconnect();
      }

      // Create new audio graph
      const newAnalyser = await createAudioGraph(audioContext);
      if (!newAnalyser) return;

      setAnalyser(newAnalyser);
      await audioContext.resume();
    } catch (error) {
      console.error('Error recreating audio graph:', error);
    }
  };

  // Effect to watch for stream URL changes
  useEffect(() => {
    if (isAudioInitialized && audioRef.current) {
      const handleStreamChange = () => {
        recreateAudioGraph();
      };

      audioRef.current.addEventListener('loadeddata', handleStreamChange);
      return () => {
        audioRef.current?.removeEventListener('loadeddata', handleStreamChange);
      };
    }
  }, [isAudioInitialized]);

  useEffect(() => {
    if (isIOS) {
      setNeedsUserInteraction(true);
    }
  }, [isIOS]);

  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  return {
    audioContext,
    analyser,
    isAudioInitialized,
    needsUserInteraction,
    initializeAudio,
    isIOS,
    recreateAudioGraph
  };
};