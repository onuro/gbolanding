import type { HastamPageMessages } from "@/i18n/page-types/hastam";

// /hastam, Turkish. Most sentences are the approved public copy of hastam.ai
// (hastam-site/src/i18n/messages), which already passes the same readability
// gate. Rules this file is written against:
//   - a phone booking is a REQUEST the clinic approves, never a booked slot;
//   - a complaint is routed to a department, never assessed or diagnosed;
//   - in an emergency the assistant says 112 first;
//   - the only numbers are product defaults (3 attempts, +10 minutes, +4 hours,
//     09.00-19.00, 2 calls a day and 5 a week);
//   - no price, plan, trial, SMS, compliance badge, clinic name or "live".
// Akademi Polikliniği, the people and the hours are invented sample data.
const hastamPage: HastamPageMessages = {
  metaTitle: "Hastam: Kliniklere Yapay Zeka Telefon Asistanı | GBO Vision",
  metaDescription:
    "Hastam, kliniğinizin telefonunu açan yapay zeka asistanıdır. Hastayla konuşur, randevu talebini alır ve ekranınıza yazar. Bir GBO Vision şirketidir.",
  hero: {
    eyebrow: "Poliklinikler ve tıp merkezleri için",
    title: "Kliniğiniz için sesli yapay zeka asistanı.",
    lead: "Hastam AI, hasta aramalarını 7/24 karşılar ve insan gibi doğal konuşur. Hastayı dinler, randevu talebini alır ve kliniğinizin paneline kaydeder. Randevu, hekim veya kliniğin onayıyla kesinleşir.",
    chips: ["Uygulama yok", "Tuşlama menüsü yok", "Telefonla randevu talebi"],
    primaryCta: "Demo isteyin",
    secondaryCta: "hastam.ai sitesi",
    steps: [
      {
        title: "Hastanız kliniği arar.",
        description: "Bildiği numarayı arar. Uygulama yok, tuşlama yok.",
      },
      {
        title: "Hastayla doğal bir diyalog kurar.",
        description: "Hastanın ihtiyacını dinler, uygun hekim ve randevu saatlerini sunar.",
      },
      {
        title: "Sonuç ekranınıza düşer.",
        description: "Kararı siz verirsiniz, hasta bilgilendirilir.",
      },
    ],
  },
  faq: {
    label: "Sorular",
    title: "Klinik sahiplerinin sorduğu sorular.",
    lead: "Yanıtını burada bulamadığınız soruyu demoda sorabilirsiniz.",
    noteTitle: "Sık sorulanlar",
    note: "Klinik sahiplerinin en sık sorduğu sorular.",
    items: [
      {
        question: "Hastanın bir uygulama indirmesi gerekir mi?",
        answer:
          "Hayır. Hastanız kliniğinizin bildiği numarasını arar ve konuşur. Uygulama, şifre ya da tuşlama menüsü yoktur.",
      },
      {
        question: "Hastam randevuyu doğrudan mı oluşturur?",
        answer:
          "Hayır. Asistan uygun saati bulur ve bir randevu talebi oluşturur. Talebi panelde siz onaylarsınız. Onaydan sonra Hastam hastayı arar ve randevuyu teyit eder.",
      },
      {
        question: "Arayan kişinin durumu acilse ne olur?",
        answer:
          "Asistan önce 112’yi aramasını söyler. Çağrı panelde acil olarak işaretlenir ve ekibiniz uyarılır. Yetkili bir çalışanınız görüşmeyi canlı devralabilir.",
      },
      {
        question: "Hastam hangi dillerde konuşur?",
        answer: "Ana dil Türkçedir. İngilizce de vardır.",
      },
      {
        question: "Hastam neleri yapmaz?",
        answer:
          "Teşhis koymaz ve tıbbi tavsiye vermez. Reçete yazmaz ya da yenilemez. Randevuyu sizin yerinize onaylamaz.",
      },
      {
        question: "Kurulum nasıl yapılır?",
        answer:
          "Hastam her klinik için ayrı kurulur. Bölümleriniz, hekimleriniz ve çalışma saatleriniz sisteme tanımlanır. Başlamak için demo isteyin.",
      },
    ],
  },
  ctaAssurances: [
    "Her klinik için ayrı kurulur",
    "Türkçe konuşur, İngilizce de var",
    "Onay kliniğinizde kalır",
  ],
  heroCalls: {
    label: "Örnek çağrılar",
    description:
      "Dört örnek çağrı sırayla oynar. Hasta kliniği arar ya da Hastam hastayı arar. Yapay zeka konuşur. Sonuç kliniğin ekranına düşer.",
    tabsLabel: "Örnek çağrıyı seçin",
    pause: "Örnek çağrıları duraklat",
    play: "Örnek çağrıları oynat",
    phoneLabel: "Hastanın telefonu",
    talkLabel: "Görüşme",
    screenLabel: "Kliniğinizin ekranı",
    clinic: "Akademi Polikliniği",
    clinicInitials: "AP",
    line: "Klinik hattı",
    inbound: "Gelen çağrı",
    outbound: "Giden arama",
    speakers: { ai: "Yapay zeka", pt: "Hasta" },
    scenes: [
      {
        tab: "Randevu talebi",
        dir: "in",
        patient: "Ayşe Yılmaz",
        turns: [
          {
            who: "ai",
            text: "Akademi Polikliniği, buyurun. Görüşmemiz kayıt altına alınmaktadır.",
          },
          {
            who: "pt",
            text: "İki gündür kulağım ağrıyor. Bir doktora görünmek istiyorum.",
          },
          {
            who: "ai",
            text: "Geçmiş olsun. Kulak Burun Boğaz’da Dr. Zeynep Arslan yarın 11.30 ve 15.00’te uygun. Hangisi olsun?",
          },
          { who: "pt", text: "11.30 olur." },
          {
            who: "ai",
            text: "Talebinizi yarın 11.30 için aldım. Kliniğimiz onaylayınca sizi arayıp teyit edeceğim.",
          },
        ],
        outcome: {
          area: "Takvim",
          meta: "Dr. Zeynep Arslan · KBB",
          when: "Çar 11.30",
          status: "Onay bekliyor",
          tone: "pending",
          action: "Onayla",
        },
      },
      {
        tab: "Erteleme",
        dir: "in",
        patient: "Mehmet Demir",
        turns: [
          {
            who: "ai",
            text: "Akademi Polikliniği, buyurun. Görüşmemiz kayıt altına alınmaktadır.",
          },
          {
            who: "pt",
            text: "Yarınki randevuma gelemeyeceğim. Perşembeye alabilir miyiz?",
          },
          {
            who: "ai",
            text: "Dr. Mehmet Kaya perşembe 10.00, 14.30 ve 16.00’da uygun. Hangisini istersiniz?",
          },
          { who: "pt", text: "14.30 lütfen." },
          {
            who: "ai",
            text: "Yarınki randevunuzu iptal ettim. Perşembe 14.30 için talebinizi aldım, onaylanınca sizi arayacağım.",
          },
        ],
        outcome: {
          area: "Takvim",
          meta: "Dr. Mehmet Kaya · Kardiyoloji",
          when: "Çar 09.30 → Per 14.30",
          status: "Onay bekliyor",
          tone: "pending",
          action: "Onayla",
        },
      },
      {
        tab: "Hekime mesaj",
        dir: "in",
        patient: "Fatma Kaya",
        turns: [
          {
            who: "ai",
            text: "Akademi Polikliniği, buyurun. Görüşmemiz kayıt altına alınmaktadır.",
          },
          {
            who: "pt",
            text: "Tahlil sonuçlarım çıktı. Selin Hanım’a ilacımla ilgili bir şey soracaktım.",
          },
          {
            who: "ai",
            text: "Sorunuzu Dr. Selin Aydın’a iletmek üzere not alıyorum. Buyurun.",
          },
          { who: "pt", text: "İlacı sabah mı, akşam mı almalıyım?" },
          {
            who: "ai",
            text: "Notunuzu ilettim. Hekimimiz yanıtlayınca sizi arayıp yanıtını okuyacağım.",
          },
        ],
        outcome: {
          area: "Talepler",
          meta: "Dr. Selin Aydın · Dahiliye",
          when: "“İlacı sabah mı, akşam mı almalıyım?”",
          status: "Yeni talep",
          tone: "info",
          action: "Yanıtla",
        },
      },
      {
        tab: "Hatırlatma",
        dir: "out",
        patient: "Ali Çelik",
        turns: [
          {
            who: "ai",
            text: "Merhaba Ali Bey, Akademi Polikliniği’nden arıyorum. Görüşmemiz kayıt altına alınmaktadır. Yarın 10.30’da Dr. Burak Demir ile randevunuz var.",
          },
          { who: "pt", text: "Evet, hatırlıyorum." },
          { who: "ai", text: "Gelebilecek misiniz?" },
          { who: "pt", text: "Geleceğim." },
          {
            who: "ai",
            text: "Teşekkür ederim, not aldım. Yarın görüşmek üzere.",
          },
        ],
        outcome: {
          area: "Giden aramalar",
          meta: "Randevu hatırlatma · 1/3 deneme",
          when: "Per 10.30 · Dr. Burak Demir",
          status: "Hasta geleceğini bildirdi",
          tone: "ok",
          action: "Bağlandı",
        },
      },
    ],
  },
  call: {
    label: "Örnek bir görüşme",
    title: "Bir aramayı baştan sona izleyin.",
    lead: "Hastam AI’ın hastayla nasıl konuştuğunu ve randevu talebini kliniğinizin paneline nasıl kaydettiğini izleyin.",
    demo: {
      heading: "Hastam bir erteleme aramasını nasıl karşılar",
      description:
        "Örnek bir aramada hasta kliniği arar. Hastam aramayı açar ve görüşmenin kaydedildiğini söyler. Hasta yarınki randevusuna gelemeyeceğini söyler. Hastam randevuyu bulur ve aynı hekimde perşembe için üç boş saat sunar. Hasta 14.30’u seçer. Eski randevu iptal edilir. Yeni saat kliniğin onayına gider. Klinik onaylayınca hasta aranır.",
      stageLabel: "Hastam · Örnek arama",
      replay: "Görüşmeyi oynat",
      pause: "Görüşmeyi duraklat",
      agentName: "Yapay zeka",
      callerPhone: "••• 48 21",
      lines: [
        "Akademi Polikliniği, buyurun. Görüşmemiz kayıt altına alınmaktadır. Size nasıl yardımcı olabilirim?",
        "Yarınki randevuma gelemeyeceğim. Perşembeye alabilir miyiz?",
        "Dr. Mehmet Kaya perşembe 10.00, 14.30 ve 16.00’da uygun. Hangisini istersiniz?",
        "14.30 lütfen.",
        "Perşembe 14.30, Dr. Mehmet Kaya ile. Talebinizi böyle ileteyim mi?",
        "Evet, lütfen.",
        "Yarınki randevunuzu iptal ettim. Perşembe 14.30 için talebinizi aldım, onaylanınca sizi arayacağım.",
        "Tamam, teşekkürler.",
        "Rica ederim, iyi günler.",
      ],
      complaint: {
        title: "Arama nedeni",
        listening: "Dinleniyor",
        noted: "Not alındı",
        before: "Hasta ne istediğini kendi cümlesiyle söyler.",
        after: "“Yarınki randevuma gelemeyeceğim.”",
      },
      steps: [
        { title: "Mevcut randevu", detail: "Çar 09.30 · Dr. M. Kaya" },
        { title: "Uygun saatler" },
        {
          title: "Erteleme talebi",
          detail: "Per 14.30 · Dr. M. Kaya",
          pending: "Hastanın yanıtı bekleniyor",
        },
      ],
      slots: ["10.00", "14.30", "16.00"],
      chosen: "14.30",
      receipt: {
        label: "Talep",
        when: "Per 14.30",
        status: "Onay bekliyor",
        rows: [
          { label: "Hekim", value: "Dr. Mehmet Kaya" },
          { label: "Poliklinik", value: "Kardiyoloji" },
          { label: "Önceki saat", value: "Çar 09.30" },
        ],
        id: "R-3105",
        note: "Onaylanınca hasta aranır",
      },
      phone: { clinic: "Akademi Polikliniği", line: "Klinik hattı" },
    },
    proof: [
      {
        value: "Randevu kaydı",
        caption: "Hastanın seçtiği gün, saat ve hekim bilgisi kaydedilir.",
      },
      {
        value: "Yeniden kontrol",
        caption: "saate, talep yazılmadan hemen önce bir kez daha bakılır",
      },
      {
        value: "Hekim veya klinik onayı",
        caption: "Randevu, hekim veya kliniğin onayıyla kesinleşir.",
      },
    ],
  },
  heard: {
    label: "Nasıl çalışır",
    title: "Bir resepsiyon gibi konuşur. Takvime bakar, not alır, geri arar.",
    lead: "Tuşlu menü yoktur. Hasta derdini kendi cümleleriyle anlatır. Asistan kısa konuşur ve her seferinde tek şey sorar.",
    noteTitle: "Nasıl okunur",
    note: "Solda hastanın söylediği, sağda Hastam’ın yaptığı.",
    sayLabel: "Hasta ne der",
    doLabel: "Hastam ne yapar",
    rows: [
      {
        say: "“Muayene için randevu almak istiyorum.”",
        title: "Randevu talebi alır.",
        description:
          "Hekimin takviminde o an boş olan bir saate yazar. Talep, kliniğiniz onaylayınca randevu olur.",
      },
      {
        say: "“Yarınki randevuma gelemeyeceğim.”",
        title: "İptal eder, erteler.",
        description:
          "Randevuyu aynı hekimde başka bir saate taşır. Yeni saat yine onayınıza gelir.",
      },
      {
        say: "“İki gündür kulağım ağrıyor.”",
        title: "Şikayeti bölüme yönlendirir.",
        description:
          "Hasta bölüm adını bilmek zorunda değildir. Şikayetini söyler, asistan doğru bölümü ve hekimi bulur.",
      },
      {
        say: "“Tahlil sonucumu soracaktım.”",
        title: "Mesaj alır.",
        description:
          "Yanıtlayamadığını not eder, ekibiniz panelde görür. Hekim yanıtını yazıp onaylar. Asistan hastayı arar ve o yanıtı okur.",
      },
      {
        say: "“Göğsümde bir baskı var.”",
        title: "Önce 112 der.",
        description:
          "Acil bir belirti duyduğunda ilk söylediği 112’dir. Ekibiniz panelden canlı görüşmeyi devralabilir, asistan susar.",
      },
      {
        say: "“Daha erken bir saat boşalırsa arar mısınız?”",
        title: "Hastayı kendisi arar.",
        description:
          "Onayı bildirir, randevuyu hatırlatır, boşalan saati teklif eder. Muayeneden sonra hatır sorar.",
      },
    ],
  },
  approval: {
    label: "Karar sizde",
    title: "Asistan konuşur, kararı siz verirsiniz.",
    lead: "Talep, kliniğiniz onaylayınca randevu olur. Onaydan sonra Hastam hastayı arar ve randevuyu teyit eder.",
    noteTitle: "Kendiniz deneyin",
    note: "Örnek talebi onaylayın ya da reddedin. Hastam’ın ne yaptığını görün.",
    steps: [
      {
        title: "Talep takvime düşer.",
        description:
          "Asistan uygun saati bulur ve bir randevu talebi oluşturur. Siz onaylayana kadar randevu kesinleşmez.",
      },
      {
        title: "Onayı siz verirsiniz.",
        description:
          "Talebi takvimde onaylar ya da reddedersiniz. Karar kliniğinizde kalır.",
      },
      {
        title: "Hastam hastayı arar.",
        description:
          "Onaylarsanız hastayı arar ve randevuyu teyit eder. Reddederseniz hemen arar ve başka bir saat önerir.",
      },
    ],
    mock: {
      label: "Onay ekranı",
      screenLabel: "Kliniğinizin ekranı",
      phoneLabel: "Hastanın telefonu",
      calendarTitle: "Takvim",
      calendarMeta: "Dr. Zeynep Arslan · KBB · Çarşamba",
      booked: [
        { time: "10.30", name: "Deniz Acar", kind: "Muayene" },
        { time: "11.00", name: "Elif Kurt", kind: "Kontrol" },
      ],
      lunch: { time: "12.00", label: "Öğle arası" },
      request: { time: "11.30", name: "Ayşe Yılmaz", meta: "Telefonla alındı" },
      status: {
        pending: "Onay bekliyor",
        approved: "Onaylandı",
        declined: "Reddedildi",
      },
      approve: "Onayla",
      decline: "Reddet",
      undo: "Geri al",
      clinic: "Akademi Polikliniği",
      clinicInitials: "AP",
      call: {
        pending: {
          chip: "Arama yok",
          text: "Hasta henüz aranmadı. Önce sizin kararınız beklenir.",
        },
        approved: {
          chip: "Onay araması",
          said: "“Çarşamba 11.30 için randevu talebiniz onaylandı.”",
          result: "Hasta bilgilendirildi",
        },
        declined: {
          chip: "Hemen aranır",
          text: "Asistan hastayı hemen arar ve başka bir saat önerir.",
          result: "Bu arama, arama saatleri dışında da çalabilir.",
        },
      },
    },
  },
  outbound: {
    label: "Hastayı arar",
    title: "Hastam hastanızı da arar.",
    lead: "Onay, hatırlatma, boşalan saat, kontrol ve geri arama. Hasta açmazsa asistan aralıklarla yeniden dener.",
    noteTitle: "Hastam da arar",
    note: "Saatini ve sıklığını siz seçersiniz.",
    rows: [
      {
        title: "Randevu onayı",
        description:
          "Siz talebi onaylayınca hastayı arar ve randevuyu teyit eder.",
      },
      {
        title: "Hatırlatma",
        description:
          "Hasta randevudan önce aranır. Teyit eder, erteler ya da iptal eder.",
      },
      {
        title: "Boşalan saat teklifi",
        description:
          "Boşalan saat, bekleyen hastalara tek tek teklif edilir. Sıra, listeye en önce girenden başlar. Her hasta bu teklif için bir kez aranır.",
      },
      {
        title: "Kontrol araması",
        description:
          "Muayeneden sonra hastayı arar ve nasıl olduğunu sorar. Özet panele düşer.",
      },
      {
        title: "Geri arama",
        description:
          "Hekim yanıtını yazıp onaylar. Asistan hastayı arar ve o yanıtı okur.",
      },
    ],
    facts: [
      {
        title: "Rutin aramayı üç kez dener.",
        description:
          "Rutin aramada ilk deneme hemen yapılır. Hasta açmazsa 10 dakika sonra, sonra 4 saat sonra yeniden dener.",
      },
      {
        title: "Hatırlatmalar sizin saatlerinizde yapılır.",
        description:
          "Siz değiştirmezseniz 09.00 ile 19.00 arası. Saat dışında kalan arama iptal olmaz, ertelenir.",
      },
      {
        title: "Günde 2, haftada 5 arama.",
        description:
          "Rutin aramaların hasta başına varsayılan sınırıdır. İstemeyen hasta için hatırlatma kapatılır.",
      },
    ],
    mock: {
      ladder: {
        label: "Deneme sırası",
        attempts: [
          { label: "1. deneme", time: "14.00", result: "Yanıt yok", tone: "info" },
          { label: "2. deneme", time: "14.10", result: "Yanıt yok", tone: "info" },
          { label: "3. deneme", time: "18.10", result: "Bağlandı", tone: "ok" },
        ],
        gaps: ["+10 dk", "+4 sa"],
      },
      hours: {
        label: "Arama saatleri",
        window: "09.00–19.00",
        ticks: ["00", "06", "12", "18", "24"],
        due: "Sıra geldi · 20.40",
        deferred: "Ertelendi",
        next: "Yarın 09.00",
      },
      caps: {
        label: "Arama sınırı",
        setting: "Varsayılan",
        day: "Gün",
        week: "Hafta",
      },
    },
  },
  rules: {
    label: "Kurallar ve güvenlik",
    title: "Kuralları siz koyarsınız. Yapay zeka dışına çıkamaz.",
    lead: "Arama saatini, hekimin yaş sınırını ve kimin neyi göreceğini siz seçersiniz. Hasta ne derse desin yapay zeka bu kuralları aşamaz.",
    noteTitle: "Altı kural",
    note: "Her kutu, üründe çalışan bir kuralı anlatır.",
    items: [
      {
        title: "Teşhis koymaz, tıbbi tavsiye vermez.",
        description:
          "Şikayeti doğru bölüme yönlendirir. Reçete yazmaz ya da yenilemez.",
      },
      {
        title: "Acil durumda önce 112 der.",
        description:
          "Çağrı panelde acil olarak işaretlenir. Yetkili kişi görüşmeyi dinler ya da devralır.",
      },
      {
        title: "Kayıt bildirimi selamlamada söylenir.",
        description:
          "Asistan görüşmenin kaydedildiğini selamlamada söyler. Kayıtları yalnızca yetki verdiğiniz kişiler dinler.",
      },
      {
        title: "Hekimin yaş sınırına önce bakılır.",
        description:
          "Bu sınırı yapay zeka değil, randevuyu yazan sistem uygular. Arayan kişi ısrar etse de sonuç değişmez.",
      },
      {
        title: "Kimlik sorulmadan ayrıntı verilmez.",
        description:
          "Açarsanız asistan TC kimlik numarasını sorar. Numara doğrulanmadan randevu ayrıntısı söylenmez.",
      },
      {
        title: "Kimin neyi göreceğine siz karar verirsiniz.",
        description:
          "Ön büro randevuları ve çağrıları yönetir, klinik kayıtlara erişmez. Yetkileri siz düzenlersiniz.",
      },
    ],
  },
  parent: {
    label: "GBO Vision",
    title: "Hastam, bir GBO Vision şirketidir.",
    lead: "Ürünün kendi sitesi hastam.ai’dir. Daha çok örnek çağrıyı ve panel ekranlarını orada bulursunuz.",
    linkLabel: "hastam.ai sitesine gidin",
    externalHint: "başka bir site",
  },
};

export default hastamPage;
