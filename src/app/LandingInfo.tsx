import React from 'react';

interface LandingInfoProps {
  onGaryPageClick: () => void;
}

const LandingInfo: React.FC<LandingInfoProps> = ({ onGaryPageClick }) => {
  return (
    <div className="bg-black/30 p-4 rounded-lg mb-6 text-gray-300">
      <div className="space-y-2 mb-4">
        <p className="text-sm">
          <span className="font-medium">gary</span> ({' '}
          <a 
            href="https://github.com/facebookresearch/audiocraft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            musicgen
          </a>
          ): iterates on input audio
        </p>
        <p className="text-sm">
          <span className="font-medium">terry</span> ({' '}
          <a 
            href="https://huggingface.co/spaces/facebook/Melodyflow" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            melodyflow
          </a>
          ): transforms input audio
        </p>
        <p className="text-sm">
          <span className="font-medium">jerry</span> ({' '}
          <a 
            href="https://huggingface.co/stabilityai/stable-audio-open-small" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            stable audio open small
          </a>
          ): generates bpm aware loops
        </p>
      </div>
      <p className="text-sm">
        for more details and links to githubs, go to{' '}
        <button
          onClick={onGaryPageClick}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          gary&apos;s page
        </button>
      </p>
    </div>
  );
};

export default LandingInfo;