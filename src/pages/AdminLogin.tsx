import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Check if user has admin role with correct code
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", authData.user.id)
          .eq("role", "admin")
          .eq("admin_code", adminCode.trim())
          .maybeSingle();

        if (roleError) {
          console.error("Role check error:", roleError);
          await supabase.auth.signOut();
          throw new Error("Error checking admin privileges");
        }

        if (!roleData) {
          await supabase.auth.signOut();
          throw new Error("Invalid admin access code or insufficient privileges");
        }

        toast.success("Admin login successful!");
        navigate("/admin");
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast.error(error.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4 flex gap-2">
        <Button variant="outline" onClick={() => navigate("/student-login")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Student Login
        </Button>
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md p-8 card-elegant">
        <div className="flex items-center justify-center mb-6">
          <Shield className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-3xl font-bold gradient-text">Admin Login</h1>
        </div>
        
        <p className="text-center text-muted-foreground mb-8">
          Secure administrative access
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminCode">Admin Access Code</Label>
            <Input
              id="adminCode"
              type="password"
              placeholder="Enter admin code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full btn-gradient" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login as Admin
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/student-login" className="text-primary hover:underline">
              Back to Student Login
            </Link>
          </p>
        </form>

        <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">⚠️ Admin Setup Required</p>
          <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-3">
            To create an admin account:
          </p>
          <ol className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1 list-decimal list-inside">
            <li>Register as a student with your admin email</li>
            <li>Go to Lovable Cloud dashboard</li>
            <li>Open the "user_roles" table</li>
            <li>Add a new row with your user_id, role: "admin", and admin_code: "2025"</li>
            <li>Then login here with your credentials and code "2025"</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
