# Simple VAD (Voice Activity Detection) for Node.js

This project implements a simple Voice Activity Detection system using Node.js, with a web interface for testing. It's designed to be lightweight and easy to integrate into Electron applications.

## Features

- Simple energy-based voice activity detection
- Web interface with real-time microphone input and visualization
- Modern AudioWorklet API implementation with ScriptProcessor fallback
- Adjustable sensitivity settings
- Cross-platform support (Windows, macOS)

## Installation

1. Clone this repository:
```
git clone https://github.com/koizuka/silero-vad-test.git
cd silero-vad-test
```

2. Create the models directory (if it doesn't exist):
```
mkdir -p models
```

3. Download the VAD model:
   - Visit the [Silero VAD repository](https://github.com/snakers4/silero-vad)
   - Download the ONNX model file and place it in the `models` directory

## Usage

### Web Browser Demo

1. Start the server:
```
npm start
```

2. Open your browser to http://localhost:3000/

The web interface provides a simple way to test the VAD with your microphone input. The sensitivity slider can be adjusted to find the optimal threshold for your microphone and environment.

### Electron Integration

The project is designed to be easily integrated into Electron applications:

1. Use the `src/index.js` module for the core VAD functionality
2. Use `src/microphone.js` for native microphone access in Electron
3. See `src/electron-demo.js` for an example integration

## How It Works

This implementation uses a simple energy-based approach to detect voice activity:

1. Audio is captured using Web Audio API in the browser
2. A high-pass filter is applied to reduce background noise
3. The energy (RMS) of the audio signal is calculated
4. If the energy exceeds the threshold, voice activity is detected

The sensitivity threshold can be adjusted to match different environments and microphones.

## Browser and Electron Compatibility

This project uses modern Web APIs that require recent browser versions:

| Feature | Chrome/Chromium | Electron |
|---------|----------------|----------|
| AudioWorklet API | Chrome 64+ | Electron 3.0.0+ |
| Web Audio API | Chrome 10+ | All Electron versions |
| MediaDevices.getUserMedia | Chrome 53+ | Electron 1.4.0+ |
| Blob with arrayBuffer | Chrome 39+ | Electron 0.20.0+ |
| Fetch API | Chrome 42+ | Electron 0.24.0+ |

For full compatibility with all features including AudioWorklet, we recommend:
- Chrome/Chromium 64 or later
- Electron 3.0.0 or later (based on Chromium 66)

If using older versions, the application will automatically fall back to using ScriptProcessorNode, which is deprecated but has wider compatibility (Chrome 10+).

## License

This project is licensed under the MIT License - see the LICENSE file for details.