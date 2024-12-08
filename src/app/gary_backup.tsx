import React, { useRef } from 'react';

const GaryPage: React.FC = () => {
  const textContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (textContainerRef.current) {
      const { clientY } = event;
      const { top, height } = textContainerRef.current.getBoundingClientRect();
      const scrollTop = ((clientY - top) / height) * textContainerRef.current.scrollHeight;
      textContainerRef.current.scrollTop = scrollTop - height / 2; // Center the scroll position
    }
  };

  const paragraphAnimation = 'animate-slideInDown';

  return (
    <div className="text-white bg-black pt-20 md:pt-10 pb-4 px-4 mx-auto max-w-2xl mb-16">
      <h1 className="text-center text-2xl md:text-4xl mb-4 md:my-8">whats a gary tho</h1>
      
      
      
      <div
        onMouseMove={handleMouseMove}
        ref={textContainerRef}
        className="space-y-3 mb-6 overflow-auto max-h-[50vh] md:max-h-[60vh]">
      
      <p className={paragraphAnimation}>
        gary is just a fun name for a specific kind of ai music generation. its called a continuation.
        instead of giving the ai a text prompt, and trying to describe things like bpm and groove,
        you can give the robot any piece of audio to try and continue from as if it were its own. 
      </p>
      
      <p className={paragraphAnimation}>
        using the audiocraft repository, we made a python script that performs these continuations, with some bpm
        detection, to continue from sections of a given song
        semi-randomly to try and make a remix. you can hear a ton of these tracks
        in the gary-n-kev stream here at the patch.
      </p>
      
      <p className={paragraphAnimation}>
        while the python script is pretty dope, and fun to use, it lacked granularity. we were tryna choose
        very specific pieces of our songs for the ai to jam to. 
        so next we made a max4live device that performs these continuations on any audio
        from the ableton arrangement. we used this device in our most recent project, 
        betweentwomidnights. using fine-tunes, we never need sample packs again.
      </p>
      </div>
      
      <a 
        href="https://github.com/betweentwomidnights/gary4live"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-lg font-semibold text-white py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 mb-4 mx-auto text-center block border border-white hover:border-gray-500"
      >
        gary on github and colab
      </a>
      
      <div className="text-center mb-24"> {/* Added margin bottom */}
        <iframe 
          className="w-full h-80 max-w-2xl mx-auto"
          src="https://www.youtube.com/embed/bKlBuWjIWHI?si=31e8SwUraYpTDEMN" 
          title="YouTube video player" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default GaryPage;