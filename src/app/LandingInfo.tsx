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
          ): continue your audio in unexpected directions
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
          ): BPM-aware loops in under a second
        </p>
        <p className="text-sm">
          <span className="font-medium">stable-audio-3</span> ({' '}
          <a
            href="https://github.com/stability-ai/stable-audio-3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            stable audio 3
          </a>
          ): higher fidelity text-guided generation and remixing
        </p>
        <p className="text-sm">
          <span className="font-medium">rc-jerry</span> ({' '}
          <a
            href="https://huggingface.co/RoyalCities/Foundation-1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            foundation-1
          </a>
          ): structured synth/bass/keys loops, key and tempo aware
        </p>
        <p className="text-sm">
          <span className="font-medium">carey</span> ({' '}
          <a
            href="https://github.com/ace-step/Ace-step-1.5"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            ace-step 1.5
          </a>
          ): vocals, stems, audio continuation, and remix
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
          ): transform anything with style presets or a custom prompt
        </p>
        <p className="text-sm">
          <span className="font-medium">darius</span> ({' '}
          <a
            href="https://github.com/magenta/magenta-realtime"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            magenta-realtime
          </a>
          ): 48kHz stereo continuations with style steering
        </p>
      </div>
      <p className="text-sm">
        put it on your master. press play. pick a tab.
      </p>
      <p className="text-sm mt-2">
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
