# Veteriner Akademi Platformu

Veteriner fakültesi öğrencileri için dijital ders, not, sınav ve tekrar çalışma alanı.

## Proje yapısı

Arayüz, stil ve uygulama kodları tek dosyada toplanmaz. Her sistem kendi dosyasında tutulur.

```text
/
├── index.html
├── css/
│   ├── base.css
│   ├── dashboard.css
│   ├── courses.css
│   ├── exams.css
│   ├── notes.css
│   ├── flashcards.css
│   ├── focus-timer.css
│   ├── settings.css
│   ├── quiz.css
│   ├── review.css
│   ├── auth.css
│   ├── note-reader.css
│   ├── shared-library.css
│   ├── content-management.css
│   └── admin.css
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


## Flask API bağlantı köprüsü

Arayüzde `js/config.js` ve `js/modules/study-api.js` eklendi. Bu köprü Flask API için modüler Fetch yardımcıları sağlar (sağlık kontrolü, oturum, kişisel notlar, flash kart tekrar puanı ve çalışma planı). **Varsayılan olarak kapalıdır**; `js/config.js` içindeki `VETERINER_AKADEMI_API_URL` boş bırakılırsa mevcut Supabase akışı değişmez. API dağıtıldıktan sonra buraya Render HTTPS origin'i yazılabilir.

Bu, mevcut ekranların veri kaynağını otomatik olarak Flask'a taşımış değildir. Supabase kimlik doğrulamasını ve `student_workspaces` senkronizasyonunu değiştirmek; veri eşleme, hesap geçişi ve uçtan uca doğrulama gerektirir. Bu nedenle canlı öğrenci verisini sessizce başka backend'e yönlendirmemek için geçiş açıkça opt-in bırakılmıştır.


Üniversite sınav hazırlığı için Flask API başlangıç mimarisi `backend/` altında geliştirilmektedir. Kurulum, endpoint sözleşmeleri ve GitHub Pages/Flask dağıtım ayrımı için [backend/README.md](backend/README.md) dosyasına bakın. Backend şu aşamada ayrı bir geliştirme dalındadır; canlı GitHub Pages sitesi kendiliğinden Flask API'ye bağlanmış değildir.

Üniversite sınav hazırlığı için Flask API başlangıç mimarisi `backend/` altında geliştirilmektedir. Kurulum, endpoint sözleşmeleri ve GitHub Pages/Flask dağıtım ayrımı için [backend/README.md](backend/README.md) dosyasına bakın. Backend şu aşamada ayrı bir geliştirme dalındadır; canlı GitHub Pages sitesi kendiliğinden Flask API'ye bağlanmış değildir.
