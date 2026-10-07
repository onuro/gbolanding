import type { ContactPageMessages } from "@/i18n/page-types/contact";

// /contact, Turkish. Written against docs/turkish-copy-guide.md; the wording
// and the rules behind it (no e-mail, phone or legal name; no reply-time
// promise; no consent checkbox) are in docs/contact-page-research.md and the
// header of page-types/contact.ts.
// "{n}" in an error is replaced with the limit from src/lib/contact.ts, in
// Turkish number format (4.000), so the copy can never disagree with the check.
const contactPage: ContactPageMessages = {
  metaTitle: "İletişim | Bize yazın | GBO Vision",
  metaDescription:
    "GBO Vision’a yapay zeka projeniz ya da ürünlerimiz hakkında iletişim formundan yazın; mesajınıza e-postayla yanıt veririz. Ofisimiz İstanbul Ataşehir’dedir.",
  eyebrow: "İletişim",
  title: "Bize yazın.",
  lead: "Yapay zekayla hızlandırmak istediğiniz işi birkaç cümleyle anlatın ya da ürünlerimizle ilgili sorunuzu yazın. Mesajınızı okuyup size e-postayla yanıt veririz.",
  form: {
    label: "İletişim formu",
    name: "Ad soyad",
    email: "E-posta",
    company: "Şirket",
    optional: "isteğe bağlı",
    product: {
      legend: "Konu",
      general: "Genel",
      options: {
        kollektor: "Kollektor",
        intelval: "Intelval",
        hastam: "Hastam",
        fountible: "Fountible",
        custom: "Özel yazılım",
      },
    },
    message: "Mesaj",
    messagePlaceholder: "Neye ihtiyacınız olduğunu kısaca anlatın",
    honeypot: "Bu alanı boş bırakın",
    submit: "Mesajı gönderin",
    sending: "Gönderiliyor",
    privacy: "Bu formdaki bilgileri yalnızca mesajınızı yanıtlamak için kullanırız.",
    privacyMore: "Ayrıntılı bilgi için {link} inceleyin.",
    privacyLinkLabel: "aydınlatma metnini",
  },
  success: {
    title: "Mesajınızı aldık",
    body: "Teşekkür ederiz. Mesajınızı okuyup size e-postayla yanıt vereceğiz.",
    again: "Yeni mesaj yazın",
  },
  errors: {
    nameRequired: "Adınızı ve soyadınızı girin",
    nameTooLong: "Adınız en fazla {n} karakter olabilir",
    emailRequired: "E-posta adresinizi girin",
    emailInvalid: "Lütfen geçerli bir e-posta adresi girin",
    companyTooLong: "Şirket adı en fazla {n} karakter olabilir",
    messageRequired: "Mesajınızı yazın",
    messageTooShort: "Mesajınız en az {n} karakter olmalı",
    messageTooLong: "Mesajınız en fazla {n} karakter olabilir",
    submission: "Mesajınız şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
    invalid: "Mesajınız gönderilemedi. Lütfen formdaki bilgileri kontrol edip tekrar deneyin.",
    rateLimited:
      "Kısa sürede çok sayıda mesaj gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.",
    unavailable: "Mesajlar şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.",
  },
  address: {
    label: "Ofisimiz",
    country: "Türkiye",
    mapLink: "Haritada açın",
    mapLinkHint: "Google Haritalar, yeni sekmede açılır",
  },
};

export default contactPage;
