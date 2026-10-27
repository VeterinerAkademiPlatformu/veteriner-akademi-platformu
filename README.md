# Veteriner Akademi Platformu

Veteriner fakültesi öğrencileri için dijital ders, not, sınav ve tekrar çalışma alanı.

## Proje yapısı

Arayüz, stil ve uygulama kodları tek dosyada toplanmaz. Her sistem kendi dosyasında tutulur.

```text
/
├── index.html
├── css/
│   ├── base.css
│   ├── courses.css
│   ├── quiz.css
│   ├── review.css
│   ├── auth.css
│   ├── note-reader.css
│   ├── shared-library.css
│   ├── content-management.css
├── admin.css
│   └── settings.css
├── js/
│   ├── core.js
│   ├── core/
│   │   ├── shared-state.js
│   │   ├── render.js
│   │   ├── modal.js
│   │   └── events.js
│   └── modules/
│       ├── dashboard.js
│       ├── courses.js
│       ├── exams.js
│       ├── notes.js
│       ├── note-reader.js
│       ├── shared-library.js
│       ├── admin.js
│       ├── flashcards.js
│       ├── flashcard-session.js
│       ├── review.js
│       ├── questions.js
│       ├── focus-timer.js
│       ├── settings.js
│       ├── settings.js
│       └── auth.js
└── supabase/
    ├── SETUP.md
    ├── schema.sql
    └── shared_notes.sql
```

### Dosya sorumlulukları

- `js/core.js`: ortak yardımcılar, yerel kayıt ve uygulamanın temel başlangıç durumu.
- `js/core/`: ortak durum, ekran çizimi, modal ve genel olay yönlendirmesi.
- `js/modules/`: menü ve özellik bazlı uygulama kodları. `admin.js`, yönetim panelini; `settings.js`, kullanıcı hedeflerini ve odak süresini; `shared-library.js`, öğrenci ortak not kütüphanesini yönetir. Görsel tarafta `dashboard.css`, `exams.css`, `notes.css`, `flashcards.css` ve `focus-timer.css` ilgili sistemlerin stillerini taşır.
- `css/`: temel tasarım ve her özellik alanının stilleri.
- `index.html`: sayfa yapısı ve dosyaların yüklenme sırası.
- `supabase/`: veritabanı şeması ve kurulum belgeleri.

**Geliştirme kuralı:** Yeni bir menü veya sistem eklenirken mevcut büyük dosyalara yığmak yerine uygun modül ve stil dosyası oluştur. Dosyaların yüklenme sırası `index.html` içinde yönetilir; sıralama değiştirilirken bağımlılıklar kontrol edilmelidir.

## Supabase bağlantısı

Site, Supabase e-posta/şifre kimlik doğrulamasını, öğrenciye özel bulut çalışma alanını ve ortak ders kataloğunu kullanır. Öğrenci çalışma alanı `public.student_workspaces` tablosunda saklanır; RLS kullanıcıların yalnızca kendi kayıtlarına erişmesine izin verir. Ortak dersler ve konu ilerlemesi kendi tablolarını kullanır.

Tarayıcıda yalnızca yayınlanabilir API anahtarı kullanılmalıdır. `service_role` veya gizli anahtarlar istemci koduna konulmamalıdır.

Kurulum ve doğrulama notları: [`supabase/SETUP.md`](supabase/SETUP.md)  
Veritabanı şeması: [`supabase/schema.sql`](supabase/schema.sql)
