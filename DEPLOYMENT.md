# Yerləşdirmə

## Birinci mərhələ

Yerli inkişaf üçün `npm ci` və `npm run dev` işlədin. İstehsal rejimini yoxlamaq üçün `npm run build` və `npm start` işlədin.

Vercel üçün layihənin kök qovluğu repozitoriyanın kökü, çərçivə isə Next.js olacaq. Hazırkı nümayiş üçün məxfi açarlar tələb olunmur. Bu mərhələ yerli interfeys üzərində tamamlanır.

## Sonrakı mərhələlər

FastAPI və PostgreSQL əlavə edildikdən sonra Docker Compose konfiqurasiyası hazırlanacaq. Python hostunun pulsuz plan hədləri və PostgreSQL/Supabase şərtləri həmin mərhələdə yoxlanılacaq. Provayder açarları server mühitində saxlanacaq.

## İkinci mərhələ üçün Docker Compose

1. `.env.example` faylını `.env` kimi kopyalayın.
2. `POSTGRES_PASSWORD` dəyəri seçin və `DATABASE_URL` dəyərini `postgresql://matchiq:<kodlaşdırılmış-şifrə>@db:5432/matchiq` formasında doldurun.
3. Lazımdırsa provayder açarlarını server mühitinə əlavə edin. Açarsız rejim OpenFootball istifadə edir.
4. `docker compose up --build` işlədin. API `127.0.0.1:8000` ünvanında əlçatan olur. Frontend yerli terminalda ayrıca işləyir.

Docker olmadan backend üçün mühit dəyişənləri prosesi başladan terminalda təyin edilməlidir. `DATABASE_URL` verilmədikdə yenidən başlatmada təmizlənən yaddaş keşi işləyir. Bir Uvicorn prosesi işlədin. Ümumi açar bir neçə instansiyada istifadə edilərsə limitlər ayrıca koordinasiya edilməlidir. Vercel-də `MATCHIQ_API_URL` dəyərini əlçatan Python backend ünvanına yönəldin. Bulud planları bu mərhələdə seçilməyib.

## Simulyasiya keşinin saxlanması

Yerli API standart olaraq `backend/.matchiq-cache/simulations.sqlite3` faylından istifadə edir. `SIMULATION_CACHE_PATH` alternativ yazıla bilən yol təyin edir. `DATABASE_URL` mövcud olduqda simulyasiya nəticələri həmin PostgreSQL bazasında saxlanılır. Yerli keş faylları Git-ə daxil edilmir.

## GitHub Actions və buludda yayımlama

GitHub Actions frontend yoxlamalarını, PostgreSQL 17 ilə saxlanma və paralel keş sınağını və Docker Compose sağlamlıq yoxlamasını işlədir. `TEST_POSTGRES_DSN` dəyişəni yalnız ayrılmış test bazası üçün istifadə edilməlidir.

Backend üçün `render.yaml` faylı Render Free xidmətini müəyyən edir. Render layihəsini qoşarkən ayrıca Supabase PostgreSQL bağlantısını `DATABASE_URL` kimi xidmətin məxfi dəyişənlərində saxlayın. Supabase-in IPv4 dəstəkli sessiya pooler-i istifadə edilə bilər. Vercel layihəsinə repozitoriyanı Next.js formatında qoşun və `MATCHIQ_API_URL` dəyişəninə backend-in HTTPS ünvanını yazın. Futbol provayder açarları yalnız backend mühitinə əlavə edilir.

Render Free xidməti boş qaldıqda yatıma keçir. Yatım ərzində planlı sinxronlaşdırma işləmir və ilk sorğu xidmətin oyanmasını gözləyə bilər. Render-in pulsuz PostgreSQL bazası 30 gündən sonra bitdiyi üçün davamlı saxlanma üçün ayrıca PostgreSQL bağlantısı nəzərdə tutulur.

## Liqa cədvəlləri

`FOOTBALL_DATA_TOKEN` qoşulanda İngiltərə Premyer Liqası, La Liqa, A Seriyası, Bundesliqa və Liqa 1 üçün cədvəl football-data.org-un mövsüm üzrə ümumi cədvəlindən götürülür. Mənbə cədvəli təqdim etmədikdə komanda nəticələri görünür, xal cədvəli isə əlçatan kimi göstərilmir.
