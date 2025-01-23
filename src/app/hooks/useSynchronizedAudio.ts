import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface StreamState {
  folder: string;
  file: string;
  startTime: number;
  duration: number;
  currentPosition: number;
  timestamp: number;
  listeners: number;
  nextTrack?: {
    folder: string;
    file: string;
    startTime: number;
  };
}

export const useSynchronizedAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamState | null>(null);
  const previousTrackRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endOfTrackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearScheduledTimeouts = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    if (endOfTrackTimeoutRef.current) {
      clearTimeout(endOfTrackTimeoutRef.current);
      endOfTrackTimeoutRef.current = null;
    }
  };

  // Schedule a check near the end of the current track
  const scheduleEndOfTrackCheck = (currentDuration: number, currentPosition: number) => {
    clearScheduledTimeouts();
    
    const timeUntilEnd = (currentDuration - currentPosition) * 1000;
    if (timeUntilEnd > 0) {
      // Schedule a check 3 seconds before track end
      const checkTime = timeUntilEnd - 3000;
      if (checkTime > 0) {
        endOfTrackTimeoutRef.current = setTimeout(() => {
          console.log('Performing end-of-track check');
          updateStreamState();
        }, checkTime);
      }
    }
  };

  const preloadNextTrack = (folder: string, file: string) => {
    if (nextAudioRef.current) {
      nextAudioRef.current.src = `/api/audio/${folder}/${file}`;
      nextAudioRef.current.load();
    }
  };

  const calculateStartTime = (serverTime: number, serverPosition: number) => {
    const localTime = Date.now();
    const serverNow = serverTime;
    const timeDiff = localTime - serverNow;
    return Date.now() - (serverPosition * 1000) - timeDiff;
  };

  const syncAudioToServer = (streamState: StreamState, audio: HTMLAudioElement) => {
    const startTime = calculateStartTime(streamState.timestamp, streamState.currentPosition);
    const expectedPosition = (Date.now() - startTime) / 1000;
    const currentPosition = audio.currentTime;
    
    // If we're more than 0.5 seconds off, adjust
    if (Math.abs(expectedPosition - currentPosition) > 0.5) {
      console.log('Syncing audio position', { expected: expectedPosition, current: currentPosition });
      audio.currentTime = expectedPosition;
    }
  };

  const switchToNextTrack = async (nextTrack: { folder: string; file: string; startTime: number }) => {
    if (!nextAudioRef.current || !audioRef.current) return;

    clearScheduledTimeouts();
    const wasPlaying = !audioRef.current.paused;
    
    nextAudioRef.current.src = `/api/audio/${nextTrack.folder}/${nextTrack.file}`;
    await nextAudioRef.current.load();
    nextAudioRef.current.currentTime = 0;
    
    const tempAudio = audioRef.current;
    audioRef.current = nextAudioRef.current;
    nextAudioRef.current = tempAudio;

    const now = Date.now();
    const delay = nextTrack.startTime - now;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      if (wasPlaying) {
        await audioRef.current.play();
      }
      
      nextAudioRef.current.pause();
      nextAudioRef.current.src = '';

      // Schedule an immediate sync after track switch
      syncTimeoutRef.current = setTimeout(updateStreamState, 100);
    } catch (error) {
      console.error('Error during track switch:', error);
    }
  };

  const updateStreamState = async () => {
    try {
      const response = await fetch('/api/stream/state');
      const streamState: StreamState = await response.json();
      
      const currentTrack = `${streamState.folder}/${streamState.file}`;
      const hasTrackChanged = previousTrackRef.current !== currentTrack;
      
      if (hasTrackChanged && audioRef.current) {
        console.log('Track changed, updating audio source...');
        clearScheduledTimeouts();
        
        const wasPlaying = !audioRef.current.paused;
        audioRef.current.src = `/api/audio/${streamState.folder}/${streamState.file}`;
        await audioRef.current.load();
        audioRef.current.currentTime = 0;

        if (wasPlaying) {
          await audioRef.current.play();
        }

        previousTrackRef.current = currentTrack;
      }

      // Schedule end of track check if we have duration info
      if (streamState.duration && streamState.currentPosition) {
        scheduleEndOfTrackCheck(streamState.duration, streamState.currentPosition);
      }

      if (streamState.nextTrack) {
        preloadNextTrack(streamState.nextTrack.folder, streamState.nextTrack.file);
      }

      setStreamInfo(streamState);
    } catch (error) {
      console.error('Error updating stream state:', error);
    }
  };

  const initializeAudio = async () => {
    try {
      audioRef.current = new Audio();
      nextAudioRef.current = new Audio();
      
      socketRef.current = io('/stream');
      
      socketRef.current.on('trackChange', (data: { 
        nextTrack: { folder: string; file: string; startTime: number; }
      }) => {
        if (data.nextTrack) {
          preloadNextTrack(data.nextTrack.folder, data.nextTrack.file);
          switchToNextTrack(data.nextTrack);
        }
      });

      const response = await fetch('/api/stream/state');
      const streamState: StreamState = await response.json();
      setStreamInfo(streamState);

      if (audioRef.current) {
        audioRef.current.src = `/api/audio/${streamState.folder}/${streamState.file}`;
        await audioRef.current.load();
        audioRef.current.currentTime = 0;
        previousTrackRef.current = `${streamState.folder}/${streamState.file}`;
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  useEffect(() => {
    initializeAudio();
    
    // Base sync interval of 2 seconds
    const intervalId = setInterval(updateStreamState, 500);

    return () => {
      clearScheduledTimeouts();
      clearInterval(intervalId);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    audioRef,
    streamInfo,
    initializeAudio,
    isPlaying,
    setIsPlaying
  };
};