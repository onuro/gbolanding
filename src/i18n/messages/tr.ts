import type { Messages } from "@/i18n/types";
import contactPage from "@/i18n/messages/contact-page.tr";
import privacyPage from "@/i18n/messages/privacy-page.tr";
import fountiblePage from "@/i18n/messages/fountible-page.tr";
import hastamPage from "@/i18n/messages/hastam-page.tr";
import intelvalPage from "@/i18n/messages/intelval-page.tr";
import kollektorPage from "@/i18n/messages/kollektor-page.tr";

const trMessages: Messages = {
  metadata: {
    title: "Kurumsal Yapay Zeka ve Özel Yazılım | GBO Vision",
    description:
      "GBO Vision, kurumsal yapay zeka ve özel yazılım geliştirir. Karmaşık işleri ve dağınık veriyi, el emeğini azaltan ve büyümeyi hızlandıran araçlara çevirir.",
  },
  about: {
    metaTitle: "GBO Vision Hakkında | Kurumsal Yapay Zeka Ajansı",
    metaDescription:
      "GBO Vision (gbovision.com), Türkiye merkezli bir kurumsal yapay zeka ajansıdır. Şirketler için yapay zeka ürünleri ve özel yazılım geliştiriyoruz.",
    eyebrow: "Şirket hakkında",
    title: "GBO Vision, işinize yarayan yapay zeka üretir.",
    lead: "GBO Vision, ya da gbovision, kurumsal bir yapay zeka ajansıdır. Yapay zeka ürünleri ve özel yazılımlar oluştururuz. Yavaş ilerleyen el işlerini, ekiplerin her gün açtığı araçlara çeviririz.",
    bodyTitle: "Kimlerle çalışıyoruz?",
    body: [
      "Hukuk büroları, bankalar ve değerleme firmaları ile çalışırız. Müşterilerimizin çoğu Türkiye'de. Yurt dışındaki ekiplere de iş yaparız. İngilizce, Almanca ve Türkçe çalışırız.",
      "Biz aynı zamanda bir ürün şirketiyiz. Kendi yazılımımızı yayına alır ve işletiriz. Kollektor ve Intelval şu an canlıda. İkisi de gerçek müşteri işinden doğdu.",
    ],
    productsTitle: "Neler ürettik",
    productsIntro:
      "Tahsilat, değerleme, kliniklerin günlük işleri ve tasarım için kendi ürünlerimizi geliştiriyoruz: Kollektor, Intelval, Hastam ve Fountible.",
    factsTitle: "Şirket bilgileri",
    factLabels: {
      legalName: "Ticari unvan",
      based: "Merkez",
      languages: "Diller",
      products: "Ürünler",
      contact: "İletişim",
      site: "Site",
    },
    factValues: {
      based: "Türkiye",
      languages: "İngilizce, Almanca, Türkçe",
      products: "Kollektor, Intelval, Hastam, Fountible",
    },
  },
  kollektorPage,
  intelvalPage,
  hastamPage,
  fountiblePage,
  contactPage,
  privacyPage,
  nav: {
    solutions: "Çözümler",
    kollektor: "Kollektor",
    intelval: "Intelval",
    hastam: "Hastam",
    fountible: "Fountible",
    method: "Yaklaşım",
    about: "Hakkımızda",
    contact: "İletişim",
    languageLabel: "Dil",
    scheduleDemo: "Demo talep edin",
  },
  hero: {
    eyebrow: "Entegre yapay zeka sistemleri",
    titleLead: "Büyüme odaklı",
    titleAccent: "kurumsal yapay zeka ajansı.",
    description:
      "GBO Vision, yapay zeka ürünleri ve özel yazılımlar geliştirir. Karmaşık işleri ve tekrar eden görevleri, iş yükünü azaltan ve büyümeyi destekleyen çözümlere dönüştürür. AI çağına hoş geldiniz.",
    primaryCta: "Demo talep edin",
    secondaryCta: "Çözümler",
    status: "Hemen başlayın",
    voiceIdle: "Yapay zeka asistanımızla konuşun",
    voiceConnecting: "Bağlanıyor…",
    voiceLive: "Görüşmeyi bitirin",
    voiceError: "Sesli asistan şu anda kullanılamıyor.",
    voiceMicDenied:
      "Mikrofon erişimi engellendi. Tarayıcınızda bu siteye izin verin ve sistem gizlilik ayarlarınızı kontrol edin.",
    voiceMicMissing:
      "Mikrofon bulunamadı. Bir mikrofon bağlayıp görüşmeyi yeniden başlatın.",
    voiceMicError:
      "Mikrofonunuz başka bir uygulama tarafından kullanılıyor. O uygulamayı (Teams, Zoom, OBS…) kapatıp görüşmeyi yeniden başlatın.",
    voiceMicInsecure:
      "Mikrofon için güvenli bir bağlantı gerekiyor. Bu sayfayı https üzerinden açıp görüşmeyi yeniden başlatın.",
    voiceSoundBlocked: "Sesi aç",
  },
  proofStrip: {
    label: "Nasıl yardımcı oluruz",
    items: [
      "İş analizi",
      "Özel yapay zeka yazılımı",
      "Sistem entegrasyonu",
      "Sürekli iyileştirme",
    ],
  },
  intro: {
    eyebrow: "Yapay zeka iş ortağınız",
    title: "Operasyonel sorunları kazançlı yapay zekaya dönüştürüyoruz.",
    description:
      "Ekibinizin nasıl çalıştığını anlarız. Sonra yapay zekanın en çok nerede ve nasıl yardımcı olacağını belirleriz.",
  },
  solutions: {
    kollektor: {
      eyebrow: "Tahsilat için sesli yapay zeka",
      title: "Kollektor",
      // The two figures are GBO Vision's own data and stay in the highlights,
      // each saying what it counts; the description does not repeat them.
      description:
        "Kollektor, hukuk büroları ve alacaklılar adına borçluları arayan sesli yapay zeka asistanıdır. Ödeme planını görüşür ve ödeme sözünü kaydeder; arama saatlerini, tekrar sınırlarını ve temsilciye aktarma kurallarını ekibiniz belirler.",
      highlights: [
        "Günde 10.000’e kadar arama",
        "Eylül 2026’da hukuk bürosu müşterilerimiz adına 2,6 milyon TL’yi aşan tahsilat",
      ],
      cta: "Kollektor nasıl çalışır",
      pageCta: "Kollektor sayfasına gidin",
    },
    intelval: {
      eyebrow: "Değerleme için yapay zeka",
      title: "Intelval",
      description:
        "Intelval, dosyadaki tapu, imar ve proje belgelerini okuyup emsalleri derler ve değerleme raporunun taslağını bankanın şablonunda hazırlar. Lisanslı değerleme uzmanınız taslağı kontrol eder, düzeltir ve imzalar.",
      highlights: [
        "Belgeden rapor taslağı",
        "Emsal derleme",
        "İmza uzmanınızda",
      ],
      cta: "Intelval demosu planlayın",
      pageCta: "Intelval sayfasına gidin",
    },
    hastam: {
      eyebrow: "Hastane ve klinikler için sesli yapay zeka",
      title: "Hastam AI",
      headline: "Şikayetten doğru hekime.",
      description:
        "Hastam AI, randevu asistanı olarak çalışır, hastanın şikayetini değerlendirir ve uygun branştaki hekime yönlendirir. " +
        "Hekimlerin güncel takvimlerine bakar ve hastaya uyan gün ve saatleri sunar. " +
        "Hasta seçimini yapar; randevu talebi kliniğin onayına gider.",
      support:
        "Hasta yalnızca telefon eder. Ekibiniz aramaları, hasta kayıtlarını ve sesli klinik notları tek panelden takip eder.",
      imageAlt: "Aydınlık bir klinikte hastasını dikkatle dinleyen bir hekim",
      highlights: [
        "Şikayeti anlar",
        "Uygun hekimi bulur",
        "Takvime göre planlar",
      ],
      steps: [
        {
          title: "Şikayeti anlar",
          description: "Hastayı dinler, anlattığı şikayeti ve neye ihtiyaç duyduğunu değerlendirir.",
        },
        {
          title: "Uygun hekimi bulur",
          description: "Şikayeti kliniğin branşlarıyla eşleştirir. İlgili hekimlere yönlendirir.",
        },
        {
          title: "Takvime göre planlar",
          description: "Hekimlerin boş saatlerini sunar. Hastanın seçtiği randevuyu klinik onayına iletir.",
        },
      ],
      cta: "Hastam demosu planlayın",
      pageCta: "Detaylı bilgi",
    },
    // Only what fountible.com itself says: the canvas is React and Tailwind,
    // Figma paste, Bro, and export of the code the canvas renders.
    fountible: {
      eyebrow: "Yapay zeka destekli tasarım aracı",
      title: "Fountible",
      description:
        "Fountible, yapay zeka destekli bir arayüz tasarım aracıdır. Tasarım asistanı Bro, tarif ettiğiniz ekranı sizin için hazırlar; siz de dilediğiniz gibi düzenlersiniz. Biten tasarımı koda da aktarabilirsiniz.",
      highlights: [
        "Tasarım asistanı Bro",
        "Figma’dan kolay aktarım",
        "Tek adımda koda aktarım",
      ],
      cta: "Fountible demosu planlayın",
      pageCta: "Fountible sayfasına gidin",
    },
    enterprise: {
      eyebrow: "Özel yapay zeka ve yazılım",
      title: "İşinize göre tasarlandı.",
      description:
        "İş akışınızı, verilerinizi ve hedeflerinizi temel alarak size özel yazılım ve yapay zeka çözümleri geliştiririz.",
      phases: [
        {
          number: "01",
          title: "Analiz",
          summary: "İş akışındaki aksaklıkları ve bunların maliyetini belirleriz.",
          description:
            "İşi yapan ekiple oturur, bir işi başından sonuna kadar izleriz. Nerede bekliyor, kim kime devrediyor, veri nerede elle giriliyor. Sonra her tıkanmanın size ne kaybettirdiğini yazarız: kaç saat, ne kadar ciro, kaç hata. En çok kaybettirenden başlarız.",
          deliverables: [
            "Nerede beklediği",
            "Kaybedilen saat",
            "Önce çözülecekler",
          ],
        },
        {
          number: "02",
          title: "Plan",
          summary: "Yazılım öncesi plan.",
          description:
            "Ürün stratejisi, kullanıcı yolculukları ve kapsam; tüm ekibin tartışabileceği bir dille yazılır. Neyin neden kurulacağı, kimse editörü açmadan önce ortak kararla netleşir.",
          deliverables: [
            "Ürün stratejisi",
            "Kullanıcı yolculukları",
            "Kapsamı belirlenmiş yol haritası",
          ],
        },
        {
          number: "03",
          title: "Mimari",
          summary: "Ölçeklenecek iskelet.",
          description:
            "API'ler, veri modeli, entegrasyonlar ve yapay zeka katmanı tek bir sistem olarak tasarlanır. Bugün kullandığınız araçlara oturur, gelecek yılın hacmine yer bırakır.",
          deliverables: [
            "Sistem tasarımı",
            "Veri modeli",
            "Entegrasyon planı",
          ],
        },
        {
          number: "04",
          title: "Geliştirme",
          summary: "Tek seferde değil, sürümlerle.",
          description:
            "Yazılım, kullanıp geri bildirim verebileceğiniz kısa sürümlerle şekillenir. Her sürüm testten, güvenlik denetiminden ve kontrollü yayından geçer. Kurumsal kod, yapay zeka hızında.",
          deliverables: [
            "Çalışan sürümler",
            "Test ve güvenlik denetimi",
            "Devir ve destek",
          ],
        },
      ],
      cta: "İnceleyin",
    },
  },
  industries: {
    eyebrow: "Sektörler",
    title: "Hizmet verdiğimiz her sektörde gerçek sonuç",
    description:
      "Yavaş yanıt, kaçan tahsilat veya elle yürüyen darboğaz lüksü olmayan sektörlerde yapay zeka kuruyoruz.",
    items: [
      {
        title: "Bankacılık",
        badge: "Sesli tahsilat canlı",
        description:
          "Müşteriyi arayan, ödeme planı kuran ve gelen ödemeyi alan yapay zeka ses ajanları.",
        imageAlt: "Banka şubesinde masasında bir finans belgesini inceleyen danışman",
        stats: [
          { value: "10.000+", lead: "günlük", rest: "arama" },
          { value: "₺2,6M+", lead: "Eylül 2026", rest: "tahsilatı" },
        ],
      },
      {
        title: "Değerleme",
        badge: "Intelval AI değerleme",
        description:
          "Emsalleri okuyan ve masa için uzman düzeyinde değerleme dosyası yazan ajanlar.",
        imageAlt: "Gün ışığında ofis binaları",
        stats: [
          { value: "800+", lead: "günlük", rest: "yapılan analiz" },
          { value: "Canlı", lead: "Intelval", rest: "masa için rapor" },
        ],
      },
      {
        title: "Hukuk",
        badge: "Büro masaları",
        description:
          "Mevcut dosyalarınız üzerinden tahsilat yapar. Gerektiğinde görüşmeyi ekibinize devreder.",
        imageAlt: "Masada duran bir kulaklık",
        stats: [
          { value: "%97", lead: "müşteri ile", rest: "doğal dilde konuşma" },
          { value: "20", lead: "eşzamanlı", rest: "görüşme" },
        ],
      },
      {
        title: "Sağlık",
        badge: "Hastam ile hasta yönlendirme",
        description:
          "Hastam, hastanın şikayetini değerlendirir. Uygun hekime yönlendirir ve güncel takvimden randevu saatleri sunar.",
        imageAlt: "Klinik koridorunda elinde tablet tutan bir hekim",
        stats: [
          { value: "Analitik branş seçimi", lead: "Doğru branş", rest: "ve hekim seçer" },
          { value: "Randevu oluşturma", lead: "Gün ve saat", rest: "belirlenir" },
        ],
      },
    ],
  },
  kollektorDeep: {
    eyebrow: "Ürün · Kollektor",
    title: "Telefonda tahsildar. Ekranda canlı operasyon.",
    description:
      "Kollektor, banka ve kurumların varlık alacaklarını telefonla tahsil eder. Ödeme talep eder. Borçlu müşteriyle ödeme planı kurar. Gelen ödemeleri alır. Tüm süreç yapay zeka ses ajanı ile işler. Ekibiniz tahsilatı görür.",
    pipelineLabel: "Listeden tahsilata",
    pipeline: [
      {
        number: "01",
        title: "Liste",
        description: "Borçlu müşteriler ve alacak bilgileri günlük arama listesine alınır. Aramalar başlatılır.",
      },
      {
        number: "02",
        title: "Arama grubu",
        description: "Kuyruk dosyayı tarar. Her hat için bir ajan gerekmez.",
      },
      {
        number: "03",
        title: "Görüşme",
        description: "Asistan kimliği doğrular, KVKK uyumlu görüşme gerçekleşir.",
      },
      {
        number: "04",
        title: "Kayıt",
        description: "Ödeme sözü ve tahsilat kaydı anında yazılır. Görüşme akışı da öyle.",
      },
      {
        number: "05",
        title: "Devir",
        description: "Biten aramalar kaydedilir: ödeme, ödeme sözü, red ya da başka bir sonuç.",
      },
      {
        number: "06",
        title: "Rapor",
        description: "Biten görüşmeler her gün raporlanır. Ödemeler, sözler ve diğer sonuçlar ekibe gider.",
      },
    ],
    chapters: [
      {
        title: "Listeden açılan arama grupları",
        description:
          "Borçlu ve alacak listeleri veri tabanından gelir. Vade ve ödeme planı da gelir. Aramalar otomatik başlar.",
      },
      {
        title: "Canlı ses hattı",
        description:
          "Görüşme başlar, borçlu gerçek bir call center görevlisiyle konuşur gibi konuşur. Karşı taraftaki Kollektor yapay zeka ajanıdır.",
      },
      {
        title: "Notlar değil, ödeme sözü ve tahsilatlar",
        description:
          "Ödeme tutarı ve tarihi konuşulduğu anda kaydolur. Geri arama saatleri hesaplanır, tahmin lüksü yoktur.",
      },
    ],
    faq: {
      eyebrow: "Sık sorulanlar",
      title: "Kollektor hakkında",
      items: [
        {
          question: "Kollektor KVKK / GDPR uyumlu mu?",
          answer:
            "Evet, kimlik doğrulanır, transkriptler süreyle sınırlı tutulur ve görüşme yasal çerçevede yürür. Kurumunuza özel DPA ve işleme ekleri ayrıca bağlanır.",
        },
        {
          question: "Borçlular bir yapay zeka ile konuştuğunu anlıyor mu?",
          answer:
            "Ölçülen sonuç: borçluların %97'si bir yapay zeka ile konuştuğunu fark etmez. Bu, tahsilat başarı oranını defalarca artırır.",
        },
        {
          question: "Kollektor ne kadar hızlı?",
          answer:
            "Kollektor aynı anda 20'ye kadar görüşme yapar. Bu sayı, FCT çağrı santralinin kapasitesine bağlıdır.",
        },
      ],
    },
    split: {
      eyebrow: "Asimetrik tasarım",
      title: "İki taraf. Tek arama.",
      description:
        "Borçlu yalnızca bir telefon görüşmesi duyar. Operatörler canlı masayı görür: transkript, sınıflandırma, dinleme ve geçmiş.",
      debtorTitle: "Borçlunun duyduğu",
      debtorBody: "Uygulama yok. Portal yok. Bağlantı yok. İsimli bir tahsildar, bir borç ve bir sonraki adım.",
      debtorBeats: [
        "Borç konuşulmadan önce kimlik doğrulanır",
        "Asistan ödeme, taksit veya tarih ister",
        "Söz veya geri arama görüşmede kaydedilir",
        "Sert veya dönen aramalar bir kişiye devredilir",
      ],
      operatorTitle: "Ekibinizin gördüğü",
      operatorBody: "Arama olurken güncellenen bir operasyon ekranı. Yenileme yok, ekstra hat yok.",
      operatorBeats: [
        "Canlı transkript ve arama durumu",
        "Senaryo eşleşmeleri ve triyaj önceliği",
        "Ödeme sözü tutarı ve tarihi",
        "Hesaplanan geri arama takvimi",
      ],
    },
    guardrails: {
      title: "Türk tahsilat masaları için",
      items: [
        {
          title: "KVKK",
          description: "Telefonlar son 4 hane. TC kimlik son 4 hane. Transkriptler 90 günde silinir.",
        },
        {
          title: "6502 sayılı kanun",
          description: "Tahsildar üslubu ve yasal çerçeve senaryonun içinde, görüşmeden sonra eklenmez.",
        },
        {
          title: "İnsan kontrolü",
          description: "P0–P2 triyaj yalnızca yükseltir. Ekibiniz hattı alır; model önceliği düşürmez.",
        },
      ],
    },
    cta: "Kollektor demosu planlayın",
  },
  platform: {
    eyebrow: "Nasıl geliştiriyoruz",
    title: "Analizden gerçek çözüme.",
    description:
      "İşinizin nasıl çalıştığını anlarız. Sonra doğru yapay zeka aracını tasarlar, bağlar ve geliştiririz.",
    figure: "Şekil",
    capabilities: [
      {
        title: "İş analizi",
        description:
          "Hedeflerinizi, verinizi ve günlük iş akışınızı baştan sona çıkarırız.",
      },
      {
        title: "Çözüm tasarımı",
        description:
          "Doğru ürünü ve kullanıcı akışını tasarlarız.",
      },
      {
        title: "Yapay zeka otomasyonu",
        description:
          "Rutin işleri hızlandırır. Ekibinize destek olur.",
      },
      {
        title: "Veri entegrasyonu",
        description:
          "Kullandığınız sistemleri ve veriyi bağlarız.",
      },
      {
        title: "İnsan denetimi",
        description:
          "Önemli kararlar sizde kalır.",
      },
      {
        title: "Sürekli iyileştirme",
        description:
          "Kullanımdan öğrenir ve ürünü geliştiririz.",
      },
    ],
  },
  approach: {
    eyebrow: "Nasıl çalışıyoruz",
    title: "İş probleminden çalışan ürüne.",
    description:
      "Araçla değil, işinizle başlarız. Sonra ekibinizle tasarlar, kurar ve iyileştiririz.",
    steps: [
      {
        number: "01",
        title: "Keşfet",
        description:
          "Hedefleri, iş akışını, veriyi ve aksayan noktaları tek tek çıkarırız.",
      },
      {
        number: "02",
        title: "Tasarla",
        description:
          "Doğru ürünü seçeriz. Kullanıcı akışını ve teslim planını yazarız.",
      },
      {
        number: "03",
        title: "Geliştir",
        description:
          "Sistemleri bağlarız. Planı çalışan yazılıma çeviririz.",
      },
      {
        number: "04",
        title: "İyileştir",
        description:
          "Sonuçları izler, kullanımdan öğrenir ve çözümü geliştiririz.",
      },
    ],
  },
  signup: {
    placeholder: "Kurumsal e-posta adresinizi girin",
    notify: "Demo talep edin",
    sending: "Gönderiliyor",
    successTitle: "Demo talebinizi aldık",
    successBody:
      "İlginiz için teşekkür ederiz. Uygun bir demo zamanı belirlemek için sizinle iletişime geçeceğiz.",
    errors: {
      required: "E-posta adresinizi girin",
      invalid: "Lütfen geçerli bir e-posta adresi girin",
      submission:
        "Demo talebiniz şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
    },
  },
  finalCta: {
    eyebrow: "Demo talep edin",
    title: "İşinizi yavaşlatan sorunu yapay zekayla birlikte çözelim.",
    description:
      "İşin nerede yavaşladığını ya da zorlaştığını anlatın, atılacak ilk adımı birlikte belirleyelim.",
    primaryCta: "Demo talep edin",
    secondaryCta: "Çözümleri inceleyin",
  },
  productCta: {
    kollektor: {
      title: "Kollektor’u bir demoda görün.",
      description:
        "Tahsilat işinizin nasıl yürüdüğünü anlatın, atılacak ilk adımı birlikte belirleyelim.",
    },
    intelval: {
      title: "Intelval’i size gösterelim.",
      description:
        "Bir değerleme dosyasının firmanızda bugün nasıl ilerlediğini anlatın, atılacak ilk adımı birlikte belirleyelim.",
    },
    hastam: {
      title: "Hastam’ı bir demoda görün.",
      description:
        "Kliniğinizde telefonun nasıl işlediğini anlatın, atılacak ilk adımı birlikte belirleyelim.",
    },
    fountible: {
      title: "Fountible’ı size gösterelim.",
      description:
        "Tasarım sürecinizin bugün nasıl yürüdüğünü anlatın, atılacak ilk adımı birlikte belirleyelim.",
    },
    secondaryCta: "Diğer çözümlere bakın",
    kollektorNote: "Borçluyu arar, ödeme sözünü teyit eder ve kaydeder.",
    intelvalNote: "Belgeleri okuyup değeri hesaplar ve rapor taslağını hazırlar; imzayı değerleme uzmanınız atar.",
  },
  footer: {
    tagline: "İşinize göre tasarlanmış yapay zeka ve yazılım.",
    solutions: "Çözümler",
    kollektor: "Kollektor",
    intelval: "Intelval",
    hastam: "Hastam",
    fountible: "Fountible",
    platform: "Platform",
    method: "Yaklaşım",
    about: "Hakkımızda",
    contact: "İletişim",
    privacy: "KVKK aydınlatma metni",
    rightsReserved: "Tüm hakları saklıdır",
  },
};

export default trMessages;
