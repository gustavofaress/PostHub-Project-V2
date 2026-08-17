-- Adicionar foreign key constraint para customer_id referenciar usuarios.id
ALTER TABLE public.instagram_metrics 
ADD CONSTRAINT fk_instagram_metrics_customer_id 
FOREIGN KEY (customer_id) REFERENCES public.usuarios(id) 
ON DELETE CASCADE;;
