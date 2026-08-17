-- Corrigir função recém-criada para ter search_path fixo
CREATE OR REPLACE FUNCTION public.update_instagram_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;;
