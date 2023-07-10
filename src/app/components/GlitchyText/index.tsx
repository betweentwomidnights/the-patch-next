import React, { useEffect, useState } from 'react';

interface GlitchyTextProps {
  text: string;
  url?: string;
}

const GlitchyText: React.FC<GlitchyTextProps> = ({ text, url }) => {
  const [glitchyText, setGlitchyText] = useState(text);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const glitchedText = text
        .split('')
        .map(char => (Math.random() < 0.1 ? String.fromCharCode(84 + Math.floor(Math.random() * 26)) : char))
        .join('');
      setGlitchyText(glitchedText);
    }, 10000);

    const revertInterval = setInterval(() => {
      setGlitchyText(text);
    }, 10500);

    return () => {
      clearInterval(intervalId);
      clearInterval(revertInterval);
    };
  }, [text]);

  if (url) {
    return (
      <a href={url} style={{ fontSize: '1.0em', color: 'white', display: 'block' }}>
        {glitchyText}
      </a>
    );
  }

  return <p style={{ fontSize: '1.0em', color: 'white', display: 'block' }}>{glitchyText}</p>;
};

export default GlitchyText;
