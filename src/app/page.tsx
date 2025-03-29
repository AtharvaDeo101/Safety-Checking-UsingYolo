"use client"

import { useState } from "react"
import SafetyDetection from "@/components/safety-detection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Info } from "lucide-react"

export default function Home() {
  const [isRunning, setIsRunning] = useState(false)
  // Fixed confidence threshold since settings section is removed
  const confidenceThreshold = 0.5

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">Safety Equipment Detection</h1>
          <p className="text-muted-foreground">
            Detect safety equipment like hardhats, masks, and safety vests in real-time
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
                {isRunning ? (
                  <SafetyDetection confidenceThreshold={confidenceThreshold} />
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
                  onClick={() => setIsRunning(!isRunning)}
                  variant={isRunning ? "destructive" : "default"}
                >
                  {isRunning ? "Stop Camera" : "Start Camera"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
  )
}

