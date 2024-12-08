import { useState, useEffect } from 'react';

const useBackendStatus = (url: string, interval = 10000) => {
  const [status, setStatus] = useState<'live' | 'down' | 'checking'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${url}/health`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.status === 'live') {
          setStatus('live');
        } else {
          setStatus('down');
        }
      } catch (error) {
        setStatus('down');
      }
    };

    // Initial status check
    checkStatus();

    // Periodically check status
    const intervalId = setInterval(checkStatus, interval);

    // Set a timeout to switch from "checking" to "down" if it takes too long
    const timeoutId = setTimeout(() => {
      if (status === 'checking') {
        setStatus('down'); // Change to red if still checking after the timeout
      }
    }, 5000); // 5 seconds timeout (adjust as needed)

    // Cleanup intervals and timeouts on component unmount
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [url, interval, status]);

  return status;
};

export default useBackendStatus;
