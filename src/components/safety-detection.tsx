"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

// Define the props interface
interface SafetyDetectionProps {
  confidenceThreshold?: number
}

// Define the detection result interface
interface Detection {
  class: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export default function SafetyDetection({ confidenceThreshold = 0.5 }: SafetyDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [stats, setStats] = useState({
    total: 0,
    violations: 0,
    compliant: 0,
  })

  // Mock YOLO model for demonstration purposes
  // In a real implementation, you would load the actual YOLO model using ONNX Runtime or TensorFlow.js
  const mockDetect = (videoElement: HTMLVideoElement): Detection[] => {
    // This is a mock function that simulates YOLO detections
    // In a real implementation, you would run the actual model on the video frame

    const mockClasses = [
      "Hardhat",
      "Mask",
      "NO-hardhat",
      "NO-mask",
      "NO-Safety Vest",
      "Person",
      "Safety Cone",
      "Safety Vest",
    ]

    // Generate random detections for demonstration
    const numDetections = Math.floor(Math.random() * 5) + 1
    const detections: Detection[] = []

    for (let i = 0; i < numDetections; i++) {
      const classIndex = Math.floor(Math.random() * mockClasses.length)
      const className = mockClasses[classIndex]

      // Generate random bounding box
      const width = videoElement.videoWidth
      const height = videoElement.videoHeight

      const x1 = Math.floor(Math.random() * (width - 100))
      const y1 = Math.floor(Math.random() * (height - 100))
      const boxWidth = Math.floor(Math.random() * 150) + 50
      const boxHeight = Math.floor(Math.random() * 150) + 50
      const x2 = Math.min(x1 + boxWidth, width)
      const y2 = Math.min(y1 + boxHeight, height)

      detections.push({
        class: className,
        confidence: Math.random() * 0.5 + 0.5, // Random confidence between 0.5 and 1.0
        x1,
        y1,
        x2,
        y2,
      })
    }

    return detections
  }

  useEffect(() => {
    let animationFrameId: number
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch (err) {
        setError("Failed to access camera. Please ensure you have granted camera permissions.")
        console.error("Error accessing camera:", err)
      }
    }

    const detectFrame = () => {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Run detection (mock in this case)
      const results = mockDetect(video)

      // Filter by confidence threshold
      const filteredResults = results.filter((det) => det.confidence >= confidenceThreshold)
      setDetections(filteredResults)

      // Calculate stats
      let violations = 0
      let compliant = 0

      // Draw bounding boxes
      filteredResults.forEach((detection) => {
        const { x1, y1, x2, y2, class: className, confidence } = detection

        // Determine if this is a violation (classes that start with "NO-")
        const isViolation = className.startsWith("NO-")

        if (isViolation) {
          violations++
          ctx.strokeStyle = "red"
          ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
        } else {
          compliant++
          ctx.strokeStyle = "green"
          ctx.fillStyle = "rgba(0, 255, 0, 0.2)"
        }

        // Draw rectangle
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.rect(x1, y1, x2 - x1, y2 - y1)
        ctx.stroke()
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1)

        // Draw label
        ctx.fillStyle = isViolation ? "red" : "green"
        ctx.font = "16px Arial"
        const label = `${className} ${Math.round(confidence * 100)}%`
        const textWidth = ctx.measureText(label).width

        ctx.fillRect(x1, y1 - 25, textWidth + 10, 25)
        ctx.fillStyle = "white"
        ctx.fillText(label, x1 + 5, y1 - 7)
      })

      setStats({
        total: filteredResults.length,
        violations,
        compliant,
      })

      // Request next frame
      animationFrameId = requestAnimationFrame(detectFrame)
    }

    startCamera()

    // Start detection loop once video is ready
    const onVideoReady = () => {
      if (videoRef.current) {
        detectFrame()
      }
    }

    if (videoRef.current) {
      videoRef.current.addEventListener("loadeddata", onVideoReady)
    }

    // Cleanup function
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      if (videoRef.current) {
        videoRef.current.removeEventListener("loadeddata", onVideoReady)
      }
    }
  }, [confidenceThreshold])

  return (
    <div className="relative w-full h-full">
      {error && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Badge variant={stats.violations > 0 ? "destructive" : "default"} className="text-sm">
          {stats.violations > 0 ? "Safety Violations Detected" : "All Safety Equipment Present"}
        </Badge>

        <Card className="p-2 bg-black/50 text-white text-xs">
          <div>Total Detections: {stats.total}</div>
          <div>Violations: {stats.violations}</div>
          <div>Compliant: {stats.compliant}</div>
        </Card>
      </div>
    </div>
  )
}

