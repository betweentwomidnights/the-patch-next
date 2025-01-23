import React, { useState } from 'react';

interface SwitchStreamButtonProps {
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyser: (analyser: AnalyserNode) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  setStreamUrl: (streamUrl: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  setIsSwitchStreamClicked: (isSwitchStreamClicked: boolean) => void;
}

const streamUrls = {
  captains_chair: '/api/audio/CCFiles/the_clusterfuck.mp3',
  infinitepolo: 'https://thecollabagepatch.com/infinitepolo.mp3',
  playlist: 'https://thecollabagepatch.com/playlist.mp3',
  yikesawjeez: 'https://thecollabagepatch.com/yikesawjeez.mp3',
  audiocraft: 'https://thecollabagepatch.com/audiocraft.mp3',
  kemp: 'https://thecollabagepatch.com/kemp.mp3'
};

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
  const [currentStream, setCurrentStream] = useState('captains_chair');

  const switchStream = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setIsSwitchStreamClicked(true);
    const newStream = event.target.value as keyof typeof streamUrls;

    const updateStream = () => {
      setStreamUrl(streamUrls[newStream]);
      setCurrentStream(newStream);

      if (audioRef.current) {
        audioRef.current.load(); // Load new source into the audio element
      }
    };

    if (audioContext && analyser) {
      // Suspend the context before switching streams to ensure a clean transition
      audioContext.suspend().then(() => {
        updateStream();
        return audioContext.resume(); // Resume after the new source is loaded
      })
      .then(() => {
        if (audioRef.current) {
          audioRef.current.play(); // Start playing the new stream
        }
      })
      .then(() => setIsPlaying(true))
      .catch((error) => {
        console.error('Error switching streams:', error);
      });
    } else {
      // If audioContext and analyser are not initialized yet, just update the stream.
      updateStream();
    }
  };

  return (
    <div className="switch-stream-button">
      <select
        onChange={switchStream}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          borderRadius: '12px',
          border: '1px solid white',
          color: 'white',
          padding: '8px 16px',
          margin: '12px',
        }}
        value={currentStream}
      >
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
