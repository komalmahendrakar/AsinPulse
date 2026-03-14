
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ShieldCheck, Zap, Mail, LayoutDashboard, BarChart3 } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight text-foreground font-headline">ASIN Pulse</span>
        </Link>
        <nav className="hidden md:flex gap-8">
          <Link href="#features" className="text-sm font-medium hover:text-accent transition-colors">Features</Link>
          <Link href="/dashboard" className="text-sm font-medium hover:text-accent transition-colors">Dashboard</Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-accent transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
          <div className="container mx-auto px-6 text-center max-w-4xl relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 font-headline">
              Never Guess Why Your <span className="text-accent">Sales Dropped</span> Again
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              ASIN Pulse monitors your Amazon listings 24/7. Detect sales drops instantly and get AI-powered root cause analysis to take immediate action.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="bg-primary text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/20">
                  Start Free Trial
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl border-accent/20 hover:bg-accent/5">
                Watch Demo
              </Button>
            </div>
            
            <div className="mt-16 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">
              <Image 
                src="https://picsum.photos/seed/asin1/1200/800" 
                alt="ASIN Pulse Dashboard" 
                width={1200} 
                height={800}
                className="w-full h-auto object-cover opacity-90"
                data-ai-hint="ecommerce dashboard"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 font-headline">Built for Professional Sellers</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive monitoring tools that go beyond simple price tracking.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Activity className="h-6 w-6 text-accent" />,
                  title: "Real-time Monitoring",
                  description: "Continuous tracking of sales rank, buy box status, and pricing dynamics across all your ASINs."
                },
                {
                  icon: <Zap className="h-6 w-6 text-accent" />,
                  title: "GenAI Analysis",
                  description: "Our proprietary AI engine correlates internal and external data to pinpoint exactly why sales dropped."
                },
                {
                  icon: <Mail className="h-6 w-6 text-accent" />,
                  title: "Smart Alerts",
                  description: "Instant notifications via email and push when critical performance thresholds are crossed."
                },
                {
                  icon: <BarChart3 className="h-6 w-6 text-accent" />,
                  title: "Historical Trends",
                  description: "Visualize performance over time with interactive charts to spot seasonal patterns and long-term shifts."
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-accent" />,
                  title: "Security First",
                  description: "Enterprise-grade encryption for all your Amazon seller data and strategic product insights."
                },
                {
                  icon: <LayoutDashboard className="h-6 w-6 text-accent" />,
                  title: "Centralized Hub",
                  description: "One unified interface to manage thousands of ASINs without getting lost in spreadsheets."
                }
              ].map((feature, i) => (
                <Card key={i} className="bg-card border-border hover:border-accent/30 transition-all duration-300 group">
                  <CardContent className="pt-8">
                    <div className="mb-4 p-3 rounded-lg bg-accent/5 inline-block group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 font-headline">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t bg-card/30">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent" />
            <span className="text-lg font-bold font-headline">ASIN Pulse</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 ASIN Pulse. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent">Terms</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent">Privacy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-accent">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
