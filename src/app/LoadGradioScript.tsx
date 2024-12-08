import React, { useEffect } from 'react';

const LoadGradioScript: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://gradio.s3-us-west-2.amazonaws.com/4.27.0/gradio.js";
    script.type = "module";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

export default LoadGradioScript;
