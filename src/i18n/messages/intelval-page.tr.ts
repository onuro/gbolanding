import type { IntelvalPageMessages } from "@/i18n/page-types/intelval";

// /intelval, Turkish. Rules this file is written against (the header of
// page-types/intelval.ts holds the full list):
//   - Intelval reads, works out the value, drafts and checks. The licensed
//     valuer who inspected the property reviews, edits and signs. It never
//     signs, never replaces the site visit and never fixes the value alone;
//   - the only legal facts are the verified ones: BDDK Art. 14 (the inspecting
//     valuers prepare and sign), Art. 20/2 (two firms above 10 million TL, a
//     third past 10%), SPK on working papers, the TKGM circular for foreign
//     buyers, and IVS on explaining how the value was reached;
//   - no accuracy figure, price, client or bank name, compliance badge,
//     hosting, e-signature or audit-log claim, and not the home page's "800+";
//   - "emsal" only where it plainly means a comparable property, never bare in
//     a heading; never "AVM"; "yerinde inceleme" rather than "ekspertiz".
// The Göztepe flat (IV-0587), its comparables, the deed, the owner and the
// parcel are invented sample data. Its facts and figures, the draft's
// paragraph and which lines are flagged live in
// components/intelval-page/sample-file.ts; copy names a fact by token
// ({file}, {site} ...). Only the deed's parcel, share and owner and the
// valuer's own words are written out here.
const intelvalPage: IntelvalPageMessages = {
  metaTitle: "Intelval: Değerleme Firmaları için Yapay Zeka | GBO Vision",
  metaDescription:
    "Intelval, GBO Vision’ın (gbovision.com) değerleme yapay zekasıdır. Belgeleri okur, değeri hesaplar, rapor taslağını banka şablonunda yazar. İmzayı uzman atar.",
  hero: {
    eyebrow: "Lisanslı değerleme firmaları için",
    title: "Intelval rapor taslağını yazar, imzayı uzmanınız atar.",
    lead: "Intelval belgeleri okur ve değeri hesaplar. Taslağı bankanın şablonunda yazar ve kontrol eder. Taşınmazı yerinde inceleyen uzman taslağı gözden geçirir ve raporu imzalar.",
    chips: ["Konut, arsa ve ticari", "Her bankanın kendi şablonu", "İmzayı uzman atar"],
    primaryCta: "Demo isteyin",
    secondaryCta: "Örnek dosyayı görün",
    steps: [
      {
        title: "Belgeleri ve saha notunu okur.",
        description:
          "Tapudan, imar durumundan ve projeden bilgiyi çıkarır. Sesli notu rapora yazar.",
      },
      {
        title: "Değeri hesaplar, taslağı yazar.",
        description:
          "Emsal taşınmazlara düzeltme yapar, iki değeri hesaplar, taslağı yazar.",
      },
      {
        title: "Uzmanınız inceler ve imzalar.",
        description: "Taşınmazı yerinde inceleyen uzman taslağı düzeltir ve raporu imzalar.",
      },
    ],
  },
  heroPicture: {
    label:
      "Örnek değerleme dosyası. Uzman daireyi yerinde inceler ve sesli not alır. Intelval notu ve tapuyu okur, değeri hesaplar, taslağı yazar. Taslak, uzmanın imzasını bekler.",
    labels: ["Sahadaki uzman", "Intelval’in okudukları", "Firmanızın ekranı"],
    // The same balcony the field picture flags: 135 m² on site, 128 in the
    // project. Two sentences quoted word for word from field.mock.transcript.
    note: { who: "Sesli saha notu", text: "Balkon kapatılıp odaya katılmış. Yerinde {site} metrekare ölçtüm." },
    deed: { who: "Tapu kaydı", text: "1043 ada 27 parsel · 1. derece ipotek" },
    cardTitle: "Rapor taslağı hazır",
    marketLabel: "Piyasa değeri",
    legalLabel: "Yasal durum değeri",
    compsLabel: "Emsal",
    compsValue: "{comps} taşınmaz",
    million: "milyon TL",
    // The draft stops where the valuer's work begins: nothing is signed here.
    cardFoot: "{file} · İmza uzmanda",
  },
  reads: {
    label: "Belgeler",
    title: "Intelval dosyadaki belgeleri okur, rapor için gereken bilgiyi çıkarır.",
    lead: "Tapu, imar durumu, onaylı proje, ruhsat, iskân ve önceki raporlar. Uzmanınız bilgiyi tek tek aramaz, dosyada kaynağıyla birlikte bulur.",
    noteTitle: "Nasıl okunur",
    note: "Solda belge, sağda Intelval’in ondan çıkardığı.",
    sayLabel: "Belge",
    doLabel: "Intelval ne çıkarır",
    rows: [
      {
        say: "Tapu kaydı",
        title: "Malik, hisse ve takyidat bilgisini çıkarır.",
        description:
          "İpotek, haciz ve şerhleri tek tek listeler. Ada, parsel ve nitelik bilgisini rapora yazar.",
      },
      {
        say: "İmar durumu",
        title: "İmar bilgisini çıkarır.",
        description:
          "TAKS, KAKS, kat adedi ve plan notlarını okur. Hepsi raporun imar bölümüne gider.",
      },
      {
        say: "Onaylı proje, yapı ruhsatı ve iskân",
        title: "Yasal durumu çıkarır.",
        description:
          "Projedeki alanı, kat adedini ve ruhsat bilgisini okur. Yerinde durum bunlarla karşılaştırılır.",
      },
      {
        say: "Aynı taşınmazın önceki raporları",
        title: "Neyin değiştiğini gösterir.",
        description:
          "Önceki raporla bugünkü dosyayı yan yana koyar. Değişen alanı, maliki ya da takyidatı işaretler.",
      },
    ],
    mock: {
      label:
        "Örnek tapu kaydı. Intelval malik, hisse ve takyidatı okur. İpotek bilgi olarak yazılır, şerh uzmanın önüne konur.",
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
      footnote: "Her satır, tapu kaydında okunduğu yere bağlıdır.",
    },
  },
  field: {
    label: "Sahada",
    title: "Uzman taşınmazı gezer, Intelval uzmanın gördüklerini rapora işler.",
    lead: "Fotoğrafları ayırır, projeyle yerinde durumu karşılaştırır. Uzmanın sesli notunu rapor alanlarına yazar.",
    noteTitle: "Resimde",
    note: "Uzmanın sesli notu rapor alanlarına yazılır. Projeden farklı olan yer işaretlenir.",
    rows: [
      {
        title: "Fotoğraf sayfasını düzenler.",
        description:
          "Fotoğrafları önce iç ve dış mekân, sonra oda oda ayırır. Eksik fotoğraf varsa uzmana söyler.",
      },
      {
        title: "Projeyle yerinde durumu karşılaştırır.",
        description:
          "Ruhsatsız değişikliği, birleştirilmiş daireyi ya da projede olmayan ilave katı işaretler.",
      },
      {
        title: "Bina durumunu not eder.",
        description:
          "Mutfağın, banyonun ve cephenin durumunu yazar. Nem ve çatlak izlerini ayrıca belirtir.",
      },
      {
        title: "Sesli notu rapora yazar.",
        description:
          "Uzman sahada konuşur, rapor alanları dolar. Burada da GBO’nun Kollektor ve Hastam’da kullandığı sesli yapay zeka çalışır.",
      },
    ],
    mock: {
      label:
        "Örnek saha notu. Uzman konuşur, Intelval notu rapor alanlarına yazar ve fotoğrafları oda oda dizer. Balkonun odaya katıldığı işaretlenir.",
      owner: "Değerleme uzmanının telefonu",
      title: "Saha notu",
      meta: "{file} · {rooms} · {floor} · {built}",
      transcriptLabel: "Uzmanın sesli notu",
      // Matches the sample file: renovated kitchen and bath (E-04's condition
      // adjustment) and the balcony joined to a room (135 against 128 m²). The
      // measured area is the token, so the note says what the flag compares.
      transcript:
        "Dördüncü kat, güney cephe. Mutfak ve banyo yenilenmiş. Balkon kapatılıp odaya katılmış. Yerinde {site} metrekare ölçtüm. Banyo tavanında hafif nem var. Cephede çatlak görmedim.",
      fieldsLabel: "Doldurulan rapor alanları",
      fields: [
        { label: "Yön", value: "Güney" },
        { label: "Mutfak", value: "Yenilenmiş" },
        { label: "Banyo", value: "Yenilenmiş\u00a0· tavanda nem" },
        { label: "Cephe", value: "Çatlak yok" },
        { label: "Balkon", value: "Odaya katılmış" },
      ],
      photosLabel: "Fotoğraf sayfası",
      photos: ["Dış cephe", "Bina girişi", "Salon", "Mutfak", "Oda 1", "Oda 2", "Oda 3", "Banyo"],
      flag: {
        title: "Projeyle yerinde durum farklı",
        detail: "Balkon odaya katılmış. Yerinde {site} m², onaylı projede {legal} m².",
      },
    },
  },
  // Wide chapter: no margin column, so the note is the mock's own, printed
  // under the comparables table.
  value: {
    label: "Değer",
    title: "Intelval hesabı yapar, her adımını uzmana gösterir.",
    lead: "Piyasa değerini ve yasal durum değerini birlikte hesaplar. Sonucu maliyet ve gelir yaklaşımlarıyla da kontrol eder.",
    rows: [
      {
        title: "Emsal taşınmazları bulur.",
        description:
          "İlanlardan ve firmanızın önceki raporlarından emsal toplar. Mükerrer ilanları ayıklar, ilan fiyatından pazarlık payını düşer ve her emsali haritaya işler.",
      },
      {
        title: "Düzeltme tablosunu kurar.",
        description:
          "Zaman, konum, alan, yaş, kat, manzara ve durum farkları için düzeltme yapar. Her düzeltmenin gerekçesini yazar.",
      },
      {
        title: "Arsa ve ticari taşınmazda da çalışır.",
        description:
          "Arsada kat karşılığı oranını ve geliştirme hesabını (artık değer) çıkarır. Ticari taşınmazda değeri kira gelirinden hesaplar.",
      },
      {
        title: "İki değeri birlikte hesaplar.",
        description:
          "Mevcut durumdaki piyasa değerini ve yasal durum değerini yan yana koyar. Sonucu maliyet ve gelir yaklaşımlarıyla kontrol eder.",
      },
    ],
    mock: {
      label:
        "Örnek karşılaştırma tablosu. İlan fiyatlarından pazarlık payı düşülür, {comps} emsale düzeltme uygulanır ve m² birim değeri bulunur. Altında bir sokak haritası daireyi ve emsalleri gösterir. Piyasa değeri, yasal durum değeri ve kontrol için iki yaklaşım da yer alır.",
      owner: "Değerleme uzmanının ekranı",
      title: "Karşılaştırma tablosu",
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
      marketLabel: "Piyasa değeri (mevcut durum)",
      legalLabel: "Yasal durum değeri",
      checksLabel: "Yalnızca kontrol için",
      costLabel: "Maliyet yaklaşımı",
      incomeLabel: "Gelir yaklaşımı",
      perSqm: "TL/m²",
      million: "milyon TL",
      mapLegend: { subject: "Değerlenen daire", comp: "Emsal" },
      // IVS warns against averaging divergent approaches: say it once here.
      note: "Bu dosyada değer, emsal karşılaştırma yaklaşımıyla bulunur. Maliyet ve gelir yaklaşımları yalnızca kontrol içindir, ortalamaya katılmaz.",
    },
  },
  writes: {
    label: "Taslak",
    title: "Taslak, bankanın kendi şablonunda yazılır.",
    lead: "Intelval taslağı her bankanın kendi şablonunda yazar. Emsal taşınmazların neden seçildiğini ve düzeltmelerin gerekçesini de anlatır.",
    noteTitle: "Resimde",
    note: "Taslaktan bir sayfa, arkasında aynı sayfanın İngilizcesi. İşaretli sayılar kaynağına bağlıdır.",
    rows: [
      {
        title: "Bankanın şablonunda yazar.",
        description:
          "Taslak her bankanın kendi rapor şablonunda çıkar. Uzmanınız boş bir sayfayla başlamaz.",
      },
      {
        title: "Gerekçenin taslağını yazar.",
        description:
          "Neden bu emsaller, neden bu düzeltmeler, sade bir dille anlatır. Uluslararası Değerleme Standartları (IVS), uzmanın değere nasıl ulaştığını açıklamasını ister. Uzman bu metni okur ve kendi açıklaması olarak düzeltir.",
      },
      {
        title: "İngilizce de yazar.",
        description:
          "Yabancılara satış ve vatandaşlık başvuruları için İngilizce taslak yazar. TKGM genelgesi bu raporlarda emsallerin uydu haritasında gösterilmesini ister.",
      },
    ],
    mock: {
      label:
        "Örnek rapor taslağı, bankanın şablonunda bir sayfa. Üstte salonun fotoğrafı, piyasa değeri ve yasal durum değeri var. Altta emsal seçiminin gerekçesi yazılı. İşaretli sayılar kaynağına bağlanır. İmza kutusu boş, uzmanın imzasını bekler. Arkada aynı sayfanın İngilizcesi durur.",
      owner: "Değerleme uzmanının ekranı",
      title: "Rapor taslağı",
      meta: "{file} · Taslak",
      templateLabel: "Şablon",
      template: "Banka · konut kredisi değerleme raporu",
      languagesLabel: "Dil",
      // The paragraph is the sample report's own text: it lives in
      // sample-file.ts (draftParagraph).
      languages: { tr: "Türkçe", en: "İngilizce" },
      sourceHint: "İşaretli her sayı kaynağına bağlıdır.",
      marketLabel: "Piyasa değeri",
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
    title: "Intelval taslağı teslimden önce kontrol eder.",
    lead: "Her sayının kaynağını gösterir. Değeri resmî değerlerle karşılaştırır, iki rapor arasındaki farkı açıklar.",
    noteTitle: "Resimde",
    note: "Örnek dosyanın kontrol listesi. İşaretli satırlar değerleme uzmanının kararını bekler.",
    rows: [
      {
        title: "Her rakamın kaynağı görünür.",
        description:
          "Rapordaki her sayının hangi belgeden ya da emsalden geldiği gösterilir. SPK kurallarına göre firmanın çalışma kâğıtları rapordaki sonucu desteklemelidir.",
      },
      {
        title: "Teslimden önce kontrol eder.",
        description:
          "Eksik bilgiyi, çelişkiyi ve banka şartnamesine uymayan yerleri listeler. Liste, firmanızın kontrol uzmanına gider.",
      },
      {
        title: "Resmî değerden sapmada uyarır.",
        description:
          "Değeri emlak vergisi değeriyle ve tapunun değer haritasıyla karşılaştırır. Sapma varsa uzmanı uyarır.",
      },
      {
        title: "Bankaya gelen raporu kontrol eder.",
        description:
          "BDDK değerleme yönetmeliğine göre (madde 20/2), 10 milyon TL’yi aşan taşınmazda banka iki ayrı firmadan rapor alır. Fark %10’u aşarsa üçüncü bir firma değerleme yapar. Intelval iki rapor arasındaki farkı açıklar.",
      },
    ],
    mock: {
      label:
        "Örnek kontrol listesi, {checks} kontrol: {passed} tamam, {informed} bilgi için, {flagged} değerleme uzmanının kararını bekliyor.",
      owner: "Kontrol uzmanının ekranı",
      title: "Teslim öncesi kontrol",
      meta: "{file} · İmzadan önce",
      // What each check found is in sample-file.ts (checkTones); the label and
      // the summary name its counts by token.
      items: [
        {
          text: "Her rakamın kaynağı var",
          detail: "Rapordaki her sayı bir belgeye ya da bir emsale bağlı.",
        },
        {
          text: "Banka şablonu tam",
          detail: "Bankanın istediği bütün alanlar dolu.",
        },
        {
          text: "Resmî değerle karşılaştırma",
          detail: "Emlak vergisi değeri ve tapunun değer haritası yan yana kondu.",
        },
        {
          text: "Projeyle alan farkı",
          detail: "Yerinde {site} m², onaylı projede {legal} m². Taslakta piyasa değeri ve yasal durum değeri birlikte yer alıyor.",
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
    lead: "Intelval taslağı yazar. Uzman taslağı okur, istediğini değiştirir ve raporu imzalar.",
    noteTitle: "BDDK değerleme yönetmeliği, madde 14",
    note: "Raporu, değerleme işini bizzat yürüten ve yerinde inceleyen uzmanlar hazırlar ve imzalar.",
    steps: [
      {
        title: "Uzman taslağı okur.",
        description:
          "Her sayının yanında kaynağı durur. Uzman emsal taşınmazlara, düzeltmelere ve gerekçeye bakar.",
      },
      {
        title: "Uzman istediğini değiştirir.",
        description:
          "Bir emsal taşınmazı çıkarır, bir düzeltmeyi değiştirir, metni yeniden yazar. Son değere o karar verir.",
      },
      {
        title: "Uzman imzalar.",
        description:
          "Rapor, değerleme uzmanının imzasıyla çıkar. Intelval imza atmaz.",
      },
    ],
  },
  phone: {
    label: "Telefon",
    title: "Telefonda inceleme randevusu ayarlar, rapor sorularını yanıtlar.",
    lead: "GBO’nun Kollektor ve Hastam’da kullandığı sesli yapay zeka, firmanızın hattında da çalışır.",
    noteTitle: "Nasıl okunur",
    note: "Solda telefondaki kişinin söylediği, sağda Intelval’in yaptığı.",
    sayLabel: "Telefondaki kişi",
    doLabel: "Intelval ne yapar",
    rows: [
      {
        say: "“Cumartesi sabahı evdeyim, o saatte gelin.”",
        title: "Yerinde inceleme için saat ayarlar.",
        description:
          "Intelval ev sahibini arar, uygun saati onunla birlikte belirler. Uzmanınız o saatte taşınmaza gider.",
      },
      {
        say: "“Kredi için evimin değerlemesi yapıldı. Raporum ne durumda?”",
        title: "Raporun durumunu söyler.",
        description:
          "Müşteri firmanızı arar. Intelval dosyanın hangi aşamada olduğunu söyler.",
      },
      {
        say: "“Rapor kaç günde çıkar?”",
        title: "Soruyu sizin yerinize yanıtlar.",
        description:
          "Uzmanınız sahadayken aynı soru için aranmaz. Ekibiniz işine devam eder.",
      },
    ],
  },
  audience: {
    label: "Kimler için",
    title: "Değerleme firmaları için yapıldı. Bankalar ve hukuk büroları da kullanabilir.",
    lead: "Değer biçen, gelen raporu kontrol eden ya da ön analiz isteyen ekipler içindir.",
    noteTitle: "Bilgi",
    note: "Ön analiz bir değerleme raporu değildir. Rapor, lisanslı uzmanın imzasıyla çıkar.",
    imageAlt: "Gün ışığında taş ve cam cepheli binalar",
    rows: [
      {
        title: "Değerleme firmaları",
        description:
          "Bankalar için konut, arsa ve ticari taşınmaz raporu hazırlayan lisanslı firmalar. Intelval taslağı yazar, uzmanınız imzalar.",
      },
      {
        title: "Bankaların değerleme ve kontrol birimleri",
        description:
          "Bankaya gelen raporları kontrol eder. 10 milyon TL üstü taşınmazda iki rapor arasındaki farkı açıklar.",
      },
      {
        title: "Hukuk büroları",
        description:
          "İcra ihalesi, kamulaştırma, miras paylaşımı ve boşanmada mal rejimi tasfiyesi için ön değer analizi yapar.",
      },
      {
        title: "Kentsel dönüşüm",
        description:
          "Dönüşüm projelerinde hak sahipliği ve paylaşım hesabı için ön analiz yapar.",
      },
      {
        title: "Toplu yeniden değerleme",
        description:
          "Bankanın teminat portföyünü düzenli aralıklarla günceller. Portföydeki her taşınmaz için ön değer analizi yapar.",
      },
    ],
  },
  rules: {
    label: "Kurallar",
    title: "İmza, yerinde inceleme ve son karar uzmanda kalır.",
    lead: "Intelval taslağı yazar ve kontrol eder. Uzmanın yerine geçmez.",
    noteTitle: "Altı kural",
    note: "İlk dört madde Intelval’in yapmadığı işleri, son iki madde her taslakta uyduğu kuralları anlatır.",
    items: [
      {
        title: "İmza atmaz.",
        description:
          "Raporu, işi bizzat yürüten ve yerinde inceleyen uzman imzalar. BDDK değerleme yönetmeliğinin 14. maddesi bunu ister.",
      },
      {
        title: "Yerinde incelemeyi gereksiz kılmaz.",
        description:
          "Taşınmazı uzman yerinde görür. Intelval onun notunu ve çektiği fotoğrafları rapora işler.",
      },
      {
        title: "Değeri tek başına belirlemez.",
        description:
          "Hesabı yapar ve her adımını gösterir. Son değere uzman karar verir.",
      },
      {
        title: "Sorumluluğu devralmaz.",
        description:
          "Taslağı uzman okur ve değiştirir. Rapordaki her kararın sorumlusu uzmandır.",
      },
      {
        title: "Her rakamın kaynağını gösterir.",
        description:
          "Taslaktaki her sayının hangi belgeden ya da hangi emsalden geldiği görünür.",
      },
      {
        title: "Yasal durumu taslağa yazar.",
        description:
          "Proje ile yerinde durum farklıysa taslakta iki değeri birlikte gösterir: piyasa değeri ve yasal durum değeri.",
      },
    ],
  },
  faq: {
    label: "Sorular",
    title: "Değerleme firmalarının sorduğu sorular.",
    lead: "Burada olmayan soruyu demoda sorun.",
    noteTitle: "Bilgi",
    note: "Yapmadığı işler Kurallar bölümünde yazılı.",
    items: [
      {
        question: "Raporu Intelval mi imzalar?",
        answer:
          "Hayır. Raporu, taşınmazı yerinde inceleyen değerleme uzmanı imzalar. Intelval taslağı yazar ve kontrol eder.",
      },
      {
        question: "Yerinde inceleme yine de gerekir mi?",
        answer:
          "Evet. Uzman taşınmazı yerinde görür. Intelval fotoğrafları ayırır, sesli notu rapora yazar ve projeyle farkı işaretler.",
      },
      {
        question: "Hangi taşınmazlarda çalışır?",
        answer:
          "Konut, arsa ve ticari taşınmazlarda çalışır. Arsada kat karşılığı oranını ve geliştirme hesabını (artık değer) çıkarır. Ticari taşınmazda değeri kira gelirinden hesaplar.",
      },
      {
        question: "Emsal taşınmazlar nereden gelir?",
        answer:
          "İlanlardan ve firmanızın önceki raporlarından gelir. Mükerrer ilanlar ayıklanır, ilan fiyatlarından pazarlık payı düşülür. Her emsal haritada ve düzeltme tablosunda görünür.",
      },
      {
        question: "Bankanın kendi şablonunda yazar mı?",
        answer:
          "Evet. Taslak, her bankanın kendi şablonunda yazılır. Teslimden önce bankanın şartnamesine uymayan yerler de listelenir.",
      },
      {
        question: "İngilizce rapor yazar mı?",
        answer:
          "Evet. Yabancılara satış ve vatandaşlık başvuruları için İngilizce taslak yazar. TKGM genelgesi bu raporlarda üç şey ister. Emsaller uydu haritasında gösterilmeli. Düzeltme ve pazarlık hesabı açıkça yazılmalı. Piyasa değeri ile yasal durum değeri birlikte verilmeli.",
      },
      {
        question: "Bankalar Intelval’i kullanabilir mi?",
        answer:
          "Evet. Bankanın değerleme ve kontrol birimi, gelen raporları Intelval ile kontrol edebilir. 10 milyon TL üstü taşınmazda iki ayrı firmanın raporu gerekir. Intelval iki rapor arasındaki farkı açıklar.",
      },
      {
        question: "Nasıl başlarız?",
        answer: "İlk adım bir demodur. Sayfanın sonundaki formdan demo isteyin.",
      },
    ],
  },
  ctaAssurances: [
    "Raporu uzmanınız imzalar",
    "Her rakamın kaynağı görünür",
    "Türkçe ve İngilizce taslak",
  ],
};

export default intelvalPage;
