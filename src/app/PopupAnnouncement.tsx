// PopupAnnouncement.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faStar } from '@fortawesome/free-solid-svg-icons';

interface PopupAnnouncementProps {
  onClose: () => void;
  onShowWaitlist: () => void;
}

const PopupAnnouncement: React.FC<PopupAnnouncementProps> = ({ onClose, onShowWaitlist }) => {
  const handleAndroidClick = () => {
    onClose();
    onShowWaitlist();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div
        className="relative p-4 md:p-8 max-w-lg w-full mx-4 md:mx-0 border-2 max-h-[90vh] md:max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: '#C0C0C0',
          borderColor: '#000',
          color: '#000',
          fontFamily: 'Tahoma, Arial, sans-serif',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">warning: gary4beatbox is now live in the app store.</h2>
          <p className="mb-2 md:mb-4 text-sm md:text-base">
            gary takes your input audio and runs away with it. record w/ur mic and see where it go.
          </p>
          <p className="mb-2 md:mb-4 text-sm md:text-base">it&apos;s free.</p>
          
          {/* Video with reduced height on mobile */}
          <div className="mb-2 md:mb-4">
            <iframe
              className="w-full h-32 md:h-64"
              src="https://www.youtube.com/embed/WxE_0wOhJvQ?si=R8BDffpZgZXzD3rM"
              title="YouTube video player"
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>

          {/* Platform Buttons Container */}
          <div className="flex flex-col gap-2 md:gap-4 mb-2 md:mb-4">
            {/* iOS Button */}
            <a
              href="https://apps.apple.com/us/app/gary4beatbox/id6736522400?uo=2"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 rounded inline-flex items-center justify-center"
              style={{
                backgroundColor: '#000080',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              download on the app store
            </a>

            {/* Android Section */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleAndroidClick}
                className="py-2 px-4 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                haz android?
              </button>
              <span className="text-xs text-gray-600">(sign up to test)</span>
            </div>
          </div>

          <blockquote className="italic mb-2 md:mb-4 text-sm md:text-base">
            &quot;You can literally fart into the mic and it&apos;ll crank out something usable for sampling purposes. I can&apos;t
            stop messing around with it lol.&quot; -Ronzlo, 10/08/2024
          </blockquote>
          
          <div className="flex justify-center mb-2 md:mb-4">
            {[...Array(4)].map((_, i) => (
              <FontAwesomeIcon key={i} icon={faStar} className="text-yellow-500" />
            ))}
          </div>
          
          <button
            onClick={onClose}
            className="py-2 px-6 rounded"
            style={{
              backgroundColor: '#E0E0E0',
              border: '1px solid #000',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupAnnouncement;