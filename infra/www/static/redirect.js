# File: /var/www/static/redirect.js
function detectPlatformAndRedirect() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gary4beatbox';
    const IOS_STORE_URL = 'https://apps.apple.com/us/app/gary4beatbox/id6736522400';
    const DEFAULT_URL = 'https://thecollabagepatch.com';  // Updated fallback URL
    
    if (isAndroid) {
        window.location.href = ANDROID_STORE_URL;
    } else if (isIOS) {
        window.location.href = IOS_STORE_URL;
    } else {
        window.location.href = DEFAULT_URL;
    }
}
