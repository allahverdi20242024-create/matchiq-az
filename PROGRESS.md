# Layihənin vəziyyəti

- Canlı Monte Karlo və cari mövsüm proqnozları uyğun klub cütləri üçün tarixli Sport Eden Elo ay sonu reytinqlərindən istifadə edir. Mənbə və lisenziya səhifələrdə göstərilir. Reytinq çatışmadıqda MatchIQ Elo tətbiq olunur. Tarixi qiymətləndirmə və arxiv modelinin versiyası ayrıca qalır.

## Xarici Elo sınağı — 28 noyabr 2026

`backend/research/elo_backtest.py` cari nəticələrdəki altı turnirin klublarını Sport Eden Elo klub identifikatorlarına uyğunlaşdırdı. Eyni 438 matç üzrə hazırkı Elo modelinin Brier xətası 0,60858, loqarifmik itkisi 1,01648 oldu. Oyun tarixindən əvvəlki və ən çox 62 günlük Sport Eden ay sonu xalları ilə nəticələr müvafiq olaraq 0,59098 və 0,99281 oldu. Çempionlar Liqasının 36 matçında göstəricilər 0,62763-dən 0,58587-yə və 1,02499-dan 0,97665-ə düşdü. Hər iki xarici reytinqi tapılan matçlar müqayisəyə daxil edildi. Bu, matç ehtimalları üçün retrospektiv sınaqdır. Xarici Elo canlı modelə qoşulmayıb.

## Elo ilə matç və mövsüm proqnozları

`poisson-elo-1` tamamlanmış oyunlardan turnir daxilində hesablanan Elo fərqini gözlənilən qollara tətbiq edir. Hər iki komanda üçün ən azı üç nəticə tələb olunur. 440 oyunlu eyni xronoloji müqayisədə Brier 0,60975-dən 0,60796-ya, loqarifmik itki 1,01772-dən 1,01557-yə düşdü.

## Rəqib gücü sınağı — 28 noyabr 2026

Yerli `poisson-3` namizədi və əvvəlki `poisson-2` modeli 2026/27 mövsümünün eyni 440 real oyunu üzrə xronoloji müqayisə edildi. Hər proqnoz yalnız əvvəlki günlərin nəticələrindən hesablandı. Brier göstəricisi 0,60975-dən 0,61097-yə, loqarifmik itki 1,01772-dən 1,01921-ə yüksəldi. Hər iki göstəricidə aşağı qiymət daha yaxşıdır. İngiltərə Premyer Liqası, Bundesliqa və Çempionlar Liqasında nəticə yaxşılaşdı. La Liqa, A Seriyası və Liqa 1-də zəiflədi. Namizəd canlıya çıxarılmayıb.

OpenFootball-un Çempionlar Liqası liqa mərhələsi arxivində hər mövsümdən 90 uyğun oyun eyni qayda ilə müqayisə edildi. 2024/25-də Brier 0,53327-dən 0,53740-a və loqarifmik itki 0,91081-dən 0,91596-ya yüksəldi. 2025/26-da Brier 0,63036-dan 0,62306-ya və loqarifmik itki 1,05233-dən 1,04049-a düşdü. Sınaq Elo sıralamasının təsirini ölçmür.

## Tamamlanmış işlər

- Oyun səhifəsində əvvəlki real nəticələrlə avtomatik öyrənən modelin və Puassonun oyunöncəsi ehtimalları yanaşı göstərilir. Xronoloji sınaq üçün ayrılmış oyunlarda hər iki model eyni nəticələrlə Brier göstəricisi və loqarifmik itki üzrə müqayisə olunur.

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

## Oyunöncəsi proqnoz tarixçəsi

- Planlı sinxronizasiya növbəti 48 saatın təsdiqlənmiş oyunları üçün ilk Puasson ehtimallarını qeydə alır. Faktiki hesab provayderdən gələndə eyni qeyd yenilənir.
- Oyunöncəsi qeydlər və tarixi təkrar sınaqlar ayrı göstərilir. Oyunöncəsi göstəricilər 50 təsdiqlənmiş nəticədən sonra görünür.
- Kalibrasiya modeli kifayət qədər qeydə alınmış nəticə toplandıqda onları xronoloji qaydada öyrənir. Yoxlama dövründə nəticəsi hələ məlum olmayan oyunlar təlimə daxil edilmir. Yeni kalibrasiya yalnız həm Brier, həm də loqarifmik itkidə baza modelini üstələdikdə tətbiq olunur.
- Arxivi xidmət yenidən başladıqda saxlamaq üçün backend-də `DATABASE_URL` qurulmalıdır. Yaddaş rejimində qeydlər yalnız cari prosesdə qalır.

## Premyer Liqa xG sınağı

`backend/research/footy_xg_backtest.py` 11footy-nin Premyer Liqa SQLite
buraxılışını yerli, yalnız oxunan rejimdə yoxlayır. Mənbə 11footy-dir
(CC BY-NC 4.0). Buraxılış faylını `SHA256SUMS` ilə yoxlayıb açın, sonra
repozitoriyanın kökündə `PYTHONPATH=backend` ilə
`python backend/research/footy_xg_backtest.py <baza.db> 2024 2025 2026`
işlədin. Hesabat hər mövsüm üzrə hər iki tərəfin xG əhatəsini, son tam
xG tarixini, son on oyunda boşluqları və xronoloji model müqayisəsini göstərir.

Cari mövsüm məlumatı üçün təsdiqlənmiş və vaxtında yenilənən mənbə tələb olunur.
Bu tədqiqat yolu istehsal proqnozlarına qoşulmayıb.
