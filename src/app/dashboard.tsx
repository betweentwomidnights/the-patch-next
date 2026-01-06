'use client'; // This line marks this file as a Client Component

import React, { useState, useRef, Suspense, useEffect } from 'react';
import { detectIOS } from './utils/detectIOS'; // Ensure the path to detectIOS is correct
import PlayPauseButton from './components/PlayPauseButton';
import SocialMediaButtonGroup from './components/SocialButtons';
import useHybridAudioAnalyzer from './hooks/useAudioSpectrumAnalyzer';
import { useSynchronizedAudio } from './hooks/useSynchronizedAudio';
import NowPlaying from './components/NowPlaying';
import SpectrumDebugger from './SpectrumDebugger';
import { ArrowLeft } from 'lucide-react'; // Import ArrowLeft icon for back button


const Shaders = React.lazy(() => import('./shaders'));
const Gary = React.lazy(() => import('./gary'));

interface DashboardProps {
  initialComponent: 'shaders' | 'gary';
}

const Dashboard: React.FC<DashboardProps> = ({ initialComponent }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const { audioRef, streamInfo } = useSynchronizedAudio();

  // Use native AudioContext and AnalyserNode types
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [fftWorkletNode, setFftWorkletNode] = useState<AudioWorkletNode | null>(null);

  const spectrumData = useHybridAudioAnalyzer({
    audioRef,
    audioContext,
    //analyser,
    isPlaying,
    fftWorkletNode,
    fftSize: 2048
  });


  const [isPlayPauseClicked, setIsPlayPauseClicked] = useState<boolean>(false);
  
  const [isSwitchStreamClicked, setIsSwitchStreamClicked] = useState<boolean>(false);

  const [activeComponent, setActiveComponent] = useState<'shaders' | 'gary'>(initialComponent);

  useEffect(() => {
    setActiveComponent(initialComponent);
  }, [initialComponent]);

  // const handleChannelChange = () => {
  //   setActiveComponent(prevComponent => (prevComponent === 'shaders' ? 'home' : 'shaders'));
  // };

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
  controls={false}
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
        streamInfo={streamInfo} // Add this prop
      />
      {/*<SpectrumDebugger spectrumData={spectrumData} fftSize={2048} sampleRate={44100} /> */}
      <SocialMediaButtonGroup />

      <button
        className="transition-all duration-300 fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-black hover:bg-gray-500 text-white flex items-center gap-2 border border-white mobile-gary-button"
        onClick={() => setActiveComponent(activeComponent === 'gary' ? 'shaders' : 'gary')}
      >
        {activeComponent === 'gary' ? (
          <>
            <ArrowLeft size={20} />
          </>
        ) : (
          "more about that gary"
        )}
      </button>
      {/* Only show NowPlaying when shaders component is active */}
      {activeComponent === 'shaders' && <NowPlaying />}
      

      <Suspense fallback={<div>Loading...</div>}>
        {activeComponent === 'shaders' && <Shaders spectrumData={spectrumData} />}
        {activeComponent === 'gary' && (
          <Gary
            
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
