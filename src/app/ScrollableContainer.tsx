import React, { useRef, useState, useEffect } from 'react';
import useIsMobileDevice from './hooks/useIsMobileDevice';
import LoadGradioScript from './LoadGradioScript';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const ScrollableContainer: React.FC = () => {
  const isMobile = useIsMobileDevice();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setCanScrollLeft(containerRef.current.scrollLeft > 0);
        setCanScrollRight(containerRef.current.scrollWidth > containerRef.current.scrollLeft + containerRef.current.clientWidth);
      }
    };
    if (containerRef.current) {
      containerRef.current.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = containerRef.current.clientWidth;
      containerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <>
      <LoadGradioScript />
      <div className="relative">
        <div className={isMobile ? "carousel-container-mobile" : "carousel-container-desktop"} ref={containerRef}>
          <div className="carousel-item">
            <h2>do you use ableton?</h2>
            <iframe width="300" height="200" src="https://www.youtube.com/embed/ZqgcRiAlrHQ?si=JY50qc8DkjXDmlHx" title="gary4live demo" frameBorder="0" allowFullScreen></iframe>
          </div>
          <div className="carousel-item">
            <h2>do you just have a browser?</h2>
            <iframe width="300" height="200" src="https://www.youtube.com/embed/2Th5GSwEu7E?si=IaUQT02xW8rN6Ncg" title="gary on the fly demo" frameBorder="0" allowFullScreen></iframe>
          </div>
          <div className="carousel-item gradio-container">
            <h2>you dont wanna download anything</h2>
            {isMobile ? (
              <div className="gradio-mobile">
                <gradio-app src="https://thepatch-micro-slot-machine.hf.space"></gradio-app>
              </div>
            ) : (
              <div className="gradio-scroll">
                <gradio-app src="https://thepatch-micro-slot-machine.hf.space"></gradio-app>
              </div>
            )}
          </div>
        </div>
        {canScrollLeft && (
          <button className="arrow left-arrow" onClick={() => scroll('left')}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        )}
        {canScrollRight && (
          <button className="arrow right-arrow" onClick={() => scroll('right')}>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}
      </div>
    </>
  );
};

export default ScrollableContainer;
