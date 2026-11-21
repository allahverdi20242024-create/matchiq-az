# Futbol məlumatı mənbələri

Sənədlər 20 noyabr 2026-da yoxlanılıb. Canlı yoxlama açarsız OpenFootball sinxronlaşdırmasını əhatə edib.

| Mənbə | Pulsuz giriş və əhatə | Tətbiq |
| --- | --- | --- |
| [football-data.org](https://www.football-data.org/coverage) | [Pulsuz planda](https://www.football-data.org/pricing) 12 yarış və dəqiqədə 10 sorğu. Hədəf siyahısından İngiltərə Premyer Liqası, La Liqa, A Seriyası, Bundesliqa, Liqa 1 və Çempionlar Liqası göstərilir. Azərbaycan Premyer Liqası pulsuz siyahıda yoxdur. | Server açarı olduqda [v4 yarış oyunları](https://docs.football-data.org/general/v4/competition.html) sorğusu üstün tutulur. Hesabın mövsümə faktiki icazəsi sorğu zamanı müəyyən edilir. |
| [OpenFootball](https://github.com/openfootball/football.json) | Açar tələb etməyən CC0 mövsüm JSON faylları. İngiltərə, İspaniya, İtaliya, Almaniya və Fransa yüksək liqaları üçün 2026/27 faylları yoxlanılıb. | Beş yerli Avropa liqası üçün açarsız mənbə və ehtiyat variant. Tarixlər saxlanılır. Təsdiqlənmiş UTC başlama vaxtı olmadıqda dəqiq saat göstərilmir, eyni günün tarixli oyunları isə qarşıdakı oyun siyahısından çıxarılır. |
| [API-Football](https://www.api-football.com/coverage) | Azərbaycan Premyer Liqası kataloqda göstərilir. [Pulsuz plan](https://www.api-football.com/pricing) gündə 100 sorğuya icazə verir və mövsümləri məhdudlaşdırır. | Server açarı olduqda [v3](https://www.api-football.com/documentation-v3) vasitəsilə liqa və mövsüm axtarılır və sonra oyunlar oxunur. Hər iki cavab təsdiqlənənədək aktual Azərbaycan əhatəsi mövcud sayılmır. |

Məlumat yarış və mövsüm üzrə bir mənbədən saxlanılır. Fərqli mənbələrin komanda identifikatorları qarışdırılmır. Müvəqqəti nasazlıq zamanı son uğurlu məlumat saxlanılır, səkkiz saat sonra isə köhnəlmiş kimi göstərilir. Yeni mövsüm üçün mövcud məlumat boş ola bilər. Rəsmi liqa cədvəlləri hələ qoşulmayıb.

## Klub loqoları

Aşağıdakı klub loqoları şəffaf WebP formatında saxlanılır. Klub nişanları komandaları tanımaq üçün istifadə olunur.

| Fayl | Mənbə və hüquq məlumatı |
| --- | --- |
| bayern-munchen.webp | FC Bayern München, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:FC_Bayern_M%C3%BCnchen_logo_(2017).svg), ictimai mülkiyyət |
| fc-koln.webp | 1. FC Köln, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wappen_1_FC_Koeln.svg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). WebP çevirməsi də CC BY-SA 4.0 şərtləri ilə paylanır. |
| estac-troyes.webp | ESTAC Troyes, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ESTAC_Troyes_Logo.svg), ictimai mülkiyyət |
| borussia-dortmund.webp | Borussia Dortmund, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Borussia_Dortmund_logo.svg), ictimai mülkiyyət |
| le-havre.webp | İstifadəçinin təqdim etdiyi Le Havre AC loqosu, 96 × 96 PNG faylından itkisiz WebP çevirməsi |

Bu cədvəl ilkin klub loqolarını göstərir. Bütün cari klub və yarış loqolarının müəllifləri, mənbələri və lisenziyaları saytın aşağı hissəsindəki “Loqo mənbələri və lisenziyaları” bölməsində göstərilir. Loqosu çatışmayan komandalar üçün klub adının baş hərfləri göstərilir.

## Klub loqolarının əhatəsi

[football-logos.cc](https://football-logos.cc/) kataloqundan alınan fayllar 192 × 192 şəffaf WebP formatında saxlanılır. Faylın klubla uyğunluğu və mənbə səhifəsi `src/lib/catalog-crests.json` faylında göstərilir. [Kataloqun qaydaları](https://football-logos.cc/license/) bu loqoları məlumat və qeyri-kommersiya məqsədləri üçün təqdim edir. Nişanlar öz klublarına və yarışlarına məxsusdur. Le Havre, İngiltərə Premyer Liqası, Bundesliqa və Liqa 1 üçün istifadəçinin təqdim etdiyi fayllara üstünlük verilir.

20 noyabr 2026 tarixində OpenFootball-dan gələn beş aktiv liqanın 96 komandasının hamısı cədvəldə loqo ilə yoxlanılıb. Azərbaycan Premyer Liqasının və kataloqda uyğunlaşdırılmış Azərbaycan klublarının loqoları hazırlanıb. Azərbaycan liqasının cari oyun məlumatı ayrıca provayder təsdiqi tələb edir.
