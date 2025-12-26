-- Drop the restrictive admin policy and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all ratings" ON public.ratings;

CREATE POLICY "Admins can view all ratings" 
ON public.ratings 
FOR SELECT 
USING (check_is_admin());

-- Also need to update the student view policy to be permissive
DROP POLICY IF EXISTS "Students can view their own ratings" ON public.ratings;

CREATE POLICY "Students can view their own ratings" 
ON public.ratings 
FOR SELECT 
USING (auth.uid() = student_id);