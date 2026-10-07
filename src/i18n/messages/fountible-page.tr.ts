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
// Positioning (the owner's): Fountible is first an AI design tool; Bro and
// designing with AI lead, export to code is a later, secondary benefit.
// Written for corporate Turkish readers, not developers: no "tuval" (nobody
// says it; write ekran, tasarım, dosya), no code internals (DOM, render,
// Tailwind class, prop, token, runtime). Product and tool names stay as they
// are: Fountible, Bro, Figma, React, ChatGPT, Claude, Cursor, Kimi K3.
const fountiblePage: FountiblePageMessages = {
  metaTitle: "Fountible: Yapay Zeka Destekli Tasarım Aracı | GBO Vision",
  metaDescription:
    "Fountible, yapay zeka destekli bir arayüz tasarım aracıdır. Tasarım asistanı Bro ekranları sizinle birlikte hazırlar; biten tasarım koda da aktarılır.",
  hero: {
    eyebrow: "Tasarımcılar ve ürün ekipleri için",
    title: "Arayüzleri yapay zekayla birlikte tasarlayın.",
    lead: "Fountible, yapay zeka destekli bir arayüz tasarım aracıdır. Ne istediğinizi anlatırsınız, tasarım asistanı Bro ekranı sizin için hazırlar. Sonra dilediğiniz gibi düzenler, ekibinizle paylaşır ya da koda aktarırsınız.",
    chips: ["Tasarım asistanı Bro", "Figma’dan aktarım", "Web ve Mac uygulaması"],
    primaryCta: "Ekibiniz için demo isteyin",
    secondaryCta: "fountible.com’a gidin",
    steps: [
      {
        title: "Ne istediğinizi anlatın.",
        description:
          "Bro’ya bir ekran, bir animasyon ya da bir sunum tarif edin. İsterseniz Figma’daki tasarımınızı da kopyalayıp yapıştırabilirsiniz.",
      },
      {
        title: "Bro tasarımı hazırlar.",
        description:
          "Bro ekranı düzenlenebilir katmanlar halinde kurar. Her katmanı siz de istediğiniz gibi değiştirebilirsiniz.",
      },
      {
        title: "Paylaşın ya da koda aktarın.",
        description:
          "Biten tasarımı ekibinizle paylaşın, video ya da sunum olarak alın veya yazılım ekibinize kod olarak teslim edin.",
      },
    ],
  },
  heroPicture: {
    alt: "Fountible’ın tasarım ekranı: ortada bir mobil uygulamanın ekranları, yanlarda katmanlar, ayarlar ve Bro sohbeti.",
    caption: "fountible.com’dan ekran görüntüsü",
  },
  bro: {
    label: "Bro",
    title: "Tasarım asistanınız Bro, ekranı sizin için hazırlar.",
    lead: "Bro önce dosyanızı inceler; sayfayı, seçtiğiniz öğeleri, renklerinizi ve yazı tiplerinizi tanır. Sonra istediğiniz tasarımı düzenlenebilir katmanlar halinde, gözünüzün önünde kurar.",
    noteTitle: "Nasıl okunur",
    note: "Kutular, Bro’nun nasıl çalıştığını özetliyor.",
    picture: {
      alt: "Tek bir Fountible dosyasında açık üç Bro sohbeti; her biri aynı sayfanın farklı bir bölümünü tasarlıyor.",
      caption: "fountible.com’dan ekran görüntüsü",
    },
    items: [
      {
        title: "Aynı anda birden fazla Bro.",
        description:
          "Aynı dosyada ayrı sohbetler açıp sayfanın farklı bölümlerini aynı anda tasarlatabilirsiniz. En fazla altı sohbet aynı anda çalışır; aynı katmana dokunan işler sırayla yapılır.",
      },
      {
        title: "Güvendiğiniz yapay zeka modelini seçin.",
        description:
          "Bro’yu ChatGPT, Claude, Cursor ya da Kimi K3 ile kullanabilirsiniz. Kendi hesabınızla giriş yapar ya da API anahtarınızı eklersiniz. Claude ve Cursor hesapları için Mac uygulaması gerekir.",
      },
      {
        title: "Claude Code ve Cursor’la da çalışır.",
        description:
          "Mac uygulaması, Claude Code, Claude Desktop ve Cursor gibi araçların açık tasarımınız üzerinde çalışmasına izin verir. Yaptıkları her değişikliği ekranda anında görür, tek adımda geri alabilirsiniz.",
      },
    ],
  },
  code: {
    label: "Koda aktarım",
    title: "Tasarımınızı yazılım ekibinize kod olarak teslim edin.",
    lead: "Fountible’da hazırladığınız ekranlar React koduna dönüşür. Yazılım ekibinizin tasarımı sıfırdan kodlaması gerekmez; ekranda ne görüyorsanız kodda da o çıkar.",
    noteTitle: "Nasıl okunur",
    note: "Her satır, tasarımın koda nasıl geçtiğini anlatır.",
    picture: {
      alt: "Fountible’ın kod görünümü: seçili bir fiyat kartı ve yanında o kartın React kodu.",
      caption: "fountible.com’dan ekran görüntüsü",
    },
    rows: [
      {
        title: "Figma’daki tasarımlarınızı taşıyın.",
        description:
          "Figma’da seçtiğiniz öğeleri kopyalayıp Fountible’a yapıştırın; katmanlar, yazılar ve yerleşim ayarları düzenlenebilir halde gelir. Çok karmaşık bazı ayrıntılarda küçük farklar olabilir.",
      },
      {
        title: "Ekranda ne görüyorsanız kodda o çıkar.",
        description:
          "Fountible tasarımı en baştan çalışan bir arayüz olarak hazırlar. Bu yüzden tasarımla yayındaki sayfa arasında fark oluşmaz.",
      },
      {
        title: "İstediğiniz bölümü kod olarak kopyalayın.",
        description:
          "Bir bölümü seçip React, HTML ya da SVG olarak kopyalayın. Bileşen ayarları ve tema değerleri de koda eksiksiz geçer.",
      },
      {
        title: "Renk ve ölçüler her yerde tutarlı kalır.",
        description:
          "Renk, boşluk ve köşe değerlerini bir kez tanımlarsınız; bu değerler hem tasarımda hem kodda kullanılır. Birini değiştirdiğinizde her yer birlikte güncellenir.",
      },
    ],
  },
  motion: {
    label: "Animasyon ve sunum",
    title: "Ekranı tasarlayın, hareketini de siz kurgulayın.",
    lead: "Animasyonu doğrudan tasarımın üzerinde kurarsınız; önizlemede ne görüyorsanız dışa aktardığınızda da onu alırsınız. Sunumları da aynı dosyada hazırlayabilirsiniz.",
    noteTitle: "Erişilebilirlik",
    note: "Animasyonlar, kullanıcının “hareketi azalt” tercihine uyar.",
    picture: {
      alt: "Fountible’ın animasyon görünümü: bir kartın katmanları zaman çizelgesinde alt alta dizili, her satırda anahtar kareler var.",
      caption: "fountible.com’dan ekran görüntüsü",
    },
    rows: [
      {
        title: "İster hazır efekt, ister zaman çizelgesi.",
        description:
          "Hazır bir giriş efektini tek tıkla ekleyin ya da zaman çizelgesini açıp her hareketi kendiniz ayarlayın. Üç boyutlu dönüşleri de aynı yerden yönetirsiniz.",
      },
      {
        title: "Ses ekleyin, video olarak alın.",
        description:
          "Müzik ya da seslendirme ekleyip tasarımınızı MP4 video olarak dışa aktarın. Mac uygulamasında arka planı saydam, profesyonel video formatlarında da çıktı alabilirsiniz.",
      },
      {
        title: "Animasyonu kod olarak da alın.",
        description:
          "Animasyonlar da standart React koduna dönüşür; çalışması için Fountible’a ait ek bir yazılım gerekmez.",
      },
      {
        title: "Sunumları aynı dosyada hazırlayın.",
        description:
          "Her slayt ayrı bir sayfadır; geçişler, tıkladıkça beliren öğeler ve konuşmacı notları hazırdır. PowerPoint dosyalarını içe aktarabilir, sunumunuzu yine PowerPoint olarak dışa aktarabilirsiniz.",
      },
    ],
  },
  features: {
    label: "Özellikler",
    title: "Tasarım ekibinizin ihtiyaç duyduğu her şey tek yerde.",
    lead: "Bileşenlerden ekip çalışmasına kadar her özellik aynı dosyada, birlikte çalışır.",
    noteTitle: "Nasıl okunur",
    note: "Her kutu, üründe kullanabileceğiniz bir özelliği anlatıyor.",
    items: [
      {
        title: "Bileşenler her yerde güncel kalır.",
        description:
          "Bir bileşeni bir kez tasarlayıp istediğiniz yerde kullanın. Ana bileşende yaptığınız değişiklik, kullanıldığı her yere yansır.",
      },
      {
        title: "Efektler sonradan da düzenlenir.",
        description:
          "Gradyan, dalga, sıvı metal ya da su gibi hareketli efektler ekleyin. Hiçbiri sabit bir görsele dönüşmez; ayarlarını istediğiniz zaman değiştirebilirsiniz.",
      },
      {
        title: "Üç boyutlu dönüşler.",
        description:
          "Öğeleri üç eksende döndürüp derinlik ve perspektif verin. Ekranda gördüğünüz, kodda da aynen çıkar.",
      },
      {
        title: "Ortak ekip alanı.",
        description:
          "Ekibinizin dosyaları ve yazı tipleri tek bir alanda durur. Herkes aynı dosyada, birbirinin imlecini anında görerek çalışır.",
      },
      {
        title: "Otomatik yerleşim.",
        description:
          "Dikey, yatay ve ızgara düzenler içeriğe göre kendiliğinden ayarlanır; bu düzen koda da aynen geçer.",
      },
      {
        title: "Görsel düzenleme.",
        description:
          "Pozlama, kontrast ve renk ayarlarını değiştirdiğinizde orijinal görsel bozulmaz. Görselin arka planını da kendi bilgisayarınızda kaldırabilirsiniz.",
      },
    ],
  },
  platforms: {
    label: "Nerede çalışır",
    title: "Fountible hem tarayıcıda hem Mac’te çalışır.",
    lead: "Web’de ve Mac uygulamasında aynı dosyalarla çalışırsınız; Chrome eklentisi ise web sayfalarındaki öğeleri tasarımınıza taşır.",
    items: [
      {
        title: "Web uygulaması",
        description:
          "Hiçbir şey kurmadan app.fountible.com adresinden açarsınız. Bro ve dışa aktarma burada da var.",
      },
      {
        title: "Mac uygulaması",
        description:
          "Fountible’ın tüm özellikleri Mac’te ayrı bir uygulama olarak çalışır. Claude ve Cursor hesapları ile Claude Code ve Cursor bağlantıları yalnızca burada kullanılabilir. Apple Silicon işlemcili bir Mac gerekir.",
      },
      {
        title: "Fountible Capture",
        description:
          "Herhangi bir web sayfasındaki öğeyi tasarımınıza kopyalayan bir Chrome eklentisi. Görseller ve yazı tipleri de birlikte gelir.",
      },
    ],
  },
  faq: {
    label: "Sorular",
    title: "Tasarım ekiplerinin sık sorduğu sorular.",
    lead: "Sorunuzun yanıtı burada yoksa demoda konuşalım.",
    noteTitle: "Sık sorulanlar",
    note: "Tüm ayrıntılar fountible.com’daki dokümantasyonda.",
    items: [
      {
        question: "Fountible, Figma’nın yerine kullanılabilir mi?",
        answer:
          "Arayüz tasarımı için evet. Bileşenler, otomatik yerleşim, değişkenler ve eş zamanlı ekip çalışması Fountible’da da var. Farkı, Bro’nun tasarımı sizinle birlikte hazırlaması ve tasarımın doğrudan koda dönüşmesi.",
      },
      {
        question: "Bro hangi yapay zeka modelleriyle çalışır?",
        answer:
          "ChatGPT ile hem tarayıcıda hem Mac’te giriş yapabilirsiniz. Claude ve Cursor hesapları Mac uygulamasında çalışır. Tarayıcıda bir Anthropic ya da Kimi API anahtarı da ekleyebilirsiniz.",
      },
      {
        question: "Tasarımı hangi biçimlerde dışa aktarabilirim?",
        answer:
          "Ekranları React, HTML ya da SVG kodu olarak, görselleri PNG ve JPG, animasyonları MP4 video, sunumları ise PowerPoint olarak alabilirsiniz.",
      },
      {
        question: "Claude Code ya da Cursor ile birlikte kullanılabilir mi?",
        answer:
          "Evet. Mac uygulaması, bu araçların açık dosyanız üzerinde çalışmasına izin verir. Bağlantı ilk başta kapalıdır, ayarlardan açarsınız. Tarayıcı sürümünde bu özellik yok.",
      },
      {
        question: "Ekibimle birlikte çalışabilir miyim?",
        answer:
          "Evet. Aynı dosyada, birbirinizin imlecini anında görerek çalışabilir, dosyayı bir bağlantıyla paylaşabilirsiniz. Rolleri, ortak kütüphaneleri ve yazı tiplerini ekip alanından yönetir, gerektiğinde önceki bir sürüme dönersiniz.",
      },
      {
        question: "Fountible hangi platformlarda çalışır?",
        answer:
          "Tarayıcıda app.fountible.com adresinde ve Mac uygulamasında. Mac uygulaması Apple Silicon işlemci gerektirir; Intel işlemcili Mac’lerde web sürümünü kullanabilirsiniz. Fountible Capture ise bir Chrome eklentisidir.",
      },
    ],
  },
  ctaAssurances: [
    "Tasarım asistanı Bro",
    "Figma’dan kolay aktarım",
    "Tek adımda koda aktarım",
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
