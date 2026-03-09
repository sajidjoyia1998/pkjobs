import { Users, Target, Award, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  const stats = [
    { label: "Jobs Posted", value: "500+" },
    { label: "Applications Processed", value: "10,000+" },
    { label: "Success Rate", value: "95%" },
    { label: "Years Experience", value: "5+" },
  ];

  const features = [
    "Expert assistance with government job applications",
    "Complete documentation support",
    "Real-time application tracking",
    "Direct communication with our team",
    "Secure payment processing",
    "24/7 customer support",
  ];

  return (
    <div className="container py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">About PakJobs</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your trusted partner for government job applications in Pakistan. 
          We simplify the complex process of applying for government positions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mission & Vision */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Our Mission</h2>
            </div>
            <p className="text-muted-foreground">
              To make government job applications accessible and hassle-free for every Pakistani citizen. 
              We believe everyone deserves equal opportunity to pursue their career goals in the public sector.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Our Vision</h2>
            </div>
            <p className="text-muted-foreground">
              To become Pakistan's leading platform for government job services, 
              known for our reliability, transparency, and commitment to helping candidates succeed.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Why Choose Us */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Why Choose Us?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Our Team</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Our team consists of experienced professionals who understand the intricacies of 
          government job applications. With years of experience in the public sector, 
          we're here to guide you every step of the way.
        </p>
      </div>
    </div>
  );
};

export default About;
