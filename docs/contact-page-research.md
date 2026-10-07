# Contact page research (2026-10-07)

How Turkish B2B and tech companies word their contact pages, and the Turkish strings recommended for GBO Vision's `/contact`. Every Turkish string recommended here follows `docs/turkish-copy-guide.md`.

**Method.** Pages were fetched with curl using a browser user agent. Forms that render in JavaScript were loaded in headless Chrome, and their strings were read from the bundle or locale file. Quotes below are verbatim, including each site's own casing, apostrophes and punctuation. Insider has no Turkish contact page any more: `/tr/` redirects to a legal page, and https://insiderone.com/contact-us/ is English only. The Microsoft TR contact pages offer chat and phone but no form.

## 1. Verbatim examples

### Headings and leads

| Site | Heading | Lead |
|---|---|---|
| iyzico | "İletişim" (title "Bize Ulaşın - iyzico") | "Her konuda bizimle iletişime geçebilir, düşünce ve görüşlerinizi bizimle paylaşabilirsiniz." |
| Paraşüt | "Bizimle İletişime Geçin" | "Paraşüt ile ilgili her türlü geri bildirim ve önerinize değer veriyoruz." |
| Logo | "İletişim" (title "İletişim - Bize Ulaşın \| Logo Yazılım") | "İhtiyaçlarınıza en uygun yazılım çözümlerini birlikte geliştirmek için bizimle iletişime geçin." |
| Logo, form | "Logo ile iletişime geçin" | "Ürün, hizmet ve destek talepleriniz için formu doldurun. Talebiniz ilgili ekibe iletilir ve en kısa sürede sizinle iletişime geçilir." |
| Mikro | "Sizi dinliyoruz" | "Bize ulaşarak öneri ve geri bildirimlerinizi iletebilirsiniz." |
| Mikro, form | "Sizi arayalım ve ihtiyacınız olan çözümü sunalım" | "İletişim bilgilerinizi bırakın sizi arayıp ihtiyacınız olan çözümü sunalım." |
| Kolay İK | "Kolay Yazılım Anonim Şirketi" (title "Kolay İK ile iletişime geçin \| Kolay İK"), then "Bize yazın" | "Destek için her zaman buradayız" |
| ikas | "Destek ekibimizle iletişime geçin" | "Sorularınız ve ihtiyaçlarınız için destek@ikas.com adresine e-posta gönderin." |
| Turkcell | "Bize Ulaşın" | "Turkcell daha fazla hizmet için burada!" |
| Turkcell Kurumsal, form | "Kurumsal Çözümlerimiz İçin Formu Doldurun, Sizi Arayalım" | "Turkcell kurumsal hizmetlerinden yararlanmak için formu doldurun, ekibimiz en kısa sürede sizinle iletişime geçsin." |
| Garanti BBVA, form | "İletişim Formu" | "Yaşadığınız olumsuzlukları güzel deneyimlere dönüştürmek için buradayız." |
| Google Workspace | "Satış ekibiyle iletişime geçin" | "Formu doldurup gönderdiğinizde ekibimiz sizinle iletişime geçecektir." |
| Microsoft 365 | "Microsoft 365 Satış ekibi ile iletişime geçin" (eyebrow "Bize ulaşın") | "Ürünlerimiz hakkında daha fazla bilgi edinin, kullanım örneklerini tartışın veya fiyatlandırma bilgilerini alın." |
| Microsoft Azure | "Microsoft Azure Satış Birimi ile İletişime Geçin" | "Bir sohbet oturumu başlatın veya bizi arayın; seçim sizin." |

Channel labels: "Bizi Arayın", "Bize Yazın", "Canlı Sohbet Başlatın" [Paraşüt]; "Bize yazın", "Bize bağlanın" [Kolay İK]; "E-posta Gönderin", "Arayın" [Logo]; "Bir temsilciyle görüşün" [Microsoft].

### Form fields, button and messages

| Site | Fields (labels or placeholders) | Submit | Success | Error |
|---|---|---|---|---|
| iyzico | select "Yardım Konusu"; placeholders "Adınız Soyadınız", "Email Adresiniz", "Mesajınız" | "Gönder" | "Başvurunuz Alındı!" / "Başvurunuz başarıyla alınmıştır. En kısa sürede değerlendirilip tarafınıza geri dönüş yapılacaktır." / "Tamam" | field: "Hatalı giriş yaptınız, lütfen tekrar deneyiniz."; modal: "Hata!" / "Bir hata oluştu, lütfen tekrar deneyiniz." |
| Logo | "Ad", "Soyad", "İl", "Firma adı", "Telefon numarası", "E-posta", "Size Nasıl Yardımcı Olabiliriz?", "Mesaj eklemek istiyorum.", placeholder "Mesajınız" | "Gönder" | "Talebiniz iletildi" / "Talebinizi ilgili birime ilettik. 1 iş günü içerisinde size dönüş yapacağız." | "Bir hata oluştu" / "Talebiniz gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz."; "Bu alan boş gönderilemez!", "Geçerli bir e-posta adresi giriniz", "Mesaj çok kısa (en az 10 karakter)" |
| Mikro | placeholders "Adınız Soyadınız", "Firma Adınız", "Telefon Numaranız", "E-posta Adresiniz" | "Gönder" | "Teşekkürler, talebiniz alınmıştır. En kısa sürede sizinle iletişime geçeceğiz." / "Kapat" | none found |
| Kolay İK (demo form) | "E-posta", "Ad, Soyad", "Şirket Adı", "Unvan", then phone | "İLERLE", "Tamamla"; while sending "Lütfen bekleyiniz..." | "Harika! 🙌" / "Talebinizi aldık." | "Form gönderimi engellendi!" / "Sayfayı Yenile" |
| ikas (sizi-arayalim) | "Ad", "Soyad", "E-Posta", phone | "Devam" | none found | none found |
| Turkcell Kurumsal | "Adınız *", "Soyadınız *", "Size Ulaşabileceğimiz Cep Telefonu Numaranız *", "Firma adınız", "Güvenlik Kodu" | "Gönder" | "Kaydınız alınmıştır, teşekkür ederiz. Uzman Müşteri Hizmetleri yetkililerimiz en kısa sürede sizinle iletişime geçecektir." | none found |
| Garanti BBVA | "Konu" ("Lütfen bir konu seçiniz."), "Adınız", "Soyadınız", "E-posta", "Telefon" | "Gönder" | "Bizimle iletişime geçtiğiniz için teşekkür ederiz." | "Lütfen ad soyad bilginizi giriniz.", "Lütfen size geri dönüş yapabilmemiz için e-posta adresini giriniz.", "Lütfen geçerli bir e-posta adresi giriniz", "Sizi daha iyi anlayabilmemiz için lütfen açıklama giriniz." |
| Google Workspace | groups "Şirket", "Bilgileriniz", "Sorunuz"; "İşletme adı", "Ad", "Soyadı", "İş ünvanı", "İş e-postası", "Telefon numarası", "Satış ekibimiz size nasıl yardımcı olabilir?", "Lütfen ek bilgileri girin" | "Satış Talebi Gönder" | not in the page | "Bu alan boş bırakılamaz", "Bu geçerli bir telefon numarası değil" |

### Consent line under the form

| Site | Line | Checkbox |
|---|---|---|
| Garanti BBVA | "Kişisel verilerimin neden ve nerelerden toplandığı, nasıl kullanıldığı ve diğer haklarımla ilgili olarak Kişisel Verilerin Korunması Kanunu uyarınca yapılan bilgilendirmeyi okudum." | yes ("KVKK Onayı") |
| Logo | "Bilgi Talebi Formu Aydınlatma Metni'ni okudum." and "Kişisel verilerinizin işlenmesine ilişkin aydınlatma metinlerine buradan ulaşabilirsiniz." Marketing is separate: "Burada belirtilen kapsamda Logo'nun ticari elektronik ileti göndermesini onaylıyorum." | yes |
| Logo, partner form | "Kişisel verilerimin işlenmesini aydınlatma metnini okuyarak kabul ediyorum." | yes |
| Mikro | "Aydınlatma Metnini uyarınca, kişisel verilerimin aktarılmasına Açık Rıza Metni kapsamında açık rıza veriyorum." | yes |
| Kolay İK | "Aydınlatma metnine buradan ulaşabilirsiniz." | no |
| Turkcell Kurumsal | "Ürün ile ilgili talebiniz için formda yer alan bilgileriniz kullanılarak, Turkcell İletişim Hizmetleri A.Ş. tarafından tanıtım amaçlı iletişime geçilecektir." | no |
| Google Workspace | "Kişisel verilerimin Google'ın Gizlilik Politikası'na uygun olarak işleneceğini anlıyorum." | no |
| ikas | "Kullanım sözleşmesi'ni okudum onaylıyorum." (terms of use; no privacy notice) | yes |
| iyzico | none on the contact form | no |

### Address block

- "Adresimiz" [Paraşüt]; "Adres:" [iyzico]
- "Şirket Bilgileri" > "Adres", and "Ofislerimiz" > "Merkez Ofis" [Logo]
- "Ofislerimiz" > "İSTANBUL YÖNETİM OFİSİ", "İSTANBUL ARGE OFİSİ" [Mikro]
- "Ofise mi geleceksiniz?" followed by the address and a "NAVİGASYON" map link [Kolay İK]
- "Şirket Merkezi:" and "Ankara, Türkiye(HQ)" [ikas]
- "Merkezinin Bulunduğu Yer:", and in the FAQ "Garanti BBVA Genel Müdürlük Adresi:" [Garanti BBVA]
- "ŞİRKET BİLGİLERİ", with the address directly under the legal name [Turkcell]
- "Our locations" … "Get Direction" [Insider, English only]

"Genel Merkez" does not appear on any of these pages. Only Kolay İK and Insider link the address to a map.

## 2. Key findings

1. **The label is "İletişim"; the heading asks for one action.** Every site names the page "İletişim" in its navigation and footer. The heading is either that bare noun (iyzico, Logo, Garanti) or an -In imperative such as "Bizimle İletişime Geçin" (Paraşüt), "Destek ekibimizle iletişime geçin" (ikas) or "Satış ekibiyle iletişime geçin" (Google). Sites that offer a written channel call it "Bize yazın" (Paraşüt, Kolay İK). Paraşüt and Azure use Title Case; Google and Microsoft 365 use sentence case, which the guide follows. The weakest leads are slogans: "Destek için her zaman buradayız" (Kolay İK), "Yaşadığınız olumsuzlukları güzel deneyimlere dönüştürmek için buradayız." (Garanti) and "Turkcell daha fazla hizmet için burada!". These are the "yanınızdayız" pattern the guide bans.
2. **Several consent lines now break a KVKK principle decision.** Kişisel Verileri Koruma Kurulu decision 2026/347 (18.02.2026, Resmî Gazete 24.03.2026) calls endings such as "okudum ve kabul ediyorum", "okudum ve açık rıza veriyorum" and "okudum ve onaylıyorum" a common mistake. It says the lawful acknowledgment is "okudum ve anladım" and that açık rıza must be a separate text with a separate statement. Mikro bundles açık rıza into the notice line, and Logo's partner form "accepts" the notice. The compliant patterns are a plain notice with a link (Kolay İK, Turkcell, Google) or a "read" acknowledgment (Garanti, Logo's info form). The notice must be given before any data is processed and must state the identity of the veri sorumlusu (data controller) (KVKK md. 10/1-a). A contact form that only answers the message needs no açık rıza and no marketing (ETK) checkbox. Jev was used as a second opinion on this classification of the eight consent lines and agreed with the reading above; it was unsure on ikas, which was checked by hand.
3. **Form copy is the same everywhere, and its validation messages break the guide.** The fields are ad soyad, e-posta, şirket or firma, telefon, konu and mesaj. The button is a bare "Gönder" (iyzico, Logo, Mikro, Garanti, Turkcell). Success messages say "Talebiniz/Başvurunuz alındı" and promise "en kısa sürede" a reply. Validation messages use the -InIz imperative ("giriniz", "deneyiniz") at Logo, Garanti, iyzico and Kolay İK, which the guide bans; GBO's existing signup errors already use -In ("Lütfen geçerli bir e-posta adresi girin"). Paraşüt ("en geç 1 iş günü içinde") and Logo ("1 iş günü içerisinde") promise a reply time. GBO should state one only if the owner commits to it. The form is GBO's only channel, so the error message cannot offer an e-mail or phone fallback the way other sites do.

## 3. Recommended Turkish strings for GBO Vision's `/contact`

The form strings reuse the wording of `signup` in `src/i18n/messages/tr.ts` where the two overlap, so that both forms read the same. Jev was used as a second opinion on tone: every string below rated as plain, while the Kolay İK and Garanti leads were flagged as slogans. Jev is weak in Turkish, so this is only a cross-check.

| Key | Turkish | Intent (EN) |
|---|---|---|
| meta.title | İletişim \| GBO Vision | Contact \| GBO Vision |
| meta.description | GBO Vision’a iletişim formundan yazın; mesajınıza e-postayla yanıt veririz. Ofisimiz İstanbul Ataşehir’dedir. | In running text the larger place comes first and takes no suffix; "Ataşehir, İstanbul" stays in the address block |
| nav / footer link | İletişim | Contact |
| eyebrow | İletişim | Contact |
| h1 | Bize yazın. | Write to us. |
| lead | Yapay zekayla hızlandırmak istediğiniz işi birkaç cümleyle anlatın ya da ürünlerimizle ilgili sorunuzu yazın. Mesajınızı okuyup size e-postayla yanıt veririz. | a question is written ("sorunuzu yazın"), not described ("anlatın") |
| form aria-label | İletişim formu | Contact form |
| label.name | Ad soyad | Full name |
| label.email | E-posta | Email |
| label.company | Şirket | Company |
| optional marker | (isteğe bağlı) | (optional) |
| label.topic (optional field) | Konu | Topic |
| topic.placeholder | Konu seçin | Choose a topic |
| topic options (owner to confirm) | Ürün demosu · Özel yazılım projesi · İş birliği · Diğer | |
| label.message | Mesaj | Message |
| message.placeholder | Neye ihtiyacınız olduğunu kısaca anlatın | Tell us briefly what you need |
| submit | Mesajı gönderin | Send message |
| sending | Gönderiliyor | Sending |
| privacy line (no checkbox) | Bu formdaki bilgileri yalnızca mesajınızı yanıtlamak için kullanırız. Ayrıntılı bilgi için aydınlatma metnini inceleyin. | |
| privacy link text | aydınlatma metnini | privacy notice |
| success.title | Mesajınızı aldık | We got your message |
| success.body | Teşekkür ederiz. Mesajınızı okuyup size e-postayla yanıt vereceğiz. | |
| success.again | Yeni mesaj yazın | Write another message |
| error.nameRequired | Adınızı ve soyadınızı girin | |
| error.emailRequired | E-posta adresinizi girin | (same as signup) |
| error.emailInvalid | Lütfen geçerli bir e-posta adresi girin | (same as signup) |
| error.messageRequired | Mesajınızı yazın | |
| error.messageTooLong | Mesajınız en fazla 2.000 karakter olabilir | set to the real limit |
| error.submission | Mesajınız şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin. | mirrors signup |
| error.rateLimited | Kısa sürede çok sayıda mesaj gönderildi. Lütfen birkaç dakika sonra tekrar deneyin. | |
| address.heading | Ofisimiz | Our office ("Adres" if a neutral label is preferred) |
| address.lines | Örnek Mahallesi Şehit Çahar Dudayev Caddesi No:66/1 / Ataşehir, İstanbul | rendered from `brand.ts`, not retyped |
| address.mapLink | Haritada açın | Open in maps |
| address.mapLink aria-label | Adresi Google Haritalar’da açın (yeni sekmede açılır) | |
| address.visitNote (optional, owner) | Ofisimize gelmeden önce formdan bize yazın. | |

Notes on the choices:

- **"Bize yazın"** rather than "Bize ulaşın": the page offers only a written channel, and "Bize yazın" names it exactly (Paraşüt, Kolay İK). It is a two-word -In imperative (guide §4, button and headline).
- **Single "Ad soyad" field** instead of separate first and last names: it needs one field fewer and handles names of any shape. Use labels that stay visible. Leave name, e-mail and company without placeholders, because iyzico and Mikro use placeholders as labels and those vanish as the visitor types.
- **"Mesajı gönderin", not "Gönder"**: guide §4 treats bare stems as app commands.
- **Success body in the future tense**: it refers to one specific reply, and it matches the existing `signup.successBody` ("…sizinle iletişime geçeceğiz."). The lead's general promise stays in the simple present ("yanıt veririz"), as guide §2 asks.
- **No reply-time number** ("1 iş günü") and no "en kısa sürede" until the owner commits to a time.
- **Map link**: use `https://www.google.com/maps/search/?api=1&query=` followed by the URL-encoded `brand.ts` address, opening in a new tab. In Turkish the product is "Google Haritalar".
- **No checkbox, no açık rıza, no marketing consent.** If counsel wants an acknowledgment, the only wording to use is "Aydınlatma metnini okudum ve anladım." (KVKK 2026/347).

## 4. Open questions for the owner

1. **Privacy notice vs. "no legal name".** KVKK md. 10/1-a requires the aydınlatma metni to state the identity of the veri sorumlusu, and the site has no such page yet (`brand.legalName` is empty). One option is a separate notice page, linked from the privacy line, that carries the legal name; the contact page itself would still show none. Until that page exists, either drop the second sentence of the privacy line or decide what it links to. If the mail relay is a provider outside Türkiye, the notice should also cover the transfer abroad (counsel to confirm).
2. **Reply time.** Should the page promise one (for example "bir iş günü içinde"), as Paraşüt and Logo do?
3. **Topic select.** Keep it (it is useful for triage even though everything reaches one inbox) or drop it for a shorter form? If kept, which options?
4. **Visit note.** Should the page say that visits are by appointment?

## Sources (fetched 2026-10-07)

- iyzico: https://www.iyzico.com/destek/iletisim; success page https://www.iyzico.com/destek/iletisim/basarili; messages in https://www.iyzico.com/assets/js/main.js
- Paraşüt: https://www.parasut.com/iletisim (no form)
- Logo: https://www.logo.com.tr/iletisim (form strings from the page's message payload)
- Mikro: https://www.mikro.com.tr/iletisim/ and https://www.mikro.com.tr/ucretsiz-demo-talep (form props in the site's `_nuxt` bundle)
- Kolay İK: https://kolayik.com/iletisim and https://kolayik.com/demo-talebi
- ikas: https://ikas.com/tr/iletisim and https://ikas.com/tr/sizi-arayalim
- Insider One: https://insiderone.com/contact-us/ (English only)
- Turkcell: https://www.turkcell.com.tr/hakkimizda/iletisim/bize-ulasin/detay; Kurumsal form https://www.turkcell.com.tr/kurumsal/form/kurumsal-urun-basvuru-formu?urun=yeni-hat-on-bilgi-formu
- Garanti BBVA: https://www.garantibbva.com.tr/iletisim; form https://www.garantibbva.com.tr/musteri-deneyimi/iletisim-formu (iframe https://webforms.garantibbva.com.tr/contact-us/?lang=tr, strings in its `locales/locales.json`)
- Google Workspace: https://workspace.google.com/intl/tr/contact-form/ and https://workspace.google.com/intl/tr/contact/
- Microsoft: https://www.microsoft.com/tr-tr/microsoft-365/business/sales-support, https://www.microsoft.com/tr-tr/dynamics-365/contact-us, https://azure.microsoft.com/tr-tr/contact
- KVKK Kurul ilke kararı 2026/347: https://www.hukukihaber.net/kvkknin-acik-riza-metni-ile-aydinlatma-metninin-ayri-ayri-duzenlenmesine-iliskin-ilke-karari/amp
