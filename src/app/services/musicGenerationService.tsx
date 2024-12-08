export interface GenerateMusicResponse {
    task_id: string;
    audio?: string;  // Ensure that audio is part of the response
    // Add other properties from the response if needed
}

export interface TaskStatusResponse {
    status: string;
    audio?: string;
    // Add other properties from the response if needed
}

export async function generateMusic(url: string, currentTime: number, model: string, promptLength: string, duration: string): Promise<GenerateMusicResponse> {
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, currentTime, model, promptLength, duration }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as GenerateMusicResponse;
    } catch (error) {
        console.error('Error generating music:', error);
        throw error;
    }
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
        const response = await fetch(`https://gary.thecollabagepatch.com/tasks/${taskId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data as TaskStatusResponse;
    } catch (error) {
        console.error('Error fetching task status:', error);
        throw error;
    }
}

export async function continueAudio(taskId: string, audioBase64: string, model: string, promptDuration: string): Promise<GenerateMusicResponse> {
    try {
        console.log('Sending continue request with:', {
            task_id: taskId,
            model: model,
            audio: audioBase64,
            prompt_duration: promptDuration,
        });
        const response = await fetch('/api/continue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_id: taskId,
                model: model,
                audio: audioBase64,
                prompt_duration: promptDuration,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received response from continueAudio:', data);
        return data as GenerateMusicResponse;
    } catch (error) {
        console.error('Error continuing music:', error);
        throw error;
    }
}

export async function cropAudio(audioData: string, start: number, end: number): Promise<string> {
    try {
        const response = await fetch('/api/crop-audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioData, start, end }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const croppedAudioBase64 = await response.text();
        return croppedAudioBase64;
    } catch (error) {
        console.error('Error cropping audio:', error);
        throw error;
    }
}

export async function exportToMP3(audioData: string): Promise<string> {
    try {
        const response = await fetch('/api/export-to-mp3', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioData }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const mp3Base64 = await response.text();
        return mp3Base64;
    } catch (error) {
        console.error('Error exporting to MP3:', error);
        throw error;
    }
}
