//  /app/dashboard.tsx
'use client'; // This line marks this file as a Client Component

import React, { useState, useRef, Suspense } from 'react';
import { AudioContext, IAnalyserNode } from 'standardized-audio-context';
import PlayPauseButton from './components/PlayPauseButton';
import SwitchStreamButton from './components/SwitchStreamButton';
import ExpandableAboutButton from './components/ExpandableAboutButton';
import SocialMediaButtonGroup from './components/SocialButtons';
import Intro from './components/Intro';
import ChangeChannelButton from './components/ChangeChannelButton';


import useAudioSpectrumAnalyzer from './hooks/useAudioSpectrumAnalyzer';

const Home = React.lazy(() => import('./home'));
const Shaders = React.lazy(() => import('./shaders'));

const Dashboard: React.FC = () => {
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('https://thecollabagepatch.com/playlist.mp3');

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<IAnalyserNode<AudioContext> | null>(null);

  const spectrumData = useAudioSpectrumAnalyzer({ audioContext, analyser, isPlaying });

  const [run, setRun] = useState<boolean>(false);
  const [isPlayPauseClicked, setIsPlayPauseClicked] = useState<boolean>(false);
  const [isChangeImageClicked, setIsChangeImageClicked] = useState<boolean>(false);
  const [isSwitchStreamClicked, setIsSwitchStreamClicked] = useState<boolean>(false);

  const [currentChannel, setCurrentChannel] = useState('home'); // Add a state variable to maintain current channel

  const handleChannelChange = () => { // Add a method to handle channel change
    setCurrentChannel(prevChannel => prevChannel === 'home' ? 'shaders' : 'home');
  };

  const steps = [
    {
      target: '.play-pause-button',
      content: 'press play dummy',
      advanceOn: '.play-pause-button'
    },
    {
      target: '.change-image-button',
      content: 'whats is this do',
      advanceOn: '.change-image-button'
    },
    {
      target: '.switch-stream-button',
           content: 'you can click this too idiot',
      advanceOn: '.switch-stream-button',
    },
  ];

  


  return (
    <div className="Dashboard">
      <audio ref={audioRef} src={streamUrl} crossOrigin="anonymous" />
      <Intro 
        steps={steps} 
        setRun={setRun} 
        run={run} 
        isPlayPauseClicked={isPlayPauseClicked} 
        isChangeImageClicked={isChangeImageClicked}
        isSwitchStreamClicked={isSwitchStreamClicked}
      />
      <PlayPauseButton 
        audioRef={audioRef}
        onPlayPause={(isPlaying: boolean) => { 
          setIsPlaying(isPlaying); 
          if (isPlaying) setIsPlayPauseClicked(true);
        }}
        audioContext={audioContext} 
        analyser={analyser} 
        setAudioContext={setAudioContext} 
        setAnalyser={setAnalyser} 
        isPlaying={isPlaying} 
        setIsPlaying={setIsPlaying}
      />
      <SwitchStreamButton 
        setAnalyser={setAnalyser} 
        setAudioContext={setAudioContext}
        audioRef={audioRef}        
        setStreamUrl={setStreamUrl} 
        setIsPlaying={setIsPlaying} 
        audioContext={audioContext} 
        analyser={analyser} 
        setIsSwitchStreamClicked={setIsSwitchStreamClicked}
      />
      <ExpandableAboutButton />
      <SocialMediaButtonGroup />
      <ChangeChannelButton onClick={handleChannelChange} /> {/* Include the ChangeChannelButton component */}
      <Suspense fallback={<div>Loading...</div>}>
        {currentChannel === 'home' ? ( // Conditionally render Home or Shaders based on currentChannel
          <Home 
            spectrumData={spectrumData} 
            isChangeImageClicked={isChangeImageClicked} 
            setIsChangeImageClicked={setIsChangeImageClicked} 
          />
        ) : (
          <Shaders spectrumData={spectrumData} />
        )}
      </Suspense>
    </div>
  );
}

export default Dashboard;
