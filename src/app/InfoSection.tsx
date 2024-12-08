import React, { useState } from 'react';
import { motion } from 'framer-motion';

const InfoSection = () => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="mb-5 text-lg text-white">
      <div className="font-bold">
        <p>this is a lil baby version of the chrome extension.</p> 
        <p>pick a section of a song on yt to remix</p>
      </div>
      <div className="cursor-pointer text-white" onClick={() => setShowGuide(!showGuide)}>
        {showGuide ? 'hide' : 'show guide'}
      </div>
      {showGuide && (
        <motion.div 
          className="mt-4 p-4 rounded bg-black text-white border border-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div>
            {[
              'step 1: find a yt track (youtu.be or youtube.com/watch) and copy the link.',
              'step 2: select the model and stuff in the settings in the bottom left of the screen.',
              'step 3: while its playing, press generate at the exact moment you want gary to start from.',
              'step 4: when you get the waveform back, you can crop the end off using the playback cursor (you can do it while the audio plays)',
              'step 5: press continue to have gary extend the audio you just cropped (or maybe you didnt crop it at all)',
              'step 6: you can continue it twice (eventually your audio will get too big for this demo)',
              'step 7: export to mp3',
            ].map((step, index) => (
              <motion.div
                key={index}
                className="mt-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
              >
                <span className="font-bold text-white">{step.split(':')[0]}:</span>
                <span className="text-white"> {step.split(':')[1]}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
      {/* <div className="mt-4">
        <div className="font-bold text-lg">edge cases:</div>
        <div className="text-sm">
          <p>sry android ppl...maybe it works on your phone but on matt&apos;s google pixel, we haven&apos;t gotten it to work yet.</p>
          <p>on iphone and mac, the visual waveform doesn&apos;t sync up properly with the audio. your audio is fine but cropping might be a little nightmarish.</p>
          
          <motion.p 
            className="font-bold text-white animate-pulse mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          >
            <p>you are literally helping kev test this web app right now. </p>
            <p>you can talk to him in the bottom right of the screen, in the crisp chat window, and hopefully he will see it. </p>
            <p>you can also plz yell at him at </p>
            <a className="text-white" href="https://twitter.com/@thepatch_kev"> https://twitter.com/@thepatch_kev</a>
          </motion.p>
        </div>
      </div> */}
    </div>
  );
};

export default InfoSection;
