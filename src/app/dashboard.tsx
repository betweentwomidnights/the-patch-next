'use client'; // This line marks this file as a Client Component

import React, { useState, useRef, Suspense, useEffect } from 'react';
import { detectIOS } from './utils/detectIOS'; // Ensure the path to detectIOS is correct
import PlayPauseButton from './components/PlayPauseButton';
import SwitchStreamButton from './components/SwitchStreamButton';
import ExpandableAboutButton from './components/ExpandableAboutButton';
import SocialMediaButtonGroup from './components/SocialButtons';
import Intro from './components/Intro';
import ChangeChannelButton from './components/ChangeChannelButton';
import useHybridAudioAnalyzer from './hooks/useAudioSpectrumAnalyzer';

const Home = React.lazy(() => import('./home'));
const Shaders = React.lazy(() => import('./shaders'));
const Gary = React.lazy(() => import('./gary'));

interface DashboardProps {
  initialComponent: 'shaders' | 'home' | 'gary';
}

const Dashboard: React.FC<DashboardProps> = ({ initialComponent }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('/api/streams/captains_chair.mp3');

  // Use native AudioContext and AnalyserNode types
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [fftWorkletNode, setFftWorkletNode] = useState<AudioWorkletNode | null>(null);

  const spectrumData = useHybridAudioAnalyzer({
    audioRef,
    audioContext,
    analyser,
    isPlaying,
    fftWorkletNode,
    fftSize: 2048
  });

  const [run, setRun] = useState<boolean>(false);
  const [isPlayPauseClicked, setIsPlayPauseClicked] = useState<boolean>(false);
  const [isChangeImageClicked, setIsChangeImageClicked] = useState<boolean>(false);
  const [isSwitchStreamClicked, setIsSwitchStreamClicked] = useState<boolean>(false);

  const [activeComponent, setActiveComponent] = useState<'shaders' | 'home' | 'gary'>(initialComponent);

  useEffect(() => {
    setActiveComponent(initialComponent);
  }, [initialComponent]);

  const handleChannelChange = () => {
    setActiveComponent(prevComponent => (prevComponent === 'shaders' ? 'home' : 'shaders'));
  };

  const steps = [
    {
      target: '.play-pause-button',
      content: 'press play dummy',
      advanceOn: '.play-pause-button',
    },
    {
      target: '.change-image-button',
      content: 'whats is this do',
      advanceOn: '.change-image-button',
    },
    {
      target: '.switch-stream-button',
      content: 'you can click this too idiot',
      advanceOn: '.switch-stream-button',
    },
  ];

  return (
    <div className={`Dashboard ${activeComponent === 'gary' ? 'gary-page-active' : ''}`}>
      {activeComponent === 'gary' && (
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed top-0 left-0 w-full h-full object-cover z-0"
            style={{ filter: 'brightness(0.3)' }}
          >
            <source src="gary_blw_compressed.mp4" type="video/mp4" />
          </video>
        </div>
      )}

<audio
  ref={audioRef}
  crossOrigin="anonymous"
  src={streamUrl}
  controls={false}
/>

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
        fftWorkletNode={fftWorkletNode}
        setFftWorkletNode={setFftWorkletNode}
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
      <ChangeChannelButton onClick={handleChannelChange} />

      <button
        className="gary-button"
        onClick={() => setActiveComponent('gary')}
        style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 50 }}
      >
        gary&apos;s page
      </button>

      <Suspense fallback={<div>Loading...</div>}>
        {activeComponent === 'shaders' && <Shaders spectrumData={spectrumData} />}
        {activeComponent === 'home' && (
          <Home
            spectrumData={spectrumData}
            isChangeImageClicked={isChangeImageClicked}
            setIsChangeImageClicked={setIsChangeImageClicked}
          />
        )}
        {activeComponent === 'gary' && (
          <Gary
            setStreamUrl={setStreamUrl}
            setIsPlaying={setIsPlaying}
            setAudioContext={setAudioContext}
            setAnalyser={setAnalyser}
            audioRef={audioRef}
            audioContext={audioContext}
            analyser={analyser}
            setIsSwitchStreamClicked={setIsSwitchStreamClicked}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Dashboard;
