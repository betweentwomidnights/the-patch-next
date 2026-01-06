import React, { useState, useRef } from 'react';
import { VolumeX, Volume2 } from 'lucide-react';

interface MutedVideoPlayerProps {
  src: string;
  className?: string;
}

const MutedVideoPlayer: React.FC<MutedVideoPlayerProps> = ({ src, className = "" }) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <video
  ref={videoRef}
  className="w-full h-full rounded-lg"
  src={src}
  autoPlay
  loop
  muted
  playsInline
  onLoadedData={() => setIsLoading(false)}
/>
{isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">Loading...</div>}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white" />
        ) : (
          <Volume2 className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
};

export default MutedVideoPlayer;