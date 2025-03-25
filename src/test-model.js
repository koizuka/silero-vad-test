// Test script to diagnose Silero VAD ONNX model
import * as ort from 'onnxruntime-node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testModel() {
  try {
    const modelPath = path.join(__dirname, '../models/silero_vad.onnx');
    
    // Check if model exists
    if (!fs.existsSync(modelPath)) {
      console.error('Model file not found:', modelPath);
      console.log('Please download the model file from https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx');
      return false;
    }
    
    console.log('Loading model...');
    const session = await ort.InferenceSession.create(modelPath);
    
    console.log('Model loaded successfully');
    console.log('Input names:', session.inputNames);
    
    // Create test input data
    const inputLength = 1536; // 96ms at 16kHz
    const audioData = new Float32Array(inputLength).fill(0);
    
    // Add a simple sine wave to audio data
    for (let i = 0; i < inputLength; i++) {
      audioData[i] = Math.sin(i * 0.01);
    }
    
    // Create state tensor - try with different shapes to find the right one
    const stateData = new Float32Array(2 * 2 * 128).fill(0);
    
    // Create sample rate tensor
    const srData = new BigInt64Array(1);
    srData[0] = BigInt(16000);
    
    // Create tensors
    const inputTensor = new ort.Tensor('float32', audioData, [1, inputLength]);
    const stateTensor = new ort.Tensor('float32', stateData, [2, 2, 128]);
    const srTensor = new ort.Tensor('int64', srData, [1]);
    
    // Log tensor information
    console.log('Input tensor:', {
      name: 'input',
      type: inputTensor.type,
      shape: inputTensor.dims,
      dataLength: inputTensor.data.length
    });
    
    console.log('State tensor:', {
      name: 'state',
      type: stateTensor.type,
      shape: stateTensor.dims,
      dataLength: stateTensor.data.length
    });
    
    console.log('SR tensor:', {
      name: 'sr',
      type: srTensor.type,
      shape: srTensor.dims,
      data: srTensor.data[0]
    });
    
    // Create feeds
    const feeds = {
      'input': inputTensor,
      'state': stateTensor,
      'sr': srTensor
    };
    
    console.log('Running inference...');
    const results = await session.run(feeds);
    
    console.log('Inference successful!');
    console.log('Output names:', Object.keys(results));
    
    // Log all outputs
    for (const name in results) {
      const tensor = results[name];
      console.log(`Output '${name}':`, {
        type: tensor.type,
        shape: tensor.dims,
        dataPreview: Array.from(tensor.data).slice(0, 5) // First 5 values
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error testing model:', error);
    return false;
  }
}

// Run the test
testModel().then(success => {
  if (success) {
    console.log('Model test completed successfully');
  } else {
    console.error('Model test failed');
  }
});