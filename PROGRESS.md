# Layihənin vəziyyəti

## Tamamlanmış işlər

- Mövsüm proqnozu bölməsi. Son nəticələrdən və ya seçilən tamamlanmış turdan başlayaraq qalan təqvim istifadəçinin seçdiyi 1–100 000 sınaqla simulyasiya olunur. Çempionlar Liqası ağacında iki oyunun ümumi hesabları, finalın hesabı və kubok şəkli göstərilir.
- Tam təqvim yoxlanmadıqda proqnoz verilmir. Çempionlar Liqasının faktiki pley-off cütləri açıqlandıqdan sonra həmin cütlərlə canlı proqnoz hələ dəstəklənmir. Keçmiş tur proqnozları matç nəticələrindən hesablanır və keçmiş inzibati xal dəyişikliklərini əhatə etmir.

- Azərbaycan dilində idarə paneli, oyun siyahıları, oyun təhlili, komanda statistikası, tarixçə və metodologiya üçün nümayiş interfeysi.
- Real oyun təqvimi və nəticələr üçün ayrıca səhifə. Hər yarışın mənbəyi, sorğu vaxtı və köhnəlmə vəziyyəti göstərilir.
- FastAPI, üç məlumat adapteri, normallaşdırma, sorğu tezliyi həddi, planlı sinxronlaşdırma və yarış səviyyəsində ehtiyat mənbə.
- Lokal yaddaş keşi və seçimli PostgreSQL snapshot saxlanması. Docker Compose konfiqurasiyası yaradılıb.

- Real oyunlar ekranında istifadəçinin seçdiyi 1–100 000 sınaqla Monte Karlo hesablaması. Oyunöncəsi nəticələrdən hesablanan Puasson modeli üçün lokal nəticə keşi.

- Cari mövsüm üzrə xronoloji qiymətləndirmə, Brier göstəricisi, loqarifmik itki, kalibrləmə və liqa nəticələrinin tezliyinə əsaslanan baza modeli.
- Tarixçə səhifəsi və API 106 real OpenFootball oyunu ilə yerli yoxlamadan keçdi.

- Real komanda səhifəsində ev və səfər göstəriciləri, son beş nəticə və mövcud liqa nəticələrindən hesablanan xal cədvəli.

- İdarə panelinin görünüşü yeniləndi. Real oyunlar və analitika keçidləri önə çəkildi. Oyun kartı simulyasiya formasında həmin oyunu əvvəlcədən seçir.
- Edge yoxlamasında 320, 390 və 1440 piksel enlərdə panelin üfüqi daşması müşahidə olunmadı.

- Bu gün, sabah və qarşıdakı oyunlar səhifələrində real təqvim göstərilir. Dörd yoxlanmış klub loqosu yerli WebP faylı kimi əlavə edilib, qalan klublar üçün baş hərflər göstərilir.

- İdarə paneli, real təqvim, real komanda cədvəlləri, komanda statistikası, simulyasiya və proqnoz tarixçəsində klub və yarış nişanları göstərilir. İstifadəçinin təqdim etdiyi Le Havre AC faylı daxil olmaqla 110 klub və 7 yarış üçün yerli loqo faylı var. Beş aktiv liqanın bütün 96 komanda sətri Edge-də yoxlanılıb.

- Seçilmiş MatchIQ AZ loqosu əsas naviqasiyada yerləşdirildi. Köhnə komanda siyahısı real komandalara yönləndirilir.
- Real oyun təhlili səhifəsində komanda loqoları, tarix, mənbə, son forma və uyğun oyunlar üçün fərdi sınaq forması göstərilir.

- Simulyasiya nəticələri yerli SQLite və konfiqurasiya olduqda ortaq PostgreSQL keşində saxlanılır. SQLite paralel sorğu və proses yenidən başlaması ilə yoxlanılıb.

- GitHub Actions üçün frontend, PostgreSQL 17 və Docker Compose yoxlamaları əlavə edildi. Render Free üçün backend konfiqurasiyası hazırlandı.

- Azərbaycan və ingilis dili, açıq və tünd görünüş seçimləri əlavə edildi. Seçimlər səhifələr arasında və yeniləmədən sonra saxlanılır.

## Cari vəziyyət

OpenFootball vasitəsilə beş Avropa liqasının real məlumatı yerli API və veb səhifəsində yoxlanılıb. Azərbaycan Premyer Liqası və Çempionlar Liqası açarsız rejimdə əlçatan görünmür. Demo səhifələrinin ehtimalları simulyasiya nəticəsi deyil.

## Yoxlama

Python üzrə 19 test, Next.js üzrə 16 test, ESLint, TypeScript və istehsal yığımı. Yerli HTTP yoxlaması real oyun və nəticə sorğularını əhatə etdi.

## Məlum məhdudiyyətlər

- Docker bu mühitdə quraşdırılmayıb. Compose və PostgreSQL bağlantısı canlı yoxlanılmayıb.
- football-data.org və API-Football adapterləri test cavabları ilə yoxlanılıb. Canlı token və cari mövsüm icazəsi yoxlanılmayıb.
- OpenFootball qeydlərində təsdiqlənmiş UTC saatı yoxdursa yalnız tarix göstərilir. Nəticə arxivinin tamlığı mənbədən asılıdır.
- Planlı sinxronlaşdırma bir Uvicorn prosesi üçün nəzərdə tutulub.

## Gözləyən işlər

Cari mövsüm üçün Azərbaycan əhatəsini pulsuz açarla təsdiqləmək. Rəsmi liqa cədvəlləri, mövsümlərarası qiymətləndirmə, mənbə snapshot arxivi və yerləşdirmə.

## Növbəti addım

Təsdiqlənmiş provayder çıxışı olduqda rəsmi liqa cədvəllərini əlavə etmək və PostgreSQL inteqrasiyasını yoxlamaq.
