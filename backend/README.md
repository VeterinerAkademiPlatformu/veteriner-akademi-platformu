# Veteriner Akademi — Study Platform API

Bu klasör, üniversite ara sınav/final hazırlık sistemi için Python/Flask API temelidir. Aktif hatırlama, aralıklı tekrar, çalışma takvimi, Pomodoro kayıtları, notlar ve JSON tabanlı zihin haritaları klasik algoritmalarla çalışır. **Yapay zekâ, LLM veya AI API kullanılmaz.**

## Gereksinimler
- Python 3.11+
- Yerel geliştirme: SQLite
- Üretim: PostgreSQL ve `DATABASE_URL`

## Yerelde çalıştırma
```bash
cd backend
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

`.env` içindeki `SECRET_KEY` değerini uzun, rastgele ve gizli bir değerle değiştir. Ardından tabloları oluştur:
```bash
flask --app run.py db init
flask --app run.py db migrate -m "initial schema"
flask --app run.py db upgrade
python run.py
```
Başlangıç migration'ı `migrations/versions/0001_initial.py` içinde repoya eklenmiştir. Yeni ortamda `flask --app run.py db upgrade` komutuyla uygulanır. Yeni şema değişikliklerinde `flask --app run.py db migrate -m "açıklama"` ile migration üret, dosyayı gözden geçir ve repoya ekle. Sağlık kontrolü: `GET /api/health`.

## API uçları
- `GET /api/auth/csrf` — oturumla ilişkili CSRF token alır; tüm POST/PUT/DELETE istekleri `X-CSRFToken` başlığıyla bu token'ı göndermelidir.
- `POST /api/auth/register` — e-posta ve en az 10 karakterli şifreyle kayıt.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — sunucu oturumu.
- `PUT /api/flashcards/review` — `{ "flashcard_id": 12, "rating": 1 | 3 | 5 }`; `next_review_date` hesaplanır.
- `POST /api/schedule/generate` — `{ "subject_id": 1, "exam_date": "2026-12-20", "topic_ids": [1,2,3] }`.
- `POST /api/schedule/reschedule` — `{ "exam_date": "2026-12-20" }`; geciken ve gelecekteki tamamlanmamış planları kalan günlere dağıtır.
- `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` — takvim ve ilerleme yüzdeleri.
- `GET /api/notes`, `POST /api/notes`, `PUT /api/notes/<id>`, `DELETE /api/notes/<id>` — kişisel not işlemleri.
- `POST /api/pomodoro/save` — Pomodoro oturum kaydı.
- `POST /api/mindmaps`, `PUT /api/mindmaps/<id>` — JSON tabanlı zihin haritaları.

## Güvenlik ve tarayıcı bağlantısı
- CSRF koruması tüm güvenli olmayan HTTP metotlarında etkin; tarayıcı istemcileri önce `GET /api/auth/csrf` çağırıp token'ı `X-CSRFToken` ile göndermelidir. Örnek yardımcı: `frontend-example/api.js`.
- CORS yalnızca `CORS_ORIGINS` içinde açıkça listelenen origin'lere açılır. Birden fazla origin virgülle ayrılır; tam origin yazılır, yol eklenmez. Kimlik bilgili isteklerde `*` kullanılmaz.
- GitHub Pages arayüzü bu API'ye bağlanacaksa Render ortamında `CORS_ORIGINS=https://veterinerakademiplatformu.github.io`, `SESSION_COOKIE_SAMESITE=None` ve `SESSION_COOKIE_SECURE=true` ayarla. İsteklerde `credentials: "include"` kullanılmalı. API dağıtılmadan önce gerçek origin ve HTTPS davranışı doğrulanmalıdır.
- Genel API sınırı IP başına 50 istek/saat ve 200 istek/gün; kayıt ve giriş için ek olarak 5 istek/dakika sınırı uygulanır.
- Şifreler Werkzeug hash'iyle saklanır. Özel uçlar oturum açmayı gerektirir; sahiplik kontrolleri kullanıcı verilerini ayırır.
- Üretimde `FLASK_ENV=production`, güçlü `SECRET_KEY`, HTTPS ve `SESSION_COOKIE_SECURE=true` kullan. Birden çok worker için `RATELIMIT_STORAGE_URI` değerini Redis gibi ortak bir depoya ayarla; varsayılan bellek deposu tek süreç içindir.
- Üretim dağıtımında bağımlılıkları güncel tut, e-posta doğrulama/şifre sıfırlama, yedekleme, izleme ve veritabanı migration'larını ayrıca gözden geçir.

## Mimari
- `app/models.py`: kullanıcılar, dersler, konular, kartlar, çalışma oturumları, takvim kayıtları, notlar ve zihin haritaları.
- `app/services/spaced_repetition.py`: SM-2'den esinlenen deterministik aralıklı tekrar hesabı.
- `app/services/scheduler.py`: sınav öncesi plan üretimi ve tamamlanmamış işleri yeniden dağıtma.
- `app/routes/`: özellik bazlı Flask blueprint'leri.
- `frontend-example/`: mevcut Vanilla JS arayüzüne bağlamak için Fetch API örnekleri.

## Testler
`backend/` klasöründe `pytest -q` çalıştır. GitHub Actions backend testlerini ve statik arayüz için tarayıcı smoke testlerini çalıştırır.

## Yayına alma sınırı
Bu PR backend kodunu hazırlar ancak API'yi dağıtmaz ve canlı GitHub Pages arayüzüne bağlamaz. GitHub Pages Flask çalıştıramaz. Arayüz GitHub Pages'te kalacaksa API ayrı bir Python servisine dağıtılmalı; tam frontend origin'ine credentialed CORS açılmalı ve cross-site cookie gereksinimleri (HTTPS, `SameSite=None; Secure`) birlikte ayarlanmalıdır. Daha sade seçenek, Flask'ın arayüzü ve `/api` uçlarını aynı origin'den sunmasıdır. Canlı entegrasyon, dağıtım adresi ve güvenlik ayarları doğrulandıktan sonra yapılmalıdır.
