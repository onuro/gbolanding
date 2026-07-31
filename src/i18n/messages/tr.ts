import type { Messages } from "@/i18n/types";

const trMessages: Messages = {
  metadata: {
    title: "GBO Vision | Kurumsal Yapay Zeka Platformları",
    description:
      "GBO Vision; hukuk bürolarının alacak tahsilatı için Kollektor, işletme ve gayrimenkul değerleme için Intelval dahil olmak üzere düzenlemeye tabi, kritik işlere yönelik kurumsal yapay zeka platformları geliştirir.",
  },
  nav: {
    solutions: "Çözümler",
    platform: "Platform",
    method: "Yaklaşım",
    languageLabel: "Dil",
    scheduleDemo: "Demo planlayın",
  },
  hero: {
    eyebrow: "Gerçek işlere yönelik kurumsal yapay zeka",
    titleLead: "Çözüm odaklı",
    titleAccent: "kurumsal yapay zeka ajansı.",
    description:
      "GBO Vision, uzmanlık bilgisini ve karmaşık iş akışlarını düzenlemeye tabi sektörlere özel yapay zeka platformlarına dönüştürür.",
    primaryCta: "Demo planlayın",
    secondaryCta: "Çözümleri keşfet",
    status: "Demo talepleri alınıyor",
  },
  proofStrip: {
    label: "Odağımız",
    items: [
      "Düzenlemeye tabi süreçler",
      "İnsan denetimi",
      "Kurumsal veri",
      "Operasyonel görünürlük",
    ],
  },
  intro: {
    eyebrow: "Odağı net tasarım",
    title: "Genel amaçlı bir asistan değil, işe özel yapay zeka.",
    description:
      "Her GBO Vision çözümü; belirli bir uzmanlık alanı, o alanın verileri ve profesyonellerin her gün verdiği kararlar etrafında şekillenir.",
  },
  solutions: {
    kollektor: {
      eyebrow: "Hukuk teknolojileri",
      title: "Kollektor",
      description:
        "Hukuk bürolarının alacak tahsilatını sadeleştiren; iş akışını odaklı ve mevzuata duyarlı tutan otonom yapay zeka ajanı.",
      highlights: [
        "Mevzuata duyarlı iletişim",
        "Dosya önceliklendirme",
        "Tahsilat süreci otomasyonu",
      ],
      cta: "Kollektor'ü keşfet",
    },
    intelval: {
      eyebrow: "Değerleme zekası",
      title: "Intelval",
      description:
        "Derinlemesine analiz, piyasa istihbaratı ve kurumsal raporlama için yapay zeka destekli işletme ve gayrimenkul değerleme platformu.",
      highlights: [
        "İşletme değerleme",
        "Gayrimenkul analizi",
        "Kurumsal raporlama",
      ],
      cta: "Intelval'i keşfet",
    },
    enterprise: {
      eyebrow: "Kurumsal sistemler",
      title: "Operasyonunuza göre tasarlanır",
      description:
        "Genel amaçlı bir SaaS değil; iş akışlarınıza, veri altyapınıza ve düzenleyici çerçevenize göre tasarlanan kritik yapay zeka platformları.",
      highlights: [
        "Sürece özel tasarım",
        "Veri altyapısıyla uyum",
        "Düzenleyici bağlam",
      ],
      cta: "Platformu incele",
    },
  },
  platform: {
    eyebrow: "GBO platformu",
    title: "Uzman yapay zeka için sağlam ve uygulanabilir bir temel.",
    description:
      "Ortak platform; alan uzmanlığını, operasyonel iş akışlarını ve sorumlu insan kontrolünü bir araya getirir.",
    capabilities: [
      {
        title: "Alan uzmanlığı",
        description:
          "Her profesyonel alanın diline ve çalışma mantığına göre şekillenen modeller ve iş akışları.",
      },
      {
        title: "İş akışı otomasyonu",
        description:
          "Tekrarlanan işleri girdiden uygulanabilir çıktıya kadar koordine eden amaca özel ajanlar.",
      },
      {
        title: "İnsan denetimi",
        description:
          "Açık inceleme noktalarıyla kritik kararların ekibinizin kontrolünde kalması.",
      },
      {
        title: "Veri entegrasyonu",
        description:
          "Operasyonunuzun hâlihazırda dayandığı bilgi ve sistemlerle çalışacak şekilde tasarım.",
      },
      {
        title: "Operasyonel görünürlük",
        description:
          "Faaliyeti, bağlamı ve sonraki adımları daha anlaşılır kılan yapılandırılmış çıktılar.",
      },
      {
        title: "Kurumsal uygulama",
        description:
          "Karmaşık organizasyonların gerçekleriyle uyumlu teknoloji ve uygulama yaklaşımı.",
      },
    ],
  },
  approach: {
    eyebrow: "Nasıl çalışıyoruz",
    title: "Karmaşık süreçten odaklı çözüme.",
    description:
      "Önce işin kendisini anlar, ardından zekayı, kontrol mekanizmalarını ve uygulama modelini buna göre tasarlarız.",
    steps: [
      {
        number: "01",
        title: "Anla",
        description:
          "Problemi tanımlayan alanı, iş akışını, sınırları ve karar noktalarını haritala.",
      },
      {
        number: "02",
        title: "Tasarla",
        description:
          "Operasyon bilgisini odaklı bir çözüme ve etkileşim modeline dönüştür.",
      },
      {
        number: "03",
        title: "Entegre et",
        description:
          "Platformu gerçek kullanım için gereken veri ve sistemlerle buluştur.",
      },
      {
        number: "04",
        title: "Geliştir",
        description:
          "Operasyon, kanıtlar ve kullanıcı ihtiyaçları geliştikçe sistemi iyileştir.",
      },
    ],
  },
  signup: {
    placeholder: "İş e-postanızı girin",
    notify: "Demo talep edin",
    sending: "Gönderiliyor",
    successTitle: "Demo talebiniz alındı",
    successBody:
      "GBO Vision'a gösterdiğiniz ilgi için teşekkürler. Uygun bir zaman planlamak için sizinle iletişime geçeceğiz.",
    errors: {
      required: "E-posta gerekli",
      invalid: "Lütfen geçerli bir e-posta adresi girin",
      submission:
        "Demo talebinizi şu anda gönderemedik. Lütfen kısa süre sonra tekrar deneyin.",
    },
  },
  finalCta: {
    eyebrow: "Demo talep edin",
    title: "Uzman yapay zekanın operasyonunuza katabileceklerini keşfedin.",
    description:
      "Operasyonunuzu anlatın; GBO Vision'a odaklı bir giriş planlamak için sizinle iletişime geçelim.",
    primaryCta: "Demo planlayın",
    secondaryCta: "Çözümleri keşfet",
  },
  footer: {
    tagline: "İşe özel, kurumsal zeka.",
    solutions: "Çözümler",
    platform: "Platform",
    method: "Yaklaşım",
    rightsReserved: "Tüm hakları saklıdır",
  },
};

export default trMessages;
