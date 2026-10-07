---
title: "Türkçe için büyük dil modeli nasıl seçilir? Şirketler için 2026 rehberi"
seoTitle: "Türkçe için büyük dil modeli (LLM) seçimi | GBO Vision"
description: "Türkçe için doğru büyük dil modelini kendi verinizle yapacağınız test belirler. Test sonuçlarını, BİLGE ve Kumru’yu, maliyeti ve veri konumunu ele alıyoruz."
slug: "turkce-icin-yapay-zeka-modeli-secimi"
publishedAt: 2026-08-26
updatedAt: 2026-10-07
category: "Teknoloji"
tags: ["Türkçe büyük dil modeli", "LLM", "yerli yapay zeka modeli", "BİLGE", "Kumru", "model seçimi"]
keyword: "türkçe büyük dil modeli"
relatedProduct: null
ogImage: "/og/blog-turkce-icin-yapay-zeka-modeli-secimi.png"
summary:
  - "Türkçe için her işe uyan tek bir “en iyi model” yok; doğru modeli, kendi işinizde ve kendi verinizle yaptığınız test belirler."
  - "Türkçe için ince ayar yapılmış modeller, Cetvel testinde genellikle çok dilli ya da genel amaçlı modellerin gerisinde kaldı."
  - "Türkçe metin birçok modelde İngilizcesinden daha çok token’a bölünür; teklifleri token fiyatıyla değil, görev başına maliyetle karşılaştırın."
  - "BİLGE, 7 Ekim 2026 itibarıyla genel kullanıma açık değil; Kumru’nun 2B modeli ise Apache 2.0 lisansıyla indirilebiliyor."
  - "Kişisel veriyi yurt dışındaki bir model sağlayıcısına göndermek yurt dışına veri aktarımı sayılır; bankalarda müşteri verisi işleyen sistemler ayrıca yurt içinde kalmalı."
faq:
  - question: "Yerli dil modeli mi, küresel model mi kullanmalıyız?"
    answer: "Bu karar iki soruya bağlı: veriniz nerede işlenmeli ve model sizin işinizde ne kadar başarılı? Veriyi kendi sunucunuzda tutmanız ya da modele ince ayar yapmanız gerekiyorsa yerli veya açık ağırlıklı bir model öne çıkar. Böyle bir şart yoksa küresel modeller de güçlü bir seçenek. Her iki durumda da adayları, kendi belgelerinizden ve çağrılarınızdan oluşturduğunuz bir test setinde karşılaştırın."
  - question: "Türkçe için en iyi büyük dil modeli hangisi?"
    answer: "Her işe uyan tek bir en iyi model yok. Yayımlanan test sonuçları, belirli bir tarihte belirli modellerle ve belirli bir yöntemle yapılmış ölçümleri yansıtır. Sizin işiniz için en iyi modeli, 50–200 örnekten oluşan kendi test setinizde doğruluğu, Türkçe akıcılığı, görev başına maliyeti ve gecikmeyi ölçerek bulabilirsiniz."
  - question: "Yurt dışındaki bir dil modelini kullanmak yurt dışına veri aktarımı sayılır mı?"
    answer: "Model sağlayıcısı yurt dışındaysa ve istemlerinizde kişisel veri varsa, evet. KVKK’nin 9. maddesine göre bu aktarım için yeterlilik kararı, standart sözleşme gibi uygun bir güvence ya da sınırlı istisnalardan biri gerekir. Kişisel Verileri Koruma Kurulu henüz hiçbir ülke için yeterlilik kararı vermediğinden, sürekli çalışan bir entegrasyonda izlenecek yol genellikle standart sözleşmedir. Sözleşme, Kurulun ilan ettiği metin değiştirilmeden sağlayıcıyla birlikte imzalanır; bu nedenle sağlayıcının buna hazır olup olmadığını baştan sorun. Veriyi yurt içinde işleyen bir altyapı ya da kendi sunucunuzda çalışan bir model aktarımı gereksiz kılabilir; ancak yurt dışındaki bir sağlayıcı veriye uzaktan erişebiliyorsa bu da aktarım sayılabilir."
  - question: "TÜBİTAK’ın BİLGE modelini şirketimizde kullanabilir miyiz?"
    answer: "Şimdilik hayır. BİLGE, 7 Ekim 2026 itibarıyla genel kullanıma açık değil; resmi site yalnızca bilgi, iş birliği ve pilot proje talepleri için bir iletişim kanalı sunuyor. Lisans, API ve fiyat koşulları da yayımlanmadı. Sanayi ve Teknoloji Bakanı Temmuz 2026’da modelin yakında geliştiricilere açılacağını söyledi. Erişim koşullarını TÜBİTAK’ın ve Bakanlığın resmi kanallarından takip edebilirsiniz."
  - question: "Türkçe metin işlemek İngilizceden daha mı pahalı?"
    answer: "Çoğu zaman evet, ancak fark modele göre değişir. Petrov ve arkadaşlarının 2023 tarihli çalışmasına göre GPT-4’ün o dönem kullandığı tokenizer, aynı içeriğin Türkçesini İngilizcesinin 1,91 katı kadar token’a bölüyordu. Yeni modellerde bu oran farklı olabilir. Bu nedenle oranı kendi metinlerinizle ölçün ve teklifleri görev başına maliyetle karşılaştırın."
  - question: "Dil modelini ne sıklıkla yeniden test etmeliyiz?"
    answer: "Üç ayda bir ve her önemli model güncellemesinde test etmenizi öneririz. Modeller ve fiyatlar hızla değişiyor, yayımlanan sıralamalar da çabuk eskiyor. Test setinizi sabit tutarsanız sonuçları dönemler arasında karşılaştırabilirsiniz. Uygulamanızı tek bir sağlayıcıya bağlamazsanız daha iyi sonuç veren modele geçmek de kolaylaşır."
sources:
  - title: "Cetvel: A Unified Benchmark for Evaluating Language Understanding, Generation and Cultural Capacity of LLMs for Turkish"
    publisher: "ACL Anthology, EACL 2026 (Er, Kesen, Şahin, Erdem)"
    url: "https://aclanthology.org/2026.eacl-long.46"
    date: "2026-03"
  - title: "TurkishMMLU: Measuring Massive Multitask Language Understanding in Turkish"
    publisher: "arXiv, Findings of EMNLP 2024"
    url: "https://arxiv.org/abs/2407.12402"
    date: "2024-10-03"
  - title: "Setting Standards in Turkish NLP: TR-MMLU for Large Language Model Evaluation"
    publisher: "arXiv"
    url: "https://arxiv.org/abs/2501.00593"
    date: "2025-01-04"
  - title: "Language Model Tokenizers Introduce Unfairness Between Languages"
    publisher: "arXiv, NeurIPS 2023 (Petrov, La Malfa, Torr, Bibi)"
    url: "https://arxiv.org/abs/2305.15425"
    date: "2023-10-20"
  - title: "Tokenization Standards for Linguistic Integrity: Turkish as a Benchmark"
    publisher: "arXiv"
    url: "https://arxiv.org/abs/2502.07057"
    date: "2025-02-10"
  - title: "FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech"
    publisher: "arXiv (Conneau ve diğerleri)"
    url: "https://arxiv.org/abs/2205.12446"
    date: "2022-05-25"
  - title: "google/fleurs veri seti"
    publisher: "Google, Hugging Face"
    url: "https://huggingface.co/datasets/google/fleurs"
  - title: "BİLGE, Türkiye Yapay Zeka Zirvesinde tanıtıldı"
    publisher: "TÜBİTAK BİLGEM"
    url: "https://bilgem.tubitak.gov.tr/bilge-turkiye-yapay-zeka-zirvesinde-tanitildi/"
    date: "2026-06-13"
  - title: "BİLGE resmi sitesi"
    publisher: "TÜBİTAK BİLGEM"
    url: "https://bilge.gov.tr/"
  - title: "Yerli dil modeli BİLGE kullanıma açılıyor"
    publisher: "Demirören Haber Ajansı"
    url: "https://www.dha.com.tr/gundem/yerli-dil-modeli-bilge-kullanima-aciliyor-2918051"
    date: "2026-07-29"
  - title: "Kumru-2B model kartı"
    publisher: "VNGRS, Hugging Face"
    url: "https://huggingface.co/vngrs/Kumru-2B"
    date: "2025-09-26"
  - title: "VNGRS’den 7,4 milyar parametreli Türkçe LLM: Kumru"
    publisher: "Webrazzi"
    url: "https://webrazzi.com/2025/10/10/vngrs-den-7-4-milyar-parametreli-turkce-llm-kumru/"
    date: "2025-10-10"
  - title: "Cumhurbaşkanlığı Genelgesi 2026/9, Türkiye Yapay Zekâ Eylem Planı (2026–2030)"
    publisher: "T.C. Resmî Gazete, sayı 33344"
    url: "https://www.resmigazete.gov.tr/eskiler/2026/08/20260818-8.pdf"
    date: "2026-08-18"
  - title: "Türkiye’nin 2026–2030 Yapay Zeka Eylem Planı yürürlüğe girdi"
    publisher: "Webrazzi"
    url: "https://webrazzi.com/2026/08/18/turkiye-nin-2026-2030-yapay-zek-eylem-plani-yururluge-girdi/"
    date: "2026-08-18"
  - title: "Türkçe Büyük Dil Temel Modeli Sektörel Uyarlama Projesi Çağrısı açıldı"
    publisher: "Anadolu Ajansı"
    url: "https://www.aa.com.tr/tr/bilim-teknoloji/50-milyon-liraya-kadar-hibe-verilecek-turkce-buyuk-dil-temel-modeli-sektorel-uyarlama-projesi-cagrisi-acildi/3599998"
    date: "2025-06-16"
  - title: "6698 sayılı Kişisel Verilerin Korunması Kanunu"
    publisher: "Mevzuat Bilgi Sistemi"
    url: "https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf"
  - title: "Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik"
    publisher: "T.C. Resmî Gazete, sayı 32598"
    url: "https://www.resmigazete.gov.tr/eskiler/2024/07/20240710-2.htm"
    date: "2024-07-10"
  - title: "Yurtdışına aktarım"
    publisher: "Kişisel Verileri Koruma Kurumu"
    url: "https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim"
  - title: "Bankaların Bilgi Sistemleri ve Elektronik Bankacılık Hizmetleri Hakkında Yönetmelik"
    publisher: "BDDK, T.C. Resmî Gazete, sayı 31069"
    url: "https://www.resmigazete.gov.tr/eskiler/2020/03/20200315-10.htm"
    date: "2020-03-15"
  - title: "5411 sayılı Bankacılık Kanunu"
    publisher: "Mevzuat Bilgi Sistemi"
    url: "https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5411.pdf"
  - title: "Uluslararası Banka Hesap Numarası Hakkında Tebliğ (Sayı: 2008/6)’de Değişiklik Yapılmasına Dair Tebliğ (Sayı: 2021/5)"
    publisher: "TCMB, T.C. Resmî Gazete, sayı 31559"
    url: "https://www.resmigazete.gov.tr/eskiler/2021/08/20210805-17.htm"
    date: "2021-08-05"
---

Türkçe hizmet veren bir müşteri asistanı, belge özetleme aracı ya da sesli asistan geliştiren her ekip işe aynı soruyla başlar: hangi büyük dil modelini (LLM) kullanacağız? Yanıt, yayımlanan sıralamalardan çok sizin işinize ve verinizin nerede işlenmesi gerektiğine bağlı. Bu rehberde model sağlayıcılarını sıralamıyoruz; Türkçe için büyük dil modelleri hakkında yayımlanan karşılaştırmalı test (benchmark) sonuçlarının neyi gösterdiğini, yerli modellerin bugünkü durumunu ve kendi verinizle uygulayabileceğiniz bir test yöntemini anlatıyoruz.

## Türkçe için herkese uyan tek bir model yok

Türkçe için her işe uyan tek bir “en iyi model” bulunmuyor. Sözleşme özetlemede başarılı bir model, müşteri e-postalarında yapay bir Türkçe kullanabilir; bir başka modelde durum tam tersi olabilir. Yayımlanan sıralamalar da yalnızca belirli bir tarihte, belirli modellerle ve belirli bir test yöntemiyle elde edilen sonucu yansıtır.

Bu nedenle asıl soru “Türkçede en iyi model hangisi?” değil, “Bizim işimizde ve bizim verimizle hangisi daha iyi sonuç veriyor?” sorusudur. Bu sorunun yanıtını beş ölçüt belirler: doğruluk ve Türkçe akıcılık, sesli ürünlerde konuşma kalitesi, görev başına maliyet, gecikme ve verinin işlendiği yer.

## Türkçe karşılaştırmalı testler ne gösteriyor?

Karşılaştırmalı testler, modelleri aynı görev ve sorularla sınayıp puanlarını karşılaştırır. Aşağıdaki tablo, 2024’ten bu yana Türkçe için yayımlanan üç kapsamlı çalışmayı özetliyor:

| Test | Ne ölçüyor? | Kapsam | Dikkat edilecek nokta |
|---|---|---|---|
| Cetvel (EACL 2026) | Dil bilgisi düzeltme, çeviri, özetleme, soru yanıtlama ve kültürel bilgi | 23 görev, 33 açık ağırlıklı model | Ticari modeller yalnızca küçük bir alt kümede ölçüldü |
| TurkishMMLU (2024) | Lise müfredatından bilgi ve akıl yürütme | 10.032 çoktan seçmeli soru, 9 ders | Modeller 900 soruluk bir alt kümede ölçüldü; sonuçlar 2024 modellerine ait |
| TR-MMLU (2025) | Türk eğitim sisteminden bilgi soruları | 6.200 çoktan seçmeli soru, 39 model | Sıralama, yayımlandığı tarihteki modelleri yansıtıyor |

### Cetvel’de Türkçeye özel modellerin sonuçları

EACL 2026’da yayımlanan [Cetvel](https://aclanthology.org/2026.eacl-long.46) çalışması, yedi kategorideki 23 Türkçe görevde en fazla 70 milyar parametreli 33 açık ağırlıklı modeli, yani indirilip kendi sunucunuzda çalıştırılabilen modelleri karşılaştırıyor.

Çalışmanın en dikkat çekici bulgusu şu: Türkçe için ince ayar yapılmış modeller, Llama 3 ve Mistral gibi çok dilli ya da genel amaçlı modellerin genellikle gerisinde kaldı ([Cetvel, EACL 2026](https://aclanthology.org/2026.eacl-long.46)). En yüksek ortalama puanı Llama-3.3-70B-Instruct aldı. Türkçe verilerle sıfırdan eğitilen modeller de geride kaldı; Trendyol-LLM-7B ise temel aldığı Mistral-7B’nin bile gerisine düştü. Türkçeye uyarlanan modeller çeviride de zayıf kaldı. Yazarlar bunu, modellerin uyarlama sırasında İngilizce yeteneklerini kısmen yitirmesine bağlıyor ([Cetvel](https://aclanthology.org/2026.eacl-long.46.pdf)); literatürde bu olgu “katastrofik unutma” (catastrophic forgetting) olarak geçiyor.

Yine de sonuçlar tek yönlü değil. Türkçeye uyarlanmış Cere-Llama-3-8B, dil bilgisi düzeltmede ve Türk tarihi ile İslam tarihine ilişkin metinlerden yanıt bulmada 70 milyar parametreli modeli bile geçti, ancak bilgi yoğun görevlerde zayıf kaldı. Bu bulgu, dar bir görevde uzmanlaşmış küçük bir modelin büyük ve genel bir modelden daha başarılı olabileceğini gösteriyor. Cetvel’e göre modeller arasındaki farkı en net ortaya koyan görevler de dil bilgisi düzeltme ve verilen metinden yanıt bulma.

### TurkishMMLU ve TR-MMLU

[TurkishMMLU](https://arxiv.org/abs/2407.12402), müfredat uzmanlarının yazdığı 10.032 soruyla dokuz lise dersinde bilgi ve akıl yürütmeyi ölçüyor. TurkishMMLU’nun 2024’te yayımlanan sonuçlarında en iyi sonucu %83,1 doğrulukla GPT-4o aldı; en iyi açık model olan Llama-3 70B-IT ise %67,3’te kaldı. [TR-MMLU](https://arxiv.org/abs/2501.00593) ise 6.200 soruyla 39 modeli test etti; Ocak 2025 tarihli tabloda GPT-4o %84,84, Llama 3.3 70B’nin 4 bitlik sıkıştırılmış sürümü %79,42 doğruluk elde etti.

Bu sonuçlar, çalışmaların yapıldığı tarihteki modellere ait. Üstelik çoktan seçmeli sorular bilgiyi ve akıl yürütmeyi ölçer; bir çağrı özetinin ya da müşteri e-postasının kalitesi hakkında fikir vermez.

### Test sonuçlarını okurken nelere dikkat etmelisiniz?

- **Örnek sayısı ve test yöntemi.** Cetvel’de ticari modeller görev başına yalnızca 100 örnekle ve farklı bir yöntemle ölçüldü; bu koşullarda açık ağırlıklı Llama-3.3-70B-Instruct, test edilen ticari modellerin önüne geçti. TurkishMMLU’da ise GPT-4o açık modellerin belirgin biçimde önündeydi. Farklı görevler, yöntemler ve model sürümleri farklı sıralamalar üretir.
- **Test koşulları.** Cetvel, modele örnek göstermeden ölçüm yapıyor ve metin üretme görevlerinde yanıtları 64 token ile sınırlıyor. Kendi uygulamanızda modele örnekler ve ayrıntılı yönergeler vereceğiniz için sonuçlar farklı çıkabilir.
- **Ölçümü yapan taraf.** Geliştiricinin kendi ölçümü, bağımsız bir değerlendirmenin yerini tutmaz. Örneğin VNGRS, Kumru’nun Cetvel’de çok daha büyük modelleri geçtiğini açıklıyor ([Kumru model kartı](https://huggingface.co/vngrs/Kumru-2B)); ancak Kumru, Cetvel makalesinde değerlendirilen modeller arasında yer almıyor.

## Yerli yapay zeka modelleri BİLGE ve Kumru bugün ne durumda?

### BİLGE

TÜBİTAK BİLGEM’in geliştirdiği Türkçe odaklı büyük dil modeli BİLGE, 13 Haziran 2026’da İstanbul’da düzenlenen Türkiye Yapay Zeka Zirvesinde [tanıtıldı](https://bilgem.tubitak.gov.tr/bilge-turkiye-yapay-zeka-zirvesinde-tanitildi/). [Resmi sitesine göre](https://bilge.gov.tr/) BİLGE, 1 milyar ile 122 milyar parametre arasında değişen bir model ailesi. Ailenin 1B ve 9B modelleri sıfırdan eğitildi; 27B modeli ise güçlü açık ağırlıklı modellerin Türkçe verilerle eğitimine devam edilerek geliştirildi. En büyük üye olan 122B modelinin eğitimi sürüyor. Sanayi ve Teknoloji Bakanı Mehmet Fatih Kacır ise 29 Temmuz 2026’da “37 milyar parametreyle geliştirilmiş” BİLGE’nin yakında geliştiricilere açılacağını söyledi ([DHA](https://www.dha.com.tr/gundem/yerli-dil-modeli-bilge-kullanima-aciliyor-2918051)); resmi sitede bu büyüklükte bir model yer almıyor.

BİLGE, 7 Ekim 2026 itibarıyla genel kullanıma açık değil. Resmi site yalnızca bilgi, iş birliği ve pilot proje talepleri için bir iletişim kanalı sunuyor; lisans, API ya da fiyat koşulu yayımlanmadı. Sitedeki performans ve maliyet verileri BİLGEM’in kendi ölçümlerine dayanıyor; BİLGE’nin bağımsız bir Türkçe değerlendirmede ölçülmüş sonucuna henüz rastlamadık. Bugün için BİLGE’yi ürün planınızın temeline koymak yerine, gelişmeleri yakından izlemek ve gerekirse BİLGEM’le bir pilot proje görüşmesi yapmak daha gerçekçi.

### Kumru

VNGRS’nin geliştirdiği [Kumru-2B](https://huggingface.co/vngrs/Kumru-2B), Türkçe için sıfırdan eğitilmiş, 2 milyar parametreli açık ağırlıklı bir model. Apache 2.0 lisansıyla Hugging Face üzerinden indirilebiliyor ve 8.192 token’lık bir bağlam penceresi sunuyor. Model kartında Eylül 2025’ten bu yana bir güncelleme görünmüyor. Kumru’nun 7,4 milyar parametreli büyük sürümü ise indirilemiyor: [Webrazzi’nin haberine göre](https://webrazzi.com/2025/10/10/vngrs-den-7-4-milyar-parametreli-turkce-llm-kumru/) VNGRS bu modeli kumru.ai üzerinde demo olarak, kurumlara ise kendi sunucularına kurulacak biçimde sunuyor. Şirkete göre bu model, 16 GB belleği olan tek bir GPU’da çalışabiliyor.

### Yerli ya da açık ağırlıklı modeli ne zaman tercih etmelisiniz?

Yerli ya da açık ağırlıklı bir model özellikle üç durumda öne çıkar:

- **Kurum içi ya da yurt içi kurulum gerekiyorsa.** Veri kurum dışına çıkamıyorsa modeli kendi sunucunuzda çalıştırmanız gerekir. Bankacılıkta olduğu gibi düzenlemeler sistemlerin yurt içinde kalmasını şart koşuyorsa, yurt içinde size tahsis edilmiş bir bulut ortamı da seçenekler arasına girer.
- **Veri egemenliği öncelikliyse.** Modelin ve verinin hangi ülkede, kimin denetiminde bulunduğu sizin için belirleyiciyse, kendi altyapınızda çalışan açık ağırlıklı bir model bu denetimi size bırakır.
- **İnce ayar gerekiyorsa.** Kendi terimlerinizi ve belge biçimlerinizi modele öğretmek istiyorsanız, ağırlıklarına erişebildiğiniz bir model size daha geniş hareket alanı sağlar. Ancak Cetvel’in gösterdiği gibi ince ayar, dar bir görevde başarıyı artırırken modelin genel yeteneklerini zayıflatabilir.

Bu şartlar yoksa küresel bir modeli API üzerinden kullanmak genellikle en hızlı başlangıçtır. Açık ağırlıklı modelde ise sunucu, GPU, güvenlik ve bakım yükü sizin üzerinizdedir.

### Kamu desteği

[Resmî Gazete’de 18 Ağustos 2026’da yayımlanan](https://www.resmigazete.gov.tr/eskiler/2026/08/20260818-8.pdf) Türkiye Yapay Zeka Eylem Planı (2026–2030), [Webrazzi’nin aktardığına göre](https://webrazzi.com/2026/08/18/turkiye-nin-2026-2030-yapay-zek-eylem-plani-yururluge-girdi/) Türk Devletleri Teşkilatı üyeleriyle ortak bir Türk dilleri büyük dil modelini 2027 sonuna kadar kullanıma almayı hedefliyor. Sanayi ve Teknoloji Bakanlığı da [Haziran 2025’te açtığı çağrıyla](https://www.aa.com.tr/tr/bilim-teknoloji/50-milyon-liraya-kadar-hibe-verilecek-turkce-buyuk-dil-temel-modeli-sektorel-uyarlama-projesi-cagrisi-acildi/3599998), büyük dil modellerini sektör ihtiyaçlarına uyarlayan projelere 50 milyon liraya kadar hibe öngördü; yeni çağrıları Bakanlığın duyurularından takip edebilirsiniz.

## Token fiyatına değil, görev başına maliyete bakın

### Türkçe metin neden daha çok token’a bölünür?

Dil modelleri metni token adı verilen parçalara bölerek işler; sağlayıcılar da ücreti bu parçaların sayısına göre belirler. Bölme işini yapan bileşene tokenizer denir. Türkçe sondan eklemeli bir dil olduğu için “sözleşmelerimizdeki” gibi tek bir kelime, İngilizcede ancak birkaç kelimeyle anlatılabilen bir anlam taşır. Türkçe gözetilmeden tasarlanmış bir tokenizer böyle bir kelimeyi daha çok parçaya böler.

NeurIPS 2023’te yayımlanan [Petrov ve arkadaşlarının çalışmasına](https://arxiv.org/abs/2305.15425) göre aynı metnin farklı dillerdeki karşılıkları arasında token sayısı 15 katına kadar farklı olabiliyor; bu fark maliyeti ve gecikmeyi artırıyor, modele verilebilecek bağlamı da daraltıyor. Çalışmanın ek tablolarına göre GPT-4’ün 2023’te kullandığı cl100k_base tokenizer’ı, Türkçe bir metni İngilizce karşılığının 1,91 katı kadar token’a bölüyordu; ilk LLaMA sürümünde bu oran 2,09’du.

Bu oranlar 2023’teki tokenizer sürümlerine ait; yeni modellerde durum farklı olabilir. Şubat 2025’te yayımlanan [bir çalışma](https://arxiv.org/abs/2502.07057), dört modelin Türkçe metni nasıl böldüğünü karşılaştırdı. Bu sınırlı karşılaştırmada parametre sayısı yüksek modeller Türkçeyi her zaman daha iyi bölmedi. Token’ların ne kadarının geçerli Türkçe kelimelere denk geldiği, modellerin Türkçe MMLU puanlarıyla güçlü biçimde ilişkili çıktı; token’ların kök ve eklerle ne kadar örtüştüğü ise daha zayıf bir ilişki gösterdi. VNGRS de diğer açık ağırlıklı modellerin aynı metni Kumru’dan %38 ile %98 arasında daha fazla token’a böldüğünü belirtiyor. Bu, geliştiricinin kendi ölçümü olsa da tokenizer seçiminin Türkçe maliyeti ne ölçüde etkileyebileceğini gösteriyor.

### Görev başına maliyet ve gecikme nasıl ölçülür?

Teklifleri token başına fiyatla karşılaştırmak yanıltıcı olabilir. Token fiyatı düşük görünen bir model Türkçe metni daha çok parçaya bölüyorsa, aynı iş için daha fazla ödersiniz. Bunun yerine görev başına maliyeti şu adımlarla hesaplayın:

1. Gerçek işinizden örnekler seçin: bir sözleşme özeti, bir müşteri e-postası, bir çağrı dökümü.
2. Her aday modeli aynı istemle çalıştırın; girdi ve çıktı token sayılarını kaydedin.
3. Token sayılarını güncel fiyatlarla çarpıp örnek başına ortalama maliyeti hesaplayın. Kendi sunucunuzdaki model için GPU, enerji ve bakım giderini aylık iş hacmine bölün.
4. Gecikmeyi iki değerle ölçün: ilk kelimenin ne kadar sürede geldiği ve yanıtın ne kadar sürede tamamlandığı. Sesli asistanlarda ilki daha belirleyicidir, çünkü telefondaki kişi kısa bir sessizliği bile hemen fark eder.
5. Hataları düzeltmek için harcanan çalışan zamanını da maliyete ekleyin.

Böylece karşılaştırdığınız rakam, bir görevi kabul edilebilir kalitede tamamlamanın toplam maliyeti olur.

## Sesli ürünlerde konuşma tanıma ve ses sentezini de test edin

Sesli asistan, çağrı merkezi otomasyonu ya da toplantı dökümü gibi ürünlerde dil modelinin yanında iki bileşen daha çalışır: konuşmayı yazıya döken konuşma tanıma ve yanıtı seslendiren ses sentezi. Metin görevlerinde çok başarılı bir model bile, konuşma tanıma bileşeni bir IBAN’ı ya da tutarı yanlış yazıya dökerse doğru sonuç üretemez. Sesli asistanların hangi çağrıları iyi yönettiğini ve görüşmeyi ne zaman temsilciye aktarması gerektiğini [çağrı merkezinde yapay zeka asistanı rehberimizde](/blog/yapay-zeka-cagri-merkezi-asistani) ayrıca ele aldık.

### Sesli üründe neleri test etmelisiniz?

- **Rakamlar ve tutarlar.** “On iki bin dört yüz elli lira” doğru sayıya dönüşüyor mu? Ses sentezi “12.450 TL” yazısını doğal biçimde okuyor mu?
- **IBAN.** Türkiye’de IBAN [26 karakterden](https://www.resmigazete.gov.tr/eskiler/2021/08/20210805-17.htm) oluşuyor. Arayan kişi TR’den sonraki 24 karakteri tek tek okur; bu dizinin hatasız yazıya dökülmesi gerekir.
- **Özel adlar ve adresler.** Kişi, şirket ve sokak adları ile “Kadıköy, Caferağa Mahallesi” gibi ifadeler doğru yazıya dökülüyor mu?
- **Ağız farkları ve ortam sesi.** Farklı bölgelerden ve yaş gruplarından konuşmacılarla, telefon hattında ve gürültülü ortamda deneyin. Telefon hattındaki ses, stüdyo kaydından çok farklıdır.
- **Ses sentezi.** KDV, SGK gibi kısaltmalar ve tarihler doğru okunuyor mu, tonlama doğal mı?

Konuşma tanımanın genel kalitesini kelime hata oranıyla (WER) ölçün; tutar, tarih ve IBAN gibi kritik alanları ise ayrıca puanlayın.

### FLEURS ve kendi çağrı kayıtlarınız

Başlangıç için açık test setlerinden yararlanabilirsiniz. Google’ın 2022’de yayımladığı [FLEURS](https://arxiv.org/abs/2205.12446), 102 dilde, dil başına yaklaşık 12 saatlik konuşma içeriyor ve [Türkçe de bu diller arasında](https://huggingface.co/datasets/google/fleurs). Ancak FLEURS kayıtları, ana dili Türkçe olan konuşmacıların İngilizce Vikipedi’den Türkçeye çevrilmiş cümleleri okumasıyla oluşturuldu ve 16 kHz örnekleme hızıyla kaydedildi; telefon hattındaki ses ise 8 kHz’le iletilir. Okunan metin, telefon görüşmelerindeki doğal, kesintili ve gürültülü konuşmayı yansıtmaz; bu yüzden son kararı kendi çağrı ya da toplantı kayıtlarınızdan seçtiğiniz örneklerle verin. Kayıtları test için kullanmadan önce kişisel veriler açısından hukuk ekibinizin görüşünü alın.

## Veri nerede işlenecek? Üç kurulum seçeneği

Model seçimi, verinin nerede işleneceği kararından ayrı düşünülemez. Üç temel seçenek var:

- **Küresel API.** Modeli, sağlayıcının altyapısı üzerinden internetle kullanırsınız. En hızlı başlangıç yolu budur ve en yeni modellere hemen erişirsiniz; buna karşılık veri, sağlayıcının belirlediği yerde işlenir.
- **Seçtiğiniz bulut bölgesi.** Modeli bir bulut sağlayıcısının seçtiğiniz bölgesinde, çoğu zaman size ayrılmış bir ortamda çalıştırırsınız. Verinin hangi ülkede işleneceğini belirleyebilirsiniz, ancak her model her bölgede sunulmayabilir. Yurt içi bir bölge seçmek de tek başına yeterli olmayabilir: yurt dışındaki sağlayıcı ya da alt veri işleyenleri veriye uzaktan erişebiliyorsa bu da yurt dışına aktarım sayılabilir.
- **Kendi sunucunuzda açık ağırlıklı model.** Kumru-2B gibi indirilebilir bir modeli kendi veri merkezinizde ya da özel bulutunuzda çalıştırırsınız. Veri kurum dışına çıkmaz; GPU, güvenlik ve bakım ise sizin sorumluluğunuzdadır.

### Kişisel veri yurt dışındaki bir modele gidiyorsa

İstemlerinizde müşteri adı, telefon numarası ya da sağlık bilgisi gibi kişisel veriler varsa, modelin nerede çalıştığı aynı zamanda hukuki bir soruya dönüşür. Kişisel veriyi yurt dışındaki bir model sağlayıcısına iletmek ya da verinin ona erişilebilir olmasını sağlamak, [Temmuz 2024 tarihli yönetmeliğe](https://www.resmigazete.gov.tr/eskiler/2024/07/20240710-2.htm) göre yurt dışına veri aktarımıdır.

Kişisel Verilerin Korunması Kanununun (KVKK) 9. maddesine göre aktarım için önce aktarılacak ülke hakkında bir yeterlilik kararı aranır; karar yoksa standart sözleşme gibi uygun bir güvence gerekir. Ancak [Kişisel Verileri Koruma Kurulu](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim) şu ana kadar hiçbir ülke için yeterlilik kararı vermedi. Arızi aktarım istisnaları da düzenli bir veri akışını kapsamadığından, her gün çalışan bir model entegrasyonunda izlenecek yol genellikle standart sözleşmedir. Sözleşme, Kurulun ilan ettiği metin değiştirilmeden kullanılır ve model sağlayıcısıyla birlikte imzalanır; bu nedenle sağlayıcının KVKK standart sözleşmesini imzalamaya hazır olup olmadığını baştan sorun. İmzalanan sözleşme beş iş günü içinde Kuruma bildirilmelidir ([6698 sayılı Kanun](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf)).

Sağlık ve biyometrik veriler özel nitelikli kişisel veridir ve ancak kanunda sayılan durumlarda işlenebilir; hasta görüşmelerini işleyen bir klinik asistanında bu kuralı ayrıca değerlendirin.

### Bankalarda müşteri verisi yurt içinde kalmalı

Bankalar, müşteri verisi işleyen sistemlerini [BDDK kuralları](https://www.resmigazete.gov.tr/eskiler/2020/03/20200315-10.htm) gereği yurt içinde tutmak zorundadır; bulut ancak bankaya tahsis edilmiş özel bulut ya da izinli topluluk bulutu olarak kullanılabilir. [Bankacılık Kanununun](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5411.pdf) 73. maddesindeki sır saklama yükümlülüğü ise KVKK kapsamındaki açık rızadan ayrı bir yükümlülüktür; müşteri sırrının paylaşılması için Kanunun aradığı şartları uyum ekibinizle doğrulayın.

## Kendi test setinizi 50–200 örnekle kurun

Karşılaştırmalı test sonuçları aday listesini daraltmanıza yardımcı olur; asıl kararı ise kendi testiniz verir.

### Test setini kendi verinizden oluşturun

Test seti, ürününüzün gerçekte yapacağı işi temsil etmeli. Çoğu karar için 50–200 örnek iyi bir başlangıçtır: belirgin farklar az sayıda örnekte bile ortaya çıkar, birbirine yakın adayları ayırmak için ise örnek sayısını artırmanız gerekir. Örneğin doğruluğu %80 civarında ölçülen bir modelde hata payı (%95 güven düzeyinde) 50 örnekte yaklaşık ±11 puan, 200 örnekte yaklaşık ±5,5 puandır. Bu paydan küçük farklar tesadüften kaynaklanabilir; adayları her zaman aynı örneklerle karşılaştırın.

- Gerçek belgelerden, e-postalardan ve çağrı dökümlerinden örnek seçin; kişisel verileri maskeleyin ya da anonimleştirin.
- Kolay örneklerin yanına zor olanları da ekleyin: uzun ve devrik cümleler, yazım hataları, kısaltmalar, rakam yoğun metinler.
- Her örnek için beklenen yanıtı ya da puanlama kuralını önceden yazın.
- İşiniz dil bilgisi düzeltme ya da verilen metinden yanıt bulma içeriyorsa, Cetvel’in en ayırt edici bulduğu bu iki görevi de ekleyin.
- Sesli ürünlerde metin örneklerinin yanına gerçek ses kayıtlarını da ekleyin.

### Neyi, nasıl puanlayacaksınız?

| Ölçüt | Nasıl ölçülür? | Örnek soru |
|---|---|---|
| Görev doğruluğu | Beklenen yanıtla karşılaştırma | Vade tarihi doğru çıkarıldı mı? |
| Türkçe akıcılık | Ana dili Türkçe olan iki değerlendiricinin 1–5 arası puanı | Metin doğal Türkçe gibi okunuyor mu? |
| Görev başına maliyet | Token sayısı × güncel fiyat ya da sunucu gideri ÷ iş hacmi | Bir çağrı özeti kaça mal oluyor? |
| Gecikme | İlk kelimenin gelme ve yanıtın tamamlanma süresi | Arayan kişi ne kadar bekliyor? |
| Konuşma kalitesi | Kritik alanlardaki hata oranı | IBAN ve tutarlar doğru yazıya döküldü mü? |

Puanları tek bir tabloda toplayın ve ağırlıkları işinize göre belirleyin. Bir tahsilat görüşmesinde tutarın doğruluğu, bir pazarlama metninde ise akıcılık daha ağır basar. Akıcılığı yalnızca başka bir dil modeline puanlatmayın: [Cetvel’in yazarları](https://aclanthology.org/2026.eacl-long.46.pdf) da dil modelini hakem olarak kullanan değerlendirmelerin çok dilli ortamlarda güvenilir olmadığını gösteren çalışmalara dayanarak bu yöntemi kullanmadı.

### Üç ayda bir yeniden test edin, mimariyi modelden bağımsız tutun

Model sıralamaları çabuk eskiyor. Test setinizi sabit tutun ve üç ayda bir, ayrıca her önemli model güncellemesinde yeniden çalıştırın. Böylece kaliteyi, maliyeti ve gecikmeyi dönemler arasında karşılaştırabilirsiniz. Testin sonucuna göre model değiştirebilmeniz için de uygulamanızı tek bir modele bağlamamanız gerekir:

- Modele erişimi tek bir katmanda toplayın; model değiştiğinde yalnızca bu katmanın ayarı değişsin.
- İstemleri koddan ayrı tutun ve sürümlerini takip edin.
- Çıktıları JSON şeması gibi modelden bağımsız bir yapıda isteyin ve doğrulayın.
- Kritik iş akışları için ikinci bir modeli yedek olarak hazır tutun.

## Model seçmeden önce kısa kontrol listesi

Türkçe bir yapay zeka ürünü için model seçmeden önce şu sorulara yanıt verin:

- Kendi işinizden 50–200 örnekle bir test seti kurdunuz mu?
- Adayları doğruluk, Türkçe akıcılık, görev başına maliyet ve gecikme açısından karşılaştırdınız mı?
- Sesli üründe konuşma tanımayı rakam, IBAN, adres ve ağız farklarıyla kendi kayıtlarınızda sınadınız mı?
- Kişisel verinin nerede işleneceğini KVKK’ye ve sektörünüzün kurallarına göre belirlediniz mi?
- Uygulamanız, daha iyi bir model çıktığında kolayca geçiş yapmanıza izin veriyor mu?

Türkçe konuşan sesli asistanlar ve belge işleyen yapay zeka ürünleri geliştiriyoruz: borçluları arayan [Kollektor](/kollektor), klinikler için telefon asistanı [Hastam](/hastam) ve değerleme raporu taslağı hazırlayan [Intelval](/intelval). Kendi senaryonuz için model seçimini birlikte değerlendirmek isterseniz [GBO Vision ekibiyle görüşebilirsiniz](#demo).
