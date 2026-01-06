import React, { useEffect, useState, useRef } from 'react';

interface StreamState {
  folder: string;
  file: string;
  startTime: number;
  duration: number;
  currentPosition: number;
  timestamp: number;
  listeners: number;
}

interface PlayPauseButtonProps {
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  audioContext: AudioContext | null;
  onPlayPause: (value: boolean) => void;
  setAudioContext: (value: AudioContext) => void;
  analyser: AnalyserNode | null;
  setAnalyser: (value: AnalyserNode) => void;
  fftWorkletNode: AudioWorkletNode | null;
  setFftWorkletNode: (node: AudioWorkletNode) => void;
  streamInfo: StreamState | null;
}

const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying,
  setIsPlaying,
  audioRef,
  audioContext,
  onPlayPause,
  analyser,
  setAudioContext,
  setAnalyser,
  fftWorkletNode,
  setFftWorkletNode,
  streamInfo,
}) => {
  const [firstPlay, setFirstPlay] = useState(true);
  const previousTrackRef = useRef<string | null>(null);

  // Track change effect
  useEffect(() => {
    if (!streamInfo || !audioRef.current) return;

    const currentTrack = `${streamInfo.folder}/${streamInfo.file}`;
    if (previousTrackRef.current && previousTrackRef.current !== currentTrack) {
      console.log('Track changed:', currentTrack);
      
      // Update audio source if needed
      const currentSource = audioRef.current.src;
      const expectedSource = `/api/audio/${streamInfo.folder}/${streamInfo.file}`;
      if (!currentSource.endsWith(expectedSource)) {
        audioRef.current.src = expectedSource;
      }

      // Maintain play state through track change
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
    previousTrackRef.current = currentTrack;
  }, [streamInfo, audioRef, isPlaying]);

  // Synchronization effect
  useEffect(() => {
    if (!streamInfo || !audioRef.current) return;

    const syncPlayback = () => {
      const serverTime = streamInfo.timestamp;
      const localTime = Date.now();
      const timeOffset = (localTime - serverTime) / 1000;
      let adjustedPosition = streamInfo.currentPosition + timeOffset;

      if (adjustedPosition >= streamInfo.duration) {
        adjustedPosition = adjustedPosition % streamInfo.duration;
      }

      // Only adjust if the difference is significant
      if (Math.abs(audioRef.current!.currentTime - adjustedPosition) > 1) {
        console.log('Syncing playback position to:', adjustedPosition);
        audioRef.current!.currentTime = adjustedPosition;
      }
    };

    // Sync periodically
    const syncInterval = setInterval(syncPlayback, 5000);
    
    // Initial sync
    syncPlayback();

    return () => clearInterval(syncInterval);
  }, [streamInfo, audioRef]);

  // Audio context initialization
  const initializeAudioContext = async () => {
    if (!audioRef.current || !streamInfo) return;
  
    console.log('Starting AudioContext initialization...');
    
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext created, state:', context.state);
  
      if (context.state === 'suspended') {
        console.log('Resuming suspended context...');
        await context.resume();
        console.log('Context resumed, new state:', context.state);
      }
  
      console.log('Creating audio nodes...');
      const analyserNode = context.createAnalyser();
      const source = context.createMediaElementSource(audioRef.current);
      source.connect(analyserNode).connect(context.destination);
      console.log('Basic audio pipeline connected');
  
      console.log('Adding FFT worklet module...');
      try {
        const workletUrl = '/worklet/fft-processor.js';
        console.log('Loading worklet from:', workletUrl);
        await context.audioWorklet.addModule(workletUrl);
        console.log('Worklet module loaded successfully');
  
        console.log('Creating FFT AudioWorkletNode...');
        const fftNode = new AudioWorkletNode(context, 'fft-processor', {
          processorOptions: {
            debugMode: true
          }
        });
  
        // Add message port error handling
        fftNode.port.onmessageerror = (event) => {
          console.error('FFT WorkletNode message error:', event);
        };
  
        // Monitor node state
        fftNode.onprocessorerror = (event) => {
          console.error('FFT processor error:', event);
        };
  
        source.connect(fftNode).connect(context.destination);
        console.log('FFT node connected successfully');
        
        // Test the message channel
        fftNode.port.postMessage({ type: 'test' });
        console.log('Test message sent to worklet');
  
        setFftWorkletNode(fftNode);
      } catch (error: unknown) {
        // Type guard for Error objects
        if (error instanceof Error) {
          console.error('Detailed worklet error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        } else {
          console.error('Unknown worklet error:', error);
        }
        throw error;
      }
  
      setAudioContext(context);
      setAnalyser(analyserNode);
      console.log('Audio initialization completed successfully');
      
    } catch (error: unknown) {
      // Type guard for Error objects
      if (error instanceof Error) {
        console.error('Fatal audio initialization error:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error('Unknown fatal error:', error);
      }
      throw error;
    }
  };
  
  const handlePlay = async () => {
    if (!audioRef.current || !streamInfo) return;

    if (firstPlay) {
      await initializeAudioContext();
      setFirstPlay(false);
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      onPlayPause(true);
    } catch (error) {
      console.error('Error starting audio playback:', error);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayPause(false);
    }
  };

  return (
    <div className="play-pause-button">
      <button 
    onClick={isPlaying ? handlePause : handlePlay}
    className="w-full h-full bg-transparent border-none text-inherit p-0 m-0 z-50 transition-colors duration-300 hover:text-gray-500"
  >
    {isPlaying ? 'Pause' : 'Play'}
  </button>
    </div>
  );
};

export default PlayPauseButton;
