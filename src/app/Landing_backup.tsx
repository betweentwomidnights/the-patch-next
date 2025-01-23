'use client';

import React, { useState, Suspense, lazy, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import TopBar from './TopBar';
import useIsMobileDevice from './hooks/useIsMobileDevice';
import PopupAnnouncement from './PopupAnnouncement';
import WaitlistModal from './WaitlistModal';

const YouTubeDemo = lazy(() => import('./youtube-demo'));

interface LandingProps {
  onDashboardClick: () => void;
  onLoadGary: () => void;
}

const Landing: React.FC<LandingProps> = ({ onDashboardClick, onLoadGary }) => {
  const [showStreamsInfo, setShowStreamsInfo] = useState(false);
  const [showYouTubeDemo, setShowYouTubeDemo] = useState(false);
  const isMobile = useIsMobileDevice();
  const [showPopup, setShowPopup] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  useEffect(() => {
    // Show the popup only on the first visit
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowPopup(true);
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  return (
    <div className="relative w-full h-full text-white bg-black">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed top-0 left-0 w-full h-full object-cover z-0" 
        style={{ filter: 'brightness(0.3)' }} // Optional darken effect for readability
      >
        <source src="gary_blw_compressed.mp4" type="video/mp4" />
      </video>

      {/* Main Content */}
      <TopBar setShowYouTubeDemo={setShowYouTubeDemo} onLoadGary={onLoadGary} />

      {/* Popup Announcement */}
      {showPopup && (
        <PopupAnnouncement 
          onClose={() => setShowPopup(false)}
          onShowWaitlist={() => setShowWaitlistModal(true)}
        />
      )}

      {/* Waitlist Modal */}
      <WaitlistModal 
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
      />
      
      {!showYouTubeDemo ? (
        <div className={isMobile ? "w-full h-screen snap-y snap-mandatory overflow-y-scroll relative z-10" : "w-full h-auto relative z-10"}>
  {/* Slide 1 */}
  <div className={`flex flex-col items-center ${isMobile ? 'justify-center h-screen snap-start' : 'my-16'}`}>
    <h1 className="text-4xl font-bold mb-4 z-20">this is the patch</h1>
    <p className="text-lg text-center mb-6 z-20">
      this began as a lil radio station of unreleased collabs and comedy bits that i built while learning to code
    </p>
    <button
      onClick={onDashboardClick}
      className="bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 z-20"
    >
      it&apos;s still that, too
    </button>
    
    {/* New Button with Blurb */}
    <a
      href="https://thecollabagepatch.com/version1"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 z-20"
    >
      this is what it looked like at first
    </a>
    <p className="text-sm text-center mt-2 text-gray-400 z-20">
      warning: it&apos;s silly
    </p>

    {isMobile && (
      <FontAwesomeIcon icon={faChevronDown} className="mt-6 text-white animate-bounce z-20" />
    )}
  </div>

          {/* Slide 2 */}
<div className={`flex flex-col items-center ${isMobile ? 'justify-center h-screen snap-start' : 'my-16'}`}>
  <p className="text-lg text-center mb-6 z-20">
    now we also build weird open source music production stuff
  </p>
  
  {/* New clickable text for "gary" and "youtube" */}
  <p className="text-lg text-center mb-6 z-20">
    we named it{' '}
    <span
      className="link cursor-pointer underline hover:text-gray-400"
      onClick={onLoadGary}
    >
      gary
    </span>. you can watch me rock out with the ableton version on{' '}
    <a
      href="https://youtube.com/@thecollabagepatch"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-gray-400"
    >
      youtube
    </a>.
  </p>
  
  <img
    src="gary4live_fastest_smallest.gif"
    alt="Gary4Live in action"
    className={`object-contain ${isMobile ? 'w-full max-w-xs md:max-w-md lg:max-w-lg' : 'w-full max-w-2xl'} z-20`}
  />

  {isMobile && (
    <FontAwesomeIcon icon={faChevronDown} className="text-white animate-bounce z-20" />
  )}
</div>

{/* New Captain's Chair Section */}
<div className={`flex flex-col items-center ${isMobile ? 'justify-center h-screen snap-start' : 'my-16'}`}>
            <div className="animate-fade-in-down text-center mb-8 z-20">
              <h2 className="text-2xl font-bold mb-4">new music here at the patch</h2>
              <p className="mb-4">
                it&apos;s called captain&apos;s chair, season 2.
              </p>
              <p className="mb-4">
                i sit down with a guitar riff and see what comes out in ableton using gary as a jam buddy.
              </p>
              <p className="mb-4">
                this stream is every episode of this season combined into one continuous piece of music. album coming before the end of 2024
              </p>
              <p className="mb-4">
                listen here at{' '}
                <a 
                  href="https://thecollabagepatch.com/captains_chair.mp3" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="link"
                >
                  stream
                </a>
                {' '}or select it from the dropdown in the main page
              </p>
            </div>

            <div className="w-full max-w-3xl mx-auto mb-8 z-20">
              <iframe
                className="w-full aspect-video"
                src="https://www.youtube.com/embed/videoseries?list=PLTgvaF3a9YMhy7q0oTf8av27CIyxCqeWi"
                title="captain's chair season 2 playlist"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            {isMobile && (
              <FontAwesomeIcon icon={faChevronDown} className="text-white animate-bounce z-20" />
            )}
          </div>

          {/* Slide 4 */}
          <div className={`flex flex-col items-center ${isMobile ? 'justify-center h-screen snap-start' : 'my-16'}`}>
            <div className="animate-fade-in-down text-center mb-8 z-20">
              <p>
                we&apos;ve got this infinite remix thing. it&apos;s hard to explain. you can hear it at the new{' '}
                <a href="https://thecollabagepatch.com/infinitepolo.mp3" target="_blank" rel="noopener noreferrer" className="link">
                  stream
                </a>.
              </p>
              <p>
                you can also select it from the dropdown menu on the main page. it was made using the model bleeps-medium. you can use the model too
                thanks to huggingface. go to
                <span className="link cursor-pointer" onClick={onLoadGary}>
                  {' '}
                  gary&apos;s page
                </span>.
              </p>
            </div>
            <div className="animate-fade-in-down text-center mb-4 z-20">
              <p>
                the infinite remix is a remix of{' '}
                <a href="https://www.youtube.com/watch?v=3qsUf3tBb5E" target="_blank" rel="noopener noreferrer" className="link">
                  21 by polo g
                </a>{' '}
                by{' '}
                <a href="https://www.youtube.com/@zeuzmakesmusic" target="_blank" rel="noopener noreferrer" className="link">
                  @zeuzmakesmusic
                </a>. me and the ai jammed out to it and made a python remix.
              </p>
            </div>

            <div className="text-center mb-8 z-20">
              <button
                onClick={() => setShowStreamsInfo(!showStreamsInfo)}
                className="bg-transparent border-2 border-white text-white py-1 px-3 rounded hover:bg-white hover:text-black transition-all duration-300"
              >
                the four other streams <FontAwesomeIcon icon={faQuestionCircle} />
              </button>
              {showStreamsInfo && (
                <div className="mt-4 animate-fade-in-down z-20">
                  <p>/playlist.mp3 - unfinished collabs and comedy bits.</p>
                  <p>
                    /yikesawjeez.mp3 - curated by{' '}
                    <a href="https://twitter.com/yikesawjeez" target="_blank" rel="noopener noreferrer" className="link">
                      yikes
                    </a>.
                  </p>
                  <p>/kemp.mp3 - dj sets from chris hrtz.</p>
                  <p>/audiocraft.mp3 - early examples of the gary python script.</p>
                </div>
              )}
            </div>

            <div className="text-center my-4 z-20">
              <button
                onClick={onDashboardClick}
                className="bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300"
              >
                continue to the patch
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Suspense fallback={<div>Loading YouTube Demo...</div>}>
          <YouTubeDemo setShowYouTubeDemo={setShowYouTubeDemo} />
        </Suspense>
      )}

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
        .animate-bounce {
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(10px);
          }
        }
        .animate-fade-in-down {
          opacity: 0;
          animation: fadeInDown 0.5s forwards;
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Landing;
