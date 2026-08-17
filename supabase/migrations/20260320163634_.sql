ALTER TABLE public.editorial_calendar 
ADD COLUMN IF NOT EXISTS linked_approval_post_id uuid REFERENCES approval_posts(id) ON DELETE SET NULL;;
