import React from 'react';
import { FaTwitter, FaDiscord, FaYoutube, FaTwitch } from 'react-icons/fa';

const SocialMediaButtonGroup = () => {
  const twitterURL = "https://twitter.com/thepatch_kev";
  const discordURL = "https://discord.gg/VECkyXEnAd";
  const youtubeURL = "https://www.youtube.com/channel/UCmDU9oCSFwbNokxM1Wi_FWA";
  const twitchURL = "https://www.twitch.tv/thecollabagepatch";

  const iconStyle = {
    color: 'white', 
    fontSize: '2em',
    transition: 'transform 0.3s ease-in-out',
  };

  const handleMouseDown = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    e.currentTarget.style.transform = 'scale(0.9)';
  }
  
  const handleMouseUp = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    e.currentTarget.style.transform = 'scale(1)';
  }
  

  return (
    <div className="social-media-button-group" style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      background: 'black',
      border: '1px solid white',
      borderRadius: '15px',
      width: '200px',
      padding: '10px'
    }}>
      <a href={twitterURL} target="_blank" rel="noopener noreferrer">
        <FaTwitter style={iconStyle} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />
      </a>
      <a href={discordURL} target="_blank" rel="noopener noreferrer">
        <FaDiscord style={iconStyle} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />
      </a>
      <a href={youtubeURL} target="_blank" rel="noopener noreferrer">
        <FaYoutube style={iconStyle} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />
      </a>
      <a href={twitchURL} target="_blank" rel="noopener noreferrer">
        <FaTwitch style={iconStyle} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />
      </a>
    </div>
  );
};

export default SocialMediaButtonGroup;
