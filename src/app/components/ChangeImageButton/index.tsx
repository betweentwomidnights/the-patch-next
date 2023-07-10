import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';

interface ChangeImageButtonProps {
  onChangeImage: () => void;
}

const ChangeImageButton: React.FC<ChangeImageButtonProps> = ({ onChangeImage }) => {
  const iconStyle = {
    color: 'white', 
    fontSize: '2em',
  };

  return (
    <button 
      className="change-image-button"
      onClick={onChangeImage} 
    >
      <FiRefreshCw style={iconStyle} />
    </button>
  );
};

export default ChangeImageButton;
