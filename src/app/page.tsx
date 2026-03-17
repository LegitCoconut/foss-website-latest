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
  { slug: "operating-system", label: "Operating Systems", icon: Monitor },
  { slug: "development", label: "Development", icon: Code },
  { slug: "productivity", label: "Productivity", icon: Zap },
  { slug: "utility", label: "Utilities", icon: Wrench },
  { slug: "multimedia", label: "Multimedia", icon: Film },
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
        <div className="container mx-auto px-4 py-24 md:py-36 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-xs font-medium"
            >
              <HardDrive className="h-3 w-3 mr-1.5" />
              Campus LAN Distribution
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="text-foreground">
                Free Software,{" "}
              </span>
              <br />
              <span className="text-muted-foreground">
                Lightning Fast
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Download open source software, operating systems, and development
              tools at LAN speed. Curated for students, powered by the campus
              network.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" asChild className="text-sm px-8 h-11">
                <Link href="/catalog">
                  Browse Catalog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-sm px-8 h-11">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold tabular-nums">
                100+
              </p>
              <p className="text-sm text-muted-foreground mt-1">Software Available</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold tabular-nums">
                10 Gbps
              </p>
              <p className="text-sm text-muted-foreground mt-1">LAN Speed</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold tabular-nums">
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Browse by Category</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Find the perfect tool for your needs across our curated categories
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}>
              <Card className="group border-border/50 hover:bg-muted/50 transition-all duration-200 cursor-pointer">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center group-hover:bg-foreground/[0.12] transition-colors">
                    <cat.icon className="h-5 w-5 text-foreground/60" />
                  </div>
                  <h3 className="text-sm font-medium">{cat.label}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-border/50">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">How It Works</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mb-4 mx-auto h-14 w-14 rounded-xl bg-muted/80 border border-border/50 flex items-center justify-center">
                  <s.icon className="h-6 w-6 text-foreground/60" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                  Step {s.step}
                </span>
                <h3 className="text-base font-semibold mt-1 mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-8 md:p-12 text-center">
            <div className="mx-auto h-10 w-10 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-foreground/60" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
              Can&apos;t Find What You Need?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Request any FOSS software or operating system and our team will
              add it to the catalog.
            </p>
            <Button size="lg" asChild className="text-sm px-8 h-11">
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
