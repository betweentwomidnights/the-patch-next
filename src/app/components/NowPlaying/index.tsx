// components/NowPlaying.tsx



import React, { useState, useEffect, useRef } from 'react';
import { Info, Play, ListVideo } from 'lucide-react';
import trackInfo from './trackInfo';
import { NowPlayingData, TrackInfo } from '../../types/track';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../ui/card"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "../ui/sheet"

const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface ThumbnailProps {
    url: string;
    title: string;
    isPlaylist?: boolean;
    playlistFirstVideoId?: string;
}

const YouTubeThumbnail: React.FC<ThumbnailProps> = ({ 
    url, 
    title, 
    isPlaylist,
    playlistFirstVideoId 
}) => {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center gap-2">
                {isPlaylist ? (
                    <>
                        <ListVideo className="w-12 h-12 text-white opacity-50" />
                        <span className="text-white text-sm opacity-50">Playlist</span>
                    </>
                ) : (
                    <>
                        <Play className="w-12 h-12 text-white opacity-50" />
                        <span className="text-white text-sm opacity-50">Video</span>
                    </>
                )}
            </div>
        );
    }

    let thumbnailUrl: string;
    if (isPlaylist && playlistFirstVideoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${playlistFirstVideoId}/hqdefault.jpg`;
    } else {
        const videoId = getYoutubeVideoId(url);
        if (!videoId) return null;
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    return (
        <img 
            src={thumbnailUrl}
            alt={`${isPlaylist ? 'Playlist' : 'Video'} thumbnail for ${title}`}
            onError={() => setError(true)}
            className="w-full h-full object-cover rounded-lg"
        />
    );
};

interface NowPlayingProps {
    //onPause: () => void;
}

const NowPlaying: React.FC<NowPlayingProps> = ({  }) => {
    const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    // First video IDs for playlists - could be moved to trackInfo.ts
    const playlistFirstVideos: Record<string, string> = {
        'PLTgvaF3a9YMhy7q0oTf8av27CIyxCqeWi': 'D4E9zAmrCQ8'
    };
    
    useEffect(() => {
        const fetchNowPlaying = async () => {
            try {
                const response = await fetch('/api/nowplaying');
                const data: NowPlayingData = await response.json();
                setNowPlaying(data);
            } catch (error) {
                console.error('Error fetching now playing:', error);
            }
        };

        fetchNowPlaying();
        const interval = setInterval(fetchNowPlaying, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!nowPlaying) return null;

    const trackPath = `${nowPlaying.folder}/${nowPlaying.track}` as keyof typeof trackInfo;
    const track: TrackInfo = trackInfo[trackPath] || { 
        displayName: nowPlaying.track,
        description: "Track information not available"
    };

    // Extract playlist ID if present
    const playlistId = track.youtubePlaylist?.match(/[&?]list=([^&]+)/i)?.[1];
    const firstVideoId = playlistId ? playlistFirstVideos[playlistId] : undefined;

    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs px-4 md:max-w-sm md:bottom-10 md:left-10 md:translate-x-0">
            <Card className="w-full bg-black border border-white bg-opacity-50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">now playing</CardTitle>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <button className="cursor-pointer">
                                <Info className="h-4 w-4 text-white hover:text-gray-300" />
                            </button>
                        </SheetTrigger>
                        <SheetContent 
                            side="right" 
                            className="bg-black/70 border-l border-white w-full sm:max-w-md overflow-y-auto"
                        >
                            <SheetHeader className="space-y-6">
                                <SheetTitle className="text-white">{track.displayName}</SheetTitle>
                                <div className="flex flex-col space-y-6">
                                    {track.description && (
                                        <div className="text-sm text-gray-300">
                                            {track.description}
                                        </div>
                                    )}
                                    
                                    {track.youtubeLink && (
                                        <a 
                                            href={track.youtubeLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group block w-full focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg"
                                        >
                                            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                                <YouTubeThumbnail 
                                                    url={track.youtubeLink} 
                                                    title={track.displayName}
                                                />
                                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                                    <Play className="w-12 h-12 text-white opacity-75 transform transition-all duration-300 group-hover:opacity-100 group-hover:scale-110 group-focus:opacity-100 group-focus:scale-110" />
                                                </div>
                                            </div>
                                        </a>
                                    )}

                                    {track.youtubePlaylist && (
                                        <a 
                                            href={track.youtubePlaylist}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group block w-full focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg"
                                        >
                                            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                                <YouTubeThumbnail 
                                                    url={track.youtubePlaylist} 
                                                    title={track.displayName}
                                                    isPlaylist={true}
                                                    playlistFirstVideoId={firstVideoId}
                                                />
                                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300">
                                                    <ListVideo className="w-12 h-12 text-white" />
                                                </div>
                                            </div>
                                        </a>
                                    )}

                                    <div className="flex flex-col space-y-2 text-sm">
                                        {track.spotifyLink && (
                                            <a 
                                                href={track.spotifyLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 focus:outline-none focus:text-blue-200"
                                            >
                                                listen on spotify
                                            </a>
                                        )}
                                        {track.colabLink && (
                                            <a 
                                                href={track.colabLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 focus:outline-none focus:text-blue-200"
                                            >
                                                view colab notebook
                                            </a>
                                        )}
                                        {track.githubLink && (
                                            <a 
                                                href={track.githubLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 focus:outline-none focus:text-blue-200"
                                            >
                                                view on github
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </SheetHeader>
                        </SheetContent>
                    </Sheet>
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-semibold text-white truncate">{track.displayName}</div>
                </CardContent>
            </Card>
        </div>
    );
};

export default NowPlaying;