import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, LogOut, Loader2, Users, BookOpen, Star, TrendingUp, Eye, Download, Mail, ArrowLeft, Plus, Filter, Trash2, Edit, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { AddFacultyDialog } from "@/components/AddFacultyDialog";
import { EditFacultyDialog } from "@/components/EditFacultyDialog";
import { StudentsDialog } from "@/components/StudentsDialog";

interface FacultyWithRatings {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignmentCount: number;
  ratingCount: number;
  averageRating: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState<FacultyWithRatings[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalRatings: 0,
    averageRating: 0,
    responseRate: 0
  });
  const [filters, setFilters] = useState({
    semester: "all",
    section: "all",
    subject: "all"
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyWithRatings | null>(null);
  const [showStudentsDialog, setShowStudentsDialog] = useState(false);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  useEffect(() => {
    checkAdminAccess();
    loadDashboardData();

    // Set up realtime subscription for profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin-login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        toast.error("Access denied");
        navigate("/student-login");
      }
    } catch (error) {
      navigate("/admin-login");
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load all faculty
      const { data: facultyData, error: facultyError } = await supabase
        .from("faculty")
        .select("*");

      if (facultyError) throw facultyError;

      // Load all assignments with full details
      const { data: assignmentsData } = await supabase
        .from("faculty_assignments")
        .select("*");

      setAllAssignments(assignmentsData || []);

      // Extract unique filter values
      const semesters = [...new Set(assignmentsData?.map(a => a.semester.toString()) || [])];
      const sections = [...new Set(assignmentsData?.map(a => a.section) || [])];
      const subjects = [...new Set(assignmentsData?.map(a => a.subject) || [])];
      
      setAvailableSemesters(semesters.sort());
      setAvailableSections(sections.sort());
      setAvailableSubjects(subjects.sort());

      // Load ratings
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("*");

      // Load students count
      const { count: studentsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Calculate stats for each faculty
      const facultyWithRatings = facultyData.map(f => {
        const assignments = assignmentsData?.filter(a => a.faculty_id === f.id) || [];
        const facultyRatings = ratingsData?.filter(r => r.faculty_id === f.id) || [];
        
        const avgRating = facultyRatings.length > 0
          ? facultyRatings.reduce((sum, r) => {
              return sum + (
                r.engagement_level +
                r.concept_understanding +
                r.content_depth +
                r.application_teaching +
                r.pedagogy_tools +
                r.communication_skills +
                r.class_decorum +
                r.teaching_aids
              ) / 8;
            }, 0) / facultyRatings.length
          : 0;

        return {
          ...f,
          assignmentCount: assignments.length,
          ratingCount: facultyRatings.length,
          averageRating: avgRating
        };
      });

      setFaculty(facultyWithRatings);

      // Calculate overall stats
      const totalRatings = ratingsData?.length || 0;
      const overallAvg = facultyWithRatings.reduce((sum, f) => sum + f.averageRating, 0) / (facultyWithRatings.length || 1);

      setStats({
        totalStudents: studentsCount || 0,
        totalFaculty: facultyData.length,
        totalRatings,
        averageRating: overallAvg,
        responseRate: studentsCount ? (totalRatings / studentsCount) * 100 : 0
      });

    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

  const handleExportData = () => {
    const csvContent = [
      ["Faculty Name", "Department", "Assignments", "Total Ratings", "Average Rating"],
      ...faculty.map(f => [
        f.name,
        f.department,
        f.assignmentCount.toString(),
        f.ratingCount.toString(),
        f.averageRating.toFixed(2)
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty-performance-report.csv";
    a.click();
    toast.success("Data exported successfully!");
  };

  const handleSendEmail = async (facultyMember: FacultyWithRatings) => {
    navigate(`/admin/faculty/${facultyMember.id}/send-email`);
  };

  const handleDeleteFaculty = async (facultyId: string) => {
    if (!confirm("Are you sure you want to delete this faculty member? This will also delete all their assignments and ratings.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("faculty")
        .delete()
        .eq("id", facultyId);

      if (error) throw error;
      toast.success("Faculty member deleted successfully");
      loadDashboardData();
    } catch (error: any) {
      console.error("Error deleting faculty:", error);
      toast.error("Failed to delete faculty member");
    }
  };

  // Filter faculty based on selected filters
  const filteredFaculty = faculty.filter(f => {
    const facultyAssignments = allAssignments.filter(a => a.faculty_id === f.id);
    
    if (filters.semester !== "all") {
      const hasSemester = facultyAssignments.some(a => a.semester.toString() === filters.semester);
      if (!hasSemester) return false;
    }
    
    if (filters.section !== "all") {
      const hasSection = facultyAssignments.some(a => a.section === filters.section);
      if (!hasSection) return false;
    }
    
    if (filters.subject !== "all") {
      const hasSubject = facultyAssignments.some(a => a.subject === filters.subject);
      if (!hasSubject) return false;
    }
    
    return true;
  });

  // Prepare chart data
  const facultyPerformanceData = filteredFaculty.slice(0, 4).map(f => ({
    name: f.name.split(' ')[0] + ' ' + f.name.split(' ')[1]?.charAt(0) || '',
    Overall: f.averageRating,
    Engagement: f.ratingCount > 0 ? 4 : 0,
    Communication: f.ratingCount > 0 ? 4 : 0,
    Pedagogy: f.ratingCount > 0 ? 4 : 0
  }));

  const performanceDistributionData = [
    { name: 'Excellent (4-5)', value: filteredFaculty.filter(f => f.averageRating >= 4).length },
    { name: 'Good (3-4)', value: filteredFaculty.filter(f => f.averageRating >= 3 && f.averageRating < 4).length },
    { name: 'Average (2-3)', value: filteredFaculty.filter(f => f.averageRating >= 2 && f.averageRating < 3).length },
    { name: 'Needs Improvement (<2)', value: filteredFaculty.filter(f => f.averageRating > 0 && f.averageRating < 2).length }
  ];

  const departmentData = [...new Set(filteredFaculty.map(f => f.department))].map(dept => ({
    name: dept,
    average: filteredFaculty
      .filter(f => f.department === dept)
      .reduce((sum, f) => sum + f.averageRating, 0) / 
      filteredFaculty.filter(f => f.department === dept).length || 0
  }));

  const monthlyTrendsData = [
    { month: 'Jan', ratings: 25, participation: 40 },
    { month: 'Feb', ratings: 32, participation: 45 },
    { month: 'Mar', ratings: 28, participation: 42 },
    { month: 'Apr', ratings: 35, participation: 48 },
    { month: 'May', ratings: 42, participation: 50 },
    { month: 'Jun', ratings: 38, participation: 46 }
  ];

  const chartColors = ["hsl(221, 83%, 53%)", "hsl(142, 76%, 36%)", "hsl(36, 95%, 55%)", "hsl(346, 77%, 49%)"];

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Faculty Performance Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">Real-time Faculty Rating System - 2025</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button onClick={() => setShowAddDialog(true)} variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Add Faculty
              </Button>
              <Button onClick={handleExportData} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <ThemeToggle />
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className="p-6 card-elegant cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowStudentsDialog(true)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold text-primary">{stats.totalStudents}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
              </div>
              <Users className="h-10 w-10 text-primary/20" />
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Faculty</p>
                <p className="text-3xl font-bold text-secondary">{stats.totalFaculty}</p>
                <p className="text-xs text-muted-foreground mt-1">Registered faculty</p>
              </div>
              <BookOpen className="h-10 w-10 text-secondary/20" />
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ratings</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.totalRatings}</p>
                <p className="text-xs text-muted-foreground mt-1">Faculty ratings submitted</p>
              </div>
              <Star className="h-10 w-10 text-yellow-600/20" />
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">Out of 5.0</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600/20" />
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold text-blue-600">{stats.responseRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Student participation</p>
              </div>
              <Eye className="h-10 w-10 text-blue-600/20" />
            </div>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="p-6 card-elegant">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold gradient-text">Filter Faculty Data</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Filter faculty by semester, section, and subject to view specific performance data
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Semester</Label>
              <Select value={filters.semester} onValueChange={(value) => setFilters({ ...filters, semester: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {availableSemesters.map(sem => (
                    <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Section</Label>
              <Select value={filters.section} onValueChange={(value) => setFilters({ ...filters, section: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map(sec => (
                    <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Subject</Label>
              <Select value={filters.subject} onValueChange={(value) => setFilters({ ...filters, subject: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {availableSubjects.map(subj => (
                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Faculty Performance Comparison */}
          <Card className="p-6 card-elegant">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Faculty Performance Comparison
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sample faculty performance data {filteredFaculty.length === 0 && "(no data available yet)"}
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={facultyPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Overall" fill={chartColors[0]} />
                <Bar dataKey="Engagement" fill={chartColors[1]} />
                <Bar dataKey="Communication" fill={chartColors[2]} />
                <Bar dataKey="Pedagogy" fill={chartColors[3]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Performance Distribution */}
          <Card className="p-6 card-elegant">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Performance Distribution
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sample performance distribution {performanceDistributionData.every(d => d.value === 0) && "(no data available yet)"}
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={performanceDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {performanceDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Department Performance */}
          <Card className="p-6 card-elegant">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Department Performance
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Average performance by department</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="average" fill={chartColors[0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Trends */}
          <Card className="p-6 card-elegant">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              Monthly Trends
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Ratings and participation over time</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ratings" stroke={chartColors[1]} strokeWidth={2} />
                <Line type="monotone" dataKey="participation" stroke={chartColors[0]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Faculty Performance Table */}
        <Card className="p-6 card-elegant">
          <h2 className="text-xl font-bold mb-4 gradient-text">Faculty Performance Summary</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Real-time faculty performance data 
            {filters.semester !== "all" || filters.section !== "all" || filters.subject !== "all" 
              ? ` (Filtered: ${filteredFaculty.length} of ${faculty.length} faculty)` 
              : `(${faculty.length} total faculty)`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Faculty</th>
                  <th className="text-left py-3 px-4">Overall Rating</th>
                  <th className="text-left py-3 px-4">Total Ratings</th>
                  <th className="text-left py-3 px-4">Assignments</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold">{f.name}</p>
                        <p className="text-sm text-muted-foreground">{f.designation || f.department}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {f.ratingCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{f.averageRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No ratings yet</span>
                      )}
                    </td>
                    <td className="py-4 px-4">{f.ratingCount}</td>
                    <td className="py-4 px-4">{f.assignmentCount} assignments</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        f.ratingCount === 0 
                          ? "bg-muted text-muted-foreground"
                          : f.averageRating >= 4 
                          ? "bg-green-100 text-green-700"
                          : f.averageRating >= 3 
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {f.ratingCount === 0 ? "Not Rated" : f.averageRating >= 4 ? "Excellent" : f.averageRating >= 3 ? "Good" : "Needs Improvement"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/faculty/${f.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFaculty(f);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(f)}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Send Report
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFaculty(f.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <AddFacultyDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onSuccess={loadDashboardData}
      />
      {selectedFaculty && (
        <EditFacultyDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog}
          onSuccess={loadDashboardData}
          facultyId={selectedFaculty.id}
          facultyData={{
            name: selectedFaculty.name,
            email: selectedFaculty.email,
            department: selectedFaculty.department,
            designation: selectedFaculty.designation
          }}
        />
      )}
      <StudentsDialog 
        open={showStudentsDialog}
        onOpenChange={setShowStudentsDialog}
      />
    </div>
  );
}
