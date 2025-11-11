import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Loader2, Send, MessageSquare, X, Filter, Trash2, Search, Edit } from "lucide-react";
import { toast } from "sonner";
import { EditStudentDialog } from "@/components/EditStudentDialog";

interface Student {
  id: string;
  full_name: string;
  registration_number: string;
  year: number;
  semester: number;
  section: string;
  branch: string;
  phone_number: string | null;
  created_at: string;
  email?: string;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export function StudentsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter states
  const [filters, setFilters] = useState({
    semester: "all",
    section: "all",
    branch: "all"
  });
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open]);

  useEffect(() => {
    // Apply filters and search
    let filtered = [...students];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.full_name.toLowerCase().includes(query) ||
        s.registration_number.toLowerCase().includes(query) ||
        s.branch.toLowerCase().includes(query)
      );
    }
    
    if (filters.semester && filters.semester !== "all") {
      filtered = filtered.filter(s => s.semester === parseInt(filters.semester));
    }
    if (filters.section && filters.section !== "all") {
      filtered = filtered.filter(s => s.section === filters.section);
    }
    if (filters.branch && filters.branch !== "all") {
      filtered = filtered.filter(s => s.branch === filters.branch);
    }
    
    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, students, searchQuery]);

  useEffect(() => {
    if (!open) return;

    // Set up realtime subscription for new students
    const channel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Fetch students with emails via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-students-with-emails`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load students');
      }
      
      const studentsData = result.students as Student[] || [];
      setStudents(studentsData);
      setFilteredStudents(studentsData);

      // Extract unique filter values
      if (studentsData.length > 0) {
        const semesters = [...new Set(studentsData.map(s => s.semester))].sort((a, b) => a - b);
        const sections = [...new Set(studentsData.map(s => s.section))].sort();
        const branches = [...new Set(studentsData.map(s => s.branch))].sort();
        
        setAvailableSemesters(semesters);
        setAvailableSections(sections);
        setAvailableBranches(branches);
      }
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    loadMessages(student.id);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedStudent) return;

    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          admin_id: user.id,
          student_id: selectedStudent.id,
          message: messageText
        });

      if (error) throw error;

      toast.success("Message sent successfully!");
      setMessageText("");
      loadMessages(selectedStudent.id);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const clearFilters = () => {
    setFilters({ semester: "all", section: "all", branch: "all" });
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student? This will also delete all their ratings and messages.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-student`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete student');
      }
      
      toast.success("Student deleted successfully");
      loadStudents();
      
      // Close message panel if deleted student was selected
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
      }
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student: " + error.message);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditDialog(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Student Management</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Students List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, registration number, or branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4" />
                <h3 className="font-semibold">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto"
                >
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Semester</Label>
                  <Select value={filters.semester} onValueChange={(value) => setFilters({ ...filters, semester: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {availableSemesters.map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Section</Label>
                  <Select value={filters.section} onValueChange={(value) => setFilters({ ...filters, section: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All" />
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
                  <Label className="text-xs">Branch</Label>
                  <Select value={filters.branch} onValueChange={(value) => setFilters({ ...filters, branch: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {availableBranches.map(branch => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-auto flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Year/Sem</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((student) => (
                        <TableRow 
                          key={student.id}
                          className={selectedStudent?.id === student.id ? "bg-muted" : ""}
                        >
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="text-sm">{student.email || 'N/A'}</TableCell>
                          <TableCell>{student.registration_number}</TableCell>
                          <TableCell>{student.branch}</TableCell>
                          <TableCell>Y{student.year}/S{student.semester}</TableCell>
                          <TableCell>{student.section}</TableCell>
                          <TableCell>{student.phone_number || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectStudent(student)}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Message
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteStudent(student.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No students found matching your criteria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedStudents.length} of {filteredStudents.length} students
                {filteredStudents.length !== students.length && ` (filtered from ${students.length} total)`}
              </div>
              
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>

          {/* Message Panel */}
          {selectedStudent && (
            <Card className="w-96 flex flex-col">
              <div className="p-4 border-b flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{selectedStudent.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.registration_number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudent(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="bg-muted p-3 rounded-lg">
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t space-y-2">
                <Textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="w-full"
                >
                  {sendingMessage ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Send Message</>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <EditStudentDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          student={editingStudent}
          onSuccess={loadStudents}
        />
      </DialogContent>
    </Dialog>
  );
}
