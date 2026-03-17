"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Camera, Info, Users, AlertTriangle, TrendingUp,
  ArrowLeft, Wifi, WifiOff, Monitor, Smartphone, Video
} from "lucide-react"
import Link from "next/link"

const API_BASE_URL = "http://localhost:5000"

type CameraType = "webcam" | "phone" | "cctv"

interface DetectionStats {
  total_persons: number
  persons_without_safety_gear: number
  percentage_without_gear: number
}

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  // ── Camera source state ──────────────────────────────────────────
  const [cameraType, setCameraType] = useState<CameraType>("webcam")
  const [phoneUrl, setPhoneUrl] = useState("http://192.168.1.x:8080/video")
  const [rtspUrl, setRtspUrl] = useState("rtsp://admin:password@192.168.1.x:554/stream1")
  const [sourceError, setSourceError] = useState<string | null>(null)

  const [stats, setStats] = useState<DetectionStats>({
    total_persons: 0,
    persons_without_safety_gear: 0,
    percentage_without_gear: 0,
  })

  // ── Health check on mount ────────────────────────────────────────
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`)
        if (res.ok) {
          const data = await res.json()
          setBackendOnline(true)
          setIsRunning(data.camera_active ?? false)
          // Sync source type shown in UI with actual backend state
          if (data.source) setCameraType(data.source as CameraType)
        } else {
          setBackendOnline(false)
        }
      } catch {
        setBackendOnline(false)
      }
    }
    checkHealth()
  }, [])

  // ── Stats polling ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_stats`)
      if (!response.ok) throw new Error("Failed to fetch stats")
      const result = await response.json()
      setStats(result)
      setError(null)
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      fetchStats()
      interval = setInterval(fetchStats, 2000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isRunning, fetchStats])

  // ── Set source on backend ────────────────────────────────────────
  const setSource = async (): Promise<boolean> => {
    setSourceError(null)
    try {
      const body: Record<string, string> = { type: cameraType }
      if (cameraType === "phone") {
        if (!phoneUrl.trim()) { setSourceError("Phone camera URL is required."); return false }
        body.phone_url = phoneUrl.trim()
      }
      if (cameraType === "cctv") {
        if (!rtspUrl.trim()) { setSourceError("RTSP URL is required."); return false }
        body.rtsp_url = rtspUrl.trim()
      }

      const res = await fetch(`${API_BASE_URL}/set_source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setSourceError(data?.detail || data?.status || "Failed to set source.")
        return false
      }
      return true
    } catch {
      setSourceError("Could not reach backend to set source.")
      return false
    }
  }

  // ── Start camera ─────────────────────────────────────────────────
  const startCamera = async () => {
    setIsLoading(true)
    setError(null)

    // Step 1: push source config to backend first
    const sourceOk = await setSource()
    if (!sourceOk) { setIsLoading(false); return }

    // Step 2: start camera
    try {
      const response = await fetch(`${API_BASE_URL}/start_camera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.status || result?.detail || "Failed to start camera")

      const successStatuses = ["Camera started", "Camera already running"]
      if (successStatuses.includes(result.status)) {
        setIsRunning(true)
      } else {
        throw new Error(result.status || "Unexpected response from server")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start camera"
      setError(
        message.includes("fetch")
          ? "Cannot reach backend. Make sure Flask is running on port 5000."
          : message
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ── Stop camera ──────────────────────────────────────────────────
  const stopCamera = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/stop_camera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.status || "Failed to stop camera")

      const successStatuses = ["Camera stopped", "Camera not running"]
      if (successStatuses.includes(result.status)) {
        setIsRunning(false)
        setStats({ total_persons: 0, persons_without_safety_gear: 0, percentage_without_gear: 0 })
      } else {
        throw new Error(result.status || "Unexpected response from server")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop camera"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Source option config ─────────────────────────────────────────
  const sourceOptions: { type: CameraType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: "webcam",  label: "Webcam",       icon: <Monitor className="h-5 w-5" />,    desc: "Local USB / built-in webcam" },
    { type: "phone",   label: "Phone Camera", icon: <Smartphone className="h-5 w-5" />, desc: "Via IP Webcam app (same Wi-Fi)" },
    { type: "cctv",    label: "CCTV / NVR",   icon: <Video className="h-5 w-5" />,      desc: "Via RTSP stream URL" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-green-500 backdrop-blur supports-[backdrop-filter]:bg-dark-green-500/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-xl font-bold">Safety Detection Dashboard</h1>
          <div className="flex items-center space-x-2 text-sm">
            {backendOnline === null ? (
              <span className="text-muted-foreground">Checking...</span>
            ) : backendOnline ? (
              <span className="flex items-center gap-1 text-green-700 font-medium">
                <Wifi className="h-4 w-4" /> Backend Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <WifiOff className="h-4 w-4" /> Backend Offline
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold">Safety Equipment Detection</h1>
            <p className="text-muted-foreground">
              Detect safety equipment like hardhats, masks, and safety vests in real-time
            </p>
          </div>

          {/* Error display */}
          {(error || sourceError) && (
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p>{sourceError || error}</p>
                </div>
                {!backendOnline && (
                  <p className="text-sm text-muted-foreground mt-2 ml-7">
                    Run <code className="bg-muted px-1 rounded">python app.py</code> to start the Flask backend.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Camera Source Selector ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 3-way toggle */}
              <div className="grid grid-cols-3 gap-3">
                {sourceOptions.map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => { if (!isRunning) { setCameraType(type); setSourceError(null) } }}
                    disabled={isRunning}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center
                      ${cameraType === type
                        ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                        : "border-muted hover:border-muted-foreground/50 text-muted-foreground"
                      }
                      ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    {icon}
                    <span className="font-semibold text-sm">{label}</span>
                    <span className="text-xs leading-tight">{desc}</span>
                  </button>
                ))}
              </div>

              {/* Phone URL input */}
              {cameraType === "phone" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="phone-url" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    IP Webcam URL
                  </Label>
                  <Input
                    id="phone-url"
                    value={phoneUrl}
                    onChange={(e) => setPhoneUrl(e.target.value)}
                    placeholder="http://192.168.1.x:8080/video"
                    disabled={isRunning}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Install <strong>IP Webcam</strong> (Android) or <strong>IP Camera Lite</strong> (iOS).
                    Open the app → Start server → use the URL shown (e.g.{" "}
                    <code className="bg-muted px-1 rounded">http://192.168.1.5:8080/video</code>).
                    Your phone and PC must be on the same Wi-Fi.
                  </p>
                </div>
              )}

              {/* RTSP URL input */}
              {cameraType === "cctv" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="rtsp-url" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    RTSP Stream URL
                  </Label>
                  <Input
                    id="rtsp-url"
                    value={rtspUrl}
                    onChange={(e) => setRtspUrl(e.target.value)}
                    placeholder="rtsp://admin:password@192.168.1.x:554/stream1"
                    disabled={isRunning}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: <code className="bg-muted px-1 rounded">rtsp://username:password@camera_ip:554/stream_path</code>.
                    Check your camera&apos;s manual for the stream path.
                    Test in <strong>VLC → Media → Open Network Stream</strong> first.
                  </p>
                </div>
              )}

              {isRunning && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Stop the camera to change source.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Video Feed ── */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-4">
                <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
                  {isRunning ? (
                    <img
                      src={`${API_BASE_URL}/video_feed`}
                      alt="Video feed"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center space-y-4">
                        <Camera className="h-16 w-16 text-white/50" />
                        <p className="text-white text-lg">Camera is off</p>
                        <p className="text-white/50 text-sm">
                          {cameraType === "webcam" && "Local webcam will be used"}
                          {cameraType === "phone" && `Phone: ${phoneUrl}`}
                          {cameraType === "cctv" && `CCTV: ${rtspUrl}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={isRunning ? stopCamera : startCamera}
                    variant={isRunning ? "destructive" : "default"}
                    disabled={isLoading || backendOnline === false}
                  >
                    {isLoading
                      ? "Processing..."
                      : isRunning
                        ? "Stop Camera"
                        : `Start ${sourceOptions.find(s => s.type === cameraType)?.label}`
                    }
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Persons</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_persons}</div>
                <p className="text-xs text-muted-foreground">Currently detected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Without Safety Gear</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.persons_without_safety_gear}</div>
                <p className="text-xs text-muted-foreground">Missing equipment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Compliance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.percentage_without_gear.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Without safety gear</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Legend ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="mr-2 h-5 w-5" />
                Detection Legend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>Safety Equipment Present</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span>Safety Equipment Missing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Detected Classes:</span>
                  <span>Hardhat, Mask, Safety Vest, Person, etc.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
