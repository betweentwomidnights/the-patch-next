class FFTProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(512);  // Reduced buffer size
    this.window = new Float32Array(512);
    this.bufferIndex = 0;
    this.lastFrameTime = 0;
    this.FRAME_INTERVAL = 256 / sampleRate;  // Adjusted for new size
    this.frameCount = 0;

    // Pre-compute Hamming window
    for (let i = 0; i < this.buffer.length; i++) {
      this.window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (this.buffer.length - 1));
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const currentTime = currentFrame / sampleRate;
    const samples = input[0];
    
    // Debug input occasionally
    // if (this.frameCount % 100 === 0) {
    //   console.log('AudioWorklet input:', {
    //     maxSample: Math.max(...samples.map(Math.abs)),
    //     sampleCount: samples.length,
    //     currentTime
    //   });
    // }
    
    // Fill our buffer
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.bufferIndex] = samples[i];
      this.bufferIndex++;

      if (this.bufferIndex === this.buffer.length) {
        if (currentTime - this.lastFrameTime >= this.FRAME_INTERVAL) {
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

          // Debug every 100 frames
          // if (this.frameCount % 100 === 0) {
          //   console.log('FFT Buffer:', {
          //     maxValue: maxVal,
          //     bufferSize: this.buffer.length,
          //     interval: this.FRAME_INTERVAL
          //   });
          // }

          this.port.postMessage({
            type: 'frame',
            buffer: fftBuffer,
            timeStamp: currentTime,
            deltaTime: currentTime - this.lastFrameTime
          });
          this.lastFrameTime = currentTime;
        }
        
        // Implement 87.5% overlap for better transient detection
        this.buffer.copyWithin(0, 64);  // Move last 7/8 of buffer to start
        this.bufferIndex = 448;  // 512 - 64
      }
    }

    this.frameCount++;
    return true;
  }
}

registerProcessor("fft-processor", FFTProcessor);