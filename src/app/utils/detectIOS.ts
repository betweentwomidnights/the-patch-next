// src/utils/detectIOS.ts
export function detectIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
  
    const userAgent = navigator.userAgent;
    //console.log('User Agent:', userAgent);
  
    const isIOSByUA = /iPad|iPhone|iPod/.test(userAgent);
    const isIOSByPlatform = (
      navigator.platform === 'iPhone' ||
      navigator.platform === 'iPad' ||
      navigator.platform === 'iPod'
    );
    const isIOSByMaxTouchPoints =
      navigator.maxTouchPoints > 0 &&
      /Mac/.test(navigator.platform);
  
    // console.log('iOS Detection Results:', {
    //   userAgent,
    //   isIOSByUA,
    //   isIOSByPlatform,
    //   isIOSByMaxTouchPoints,
    //   platform: navigator.platform,
    //   maxTouchPoints: navigator.maxTouchPoints
    // });
  
    return isIOSByUA || isIOSByPlatform || isIOSByMaxTouchPoints;
  }
  