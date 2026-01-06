import React, { useState, useRef, useEffect } from 'react';
import { Card } from './components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tab';
import { Button } from './components/ui/button';
import { Play, Pause, ChevronLeft, ChevronRight, Info, ListVideo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingInfo from './LandingInfo';
import WaitlistModal from './WaitlistModal';
import CyclingText from './CyclingText';

// Add this type
type SlideDirection = 'left' | 'right';

interface LandingProps {
  onDashboardClick: () => void;
  onGaryPageClick: () => void;
}

const LiveDemoSection: React.FC = () => {
  const [videoEnded, setVideoEnded] = useState(false);
  const playlistId = 'PLXlMPOlypVXtmmiPu19EG7lOIpdyi39yw';
  const firstVideoId = '0plq4OV0ECY'; // You'll need to get this from your playlist
  
  if (!videoEnded) {
    return (
      <div className="aspect-video mb-6">
        <video
          className="w-full h-full rounded-lg"
          src="/gumroad_demo_compressed.mp4"
          controls
          playsInline
          poster="/gumroad_demo_poster.png"  // We'll create this
          onEnded={() => setVideoEnded(true)}
        />
      </div>
    );
  }

  return (
    <a 
      href={`https://www.youtube.com/playlist?list=${playlistId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block aspect-video mb-6 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg"
    >
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        <img 
          src={`https://img.youtube.com/vi/${firstVideoId}/hqdefault.jpg`}
          alt="Gary4Live Tutorial Playlist"
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300">
          <ListVideo className="w-12 h-12 text-white" />
        </div>
      </div>
    </a>
  );
};

const Landing: React.FC<LandingProps> = ({ onDashboardClick, onGaryPageClick }) => {
  const [currentTab, setCurrentTab] = useState('live');
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  

  const [scrollPosition, setScrollPosition] = useState(0);
  const headerRef = useRef(null);
  const scrollTimeout = useRef<number | null>(null);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const lastScrollPosition = useRef(0);

  // Track scroll position
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

  
  // Calculate transforms with easing
  const headerTransform = Math.max(0, Math.min(1, scrollPosition / 100));
  const tabsTransform = scrollPosition > 100 
    ? 0 
    : scrollPosition === 0 
    ? 120 
    : 120 - (scrollPosition * (120/100));

  const beatboxDemos = Array(10).fill(null).map((_, i) => ({
      id: i,
      src: `/g4b/demo${i + 1}.mp4`,
      poster: `/g4b/waveform${i + 1}.jpg`,  // <-- You’d create these images
      title: `Demo ${i + 1}`
    }));

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };


const [previousIndex, setPreviousIndex] = useState(0);

const handleNext = () => {
  setPreviousIndex(currentDemoIndex);
  setCurrentDemoIndex((prev) => (prev + 1) % beatboxDemos.length);
  setIsPlaying(false);
};

const handlePrev = () => {
  setPreviousIndex(currentDemoIndex);
  setCurrentDemoIndex((prev) => (prev - 1 + beatboxDemos.length) % beatboxDemos.length);
  setIsPlaying(false);
};

  return (
    // Main container
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          className="w-full h-full object-cover opacity-20"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="gary_blw_compressed.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Original Header - smooth fade out */}
      <header
        ref={headerRef}
        className="fixed top-0 w-full z-40 transition-transform duration-300 ease-out backdrop-blur-sm py-4"
        style={{
          transform: `translateY(${-headerTransform * 100}%)`,
          opacity: 1 - headerTransform
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">
            the patch
          </h1>
          <p className="text-lg text-gray-300">
            open source ai music production
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-40 pb-32 px-4 relative">
        <div className="max-w-4xl mx-auto relative">
          {/* Logo Container */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-20">
            <img
              src="output_transparent.gif"
              alt="Gary Logo"
              className="w-24 h-24 opacity-50"
            />
          </div>

          <Tabs
            defaultValue="live"
            value={currentTab}
            onValueChange={setCurrentTab}
            className="max-w-4xl mx-auto"
          >
            {/* TabsList with improved transition */}
      <div
        className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translateY(${tabsTransform}px)`,
          opacity: scrollPosition > 0 ? 1 : 0.95
        }}
      >
        <div className="flex justify-center">
          <TabsList className="inline-flex gap-36 bg-transparent backdrop-blur-sm">
            <TabsTrigger
              value="beatbox"
              className="w-32 transition-all duration-200 hover:bg-white/20 data-[state=active]:shadow-[0_0_10px_rgba(255,255,255,0.3)] data-[state=active]:bg-white/20 data-[state=active]:text-white"
            >
              for the phone
            </TabsTrigger>
            <TabsTrigger
              value="live"
              className="w-32 transition-all duration-200 hover:bg-white/20 data-[state=active]:shadow-[0_0_10px_rgba(255,255,255,0.3)] data-[state=active]:bg-white/20 data-[state=active]:text-white"
            >
              for the daw
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

            {/* Beatbox Tab Content */}
            <TabsContent value="beatbox" className="focus-visible:outline-none mt-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key="beatbox"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-black/50 backdrop-blur-lg border-white/20 p-6">
                    <p className="text-sm text-gray-300 mb-6 text-center">
                      gary4beatbox. record w/ur mic and see where it go, or start a jam using jerry(stable audio open small).
                    </p>
                    <div className="flex flex-col md:flex-row gap-6 items-center mb-6">
                      {/* App Interface GIF */}
                      <div className="w-full md:w-1/3 flex-shrink-0">
                        <img
                          src="g4b.gif"
                          alt="Gary4Beatbox Interface"
                          className="w-full max-w-[200px] mx-auto rounded-2xl shadow-lg"
                        />
                      </div>

                      <p className="text-sm text-gray-300 mb-4">here are some examples</p>

                      {/* Swipeable Demo Player */}
                                            <div className="relative w-full md:w-2/3">
                                              <div className="relative pb-[42.86%] overflow-hidden rounded-lg">
                                              <AnimatePresence mode="wait">
  <motion.div
    key={currentDemoIndex}
    className="absolute inset-0"
    initial={{ 
      opacity: 0,
      scale: 1.1,
      filter: 'brightness(1.5) contrast(1.2) blur(8px)'
    }}
    animate={{ 
      opacity: 1,
      scale: 1,
      filter: 'brightness(1) contrast(1) blur(0px)'
    }}
    exit={{ 
      opacity: 0,
      scale: 0.9,
      filter: 'brightness(1.5) contrast(1.2) blur(8px)'
    }}
    transition={{
      type: "tween",
      duration: 0.4,
      ease: [0.33, 1, 0.68, 1]  // custom cubic-bezier for snappy feel
    }}
  >
    <video
      ref={videoRef}
      key={beatboxDemos[currentDemoIndex].src}
      src={beatboxDemos[currentDemoIndex].src}
      poster={beatboxDemos[currentDemoIndex].poster}
      className="w-full h-full object-cover"
      preload="auto"
      playsInline
      onEnded={() => {
        setIsPlaying(false);
        handleNext();
      }}
    />
  </motion.div>
</AnimatePresence>
                                              </div>

                        {/* Playback Controls */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                            onClick={handlePlayPause}
                          >
                            {isPlaying ? (
                              <Pause className="h-8 w-8" />
                            ) : (
                              <Play className="h-8 w-8 ml-1" />
                            )}
                          </Button>
                        </div>

                        {/* Navigation Controls */}
                        <div className="absolute inset-y-0 left-0 items-center pointer-events-auto flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
                            onClick={handlePrev}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                        </div>
                        <div className="absolute inset-y-0 right-0 items-center pointer-events-auto flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
                            onClick={handleNext}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <blockquote className="text-sm italic text-gray-300 mb-6">
                      &apos;You can literally fart into the mic and it&apos;ll crank out something usable for sampling purposes.
                      I can&apos;t stop messing around with it lol.&apos; -Ronzlo
                    </blockquote>

                    <div className="flex flex-col md:flex-row items-center md:justify-center gap-4">
                      <div className="flex justify-center w-full md:w-auto">
                        <a
                          href="https://apps.apple.com/us/app/gary4beatbox/id6736522400"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-42 bg-white text-black px-8 py-3 rounded-full
                                    shadow-[0_0_10px_rgba(255,255,255,0.2)]
                                    hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                                    hover:bg-white hover:scale-105
                                    transition-all duration-200 text-center"
                        >
                          download for ios
                        </a>
                      </div>
                      <div className="flex justify-center w-full md:w-auto">
                        <a
                          href="https://play.google.com/store/apps/details?id=com.gary4beatbox"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-52 border border-white text-white px-8 py-3 rounded-full
                                 shadow-[0_0_10px_rgba(255,255,255,0.2)]
                                 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                                 hover:bg-white hover:text-black hover:scale-105
                                 transition-all duration-200 text-center"
                        >
                          dl on google play
                        </a>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Live Tab Content */}
            <TabsContent value="live" className="focus-visible:outline-none mt-8">
              <Card className="bg-black/30 backdrop-blur-lg border-white/20 p-6">
                <div className="mb-4">
                  <CyclingText />
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-xs text-gray-300">
                      3 open source ai music models in a single vst
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => setShowInfo(!showInfo)}
                    >
                      <Info className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <LandingInfo onGaryPageClick={onGaryPageClick} />
                  </motion.div>
                )}
              </AnimatePresence>

                <div className="aspect-video mb-8"> {/* Changed from mb-6 to mb-8 */}
  <video className="w-full h-full rounded-lg" autoPlay loop muted playsInline>
    <source src="/gary_all_daws_desktop.mp4" media="(min-width: 769px)" />
    <source src="/gary_all_daws_960_24fps.mp4" />
  </video>
</div>

                <div className="flex flex-col items-center gap-4">
  <div className="flex justify-center w-full">
    <a
      href="https://thepatch.gumroad.com/l/gary4juce"
      target="_blank"
      rel="noopener noreferrer"
      className="w-40 bg-white text-black px-7 py-3 rounded-full
                 shadow-[0_0_10px_rgba(255,255,255,0.2)]
                 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                 hover:bg-white hover:scale-105
                 transition-all duration-200 text-center"
    >
      free download
    </a>
  </div>
  <p className="text-xs text-gray-400 text-center max-w-md">
    includes local backend installer for the gpu rich
  </p>
</div>
                
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Persistent Footer */}
      <footer className="fixed bottom-0 w-full bg-black/20 backdrop-blur-lg z-50 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onDashboardClick}
            className="text-sm px-4 py-3 rounded-full transition-all duration-200 hover:bg-white hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:scale-105"
          >
            here&apos;s a bunch of music
          </Button>
        <div className="mt-2 text-[11px] leading-snug text-gray-400">
      <div>the collabage patch, inc.</div>
      <a
        href="mailto:kev@thecollabagepatch.com"
        className="underline underline-offset-2 hover:text-gray-200"
      >
        kev@thecollabagepatch.com
      </a>
    </div>
  </div>
</footer>
      <WaitlistModal 
  isOpen={showWaitlistModal}
  onClose={() => setShowWaitlistModal(false)}
/>
    </div>
  );
}

export default Landing;
