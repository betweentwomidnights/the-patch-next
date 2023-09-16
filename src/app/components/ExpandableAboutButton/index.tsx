import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { IoMdArrowRoundDown, IoMdArrowRoundForward } from 'react-icons/io';
import GlitchyText from '../GlitchyText';

interface Artist {
  name: string;
  type: 'spotify' | 'soundcloud';
  embedUrl: string;
  directUrl?: string;
}

const artists: Artist[] = [
  { 
    name: "wrechno", 
    type: "spotify", 
    embedUrl: "https://open.spotify.com/embed/artist/5PENGRkkbQGKlYdDl6ViJq", 
    directUrl: "https://open.spotify.com/artist/5PENGRkkbQGKlYdDl6ViJq?si=ZG2k-3HzTCuAO3x6nEdTPQ"
  },
  { 
    name: "chris hrtz", 
    type: "spotify", 
    embedUrl: "https://open.spotify.com/embed/artist/1D4P0sq2RDEApJXkinhI4a?utm_source=generator", 
    directUrl: "https://open.spotify.com/artist/1D4P0sq2RDEApJXkinhI4a?si=QLGFhggqTma9g9cCjkgzHw"
  },
  { 
    name: "between two midnights", 
    type: "spotify", 
    embedUrl: "https://open.spotify.com/embed/artist/0XJudbwokA4BAFvsm2nzje", 
    directUrl: "https://open.spotify.com/artist/0XJudbwokA4BAFvsm2nzje?si=-_RmW-WeRvWZjIAL9iy5nw"
  },
  {
    name: "chip sycamore",
    type: "soundcloud",
    embedUrl: "https://soundcloud.com/chipsycamore"
  }
];

const ExpandableAboutButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
const [isSubExpanded, setIsSubExpanded] = useState<boolean>(false);
const [loadedArtists, setLoadedArtists] = useState<Record<string, boolean>>({});


const expandCollapseAnimation = useSpring({
  // Adjust these dimensions as needed
  width: isExpanded ? '80vw' : '60px',
  height: isExpanded ? (isSubExpanded ? '80vh' : '40vh') : '60px',
  maxWidth: isExpanded ? '500px' : '60px',
  maxHeight: isExpanded ? (isSubExpanded ? '500px' : '250px') : '60px',
  config: { friction: 20, tension: 170 },
});

const subExpandCollapseAnimation = useSpring({
  height: isSubExpanded ? '40vh' : '0px',
  config: { friction: 20, tension: 170 },
});

useEffect(() => {
  if (isExpanded) {
    const loaded: Record<string, boolean> = {};
    artists.forEach(artist => loaded[artist.name] = true);
    setLoadedArtists(loaded);
  }
}, [isExpanded]);

return (
  <div className="relative z-20">
    {/* Fixed arrow buttons */}
    <div className="fixed-arrows flex space-x-2 z-30">
  {isExpanded ? (
    <>
      <IoMdArrowRoundDown onClick={() => setIsExpanded(false)} className="text-white text-3xl" />
      <IoMdArrowRoundDown onClick={() => setIsSubExpanded(!isSubExpanded)} className="text-white text-3xl" />
    </>
  ) : (
    <IoMdArrowRoundForward onClick={() => setIsExpanded(true)} className="text-white text-3xl" />
  )}
</div>

    {/* Animated Parent Container */}
    <animated.div
      style={expandCollapseAnimation}
      className="expandable-about-button custom-scrollbar"
    >
      {isExpanded && (
        <>
          {isSubExpanded && (
            <animated.div
              style={subExpandCollapseAnimation}
              className="border border-white rounded-xl bg-black overflow-y-auto mt-4 p-4"
            >
              <GlitchyText text="cuz theres more insides inside these insides" />
            </animated.div>
          )}

          {/* Move this below the isSubExpanded condition */}
          <div className="overflow-hidden mt-4">
            <GlitchyText text="Artists:" />
            {artists.map((artist) => (
  <>
    {loadedArtists[artist.name] && artist.type === "spotify" ? (
      <div className="my-2">
        <a href={artist.directUrl} target="_blank" rel="noopener noreferrer">
          <GlitchyText text={`${artist.name} (spotify)`} />
        </a>
        {loadedArtists[artist.name] ? (
          <iframe 
            key={artist.name} 
            className="rounded-lg w-full overflow-hidden mt-2" 
            src={artist.embedUrl} 
            height="152" 
            frameBorder="0" 
            allowFullScreen 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
          </iframe>
        ) : (
          <div className="iframe-placeholder"></div>
        )}
      </div>
    ) : (
      <a href={artist.directUrl} target="_blank" rel="noopener noreferrer">
        <GlitchyText key={artist.name} text={artist.name} />
      </a>
    )}
  </>
))}
          </div>
        </>
      )}
    </animated.div>
  </div>
);
};

export default ExpandableAboutButton;
