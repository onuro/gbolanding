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
        "Kollektor, hukuk büroları ve varlık alacakları adına borçluları telefonla arayan bir yapay zeka asistanı. Günde 10.000'e kadar görüşme yapar, ödeme planını konuşur ve bugüne kadar 23,9 milyon TL tahsilat sağladı.",
      highlights: [
        "Günde 10.000 arama",
        "23,9 milyon TL tahsilat",
        "Ekibinize devreder",
      ],
      cta: "Kollektor nasıl çalışır",
    },
    intelval: {
      eyebrow: "Değerleme için yapay zeka",
      title: "Intelval",
      description:
        "Intelval, değerleme firmaları için gayrimenkul emsal ve ekspertiz raporlarını analiz eder ve bilirkişi uzmanlık seviyesinde raporlar oluşturur.",
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
        "Hazır paket bir SaaS değil. Denetimden inşaya, iş akışınıza, verinize ve hedeflerinize göre ilerleriz.",
      phases: [
        {
          number: "01",
          title: "Denetim",
          summary: "İşin nerede tıkandığı.",
          description:
            "İşi yapan ekiple birlikte oturur, süreci uçtan uca izleriz: kullanıcılar, araçlar, devir noktaları ve altındaki veri. Sürtünmenin size saat, gelir ve doğruluk olarak neye mal olduğunu netleştirir, çözmeye değecek olana göre sıralarız.",
          deliverables: [
            "Sürtünme haritası",
            "Manuel işin maliyeti",
            "Önceliklendirilmiş fırsatlar",
          ],
        },
        {
          number: "02",
          title: "Plan",
          summary: "Kod yazılmadan önceki plan.",
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
          title: "İnşa",
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
      cta: "Platformu inceleyin",
    },
  },
  kollektorDeep: {
    eyebrow: "Ürün · Kollektor",
    title: "Telefonda tahsildar. Ekranda canlı operasyon.",
    description:
      "Kollektor, banka ve kurumların varlık alacaklarını telefon aramalarıyla tahsil eder. Ödeme ister, borçluya yapılandırma yapar ve gerçekleşmiş ödemeleri alır. Tüm işlem yapay zeka ses ajanı ile gerçekleşir. Ekibiniz tahsilatı görür.",
    pipelineLabel: "Listeden tahsilata",
    pipeline: [
      {
        number: "01",
        title: "Liste",
        description: "Borçlu ve alacak listesi günlük havuzdan işleme alınır. Arama görevleri başlar.",
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
        description: "Ödeme sözü, tahsilat kayıtları ve değişken görüşme senaryoları anlık kaydedilir.",
      },
      {
        number: "05",
        title: "Devir",
        description: "Sonuçlanan aramaların ödeme, ödeme sözü, red veya diğer senaryoları kaydedilir.",
      },
      {
        number: "06",
        title: "Rapor",
        description: "Sonuçlanan görüşmeler günlük olarak raporlanır, ödemeler, sözler ve diğer senaryolar ekibe gönderilir.",
      },
    ],
    chapters: [
      {
        title: "Listeden açılan arama grupları",
        description:
          "Borçlu, alacak listesi, vade ve yapılandırma imkânları otomatik olarak veritabanından otomasyon için çalıştırılır.",
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
            "Kollektor, FCT çağrı / arama santralinin kapasitesiyle doğru orantılı olarak aynı anda 20'ye kadar görüşme yürütür.",
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
