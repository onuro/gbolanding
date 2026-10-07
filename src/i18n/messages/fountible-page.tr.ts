import type { FountiblePageMessages } from "@/i18n/page-types/fountible";

// /fountible, Turkish. Fountible has its own site (fountible.com) and app
// (app.fountible.com); this page says what it is, shows it and links there,
// as /hastam does for hastam.ai. Rules this file is written against:
//   - every capability named here is one fountible.com names itself (home,
//     /features/, /features/bro/, /features/motion/, /features/slides/,
//     /features/teams/, /figma-alternative/, /docs/mcp/, /download/, read on
//     2026-10-07). The product repo names more (Next.js, EPS import, boolean
//     operations); fountible.com does not, so this page does not either;
//   - no user counts, prices, plans, "free", customer names or logos, and no
//     benchmark figures. The only number is a product limit fountible.com
//     prints: up to six Bro runs on one page at once;
//   - model and tool names only as fountible.com prints them (ChatGPT, Claude,
//     Cursor, Kimi K3, Claude Code, Claude Desktop). A Claude or Cursor
//     account and the MCP connectors need the Mac app, and the copy says so
//     wherever they come up;
//   - the pictures are screenshots of fountible.com's own product visuals and
//     each caption says so;
//   - "a GBO Vision product" is the owner's word, not fountible.com's.
// The copy is written in Turkish from the meaning, not translated sentence by
// sentence from the English file. Terms Turkish designers and front-end
// developers keep in English stay in English: Bro, MCP, React, Tailwind,
// Figma, DOM, frame, auto layout, instance, render, shader, halftone, prop,
// token, gap, padding, CSS transform, runtime.
const fountiblePage: FountiblePageMessages = {
  metaTitle: "Fountible: React Kodu Üreten Tasarım Aracı | GBO Vision",
  metaDescription:
    "Fountible, tuvalinde gerçek React ve Tailwind kodu çalışan bir tasarım aracı. Figma’dan yapıştırın ya da Bro ile tasarlayın, kodu alın. Bir GBO Vision ürünü.",
  hero: {
    eyebrow: "Tasarım ve ürün ekipleri için",
    title: "Figma’daki gibi tasarlayın, React kodu olarak alın.",
    lead: "Fountible, tuvalinde gerçek React ve Tailwind kodu çalışan bir tasarım aracı. İster Figma’dan yapıştırın ister yapay zekayla tasarlayın; ardından kodu olduğu gibi alın ya da video olarak dışa aktarın.",
    chips: ["Figma’dan kopyala-yapıştır", "React ve Tailwind kodu", "Web ve Mac uygulaması"],
    primaryCta: "Ekibiniz için demo isteyin",
    secondaryCta: "fountible.com’a gidin",
    steps: [
      {
        title: "Figma’dan yapıştırın ya da kendiniz çizin.",
        description:
          "Figma’da seçtiğiniz öğeleri kopyalayıp tuvale yapıştırın ve katmanları hemen düzenlemeye başlayın. Eklenti kurmanız ya da dosya dışa aktarmanız gerekmez.",
      },
      {
        title: "Bro ile tasarlayın.",
        description:
          "Bir ekran, bir animasyon ya da baştan sona bir sunum isteyin. Bro bunu tuvalde düzenlenebilir katmanlar olarak hazırlar, siz de dilediğiniz gibi değiştirirsiniz.",
      },
      {
        title: "React ve Tailwind kodunu alın.",
        description:
          "Bir frame’i seçip kod olarak kopyalayın; aldığınız kod, tuvalde çalışan kodun birebir aynısı.",
      },
    ],
  },
  heroPicture: {
    alt: "Fountible editörü. Tuvalde bir mobil uygulamanın ekranları, yan panellerde ise katmanlar, ayarlar ve Bro sohbeti görünüyor.",
    caption: "fountible.com’dan ekran görüntüsü",
  },
  code: {
    label: "Tasarım ve kod",
    title: "Tuvalde gördüğünüz her katman aslında bir React elementi.",
    lead: "Her katmanın stili Tailwind sınıflarıyla tanımlanır; dışa aktardığınızda tuvalde çalışan kodun aynısını alırsınız. Tasarımı geliştiriciye devredip arayüzü sıfırdan kodlatmanız gerekmez.",
    noteTitle: "Nasıl okunur",
    note: "Her satırda tasarımın koda nasıl dönüştüğünü görürsünüz.",
    picture: {
      alt: "Fountible’ın kod görünümü: seçili bir fiyat kartı ve yanında o kartın React ve Tailwind kodu.",
      caption: "fountible.com’dan ekran görüntüsü",
    },
    rows: [
      {
        title: "Figma’da kopyalayın, burada katman olarak düzenleyin.",
        description:
          "Figma’dan yapıştırdığınız frame’ler, auto layout ayarları, metinler, vektörler ve efektler tuvale katman olarak gelir. Bazı karmaşık ayrıntılarda küçük farklar olabilir.",
      },
      {
        title: "Tuval doğrudan gerçek DOM üzerinde çalışır.",
        description:
          "Frame’ler, Tailwind ile stil verilmiş canlı React bileşenleri olarak render edilir. Tuvalde neyi nasıl tasarladıysanız tarayıcıda da öyle yayına çıkar.",
      },
      {
        title: "Ekran görüntüsü değil, kod alırsınız.",
        description:
          "İstediğiniz katmanı seçip React, HTML ya da SVG olarak kopyalayın. Bileşenler, prop’lar ve tema token’ları da kodla birlikte gelir.",
      },
      {
        title: "Değişkenler Tailwind sınıflarına dönüşür.",
        description:
          "Renk, sayı, köşe yuvarlaklığı ve opaklık değişkenlerinizden doğrudan Tailwind sınıfları üretilir. Bir token’ı değiştirdiğinizde kullanıldığı her yer güncellenir.",
      },
    ],
  },
  bro: {
    label: "Bro",
    title: "Tuvaldeki yapay zeka asistanı Bro, sizinle aynı araçları kullanır.",
    lead: "İşe dosyanıza bakarak başlar: sayfayı, seçtiğiniz öğeleri ve değişkenlerinizi okuyup katmanları gözünüzün önünde oluşturur. Ortaya çıkan her şey bir katman; seçip üzerinde çalışmaya devam edebilirsiniz.",
    noteTitle: "Nasıl okunur",
    note: "Kutular, Bro’nun nasıl çalıştığını özetliyor.",
    picture: {
      alt: "Tek bir Fountible dosyasında açık üç Bro sohbeti; her biri aynı sayfanın farklı bir bölümünü tasarlıyor.",
      caption: "fountible.com’dan ekran görüntüsü",
    },
    items: [
      {
        title: "Tek tuvalde birden çok Bro, aynı anda.",
        description:
          "Aynı dosyada ayrı sohbetler açın; her birinin kendi modeli ve geçmişi olur. Sayfanın farklı bölümlerinde en fazla altı sohbet eş zamanlı çalışabilir; aynı katmanlara dokunan işler ise sırasını bekler.",
      },
      {
        title: "Güvendiğiniz modeli seçin.",
        description:
          "Bro’yu ChatGPT, Claude, Cursor ya da Kimi K3 ile kullanabilirsiniz. Kendi hesabınızla giriş yapın ya da API anahtarınızı ekleyin; Claude ve Cursor hesabı için Mac uygulaması gerekir. Her sohbet kendi modelini kullanır.",
      },
      {
        title: "Tuvali Claude Code ya da Cursor’dan yönetin.",
        description:
          "Mac uygulamasının çalıştırdığı yerel MCP sunucusu sayesinde Claude Code, Claude Desktop ve Cursor açık tasarımı okuyup ekran çizebilir. Yaptıkları her değişiklik tuvale canlı yansır ve tek adımda geri alınabilir.",
      },
    ],
  },
  motion: {
    label: "Animasyon ve sunum",
    title: "Ekranı tasarlayın, hareketini de siz kurgulayın.",
    lead: "Animasyon doğrudan katmanın kendisine uygulanır; önizlemede ne görüyorsanız dışa aktardığınızda da onu alırsınız. Sunumlar da aynı tuvalde hazırlanır.",
    noteTitle: "Kod tarafında",
    note: "Dışa aktarılan animasyon, kullanıcının “hareketi azalt” tercihine uyar.",
    picture: {
      alt: "Fountible’ın animasyon görünümü. Bir kartın katmanları zaman çizelgesinde alt alta dizili, her satırda anahtar kareler var.",
      caption: "fountible.com’dan ekran görüntüsü",
    },
    rows: [
      {
        title: "İster hazır efekt, ister zaman çizelgesi.",
        description:
          "Hazır bir giriş efektini tek tıkla ekleyin ya da zaman çizelgesini açıp her anahtar kareyi kendiniz yerleştirin. X, Y ve Z eksenlerindeki dönüşü de zaman çizelgesinde kendi satırında ayarlarsınız.",
      },
      {
        title: "Ses ekleyin, video olarak alın.",
        description:
          "Müzik ya da seslendirme ekleyip zaman çizelgesinde kırpın, ardından sesli bir MP4 olarak dışa aktarın. Mac uygulamasında saydam arka planlı ProRes ve HEVC çıktısı da alabilirsiniz.",
      },
      {
        title: "Animasyonu kod olarak da alın.",
        description:
          "Dışa aktardığınız animasyon, sade anime.js kullanan bir React bileşeni olarak gelir; Fountible’a özel bir runtime gerektirmez.",
      },
      {
        title: "Sunumlar da aynı tuvalde.",
        description:
          "Her slayt, tuvalde gerçek bir frame olarak durur; geçişler, tıkladıkça beliren öğeler ve konuşmacı görünümü de elinizin altında. PPTX dosyalarını içe aktarabilir, sunumunuzu da PPTX olarak dışa aktarabilirsiniz.",
      },
    ],
  },
  features: {
    label: "Özellikler",
    title: "Vaat değil, üründe çalışan özellikler.",
    lead: "Hepsi aynı tuvalde, yani gerçek React ve Tailwind üzerinde çalışır.",
    noteTitle: "Nasıl okunur",
    note: "Her kutu, üründe kullanabileceğiniz bir özelliği anlatıyor.",
    items: [
      {
        title: "Bileşenler her yerde senkron kalır.",
        description:
          "Ana bileşeni bir kez oluşturup instance’larını istediğiniz yerde kullanın. Bir instance’ın metnini ve stilini değiştirebilir, dilediğinizde sıfırlayabilir ya da ana bileşene gidebilirsiniz.",
      },
      {
        title: "Shader’lar her zaman canlı kalır.",
        description:
          "Gradyan, dalga, halftone, sıvı metal, su ya da ASCII efekti ekleyin. Hiçbiri sabit bir görsele dönüşmez; hepsini sonradan da düzenleyebilirsiniz.",
      },
      {
        title: "3D dönüşler gerçek CSS’le yapılır.",
        description:
          "Katmanı X, Y ve Z ekseninde döndürüp perspektifi ve derinliği ayarlayın. Fountible, gördüğünüz dönüşümü birebir CSS transform olarak yazar.",
      },
      {
        title: "Ekip alanı, dosyalar ve fontlar.",
        description:
          "Tüm işler ortak bir ekip alanında toplanır ve ekibin fontlarını bir kez yüklemeniz yeterlidir. Herkes aynı dosyada, birbirinin imlecini canlı görerek çalışır.",
      },
      {
        title: "Auto layout kodda da aynen çalışır.",
        description:
          "Dikey, yatay ve ızgara akışlar doğrudan flexbox ve grid’e dönüşür; gap ve padding değerleri de koda olduğu gibi taşınır.",
      },
      {
        title: "Görsel ayarlarını sonradan da değiştirebilirsiniz.",
        description:
          "Pozlama, kontrast, renk ve beyaz dengesi CSS ve SVG filtreleriyle uygulanır; orijinal görsel olduğu gibi kalır. Görselin arka planını da kendi cihazınızda kaldırabilirsiniz.",
      },
    ],
  },
  platforms: {
    label: "Nerede çalışır",
    title: "Fountible hem tarayıcıda hem Mac’te çalışır.",
    lead: "Web’de de Mac uygulamasında da aynı tuvalle çalışırsınız; Chrome eklentisi ise web sayfalarını tuvale taşır.",
    items: [
      {
        title: "Web uygulaması",
        description:
          "Hiçbir şey kurmadan app.fountible.com adresinden açarsınız. Tuval, Bro ve dışa aktarma burada da var.",
      },
      {
        title: "Mac uygulaması",
        description:
          "Tam özellikli tuval, Mac’te yerel bir uygulama olarak çalışır. Claude ve Cursor hesaplarını ve MCP bağlantılarını yalnızca burada kullanabilirsiniz. Apple Silicon işlemcili bir Mac gerekir.",
      },
      {
        title: "Fountible Capture",
        description:
          "Herhangi bir web sayfasındaki istediğiniz öğeyi tuvale kopyalayan bir Chrome eklentisi. Stiller, görseller ve sayfanın kendi fontları da birlikte gelir.",
      },
    ],
  },
  faq: {
    label: "Sorular",
    title: "Tasarım ve ürün yöneticilerinin sorduğu sorular.",
    lead: "Aradığınız yanıt burada yoksa demoda bize sorun.",
    noteTitle: "Sık sorulanlar",
    note: "Tüm ayrıntılar fountible.com’daki dokümantasyonda.",
    items: [
      {
        question: "Fountible bir Figma alternatifi mi?",
        answer:
          "Arayüzünüz React ve Tailwind ile yazılıyorsa, evet. Frame, auto layout, vektör, bileşen, değişken ve eş zamanlı ortak çalışma burada da var. Aradaki fark, tuvalin gerçek React bileşenleri render etmesi. Figma’da illüstrasyon yapan ekipler iki aracı yan yana kullanabilir.",
      },
      {
        question: "Kodu hangi formatlarda dışa aktarabilirim?",
        answer:
          "Bir katmanı React ve Tailwind JSX, HTML ya da SVG olarak alabilirsiniz. Yerleşim flexbox ve gap olarak, animasyon ise sade anime.js olarak çıkar. Görsel, video ve sunum için de PNG, JPG, MP4 ve PPTX seçenekleri var.",
      },
      {
        question: "Bro hangi yapay zeka modelleriyle çalışır?",
        answer:
          "ChatGPT ile hem tarayıcıda hem Mac’te giriş yapabilirsiniz. Claude ve Cursor hesapları ise Mac uygulamasında çalışır. Tarayıcıda bir Anthropic ya da Kimi API anahtarı da ekleyebilirsiniz. Her sohbet, kendisi için seçtiğiniz modelle çalışır.",
      },
      {
        question: "Claude Desktop ya da Cursor ile çalışır mı?",
        answer:
          "Evet. Mac uygulaması yerel bir MCP sunucusu çalıştırır. Claude Code, Claude Desktop, Cursor ve diğer MCP istemcileri bu sayede açık dosyalarınızı okuyup düzenleyebilir. Bu bağlantılar varsayılan olarak kapalıdır, ayarlardan açılır. Tarayıcı sürümünde ise bu özellik yok.",
      },
      {
        question: "Ekibimle birlikte çalışabilir miyim?",
        answer:
          "Evet. Ekibinizle aynı dosyada, birbirinizin imlecini canlı görerek çalışabilir, dosyayı bir bağlantıyla paylaşabilirsiniz. Rolleri, ortak kütüphaneleri ve fontları ekip alanından yönetir, gerektiğinde sürüm geçmişinden önceki bir sürüme dönersiniz.",
      },
      {
        question: "Fountible hangi platformlarda çalışır?",
        answer:
          "Tarayıcıda app.fountible.com adresinde ve Mac uygulamasında çalışır. Mac uygulaması Apple Silicon gerektirdiği için Intel işlemcili Mac’lerde web sürümünü kullanmalısınız. Fountible Capture ise bir Chrome eklentisidir.",
      },
    ],
  },
  ctaAssurances: [
    "Figma’dan yapıştırdığınız tasarım katman olarak gelir",
    "Kodu React ve Tailwind olarak dışa aktarırsınız",
    "Bro, seçtiğiniz modelle çalışır",
  ],
  parent: {
    label: "GBO Vision",
    title: "Fountible, bir GBO Vision ürünüdür.",
    lead: "Özellikleri, dokümantasyonu ve indirme sayfasını ürünün kendi sitesinde, fountible.com’da bulabilirsiniz.",
    linkLabel: "fountible.com",
    externalHint: "başka bir site",
  },
};

export default fountiblePage;
