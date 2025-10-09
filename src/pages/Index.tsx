import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, Shield, Star, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <GraduationCap className="h-20 w-20 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Faculty Feedback System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform for students to rate faculty performance and for administrators to analyze teaching quality
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 card-elegant text-center hover:shadow-xl transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Star className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Student Ratings</h3>
            <p className="text-muted-foreground">
              Rate faculty across 8 comprehensive criteria with detailed feedback
            </p>
          </Card>

          <Card className="p-6 card-elegant text-center hover:shadow-xl transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-secondary/10 rounded-full">
                <BarChart3 className="h-8 w-8 text-secondary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground">
              View real-time analytics with charts, graphs, and performance metrics
            </p>
          </Card>

          <Card className="p-6 card-elegant text-center hover:shadow-xl transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-500/10 rounded-full">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Admin Controls</h3>
            <p className="text-muted-foreground">
              Manage faculty, export data, and send performance reports via email
            </p>
          </Card>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            className="btn-gradient w-full sm:w-auto px-8"
            onClick={() => navigate("/student-register")}
          >
            <GraduationCap className="mr-2 h-5 w-5" />
            Student Registration
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto px-8"
            onClick={() => navigate("/student-login")}
          >
            Student Login
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto px-8"
            onClick={() => navigate("/admin-login")}
          >
            <Shield className="mr-2 h-5 w-5" />
            Admin Access
          </Button>
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 card-elegant max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-primary mb-2">For Students</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Register with your academic details</li>
                  <li>Login to your student dashboard</li>
                  <li>Select faculty assigned to your class</li>
                  <li>Rate across 8 teaching criteria</li>
                  <li>Submit optional feedback comments</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-2">For Administrators</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Secure login with admin credentials</li>
                  <li>View real-time analytics dashboard</li>
                  <li>See detailed faculty performance</li>
                  <li>Export data for reports</li>
                  <li>Send performance emails to faculty</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
