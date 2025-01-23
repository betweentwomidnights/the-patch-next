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

    console.log('Initializing AudioContext...');
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();

    if (context.state === 'suspended') {
      await context.resume();
    }

    const analyserNode = context.createAnalyser();
    const source = context.createMediaElementSource(audioRef.current);
    source.connect(analyserNode).connect(context.destination);

    try {
      await context.audioWorklet.addModule('/worklet/fft-processor.js');
      const fftNode = new AudioWorkletNode(context, 'fft-processor');
      source.connect(fftNode).connect(context.destination);
      setFftWorkletNode(fftNode);
    } catch (error) {
      console.error('Error initializing AudioWorkletNode:', error);
    }

    setAudioContext(context);
    setAnalyser(analyserNode);
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