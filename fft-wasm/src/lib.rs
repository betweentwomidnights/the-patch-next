use wasm_bindgen::prelude::*;
use num_complex::Complex;
use js_sys::Float32Array;
use web_sys::console;

#[wasm_bindgen]
pub struct FFTProcessor {
    size: usize,
    twiddle_factors: Vec<Complex<f32>>,
}

#[wasm_bindgen]
impl FFTProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Result<FFTProcessor, JsValue> {
        console::log_1(&format!("FFTProcessor::new called with size {}", size).into());
        
        // Validate size is a power of two
        if !size.is_power_of_two() {
            let error_msg = format!("FFT size must be a power of two. Got: {}", size);
            console::log_1(&error_msg.clone().into());
            return Err(JsValue::from_str(&error_msg));
        }
        
        // Validate size is reasonable
        if size > 1_000_000 {
            let error_msg = format!("FFT size too large: {}", size);
            console::log_1(&error_msg.clone().into());
            return Err(JsValue::from_str(&error_msg));
        }
        
        console::log_1(&"Creating twiddle factors".into());
        let mut twiddle_factors = Vec::with_capacity(size);
        for k in 0..size {
            let angle = -2.0 * std::f32::consts::PI * (k as f32) / (size as f32);
            twiddle_factors.push(Complex::new(angle.cos(), angle.sin()));
        }
        
        console::log_1(&format!("FFTProcessor created with size {}", size).into());
        
        Ok(FFTProcessor {
            size,
            twiddle_factors,
        })
    }

    #[wasm_bindgen(js_name = processBuffer)]
    pub fn process_buffer(&self, input: Float32Array) -> Result<Float32Array, JsValue> {
        let input_length = input.length() as usize;
        console::log_1(&format!("processBuffer called with input length {}", input_length).into());
        console::log_1(&format!("FFT size is {}", self.size).into());

        // Validate input length
        if input_length != self.size * 2 {
            let error_msg = format!(
                "Input buffer length must be twice the FFT size. Expected {}, got {}", 
                self.size * 2, 
                input_length
            );
            console::log_1(&error_msg.clone().into());
            return Err(JsValue::from_str(&error_msg));
        }

        // Create working buffer
        let mut buffer = vec![0.0; input_length];
        
        // Copy input data
        console::log_1(&"Copying input data".into());
        for i in 0..input_length {
            buffer[i] = input.get_index(i as u32);
        }

        // Apply window function
        console::log_1(&"Applying window function".into());
        for i in 0..self.size {
            let window_coeff = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / self.size as f32).cos());
            buffer[i * 2] *= window_coeff;
            buffer[i * 2 + 1] *= window_coeff;
        }

        // Perform FFT
        self.apply_fft(&mut buffer)?;

        // Return result
        console::log_1(&"Returning result".into());
        Ok(Float32Array::from(&buffer[..]))
    }

    fn apply_fft(&self, buffer: &mut [f32]) -> Result<(), JsValue> {
        console::log_1(&"Starting FFT computation".into());
        
        // Bit-reverse permutation
        let mut j = 0;
        for i in 1..self.size {
            let mut bit = self.size >> 1;
            while j >= bit {
                j -= bit;
                bit >>= 1;
            }
            j += bit;

            if i < j {
                let i2 = i * 2;
                let j2 = j * 2;
                buffer.swap(i2, j2);
                buffer.swap(i2 + 1, j2 + 1);
            }
        }

        // FFT computation
        let mut step = 2;
        while step <= self.size * 2 {
            let half_step = step / 2;
            let step_angle = self.size / step;

            for i in (0..self.size * 2).step_by(step) {
                for j in 0..half_step/2 {
                    let twiddle = &self.twiddle_factors[j * step_angle];
                    let idx1 = i + j * 2;
                    let idx2 = idx1 + half_step;

                    let temp_real = buffer[idx2] * twiddle.re - buffer[idx2 + 1] * twiddle.im;
                    let temp_imag = buffer[idx2] * twiddle.im + buffer[idx2 + 1] * twiddle.re;

                    let (old_real1, old_imag1) = (buffer[idx1], buffer[idx1 + 1]);
                    buffer[idx2] = old_real1 - temp_real;
                    buffer[idx2 + 1] = old_imag1 - temp_imag;
                    buffer[idx1] = old_real1 + temp_real;
                    buffer[idx1 + 1] = old_imag1 + temp_imag;
                }
            }
            step *= 2;
        }

        Ok(())
    }

    #[wasm_bindgen(js_name = getSize)]
    pub fn get_size(&self) -> usize {
        self.size
    }
}