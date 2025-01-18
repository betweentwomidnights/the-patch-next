import React, { useEffect, useState, useRef } from 'react';
import { detectIOS } from '../../utils/detectIOS';

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
  setFftWorkletNode
}) => {
  const [firstPlay, setFirstPlay] = useState(true);
  const isIOS = detectIOS();
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlaying = () => {
      setIsPlaying(true);
      onPlayPause(true);
    };

    const handlePause = () => {
      if (!isPlaying) setIsPlaying(false);
      onPlayPause(false);
    };

    audioRef.current.addEventListener('play', handlePlaying);
    audioRef.current.addEventListener('pause', handlePause);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlaying);
        audioRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, [audioRef, onPlayPause, isPlaying, setIsPlaying]);

  const handlePlay = async () => {
    console.log('handlePlay called', {
      firstPlay,
      hasAudioRef: !!audioRef.current,
      currentPlaybackState: audioRef.current?.paused ? 'paused' : 'playing'
    });

    if (!audioRef.current) return;

    if (firstPlay) {
      console.log('Initializing first play with new native AudioContext');
      // Use native AudioContext for maximum compatibility with AudioWorklet
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Resume the context on user gesture (required by iOS Safari)
      if (context.state === 'suspended') {
        console.log('Context is suspended, attempting resume...');
        await context.resume();
        console.log('Context state after resume:', context.state);
      }

      console.log('Creating audio nodes after resume');
      const analyserNode = context.createAnalyser();
      const source = context.createMediaElementSource(audioRef.current);

      // Connect source → analyser → destination by default
      source.connect(analyserNode).connect(context.destination);

      if (isIOS) {
        console.log('iOS detected, using AudioWorkletNode');
        try {
          // Check for AudioWorklet support
          if (!context.audioWorklet) {
            throw new Error('AudioWorklet not supported in this environment.');
          }

          // Load the AudioWorklet processor code
          await context.audioWorklet.addModule('/worklet/fft-processor.js');

          // Create the AudioWorkletNode
          const fftNode = new AudioWorkletNode(context, 'fft-processor');

          // Re-route the audio to pass through the fftNode:

          // Attempt channel configuration
          fftNode.channelCount = source.channelCount;
          fftNode.channelCountMode = 'explicit';
          fftNode.channelInterpretation = 'discrete';


          
          source.connect(fftNode).connect(context.destination);
          
          //fftNode.connect(analyserNode);
          //analyserNode.connect(context.destination);

          setFftWorkletNode(fftNode);
          console.log('AudioWorkletNode setup completed successfully.');
        } catch (e) {
          console.error('Failed to load or initialize AudioWorkletNode:', e);
        }
      } else {
        console.log('Non-iOS platform, no worklet needed');
      }

      setAudioContext(context);
      setAnalyser(analyserNode);
      setFirstPlay(false);

      console.log('Loading audio element');
      audioRef.current.load();

      try {
        await audioRef.current.play();
        console.log('Audio started playing', {
          currentTime: audioRef.current?.currentTime,
          duration: audioRef.current?.duration,
          contextState: context.state
        });
        setIsPlaying(true);
        onPlayPause(true);
      } catch (error) {
        console.error('Error playing audio:', {
          error,
          contextState: context.state,
          audioElementReadyState: audioRef.current?.readyState
        });
      }

    } else {
      // Subsequent plays: just resume if needed and then play
      if (audioContext && audioContext.state === 'suspended') {
        console.log('Resuming audio context on subsequent play');
        await audioContext.resume();
        console.log('Context resumed:', audioContext.state);
      }

      try {
        await audioRef.current.play();
        console.log('Audio resumed', {
          currentTime: audioRef.current?.currentTime,
          duration: audioRef.current?.duration
        });
        setIsPlaying(true);
        onPlayPause(true);
      } catch (error) {
        console.error('Error resuming audio:', {
          error,
          audioElementReadyState: audioRef.current?.readyState
        });
      }
    }
  };

  const handlePause = () => {
    console.log('handlePause called');
    if (audioRef.current) {
      audioRef.current.pause();
      console.log('Audio paused');
      setIsPlaying(false);
      onPlayPause(false);
    }
  };

  return (
    <div className="play-pause-button" onClick={isPlaying ? handlePause : handlePlay}>
      <button>{isPlaying ? 'Pause' : 'Play'}</button>
    </div>
  );
};

export default PlayPauseButton;
