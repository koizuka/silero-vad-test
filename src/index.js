// Silero VAD implementation using ONNX Runtime
import * as ort from 'onnxruntime-node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SileroModelHelper from './silero-model-helper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SileroVAD {
  constructor() {
    this.modelPath = path.join(__dirname, '../models/silero_vad.onnx');
    this.sampleRate = 16000;
    this.windowSize = 1536;
    this.threshold = 0.5;
    this.initialized = false;
    this.modelHelper = null;
  }

  async initialize() {
    if (!fs.existsSync(this.modelPath)) {
      console.error('Model file not found:', this.modelPath);
      console.log('Please download the model file from https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx');
      console.log('and place it in the models directory.');
      return false;
    }

    try {
      // Create and initialize model helper
      this.modelHelper = new SileroModelHelper(this.modelPath);
      this.initialized = await this.modelHelper.initialize();
      return this.initialized;
    } catch (error) {
      console.error('Failed to initialize SileroVAD:', error);
      return false;
    }
  }

  async isSpeech(audioData) {
    if (!this.initialized || !this.modelHelper) {
      console.error('SileroVAD not initialized');
      return false;
    }

    // Convert audio data to Float32Array if needed
    const audioFloat32 = audioData instanceof Float32Array ? 
      audioData : this._convertToFloat32(audioData);
    
    // Ensure the audio data has the correct length for the model
    const processedAudio = this._preprocessAudio(audioFloat32);
    
    try {
      // Run inference using the model helper
      const result = await this.modelHelper.predict(processedAudio);
      
      // Return result based on threshold
      return result.probability > this.threshold;
    } catch (error) {
      console.error('Error during VAD inference:', error);
      return false;
    }
  }

  _convertToFloat32(audioData) {
    // Convert various audio formats to Float32Array
    if (audioData instanceof Int16Array) {
      const float32Data = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        float32Data[i] = audioData[i] / 32768.0;
      }
      return float32Data;
    } else if (audioData instanceof Uint8Array) {
      const float32Data = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        float32Data[i] = (audioData[i] - 128) / 128.0;
      }
      return float32Data;
    } else {
      console.warn('Unknown audio format, attempting to use as is');
      return new Float32Array(audioData);
    }
  }

  _preprocessAudio(audioData) {
    // Ensure audio data has the correct length for the model
    if (audioData.length < this.windowSize) {
      const paddedAudio = new Float32Array(this.windowSize);
      paddedAudio.set(audioData);
      return paddedAudio;
    } else if (audioData.length > this.windowSize) {
      return audioData.slice(0, this.windowSize);
    }
    return audioData;
  }

  setThreshold(threshold) {
    this.threshold = threshold;
  }
}

// Simple test function
async function test() {
  const vad = new SileroVAD();
  const initialized = await vad.initialize();
  
  if (initialized) {
    console.log('SileroVAD initialized successfully');
    
    // Generate a simple test signal (sine wave)
    const testAudio = new Float32Array(1536);
    for (let i = 0; i < testAudio.length; i++) {
      testAudio[i] = Math.sin(i * 0.1);
    }
    
    console.log('Running VAD on test audio...');
    const result = await vad.isSpeech(testAudio);
    console.log('VAD result:', result);
  } else {
    console.error('Failed to initialize SileroVAD');
  }
}

// Run test if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  test();
}

export default SileroVAD;