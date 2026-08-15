import type { Messages } from "@/i18n/types";

const trMessages: Messages = {
  metadata: {
    title: "Kurumsal Yapay Zeka ve Özel Yazılım | GBO Vision",
    description:
      "GBO Vision, kurumsal yapay zeka ve özel yazılım geliştirir. Karmaşık işleri ve dağınık veriyi, manuel işi azaltan ve iş büyümesini destekleyen araçlara dönüştürür.",
  },
  nav: {
    solutions: "Çözümler",
    kollektor: "Kollektor",
    platform: "Platform",
    method: "Yaklaşım",
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
    secondaryCta: "Çözümleri keşfet",
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
    title: "Sorunları işletmeniz için kazançlı yapay zekaya dönüştürüyoruz.",
    description:
      "Ekibinizin nasıl çalıştığını anlarız. Sonra yapay zekanın en çok nerede yardımcı olacağını belirleriz.",
  },
  solutions: {
    kollektor: {
      eyebrow: "Sesli yapay zeka ile tahsilat",
      title: "Kollektor",
      description:
        "Kollektor, hukuk büroları adına borçluları telefonla arayan bir yapay zeka asistanı. Günde 5.000'e kadar görüşme yapıyor, ödeme planını konuşuyor ve bugüne kadar 23,9 milyon TL tahsilat sağladı.",
      highlights: [
        "Günde 5.000 arama",
        "23,9 milyon TL tahsilat",
        "Ekibinize devreder",
      ],
      cta: "Kollektor nasıl çalışır",
    },
    intelval: {
      eyebrow: "Değerleme için yapay zeka",
      title: "Intelval",
      description:
        "Intelval, işletme ve gayrimenkul değerleme ekiplerini destekler. Veri, analiz ve raporları tek yerde toplar.",
      highlights: [
        "İşletme değeri",
        "Gayrimenkul değeri",
        "Açık raporlar",
      ],
      cta: "Intelval demosu planlayın",
    },
    enterprise: {
      eyebrow: "Özel yapay zeka ve yazılım",
      title: "İşinize göre tasarlandı.",
      description:
        "İş akışınıza, verinize ve hedeflerinize göre yapay zeka araçları ve özel yazılımlar tasarlarız. Hazır paket bir SaaS değil.",
      highlights: [
        "Yapay zeka stratejisi",
        "Özel yazılım",
        "Veri entegrasyonu",
      ],
      cta: "Platformu inceleyin",
    },
  },
  kollektorDeep: {
    eyebrow: "Ürün · Kollektor",
    title: "Telefonda tahsildar. Ekranda canlı operasyon.",
    description:
      "Kollektor, borçluları arar, görüşmeyi baştan sona yürütür ve her turu operatör masasına canlı iletir. Borçlu bir uygulama görmez. Ekibiniz tüm operasyonu görür.",
    pipelineLabel: "Listeden tahsilata",
    pipeline: [
      {
        number: "01",
        title: "Liste",
        description: "Borçlu listesini yükleyin. Kampanya başlamadan numaralar kontrol edilir.",
      },
      {
        number: "02",
        title: "Arama grubu",
        description: "Kuyruk dosyayı tarar. Her hat için bir ajan gerekmez.",
      },
      {
        number: "03",
        title: "Görüşme",
        description: "Asistan kimliği doğrular, ödeme ister ve Türkçe kalır.",
      },
      {
        number: "04",
        title: "Kayıt",
        description: "Söz, tutar ve geri arama saati konuşulduğu anda yazılır.",
      },
      {
        number: "05",
        title: "Devir",
        description: "Sert arayan, üçüncü kişi ve döngüler bir kişiye gider.",
      },
      {
        number: "06",
        title: "Rapor",
        description: "Ulaşma, söz ve tahsilat aynı panelde toplanır.",
      },
    ],
    chapters: [
      {
        title: "Listeden açılan arama grupları",
        description:
          "Borçluları yükleyin, bir arama grubu açın ve katın dosyayı işlemesini izleyin.",
      },
      {
        title: "Canlı ses hattı",
        description:
          "Konuşma girer, tahsildar model çalışır, ses çıkar. Asistan bir tahsildardır — net, doğrudan, Türkçe.",
      },
      {
        title: "Söz ve takvim, not değil",
        description:
          "Ödeme tutarı ve tarihi konuşulduğu anda kaydolur. Geri arama saatleri hesaplanır, tahmin edilmez.",
      },
      {
        title: "Zor aramalar masada kalır",
        description:
          "Canlı transkript, senaryo eşleşmeleri ve P0–P2 triyaj. Modelin konuşmaması gereken yerde ekibiniz hattı alır.",
      },
    ],
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
      operatorBody: "Arama olurken güncellenen bir operasyon ekranı — yenileme yok, ekstra hat yok.",
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
          "Tekrarlanan işleri hızlandırır ve ekibinizi destekler.",
      },
      {
        title: "Veri entegrasyonu",
        description:
          "Kullandığınız sistemleri ve veriyi bağlarız.",
      },
      {
        title: "İnsan denetimi",
        description:
          "Önemli kararları ekibinizin kontrolünde tutarız.",
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
      "Araçla değil, işinizle başlarız. Sonra ekibinizle birlikte tasarlar, geliştirir ve iyileştiririz.",
    steps: [
      {
        number: "01",
        title: "Keşfet",
        description:
          "Hedeflerinizi, iş akışınızı, verinizi ve aksayan noktaları tek tek çıkarırız.",
      },
      {
        number: "02",
        title: "Tasarla",
        description:
          "Doğru yapay zeka ürününü, kullanıcı deneyimini ve uygulama planını tanımlarız.",
      },
      {
        number: "03",
        title: "Geliştir",
        description:
          "Sistemlerinizi bağlar, planı çalışan yazılıma dönüştürürüz.",
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
    title: "Bir sonraki iş probleminizi işe yarayan bir yapay zekaya dönüştürün.",
    description:
      "İşin nerede yavaşladığını ya da zorlaştığını anlatın. Somut bir sonraki adımı birlikte belirleyelim.",
    primaryCta: "Demo talep edin",
    secondaryCta: "Çözümleri keşfet",
  },
  footer: {
    tagline: "İşinize göre tasarlanmış yapay zeka ve yazılım.",
    solutions: "Çözümler",
    kollektor: "Kollektor",
    platform: "Platform",
    method: "Yaklaşım",
    rightsReserved: "Tüm hakları saklıdır",
  },
};

export default trMessages;
