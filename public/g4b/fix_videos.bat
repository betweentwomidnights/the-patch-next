@echo off
setlocal enabledelayedexpansion

for /l %%i in (1,1,9) do (
    echo Processing demo%%i.mp4...
    
    rem Extract waveform
    ffmpeg -i demo%%i.mp4 -vframes 1 waveform%%i.png
    
    rem Create fixed video with waveform
    ffmpeg -loop 1 -i waveform%%i.png -i demo%%i.mp4 -c:v libx264 -preset medium -tune stillimage -crf 23 -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart -t 90 demo%%i_fixed.mp4
    
    rem Clean up waveform png
    del waveform%%i.png
)

echo All videos processed!
pause