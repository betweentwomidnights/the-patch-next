import React, { useState, useRef, useEffect } from 'react';
import { Card } from './components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tab';
import { Button } from './components/ui/button';
import { Play, Pause, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingProps {
  onDashboardClick: () => void;
  onGaryPageClick: () => void;
}

const Landing: React.FC<LandingProps> = ({ onDashboardClick, onGaryPageClick }) => {
  const [currentTab, setCurrentTab] = useState('beatbox');
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');
  const touchStartX = useRef(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const headerRef = useRef(null);

   // Track scroll position
   useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate header transform based on scroll position
  const headerTransform = Math.max(0, Math.min(1, scrollPosition / 100));
  const tabsTransform = Math.max(0, Math.min(1, (scrollPosition - 50) / 100));

  const beatboxDemos = Array(10).fill(null).map((_, i) => ({
    id: i,
    src: `/g4b/demo${i + 1}.mp4`,
    title: `Demo ${i + 1}`
  }));

  

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX.current - touchEndX;

  if (Math.abs(diff) > 50) { // Minimum swipe distance
    if (diff > 0) {
      // Swipe left
      setSwipeDirection('left');
      handleNext();
    } else {
      // Swipe right
      setSwipeDirection('right');
      handlePrev();
    }
  }
};

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

  const handleNext = () => {
    setCurrentDemoIndex((prev) => (prev + 1) % beatboxDemos.length);
    setIsPlaying(false);
  };

  const handlePrev = () => {
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

{/* Original Header - fades out on scroll */}
<header 
  ref={headerRef}
  className="fixed top-0 w-full z-40 transition-all duration-200 backdrop-blur-sm py-4"
  style={{
    transform: `translateY(${-headerTransform * 100}%)`,
    opacity: 1 - headerTransform
  }}
>
  <div className="max-w-4xl mx-auto text-center">
    <h1 className="text-2xl md:text-4xl font-bold mb-2">
      the collabage patch: home of the gary
    </h1>
    <p className="text-lg text-gray-300">
      gary is ai music you actually collab with
    </p>
  </div>
</header>

{/* Main Content */}
<main className="pt-40 pb-24 px-4 relative"> {/* Increased top padding */}
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
      defaultValue="beatbox" 
      value={currentTab} 
      onValueChange={setCurrentTab}
      className="max-w-4xl mx-auto"
    >
      {/* TabsList that becomes sticky header */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-200 "
        style={{
          transform: `translateY(${scrollPosition > 100 ? 0 : (scrollPosition === 0 ? 120 : 120 - scrollPosition)}px)`,
          opacity: 1,
          pointerEvents: "auto"
        }}
      >
        <div className="flex justify-center">
    <TabsList className="inline-flex gap-36 bg-transparent">
      <TabsTrigger 
        value="beatbox"
        className="w-32 transition-all duration-200 hover:bg-white/20 data-[state=active]:shadow-[0_0_10px_rgba(255,255,255,0.3)] data-[state=active]:bg-white/20 data-[state=active]:text-white"
      >
        gary4beatbox
      </TabsTrigger>
      <TabsTrigger 
        value="live"
        className="w-32 transition-all duration-200 hover:bg-white/20 data-[state=active]:shadow-[0_0_10px_rgba(255,255,255,0.3)] data-[state=active]:bg-white/20 data-[state=active]:text-white"
      >
        gary4live
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
                  this is gary for your phone. record w/ur mic and see where it go
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
<div 
  className="relative w-full md:w-2/3"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
  <div className="relative pb-[42.86%] overflow-hidden rounded-lg">
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={currentDemoIndex}
        className="absolute inset-0"
        initial={{ 
          x: swipeDirection === 'right' ? '-100%' : '100%',
          opacity: 0.8  // Start with higher opacity
        }}
        animate={{ 
          x: 0,
          opacity: 1
        }}
        exit={{ 
          x: swipeDirection === 'right' ? '100%' : '-100%',
          opacity: 0.8  // Maintain higher opacity during exit
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          opacity: { duration: 0.1 }  // Faster opacity transition
        }}
      >
        <video
          ref={videoRef}
          key={beatboxDemos[currentDemoIndex].src}
          src={beatboxDemos[currentDemoIndex].src}
          className="w-full h-full object-cover"
          onEnded={() => {
            setIsPlaying(false);
            setSwipeDirection('left');
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
  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-auto">
    <Button
      variant="ghost"
      size="icon"
      className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
      onClick={() => {
        setSwipeDirection('right');
        handlePrev();
      }}
    >
      <ChevronLeft className="h-6 w-6" />
    </Button>
  </div>
  <div className="absolute inset-y-0 right-0 flex items-center pointer-events-auto">
    <Button
      variant="ghost"
      size="icon"
      className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
      onClick={() => {
        setSwipeDirection('left');
        handleNext();
      }}
    >
      <ChevronRight className="h-6 w-6" />
    </Button>
  </div>
</div>

                </div>

                <blockquote className="text-sm italic text-gray-300 mb-6">
                  "You can literally fart into the mic and it'll crank out something usable for sampling purposes. I can't
                  stop messing around with it lol." -Ronzlo
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
    <Button
      variant="outline"
      className="w-42 px-8 py-3 rounded-full
        shadow-[0_0_10px_rgba(255,255,255,0.2)]
        hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
        hover:bg-white hover:text-black hover:scale-105
        transition-all duration-200"
      onClick={() => {/* Open Android waitlist modal */}}
    >
      join android beta
    </Button>
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
              <p className="text-sm text-gray-300 text-center">
                this is gary for ableton. it's a max for live device that iterates on input audio from the daw.
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-sm text-gray-300">
                  UPDATE jan 2025: melodyflow model added. we named it terry.
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

            {showInfo && (
              <div className="bg-black/30 p-4 rounded-lg mb-6 text-gray-300">
                <p className="text-sm mb-2">
                  melodyflow is a new model from meta that transforms input audio rather than continuing it like gary does.
                </p>
                <p className="text-sm mb-2">
                  we cloned the repo from this space. it's a modified version of the audiocraft repository.{' '}
                  <a 
                    href="https://huggingface.co/spaces/facebook/melodyflow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    https://huggingface.co/spaces/facebook/melodyflow
                  </a>
                </p>
                <p className="text-sm">
                  for more details about gary, and links to all our githubs, go to{' '}
                  <button 
                    onClick={onGaryPageClick}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    gary's page
                  </button>
                </p>
              </div>
            )}

            <div className="aspect-video mb-6">
              <iframe 
                className="w-full h-full rounded-lg"
                src="https://www.youtube.com/embed/videoseries?list=PLXlMPOlypVXtmmiPu19EG7lOIpdyi39yw" 
                title="Gary4Live Demo Playlist"
                frameBorder="0"
                allowFullScreen
              />
            </div>

            <div className="flex flex-col md:flex-row items-center md:justify-center gap-4">
  <div className="flex justify-center w-full md:w-auto">
    <a 
      href="https://thepatch.gumroad.com/l/gary4live"
      target="_blank"
      rel="noopener noreferrer"
      className="w-48 bg-white text-black px-8 py-3 rounded-full 
        shadow-[0_0_10px_rgba(255,255,255,0.2)] 
        hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] 
        hover:bg-white hover:scale-105
        transition-all duration-200 text-center"
    >
      download for pc
    </a>
  </div>
  <div className="flex justify-center w-full md:w-auto">
    <a 
      href="https://thepatch.gumroad.com/l/gary-mac"
      target="_blank"
      rel="noopener noreferrer"
      className="w-52 border border-white text-white px-8 py-3 rounded-full 
        shadow-[0_0_10px_rgba(255,255,255,0.2)] 
        hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
        hover:bg-white hover:text-black hover:scale-105
        transition-all duration-200 text-center"
    >
      download for mac
    </a>
  </div>
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
            hear stuff kev and his homies made with gary as a jam buddy
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default Landing;