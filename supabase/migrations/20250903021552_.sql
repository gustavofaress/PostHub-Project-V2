-- CRITICAL SECURITY FIX: Fix RLS policies on usuarios table
-- First, let's check and drop existing policies more carefully

-- Drop any policies that might exist (ignore errors if they don't exist)
DO $$ 
BEGIN
    -- Drop all existing policies on usuarios table safely
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read all users data" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update all users data" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Service role can do all operations" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own data" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own record" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can read their own data" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own data" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own record" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own record" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own data only" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own data only" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own record only" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Verified admins can view all users" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Verified admins can update all users" ON public.usuarios';
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON public.usuarios';
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors from non-existent policies
END $$;

-- Now create new secure policies
-- Policy for users to view their own data only
CREATE POLICY "secure_users_select_own"
ON public.usuarios 
FOR SELECT 
USING (auth.uid() = id);

-- Policy for users to update their own data only  
CREATE POLICY "secure_users_update_own"
ON public.usuarios 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy for new user registration (insert)
CREATE POLICY "secure_users_insert_own"
ON public.usuarios 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Admin policy for viewing all users (restricted to verified admins only)
CREATE POLICY "secure_admin_select_all"
ON public.usuarios 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.is_admin = true
  )
);

-- Admin policy for updating users (restricted to verified admins only)
CREATE POLICY "secure_admin_update_all"
ON public.usuarios 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.is_admin = true
  )
);

-- Service role access (for edge functions and backend operations)
CREATE POLICY "secure_service_role_access"
ON public.usuarios 
FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');;
