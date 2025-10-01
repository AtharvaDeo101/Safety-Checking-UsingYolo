"use client"

import { useState, useEffect } from "react"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Camera, Info, Users, AlertTriangle, TrendingUp, ArrowLeft } from "lucide-react"
import Link from "next/link"

// Backend API URL - deployed on Render
const API_BASE_URL = "https://safety-checking-usingyolo.onrender.com"

interface DetectionStats {
  total_persons: number
  persons_without_safety_gear: number
  percentage_without_gear: number
}

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DetectionStats>({
    total_persons: 0,
    persons_without_safety_gear: 0,
    percentage_without_gear: 0,
  })

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_stats`)
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }
      const result = await response.json()
      setStats(result)
      setError(null)
    } catch (error) {
      console.error("Error fetching stats:", error)
      setError("Unable to fetch statistics")
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      // Fetch stats immediately when camera starts
      fetchStats()

      interval = setInterval(fetchStats, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  const startCamera = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/start_camera`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to start camera")
      }
      const result = await response.json()
      if (result.status === "Camera started") {
        setIsRunning(true)
      }
    } catch (error) {
      console.error("Error starting camera:", error)
      setError("Failed to start camera. Please try again.")
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
      })
      if (!response.ok) {
        throw new Error("Failed to stop camera")
      }
      const result = await response.json()
      if (result.status === "Camera stopped") {
        setIsRunning(false)
        setStats({
          total_persons: 0,
          persons_without_safety_gear: 0,
          percentage_without_gear: 0,
        })
      }
    } catch (error) {
      console.error("Error stopping camera:", error)
      setError("Failed to stop camera. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-xl font-bold">Safety Detection Dashboard</h1>
          <div></div>
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

          {error && (
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
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
                    disabled={isLoading}
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