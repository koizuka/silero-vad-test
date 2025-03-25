// Simple HTTP server to provide VAD functionality to web clients
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SileroVAD from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// Simplified VAD for demonstration
// Instead of using the complex ONNX model, we'll use a simple energy-based VAD
class SimpleVAD {
  constructor() {
    this.threshold = 0.0005; // Much lower energy threshold for better sensitivity
    this.initialized = true;
  }
  
  // Simple function to detect voice activity based on signal energy
  async detectVoice(audioData) {
    if (!audioData || audioData.length === 0) return false;
    
    // Calculate audio energy (RMS) with a more sophisticated approach
    // 1. Apply a high-pass filter to reduce background noise
    // 2. Calculate RMS energy
    // 3. Apply smoothing
    
    let sum = 0;
    let prevSample = 0;
    const highPassAlpha = 0.85; // High-pass filter coefficient
    
    // Process samples with high-pass filter and calculate energy
    for (let i = 0; i < audioData.length; i++) {
      // Simple high-pass filter: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
      const filteredSample = highPassAlpha * (prevSample + audioData[i] - prevSample);
      prevSample = audioData[i];
      
      // Square the filtered sample (for RMS)
      sum += filteredSample * filteredSample;
    }
    
    // Calculate RMS energy
    const energy = sum / audioData.length;
    
    // Log energy level for debugging (commented out to reduce terminal output)
    // console.log(`Audio energy: ${energy.toFixed(6)}, threshold: ${this.threshold}`);
    
    // Compare with threshold
    return energy > this.threshold;
  }
  
  // Update threshold
  setThreshold(value) {
    this.threshold = value;
  }
}

// Initialize simple VAD
const vad = new SimpleVAD();
const vadInitialized = true;

console.log('Simple energy-based VAD initialized successfully!');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Handle API requests
  if (pathname === '/api/set-threshold' && req.method === 'POST') {
    try {
      // Read POST data
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      });

      req.on('end', async () => {
        try {
          body = Buffer.concat(body).toString();
          const data = JSON.parse(body);
          
          if (typeof data.threshold === 'number') {
            vad.setThreshold(data.threshold);
            console.log(`Threshold updated to: ${data.threshold}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid threshold value' }));
          }
        } catch (error) {
          console.error('Error updating threshold:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request data' }));
        }
      });
    } catch (error) {
      console.error('Error handling threshold update:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }
  else if (pathname === '/api/vad' && req.method === 'POST') {
    if (!vadInitialized) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'VAD not initialized yet' }));
      return;
    }

    try {
      // Read POST data
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      });

      req.on('end', async () => {
        try {
          body = Buffer.concat(body);
          
          // Convert buffer to Float32Array - simpler method that works with blobs
          // First create a buffer with the same data
          const buffer = new ArrayBuffer(body.length);
          const view = new Uint8Array(buffer);
          for (let i = 0; i < body.length; i++) {
            view[i] = body[i];
          }
          
          // Then interpret it as Float32Array data
          const audioData = new Float32Array(buffer);
          
          // Process with simple energy-based VAD
          const result = await vad.detectVoice(audioData);
          
          // Return result
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ isSpeech: result }));
        } catch (error) {
          console.error('Error processing audio data:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid audio data' }));
        }
      });
    } catch (error) {
      console.error('Error handling VAD request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Serve static files
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, '../web/index.html');
  } else {
    filePath = path.join(__dirname, '../web', pathname);
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }

    // Determine content type
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpeg';
        break;
    }

    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404);
          res.end('404 Not Found');
        } else {
          res.writeHead(500);
          res.end('500 Server Error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open your browser to http://localhost:${PORT}/ to access the demo`);
});