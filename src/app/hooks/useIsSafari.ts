import { useEffect, useState } from 'react';

const useIsSafari = () => {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('safari') && !ua.includes('chrome')) {
      setIsSafari(true);
    }
  }, []);

  return isSafari;
};

export default useIsSafari;