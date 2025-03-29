"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface SafetyDetectionProps {
  confidenceThreshold?: number
}

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
  const [stats, setStats] = useState({ total: 0, violations: 0, compliant: 0 })

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

    const detectFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Capture frame as image
      const frame = canvas.toDataURL("image/jpeg")
      const blob = await (await fetch(frame)).blob()
      const formData = new FormData()
      formData.append("file", blob, "frame.jpg")

      // Send frame to backend
      try {
        const response = await fetch("http://localhost:8000/detect/", {
          method: "POST",
          body: formData,
        })
        const data = await response.json()

        if (data.error) {
          setError(data.error)
          return
        }

        const filteredResults = data.detections.filter(
          (det: Detection) => det.confidence >= confidenceThreshold
        )
        setDetections(filteredResults)

        // Calculate stats and draw bounding boxes
        let violations = 0
        let compliant = 0

        filteredResults.forEach((detection: Detection) => {
          const { x1, y1, x2, y2, class: className, confidence } = detection
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

          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.rect(x1, y1, x2 - x1, y2 - y1)
          ctx.stroke()
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1)

          ctx.fillStyle = isViolation ? "red" : "green"
          ctx.font = "16px Arial"
          const label = `${className} ${Math.round(confidence * 100)}%`
          const textWidth = ctx.measureText(label).width

          ctx.fillRect(x1, y1 - 25, textWidth + 10, 25)
          ctx.fillStyle = "white"
          ctx.fillText(label, x1 + 5, y1 - 7)
        })

        setStats({ total: filteredResults.length, violations, compliant })
      } catch (err) {
        console.error("Detection error:", err)
      }

      animationFrameId = requestAnimationFrame(detectFrame)
    }

    startCamera()

    const onVideoReady = () => {
      if (videoRef.current) {
        detectFrame()
      }
    }

    if (videoRef.current) {
      videoRef.current.addEventListener("loadeddata", onVideoReady)
    }

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