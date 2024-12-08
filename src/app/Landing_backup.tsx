import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import TopBar from './TopBar';
import ScrollableContainer from './ScrollableContainer';
import useIsMobileDevice from './hooks/useIsMobileDevice';

interface LandingProps {
  onDashboardClick: () => void;
  onLoadGary: () => void;
}

const Landing: React.FC<LandingProps> = ({ onDashboardClick, onLoadGary }) => {
  const [showStreamsInfo, setShowStreamsInfo] = useState(false);
  const [showYouTubeDemo, setShowYouTubeDemo] = useState(false);
  const isMobile = useIsMobileDevice();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white relative">
      <TopBar setShowYouTubeDemo={setShowYouTubeDemo} onLoadGary={onLoadGary} />
      <div className="mt-24 w-full"> {/* Space to account for fixed top bar */}
        <ScrollableContainer />
        <div className="my-8 flex flex-col items-center">
          <h2>the captain&apos;s chair season 2 starts next week</h2>
          <iframe width={isMobile ? "300" : "560"} height={isMobile ? "200" : "315"} src="https://www.youtube.com/embed/7YStY4U4VfQ?si=23NPjn19QQlnPTy1" title="the captain&apos;s chair" frameBorder="0" allowFullScreen></iframe>
        </div>

        <div className="animate-fade-in-down text-center mb-8">
          <p>we&apos;ve got this infinite remix thing. it&apos;s hard to explain. you can hear it at the new <a href="https://thecollabagepatch.com/infinitepolo.mp3" target="_blank" rel="noopener noreferrer" className="link">stream</a>.</p>
          <p>
            you can also select it from the dropdown menu on the main page. it was made using the model bleeps-medium. you can use the model too thanks to hf. go to
            <span className="link cursor-pointer" onClick={onLoadGary}> gary&apos;s page</span>.
          </p>
        </div>
        <div className="animate-fade-in-down text-center mb-4">
          <p>the infinite remix is a remix of <a href="https://www.youtube.com/watch?v=3qsUf3tBb5E" target="_blank" rel="noopener noreferrer" className="link">21 by polo g</a> by <a href="https://www.youtube.com/@zeuzmakesmusic" target="_blank" rel="noopener noreferrer" className="link">@zeuzmakesmusic</a>. me and the ai jammed out to it and made a python remix.</p>
        </div>

        <div className="text-center mb-8">
          <button onClick={() => setShowStreamsInfo(!showStreamsInfo)} className="bg-transparent border-2 border-white text-white py-1 px-3 rounded hover:bg-white hover:text-black transition-all duration-300">
            the four other streams <FontAwesomeIcon icon={faQuestionCircle} />
          </button>
          {showStreamsInfo && (
            <div className="mt-4 animate-fade-in-down">
              <p>/playlist.mp3 - unfinished collabs and comedy bits.</p>
              <p>/yikesawjeez.mp3 - curated by <a href="https://twitter.com/yikesawjeez" target="_blank" rel="noopener noreferrer" className="link">yikes</a>.</p>
              <p>/kemp.mp3 - dj sets from chris hrtz.</p>
              <p>/audiocraft.mp3 - early examples of the gary python script.</p>
            </div>
          )}
        </div>

        <div className="text-center my-4">
          <button onClick={onDashboardClick} className="bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300">
            continue to the patch
          </button>
        </div>

        <style jsx>{`
          .link {
            text-decoration: underline;
            opacity: 0.8;
            transition: opacity 0.3s ease;
          }
          .link:hover {
            opacity: 1;
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          .animate-pulse {
            animation: pulse 2s infinite;
          }
        `}</style>
      </div>
    </div>
  );
}

export default Landing;
