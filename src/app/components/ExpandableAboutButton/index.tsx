import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { IoMdArrowRoundDown, IoMdArrowRoundForward } from 'react-icons/io';
import GlitchyText from '../GlitchyText'; 

const ExpandableAboutButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubExpanded, setIsSubExpanded] = useState(false);

  const expandCollapseAnimation = useSpring({
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

  return (
    <animated.div
      style={{
        ...expandCollapseAnimation,
        overflow: 'hidden',
        border: '1px solid white',
        borderRadius: '15px',
        background: 'black',
        padding: isExpanded ? '20px' : '0',
        position: 'fixed',
        bottom: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column-reverse',
        justifyContent: 'space-between',
        overflowY: 'auto', // Make parent container scrollable
      }}
      className="expandable-about-button"
    >
      <div className="arrow-container">
        {isExpanded ? (
          <>
            <IoMdArrowRoundDown
              onClick={() => setIsExpanded(false)}
              style={{ color: 'white', fontSize: '3em', alignSelf: 'flex-end' }}
            />
            <IoMdArrowRoundDown
              onClick={() => setIsSubExpanded(!isSubExpanded)}
              style={{ color: 'white', fontSize: '3em', alignSelf: 'flex-start' }}
            />
          </>
        ) : (
          <IoMdArrowRoundForward
            onClick={() => setIsExpanded(true)}
            style={{ color: 'white', fontSize: '3em', alignSelf: 'flex-end' }}
          />
        )}
      </div>

      {isExpanded && (
        <animated.div
          style={{
            ...subExpandCollapseAnimation,
            overflow: 'hidden',
            border: '1px solid white',
            borderRadius: '15px',
            background: 'black',
            padding: isSubExpanded ? '20px' : '0',
            marginTop: isSubExpanded ? '20px' : '0',
            overflowY: 'auto', // Make child container scrollable
          }}
        >
          <GlitchyText text="cuz theres more insides inside these insides" />
        </animated.div>
      )}

      {isExpanded && (
        <div style={{ overflow: 'hidden' }}>
          <GlitchyText text="music by wrechno, between two midnights, chris hrtz, chip sycamore, mr. armageddon, the collabage patch" />
          <GlitchyText text="liquidsoap stream, React-js, @react-three/fiber and GLSL shadercode by gpt4" />
          <GlitchyText text="wrechno" url="https://open.spotify.com/artist/5PENGRkkbQGKlYdDl6ViJq" />
          <GlitchyText text="chris hrtz" url="https://open.spotify.com/artist/0Kh0CZvaMawbBzgphvY6E4" />
          <GlitchyText text="chip sycamore" url="https://soundcloud.com/chipsycamore" />
        </div>
      )}
    </animated.div>
  );
};

export default ExpandableAboutButton;
