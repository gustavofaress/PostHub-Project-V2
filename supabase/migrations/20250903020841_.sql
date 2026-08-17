-- Fix stripe_customers table security vulnerability
-- Remove the overly permissive policy and replace with secure ones

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "edge_functions_full_access" ON public.stripe_customers;

-- The existing "users_select_own_data" policy is good, keep it

-- Create secure policies for stripe_customers table
CREATE POLICY "Users can insert their own customer data" 
ON public.stripe_customers 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own customer data" 
ON public.stripe_customers 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own customer data" 
ON public.stripe_customers 
FOR DELETE 
USING (user_id = auth.uid());

-- Allow service role (for edge functions) to manage all stripe customers
CREATE POLICY "Service role full access to stripe customers" 
ON public.stripe_customers 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow admins to manage stripe customers if needed
CREATE POLICY "Admins can manage stripe customers" 
ON public.stripe_customers 
FOR ALL 
USING (public.is_current_user_admin()) 
WITH CHECK (public.is_current_user_admin());;
