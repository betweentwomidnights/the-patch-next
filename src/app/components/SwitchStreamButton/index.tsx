import React, { useState } from 'react';
import { AudioContext, IAnalyserNode } from 'standardized-audio-context';

interface SwitchStreamButtonProps {
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyser: (analyser: IAnalyserNode<AudioContext>) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  setStreamUrl: (streamUrl: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  audioContext: AudioContext | null;
  analyser: IAnalyserNode<AudioContext> | null;
  setIsSwitchStreamClicked: (isSwitchStreamClicked: boolean) => void;
}

const SwitchStreamButton: React.FC<SwitchStreamButtonProps> = ({
  setAudioContext,
  setAnalyser,
  audioRef,
  setStreamUrl,
  setIsPlaying,
  audioContext,
  analyser,
  setIsSwitchStreamClicked
}) => {
  
  const [currentStream, setCurrentStream] = useState('playlist');

  const switchStream = () => {
    setIsSwitchStreamClicked(true);
    if (audioContext && analyser) {
        audioContext.suspend().then(() => {
            // Switch the stream
            if (currentStream === 'playlist') {
              setStreamUrl('https://thecollabagepatch.com/yikesawjeez.mp3');
              setCurrentStream('yikesawjeez');
            } else {
              setStreamUrl('https://thecollabagepatch.com/playlist.mp3');
              setCurrentStream('playlist');
            }
        
            setIsPlaying(false);
        
            if (audioRef.current) {
              audioRef.current.load(); // Load new source into audio element
            }
        })
        .then(() => audioContext.resume()) // Wait for new source to load, then resume
        .then(() => {
            if (audioRef.current) {
              audioRef.current.play(); // Directly call play method on audioRef.current
            }
        })
        .then(() => setIsPlaying(true)) // Set isPlaying to true after audio context is resumed
        .catch((error) => {
            console.error('Error switching streams:', error);
        });
        
    }
  };

  return (
    <div className="switch-stream-button">
      <button onClick={switchStream} style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        borderRadius: '12px',
        border: '1px solid white',
        color: 'white',
        padding: '8px 16px',
        margin: '12px',
      }}>
        {currentStream === 'playlist' ? 'AI Music' : 'Collabages'}
      </button>
    </div>
  );
};

export default SwitchStreamButton;
