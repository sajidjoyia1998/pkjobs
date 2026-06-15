import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Users, FileText, Sparkles } from "lucide-react";
import heroAsset from "@/assets/hero-image.webp.asset.json";

// Lazy-load below-the-fold sections so the initial page paints faster.
const BelowFold = lazy(() => import("./index-sections/BelowFold"));

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden hero-gradient">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="container relative py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Trusted by 50,000+ job seekers
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Your Gateway to{" "}
              <span className="text-gradient-primary">Government Jobs</span>{" "}
              in Pakistan
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg">
              We simplify the government job application process. From finding eligible
              jobs to expert-assisted applications, we handle everything so you can
              focus on your career.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth?mode=register">
                <Button variant="hero" className="w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="hero-outline" className="w-full sm:w-auto">
                  How It Works
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-success" />
                Free eligibility check
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-success" />
                Expert assistance
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-success" />
                Full transparency
              </div>
            </div>
          </div>

          {/* Image — LCP candidate: eager + high priority + explicit dimensions to avoid CLS */}
          <div className="relative animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img
                src={heroAsset.url}
                alt="Professional Pakistanis ready for government careers"
                width={1600}
                height={900}
                loading="eager"
                // @ts-expect-error - lowercase per HTML spec to avoid React DOM warning
                fetchpriority="high"
                decoding="async"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>

            {/* Floating cards */}
            <div className="absolute -bottom-6 -left-6 card-elevated p-4 animate-scale-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">1,200+</p>
                  <p className="text-xs text-muted-foreground">Jobs Available</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 card-elevated p-4 animate-scale-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">50,000+</p>
                  <p className="text-xs text-muted-foreground">Happy Users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Index = () => {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<div className="py-20" />}>
        <BelowFold />
      </Suspense>
    </>
  );
};

export default Index;
