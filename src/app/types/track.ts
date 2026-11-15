// types/track.ts
export interface TrackInfo {
    displayName: string;
    description: string;
    year?: number;
    youtubePlaylist?: string;
    youtubeLink?: string;
    youtubeChannel?: string;
    spotifyLink?: string;
    colabLink?: string;
    githubLink?: string;
    additionalInfo?: string;
  }
  
  export interface NowPlayingData {
    folder: string;
    track: string;
    position: number;
    duration: number;
    timestamp: number;
    loopCount: number;
  }
