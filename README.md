<h1>🦺 Construction Safety Gear Detection using YOLO & OpenCV</h1>
<br>
This project uses YOLO (You Only Look Once) object detection with OpenCV to monitor video streams and detect whether individuals on a construction site are wearing required safety gear such as:

<ul>👷 Helmet</ul>

<ul>🦺 Safety Vest</ul>

<ul>👓 Safety Glasses </ul>


A Streamlit-based web interface allows users to upload video files or stream video feeds and view real-time detections.

##🚧 Use Case
Ensuring worker safety is crucial at construction sites. This application automates the process of verifying compliance with safety protocols, helping supervisors monitor gear usage and reduce the risk of accidents.

##💡 Features
<ul>Real-time detection of safety gear on people in video</ul>

<ul>Streamlit web app for ease of use</ul>

<ul>Option to analyze uploaded video or live stream</ul>

##📦 Tech Stack
<ul>YOLOv5/YOLOv8 (custom-trained or pre-trained weights)</ul>

<ul>OpenCV for video processing</ul>

<ul>Streamlit for the frontend interface</ul>

<ul>Python (3.7+)</ul>



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
