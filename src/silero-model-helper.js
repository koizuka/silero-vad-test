// Helper functions for Silero VAD model
import * as ort from 'onnxruntime-node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// From examining the Silero VAD model and error messages, we need to:
// 1. Create a simple wrapper for the model
// 2. Handle all tensor shape requirements

class SileroModelHelper {
  constructor(modelPath) {
    this.modelPath = modelPath || path.join(__dirname, '../models/silero_vad.onnx');
    this.session = null;
    this.sampleRate = 16000;
    this.initialized = false;
  }
  
  async initialize() {
    try {
      if (!fs.existsSync(this.modelPath)) {
        console.error('Model file not found:', this.modelPath);
        return false;
      }
      
      console.log('Loading Silero VAD model...');
      const options = {
        executionProviders: ['cpu'],
        logSeverityLevel: 0 // Reduce ONNX Runtime logging
      };
      
      this.session = await ort.InferenceSession.create(this.modelPath, options);
      this.initialized = true;
      console.log('Silero VAD model loaded successfully');
      console.log('Model input names:', this.session.inputNames);
      console.log('Model output names:', this.session.outputNames);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Silero VAD model:', error);
      return false;
    }
  }
  
  // Create standard tensors with correct shapes based on model requirements
  createTensors(audioData) {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }
    
    // Input audio data - shape [1, length]
    const input = new ort.Tensor('float32', audioData, [1, audioData.length]);
    
    // State tensor - shape [2, 2, 128] (based on error messages)
    const state = new ort.Tensor(
      'float32', 
      new Float32Array(2 * 2 * 128).fill(0), 
      [2, 2, 128]
    );
    
    // Sample rate - int64 scalar
    const srData = new BigInt64Array(1);
    srData[0] = BigInt(this.sampleRate);
    const sr = new ort.Tensor('int64', srData, [1]);
    
    return { input, state, sr };
  }
  
  // Run inference with the correct input structure
  async predict(audioData) {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }
    
    if (!(audioData instanceof Float32Array)) {
      audioData = new Float32Array(audioData);
    }
    
    // Create input tensors
    const tensors = this.createTensors(audioData);
    
    // Build feeds object
    const feeds = {
      'input': tensors.input,
      'state': tensors.state,
      'sr': tensors.sr
    };
    
    try {
      // Run inference
      const results = await this.session.run(feeds);
      
      // Parse results to get speech probability
      let probability = 0;
      
      // Try to find the output with the probability
      if (results.output) {
        probability = results.output.data[0];
      } else {
        // Look for alternative output names
        for (const name of this.session.outputNames) {
          if (name !== 'state_out') {
            probability = results[name].data[0];
            break;
          }
        }
      }
      
      return {
        probability: probability,
        isSpeech: probability > 0.5,
        results: results
      };
    } catch (error) {
      console.error('Error running inference:', error);
      throw error;
    }
  }
}

export default SileroModelHelper;