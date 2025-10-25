import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  facultyId: string;
  facultyData: {
    name: string;
    email: string;
    department: string;
    designation: string;
  };
}

export function EditFacultyDialog({ open, onOpenChange, onSuccess, facultyId, facultyData }: EditFacultyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    designation: ""
  });

  useEffect(() => {
    if (facultyData) {
      setFormData({
        name: facultyData.name,
        email: facultyData.email,
        department: facultyData.department,
        designation: facultyData.designation
      });
    }
  }, [facultyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.department || !formData.designation) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("faculty")
        .update({
          name: formData.name,
          email: formData.email,
          department: formData.department,
          designation: formData.designation
        })
        .eq("id", facultyId);

      if (error) throw error;

      toast.success("Faculty updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating faculty:", error);
      toast.error(error.message || "Failed to update faculty");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Faculty</DialogTitle>
          <DialogDescription>
            Update faculty member information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Faculty Name *</Label>
            <Input
              id="name"
              placeholder="Enter faculty name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Input
              id="department"
              placeholder="Enter department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Position *</Label>
            <Input
              id="designation"
              placeholder="Enter position (e.g., Professor, Assistant Professor)"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Faculty"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
