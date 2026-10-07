import type { IntelvalPageMessages } from "@/i18n/page-types/intelval";

// /intelval, Turkish. Rules this file is written against (the header of
// page-types/intelval.ts holds the full list):
//   - Intelval reads, works out the value, drafts and checks. The licensed
//     valuer who inspected the property reviews, edits and signs. It never
//     signs, never replaces the site visit and never fixes the value alone.
//     Intelval writes the "taslak"; the report itself is prepared and signed
//     by the valuer (Art. 14), so never "raporu Intelval hazırlar";
//   - the only legal facts are the verified ones: BDDK Art. 14 (the inspecting
//     valuers prepare and sign), Art. 20/2 (two firms above 10 million TL, a
//     third past 10%), SPK on working papers, the TKGM circular for foreign
//     buyers, and IVS on explaining how the value was reached;
//   - no accuracy figure, price, client or bank name, compliance badge,
//     hosting, e-signature or audit-log claim, and not the home page's "800+";
//   - "emsal" only where it plainly means a comparable property, never bare in
//     a heading; never "AVM"; "yerinde inceleme" rather than "ekspertiz".
// The valuer's own terms: "mevcut durum değeri" beside "yasal durum değeri",
// "projeye aykırı" (not "projeden farklı"), "değerlemeye konu daire", "sayı"
// (not "rakam"), and "değer hesabını yapar" where the valuer still fixes the
// final value.
// Written as Turkish copy for a valuer, not translated from the English file:
// joined clauses rather than a run of short -ir/-ar sentences, and the
// subject dropped where it is obvious.
// The Göztepe flat (IV-0587), its comparables, the deed, the owner and the
// parcel are invented sample data. Its facts and figures, the draft's
// paragraph and which lines are flagged live in
// components/intelval-page/sample-file.ts; copy names a fact by token
// ({file}, {site} ...). Only the deed's parcel, share and owner and the
// valuer's own words are written out here.
const intelvalPage: IntelvalPageMessages = {
  metaTitle: "Intelval: Değerleme Firmaları için Yapay Zeka | GBO Vision",
  metaDescription:
    "GBO Vision’ın (gbovision.com) değerleme yapay zekası Intelval, belgeleri okuyup değeri hesaplar ve rapor taslağını banka şablonunda yazar. İmza uzmanınızda.",
  hero: {
    eyebrow: "Lisanslı değerleme firmaları için",
    title: "Rapor taslağını Intelval hazırlar, imzayı uzmanınız atar.",
    lead: "Intelval belgeleri okuyup değer hesabını yapar, taslağı bankanın şablonunda yazar ve kontrol eder. Son söz ve imza ise taşınmazı yerinde inceleyen uzmanınızda.",
    chips: ["Konut, arsa ve ticari taşınmaz", "Çalıştığınız bankanın şablonu", "İmza uzmanınızda"],
    primaryCta: "Demo isteyin",
    secondaryCta: "Örnek dosyayı inceleyin",
    steps: [
      {
        title: "Belgeleri ve saha notunu okur.",
        description:
          "Tapu kaydından, imar durumundan ve onaylı projeden gereken bilgileri çıkarır, uzmanın sesli notunu da rapora geçirir.",
      },
      {
        title: "Değer hesabını yapıp taslağı yazar.",
        description:
          "Emsal taşınmazlara düzeltme oranları uygulayarak mevcut durum ve yasal durum değerlerini hesaplar, taslağı da bankanın şablonunda hazırlar.",
      },
      {
        title: "Uzmanınız gözden geçirip imzalar.",
        description: "Taşınmazı yerinde inceleyen uzmanınız taslakta gereken düzeltmeleri yapıp raporu imzalar.",
      },
    ],
  },
  heroPicture: {
    label:
      "Örnek değerleme dosyası. Uzman daireyi yerinde inceleyip sesli not alıyor, Intelval bu notu ve tapu kaydını okuyarak değer hesabını yapıyor ve taslağı yazıyor. Taslak, uzmanın imzasını bekliyor.",
    labels: ["Sahadaki uzman", "Intelval’in okuduğu kayıtlar", "Firmanızın ekranı"],
    // The same balcony the field picture flags: 135 m² on site, 128 in the
    // project. Two sentences quoted word for word from field.mock.transcript.
    note: { who: "Sesli saha notu", text: "Balkon kapatılıp odaya katılmış. Ölçümde {site} metrekare çıktı." },
    deed: { who: "Tapu kaydı", text: "1043 ada 27 parsel · 1. derece ipotek" },
    cardTitle: "Rapor taslağı hazır",
    marketLabel: "Mevcut durum değeri",
    legalLabel: "Yasal durum değeri",
    compsLabel: "Emsal",
    compsValue: "{comps} taşınmaz",
    million: "milyon TL",
    // The draft stops where the valuer's work begins: nothing is signed here.
    cardFoot: "{file} · Uzman imzası bekleniyor",
  },
  reads: {
    label: "Belgeler",
    title: "Dosyadaki belgeleri Intelval okur, rapora girecek bilgileri çıkarır.",
    lead: "Tapu, imar durumu, onaylı proje, ruhsat, iskân ve önceki raporlar. Uzmanınız belgeleri tek tek taramak yerine her bilgiyi, hangi belgeden geldiğiyle birlikte dosyada hazır bulur.",
    noteTitle: "Nasıl okunur",
    note: "Solda belge, sağda Intelval’in o belgeden çıkardığı bilgi.",
    sayLabel: "Belge",
    doLabel: "Intelval’in çıkardığı bilgi",
    rows: [
      {
        say: "Tapu kaydı",
        title: "Malik, hisse ve takyidat bilgisini çıkarır.",
        description:
          "İpotek, haciz ve şerh kayıtlarını tek tek listeler; ada, parsel ve nitelik bilgisini de rapora geçirir.",
      },
      {
        say: "İmar durumu",
        title: "İmar koşullarını çıkarır.",
        description:
          "TAKS, KAKS, kat adedi ve plan notlarını okuyup raporun imar bölümüne yazar.",
      },
      {
        say: "Onaylı proje, yapı ruhsatı ve iskân",
        title: "Yasal durum bilgilerini çıkarır.",
        description:
          "Onaylı projedeki alanı, kat adedini ve ruhsat bilgilerini okur, uzmanın sahada tespit ettiği mevcut durumu da bunlarla karşılaştırır.",
      },
      {
        say: "Aynı taşınmazın önceki raporları",
        title: "Nelerin değiştiğini gösterir.",
        description:
          "Önceki raporu bugünkü dosyayla karşılaştırır. Alanda, malikte ya da takyidatta bir değişiklik varsa işaretler.",
      },
    ],
    mock: {
      label:
        "Örnek tapu kaydı. Intelval malik, hisse ve takyidat bilgilerini okuyup ipoteği bilgi olarak not ediyor, şerhi ise uzmanın değerlendirmesine bırakıyor.",
      owner: "Değerleme uzmanının ekranı",
      title: "Tapu kaydı",
      meta: "{file} · {place}",
      fieldsLabel: "Okunan bilgiler",
      // Parcel, share and owner are invented; the owner's name is masked.
      fields: [
        { label: "Ada / Parsel", value: "1043 / 27" },
        { label: "Nitelik", value: "Mesken" },
        { label: "Bağımsız bölüm", value: "{floor} · No: 9" },
        { label: "Arsa payı", value: "40/1000" },
        { label: "Malik", value: "A*** Y***" },
        { label: "Hisse", value: "1/1" },
      ],
      encumbrancesLabel: "Takyidat",
      // Which line is flagged is in sample-file.ts (deedTones).
      encumbrances: [
        { kind: "İpotek", detail: "1. derece, banka lehine" },
        { kind: "Haciz", detail: "Kayıt yok" },
        { kind: "Şerh", detail: "Aile konutu şerhi" },
        { kind: "Beyan", detail: "Yönetim planı" },
      ],
      footnote: "Her satırın tapu kaydında nereden okunduğu belli.",
    },
  },
  field: {
    label: "Sahada",
    title: "Taşınmazı uzmanınız gezer, gördüklerini rapora Intelval işler.",
    lead: "Fotoğrafları sınıflandırır, mevcut durumu onaylı projeyle karşılaştırır ve uzmanın sesli notunu rapor alanlarına aktarır.",
    noteTitle: "Görselde",
    note: "Uzmanın sesli notu rapor alanlarına geçer, projeye aykırılık da işaretlenir.",
    rows: [
      {
        title: "Fotoğraf sayfasını düzenler.",
        description:
          "Fotoğrafları önce iç ve dış mekân olarak, sonra oda oda gruplar. Eksik fotoğraf varsa uzmana haber verir.",
      },
      {
        title: "Mevcut durumu onaylı projeyle karşılaştırır.",
        description:
          "Ruhsatsız tadilatları, birleştirilmiş daireleri ve projede olmayan ilave katları işaretler.",
      },
      {
        title: "Binanın durumunu not eder.",
        description:
          "Mutfağın, banyonun ve cephenin durumunu yazarken nem ve çatlak izlerini ayrıca belirtir.",
      },
      {
        title: "Sesli notu rapora geçirir.",
        description:
          "Uzman sahada konuştukça rapor alanları dolar. Arkasında, GBO’nun Kollektor ve Hastam’da da kullandığı sesli yapay zeka var.",
      },
    ],
    mock: {
      label:
        "Örnek saha notu. Uzman konuştukça Intelval söylenenleri rapor alanlarına yazıyor ve fotoğrafları oda oda diziyor. Balkonun odaya katıldığı da işaretli.",
      owner: "Değerleme uzmanının telefonu",
      title: "Saha notu",
      meta: "{file} · {rooms} · {floor} · {built}",
      transcriptLabel: "Uzmanın sesli notu",
      // Matches the sample file: renovated kitchen and bath (E-04's condition
      // adjustment) and the balcony joined to a room (135 against 128 m²). The
      // measured area is the token, so the note says what the flag compares.
      transcript:
        "Dördüncü kat, güney cepheli. Mutfak ve banyo yenilenmiş. Balkon kapatılıp odaya katılmış. Ölçümde {site} metrekare çıktı. Banyo tavanında hafif nem var. Dış cephede çatlak görmedim.",
      fieldsLabel: "Doldurulan rapor alanları",
      fields: [
        { label: "Yön", value: "Güney" },
        { label: "Mutfak", value: "Yenilenmiş" },
        { label: "Banyo", value: "Yenilenmiş · tavanda nem" },
        { label: "Dış cephe", value: "Çatlak yok" },
        { label: "Balkon", value: "Odaya katılmış" },
      ],
      photosLabel: "Fotoğraf sayfası",
      photos: ["Dış cephe", "Bina girişi", "Salon", "Mutfak", "Oda 1", "Oda 2", "Oda 3", "Banyo"],
      flag: {
        title: "Mevcut durum projeye aykırı",
        detail: "Balkon odaya katılmış. Yerinde {site} m², onaylı projede {legal} m².",
      },
    },
  },
  // Wide chapter: no margin column, so the note is the mock's own, printed
  // under the comparables table.
  value: {
    label: "Değer",
    title: "Değer hesabını Intelval yapar, her adımını da uzmanınıza gösterir.",
    lead: "Taşınmazın mevcut durumdaki piyasa değerini ve onaylı projeye göre yasal durum değerini birlikte hesaplar. Sonucun sağlamasını da maliyet ve gelir yaklaşımlarıyla yapar.",
    rows: [
      {
        title: "Emsal taşınmazları bulur.",
        description:
          "Emsalleri ilanlardan ve firmanızın önceki raporlarından toplar. Mükerrer ilanları ayıklar, ilan fiyatından pazarlık payını düşer ve her emsali haritada gösterir.",
      },
      {
        title: "Düzeltme tablosunu hazırlar.",
        description:
          "Zaman, konum, alan, yaş, kat, manzara ve durum farkları için düzeltme yapar ve her birinin gerekçesini yazar.",
      },
      {
        title: "Arsa ve ticari taşınmazları da kapsar.",
        description:
          "Arsada kat karşılığı paylaşım oranını bulur, artık değer yöntemiyle geliştirme hesabını yapar. Ticari taşınmazda ise değere kira gelirinden yola çıkarak ulaşır.",
      },
      {
        title: "Mevcut ve yasal durum değerini birlikte verir.",
        description:
          "Bu iki değeri aynı tabloda gösterir, sonucu da maliyet ve gelir yaklaşımlarıyla kontrol eder.",
      },
    ],
    mock: {
      label:
        "Örnek emsal karşılaştırma tablosu. İlan fiyatlarından pazarlık payı düşülüyor, {comps} emsale düzeltme uygulanıyor ve m² birim değeri hesaplanıyor. Altta, daire ve emsaller sokak haritasında görünüyor. Mevcut ve yasal durum değeri ile kontrol amaçlı iki yaklaşım da yer alıyor.",
      owner: "Değerleme uzmanının ekranı",
      title: "Emsal karşılaştırma tablosu",
      meta: "{file} · {place}",
      columns: {
        comp: "Emsal",
        source: "Kaynak",
        area: "Alan",
        price: "Fiyat",
        discount: "Pazarlık",
        adjustment: "Düzeltme",
        unitPrice: "Birim değer",
      },
      kinds: { listing: "İlan", archive: "Önceki rapordan" },
      adjustments: {
        time: "Zaman",
        location: "Konum",
        size: "Alan",
        age: "Yaş",
        floor: "Kat",
        condition: "Durum",
      },
      averageLabel: "Ortalama birim değer",
      marketLabel: "Mevcut durum değeri",
      legalLabel: "Yasal durum değeri",
      checksLabel: "Yalnızca kontrol amaçlı",
      costLabel: "Maliyet yaklaşımı",
      incomeLabel: "Gelir yaklaşımı",
      perSqm: "TL/m²",
      million: "milyon TL",
      mapLegend: { subject: "Değerlemeye konu daire", comp: "Emsal" },
      // IVS warns against averaging divergent approaches: say it once here.
      note: "Bu dosyada değere emsal karşılaştırma yaklaşımıyla ulaşıldı. Maliyet ve gelir yaklaşımları yalnızca kontrol amaçlı kullanıldı, ortalamaya katılmadı.",
    },
  },
  writes: {
    label: "Taslak",
    title: "Taslak, çalıştığınız bankanın kendi şablonunda hazırlanır.",
    lead: "Intelval taslağı yazarken emsal taşınmazların neden seçildiğini ve düzeltmelerin gerekçesini de anlatır.",
    noteTitle: "Görselde",
    note: "Önde taslaktan bir sayfa, arkada aynı sayfanın İngilizcesi. İşaretli sayıların kaynağı belli.",
    rows: [
      {
        title: "Bankanın şablonunu kullanır.",
        description:
          "Taslak, çalıştığınız her bankanın kendi rapor şablonunda çıkar; uzmanınız işe boş sayfadan başlamaz.",
      },
      {
        title: "Gerekçe metnini de yazar.",
        description:
          "Bu emsaller neden seçildi, düzeltmeler neden yapıldı? Hepsini sade bir dille anlatır. Uluslararası Değerleme Standartları (IVS) da uzmanın değere nasıl ulaştığını açıklamasını ister. Uzman metni okur ve kendi sözleriyle son hâline getirir.",
      },
      {
        title: "Gerekirse İngilizce rapor da hazırlar.",
        description:
          "Yabancılara satış ve vatandaşlık başvuruları için taslağı İngilizce de hazırlar. TKGM genelgesine göre bu raporlarda emsallerin uydu haritasında gösterilmesi gerekir.",
      },
    ],
    mock: {
      label:
        "Örnek taslaktan bir sayfa, bankanın şablonunda. Üstte salonun fotoğrafı, mevcut durum ve yasal durum değeri, altta emsal seçiminin gerekçesi var. İşaretli sayıların kaynağı belli. İmza kutusu boş, uzmanı bekliyor. Arkada aynı sayfanın İngilizcesi duruyor.",
      owner: "Değerleme uzmanının ekranı",
      title: "Rapor taslağı",
      meta: "{file} · Taslak",
      templateLabel: "Şablon",
      template: "Banka · konut kredisi değerleme raporu",
      languagesLabel: "Dil",
      // The paragraph is the sample report's own text: it lives in
      // sample-file.ts (draftParagraph).
      languages: { tr: "Türkçe", en: "İngilizce" },
      sourceHint: "İşaretli her sayının kaynağı belli.",
      marketLabel: "Mevcut durum değeri",
      legalLabel: "Yasal durum değeri",
      million: "milyon TL",
      // The balcony joined to a room: the two values rest on two areas.
      siteArea: "Yerinde {site} m²",
      legalArea: "Onaylı projede {legal} m²",
      // The valuer signs; on the draft the box is empty.
      signLabel: "Sorumlu değerleme uzmanı",
      signState: "İmza bekliyor",
    },
  },
  checks: {
    label: "Kontrol",
    title: "Taslak, teslimden önce Intelval’in kontrolünden geçer.",
    lead: "Her sayının kaynağını gösterir, sonucu resmî değerlerle karşılaştırır ve iki ayrı firmanın raporu arasındaki farkı açıklar.",
    noteTitle: "Görselde",
    note: "Örnek dosyanın kontrol listesi. İşaretli satırlarda kararı değerleme uzmanı verir.",
    rows: [
      {
        title: "Her sayının kaynağı belli.",
        description:
          "Rapordaki her sayının hangi belgeden ya da emsalden geldiğini görürsünüz. SPK düzenlemeleri de firmanın çalışma kâğıtlarının rapordaki sonucu desteklemesini ister.",
      },
      {
        title: "Teslimden önce eksikleri bulur.",
        description:
          "Eksik bilgileri, çelişkileri ve banka şartnamesine uymayan noktaları listeler, bu listeyi de firmanızın kontrol uzmanına iletir.",
      },
      {
        title: "Resmî değerden sapmayı yakalar.",
        description:
          "Hesaplanan değeri emlak vergisi değeri ve TKGM’nin değer haritasıyla karşılaştırır, sapma varsa uzmanı uyarır.",
      },
      {
        title: "Bankaya gelen raporları da kontrol eder.",
        description:
          "BDDK değerleme yönetmeliğine (madde 20/2) göre banka, değeri 10 milyon TL’yi aşan taşınmazlar için iki ayrı firmadan rapor alır. Değerler arasındaki fark %10’u aşarsa üçüncü bir firma değerleme yapar. Intelval, bu iki rapor arasındaki farkı açıklar.",
      },
    ],
    mock: {
      label:
        "Örnek kontrol listesi, {checks} madde: {passed} tamam, {informed} bilgi amaçlı, {flagged} madde değerleme uzmanının kararını bekliyor.",
      owner: "Kontrol uzmanının ekranı",
      title: "Teslim öncesi kontrol",
      meta: "{file} · İmzadan önce",
      // What each check found is in sample-file.ts (checkTones); the label and
      // the summary name its counts by token.
      items: [
        {
          text: "Her sayının kaynağı var",
          detail: "Rapordaki her sayı bir belgeye ya da bir emsale dayanıyor.",
        },
        {
          text: "Banka şablonu tam",
          detail: "Bankanın istediği bütün alanlar dolu.",
        },
        {
          text: "Resmî değerle karşılaştırma",
          detail: "Sonuç, emlak vergisi değeri ve TKGM’nin değer haritasıyla karşılaştırıldı.",
        },
        {
          text: "Alanda projeye aykırılık",
          detail: "Yerinde {site} m², onaylı projede {legal} m². Taslakta mevcut durum değeri ve yasal durum değeri birlikte yer alıyor.",
        },
        {
          text: "Eksik bilgi",
          detail: "İskân tarihi belgede okunmuyor. Değerleme uzmanına soruldu.",
        },
      ],
      summary: "{flagged} konu değerleme uzmanının kararını bekliyor.",
    },
  },
  signoff: {
    label: "İmza",
    title: "Raporu, taşınmazı yerinde inceleyen uzman imzalar.",
    lead: "Taslağı Intelval yazar, uzman ise okuyup gerekli gördüğü değişiklikleri yapar ve raporu imzalar.",
    noteTitle: "BDDK değerleme yönetmeliği, madde 14",
    note: "Raporu, değerleme işini bizzat yürüten ve taşınmazı yerinde inceleyen uzmanlar hazırlar ve imzalar.",
    steps: [
      {
        title: "Uzman taslağı okur.",
        description:
          "Emsal taşınmazları, düzeltmeleri ve gerekçeyi, her sayının kaynağını yanında görerek gözden geçirir.",
      },
      {
        title: "Değişiklikleri uzman yapar.",
        description:
          "İsterse bir emsali çıkarır, bir düzeltmeyi değiştirir ya da metni baştan yazar. Son değere de kendisi karar verir.",
      },
      {
        title: "Raporu uzman imzalar.",
        description:
          "Rapor değerleme uzmanının imzasıyla çıkar, Intelval imza atmaz.",
      },
    ],
  },
  phone: {
    label: "Telefon",
    title: "Telefonda yerinde inceleme randevusu ayarlar, rapor süreciyle ilgili soruları yanıtlar.",
    lead: "GBO’nun Kollektor ve Hastam’da kullandığı sesli yapay zeka, firmanızın telefon hattında da çalışır.",
    noteTitle: "Nasıl okunur",
    note: "Solda telefondaki kişinin sözleri, sağda Intelval’in attığı adım.",
    sayLabel: "Telefondaki kişi",
    doLabel: "Intelval ne yapar",
    rows: [
      {
        say: "“Cumartesi sabahı evdeyim, o zaman gelin.”",
        title: "Yerinde inceleme için randevu ayarlar.",
        description:
          "Mülk sahibini arayıp uygun bir saat belirler, uzmanınız da o saatte taşınmaza gider.",
      },
      {
        say: "“Kredi için evime değerleme yapıldı. Rapor ne aşamada?”",
        title: "Dosyanın durumunu bildirir.",
        description:
          "Kredi müşterisi firmanızı aradığında, dosyanın hangi aşamada olduğunu Intelval söyler.",
      },
      {
        say: "“Rapor kaç günde çıkar?”",
        title: "Soruyu sizin yerinize yanıtlar.",
        description:
          "Böylece uzmanınız sahadayken bu soru için aranmaz, ekibiniz de işine devam eder.",
      },
    ],
  },
  audience: {
    label: "Kimler için",
    title: "Değerleme firmaları için geliştirildi, bankalar ve hukuk büroları da kullanabilir.",
    lead: "Değerleme yapan, gelen raporları kontrol eden ya da ön değer analizine ihtiyaç duyan ekipler için.",
    noteTitle: "Bilgi",
    note: "Ön analiz, değerleme raporu yerine geçmez. Rapor ancak lisanslı uzmanın imzasıyla çıkar.",
    imageAlt: "Gün ışığında taş ve cam cepheli binalar",
    rows: [
      {
        title: "Değerleme firmaları",
        description:
          "Bankalara konut, arsa ve ticari taşınmaz raporu hazırlayan lisanslı firmalar. Taslağı Intelval yazar, raporu uzmanınız imzalar.",
      },
      {
        title: "Bankaların değerleme ve kontrol birimleri",
        description:
          "Bankaya gelen raporları Intelval kontrol eder; değeri 10 milyon TL’yi aşan taşınmazlarda iki firmanın raporu arasındaki farkı da açıklar.",
      },
      {
        title: "Hukuk büroları",
        description:
          "İcra ihalesi, kamulaştırma, miras paylaşımı ve boşanmada mal rejiminin tasfiyesi için Intelval ön değer analizi hazırlar.",
      },
      {
        title: "Kentsel dönüşüm",
        description:
          "Dönüşüm projelerinde hak sahipliği ve paylaşım hesabı için ön analiz yapar.",
      },
      {
        title: "Toplu yeniden değerleme",
        description:
          "Bankanın teminat portföyündeki her taşınmaz için ön değer analizi yaparak portföyü düzenli aralıklarla güncel tutar.",
      },
    ],
  },
  rules: {
    label: "Kurallar",
    title: "İmza, yerinde inceleme ve son karar uzmanda kalır.",
    lead: "Intelval taslağı yazıp kontrol eder ama uzmanın yerine geçmez.",
    noteTitle: "Altı kural",
    note: "İlk dört madde Intelval’in yapmadığı işleri, son ikisi her taslakta uyduğu kuralları sayar.",
    items: [
      {
        title: "İmza atmaz.",
        description:
          "Raporu, işi bizzat yürüten ve taşınmazı yerinde inceleyen uzman imzalar. BDDK değerleme yönetmeliği (madde 14) bunu şart koşar.",
      },
      {
        title: "Saha ziyaretinin yerini tutmaz.",
        description:
          "Taşınmazı uzman yerinde görür, Intelval ise onun notlarını ve çektiği fotoğrafları rapora işler.",
      },
      {
        title: "Değeri tek başına belirlemez.",
        description:
          "Hesabı yapıp her adımını gösterir, son değere ise uzman karar verir.",
      },
      {
        title: "Sorumluluğu devralmaz.",
        description:
          "Taslağı uzman okuyup değiştirir; rapordaki her kararın sorumluluğu da ona aittir.",
      },
      {
        title: "Her sayının kaynağını gösterir.",
        description:
          "Taslaktaki her sayının hangi belgeden ya da hangi emsalden geldiği görünür.",
      },
      {
        title: "Yasal durumu taslağa işler.",
        description:
          "Taşınmaz onaylı projeye aykırıysa taslakta mevcut durum ve yasal durum değerini birlikte verir.",
      },
    ],
  },
  faq: {
    label: "Sorular",
    title: "Değerleme firmalarının sık sorduğu sorular.",
    lead: "Sorunuzun yanıtı burada yoksa demoda konuşalım.",
    noteTitle: "Bilgi",
    note: "Intelval’in yapmadığı işler Kurallar bölümünde yazılı.",
    items: [
      {
        question: "Raporu Intelval mi imzalar?",
        answer:
          "Hayır. Raporu, taşınmazı yerinde inceleyen değerleme uzmanı imzalar. Intelval’in işi taslağı yazmak ve kontrol etmektir.",
      },
      {
        question: "Yerinde incelemeye yine gerek var mı?",
        answer:
          "Evet. Taşınmazı yine uzman yerinde görür; Intelval ise fotoğrafları sınıflandırır, sesli notu rapora geçirir ve onaylı projeye aykırılıkları işaretler.",
      },
      {
        question: "Hangi taşınmaz türleri için kullanılabilir?",
        answer:
          "Konut, arsa ve ticari taşınmazlar için. Arsada kat karşılığı paylaşım oranını bulur, artık değer yöntemiyle geliştirme hesabını yapar. Ticari taşınmazda ise değere kira gelirinden yola çıkarak ulaşır.",
      },
      {
        question: "Emsal taşınmazlar nereden geliyor?",
        answer:
          "İlanlardan ve firmanızın önceki raporlarından. Mükerrer ilanlar ayıklanır, ilan fiyatından pazarlık payı düşülür. Her emsal hem haritada hem düzeltme tablosunda görünür.",
      },
      {
        question: "Taslak bankanın kendi şablonunda mı hazırlanıyor?",
        answer:
          "Evet, çalıştığınız her bankanın kendi şablonunda. Teslimden önce, bankanın şartnamesine uymayan noktalar da listelenir.",
      },
      {
        question: "Raporu İngilizce de hazırlar mı?",
        answer:
          "Evet, yabancılara satış ve vatandaşlık başvuruları için. TKGM genelgesi bu raporlarda emsallerin uydu haritasında gösterilmesini, düzeltme ve pazarlık hesabının açıkça yazılmasını, piyasa ve yasal durum değerinin birlikte verilmesini ister.",
      },
      {
        question: "Bankalar Intelval’i kullanabilir mi?",
        answer:
          "Evet. Bankanın değerleme ve kontrol birimi, gelen raporları Intelval ile kontrol edebilir. Değeri 10 milyon TL’yi aşan taşınmazlarda iki ayrı firmanın raporu gerekir. Intelval bu iki rapor arasındaki farkı da açıklar.",
      },
      {
        question: "Nasıl başlarız?",
        answer: "İlk adım bir demo. Bunun için sayfanın sonundaki formu doldurmanız yeterli.",
      },
    ],
  },
  ctaAssurances: [
    "Raporu uzmanınız imzalar",
    "Her sayının kaynağı belli",
    "Türkçe ve İngilizce taslak",
  ],
};

export default intelvalPage;
