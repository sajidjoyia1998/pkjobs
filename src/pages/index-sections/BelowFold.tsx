import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Shield, FileText } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Users,
      title: "Smart Job Matching",
      description:
        "Our system automatically matches your profile with eligible government jobs based on your education, age, and domicile.",
    },
    {
      icon: Shield,
      title: "Expert Assistance",
      description:
        "Dedicated experts handle your application process, from form filling to document submission and fee payment.",
    },
    {
      icon: FileText,
      title: "Complete Transparency",
      description:
        "Track every step of your application. View all payments, receipts, and chat history in one place.",
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose <span className="text-primary">PakJobs</span>?
          </h2>
          <p className="text-muted-foreground">
            We've simplified the complex government job application process into a seamless experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="card-elevated p-8 text-center animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 mb-6">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    { step: "01", title: "Create Your Profile", description: "Register and enter your details - age, education, province, and domicile." },
    { step: "02", title: "Find Eligible Jobs", description: "Browse jobs that match your eligibility. No more wasted applications." },
    { step: "03", title: "Select & Pay", description: "Choose a job, review the complete fee breakdown, and make payment." },
    { step: "04", title: "Expert Applies for You", description: "Our expert handles everything - forms, documents, and official fee payment." },
  ];

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-muted-foreground">Four simple steps to your government career</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              <div className="card-elevated p-6 h-full">
                <span className="text-5xl font-bold text-primary/10">{item.step}</span>
                <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/auth?mode=register">
            <Button size="xl">
              Start Your Journey
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  const stats = [
    { value: "50,000+", label: "Registered Users" },
    { value: "1,200+", label: "Active Jobs" },
    { value: "35,000+", label: "Applications Submitted" },
    { value: "98%", label: "Success Rate" },
  ];

  return (
    <section className="py-16 bg-primary">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-primary-foreground/80 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="card-elevated p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Start Your Government Career?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of successful applicants who found their dream government jobs through PakJobs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=register">
              <Button size="xl">
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/jobs">
              <Button variant="outline" size="xl">
                Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const BelowFold = () => (
  <>
    <FeaturesSection />
    <StatsSection />
    <HowItWorksSection />
    <CTASection />
  </>
);

export default BelowFold;
