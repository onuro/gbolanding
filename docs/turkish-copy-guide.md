# Turkish copy guide for gbovision.com

Every Turkish string on the site is written against this file. Read the English for intent, then write the page as a Turkish copywriter would [MS §2.1.1]. Bracketed tags point to the sources at the end. Quotes from sources are verbatim, including their own apostrophes and spelling. "House call" marks a rule we chose ourselves where no source decides it.

## 1. Reader and tone

We write for law firms, banks, valuation firms, clinics and product teams: busy, literate readers wary of hype. The tone is corporate, clear and confident, never salesy. Say what the product does, then what that changes for the reader, in concrete, familiar words and real numbers [MS §3; Mikro: "taleplerinizin %80’ini ilk aramanızda çözüyoruz"]. Use plain current words ("hızla", "şu anda", "içinde", "böylece"), not stiff ones ("hızlı bir şekilde", "hâlihazırda", "içerisinde", "dolayısıyla") [MS §2.1.3]. No slogans or stock phrases. Turkcell's "dijital dönüşüm yolculuğunuzun her adımında yanınızdayız" is the pattern to avoid [Turkcell].

## 2. Person and voice

- **Reader = siz.** Imperatives end in -In ("inceleyin") and possessives in -InIz ("ekibiniz"). Never use "sen" [MS §4.1.13]. Never use the -InIz imperative ("seçiniz"), which Microsoft calls too serious and authoritative [MS §4.1.16]. "Her Zaman Her Yerde Logo Cloud Seninle" on a siz page is the failure [Logo Cloud].
- **Company = biz** in process, promises and FAQ answers [MS §2.2.2]. Use -iyoruz for work we are doing and the simple present for promises: "Verileriniz size aittir, biz de bunun böyle kalmasını sağlarız." [MS365 Copilot]; "taleplerinizin %80’ini ilk aramanızda çözüyoruz" [Mikro]. Definitions (about leads, meta descriptions) name the company in the third person: "iyzico, … bir finans teknolojileri kuruluşudur." [iyzico]. A paragraph never switches between third person and biz.
- **Product = third-person subject, simple present:** "Intelval belgeleri okur." Don't use the future ("okuyacak") [Google codelab: "Ürün davranışını açıklamak için geniş zamanı kullanın."]. The present continuous is also natural ("XProtect, virüsleri ve kötü amaçlı yazılımları otomatik olarak tespit edip kaldırıyor." [Apple Business]). Pick one per page. Keep "-mektedir" for fine print, as in "Siri AI, İngilizce dilinde kullanıma sunulmaktadır." [Apple], because it reads as formal and distant [MS §4.1.16].
- **One section, one subject.** Parallel items (card titles, steps, rows) are either all product statements ("… çıkarır.") or all siz imperatives ("… kopyalayın."). A lead may hand over once ("Bro ekranı hazırlar, siz düzenlersiniz"), but a grid never alternates [Google codelab, §4 on one consistent voice].
- **Banned**, with the reason:
  - Colloquial or idiomatic phrases. Microsoft says to drop an idiom or say what it means [MS §4.1.9]: "hazır gelir" (kollektor-page.tr.ts), "derdine son", "tık diye", "elveda deyin" (Canva: "Üçüncü taraf araçlara elveda deyin."), "… lüksü yok" (tr.ts) and "Gelin birlikte inceleyelim" (house call).
  - Stock corporate phrases: "yanınızdayız" and "yolculuk" [Turkcell; house call].
  - "üzgünüz", which Microsoft calls unnatural Turkish. Use "maalesef" or "özür dileriz" [MS §2.1.2].
  - Replace each one with a real subject and verb. For example, "Arama saatleri hazır gelir." becomes "Arama saatleri varsayılan olarak ayarlıdır; her grup için dilediğiniz gibi değiştirebilirsiniz."

## 3. Sentence craft

- **Verb last, news just before it.** In "Bu yıl tatil için Kaş’a gideceğiz", Kaş is the stressed element [HKU: "Kurallı eylem cümlelerinde yüklemden önceki öge vurguludur."]. So put the known item first and the answer just before the verb ("Kurulum iki iş gününde biter."). Adverbs also go before the verb, not after it: "Dosyalarınızı hızla düzene sokun" [MS §2.1.4].
- **Join linked actions; split long sentences.** Two actions on one object take -Ip ("okuyup hesaplar"; "tespit edip kaldırıyor" [Apple Business]; "silip tekrar deneyin" [MS §4.1.7]). Manner takes -ArAk, and a result takes "Böylece" [MS §2.1.3; Apple Business: "Böylece ekipleriniz…"]. Don't write runs of verbless fragments ("Uygulama yok. Portal yok."). The opposite fault is also real: Microsoft splits sentences overloaded with "ve" or commas [MS §4.1.7, §4.1.14]. Keep body sentences under about 25 words.
- **Strip English scaffolding:** "sizin için" and stacked "için" [MS §4.1.12], an automatic "bir" [MS §4.1.4], "your" on every noun [MS §4.1.3], and plurals after numbers ("5 rapor", not "5 raporlar") [MS §4.1.10; Proton §17].

These are house targets, checked against the §4 examples:

| String | Length |
|---|---|
| Hero headline | 2–8 words |
| Sub-headline | 1–2 sentences, 15–35 words |
| Section title | 4–10 words |
| Body | 2–3 sentences, each under 25 words |
| Card title / body | 2–6 words / 1–2 sentences |
| Menu note | 4–7 words, two verbs |
| Chip / button | 2–4 / 2–4 words |

Calques (the middle column is current GBO copy, quoted as it stands):

| English | Calque | Turkish |
|---|---|---|
| Turn X into AI | sorunları kazançlı yapay zekaya dönüştürüyoruz | sorunları yapay zekayla çözüyoruz |
| no luxury of | tahmin lüksü yoktur | tahmine yer bırakmaz |
| many times over | defalarca artırır | kat kat artırır |
| So is X. | Görüşme akışı da öyle. | Görüşme akışı da kaydedilir. |
| Behind it is X | Arkasında … var | … ile çalışır |
| lets you | tasarlamanızı sağlar | … ile tasarlarsınız / … tasarlar (pick the real subject) |
| the next step | somut bir sonraki adım | atılacak ilk adım |
| manual processes | el işleri (handicrafts) | elle yapılan işler |

"-manızı sağlar" is correct Turkish [MS §4.1.12: "dönmenizi sağlayan"]. It turns into a calque when it stands in for a plain verb or hides who does the work.

## 4. String types

**Hero headline:** a siz imperative, an "X ile …" benefit, or a two-clause product statement. "Daha verimli çalışın" [Google WS]; "Microsoft 365 ile işinizi büyütün" [MS365]; "Acrobat ile her şey elinizin altında" [Adobe].

**Sub-headline:** full sentences, never fragments. "iyzico Sanal POS’a başvurun ve 24 saat içinde internetten satış yapmaya başlayın." [iyzico]; "Kişiselleştirilmiş yapay zekanın yardımıyla, bilgi aramak yerine sonuç almaya odaklanın." [Google WS]; "Üretim, finans, satış ve tedarik zincirini uçtan uca yönetin." [Logo]; "Kredi kartınızı kullanmadan ücretsiz deneyin, istediğiniz zaman abone olun." [Paraşüt].

**Section title:** a short claim, a balanced pair or "X değil, Y". "e-Dönüşümde mevzuata uyum, operasyonda hız" [Logo]; "Dağınık çizelgelerle değil, tek puantaj tablosuyla çalışın" [Kolay İK].

**Feature title:** one concrete business task, with the whole grid in one form. "Randevu planlama özelliğiyle rezervasyonları kolaylaştırın" [Google WS]; "Bordroları hatasız, mevzuata göre hesaplayın" [Kolay İK]; "İzinleri uzaktan takip edin, yönetin ve onaylayın" [Kolay İK]; "Tüm çalışan bilgilerini tek uygulamadan yönetin" [Kolay İK].

**Feature body:** the action, then the payoff, with the verb last. "Gelir ve giderlerinizi bir bakışta görün, paranızı verimli şekilde yönetin." [Mikro]; "Bordrolarınızı elektronik olarak gönderin, zamandan tasarruf edin." [Mikro]; "Stoklarınızı kolayca görün, maliyeti azaltıp kârlılığınızı artırın." [Mikro].

**Product one-liner:** in menus, give the unnamed product two simple-present verbs: "Borçluları arar, ödeme sözünü kaydeder." Card eyebrows end on the head noun: "Video konferans", "Video düzenleyici", "Yapay zeka destekli araştırma asistanı" [Google WS].

**Chip / label:** a noun phrase or "… yok", with no period. "Başlangıç ücreti yok" [iyzico]; "Taahhüt yok" [Paraşüt e-Fatura]; "Kurumsal düzeyde güvenlik" [Google WS].

**Button / CTA:** an -In imperative. "Ücretsiz deneyin", "Hemen satın alın" [MS365]; "Satış ekibiyle iletişime geçin" [Google WS]; "Fiyat alın", "Yeni çözümlerimizi inceleyin" [Logo]. Bare stems ("Kaydet", "Cihazı Ayarla") are app commands [MS §4.1.3, §4.1.7]. For example, tr.ts "Çözümleri keşfet" becomes "Çözümleri inceleyin".

**FAQ:** ask in the buyer's first person and put the answer first. "Şu an kullandığım yazılım yerine Google Workspace'i kullanabilir miyim?" and "Google Workspace ile kendi alan adımı kullanabilir miyim?" [Google WS FAQ]; "Gereken evrakları size kargolamam mı gerekiyor?" answered "Hayır. Gereken evraklarınızı iyzico kontrol paneli üzerinden online olarak yüklemeniz yeterli olacaktır." [iyzico]. Headings say "Sıkça sorulan sorular", not "SSS" [MS §4.1.1: no abbreviations in headings].

**Meta title / description:** the title follows "Ürün | ne olduğu | GBO Vision", in sentence case with no colon [MS §4.1.14: "Do not use colons in document titles."]. The description is an "X, … bir Y'dir" definition: "e-Fatura, faturaların dijital ortamda oluşturulmasını, gönderilmesini ve saklanmasını sağlayan elektronik belge sistemidir." [Paraşüt e-Fatura]; "iyzico, Merkez Bankası lisansı ve PCI-DSS 1. Seviye sertifikasına sahip bir finans teknolojileri kuruluşudur." [iyzico]. Avoid titles like "Kod Yazan Yapay Zeka: Ücretsiz AI Kod Oluşturucu Aracı | Canva", which has a colon, Title Case and "AI" [Canva Code]. Fix: "Intelval: Değerleme Firmaları için Yapay Zeka" becomes "Intelval | Değerleme firmaları için yapay zeka".

## 5. Technology words

**Keep:** product and tool names (Kollektor, Intelval, Hastam, Fountible, Bro, React, Tailwind, Figma, ChatGPT, Claude), formats (HTML, SVG, MP4), known acronyms (API, KVKK, BDDK, SPK) and settled loanwords (demo, platform, entegrasyon). Don't use the English plural -s or the clipped "app" [MS §2.1.2; Proton §11].

**Translate** [Google WS; MS365 Copilot; MS §2]:

| English | Write |
|---|---|
| AI, AI-powered | yapay zeka, yapay zeka destekli ("AI" only inside brand names such as "Siri AI") |
| interface / component / layer | arayüz / bileşen / katman |
| export / import | dışa aktarmak / içe aktarmak |
| template / prompt / workflow | şablon / istem / iş akışı ("İstemler, girdiler ve yanıtlar…" [MS365 Copilot]) |
| agent | asistan for voice products (house call; Microsoft writes "aracı", and we avoid "ajan") |
| call center / dashboard | çağrı merkezi / panel ("kontrol paneli" [iyzico]) |
| canvas | tasarım ekranı, dosya (house call; TDK's "tuval" is a painter's canvas) |
| enterprise-grade / no-code | kurumsal düzeyde / kod yazmadan |

**Explaining technology:** start with what changes in the reader's work, then give the mechanism in one everyday clause, and name the technology last. Gloss a needed term once: "Nesnelerin İnterneti (IoT)" [Turkcell]. House model: "Animasyonlar da standart React koduna dönüşür; çalışması için Fountible’a ait ek bir yazılım gerekmez."

**One term per concept** [MS §5; Google codelab: "Tutarlı kelimeler kullanma"]:
- taslak (the valuer signs the rapor)
- yerinde inceleme (not ekspertiz)
- taşınmaz (TDK's preferred form of gayrimenkul [TDK GTS]). Official names keep "gayrimenkul": SPK "gayrimenkul değerleme kuruluşu" and "gayrimenkul değerleme uzmanı" [SPK].
- ödeme sözü
- borçlu

The tr.ts Intelval card still says "ekspertiz raporlarını" and "uzman düzeyinde bir rapor yazar".

## 6. Spelling and typography

- **Apostrophe** before suffixes on names, acronyms and numbers, with the spoken vowel: Intelval’in, Kollektor’u, Fountible’ı, API’si, %10’u [TDK kesme; MS §4.1.2]. Acronyms follow TDK's letter names (K is "ke": "TDK’nin"), so write KVKK’ye, KVKK’nin, SPK’ye [TDK kesme].
  - No apostrophe before the conjunction: "Intelval de" [TDK de/da].
  - No apostrophe on full institution names that end in a Turkish common noun: "Sermaye Piyasası Kuruluna", "Türkiye Bankalar Birliğinin" [TDK kesme: "Türk Dil Kurumundan"].
  - Use ’, as TDK's own pages do (tr.ts still uses ').
- **Circumflex** only where it changes the meaning: kâr, hâlâ. Not in "yapay zeka" or "şikayet" (owner's decision; see below).
- **yapay zeka (owner's decision, 2026-10-07):** write "yapay zeka" without the circumflex everywhere, as the site and Google, Microsoft, Apple, Adobe and Canva TR do (TDK prefers "zekâ"; we deliberately follow common business usage). Lowercase mid-sentence: yapay zekayla, yapay zekanın. Likewise keep the site's "şikayet". Keep a circumflex only where dropping it changes the meaning: kâr (profit, vs kar = snow), hâlâ (still, vs hala = aunt).
- **Never abbreviate** product or company names: "GBO Vision", not "GBO" [MS §4.1.1].
- **Sentence case** for headings, buttons, chips and meta titles [MS §4.1.5; Proton §1]. TDK's rule for capitalising every word covers book and article titles, not interface text [TDK büyük harfler]. CSS uppercase needs lang="tr" so that i becomes İ [MS §4.1.5].
- **Numbers:** 10.000; 2,6 milyon TL, not "₺2,6M+"; %97 with no space; no sentence opens with a numeral; times as 09.00 [TDK sayılar; TDK nokta]. Proton's "21:25" loses to TDK here.
- **Quotes:** “…”, with no apostrophe after them: “Bit Palas”ını [TDK noktalama].
- **Dashes:** no em dash for asides or emphasis. Use a comma, colon or parentheses instead [MS §2.2.3, §4.1.14]. TDK keeps the long dash for dialogue only. Ranges take TDK's kısa çizgi, typeset as – with no spaces: 09.00–18.00 [TDK noktalama].
- **Punctuation:**
  - No "!" in headings or buttons [MS §4.1.14; Proton §5.2].
  - No period on noun-phrase titles, chips or buttons [Proton §5.1; TDK büyük harfler: "cümle niteliğinde değilse sonuna nokta konmaz"].
  - Sentence headings keep their period. This is a house call that Apple TR shares ("Karşınızda Siri AI."), although Proton drops it.
  - "&" becomes "ve" [MS §4.1.15].

## 7. Pre-publish checklist

1. Is the reader always "siz", with no "sen" and no "-InIz" imperative?
2. Does each list of titles have one subject?
3. Are product claims in one present tense, with no future?
4. Is the verb last, with the key information just before it?
5. Are linked actions joined, with no run of fragments and no sentence over about 25 words?
6. No banned phrasing or §3 calque?
7. Is it "yapay zeka" (no circumflex) every time, and never "AI" in running text?
8. Is English used only from the keep list, with the §5 term for each concept?
9. Do names, acronyms and numbers take ’ with the right vowel (KVKK’ye)?
10. Circumflex only where meaning needs it (kâr, hâlâ); none in "yapay zeka" or "şikayet"?
11. Sentence case, no "!", and no period on noun phrases?
12. Are numbers and money in Turkish format?
13. No em dash, "&", title colon or "GBO" alone?
14. Are buttons 2–4 words with an -In imperative?
15. Is the FAQ in the buyer's voice, with the answer first?
16. Read it aloud: does it sound written in Turkish [Google codelab: "Yazdıklarınızı sesli okuyun."]?

## 8. Ten rewrites of current strings

1. **tr.ts hero.description** (§5, §1; an English punchline [MS §2.1.1]). "… çözümlere dönüştürür. AI çağına hoş geldiniz." → "… araçlara dönüştürür." Cutting the last sentence needs the owner's yes. If it stays: "Yapay zeka çağına hoş geldiniz."
2. **tr.ts intro.title** (§3 calques; §2 -iyoruz for our work). "Operasyonel sorunları kazançlı yapay zekaya dönüştürüyoruz." → "İşinizi yavaşlatan sorunları yapay zekayla çözüyoruz."
3. **tr.ts about.lead** (§2: the lead switches from third person to "biz"; §3: "el işleri"). "GBO Vision, ya da gbovision, kurumsal bir yapay zeka ajansıdır. Yapay zeka ürünleri ve özel yazılımlar oluştururuz. Yavaş ilerleyen el işlerini, ekiplerin her gün açtığı araçlara çeviririz." → "GBO Vision (gbovision), kurumsal bir yapay zeka ajansıdır. Şirketler için yapay zeka ürünleri ve özel yazılımlar geliştirir; elle yürütülen yavaş işleri, ekiplerin her gün kullandığı araçlara dönüştürür." Don't use "GBO Vision’da … geliştiriyoruz", which copies the English "At X, we …".
4. **tr.ts kollektorDeep.description** (§3 join; "plan kurmak" is a calque of "set up"). "… Ödeme talep eder. Borçlu müşteriyle ödeme planı kurar. Gelen ödemeleri alır. Tüm süreç yapay zeka ses ajanı ile işler. Ekibiniz tahsilatı görür." → "… Borçluyu arayıp ödeme ister, ödeme planı üzerinde anlaşır ve ödemeyi tahsil eder. Görüşmeleri sesli yapay zeka yürütür; ekibiniz her tahsilatı panelden izler."
5. **tr.ts kollektorDeep.split.debtorBody** (§3; -madan as in "Hiçbir entegrasyona gerek duymadan hemen tahsilata başlayın." [Param]). "Uygulama yok. Portal yok. Bağlantı yok. İsimli bir tahsildar, bir borç ve bir sonraki adım." → "Borçlu uygulama indirmeden, portala girmeden, bağlantıya tıklamadan borcunu ve atması gereken adımı, kendini adıyla tanıtan bir tahsildardan öğrenir."
6. **intelval-page.tr.ts field.rows[3]** (§3, §6). "Arkasında, GBO’nun Kollektor ve Hastam’da da kullandığı sesli yapay zeka var." → "Bu özellik, GBO Vision’ın Kollektor ve Hastam’da da kullandığı sesli yapay zekayla çalışır." phone.lead repeats "GBO’nun".
7. **fountible-page.tr.ts code.rows titles** (§2: rows 1 and 3 are imperatives, so rows 2 and 4 become imperatives too). "Ekranda ne görüyorsanız kodda o çıkar." → "Tasarımı ekranda gördüğünüz gibi koda aktarın."; "Renk ve ölçüler her yerde tutarlı kalır." → "Renk ve ölçüleri tek yerden yönetin." (the Kolay İK pattern "… tek uygulamadan yönetin").
8. **fountible-page.tr.ts faq[0]** (§4 FAQ, after Google's "… yerine Google Workspace'i kullanabilir miyim?"). "Fountible, Figma’nın yerine kullanılabilir mi?" / "Arayüz tasarımı için evet. …" → "Figma yerine Fountible’ı kullanabilir miyiz?" / "Evet, arayüz tasarımı için kullanabilirsiniz. …"
9. **SiteHeader.astro, Hastam note** (§3: the dative offers the time to the doctor; §6: TDK "şikâyet"). "Şikayeti dinler, uygun hekime saat önerir." → "Şikâyeti dinler, uygun hekimden randevu saati önerir."
10. **SiteHeader.astro, Fountible note** (§4 one-liner; here "-manızı sağlar" stands in for two plain verbs). "Arayüzleri yapay zekayla tasarlamanızı sağlar." → "Ekranları sizinle birlikte tasarlar, koda aktarır."

## Sources

All checked 2026-10-07. Where sources disagree, TDK decides spelling, then Microsoft. Proton is community guidance and ranks below both.

- MS: Microsoft Turkish Style Guide, https://download.microsoft.com/download/c/7/e/c7e1f405-1a5a-418d-a56d-3a8c183cabd9/tur-tur-StyleGuide.pdf (§2.1.1–2.2.3 voice, §3 plain language, §4.1.x grammar and punctuation, §5 consistency)
- TDK rules: https://tdk.gov.tr/icerik/yazim-kurallari/ + kesme-isareti, sayilarin-yazilisi, noktalama-isaretleri-aciklamalar (quotes, dashes), nokta, buyuk-harflerin-kullanildigi-yerler, baglac-olan-da-denin-yazilisi
- TDK GTS: https://sozluk.gov.tr/ (entries "yapay zeka", "şikâyet", "kâr", "hâlihazırda", "gayrimenkul → taşınmaz", "tuval")
- HKU: Hasan Kalyoncu Üniversitesi, "Vurgu" handout, https://mim.hku.edu.tr/wp-content/uploads/2025/10/Vurgu.pdf
- Proton: https://localize.proton.me/t/guidance-for-turkish/111
- Google codelab: https://codelabs.developers.google.com/codelabs/material-communication-guidance?hl=tr
- Google WS: https://workspace.google.com/intl/tr/; FAQ: https://workspace.google.com/intl/tr/faq/
- MS365: https://www.microsoft.com/tr-tr/microsoft-365/business; Copilot: https://www.microsoft.com/tr-tr/microsoft-365/copilot
- Apple: https://www.apple.com/tr/apple-intelligence/; Apple Business: https://www.apple.com/tr/business/
- Adobe: https://www.adobe.com/tr/acrobat.html
- Canva Code: https://www.canva.com/tr_tr/yapay-zeka-kod-olusturucu/
- Logo: https://www.logo.com.tr/; Logo Cloud: https://www.logo.com.tr/logo-cloud
- Paraşüt: https://www.parasut.com/; Paraşüt e-Fatura: https://www.parasut.com/e-fatura
- iyzico: https://www.iyzico.com/isim-icin/sanal-pos
- Kolay İK: https://kolayik.com/
- Mikro: https://www.mikro.com.tr/
- Param: https://www.param.com.tr/
- Turkcell: https://www.turkcell.com.tr/kurumsal
- SPK: https://spk.gov.tr/kurumlar/gayrimenkul-degerleme-kuruluslari

## 9. Blog labels and positioning (researched 2026-10-07)

**Positioning (owner):** the blog is GBO Vision's blog about artificial intelligence for businesses: how companies use AI, AI products, technology, strategy and sector use cases. It is not a regulation or law-firm blog. Law firms are the audience of one product (Kollektor), not of the company. Don't lead with "mevzuat"; mention law or regulation only inside an article where it matters for using AI.

**Labels Turkish corporate blogs actually use** (verbatim, fetched 2026-10-07):
- Index heading: just "Blog" or "<Marka> Blog": "iyzico blog" [iyzico], "Paraşüt Blog" [Paraşüt], "Blog" [Logo], "Tüm Blog Yazıları" [ikas], "Mikro Blog Yazılarımız" [Mikro].
- Card link: "Devamını oku" ("Devamını Oku →", 100 times on one page [Kolay İK]); "Devamını gör" [ikas]; "İncele" [Logo]. Never "Yazıyı okuyun".
- Reading time: "5 dk" [Logo, Mikro, Garanti BBVA]; label "Okuma süresi" [Garanti BBVA, Kolay İK].
- Article furniture: "İçindekiler", "Kaynaklar", "Yazar" [Kolay İK]; "Sıkça Sorulan Sorular" [Paraşüt]; "Benzer Yazılar" [ikas]; "İlgili İçerikler" [Paraşüt]; "Tüm yazılar" [Paraşüt, Logo]; "Kategoriler" [Paraşüt, Logo, Mikro].
- Article titles: a plain question or a guide with the year: "Gümrük Vergisi Nasıl Hesaplanır? İthalat Yapan İşletmeler İçin 2026 Rehberi" [Paraşüt]; "7577 sayılı kanun ile yemek istisnasında ne değişti?" [Kolay İK].
Sources: https://www.kolayik.com/blog, https://www.ikas.com/tr/blog, https://www.logo.com.tr/blog, https://www.parasut.com/blog, https://www.mikro.com.tr/blog, https://www.garantibbva.com.tr/blog, https://www.iyzico.com/blog and one article page from each.
