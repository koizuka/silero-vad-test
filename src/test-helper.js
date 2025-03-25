// Test script for the Silero model helper
import SileroModelHelper from './silero-model-helper.js';

async function testHelper() {
  try {
    // Create model helper
    const modelHelper = new SileroModelHelper();
    
    // Initialize model
    const initialized = await modelHelper.initialize();
    if (!initialized) {
      console.error('Failed to initialize model helper');
      return false;
    }
    
    // Create test data - sine wave
    const testAudio = new Float32Array(1536); // 96ms at 16kHz
    for (let i = 0; i < testAudio.length; i++) {
      testAudio[i] = Math.sin(i * 0.1) * 0.5; // Sine wave with amplitude 0.5
    }
    
    // Run prediction
    console.log('Running prediction on test audio...');
    const result = await modelHelper.predict(testAudio);
    
    // Log results
    console.log('Prediction successful!');
    console.log('Speech probability:', result.probability);
    console.log('Is speech:', result.isSpeech);
    
    // List output tensor names and shapes
    console.log('Output tensors:');
    for (const name in result.results) {
      const tensor = result.results[name];
      console.log(`- ${name}: shape=${tensor.dims}, type=${tensor.type}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error testing helper:', error);
    return false;
  }
}

// Run the test
testHelper().then(success => {
  if (success) {
    console.log('Helper test completed successfully');
  } else {
    console.error('Helper test failed');
  }
});