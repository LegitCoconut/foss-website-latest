import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Shield,
  Zap,
  Package,
  Monitor,
  Code,
  Wrench,
  Film,
  ArrowRight,
  Users,
  HardDrive,
} from "lucide-react";

const categories = [
  { slug: "operating-system", label: "Operating Systems", icon: Monitor, color: "from-blue-500 to-cyan-500" },
  { slug: "development", label: "Development", icon: Code, color: "from-green-500 to-emerald-500" },
  { slug: "productivity", label: "Productivity", icon: Zap, color: "from-yellow-500 to-orange-500" },
  { slug: "utility", label: "Utilities", icon: Wrench, color: "from-purple-500 to-pink-500" },
  { slug: "multimedia", label: "Multimedia", icon: Film, color: "from-red-500 to-rose-500" },
];

const steps = [
  {
    step: "01",
    title: "Create Account",
    description: "Sign up with your college email to get started",
    icon: Users,
  },
  {
    step: "02",
    title: "Browse Software",
    description: "Explore our curated catalog of FOSS tools and ISOs",
    icon: Package,
  },
  {
    step: "03",
    title: "Download Fast",
    description: "Get files at LAN speed with secure signed URLs",
    icon: Download,
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-24 md:py-36 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-sm bg-white/5 border border-white/10 backdrop-blur"
            >
              <HardDrive className="h-3.5 w-3.5 mr-1.5" />
              Campus LAN Distribution
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Free Software,{" "}
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Lightning Fast
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Download open source software, operating systems, and development
              tools at LAN speed. Curated for students, powered by the campus
              network.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-base px-8 h-12 shadow-lg shadow-blue-500/25"
              >
                <Link href="/catalog">
                  Browse Catalog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-base px-8 h-12 border-white/10">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                100+
              </p>
              <p className="text-sm text-muted-foreground mt-1">Software Available</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                10 Gbps
              </p>
              <p className="text-sm text-muted-foreground mt-1">LAN Speed</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                24/7
              </p>
              <p className="text-sm text-muted-foreground mt-1">Always Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Find the perfect tool for your needs across our curated categories
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}>
              <Card className="group relative overflow-hidden border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div
                    className={`mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <cat.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-sm font-medium">{cat.label}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-white/10 bg-white/[0.01]">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mb-4 mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <s.icon className="h-7 w-7 text-blue-400" />
                </div>
                <span className="text-xs font-mono text-blue-400/60 tracking-widest uppercase">
                  Step {s.step}
                </span>
                <h3 className="text-lg font-semibold mt-1 mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
          <CardContent className="relative p-8 md:p-12 text-center">
            <Shield className="h-10 w-10 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Can&apos;t Find What You Need?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Request any FOSS software or operating system and our team will
              add it to the catalog.
            </p>
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Link href="/dashboard/requests">
                Request Software
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
