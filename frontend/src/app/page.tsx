"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Info, Users, AlertTriangle, TrendingUp, Wifi, WifiOff, Loader2 } from "lucide-react"

interface DetectionStats {
  total_persons: number
  persons_without_safety_gear: number
  percentage_without_gear: number
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<DetectionStats>({
    total_persons: 0,
    persons_without_safety_gear: 0,
    percentage_without_gear: 0,
  })

  const checkConnection = async () => {
    try {
      const response = await fetch("http://localhost:5000/health", {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      const result = await response.json()
      setIsConnected(true)
      return result.camera_active || false
    } catch (error) {
      console.error("Backend connection failed:", error)
      setIsConnected(false)
      return false
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/get_stats", {
        signal: AbortSignal.timeout(3000)
      })
      const result = await response.json()
      setStats(result)
      setIsConnected(true)
    } catch (error) {
      console.error("Error fetching stats:", error)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    // Initial connection check
    checkConnection().then((cameraActive) => {
      setIsRunning(cameraActive)
    })

    // Periodic connection check
    const connectionInterval = setInterval(checkConnection, 10000) // Check every 10 seconds
    
    return () => clearInterval(connectionInterval)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && isConnected) {
      // Fetch stats immediately when camera starts
      fetchStats()
      // Then fetch every 2 seconds
      interval = setInterval(fetchStats, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, isConnected])

  const startCamera = async () => {
    if (!isConnected) {
      alert("Backend is not connected. Please check if the Flask server is running on localhost:5000")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:5000/start_camera", {
        method: "POST",
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      const result = await response.json()
      
      if (result.status === "Camera started" || result.status === "Camera already running") {
        setIsRunning(true)
      } else {
        alert(`Failed to start camera: ${result.status}`)
      }
    } catch (error) {
      console.error("Error starting camera:", error)
      alert("Failed to start camera. Please check your camera permissions and backend connection.")
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = async () => {
    if (!isConnected) {
      setIsRunning(false)
      setStats({
        total_persons: 0,
        persons_without_safety_gear: 0,
        percentage_without_gear: 0,
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:5000/stop_camera", {
        method: "POST",
        signal: AbortSignal.timeout(5000)
      })
      const result = await response.json()
      
      if (result.status === "Camera stopped" || result.status === "Camera not running") {
        setIsRunning(false)
        setStats({
          total_persons: 0,
          persons_without_safety_gear: 0,
          percentage_without_gear: 0,
        })
      }
    } catch (error) {
      console.error("Error stopping camera:", error)
      // Still set running to false even if API call fails
      setIsRunning(false)
      setStats({
        total_persons: 0,
        persons_without_safety_gear: 0,
        percentage_without_gear: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getComplianceColor = (percentage: number) => {
    if (percentage === 0) return "text-green-600"
    if (percentage < 25) return "text-yellow-600"
    return "text-red-600"
  }

  const getComplianceStatus = (percentage: number) => {
    if (percentage === 0) return "Excellent"
    if (percentage < 10) return "Good"
    if (percentage < 25) return "Moderate"
    return "Critical"
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Safety Equipment Detection</h1>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-sm">Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm">Disconnected</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">
            Detect safety equipment like hardhats, masks, and safety vests in real-time
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
                {isRunning && isConnected ? (
                  <img 
                    src="http://localhost:5000/video_feed" 
                    alt="Video feed" 
                    className="w-full h-full object-cover"
                    onError={() => {
                      console.error("Video feed error")
                      setIsConnected(false)
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-4">
                      <Camera className="h-16 w-16 text-white/50" />
                      <p className="text-white text-lg">
                        {!isConnected ? "Backend Disconnected" : "Camera is off"}
                      </p>
                      {!isConnected && (
                        <p className="text-white/70 text-sm text-center">
                          Please ensure Flask server is running on localhost:5000
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={isRunning ? stopCamera : startCamera}
                  variant={isRunning ? "destructive" : "default"}
                  disabled={isLoading || !isConnected}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isRunning ? "Stop Camera" : "Start Camera"}
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
              <div className={`text-2xl font-bold ${getComplianceColor(stats.percentage_without_gear)}`}>
                {stats.percentage_without_gear.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {getComplianceStatus(stats.percentage_without_gear)} compliance
              </p>
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
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Status:</span>
                <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  {isConnected ? "Backend Connected" : "Backend Offline"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}