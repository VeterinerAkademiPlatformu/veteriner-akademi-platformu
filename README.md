# Veteriner Akademi Platformu

Veteriner fakültesi öğrencileri için dijital ders, not, sınav ve tekrar çalışma alanı.

## Supabase bağlantısı
Site, Supabase e-posta/şifre kimlik doğrulamasını ve öğrenciye özel bulut çalışma alanını kullanacak şekilde bağlandı. Veriler `public.student_workspaces` tablosunda JSON çalışma alanı olarak saklanır; RLS kullanıcıların yalnızca kendi kayıtlarına erişmesine izin verir.

Kurulum ve doğrulama notları: [`supabase/SETUP.md`](supabase/SETUP.md)  
Veritabanı şeması: [`supabase/schema.sql`](supabase/schema.sql)

Tarayıcıda yalnızca yayınlanabilir API anahtarı kullanılır. `service_role` veya gizli anahtarlar istemci koduna konulmamalıdır.
