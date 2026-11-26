# Arxitektura

## Birinci mərhələ

- Next.js App Router və TypeScript səhifələri `src/app` qovluğundadır.
- `src/components` naviqasiya və kartları bir yerdə saxlayır. Şadcn/ui üslubunda nişan Tailwind ilə qurulur. Recharts qrafiki yalnız oyun təhlili səhifəsində istifadə olunur.
- `src/lib/demo.ts` uydurma məlumatları, tarix bölgüsünü və Bakı vaxtı formatını saxlayır. Nümunə tarixləri Bakı təqviminə görə sorğu zamanı hesablanır.
- `tests` tarix sərhədlərini və nümunə məlumatının daxili uyğunluğunu yoxlayır.

## Növbəti mərhələlər

FastAPI provayder inteqrasiyası və proqnoz alqoritmi üçün müstəqil sərhəd yaradacaq. Provayderlər vahid formata çevriləcək, mənbə və məlumat vaxtı saxlanacaq. Gələcək mobil müştərilər versiyalanmış API-dən istifadə edə biləcək.

Statistik mühərrik dəyişməz, oyunöncəsi girişlərdən işləyəcək. Saxlanmış proqnoz açarı oyun identifikatorunu, model versiyasını və statistik girişlərin izini birləşdirəcək. Tarixi sınaqlar hər oyun üçün yalnız əvvəlki məlumatları əldə edəcək.

## İkinci mərhələ

`backend/matchiq/providers.py` mənbələri vahid oyun sxeminə çevirir. Sinxronlaşdırma xidməti hər yarış üçün üstünlük sırasına əsasən mənbə seçir və yalnız uğurlu mövsüm görünüşünü saxlayır. Provayder sorğularını brauzer trafiki işə salmır.

`/v1/fixtures` qarşıdakı real oyunların, `/v1/fixtures?view=results` isə cari mövsümün məlum nəticələrinin oxunması üçündür. Veb müştəri sorğunu Next.js serverindən göndərir. API açarları Python prosesində saxlanılır. `/healthz` prosesin cavab verdiyini göstərir. Provayder və saxlama xətaları strukturlaşdırılmış hadisə qeydlərinə yazılır.

## Tarixi qiymətləndirmə

`GET /v1/evaluation` cari mövsüm yaddaşından nəticələri yarış üzrə təkrar oynadır. Hər tarixi oyun üçün sərhəd Bakı vaxtı ilə oyun gününün başlanğıcıdır. Eyni günün və sonrakı günlərin nəticələri modelə və baza proqnozuna daxil edilmir. Arxiv mənbəsi ilkin dərc vaxtını saxlamadığına görə bu, bugünkü snapshot üzrə retrospektiv sınaqdır.

Qiymətləndirmə istifadəçinin Monte Karlo sınaq sayından asılı deyil. Nəticə ehtimalları eyni Puasson modelinin paylanmasından hesablanır. Baza modeli əvvəlki liqa nəticələrinin tezliklərindən istifadə edir və hər nəticə növünə bir ilkin say əlavə edir. Ən azı 50 uyğun oyun olduqda model və baza üçün Brier göstəricisi və loqarifmik itki göstərilir. Modelin kalibrlənməsi nəticə növü üzrə 20 faiz bəndlik qruplarda müşahidə olunan tezliklə müqayisə edilir.

## Simulyasiya keşi

Simulyasiya açarı model versiyasını, oyun və komanda identifikatorlarını, oyun tarixini, təsdiqlənmiş vaxtı, gözlənilən qol parametrlərini və sınaq sayını əhatə edir. Eyni açarla ilkin hesablama vaxtı saxlanılır. Yenilənmiş girişlər yeni açar yaradır.

Yerli Python rejimində nəticələr SQLite faylında, DATABASE_URL təyin edildikdə PostgreSQL-də saxlanılır. Eyni açar üçün paralel qaçışlara tranzaksiya ilə nəzarət edilir. Yazı zamanı 14 gündən köhnə sətirlər təmizlənir və ən yeni 4096 sətir saxlanılır. Keş əlçatan olmayanda API hesablama üçün prosesdaxili keşdən istifadə edir.
