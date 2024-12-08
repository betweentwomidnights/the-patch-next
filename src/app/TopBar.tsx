import React, { useState } from 'react';

interface TopBarProps {
  setShowYouTubeDemo: (show: boolean) => void;
  onLoadGary: () => void; // New prop to handle navigation to Gary's page
}

const TopBar: React.FC<TopBarProps> = ({ setShowYouTubeDemo, onLoadGary }) => {
  const [isExpanded, setIsExpanded] = useState(false); // State to manage whether the button is expanded

  const handleNavigate = () => {
    setShowYouTubeDemo(true);
  };

  // Toggle between expanded and collapsed state for gumroad button
  const handleGumroadClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-transparent text-white flex justify-center items-center p-4 z-50">
      {/* <a
        href="https://noteforms.com/forms/gary-on-the-fly-alpha-17qpii"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
      >
        chrome extension waitlist
      </a> */}

      {/* Commented out section, leaving it as is */}
      {/* <button
        onClick={handleNavigate}
        className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 ml-4 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
      >
        here&apos;s a toy
      </button> */}

      {/* New button for "about that gary" */}
      <button
        onClick={onLoadGary} // Navigate to Gary's page
        className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 ml-4 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
      >
        about that gary
      </button>

      {/* Conditional rendering based on whether the Gumroad button is expanded */}
      {isExpanded ? (
        <div className="flex space-x-4 ml-4">
          {/* PC Download Button */}
          <a
            href="https://thepatch.gumroad.com/l/gary4live"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
          >
            pc
          </a>
          {/* Mac Download Button */}
          <a
            href="https://thepatch.gumroad.com/l/gary-mac"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-transparent border-2 border-white text-white py-2 px-6 rounded-full hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
          >
            mac
          </a>
        </div>
      ) : (
        // Initial button before expansion
        <button
          onClick={handleGumroadClick}
          className="pulse-button inline-block bg-transparent border-2 border-white text-white py-2 px-6 ml-4 rounded-full transition-all duration-300 transform hover:scale-105"
        >
          g4l on gumroad
        </button>
      )}
    </div>
  );
};

export default TopBar;
