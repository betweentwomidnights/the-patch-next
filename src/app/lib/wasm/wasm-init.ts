import init, { FFTProcessor } from './fft_wasm';

export async function initializeWasm(fftSize: number = 2048): Promise<FFTProcessor | null> {
    try {
        console.log('Initializing WASM module with FFT size:', fftSize);
        await init();
        
        // Create the FFT processor
        const processor = new FFTProcessor(fftSize);
        
        // Verify the size
        const actualSize = processor.getSize();
        console.log('FFT Processor created with size:', actualSize);
        
        if (actualSize !== fftSize) {
            console.error('Size mismatch:', { expected: fftSize, actual: actualSize });
            return null;
        }
        
        return processor;
    } catch (error) {
        console.error('Failed to initialize WASM module:', error);
        return null;
    }
}