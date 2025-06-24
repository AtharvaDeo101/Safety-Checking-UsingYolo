🦺 Construction Safety Gear Detection using YOLO & OpenCV
This project uses YOLO (You Only Look Once) object detection with OpenCV to monitor video streams and detect whether individuals on a construction site are wearing required safety gear such as:

👷 Helmet

🦺 Safety Vest

👓 Safety Glasses (if included in your model)

🔧 Gloves (if included)

A Streamlit-based web interface allows users to upload video files or stream video feeds and view real-time detections.

🚧 Use Case
Ensuring worker safety is crucial at construction sites. This application automates the process of verifying compliance with safety protocols, helping supervisors monitor gear usage and reduce the risk of accidents.

💡 Features
Real-time detection of safety gear on people in video

Streamlit web app for ease of use

Option to analyze uploaded video or live stream

Summary statistics of compliance (optional feature)

Alerts or visual cues when safety gear is missing (optional)

📦 Tech Stack
YOLOv5/YOLOv8 (custom-trained or pre-trained weights)

OpenCV for video processing

Streamlit for the frontend interface

Python (3.7+)



## Setup Instructions

### 1. Clone the Repository
git clone https://github.com/yourusername/atharvadeo101-safety-checking-usingyolo.git
cd atharvadeo101-safety-checking-usingyolo

### 2. Running the Application
#### Start the Backend
- From the backend/ directory:
python app.py

#### Start the Frontend
- From the frontend/ directory (in a separate terminal):
npm run dev

### Access the App
- Open your browser and navigate to http://localhost:3000.
- Click "Start Camera" to begin the video feed with safety equipment detection.

### Usage
- Start Camera: Initiates the webcam feed and starts detecting safety gear.
- Stop Camera: Stops the feed and releases the camera.

### Detection Legend:
- **Green:** Safety equipment present (e.g., Hardhat, Safety Vest).
- **Red:** Safety equipment missing (e.g., NO-Hardhat, NO-Mask).
