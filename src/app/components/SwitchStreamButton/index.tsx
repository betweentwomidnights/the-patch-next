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

const streamUrls = {
  captains_chair: 'https://thecollabagepatch.com/captains_chair.mp3',
  infinitepolo: 'https://thecollabagepatch.com/infinitepolo.mp3',
  playlist: 'https://thecollabagepatch.com/playlist.mp3',
  yikesawjeez: 'https://thecollabagepatch.com/yikesawjeez.mp3',
  audiocraft: 'https://thecollabagepatch.com/audiocraft.mp3',
  kemp: 'https://thecollabagepatch.com/kemp.mp3'
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

  const [currentStream, setCurrentStream] = useState('infinitepolo');

  const switchStream = (event: React.ChangeEvent<HTMLSelectElement>) => {
  setIsSwitchStreamClicked(true);
  const newStream = event.target.value as keyof typeof streamUrls; // Type assertion
  
  const updateStream = () => {
    setStreamUrl(streamUrls[newStream]);
    setCurrentStream(newStream);
  
    if (audioRef.current) {
      audioRef.current.load(); // Load new source into audio element
    }
  }

  if (audioContext && analyser) {
    audioContext.suspend().then(() => {
      updateStream();
      return audioContext.resume(); // Wait for new source to load, then resume
    })
    .then(() => {
      if (audioRef.current) {
        audioRef.current.play(); // Directly call play method on audioRef.current
      }
    })
    .then(() => setIsPlaying(true)) // Set isPlaying to true after audio context is resumed
    .catch((error) => {
      console.error('Error switching streams:', error);
    });
  } else {
    // If audioContext and analyser are not initialized, just update the stream.
    updateStream();
  }
};

  return (
    <div className="switch-stream-button">
      <select onChange={switchStream} style={{
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
        <option value="captains_chair">captain&apos;s chair /captains_chair.mp3</option>
        <option value="infinitepolo">the infinite remix /infinitepolo.mp3</option>
        <option value="playlist">collabages /playlist.mp3</option>
        <option value="yikesawjeez">the yikes stream /yikesawjeez.mp3</option>
        <option value="audiocraft">gary and kev /audiocraft.mp3</option>
        <option value="kemp">dj sets by chris hrtz /kemp.mp3</option>
      </select>
    </div>
  );
};

export default SwitchStreamButton;
