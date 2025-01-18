class FFTProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.buffer = [];
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input && input[0]) {
        // input[0] is an array of samples for the first channel
        // Post these samples to the main thread
        // Each rendering quantum is 128 samples, so just send them as is
        this.port.postMessage(input[0]);
      }
      // Returning true keeps the processor alive
      return true;
    }
  }
  
  registerProcessor('fft-processor', FFTProcessor);
  