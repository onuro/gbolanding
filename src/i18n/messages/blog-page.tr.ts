import type { BlogPageMessages } from "@/i18n/page-types/blog";

// Copy around the articles on /blog and /blog/<slug>. The articles carry their
// own copy in src/content/blog/*.md. scripts/content-audit.mjs picks this file
// up by its name, for readability and for the index's title and description.
const blogPage: BlogPageMessages = {
  metaTitle: "Blog | Kurumsal yapay zeka yazıları | GBO Vision",
  metaDescription:
    "GBO Vision Blog, şirketlerin yapay zekayı nasıl kullandığını anlatır: yapay zeka ürünleri ve asistanlar, teknoloji seçimi, strateji ve sektörlerden örnekler.",
  name: "GBO Vision Blog",
  index: {
    eyebrow: "Blog",
    title: "İşletmeler için yapay zeka üzerine notlar",
    lead: "Şirketlerin yapay zekayı nasıl kullandığını yazıyoruz: ürün ve teknoloji seçimi, strateji ve sektörlerden örnekler. Her yazıda dayandığımız kaynakları da paylaşıyoruz.",
    featuredLabel: "Öne çıkan yazı",
    listLabel: "Tüm yazılar",
    empty: "İlk yazılarımız hazırlanıyor, çok yakında burada olacak.",
    feed: "RSS akışı",
  },
  article: {
    breadcrumbLabel: "Sayfa yolu",
    home: "Ana sayfa",
    readingTime: "{n} dk",
    readingTimeLabel: "Okuma süresi",
    published: "Yayın tarihi",
    updated: "Güncelleme tarihi",
    summary: "Kısaca",
    toc: "İçindekiler",
    read: "Devamını oku",
    faq: {
      label: "Sorular",
      title: "Sıkça sorulan sorular",
    },
    sources: {
      label: "Kaynaklar",
      title: "Bu yazıda dayandığımız kaynaklar",
    },
    related: {
      label: "İlgili ürün",
      demo: "Demo talep edin",
    },
    more: {
      label: "Benzer yazılar",
      title: "İlginizi çekebilecek diğer yazılar",
    },
    allPosts: "Tüm yazılar",
  },
  productPosts: {
    label: "Blog",
    title: "Bu konuyu blogumuzda ayrıntılı anlattık.",
  },
};

export default blogPage;
