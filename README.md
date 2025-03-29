# Safety Equipment Detection

This project implements a real-time safety equipment detection system using the YOLOv8 model to identify whether individuals in a video feed are wearing required safety gear (e.g., hardhats, masks, safety vests). The system consists of a Flask backend for video processing and a Next.js frontend for the user interface.

## Features
- **Real-Time Detection**: Detects safety equipment in live video streams using a trained YOLOv8 model.
- **Web Interface**: A Next.js-based UI to start/stop the camera and view the video feed with detection overlays.
- **Safety Violation Alerts**: Highlights missing safety gear (e.g., "NO-Hardhat") in red and present gear in green.


## Prerequisites
- **Python 3.8+**: For the Flask backend.
- **Node.js 18+**: For the Next.js frontend.
- **Webcam**: A connected and accessible camera device.
- **Git**: To clone the repository.

## Setup Instructions

### 1. Clone the Repository
git clone https://github.com/yourusername/atharvadeo101-safety-checking-usingyolo.git
cd atharvadeo101-safety-checking-usingyolo

### 2. Running the Application
#### Start the Backend
- From the backend/ directory:
- python app.py

#### Start the Frontend
From the frontend/ directory (in a separate terminal):

npm run dev

### Access the App
Open your browser and navigate to http://localhost:3000.

Click "Start Camera" to begin the video feed with safety equipment detection.

### Usage
- Start Camera: Initiates the webcam feed and starts detecting safety gear.
- Stop Camera: Stops the feed and releases the camera.

### Detection Legend:
- **Green:** Safety equipment present (e.g., Hardhat, Safety Vest).
- **Red:** Safety equipment missing (e.g., NO-Hardhat, NO-Mask).
