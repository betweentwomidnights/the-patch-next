use wasm_bindgen::prelude::*;
use num_complex::Complex;

#[wasm_bindgen]
pub struct FFTProcessor {
    size: usize,
    twiddle_factors: Vec<Complex<f32>>,
}

#[wasm_bindgen]
impl FFTProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        let mut twiddle_factors = Vec::with_capacity(size);
        for k in 0..size {
            let angle = -2.0 * std::f32::consts::PI * (k as f32) / (size as f32);
            twiddle_factors.push(Complex::new(angle.cos(), angle.sin()));
        }
        FFTProcessor {
            size,
            twiddle_factors,
        }
    }

    pub fn process(&mut self, buffer: &mut [f32]) {
        let n = buffer.len();
        assert!(n.is_power_of_two());
        assert!(n <= self.size * 2); // Buffer contains real and imaginary parts

        // Bit-reverse permutation
        let mut j = 0;
        for i in 1..n/2 {
            let mut bit = n/4;
            while j >= bit {
                j -= bit;
                bit /= 2;
            }
            j += bit;
            if i < j {
                buffer.swap(i*2, j*2);
                buffer.swap(i*2+1, j*2+1);
            }
        }

        // FFT computation
        let mut step = 2;
        while step <= n {
            let half_step = step / 2;
            let step_angle = self.size / step;

            for i in (0..n).step_by(step) {
                for j in 0..half_step/2 {
                    let twiddle = self.twiddle_factors[j * step_angle];
                    let idx1 = i + j*2;
                    let idx2 = idx1 + half_step;

                    let temp_real = buffer[idx2] * twiddle.re - buffer[idx2+1] * twiddle.im;
                    let temp_imag = buffer[idx2] * twiddle.im + buffer[idx2+1] * twiddle.re;

                    buffer[idx2] = buffer[idx1] - temp_real;
                    buffer[idx2+1] = buffer[idx1+1] - temp_imag;
                    buffer[idx1] += temp_real;
                    buffer[idx1+1] += temp_imag;
                }
            }
            step *= 2;
        }
    }

    pub fn apply_window(&mut self, buffer: &mut [f32]) {
        let n = buffer.len() / 2;
        for i in 0..n {
            let multiplier = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / n as f32).cos());
            buffer[i*2] *= multiplier;
            buffer[i*2+1] *= multiplier;
        }
    }
}
