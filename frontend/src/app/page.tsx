import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Eye, CheckCircle, BarChart3, ArrowRight, Play, Cpu, Network, Award } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SafetyAI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </a>
            <a href="#integration" className="text-sm font-medium hover:text-primary transition-colors">
              Integration
            </a>
            <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            AI-Powered Safety Detection
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            Revolutionizing Safety with <span className="text-primary">Real-Time AI Detection</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl">
            Integrate seamlessly into your existing systems for enhanced compliance and protection. Detect safety
            equipment violations instantly with our end-to-end AI solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                <Play className="mr-2 h-5 w-5" />
                View Live Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Advanced AI capabilities designed for industrial safety compliance
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Eye className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-Time Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Instantly detect safety equipment like hardhats, masks, and safety vests with 99.2% accuracy using
                  advanced computer vision.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Network className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Seamless Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Easy API integration with existing security systems, CCTV networks, and enterprise software through
                  RESTful APIs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Award className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Compliance Assurance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Meet OSHA, ISO 45001, and industry-specific safety standards with automated reporting and audit
                  trails.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section id="integration" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">End-to-End System Integration</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Our safety detection system is designed to integrate seamlessly with your existing infrastructure,
                providing a complete solution from camera feeds to compliance reporting.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>RESTful API for easy integration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Real-time webhook notifications</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Custom dashboard and reporting</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Multi-camera support and scaling</span>
                </div>
              </div>
            </div>
            <Card className="p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Cpu className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-semibold">Camera Feed</div>
                      <div className="text-sm text-muted-foreground">Live video input</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-semibold">AI Detection</div>
                      <div className="text-sm text-muted-foreground">Real-time analysis</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-semibold">Your System</div>
                      <div className="text-sm text-muted-foreground">Integrated alerts</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99.2%</div>
              <div className="text-muted-foreground">Detection Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">&lt;100ms</div>
              <div className="text-muted-foreground">Response Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Monitoring</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Deployments</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ensure Safety in Real-Time Today!</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl">
            Join hundreds of organizations already using our AI-powered safety detection system to protect their
            workforce and maintain compliance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Request a Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section id="contact" className="py-12 px-4 bg-muted/30 border-t">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">SafetyAI</span>
              </div>
              <p className="text-muted-foreground">AI-powered safety detection for the modern workplace.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="#features" className="text-muted-foreground hover:text-foreground">
                    Features
                  </a>
                </div>
                <div>
                  <a href="#integration" className="text-muted-foreground hover:text-foreground">
                    Integration
                  </a>
                </div>
                <div>
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                    Live Demo
                  </Link>
                </div>
                <div>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    API Docs
                  </a>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    About
                  </a>
                </div>
                <div>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Careers
                  </a>
                </div>
                <div>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Privacy
                  </a>
                </div>
                <div>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Terms
                  </a>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>sales@safetyai.com</div>
                <div>+1 (555) 123-4567</div>
                <div>San Francisco, CA</div>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-sm text-muted-foreground">
            © 2024 SafetyAI. All rights reserved.
          </div>
        </div>
      </section>
    </div>
  )
}