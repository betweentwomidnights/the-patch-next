import React, { useEffect, useState } from 'react';
import { AudioContext, IAnalyserNode } from 'standardized-audio-context';

interface PlayPauseButtonProps {
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  audioContext: AudioContext | null;
  onPlayPause: (value: boolean) => void;
  setAudioContext: (value: AudioContext) => void;
  analyser: IAnalyserNode<AudioContext> | null;
  setAnalyser: (value: IAnalyserNode<AudioContext>) => void;
}

const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying, 
  setIsPlaying, 
  audioRef, 
  audioContext, 
  onPlayPause, 
  analyser, 
  setAudioContext, 
  setAnalyser
}) => {
  const [firstPlay, setFirstPlay] = useState(true);

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
  }, [audioRef, onPlayPause, setIsPlaying]);

  const handlePlay = () => {
    console.log('handlePlay called');
    if (firstPlay && audioRef.current) {
      const context = new AudioContext(); // Use AudioContext from standardized-audio-context
      if (context) {
        const analyserNode = context.createAnalyser();
        const source = context.createMediaElementSource(audioRef.current);

        if (source && analyserNode) {
          source.connect(analyserNode);
          analyserNode.connect(context.destination);

          setAudioContext(context);
          setAnalyser(analyserNode);
          setFirstPlay(false);

          audioRef.current.load();
          audioRef.current.play()
            .then(() => {
                console.log('Audio started playing');
                setIsPlaying(true);
                onPlayPause(true);
            })
            .catch((error) => console.error('Error playing audio:', error));
        }
      }
    } else if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
            console.log('Audio resumed');
            setIsPlaying(true);
            onPlayPause(true);
        })
        .catch((error) => console.error('Error resuming audio:', error));
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