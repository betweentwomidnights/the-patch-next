import React from 'react';

interface ChangeChannelButtonProps {
  onClick: () => void;
}

const ChangeChannelButton: React.FC<ChangeChannelButtonProps> = ({ onClick }) => {
  return (
    <button className="change-channel-button" onClick={onClick}>
      Change Channel
    </button>
  );
}

export default ChangeChannelButton;