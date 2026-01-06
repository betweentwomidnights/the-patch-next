import React, { useState, useEffect } from 'react';

const CyclingText: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const messages = [
    "gary used to be a max4live device",
    "it was kinda a PITA to use...",
    "now it's a vst/au", 
    "fl studio, reaper, bitwig, logic",
    "even garageband users can play"
  ];

  useEffect(() => {
    if (currentIndex < messages.length - 1) {
      const timer = setTimeout(() => {
        setIsTransitioning(true);
        
        // After blur out completes, change text and blur back in
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setIsTransitioning(false);
        }, 150); // Half the transition duration
        
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, messages.length]);

  return (
    <div className="mb-4 h-6 flex items-center justify-center">
      <p 
        className="text-sm text-gray-300 text-center transition-all duration-300 ease-in-out"
        style={{
          opacity: isTransitioning ? 0 : 1,
          filter: `blur(${isTransitioning ? '4px' : '0px'})`,
          transform: `scale(${isTransitioning ? '0.95' : '1'})`
        }}
      >
        {messages[currentIndex]}
      </p>
    </div>
  );
};

export default CyclingText;