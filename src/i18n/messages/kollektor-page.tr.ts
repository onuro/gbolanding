import type { KollektorPageMessages } from "@/i18n/page-types/kollektor";

// Copy for /kollektor. Every claim is backed by the product repo. The numbers
// here are product settings (90 days, 30 seconds, 09.00 to 20.00), never
// results: call volumes and collected amounts stay off this page. Sample
// people in the mocks are made up, and each mock says so.
const kollektorPage: KollektorPageMessages = {
  metaTitle: "Kollektor: Sesli Yapay Zeka ile Tahsilat | GBO Vision",
  metaDescription:
    "Kollektor, GBO Vision’ın (gbovision.com) sesli yapay zeka tahsilat asistanıdır. Borçluyu Türkçe arar, ödeme sözünü teyit eder ve kaydeder.",
  hero: {
    eyebrow: "Hukuk büroları ve tahsilat ekipleri için",
    title: "Kollektor müşteriyi arar, ödeme sözünü kaydeder.",
    lead: "Borçlu müşteriyi arar. Net bir ödeme günü alır. Sözü yüksek sesle teyit eder, sonra kaydeder. Ekibiniz her aramayı canlı izler.",
    chips: ["Kayıt ve transkript", "Ekibiniz hattı devralabilir"],
    primaryCta: "Demo talep edin",
    secondaryCta: "Arama örneği",
    steps: [
      {
        title: "Kollektor borç müşterisini arar.",
        description:
          "Listenizdeki kişiyi Türkçe arar. Borçluya uygulama ya da bağlantı gerekmez.",
      },
      {
        title: "Ödeme gününü netleştirir.",
        description: "Günü ve tutarı yüksek sesle teyit eder.",
      },
      {
        title: "Söz ekranınıza düşer.",
        description:
          "Ekibiniz sözü, kaydı ve transkripti görür. Gerekirse hattı devralabilir.",
      },
    ],
  },
  heroPicture: {
    summary:
      "Örnek görüşme. Borçlunun telefonu çalar. Kollektor günü ve tutarı söyler, borçlu onaylar. Ödeme sözü ekibinizin ekranına düşer.",
    labels: ["Borçlunun telefonu", "Kollektor’un sesi", "Ekibinizin ekranı"],
    agent: { who: "Kollektor", text: "Cuma günü 8.400 TL ödeme yapacaksınız, değil mi?" },
    debtor: { who: "Borçlu", text: "Evet, kesin." },
    translated: "",
    cardTitle: "Ödeme sözü kaydedildi",
    cardRows: [
      { label: "Tutar", value: "₺8.400" },
      { label: "Tarih", value: "16 Eki Cuma" },
      { label: "Teyit", value: "Borçlu onayladı" },
    ],
    cardFoot: "K-2046 · Kayıt + transkript",
  },
  call: {
    label: "Örnek arama",
    title: "Bir aramayı baştan sona izleyin.",
    lead: "Kollektor, borçlu müşteriyle tahsilat görüşmesi yapar. Siz görüşmeyi ekrandan canlı takip edersiniz.",
    caption:
      "Bu örnekte kimlik sorusu ve iki parçalı ödeme açıktır. Senaryoyu siz belirlersiniz.",
    play: "Aramayı oynat",
    pause: "Aramayı duraklat",
    proof: [
      { value: "İnsan gibi konuşan AI", caption: "Borçlu müşteriyle doğal bir tahsilat görüşmesi yürütür." },
      {
        value: "Önce teyit",
        caption: "Görüşmede söz, borçlu açıkça onay verince kaydedilir.",
      },
      {
        value: "90 gün",
        caption: "Transkript ve ses kaydı 90 gün sonra silinir.",
      },
    ],
  },
  start: {
    label: "Başlangıç",
    title: "Listenizden ilk aramaya dört adım.",
    lead: "Müşteri bilgilerini CSV veya Excel dosyasıyla yükleyebilir ya da elle girebilirsiniz. Arama kampanyasını kendiniz oluşturup yönetirsiniz.",
    noteTitle: "Ekranınızda",
    note: "Resim ikinci adımı gösterir. Satırları tek tek görürsünüz.",
    rows: [
      {
        title: "Müşteri bilgilerini eklersiniz.",
        description:
          "Müşteri bilgilerini CSV veya Excel dosyasından yükleyebilir ya da tek tek elle girebilirsiniz.",
      },
      {
        title: "Satırlara bakarsınız.",
        description:
          "Liste tablo olarak açılır. Hatalı satırı düzeltir ya da dışarıda bırakırsınız.",
      },
      {
        title: "Kuralları yazarsınız.",
        description:
          "Arama saatini, günlük limiti ve tekrar aralığını seçersiniz.",
      },
      {
        title: "Kampanyayı oluşturursunuz.",
        description:
          "Arama kurallarını belirleyip kampanyayı kendiniz oluşturur, başlatır veya durdurursunuz.",
      },
    ],
    mock: {
      summary:
        "Örnek ekran. Yüklenen liste tablo olarak açılır. Üç satır hazırdır. Bir satırda telefon eksiktir. Bir satır dışarıda bırakılmıştır.",
      owner: "Ekibinizin ekranı",
      window: "Yeni arama grubu",
      file: "ekim-listesi.xlsx",
      steps: ["Liste yükle", "İncele", "Grup ayarları"],
      columns: ["Ad Soyad", "Telefon", "Borç", "Satır"],
      rows: [
        { name: "Selin A.", detail: "0532 ••• •• 18", amount: "₺8.400", state: "Hazır", tone: "done" },
        { name: "Murat T.", detail: "0544 ••• •• 07", amount: "₺21.750", state: "Hazır", tone: "done" },
        { name: "Derya K.", detail: "—", amount: "₺6.900", state: "Telefon yok", tone: "wait" },
        { name: "Hakan Ö.", detail: "0505 ••• •• 63", amount: "₺12.500", state: "Hazır", tone: "done" },
        { name: "Elif Ş.", detail: "0533 ••• •• 40", amount: "₺14.200", state: "Dışarıda", tone: "off" },
      ],
      foot: "5 satır · 3 hazır",
      next: "Devam",
    },
  },
  onCall: {
    label: "Görüşmede",
    title: "Kollektor görüşmeyi nasıl yönetir?",
    lead: "Müşterinin yanıtına göre ilerler. Ödeme gününü netleştirir, geri arama planlar veya görüşmeyi ekibinize aktarır.",
    noteTitle: "Örnek durumlar",
    note: "Müşterinin yanıtı ve Kollektor’un izlediği adım.",
    sayLabel: "Müşterinin yanıtı",
    doLabel: "Kollektor’un adımı",
    rows: [
      {
        say: "“Borcum ne kadar?”",
        title: "Kimlik sorusu varsa önce onu sorar.",
        description: "Bu bir akış ayarıdır. Cevap tutmadan tutar söylemez.",
      },
      {
        say: "“Bugün hepsini ödeyemem.”",
        title: "Net bir gün ister.",
        description:
          "Belirsiz cevabı söz saymaz. Kısmi ödeme, akış izin verirse konuşulur.",
      },
      {
        say: "“Tamam, cuma öderim.”",
        title: "Sözü tekrar eder, onay bekler.",
        description:
          "Tarihi ve tutarı yüksek sesle söyler. Açık bir “evet” duyunca kaydeder.",
      },
      {
        say: "“Pazar günü yatırırım.”",
        title: "Olmayacak günü kaydetmez.",
        description:
          "Hafta sonu, resmi tatil ya da geçmiş bir gün söz olmaz. Sistem bu sözü geri çevirir.",
      },
      {
        say: "“Şimdi müsait değilim.”",
        title: "Geri aramayı takvime yazar.",
        description:
          "Geri arama zamanını kaydeder. Ekibiniz bunu takvimde görür.",
      },
      {
        say: "“Bir yetkiliyle görüşeceğim.”",
        title: "Ekibinizi arar.",
        description:
          "Müsait temsilcinin ekranı çalar. Kollektor o sırada hatta kalır.",
      },
      {
        say: "“Yanlış numara.”",
        title: "Numarayı aranmaz listesine alır.",
        description:
          "Numara aranmaz listesine girer. Hiçbir arama grubu onu bir daha aramaz.",
      },
    ],
  },
  team: {
    label: "Ekranınız",
    title: "Ekibiniz her görüşmeyi ekranda görür.",
    lead: "Borçlu müşteri yalnızca telefonla görüşür. Görüşme, bir çağrı merkezi araması gibi ilerler.",
    note: "Resim, bugünkü aramaları ve seçili olanı gösterir.",
    rows: [
      {
        title: "Canlı transkript",
        description:
          "Konuşma, söylendiği anda ekrana yazılır. Temsilci isterse canlı dinler.",
      },
      {
        title: "Ödeme sözü",
        description: "Tutar ve tarih, görüşme sürerken kayda girer.",
      },
      {
        title: "Geri arama takvimi",
        description:
          "Geri aramalar takvimde durur. Ekibiniz günü ve saati değiştirir.",
      },
      {
        title: "Kayıt ve transkript",
        description:
          "Her görüşmenin sesi ve yazısı açılır. Ses kaydını indirirsiniz.",
      },
      {
        title: "İnceleme listesi",
        description:
          "Sistem sonuçtan emin değilse ekibinize sorar. Temsilci onaylar ya da düzeltir.",
      },
      {
        title: "Raporlar",
        description:
          "Kaç kişi arandı, kaçına ulaşıldı, kaç söz alındı. Günlük, haftalık ve aylık görürsünüz.",
      },
    ],
    mock: {
      summary:
        "Örnek ekran. Günün altı görüşmesi sonuçlarıyla listelenir. Seçili görüşmede ödeme sözü, ses kaydı ve son iki cümle görünür.",
      owner: "Ekibinizin ekranı",
      window: "Görüşmeler",
      range: "Bugün",
      columns: ["Borçlu", "Saat", "Süre", "Sonuç"],
      // The first three are the ready rows of the list mock above. The others
      // are not on that list: a person it leaves out is never called here.
      rows: [
        { name: "Selin A.", time: "10:24", length: "02:41", state: "Ödeme sözü", tone: "done" },
        { name: "Murat T.", time: "10:31", length: "01:12", state: "Geri arama", tone: "done" },
        { name: "Hakan Ö.", time: "10:38", length: "03:05", state: "İncelenmeli", tone: "wait" },
        { name: "Zeynep D.", time: "10:44", length: "—", state: "Cevap yok", tone: "off" },
        { name: "Burak Y.", time: "10:52", length: "01:48", state: "Ödeme sözü", tone: "done" },
        { name: "Aylin C.", time: "10:57", length: "00:54", state: "Geri arama", tone: "done" },
      ],
      detailTitle: "Selin A. · K-2046",
      detailRows: [
        { label: "Ödeme sözü", value: "₺8.400" },
        { label: "Tarih", value: "16 Eki Cuma" },
      ],
      recording: "Ses kaydı",
      duration: "02:41",
      lines: [
        { who: "Kollektor", text: "Cuma günü 8.400 TL ödeme yapacaksınız, değil mi?" },
        { who: "Borçlu", text: "Evet, kesin." },
      ],
    },
  },
  handoff: {
    label: "Devralma",
    title: "Gerekince hattı bir insan alır.",
    lead: "Devir, Kollektor’un tarayıcıda açılan telefonunda olur. Dış bir çağrı merkezine aktarma yoktur.",
    noteTitle: "Ekranınızda",
    note: "Resim, temsilcinin ekranında çalan çağrıyı gösterir.",
    rows: [
      {
        title: "Kollektor ekibinizi arar.",
        description:
          "Müsait temsilcinin ekranı 30 saniye çalar. Kollektor bu sırada konuşmayı sürdürür.",
      },
      {
        title: "Temsilci “Devral” der.",
        description:
          "Tarayıcıdan aynı görüşmeye girer ve sözü alır. Yapay zeka susar.",
      },
      {
        title: "Kimse açmazsa arama sürer.",
        description:
          "Kollektor bunu borçluya söyler. Görüşmeyi kendisi sürdürür.",
      },
      {
        title: "Temsilci kendi de arar.",
        description:
          "İsterse yapay zeka dinler ve bir söz taslağı çıkarır. Temsilci onaylar, düzeltir ya da reddeder.",
      },
    ],
    mock: {
      summary:
        "Örnek ekran. Temsilcinin ekranında bir çağrı çalar. Borçlunun adı, son iki cümle ve Devral düğmesi görünür.",
      owner: "Temsilcinin ekranı",
      window: "Bekleyen çağrı",
      ringing: "Çalıyor · 00:12",
      name: "Hakan Ö.",
      meta: "Tel ***1863 · K-2051",
      lines: [
        { who: "Kollektor", text: "Bugün ödeme yapacak mısınız?" },
        { who: "Borçlu", text: "Bir yetkiliyle görüşeceğim." },
      ],
      take: "Devral",
      foot: "Açılmazsa arama sürer",
    },
  },
  rules: {
    label: "Kurallar",
    title: "Kim, ne zaman, kaç kez aranır, siz yazarsınız.",
    lead: "Her arama grubu kendi kurallarıyla çalışır.",
    noteTitle: "Bilgi",
    note: "Arama saatleri hazır gelir. Her grup için siz seçersiniz.",
    rows: [
      {
        title: "Arama saatleri",
        description:
          "Hazır ayar pazartesiden cumartesiye, 09.00 ile 20.00 arasıdır. Her grup için siz seçersiniz.",
      },
      {
        title: "Numara başına arama",
        description: "Bir numara en çok kaç kez aranır, siz yazarsınız.",
      },
      {
        title: "Günlük limit",
        description: "Bir kişi bir günde en çok kaç kez aranır, siz yazarsınız.",
      },
      {
        title: "Tekrar aralığı",
        description:
          "Açılmayan arama ne zaman tekrar edilir, siz seçersiniz. Sonuçlanan görüşmeden sonra grup o kişiyi tekrar aramaz. Geri arama isteyen kişi aranır.",
      },
      {
        title: "Başlangıç ve bitiş günü",
        description: "Bitiş günü geçince grup arama yapmaz.",
      },
      {
        title: "Aranmaz listesi",
        description:
          "Kurumunuzun tek bir aranmaz listesi vardır. Her grup bu listeye uyar. Temsilci elle de ekler.",
      },
    ],
  },
  data: {
    label: "Veri",
    title: "Veriyle ne yaptığını açıkça yazdık.",
    lead: "Rozet göstermiyoruz. Sistemin veriyle ne yaptığını gösteriyoruz.",
    noteTitle: "Nasıl okunur",
    note: "Her kutu, sistemin veriyle yaptığı bir işi gösterir.",
    items: [
      {
        title: "Sistem kaydı son dört haneyi gösterir.",
        description:
          "Sistem kayıtlarında telefon son dört haneyle görünür. T.C. kimlik numarasının yalnızca son dört hanesi saklanır.",
      },
      {
        title: "90 gün sonra silinir.",
        description:
          "Transkript ve ses kaydı 90 gün sonra silinir. Bunlar süresiz saklanmaz.",
      },
      {
        title: "Her kurumun verisi ayrıdır.",
        description:
          "Her kurum yalnızca kendi verisini görür. Kimin neyi göreceğini rol ve yetkiyle siz yazarsınız.",
      },
    ],
    pictures: {
      logSummary: "Örnek sistem kaydı. Telefon son dört haneyle yazılır.",
      logTitle: "Sistem kaydı",
      // The same three calls as the team screen, so the endings match the
      // phones in the list mock (18, 07, 63).
      logRows: [
        { label: "10:24:07", value: "Tel ***4218" },
        { label: "10:31:02", value: "Tel ***9107" },
        { label: "10:38:15", value: "Tel ***1863" },
      ],
      keepSummary:
        "Görüşme günü kayıt başlar. Doksan gün sonra transkript ve ses kaydı silinir.",
      keepFrom: { label: "Gün 0", value: "Görüşme" },
      keepTo: { label: "Gün 90", value: "Silinir" },
      keepItems: ["Transkript", "Ses kaydı"],
      roleSummary:
        "Örnek yetki tablosu. Temsilci görüşmeleri okur ve yazar, borçluları yalnızca okur, ayarları görmez.",
      roleTitle: "Rol: Temsilci",
      roleColumns: ["Oku", "Yaz"],
      roleRows: [
        { label: "Görüşmeler", value: "rw" },
        { label: "Borçlular", value: "r" },
        { label: "Ayarlar", value: "" },
      ],
    },
  },
  audience: {
    label: "Kimler için",
    title: "Hukuk büroları ve tahsilat ekipleri için yapıldı.",
    lead: "Kredi, kredi kartı ve fatura alacağı takip eden ekipler içindir.",
    noteTitle: "Bilgi",
    note: "Borçlu müşteriyle görüşme, çağrı merkezi araması gibi ilerler.",
    imageAlt: "Masada duran bir kulaklık",
    rows: [
      {
        title: "Hukuk büroları",
        description: "Alacaklı adına dosya takip eden bürolar içindir.",
      },
      {
        title: "Tahsilat ekipleri",
        description:
          "Uzun listeleri telefonla arayan alacak yönetim şirketleri içindir.",
      },
      {
        title: "Yönetici ve temsilci",
        description:
          "Yönetici kuralları ve yetkileri yazar. Temsilci aramaları izler, gerekince hattı alır.",
      },
    ],
  },
  faq: {
    label: "Sorular",
    title: "Aklınıza gelen soruların cevabı.",
    lead: "Yapmadığı işleri de açıkça yazdık.",
    noteTitle: "Bilgi",
    note: "Burada yoksa demo sırasında sorun.",
    items: [
      {
        question: "Kollektor hangi dilde arar?",
        answer:
          "Aramalar Türkçe yapılır. Ekibinizin kullandığı ekran da Türkçedir.",
      },
      {
        question: "Kollektor ne yapmaz?",
        answer:
          "Ödeme almaz. SMS ya da ödeme bağlantısı göndermez. Paranın gelip gelmediğine kendisi bakmaz. Gelen ödemeyi ekibiniz işler.",
      },
      {
        question: "Müşteri bilgilerini nasıl eklerim?",
        answer:
          "Müşteri bilgilerini CSV veya Excel dosyasıyla yükleyebilir ya da elle girebilirsiniz. Ardından arama kampanyasını kendiniz oluşturabilirsiniz.",
      },
      {
        question: "Bir görüşmeyi biz alabilir miyiz?",
        answer:
          "Evet. Temsilci, tarayıcıda açılan telefondan görüşmeye girer. Dış bir çağrı merkezine aktarma yoktur.",
      },
      {
        question: "Kayıtlar ne kadar saklanır?",
        answer:
          "Transkript ve ses kaydı 90 gün sonra silinir. Bunlar süresiz saklanmaz.",
      },
      {
        question: "Her aramada kimlik sorulur mu?",
        answer:
          "Hayır. Bu bir akış ayarıdır. Akışa kimlik sorusu koyarsanız, cevap tutmadan borç bilgisi verilmez.",
      },
      {
        question: "Aramalar hangi numaradan yapılır?",
        answer:
          "Kendi hattınızı ve numaralarınızı eklersiniz. Arayan hattı her grup için siz seçersiniz.",
      },
    ],
  },
  ctaAssurances: [
    "Aramalar Türkçe yapılır",
    "Ses kayıtları 90 günde silinir",
    "Ekibiniz hattı devralabilir",
  ],
};

export default kollektorPage;
