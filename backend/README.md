# Veteriner Akademi — Study Platform API

Bu klasör, üniversite ara sınav/final hazırlık sistemi için Python/Flask API temelidir. Aktif hatırlama, aralıklı tekrar, çalışma takvimi, Pomodoro kayıtları, notlar ve JSON tabanlı zihin haritaları klasik algoritmalarla çalışır. **Bu backend'de yapay zekâ, LLM veya AI API kullanılmaz.**

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

`.env` dosyasındaki `SECRET_KEY` değerini uzun, rastgele ve gizli bir değerle değiştir. Ardından veritabanı tablolarını oluştur:
```bash
flask --app run.py db init
flask --app run.py db migrate -m "initial schema"
flask --app run.py db upgrade
python run.py
```

İlk migration için `db init` yalnızca bir kez çalıştırılır. Migration dosyaları repoda tutulmalıdır. Sağlık kontrolü: `GET /api/health`.

## İlk API uçları
- `POST /api/auth/register` — e-posta ve en az 10 karakterli şifreyle kayıt.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — sunucu oturumu.
- `PUT /api/flashcards/review` — `{ "flashcard_id": 12, "rating": 1 | 3 | 5 }`; `next_review_date` hesaplanır.
- `POST /api/schedule/generate` — `{ "subject_id": 1, "exam_date": "2026-12-20", "topic_ids": [1,2,3] }`.
- `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` — takvim ve ilerleme yüzdeleri.
- `POST /api/pomodoro/save` — `{ "topic_id": 1, "duration_minutes": 25, "started_at": "2026-10-27T10:00:00Z", "ended_at": "2026-10-27T10:25:00Z" }`.
- `POST /api/mindmaps` — `{ "title": "...", "topic_id": 1, "data": { "nodes": [{"id":"n1","x":100,"y":80,"text":"Ana kavram"}], "edges": [] } }`.
- `PUT /api/mindmaps/<id>` — aynı JSON yapısını kaydeder.

Tüm kişisel veri uçları oturum açmayı gerektirir. Kullanıcı kimliği istek gövdesinden alınmaz; oturumdan belirlenir. Her ders/konu/kart sorgusu sahiplik açısından kontrol edilir. Şifreler düz metin değil, Werkzeug hash'i olarak saklanır.

## Mimari notları
- `app/models.py`: Users, Subjects, Topics, Flashcards, StudySessions, CalendarEntries, Notes, MindMaps ilişkisel tabloları.
- `app/services/spaced_repetition.py`: SM-2'den esinlenen deterministik aralıklı tekrar hesabı.
- `app/routes/api.py`: özellik bazlı API uçları. İlerleyen aşamada bu dosya `auth.py`, `flashcards.py`, `schedule.py`, `pomodoro.py` ve `mindmaps.py` blueprint'lerine ayrılmalıdır.
- `app/config.py`: çevre değişkenleri ve veritabanı ayarı.

## Yayına almadan önce
Bu ilk aşama backend iskeletidir; üretim dağıtımı öncesinde CSRF koruması (oturum tabanlı yazma istekleri), güvenli cookie ayarları, HTTPS, hız sınırlama, e-posta doğrulama/şifre sıfırlama, migration gözden geçirmesi, yedekleme ve otomatik testler tamamlanmalıdır. `SECRET_KEY` veya veritabanı parolası GitHub'a eklenmemelidir.

## GitHub Pages hakkında
GitHub Pages yalnızca statik dosya sunar; Flask çalıştıramaz. Mevcut HTML/CSS/JS arayüzü GitHub Pages'te kalacaksa Flask API ayrı bir Python servisine dağıtılmalı ve yalnızca izin verilen frontend origin'ine CORS açılmalıdır. Daha sade üretim mimarisi, Flask'ın frontend'i ve `/api` uçlarını aynı origin'den sunmasıdır. Bu PR, mevcut statik siteyi otomatik olarak Flask'a taşımış veya canlı API dağıtmış değildir.
