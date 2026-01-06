import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';
import StatusIndicator from './StatusIndicator';
import useIsSafari from './hooks/useIsSafari';
import MutedVideoPlayer from './MutedVideoPlayer'
import WaitlistModal from './WaitlistModal';

interface GaryPageProps {
  setIsPlaying: (isPlaying: boolean) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyser: (analyser: AnalyserNode) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  setIsSwitchStreamClicked: (isSwitchStreamClicked: boolean) => void;
}

const GaryPage: React.FC<GaryPageProps> = ({
  setIsPlaying,
  setAudioContext,
  setAnalyser,
  audioRef,
  audioContext,
  analyser,
  setIsSwitchStreamClicked
}) => {
  const [activeSection, setActiveSection] = useState('history');
  const [showYouTubeDemo, setShowYouTubeDemo] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const isSafari = useIsSafari();

  // Scroll tracking state (copied from Landing.tsx)
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const scrollTimeout = useRef<number | null>(null);
  const lastScrollPosition = useRef(0);

  // Track scroll position (copied exactly from Landing.tsx)
  useEffect(() => {
    const handleScroll = () => {
      // Cancel any pending scroll timeout
      if (scrollTimeout.current) {
        window.cancelAnimationFrame(scrollTimeout.current);
      }

      // Use requestAnimationFrame for smooth updates
      scrollTimeout.current = window.requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        setIsScrollingUp(currentScroll < lastScrollPosition.current);
        setScrollPosition(currentScroll);
        lastScrollPosition.current = currentScroll;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        window.cancelAnimationFrame(scrollTimeout.current);
      }
    };
  }, []);

  // Calculate transforms (adjusted for Gary page)
  const headerTransform = Math.max(0, Math.min(1, scrollPosition / 100));
  const tabsTransform = scrollPosition > 100 
    ? 0  // Stick much closer to the top
    : scrollPosition === 0 
    ? 200  // Start lower to avoid covering content
    : 200 - (scrollPosition * (220/100)); // Slide from 300px to 80px

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Fixed Header - Gary title + Status (fades out on scroll) */}
      <header
        className="fixed w-full z-40 transition-transform duration-300 ease-out backdrop-blur-md py-4"
        style={{
          top: '60px', // Clear space from parent dashboard
          transform: `translateY(${-headerTransform * 180}%)`, // More dramatic fade
          opacity: 1 - headerTransform
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl mb-4">gary</h1>
          
          {/* Status Indicators */}
          <div className="flex justify-center items-center space-x-2 mb-4">
            <StatusIndicator
              statusUrl="https://g4l.thecollabagepatch.com"
              label="backend status"
            />
          </div>

          {/* Persistent Tooltip */}
          <p className="text-sm text-gray-400">
            green means gary&apos;s backend is live. red means he&apos;s asleep.
          </p>
        </div>
      </header>

      {/* Sticky Tab Navigation (slides up and sticks) */}
      <div
        className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translateY(${tabsTransform}px)`,
          opacity: scrollPosition > 0 ? 1 : 0.95
        }}
      >
        <div className="flex justify-center">
          <div className="inline-flex gap-3 bg-black/40 backdrop-blur-md p-4 rounded-lg">
            <button 
              onClick={() => setActiveSection('history')} 
              className={`py-2 px-3 transition-all duration-200 rounded ${
                activeSection === 'history' 
                  ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                  : 'bg-transparent border border-white hover:bg-white/20'
              }`}
            >
              history
            </button>
            <button 
              onClick={() => setActiveSection('resources')} 
              className={`py-2 px-3 transition-all duration-200 rounded ${
                activeSection === 'resources' 
                  ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                  : 'bg-transparent border border-white hover:bg-white/20'
              }`}
            >
              resources
            </button>
            <button 
              onClick={() => setActiveSection('localBackend')} 
              className={`py-2 px-3 transition-all duration-200 rounded ${
                activeSection === 'localBackend' 
                  ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                  : 'bg-transparent border border-white hover:bg-white/20'
              }`}
            >
              local backend
            </button>
            <button 
              onClick={() => setActiveSection('about')} 
              className={`py-2 px-3 transition-all duration-200 rounded ${
                activeSection === 'about' 
                  ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                  : 'bg-transparent border border-white hover:bg-white/20'
              }`}
            >
              about
            </button>
          </div>
        </div>
      </div>

      {/* ORIGINAL GARY PAGE STRUCTURE - keeping the original layout */}
      <div className="relative z-10 text-white pt-20 md:pt-10 pb-32 px-4 mx-auto max-w-4xl mb-16">
        {/* Foreground content */}
        <div className="relative z-10">
          
          {/* INVISIBLE SPACER - this pushes content down past the fixed elements */}
          <div className="h-60"></div>

          {/* Default Section: What's a Gary Tho */}
          {activeSection === '' && (
            <div>
              <h2 className="text-xl md:text-3xl mb-4">what&apos;s a gary tho</h2>
              {/* Image/Video: use the correct format depending on browser */}
              <div className="flex justify-center mb-4">
                {isSafari ? (
                  <img 
                    src="output_transparent.gif" 
                    alt="Gary Animation" 
                    className="w-full max-w-xs md:max-w-md lg:max-w-lg object-contain" 
                  />
                ) : (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-xs md:max-w-md lg:max-w-lg object-contain"
                  >
                    <source src="gary_clr_compressed.webm" type="video/webm" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              <p>
                vibecore tools
              </p>
            </div>
          )}

          {/* "history" Section */}
          {activeSection === 'history' && (
            <div>
              {/* Feature the new video prominently */}
              <div className="flex justify-center mb-6">
                <video
                  className="w-full max-w-2xl rounded-lg"
                  src="/gary_full_960_24fps.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              <p>
                gary started out as a python script that used bmp detection to choose sections of a full song to continue from, and then stitch them together into a (not very) seamless piece of music.
              </p>
              <a href="https://colab.research.google.com/drive/10CMvuI6DV_VPS0uktbrOB8jBQ7IhgDgL" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
                <img src="/colab-color.svg" alt="Colab" className="inline w-5 h-5 mr-2" />
                colab notebook
              </a>
              <p>wanting more granular control, the max4live device was made next. it still works and uses the same backend (websockets routes) you can find that here:</p>
              <a href="https://github.com/betweentwomidnights/gary4live" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
                <FontAwesomeIcon icon={faGithub} /> gary4live on github
              </a>
              <p>couldn&apos;t forget about the fl studio people, so the vst/au was created. this one is being actively developed.</p>
              <a href="https://github.com/betweentwomidnights/gary4juce" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
                <FontAwesomeIcon icon={faGithub} /> gary4juce on github
              </a>
            </div>
          )}

          {activeSection === 'resources' && (
            <div>
              <h2 className="text-xl md:text-3xl mb-4">fine-tuning & development resources</h2>
              
              {/* MusicGen Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">MusicGen (gary)</h3>
                <p className="mb-3">fine-tuned models from the musicgen discord community hosted here. use &quot;thepatch/bleeps-medium&quot; or &quot;thepatch/vanya_ai_dnb_0.1&quot;, or &quot;thepatch/hoenn_lofi&quot; in your notebook/environment instead of &quot;facebook/musicgen-small&quot;. or just download the weights yourself. they&apos;re free.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <a href="https://huggingface.co/thepatch" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    🤗huggingface hub🤗
                  </a>
                  <a href="https://colab.research.google.com/drive/1KRJE2iBd1uPKtMMGqL2zSIszPljRSOTG?usp=share_link" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    <img src="/colab-color.svg" alt="Colab" className="inline w-5 h-5 mr-2" />
                    beginner fine-tuning
                  </a>
                  <a href="https://colab.research.google.com/gist/fyremael/c85df73487ab8bec51fe421723dd9606/audiocraftwerk_v0-2-1-1.ipynb" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    <img src="/colab-color.svg" alt="Colab" className="inline w-5 h-5 mr-2" />
                    advanced fine-tuning
                  </a>
                </div>
                <p className="text-sm text-gray-400">16gb of gpu ram to train a small model. get together a hundred songs of a hyper specific style. electronic music is better. it&apos;s really much better to do a medium model, but it takes 29gb of gpu ram. shoutout to lyra for the original braindead finetuner, and baltigor for the advanced one.</p>
                <p className="text-sm text-gray-400">if you want help finetuning, @baltigor in the musicgen <a href="https://discord.gg/Mxd3nYQre9" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">discord</a></p>
              </div>

              {/* Stable Audio Open Small Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Stable Audio Open Small (jerry)</h3>
                <p className="mb-3">jerry would get infinitely cooler with finetunes. the training scripts are here:</p>
                <a href="https://github.com/Stability-AI/stable-audio-tools" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-3">
                  <FontAwesomeIcon icon={faGithub} /> stable-audio-tools
                </a>
                <p className="text-sm text-gray-400">if anyone has a finetune of SAOS, email kev@thecollabagepatch.com</p>
              </div>

              {/* Melodyflow Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Melodyflow (terry)</h3>
                <p className="mb-3">melodyflow&apos;s training code hasn&apos;t and may never be released. it should be possible to train a model from scratch using this architecture - something i plan to do with funding. finetunes on this model would be quite fun.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <a href="https://huggingface.co/spaces/facebook/Melodyflow" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    🤗 inference space
                  </a>
                  <a href="https://github.com/betweentwomidnights/melodyflow" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    <FontAwesomeIcon icon={faGithub} /> docker container
                  </a>
                  <a href="https://huggingface.co/facebook/melodyflow-t24-30secs" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    🤗 model weights
                  </a>
                </div>
              </div>

              {/* Experimental Spaces */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">huggingface spaces</h3>
                <div className="flex flex-wrap gap-2">
                  <a href="https://huggingface.co/spaces/thepatch/stable-melodyflow" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    🤗 stable-melodyflow
                  </a>
                  <a href="https://huggingface.co/spaces/thepatch/micro-slot-machine" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-segold py-2 px-4 rounded hover:underline">
                    🤗 micro-slot-machine
                  </a>
                </div>
                <p className="text-sm text-gray-400 mt-2">collaborative experiments with community members</p>
              </div>
            </div>
          )}

          {activeSection === 'localBackend' && (
            <div>
              <h2 className="text-xl md:text-3xl mb-4">run gary locally</h2>
              
              <p className="mb-4">
                since gary is free and open source, you can build the backend for it yourself locally if you have a gpu. the backends for gary4juce, gary4live, and gary4beatbox are all contained here in separate docker-compose files.
              </p>
              
              <a href="https://github.com/betweentwomidnights/gary-backend-combined" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
                <FontAwesomeIcon icon={faGithub} /> combined gary backend
              </a>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">docker compose (recommended)</h3>
                <p className="mb-3">the docker compose network can support several ppl at once. requires ~10+ gb gpu vram.</p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">windows installer</h3>
                <p className="mb-3">for users who prefer not to use docker desktop/wsl2, we&apos;ve created a windows installer that runs in the system tray. it&apos;s currently not codesigned, but the repo shows exactly how it&apos;s built for full transparency.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <a href="https://github.com/betweentwomidnights/gary-localhost-installer" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    <FontAwesomeIcon icon={faGithub} /> installer source code
                  </a>
                  <a href="https://thepatch.gumroad.com/l/gary4juce" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline">
                    <img src="/gumroad-logo.svg" alt="Gumroad" className="inline w-5 h-5 mr-2" />
                    download installer
                  </a>
                </div>
                <p className="text-sm text-gray-400">the installer is included with the gary4juce download</p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">requirements</h3>
                <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                  <li>~10+ GB GPU VRAM</li>
                  <li>NVIDIA GPU (CUDA support)</li>
                  <li>Docker & Docker Compose (for docker method)</li>
                  <li>Windows 10/11 (for installer method)</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="text-center">
              <p>
                i started coding in 2023 with gpt 3.5 turbo with this website as my first project.
              </p>  
              
              <div className="flex justify-center mb-6">
                <MutedVideoPlayer 
                  src="/thepatch_v1_small.mp4" 
                  className="w-full max-w-2xl"
                />
              </div>
              
              <p>
                everything since then has been developed alongside gpt and claude as we all got better at it.
              </p>
            </div>
          )}
        </div>
      </div>

      <WaitlistModal 
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
      />
    </div>
  );
};

export default GaryPage;