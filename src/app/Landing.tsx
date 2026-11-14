import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card } from './components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tab';
import { Button } from './components/ui/button';
import { ChevronLeft, ChevronRight, Info, ListVideo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WaitlistModal from './WaitlistModal';
import CyclingText from './CyclingText';
import SocialMediaButtonGroup from './components/SocialButtons';
import GaryDetailsModal from './GaryDetailsModal';
import { SupportLinks } from './components/SponsorButton';

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
  const [showGaryDetailsModal, setShowGaryDetailsModal] = useState(false);
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
  const scrollCueOpacity = Math.max(0, Math.min(1, 1 - scrollPosition / 48));

  const beatboxDemos = [
    {
      src: '/gary4beatbox_demos/gary4beatbox_demo_1.mp4',
      poster: '/gary4beatbox_demos/gary4beatbox_demo_1_poster.jpg',
      title: '8-bit yum, vanya, terry',
    },
    {
      src: '/gary4beatbox_demos/gary4beatbox_demo_2.mp4',
      poster: '/gary4beatbox_demos/gary4beatbox_demo_2_poster.jpg',
      title: 'big yums',
    },
    {
      src: '/gary4beatbox_demos/gary4beatbox_demo_3.mp4',
      poster: '/gary4beatbox_demos/gary4beatbox_demo_3_poster.jpg',
      title: 'decent drums only',
    },
    {
      src: '/gary4beatbox_demos/gary4beatbox_demo_4.mp4',
      poster: '/gary4beatbox_demos/gary4beatbox_demo_4_poster.jpg',
      title: 'keygen, gary',
    },
    {
      src: '/gary4beatbox_demos/gary4beatbox_demo_5.mp4',
      poster: '/gary4beatbox_demos/gary4beatbox_demo_5_poster.jpg',
      title: 'keygen v2 large 16',
    },
    {
      src: '/gary4beatbox_demos/gary4beatbox_demo_6.mp4',
      poster: '/gary4beatbox_demos/gary4beatbox_demo_6_poster.jpg',
      title: 'vanya, keygen, terry',
    },
  ];
  const currentBeatboxDemo = beatboxDemos[currentDemoIndex] ?? beatboxDemos[0];

const handleNext = () => {
  setCurrentDemoIndex((prev) => (prev + 1) % beatboxDemos.length);
};

const handlePrev = () => {
  setCurrentDemoIndex((prev) => (prev - 1 + beatboxDemos.length) % beatboxDemos.length);
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
      <SocialMediaButtonGroup
        fixed={false}
        compact
        className="absolute left-3 top-3 z-[60] transition-all duration-300 sm:fixed sm:left-5 sm:top-4"
      />
      {/* Site nav, mirroring the social pill. It only stays fixed on wide
          screens, where it can't collide with the tab bar that slides up. */}
      <nav
        aria-label="Site"
        className="absolute right-3 top-3 z-[60] flex items-center gap-3 rounded-full border border-white/70 bg-black/75 px-3 py-1.5 text-xs text-white shadow-[0_0_18px_rgba(255,255,255,0.16)] backdrop-blur-md sm:gap-4 sm:px-4 sm:py-2 sm:text-sm lg:fixed lg:right-5 lg:top-4"
      >
        <Link href="/products" className="hover:text-gray-300">software</Link>
        <Link href="/merch" className="hover:text-gray-300">merch</Link>
        <Link href="/about" className="hover:text-gray-300">about</Link>
      </nav>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 z-30 flex justify-center sm:hidden"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 0.875rem)',
          opacity: scrollCueOpacity * 0.42,
        }}
      >
        <motion.div
          className="h-1 w-8 rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.28)]"
          animate={{ y: [0, 5, 0] }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

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
      <main className="pt-40 pb-12 px-4 relative">
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
          <TabsList className="inline-flex gap-6 bg-transparent backdrop-blur-sm sm:gap-36">
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
                  <Card className="bg-black/30 backdrop-blur-lg border-white/20 p-6">
                    <div className="mb-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:text-left">
                      <img
                        src="g4b.gif"
                        alt="Gary4Beatbox Interface"
                        className="w-28 flex-shrink-0 rounded-2xl shadow-lg sm:w-36"
                      />
                      <p className="max-w-md text-sm leading-relaxed text-gray-300">
                        gary4beatbox can start from your mic or a jerry-generated loop, then gary continues it and terry transforms it. these demos start from jerry loops.
                      </p>
                    </div>
                    <div className="mb-6 rounded-lg border border-yellow-300/35 bg-yellow-300/10 px-4 py-3 text-center text-xs leading-relaxed text-yellow-100">
                      gary4beatbox was built quite some time ago and is about to undergo a big transformation. for now, the vst is where the new model work is landing first.
                    </div>
                    <div className="mb-4 overflow-hidden rounded-lg border border-white/15 bg-black">
                      <video
                        key={currentBeatboxDemo.src}
                        className="aspect-video w-full bg-black object-cover"
                        controls
                        playsInline
                        preload="metadata"
                        poster={currentBeatboxDemo.poster}
                        aria-label={currentBeatboxDemo.title}
                        onEnded={handleNext}
                      >
                        <source src={currentBeatboxDemo.src} type="video/mp4" />
                      </video>
                    </div>

                    <div className="mb-6 flex items-center justify-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black"
                        onClick={handlePrev}
                        aria-label="previous gary4beatbox demo"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <span className="min-w-20 text-center text-xs text-gray-300">
                        demo {currentDemoIndex + 1} / {beatboxDemos.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black"
                        onClick={handleNext}
                        aria-label="next gary4beatbox demo"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>

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
                      7 open source ai music models in a single vst
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => setShowGaryDetailsModal(true)}
                      aria-label="open gary details and demos"
                    >
                      <Info className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="mb-6 flex flex-col items-center gap-3">
                  <a
                    href="/products/gary4juce"
                    className="w-40 bg-white text-black px-7 py-3 rounded-full
                               shadow-[0_0_10px_rgba(255,255,255,0.2)]
                               hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                               hover:bg-white hover:scale-105
                               transition-all duration-200 text-center"
                  >
                    download
                  </a>
                  <p className="text-xs text-gray-400 text-center max-w-md">
                    includes local backend installer for the gpu rich
                  </p>
                </div>

                <div className="aspect-video overflow-hidden rounded-lg">
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="/gary4juce_v4_landing_poster.jpg"
                  >
                    <source src="/gary4juce_v4_landing.mp4" type="video/mp4" />
                  </video>
                </div>
                
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <section className="max-w-4xl mx-auto mt-16 border-t border-white/10 pt-10 pb-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onDashboardClick}
              className="text-sm px-4 py-3 rounded-full transition-all duration-200 hover:bg-white hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:scale-105"
            >
              here&apos;s a bunch of music
            </Button>
            <SupportLinks />
            <div className="text-[11px] leading-snug text-gray-400">
              <div>the collabage patch, inc.</div>
              <a
                href="mailto:kev@thecollabagepatch.com"
                className="underline underline-offset-2 hover:text-gray-200"
              >
                kev@thecollabagepatch.com
              </a>
            </div>
          </div>
        </section>
      </main>
      <WaitlistModal 
  isOpen={showWaitlistModal}
  onClose={() => setShowWaitlistModal(false)}
/>
      <GaryDetailsModal
        isOpen={showGaryDetailsModal}
        onClose={() => setShowGaryDetailsModal(false)}
        onGaryPageClick={onGaryPageClick}
      />
    </div>
  );
}

export default Landing;
