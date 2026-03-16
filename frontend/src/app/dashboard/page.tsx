"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Info, Users, AlertTriangle, TrendingUp, ArrowLeft, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"

const API_BASE_URL = "http://localhost:5000"

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
  const [stats, setStats] = useState<DetectionStats>({
    total_persons: 0,
    persons_without_safety_gear: 0,
    percentage_without_gear: 0,
  })

  // Fix 1: Check if Flask backend is reachable on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`)
        if (res.ok) {
          const data = await res.json()
          setBackendOnline(true)
          // Sync running state with actual backend state on page reload
          setIsRunning(data.camera_active ?? false)
        } else {
          setBackendOnline(false)
        }
      } catch {
        setBackendOnline(false)
      }
    }
    checkHealth()
  }, [])

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
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, fetchStats])

  const startCamera = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/start_camera`, {
        method: "POST",
        // Fix 2: Always send Content-Type header on POST requests
        headers: { "Content-Type": "application/json" },
      })

      // Fix 3: Read body BEFORE checking ok, so we can show the real error
      const result = await response.json()

      if (!response.ok) {
        // Flask returns {"status": "..."} even on errors — show that message
        throw new Error(result?.status || result?.detail || "Failed to start camera")
      }

      // Fix 4: Accept both "Camera started" AND "Camera already running" as success
      const successStatuses = ["Camera started", "Camera already running"]
      if (successStatuses.includes(result.status)) {
        setIsRunning(true)
      } else {
        throw new Error(result.status || "Unexpected response from server")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start camera"
      console.error("Error starting camera:", message)
      setError(
        message.includes("fetch")
          ? "Cannot reach backend. Make sure Flask is running on port 5000."
          : message
      )
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/stop_camera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.status || "Failed to stop camera")
      }

      // Fix 5: Accept both "Camera stopped" AND "Camera not running" as success
      const successStatuses = ["Camera stopped", "Camera not running"]
      if (successStatuses.includes(result.status)) {
        setIsRunning(false)
        setStats({
          total_persons: 0,
          persons_without_safety_gear: 0,
          percentage_without_gear: 0,
        })
      } else {
        throw new Error(result.status || "Unexpected response from server")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop camera"
      console.error("Error stopping camera:", message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

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
          {/* Fix 6: Show backend connectivity status */}
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

          {/* Fix 7: Show actionable error with backend offline hint */}
          {error && (
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
                {!backendOnline && (
                  <p className="text-sm text-muted-foreground mt-2 ml-7">
                    Run <code className="bg-muted px-1 rounded">python app.py</code> to start the Flask backend.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={isRunning ? stopCamera : startCamera}
                    variant={isRunning ? "destructive" : "default"}
                    // Fix 8: Disable button when backend is known to be offline
                    disabled={isLoading || backendOnline === false}
                  >
                    {isLoading ? "Processing..." : isRunning ? "Stop Camera" : "Start Camera"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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
