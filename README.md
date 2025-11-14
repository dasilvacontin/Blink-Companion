# Blink Detection Companion 👁️

A real-time blink detection web application using **MediaPipe Face Mesh** for maximum accuracy. This app detects when you're blinking and when your eyes are open by analyzing facial landmarks and calculating the Eye Aspect Ratio (EAR).

## Features

- ✅ Real-time blink detection from webcam feed
- ✅ High accuracy using MediaPipe Face Mesh (468 facial landmarks)
- ✅ Eye Aspect Ratio (EAR) calculation for both eyes
- ✅ Blink counter
- ✅ Visual feedback with status indicators
- ✅ Modern, responsive UI

## How It Works

The app uses **MediaPipe Face Mesh** to detect 468 facial landmarks on your face, including detailed eye landmarks. It then calculates the **Eye Aspect Ratio (EAR)** for both eyes:

```
EAR = (vertical1 + vertical2) / (2 × horizontal)
```

When the EAR drops below a threshold (0.25), it indicates a blink. The algorithm uses consecutive frame analysis to avoid false positives.

## Setup

The app uses MediaPipe via CDN, so no build step is required! Just serve the files:

1. **Start a local server** (required for camera access):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have it)
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

2. **Open in browser:**
   - Navigate to `http://localhost:8000` (or your server's port)
   - Click "Start Camera" and allow camera permissions
   - Position your face in front of the camera

**Note**: You must use a local server (not just open the HTML file) because:
- Modern browsers require HTTPS or localhost for camera access
- MediaPipe needs to load resources from CDN

## Technical Details

### Eye Aspect Ratio (EAR)

The EAR is calculated using key eye landmarks:
- **Left Eye**: Landmarks 33, 133 (horizontal), 159, 145 (vertical)
- **Right Eye**: Landmarks 362, 263 (horizontal), 386, 374 (vertical)

### Blink Detection Algorithm

1. Calculate EAR for both eyes
2. Average the EAR values
3. If EAR < threshold (0.25) for 2+ consecutive frames → blink detected
4. Reset counter when EAR returns above threshold

### Configuration

You can adjust these parameters in `app.js`:
- `EAR_THRESHOLD`: 0.25 (lower = more sensitive)
- `EAR_CONSECUTIVE_FRAMES`: 2 (minimum frames for blink)
- `EAR_CONSECUTIVE_FRAMES_MAX`: 6 (max frames to prevent false positives)

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may require additional permissions)

**Note**: Requires HTTPS or localhost for camera access in most browsers.

## Why MediaPipe Face Mesh?

MediaPipe Face Mesh provides:
- **468 facial landmarks** (vs 68 in other solutions)
- **High accuracy** for eye detection
- **Real-time performance** in the browser
- **Well-maintained** by Google
- **No server required** - runs entirely client-side

## License

MIT

