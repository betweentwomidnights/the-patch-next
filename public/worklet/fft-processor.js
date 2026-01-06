class FFTProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    console.log('processBuffer called with input length 4096');
    
    // Use regular Float32Array - the AudioWorklet handles the sharing
    this.buffer = new Float32Array(512);  // Reduced buffer size
    this.window = new Float32Array(512);
    this.bufferIndex = 0;
    this.lastFrameTime = 0;
    this.FRAME_INTERVAL = 256 / sampleRate;  // Adjusted for new size
    this.frameCount = 0;
    this.lastPerformanceLog = 0;

    // Pre-compute Hamming window
    for (let i = 0; i < this.buffer.length; i++) {
      this.window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (this.buffer.length - 1));
    }

    console.log('FFT Processor initialized:', {
      bufferSize: this.buffer.length,
      sampleRate: sampleRate,
      frameInterval: this.FRAME_INTERVAL
    });
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      console.log('No input received in process');
      return true;
    }

    const currentTime = currentFrame / sampleRate;
    const samples = input[0];

    // Log input data periodically
    if (this.frameCount % 100 === 0) {
      console.log('Input data check:', {
        inputChannels: inputs.length,
        samplesLength: samples.length,
        firstFewSamples: Array.from(samples.slice(0, 5)),
        hasNonZero: samples.some(s => s !== 0)
      });
    }

    this.frameCount++;

    // Fill our buffer
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.bufferIndex] = samples[i];
      this.bufferIndex++;

      if (this.bufferIndex === this.buffer.length) {
        if (currentTime - this.lastFrameTime >= this.FRAME_INTERVAL) {
          // Debug buffer contents before FFT
          const bufferStats = {
            min: Math.min(...Array.from(this.buffer)),
            max: Math.max(...Array.from(this.buffer)),
            hasNonZero: this.buffer.some(v => v !== 0)
          };
          console.log('Buffer stats before FFT:', bufferStats);

          // Prepare FFT buffer
          const fftBuffer = new Float32Array(this.buffer.length * 2);
          
          // Apply window and prepare for FFT
          let maxVal = 0;
          for (let j = 0; j < this.buffer.length; j++) {
            const windowedSample = this.buffer[j] * this.window[j];
            fftBuffer[j] = windowedSample;  // Real part
            fftBuffer[j + this.buffer.length] = 0;  // Imaginary part
            maxVal = Math.max(maxVal, Math.abs(windowedSample));
          }

          // Debug FFT buffer
          console.log('FFT buffer check:', {
            realMin: Math.min(...Array.from(fftBuffer.slice(0, this.buffer.length))),
            realMax: Math.max(...Array.from(fftBuffer.slice(0, this.buffer.length))),
            imagMin: Math.min(...Array.from(fftBuffer.slice(this.buffer.length))),
            imagMax: Math.max(...Array.from(fftBuffer.slice(this.buffer.length)))
          });

          this.port.postMessage({
            type: 'frame',
            buffer: fftBuffer,
            timeStamp: currentTime,
            deltaTime: currentTime - this.lastFrameTime,
            maxValue: maxVal,
            bufferSize: this.buffer.length,
            interval: this.FRAME_INTERVAL
          });

          this.lastFrameTime = currentTime;
        }

        // Implement 87.5% overlap for better transient detection
        this.buffer.copyWithin(0, 64);  // Move last 7/8 of buffer to start
        this.bufferIndex = 448;  // 512 - 64
      }
    }

    return true;
  }
}

registerProcessor("fft-processor", FFTProcessor);
