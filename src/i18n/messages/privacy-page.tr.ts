import type { PrivacyPageMessages } from "@/i18n/page-types/privacy";

// /privacy, Turkish: the binding privacy notice for the contact form. Written
// against KVKK md. 10–11 and the Aydınlatma Yükümlülüğü Tebliği, in the order
// Turkish companies publish it. Processors are the ones the form really uses
// (src/pages/api/contact.ts: Vercel hosting, Resend e-mail; the inbox is
// Google Workspace). Have counsel review before relying on it.
const privacyPage: PrivacyPageMessages = {
  metaTitle: "KVKK aydınlatma metni | GBO Vision",
  metaDescription:
    "GBO Vision, iletişim formunda verdiğiniz bilgileri neden ve nasıl işlediğini bu metinde anlatır. KVKK’ya göre haklarınızı ve başvuru yolunu da bulursunuz.",
  eyebrow: "KVKK",
  title: "İletişim formu aydınlatma metni",
  lead: "Bu metin, gbovision.com’daki iletişim formuyla bize gönderdiğiniz kişisel verilerin nasıl işlendiğini açıklar. 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun (KVKK) 10. maddesi uyarınca hazırlanmıştır.",
  updated: "Son güncelleme: 7 Ekim 2026",
  sections: [
    {
      title: "Veri sorumlusu",
      paragraphs: [
        "Kişisel verileriniz, veri sorumlusu sıfatıyla GB Baskı ve Servis Hizmetleri Anonim Şirketi (“GBO Vision”) tarafından işlenir.",
        "Adresimiz: {address}.",
      ],
    },
    {
      title: "İşlediğimiz kişisel veriler",
      paragraphs: ["İletişim formunu doldurduğunuzda şu verileri işleriz:"],
      items: [
        "Kimlik bilgisi: adınız ve soyadınız.",
        "İletişim bilgisi: e-posta adresiniz.",
        "Şirket bilgisi: yazmayı tercih ederseniz çalıştığınız şirketin adı.",
        "Talep bilgisi: seçtiğiniz konu ve mesajınızın içeriği.",
        "İşlem güvenliği bilgisi: formu kötüye kullanıma karşı korumak için IP adresiniz.",
      ],
      after: [
        "Lütfen mesajınıza başka kişilerin bilgilerini yazmayın. Sağlık bilgisi gibi özel nitelikli verilerinizi de paylaşmayın.",
      ],
    },
    {
      title: "Verileri hangi amaçlarla işliyoruz?",
      paragraphs: ["Verilerinizi yalnızca şu amaçlarla işleriz:"],
      items: [
        "Mesajınızı okumak ve size yanıt vermek.",
        "Ürün ya da hizmet talebinizi incelemek ve bu konuda size dönmek.",
        "Formun güvenliğini sağlamak ve kötüye kullanımını önlemek.",
      ],
      after: [
        "Bilgilerinizi pazarlama e-postası göndermek için kullanmayız.",
      ],
    },
    {
      title: "Toplama yöntemi ve hukuki sebep",
      paragraphs: [
        "Verilerinizi, formu gönderdiğiniz anda elektronik ortamda toplarız.",
        "Bu verileri KVKK’nın 5. maddesinin ikinci fıkrasındaki şu hukuki sebeplere dayanarak işleriz:",
      ],
      items: [
        "(c) bendi: talebiniz bir ürün ya da hizmetle ilgiliyse, bir sözleşmenin kurulmasıyla doğrudan ilgili olması.",
        "(f) bendi: mesajınızı yanıtlamak ve formu korumak için meşru menfaatimiz. Bu işleme temel hak ve özgürlüklerinize zarar vermez.",
      ],
    },
    {
      title: "Verileri kimlere aktarıyoruz?",
      paragraphs: [
        "Verilerinizi satmayız ve pazarlama amacıyla kimseyle paylaşmayız. Form için hizmet aldığımız şu şirketler, verilerinizi yalnızca bu hizmet için işler:",
      ],
      items: [
        "Vercel Inc.: web sitemizin barındırma hizmeti.",
        "Resend: mesajınızı bize e-postayla ileten e-posta gönderim hizmeti.",
        "Google LLC (Google Workspace): mesajınızın ulaştığı kurumsal e-posta hizmeti.",
      ],
      after: [
        "Bu şirketlerin sunucuları yurt dışında olabilir. Bu durumda verileriniz, KVKK’nın 9. maddesindeki kurallara uygun olarak yurt dışına aktarılır.",
        "Yetkili kamu kurumları isterse, verileriniz yasanın izin verdiği ölçüde onlara da aktarılabilir.",
      ],
    },
    {
      title: "Verileri ne kadar süre saklıyoruz?",
      paragraphs: [
        "Mesajınızı ve bilgilerinizi talebiniz sonuçlanana kadar saklarız. Sonra da olası bir anlaşmazlık için yasal zamanaşımı süresi boyunca tutarız. Süre dolunca verileri siler ya da anonim hale getiririz.",
      ],
    },
    {
      title: "KVKK kapsamındaki haklarınız",
      paragraphs: ["KVKK’nın 11. maddesi uyarınca bize başvurarak şu haklarınızı kullanabilirsiniz:"],
      items: [
        "Verilerinizi işleyip işlemediğimizi öğrenme.",
        "İşlenmişse buna ilişkin bilgi isteme.",
        "Verilerin neden işlendiğini ve bu amaçla mı kullanıldığını öğrenme.",
        "Verilerin yurt içinde ya da yurt dışında aktarıldığı üçüncü kişileri bilme.",
        "Eksik ya da yanlış işlenmişse düzeltilmesini isteme.",
        "Şartları varsa (KVKK md. 7) verilerin silinmesini ya da yok edilmesini isteme.",
        "Düzeltme, silme ya da yok etme işlemini, verilerin aktarıldığı kişilere bildirmemizi isteme.",
        "Yalnızca otomatik sistemlerle yapılan bir analizin aleyhinize sonuç doğurmasına itiraz etme.",
        "Kanuna aykırı işleme yüzünden zarar görürseniz bu zararın giderilmesini isteme.",
      ],
    },
    {
      title: "Bize nasıl başvurabilirsiniz?",
      paragraphs: [
        "Taleplerinizi adresimize yazılı olarak gönderin ya da formdan bize yazın. Başvurunun şekli, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’de belirlenmiştir.",
        "Başvurunuzu en geç 30 gün içinde ve ücretsiz yanıtlarız. İşlem ek bir maliyet doğurursa, Kurulun tarifesindeki ücret alınabilir.",
      ],
    },
  ],
};

export default privacyPage;
