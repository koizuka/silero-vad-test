// Electron demo for Silero VAD
// This would be used in an Electron app for direct microphone access
import SileroVAD from './index.js';
import Microphone from './microphone.js';

class VoiceActivityDetector {
  constructor() {
    this.vad = new SileroVAD();
    this.mic = null;
    this.isRunning = false;
    this.audioChunks = [];
    this.threshold = 0.5;
    this.speakingTime = 0;
    this.silenceTime = 0;
    this.onVoiceActivityChange = null;
  }
  
  async initialize() {
    try {
      const initialized = await this.vad.initialize();
      if (!initialized) {
        console.error('Failed to initialize Silero VAD');
        return false;
      }
      
      console.log('Silero VAD initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Silero VAD:', error);
      return false;
    }
  }
  
  setThreshold(threshold) {
    this.threshold = threshold;
    if (this.vad) {
      this.vad.setThreshold(threshold);
    }
  }
  
  setCallback(callback) {
    this.onVoiceActivityChange = callback;
  }
  
  async start() {
    if (this.isRunning) {
      console.warn('VAD is already running');
      return false;
    }
    
    try {
      this.mic = new Microphone({ 
        sampleRate: 16000, 
        debug: true
      });
      
      // Setup microphone data handler
      this.mic.on('data', async (audioData) => {
        try {
          this.audioChunks.push(audioData);
          
          // Process when we have enough data
          if (this.audioChunks.length >= 2) { // ~200ms of audio
            // Concatenate chunks
            const fullBuffer = this._concatenateBuffers(this.audioChunks);
            this.audioChunks = [];
            
            // Process with VAD
            const isSpeech = await this.vad.isSpeech(fullBuffer);
            
            // Update speaking/silence times
            if (isSpeech) {
              this.speakingTime += 200; // 200ms
              this.silenceTime = 0;
            } else {
              this.silenceTime += 200; // 200ms
              if (this.silenceTime > 1000) { // 1 second
                this.speakingTime = 0;
              }
            }
            
            // Call callback if provided
            if (this.onVoiceActivityChange) {
              this.onVoiceActivityChange(isSpeech, {
                speakingTime: this.speakingTime,
                silenceTime: this.silenceTime
              });
            }
          }
        } catch (error) {
          console.error('Error processing audio data:', error);
        }
      });
      
      // Start the microphone
      await this.mic.start();
      this.isRunning = true;
      return true;
    } catch (error) {
      console.error('Error starting VAD:', error);
      return false;
    }
  }
  
  stop() {
    if (!this.isRunning) {
      console.warn('VAD is not running');
      return false;
    }
    
    if (this.mic) {
      this.mic.stop();
      this.mic = null;
    }
    
    this.isRunning = false;
    this.audioChunks = [];
    this.speakingTime = 0;
    this.silenceTime = 0;
    
    return true;
  }
  
  _concatenateBuffers(buffers) {
    let totalLength = 0;
    buffers.forEach(buffer => {
      totalLength += buffer.length;
    });
    
    const result = new Float32Array(totalLength);
    let offset = 0;
    
    buffers.forEach(buffer => {
      result.set(buffer, offset);
      offset += buffer.length;
    });
    
    return result;
  }
}

// Example usage in Electron main process
async function main() {
  console.log('Initializing Silero VAD for Electron...');
  
  const detector = new VoiceActivityDetector();
  
  // Set callback for voice activity events
  detector.setCallback((isSpeaking, stats) => {
    console.log(`Voice activity: ${isSpeaking ? 'Speaking' : 'Silent'} - Speaking time: ${stats.speakingTime}ms, Silence time: ${stats.silenceTime}ms`);
    
    // This would trigger UI updates in Electron renderer process
    // In a real Electron app, you would use IPC to communicate
    // between main and renderer processes
  });
  
  // Initialize and start VAD
  const initialized = await detector.initialize();
  if (initialized) {
    console.log('Starting voice activity detection...');
    await detector.start();
    
    // In a real app, we would stop on application exit
    // For this demo, we'll run for 10 seconds
    setTimeout(() => {
      console.log('Stopping voice activity detection...');
      detector.stop();
      process.exit(0);
    }, 10000);
  } else {
    console.error('Failed to initialize, exiting...');
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (process.argv[1].endsWith('electron-demo.js')) {
  main().catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
  });
}

export default VoiceActivityDetector;