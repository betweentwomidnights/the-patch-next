import React, { useState, lazy, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';
import StatusIndicator from './StatusIndicator';  // Import the status indicator component
import useIsSafari from './hooks/useIsSafari';

import WaitlistModal from './WaitlistModal';

// Lazy load the YouTubeDemo component
const YouTubeDemo = lazy(() => import('./youtube-demo'));



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
  const [activeSection, setActiveSection] = useState('');
  const [showYouTubeDemo, setShowYouTubeDemo] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const isSafari = useIsSafari(); // Check if it's Safari
  // Handle the stream switch
  /* const handleSwitchToAudiocraft = async () => {
    try {
      setIsSwitchStreamClicked(true);
  
      const updateStream = () => {
        setStreamUrl('https://thecollabagepatch.com/audiocraft.mp3');
        if (audioRef.current) {
          audioRef.current.load(); // Load the new stream
        }
      };
  
      // If audioContext and analyser exist, suspend, update, and resume
      if (audioContext && analyser) {
        await audioContext.suspend();
        updateStream();
  
        // Wait for the new audio stream to load before attempting to play
        if (audioRef.current) {
          audioRef.current.addEventListener('loadeddata', async () => {
            await audioContext.resume(); // Resume the audio context
            await audioRef.current?.play(); // Play the audio after resuming context
            setIsPlaying(true); // Set isPlaying to true after playback starts
          }, { once: true }); // Ensure the listener runs only once
        }
      } else {
        // If no audio context, just switch the stream and play immediately
        updateStream();
  
        // Wait for the new stream to load
        if (audioRef.current) {
          audioRef.current.addEventListener('loadeddata', async () => {
            await audioRef.current?.play(); // Ensure the new stream plays
            setIsPlaying(true); // Set isPlaying to true
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('Error switching streams or playing audio:', error);
    }
  };   */

  return (
    <div className="relative z-10 text-white pt-20 md:pt-10 pb-32 px-4 mx-auto max-w-4xl mb-16">
      {/* Background Video */}
      {/* <div className="absolute inset-0 z-0">
        <video
          className="w-full h-full object-cover opacity-20 md:opacity-40"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="gary_blw_compressed.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div> */}

      {/* Foreground content */}
      <div className="relative z-10">
        <h1 className="text-center text-2xl md:text-4xl mb-4 md:my-8">gary</h1>

        {/* Status Indicators */}
        <div className="flex justify-center items-center space-x-4 mb-8">
          <StatusIndicator
            statusUrl="https://g4l.thecollabagepatch.com"
            label="gary4live"
          />
          <StatusIndicator
            statusUrl="https://gary.thecollabagepatch.com"
            label="gary4web"
          />
        </div>

        {/* Persistent Tooltip */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400">
            green means gary&apos;s backend is live. red means he&apos;s asleep.
          </p>
        </div>

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
      gary is just a fun name for a specific kind of ai music generation. instead of giving it a text prompt, we give it our audio and see where it thinks the track was going. gary4live does this with your ableton audio. gary4web and gary-on-the-fly do this with youtube tracks in the browser.
    </p>
  </div>
)}


        {/* Buttons aligned in a cluster for mobile */}
        <div className={`flex justify-center gap-4 my-8 ${window.innerWidth <= 768 ? 'button-cluster' : ''}`}>
        <button onClick={() => setActiveSection('gary4beatbox')} className={`py-2 px-4 ${activeSection === 'gary4beatbox' ? 'bg-white text-black' : 'bg-transparent border border-white'}`}>gary4beatbox</button>
          <button onClick={() => setActiveSection('garyOnTheFly')} className={`py-2 px-4 ${activeSection === 'garyOnTheFly' ? 'bg-white text-black' : 'bg-transparent border border-white'}`}>gary on the fly</button>
          <button onClick={() => setActiveSection('githubAndColab')} className={`py-2 px-4 ${activeSection === 'githubAndColab' ? 'bg-white text-black' : 'bg-transparent border border-white'}`}>
            <FontAwesomeIcon icon={faGithub} /> github and colab
          </button>
          <button onClick={() => setActiveSection('huggingfaceHub')} className={`py-2 px-4 ${activeSection === 'huggingfaceHub' ? 'bg-white text-black' : 'bg-transparent border border-white'}`}>🤗models</button>
          <button onClick={() => { setActiveSection('gary4web'); setShowYouTubeDemo(true); }} className={`py-2 px-4 ${activeSection === 'gary4web' ? 'bg-white text-black' : 'bg-transparent border border-white'}`}>gary4web</button>
          <button onClick={() => setActiveSection('gary4live')} className={`py-2 px-4 ${activeSection === 'gary4live' ? 'bg-white text-black' : 'bg-transparent border border-white'}`}>gary4live</button>
        </div>

         {/* New gary4beatbox Section */}
                {activeSection === 'gary4beatbox' && (
          <div>
            <h2 className="text-xl md:text-3xl mb-4">gary4beatbox</h2>
            
            {/* Display the GIF */}
            <div className="flex justify-center mb-4">
              <img 
                src="g4b.gif" 
                alt="Gary4Beatbox Demo" 
                className="w-full max-w-xs md:max-w-md lg:max-w-lg object-contain"
              />
            </div>

            <div className="text-center mb-4">
              <a 
                href="https://apps.apple.com/us/app/gary4beatbox/id6736522400"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold hover:text-gray-400 underline"
              >
                live on the app store right now
              </a>
            </div>

            <p className="text-center mb-4">
              this is gary for your phone. record w/ur mic, with or without noise cancellation, and see where it goes.
            </p>
            <p className="text-center mb-6">
              uses the same backend as gary4live
            </p>

            {/* Android Waitlist Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowWaitlistModal(true)}
                className="px-6 py-2 bg-transparent border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-all duration-300"
              >
                sign up to be an android tester. we need your help.
              </button>
            </div>

            {/* Waitlist Modal */}
            <WaitlistModal 
              isOpen={showWaitlistModal}
              onClose={() => setShowWaitlistModal(false)}
            />
          </div>
        )}

        {/* Section Content */}
        {activeSection === 'garyOnTheFly' && (
          <div>
            <img src="gary-on-the-fly-black.png" alt="Gary on the Fly Logo" className="mx-auto h-32 w-auto mb-4" />
            <p>a chrome extension for doing youtube remixes directly in the browser. go to a yt track, press play, open the popup window, press the &apos;generate music&apos; button on beat, go to the new tab page where you can arrange/crop/remove and export to mp3. you can test out how a single output works in the gary4web tab.</p>
            <a href="https://noteforms.com/forms/gary-on-the-fly-alpha-17qpii" target="_blank" rel="noopener noreferrer" className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105">
              get on the waitlist
            </a>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/2Th5GSwEu7E" title="YouTube video player" frameBorder="0" allowFullScreen className="mx-auto my-4"></iframe>
          </div>
        )}

        {/* "GitHub and Colab" Section */}
        {activeSection === 'githubAndColab' && (
          <div>
            <p>
              gary started out as a python script that used bpm detection to choose sections of a full song to continue from, and then stitch them together into a (not very) seamless piece of music.
            </p>
            {/* New stream switcher */}
            {/* <p className="mt-4">
              hear the early python script in action at the{' '}
              <span
                className="underline cursor-pointer hover:text-gray-400"
                onClick={handleSwitchToAudiocraft}
              >
                /audiocraft.mp3
              </span>{' '}
              stream.
            </p> */}
            <a href="https://colab.research.google.com/drive/10CMvuI6DV_VPS0uktbrOB8jBQ7IhgDgL" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
              <FontAwesomeIcon icon={faGithub} /> colab notebook
            </a>
            <p>wanting more granular control, the max4live device was made next. find that here on github:</p>
            <a href="https://github.com/betweentwomidnights/gary4live" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
              <FontAwesomeIcon icon={faGithub} /> gary4live on github
            </a>
            <p>since gary is free and open source, you can build the backend for it yourself locally if you have a gpu. the backends for gary-on-the-fly, gary4live, and gary4web are all contained here in separate docker-compose files.</p>
            <a href="https://github.com/betweentwomidnights/gary-backend-combined" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
              <FontAwesomeIcon icon={faGithub} /> combined gary backend
            </a>
          </div>
        )}

        {activeSection === 'huggingfaceHub' && (
          <div>
            <p>fine-tuned models from the musicgen discord community hosted here. use &quot;thepatch/bleeps-medium&quot; or &quot;thepatch/vanya_ai_dnb_0.1&quot; in your notebook/environment instead of &quot;facebook/musicgen-small&quot;. or just download the weights yourself. they&apos;re free.</p>
            <a href="https://huggingface.co/thepatch" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
            🤗huggingface hub🤗
            </a>
            <p>musicgen models are like pokemon. you wanna fine-tune them on ~100 songs if you&apos;re doing small.</p>
            <a href="https://github.com/lyramakesmusic/finetune-musicgen" target="_blank" rel="noopener noreferrer" className="inline-block text-lg font-semibold py-2 px-4 rounded hover:underline mb-4">
            <FontAwesomeIcon icon={faGithub} /> lyra&apos;s fine-tuning stuff
            </a>
          </div>
        )}

        {activeSection === 'gary4web' && showYouTubeDemo && (
          <Suspense fallback={<div>Loading...</div>}>
            <YouTubeDemo setShowYouTubeDemo={setShowYouTubeDemo} />
          </Suspense>
        )}

        {activeSection === 'gary4live' && (
          <div>
            <h2 className="text-xl md:text-3xl mb-4">gary4live</h2>
            
            {/* Display the GIF */}
            <div className="flex justify-center mb-4">
              <img 
                src="gary4live_fastest_smallest.gif" 
                alt="Gary4Live in action" 
                className="w-full max-w-xs md:max-w-md lg:max-w-lg object-contain"
              />
            </div>

            <p>gary4live is a max4live device that lets you use the audio from ableton as input audio for gary&apos;s continuations. this is the coolest way to play with it because its outputs are often not complete on their own. they can be stacked with the original audio in surprising ways, and then fed back into the plugin. here is a youtube playlist demonstrating what we mean.</p>

            {/* Embed YouTube Playlist */}
            <div className="flex justify-center mb-4">
              <iframe 
                width="560" 
                height="315" 
                src="https://www.youtube.com/embed/videoseries?list=PLXlMPOlypVXtmmiPu19EG7lOIpdyi39yw" 
                title="YouTube playlist" 
                frameBorder="0" 
                allowFullScreen 
                className="w-full max-w-xs md:max-w-md lg:max-w-lg"
              ></iframe>
            </div>

            <div className="flex justify-center gap-4 my-8">
              <a href="https://thepatch.gumroad.com/l/gary4live" className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105">
                download g4l for pc
              </a>
              <a href="https://thepatch.gumroad.com/l/gary-mac" className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105">
                download the mac version
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GaryPage;
