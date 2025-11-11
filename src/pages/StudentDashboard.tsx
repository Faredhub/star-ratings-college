import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "@/components/StarRating";
import { GraduationCap, LogOut, Loader2, Send, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  full_name: string;
  registration_number: string;
  year: number;
  semester: number;
  section: string;
  branch: string;
}

interface FacultyAssignment {
  id: string;
  subject: string;
  faculty: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facultyAssignments, setFacultyAssignments] = useState<FacultyAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [ratings, setRatings] = useState({
    engagement_level: 3,
    concept_understanding: 3,
    content_depth: 3,
    application_teaching: 3,
    pedagogy_tools: 3,
    communication_skills: 3,
    class_decorum: 3,
    teaching_aids: 3
  });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription for messages
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel('student-messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `student_id=eq.${user.id}`
            },
            () => {
              loadMessages(user.id);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    
    setupSubscription();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/student-login");
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load faculty assignments for student's class
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("faculty_assignments")
        .select(`
          id,
          subject,
          faculty:faculty_id (
            id,
            name,
            email,
            department
          )
        `)
        .eq("year", profileData.year)
        .eq("semester", profileData.semester)
        .eq("section", profileData.section)
        .eq("branch", profileData.branch);

      if (assignmentsError) throw assignmentsError;
      setFacultyAssignments(assignmentsData as any);
      
      // Load messages
      await loadMessages(user.id);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("student_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark unread messages as read
      const unreadIds = data?.filter(m => !m.read_at).map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) {
      toast.error("Please select a faculty member");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const assignment = facultyAssignments.find(a => a.id === selectedAssignment);
      if (!assignment) throw new Error("Assignment not found");

      const { error } = await supabase
        .from("ratings")
        .upsert({
          student_id: user.id,
          faculty_id: assignment.faculty.id,
          assignment_id: selectedAssignment,
          ...ratings,
          feedback_message: feedbackMessage
        });

      if (error) throw error;

      toast.success("Feedback submitted successfully!");
      setFeedbackMessage("");
      setSelectedAssignment("");
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/student-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Faculty Feedback System</h1>
              <p className="text-sm text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Student Info Card */}
          <Card className="p-6 card-elegant">
            <h2 className="text-2xl font-bold mb-4 gradient-text">Student Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{profile?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration Number</p>
                <p className="font-semibold">{profile?.registration_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-semibold">{profile?.branch}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year & Semester</p>
                <p className="font-semibold">Year {profile?.year}, Semester {profile?.semester}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Section</p>
                <p className="font-semibold">Section {profile?.section}</p>
              </div>
            </div>
          </Card>

          {/* Rating Form */}
          <Card className="p-6 card-elegant">
            <h2 className="text-2xl font-bold mb-2 gradient-text">Rate Faculty Performance</h2>
            <p className="text-muted-foreground mb-6">Provide feedback to help improve teaching quality</p>

            <div className="space-y-6">
              <div>
                <Label>Select Faculty & Subject</Label>
                <Select value={selectedAssignment} onValueChange={setSelectedAssignment} disabled={facultyAssignments.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={facultyAssignments.length === 0 ? "No faculty assigned yet" : "Choose faculty and subject to rate"} />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyAssignments.length === 0 ? (
                      <SelectItem value="no-faculty" disabled>
                        No faculty assigned to your class yet
                      </SelectItem>
                    ) : (
                      facultyAssignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.faculty.name} - {assignment.subject}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssignment && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <StarRating
                      label="Engagement Level"
                      description="How well does the faculty engage students?"
                      value={ratings.engagement_level}
                      onChange={(value) => setRatings({ ...ratings, engagement_level: value })}
                    />
                    <StarRating
                      label="Concept Understanding"
                      description="Clarity in explaining concepts"
                      value={ratings.concept_understanding}
                      onChange={(value) => setRatings({ ...ratings, concept_understanding: value })}
                    />
                    <StarRating
                      label="Content Spread & Depth"
                      description="Coverage and depth of subject matter"
                      value={ratings.content_depth}
                      onChange={(value) => setRatings({ ...ratings, content_depth: value })}
                    />
                    <StarRating
                      label="Application-Oriented Teaching"
                      description="Real-world application focus"
                      value={ratings.application_teaching}
                      onChange={(value) => setRatings({ ...ratings, application_teaching: value })}
                    />
                    <StarRating
                      label="Pedagogy Techniques & Tools"
                      description="Teaching methods and tools used"
                      value={ratings.pedagogy_tools}
                      onChange={(value) => setRatings({ ...ratings, pedagogy_tools: value })}
                    />
                    <StarRating
                      label="Communication Skills"
                      description="Clarity and effectiveness of communication"
                      value={ratings.communication_skills}
                      onChange={(value) => setRatings({ ...ratings, communication_skills: value })}
                    />
                    <StarRating
                      label="Class Decorum"
                      description="Classroom management and environment"
                      value={ratings.class_decorum}
                      onChange={(value) => setRatings({ ...ratings, class_decorum: value })}
                    />
                    <StarRating
                      label="Teaching Aids"
                      description="Use of visual aids and technology"
                      value={ratings.teaching_aids}
                      onChange={(value) => setRatings({ ...ratings, teaching_aids: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Feedback (Optional)</Label>
                    <Textarea
                      placeholder="Share any specific comments or suggestions for improvement..."
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className="w-full btn-gradient"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Submit Rating</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Messages from Admin */}
          {messages.length > 0 && (
            <Card className="p-6 card-elegant">
              <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                Messages from Admin
              </h2>
              <p className="text-muted-foreground mb-4">Important messages from the administration</p>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
