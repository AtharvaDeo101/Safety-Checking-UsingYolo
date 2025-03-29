# Safety Equipment Detection

This project implements a real-time safety equipment detection system using the YOLOv8 model to identify whether individuals in a video feed are wearing required safety gear (e.g., hardhats, masks, safety vests). The system consists of a Flask backend for video processing and a Next.js frontend for the user interface.

## Features
- **Real-Time Detection**: Detects safety equipment in live video streams using a trained YOLOv8 model.
- **Web Interface**: A Next.js-based UI to start/stop the camera and view the video feed with detection overlays.
- **Safety Violation Alerts**: Highlights missing safety gear (e.g., "NO-Hardhat") in red and present gear in green.

## Directory Structure
