<h1>🦺 Construction Safety Gear Detection using YOLO & OpenCV</h1>
<br>
This project uses YOLO (You Only Look Once) object detection with OpenCV to monitor video streams and detect whether individuals on a construction site are wearing required safety gear such as:

<ul>👷 Helmet</ul>

<ul>🦺 Safety Vest</ul>

<ul>👓 Safety Glasses </ul>


A Streamlit-based web interface allows users to upload video files or stream video feeds and view real-time detections.

<h2>🚧 Use Case</h2>
Ensuring worker safety is crucial at construction sites. This application automates the process of verifying compliance with safety protocols, helping supervisors monitor gear usage and reduce the risk of accidents.

<h2>💡 Features</h2>
<ul>Real-time detection of safety gear on people in video</ul>

<ul>React web app for ease of use</ul>

<ul>Seamless integration to other large applications</ul>

<h2>📦 Tech Stack</h2>
<ul>YOLOv5/YOLOv8 (custom-trained or pre-trained weights)</ul>

<ul>OpenCV for video processing</ul>

<ul>React for the frontend interface</ul>

<ul>Python (3.10+)</ul>



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

### Usage
- Start Camera: Initiates the webcam feed and starts detecting safety gear.
- Stop Camera: Stops the feed and releases the camera.

### Detection Legend:
- **Green:** Safety equipment present (e.g., Hardhat, Safety Vest).
- **Red:** Safety equipment missing (e.g., NO-Hardhat, NO-Mask).
