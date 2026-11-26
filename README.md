# MatchIQ AZ

Azərbaycan dilində oyunöncəsi futbol analitikası üçün interfeys. Birinci mərhələ uydurma komandalar, oyunlar və göstəricilərdən ibarət, açıq şəkildə işarələnmiş nümayiş məlumatlarından istifadə edir.

## Yerli işə salma

Node.js 22 və ya daha yeni versiya tələb olunur.

```sh
npm ci
npm run dev
```

Brauzerdə [yerli idarə panelini](http://localhost:3000) açın. Mühit dəyişənləri tələb olunmur.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:routes
```

Əlavə məlumat üçün [arxitektura](ARCHITECTURE.md), [mərhələ vəziyyəti](PROGRESS.md) və [yerləşdirmə](DEPLOYMENT.md) sənədlərinə baxın.

## Real oyun məlumatı

Python 3.13 ilə layihənin kökündə virtual mühit yaradın və API-ni başladın. Windows PowerShell üçün:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
Set-Location backend
../.venv/Scripts/python.exe -m uvicorn matchiq.main:app --host 127.0.0.1 --port 8000
```

Frontend ayrıca terminalda işə salınır. [Real oyunlar](http://localhost:3000/real-oyunlar) bölməsi OpenFootball-dan açarsız sinxronlaşdırma bitdikdən sonra doldurulur. Eyni Python terminalında avtomatik test üçün `../.venv/Scripts/python.exe -m pytest -q` işlədin. Açarlar və PostgreSQL üçün [yerləşdirmə](DEPLOYMENT.md), yarış əhatəsi üçün [mənbələr](DATA_PROVIDERS.md) sənədinə baxın.
