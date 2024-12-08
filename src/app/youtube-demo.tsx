import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaCog } from 'react-icons/fa';
import WaveSurfer from 'wavesurfer.js';
import { generateMusic, getTaskStatus, continueAudio, cropAudio, exportToMP3, GenerateMusicResponse, TaskStatusResponse } from './services/musicGenerationService';
import SettingsModal from './SettingsModal';
import InfoSection from './InfoSection'
import { openDB } from 'idb';

interface YouTubeDemoProps {
  setShowYouTubeDemo: (show: boolean) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const YouTubeDemo: React.FC<YouTubeDemoProps> = ({ setShowYouTubeDemo }) => {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [model, setModel] = useState<string>(localStorage.getItem('model') || 'facebook/musicgen-small');
  const [promptLength, setPromptLength] = useState<string>(localStorage.getItem('promptLength') || '6');
  const [duration, setDuration] = useState<string>(localStorage.getItem('duration') || '16-18');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingContinue, setLoadingContinue] = useState<boolean>(false);
  const [loadingCrop, setLoadingCrop] = useState<boolean>(false);
  const [loadingExport, setLoadingExport] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [player, setPlayer] = useState<any>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const waveformWrapperRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const youtubePlayerRef = useRef<HTMLDivElement | null>(null); // Ref for YouTube player
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false); // State to manage popup visibility

  const dbPromise = openDB('audioDB', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        const store = db.createObjectStore('audioData', { keyPath: 'taskId' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('cropped', 'cropped');
        store.createIndex('uncropped', 'uncropped');
      }
    },
  });

  useEffect(() => {
    if (videoId && !player) {
      window.onYouTubeIframeAPIReady = () => {
        const ytPlayer = new window.YT.Player('youtube-player', {
          videoId: videoId,
          events: {
            onReady: onPlayerReady,
          },
        });
        setPlayer(ytPlayer);
      };
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      } else {
        window.onYouTubeIframeAPIReady();
      }
    }
  }, [videoId, player]);

  useEffect(() => {
    if (videoId && youtubePlayerRef.current) {
      youtubePlayerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [videoId]);

  const onPlayerReady = (event: any) => {
    setPlayer(event.target); // Ensure player instance is set
    event.target.playVideo();
    console.log('Player ready:', event.target); // Log player instance for debugging
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newVideoId = getYoutubeVideoId(url);
    if (newVideoId) {
      // Reset state related to previous video and audio
      setVideoId(null); // Temporarily set videoId to null to force a re-render
      setAudioData(null);
      setErrorMessage('');
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
        waveSurferRef.current = null;
      }
      if (player) {
        player.destroy(); // Destroy the current player instance
        setPlayer(null); // Reset player to force reinitialization
      }
      setTimeout(() => setVideoId(newVideoId), 100); // Set the new videoId after a short delay
    } else {
      alert('Please enter a valid YouTube URL.');
    }
  };

  const getYoutubeVideoId = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)|youtu\.be\/([^&]+)/;
    const matches = url.match(regex);
    return matches ? matches[1] || matches[2] : null;
  };

  const handleMusicGeneration = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent page reload
    if (loading) return;
    setLoading(true);
    setErrorMessage('');

    try {
      let currentTime = 0;

      if (player) {
        console.log('Player instance:', player); // Log player instance for debugging
        if (typeof player.getCurrentTime === 'function') {
          currentTime = player.getCurrentTime();
          console.log('Current time from YouTube player:', currentTime);
        } else {
          console.log('getCurrentTime is not a function on the player instance:', player);
          setShowErrorPopup(true); // Show the error popup
          setLoading(false);
          return;
        }
      } else {
        console.log('Player instance is not available.');
        setShowErrorPopup(true); // Show the error popup
        setLoading(false);
        return;
      }

      console.log(`Starting music generation with: ${JSON.stringify({ url, currentTime, model, promptLength, duration })}`);
      const response: GenerateMusicResponse = await generateMusic(url, currentTime, model, promptLength, duration);
      if (response.task_id) {
        console.log(`Task enqueued with ID: ${response.task_id}`);
        await saveTaskId(response.task_id); // Save task ID to IndexedDB
        pollForTaskCompletion(response.task_id);
      } else {
        setErrorMessage('Failed to initiate music generation.');
        setLoading(false);
      }
    } catch (error) {
      console.log(`Error generating music: ${error}`);
      setErrorMessage('Error generating music.');
      setLoading(false);
    }
  };

  const saveTaskId = async (taskId: string) => {
    const db = await dbPromise;
    await db.put('audioData', { taskId, data: null, timestamp: Date.now() });
    localStorage.setItem('taskId', taskId); // Save task ID to localStorage
  };

  const pollForTaskCompletion = (taskId: string, retries = 3, timeout = 60000) => {
    const startTime = Date.now();
    const intervalId = setInterval(async () => {
      try {
        console.log('Polling for task status...');

        const statusData = await getTaskStatus(taskId);
        console.log('Task status data:', statusData);

        if (statusData.status === 'completed') {
          clearInterval(intervalId);
          if (statusData.audio) {
            setAudioData(statusData.audio);
            loadWaveSurfer(statusData.audio);
            setLoading(false);
            setLoadingContinue(false);
          }
        } else if (statusData.status === 'failed') {
          clearInterval(intervalId);
          setErrorMessage('Failed to generate audio.');
          setLoading(false);
          setLoadingContinue(false);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(intervalId);
          if (retries > 0) {
            console.log('Retrying task polling...');
            pollForTaskCompletion(taskId, retries - 1, timeout);
          } else {
            console.log('Fetching result directly from backend...');
            fetchResultDirectly(taskId);
          }
        }

        console.log('Fetching progress...');
        const progressResponse = await fetch(`https://gary.thecollabagepatch.com/progress/${taskId}`);
        console.log('Progress response status:', progressResponse.status);

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          console.log('Progress data:', progressData);
          setProgress(progressData.progress);
        } else {
          console.error('Failed to fetch progress:', progressResponse.statusText);
        }
      } catch (error) {
        console.error('Error fetching task status or progress:', error);
        if (retries > 0) {
          clearInterval(intervalId);
          console.log('Retrying task polling due to error...');
          pollForTaskCompletion(taskId, retries - 1, timeout);
        } else {
          clearInterval(intervalId);
          setErrorMessage('Error fetching task status.');
          setLoading(false);
          setLoadingContinue(false);
        }
      }
    }, 2000);
  };

  const fetchResultDirectly = async (taskId: string) => {
    try {
      const response = await fetch(`https://gary.thecollabagepatch.com/fetch-result/${taskId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'completed' && data.audio) {
        setAudioData(data.audio);
        loadWaveSurfer(data.audio);
        setLoading(false);
        setLoadingContinue(false);
      } else {
        setErrorMessage('Failed to retrieve audio result.');
        setLoading(false);
        setLoadingContinue(false);
      }
    } catch (error) {
      console.error('Error fetching result directly:', error);
      setErrorMessage('Error fetching result directly.');
      setLoading(false);
      setLoadingContinue(false);
    }
  };

  const loadWaveSurfer = async (audioBase64: string) => {
    console.log('Loading WaveSurfer with audio data:', audioBase64.slice(0, 50)); // Log the start of the audio data to ensure it's being passed correctly

    const createWaveSurferInstance = async () => {
      if (waveformContainerRef.current) {
        if (waveSurferRef.current) {
          console.log('Destroying existing WaveSurfer instance');
          await waveSurferRef.current.destroy();
          waveSurferRef.current = null;
        }

        console.log('Creating new WaveSurfer instance');
        waveSurferRef.current = WaveSurfer.create({
          container: waveformContainerRef.current,
          waveColor: 'red',
          progressColor: 'maroon',
          backend: 'MediaElement',
        });

        waveSurferRef.current.on('ready', () => {
          console.log('WaveSurfer is ready');
          // Scroll to the waveform container
          if (waveformWrapperRef.current) {
            waveformWrapperRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        });

        console.log('Loading audio into WaveSurfer instance');
        waveSurferRef.current.load(`data:audio/wav;base64,${audioBase64}`);
      } else {
        console.log('waveformContainerRef.current is null');
        setTimeout(() => createWaveSurferInstance(), 100); // Retry after a short delay
      }
    };

    await createWaveSurferInstance();
  };

  const handleContinueAudio = async () => {
    if (!audioData) return;
    setLoadingContinue(true);
    setProgress(0); // Initialize progress to 0
    setErrorMessage('');

    const taskId = localStorage.getItem('taskId'); // Retrieve last task ID
    if (!taskId) {
      setErrorMessage('No previous task ID found to continue from.');
      setLoadingContinue(false);
      return;
    }
    const model = localStorage.getItem('model') || 'facebook/musicgen-small';
    const promptDuration = localStorage.getItem('promptLength') || '6';

    console.log('Starting continuation with:', {
      taskId,
      model,
      promptDuration,
      audioData,
    });

    try {
      const response: GenerateMusicResponse = await continueAudio(taskId, audioData, model, promptDuration);
      console.log('Received response from continueAudio:', response);

      if (response.task_id) {
        console.log('Continuation task enqueued with ID:', response.task_id);
        pollForTaskCompletion(response.task_id); // Poll for the new task ID
      } else {
        setErrorMessage('Failed to continue audio generation.');
        setLoadingContinue(false);
      }
    } catch (error) {
      console.error('Error continuing audio:', error);
      setErrorMessage('Error continuing audio.');
      setLoadingContinue(false);
    }
  };

  const handleCropAudio = async () => {
    if (!audioData || !waveSurferRef.current) return;
    setLoadingCrop(true);
    setErrorMessage('');

    const currentTime = waveSurferRef.current.getCurrentTime();
    console.log('Cropping audio with currentTime:', currentTime);
    console.log('Audio data length:', audioData.length);

    try {
      const croppedAudioBase64 = await cropAudio(audioData, 0, currentTime);
      console.log('Cropped audio base64:', croppedAudioBase64);

      const croppedAudioSrc = `data:audio/wav;base64,${croppedAudioBase64}`;
      waveSurferRef.current.load(croppedAudioSrc);
      setAudioData(croppedAudioBase64);

      const taskId = localStorage.getItem('taskId');
      if (taskId) {
        const db = await dbPromise;
        await db.put('audioData', { taskId, data: croppedAudioBase64, timestamp: Date.now() });
      }

      setLoadingCrop(false);
    } catch (error) {
      console.error('Error cropping audio:', error);
      setErrorMessage('Error cropping audio.');
      setLoadingCrop(false);
    }
  };

  const handleExportToMP3 = async () => {
    if (!audioData) return;
    setLoadingExport(true);
    setErrorMessage('');

    try {
      const mp3Base64 = await exportToMP3(audioData);
      const byteCharacters = atob(mp3Base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exported_audio.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLoadingExport(false);
    } catch (error) {
      console.error('Error exporting to MP3:', error);
      setErrorMessage('Error exporting to MP3.');
      setLoadingExport(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white', paddingBottom: '80px' }}>
      <button 
        onClick={() => setShowYouTubeDemo(false)} 
        style={{ 
          backgroundColor: 'transparent', 
          border: 'none', 
          color: 'white', 
          cursor: 'pointer',
          fontSize: '24px',
          marginBottom: '20px'
        }}
      >
        <FaArrowLeft />
      </button>
      <div style={{ marginBottom: '20px', fontSize: '18px', color: 'white' }}>
      <InfoSection />
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Enter YouTube URL"
            value={url}
            onChange={handleUrlChange}
            style={{ 
              flex: 1,
              padding: '10px', 
              fontSize: '16px', 
              backgroundColor: '#000', 
              color: '#fff',
              border: '1px solid #fff' 
            }}
          />
          <button 
            type="submit" 
            style={{ 
              padding: '10px 20px', 
              marginLeft: '10px', 
              fontSize: '16px', 
              backgroundColor: '#000', 
              color: '#fff',
              border: '1px solid #fff',
              cursor: 'pointer'
            }}
          >
            display video
          </button>
        </div>
        <button 
        onClick={handleMusicGeneration} 
        disabled={loading} 
        style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            backgroundColor: '#000', 
            color: '#fff',
            border: '1px solid #fff',
            cursor: 'pointer'
        }}
>
  {loading ? `generating... ${progress.toFixed(2)}%` : 'generate'}
</button>
      </form>
      {videoId && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }} ref={youtubePlayerRef}>
          <div id="youtube-player" style={{ width: '100%', maxWidth: '600px' }}></div>
          {audioData && (
            <div ref={waveformWrapperRef}>
              <div id="waveform" ref={waveformContainerRef} style={{ marginTop: '20px', backgroundColor: '#000', color: '#fff', width: '100%', height: '128px', maxWidth: '600px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', width: '100%', maxWidth: '600px' }}>
                <button 
                  onClick={() => waveSurferRef.current?.playPause()} 
                  style={{ padding: '10px', backgroundColor: '#000', color: '#fff', border: '1px solid #fff', cursor: 'pointer', flex: 1, margin: '0 5px' }}
                >
                  play/pause
                </button>
                <button 
                  onClick={handleCropAudio} 
                  style={{ padding: '10px', backgroundColor: '#000', color: '#fff', border: '1px solid #fff', cursor: 'pointer', flex: 1, margin: '0 5px' }}
                >
                  {loadingCrop ? 'cropping...' : 'crop'}
                </button>
                <button 
  onClick={handleContinueAudio} 
  disabled={loadingContinue} 
  style={{ padding: '10px', backgroundColor: '#000', color: '#fff', border: '1px solid #fff', cursor: 'pointer', flex: 1, margin: '0 5px' }}
>
  {loadingContinue ? `continuing... ${progress.toFixed(2)}%` : 'continue'}
</button>
                <button 
                  onClick={handleExportToMP3} 
                  style={{ padding: '10px', backgroundColor: '#000', color: '#fff', border: '1px solid #fff', cursor: 'pointer', flex: 1, margin: '0 5px' }}
                >
                  {loadingExport ? 'exporting...' : 'export to mp3'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {errorMessage && (
        <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>
      )}
      <button
        onClick={() => setIsSettingsOpen(true)}
        style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '20px',  // Move to bottom-left
          backgroundColor: '#000', 
          color: '#fff', 
          border: 'none', 
          padding: '10px', 
          borderRadius: '50%', 
          cursor: 'pointer' 
        }}
      >
        <FaCog />
      </button>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        model={model}
        setModel={setModel}
        promptLength={promptLength}
        setPromptLength={setPromptLength}
        duration={duration}
        setDuration={setDuration}
      />
      {showErrorPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#000',
          color: '#fff',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <p>looks like your phone sucks bro. instead go back to the youtube page, select the moment you want gary to continue and get the link</p>
          <img src="youtube_timestamp_share.gif" alt="How to get YouTube timestamp" style={{ width: '100%', maxWidth: '400px', margin: '20px 0' }} />
          <button
            onClick={() => setShowErrorPopup(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};

export default YouTubeDemo;
