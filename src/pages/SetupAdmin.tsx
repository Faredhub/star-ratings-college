import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus, ArrowLeft } from "lucide-react";

export default function SetupAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSetupAdmin = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Not authenticated. Please login as existing admin first.");
        navigate("/admin-login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-admin`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Setup failed");
      }

      toast.success("Admin user created successfully!");
      toast.info("Email: onlinekracker03@gmail.com | Password: Admin@2025 | Code: 2025");
      
    } catch (error: any) {
      console.error("Error setting up admin:", error);
      toast.error(error.message || "Failed to setup admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Setup New Admin
          </CardTitle>
          <CardDescription>
            Create the new admin user: onlinekracker03@gmail.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Email:</strong> onlinekracker03@gmail.com</p>
            <p><strong>Password:</strong> Admin@2025</p>
            <p><strong>Admin Code:</strong> 2025</p>
          </div>
          
          <Button 
            onClick={handleSetupAdmin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Admin User
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin")}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
