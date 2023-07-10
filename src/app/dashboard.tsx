//  /app/page.tsx
'use client'; // This line marks this file as a Client Component

import React, { useState, useRef } from 'react';
import { AudioContext, IAnalyserNode } from 'standardized-audio-context';
import PlayPauseButton from './components/PlayPauseButton';
import SwitchStreamButton from './components/SwitchStreamButton';
import ExpandableAboutButton from './components/ExpandableAboutButton';
import SocialMediaButtonGroup from './components/SocialButtons';
import Intro from './components/Intro';
import Home from './home';
import useAudioSpectrumAnalyzer from './hooks/useAudioSpectrumAnalyzer';

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
      <Home 
        spectrumData={spectrumData} 
        isChangeImageClicked={isChangeImageClicked} 
        setIsChangeImageClicked={setIsChangeImageClicked} 
      />
    </div>
  );
}

export default Dashboard;
