/**
 * SÖZLER
 * ------
 * Yalnızca kaynağı doğrulanabilir, telif süresi dolmuş eski metinlerden alınmış
 * sözler (yanlış atfedilen popüler "ünlü sözler" bilinçli olarak alınmadı).
 * Türkçe metinler serbest çevirilerdir. Her söz, hangi yorum konularıyla
 * eşleşeceğini belirten `themes` etiketleri taşır.
 *
 * Konular: kendini-bil, farkindalik, sebep, duygu, sukunet, zaman, ritim,
 * degisim, geriye-bakis, baslangic, aliskanlik, keyif + sebep kimlikleri
 * (stres, sosyal, sikinti, aliskanlik, keyif).
 */
export interface Quote {
  id: string;
  text: string;
  author: string;
  source: string;
  themes: string[];
}

export const QUOTES: Quote[] = [
  {
    id: "sokrates-sorgulanmamis",
    text: "Sorgulanmamış bir hayat yaşamaya değmez.",
    author: "Sokrates",
    source: "Platon, Savunma",
    themes: ["kendini-bil", "farkindalik", "sebep"],
  },
  {
    id: "delphi-kendini-bil",
    text: "Kendini bil.",
    author: "Delphi Tapınağı yazıtı",
    source: "",
    themes: ["kendini-bil", "farkindalik"],
  },
  {
    id: "laotzu-kendini-bilen",
    text: "Başkalarını bilen bilgedir; kendini bilen aydınlanmıştır.",
    author: "Lao Tzu",
    source: "Tao Te Ching, 33",
    themes: ["kendini-bil", "farkindalik"],
  },
  {
    id: "epiktetos-dusunceler",
    text: "İnsanları rahatsız eden şeyler değil, o şeyler hakkındaki düşünceleridir.",
    author: "Epiktetos",
    source: "El Kitabı, 5",
    themes: ["duygu", "stres", "sebep"],
  },
  {
    id: "epiktetos-bizim-elimizde",
    text: "Bazı şeyler bize bağlıdır, bazıları bağlı değildir.",
    author: "Epiktetos",
    source: "El Kitabı, 1",
    themes: ["stres", "sukunet", "degisim"],
  },
  {
    id: "seneca-hayal",
    text: "Bizi korkutan şeyler, bizi ezenlerden daha çoktur; gerçekte olandan çok, tasavvurumuzda acı çekeriz.",
    author: "Seneca",
    source: "Mektuplar, 13",
    themes: ["stres", "duygu"],
  },
  {
    id: "pascal-oda",
    text: "İnsanların bütün mutsuzluğu tek bir şeyden gelir: bir odada tek başına, sakin sakin oturmasını bilmemekten.",
    author: "Blaise Pascal",
    source: "Düşünceler, 139",
    themes: ["sikinti", "sukunet"],
  },
  {
    id: "pascal-kalp",
    text: "Kalbin, aklın bilmediği kendi nedenleri vardır.",
    author: "Blaise Pascal",
    source: "Düşünceler, 277",
    themes: ["sebep", "duygu"],
  },
  {
    id: "marcus-siginak",
    text: "İnsan, kendi ruhundan daha sakin ve daha dertsiz bir sığınak bulamaz.",
    author: "Marcus Aurelius",
    source: "Kendime Düşünceler, 4.3",
    themes: ["sukunet", "stres"],
  },
  {
    id: "marcus-engel",
    text: "Eylemin önünde duran engel, eylemi ilerletir; yolun önündeki şey, yolun kendisi olur.",
    author: "Marcus Aurelius",
    source: "Kendime Düşünceler, 5.20",
    themes: ["degisim", "stres"],
  },
  {
    id: "marcus-az-sey",
    text: "Mutlu bir hayat için çok az şey gerekir.",
    author: "Marcus Aurelius",
    source: "Kendime Düşünceler, 7.67",
    themes: ["keyif", "sukunet"],
  },
  {
    id: "seneca-omur",
    text: "Kısa bir ömrümüz yok; onun büyük bölümünü biz harcıyoruz.",
    author: "Seneca",
    source: "Hayatın Kısalığı Üzerine, 1",
    themes: ["zaman", "ritim"],
  },
  {
    id: "seneca-cesaret",
    text: "Şeyler zor olduğu için cesaret edemiyor değiliz; cesaret edemediğimiz için zor görünüyorlar.",
    author: "Seneca",
    source: "Mektuplar, 104",
    themes: ["degisim", "baslangic"],
  },
  {
    id: "seneca-nese",
    text: "Gerçek neşe ciddi bir iştir.",
    author: "Seneca",
    source: "Mektuplar, 23",
    themes: ["keyif"],
  },
  {
    id: "herakleitos-karakter",
    text: "Karakter, insanın kaderidir.",
    author: "Herakleitos",
    source: "Fragman 119",
    themes: ["aliskanlik", "ritim", "kendini-bil"],
  },
  {
    id: "herakleitos-irmak",
    text: "Aynı ırmakta iki kez yıkanılmaz.",
    author: "Herakleitos",
    source: "Fragmanlar",
    themes: ["degisim", "zaman", "geriye-bakis"],
  },
  {
    id: "kierkegaard-geriye",
    text: "Hayat ancak geriye bakınca anlaşılır; ama ileriye doğru yaşanmak zorundadır.",
    author: "Søren Kierkegaard",
    source: "Günlükler, 1843",
    themes: ["geriye-bakis", "zaman", "farkindalik"],
  },
  {
    id: "laotzu-adim",
    text: "Bin millik yolculuk, tek bir adımla başlar.",
    author: "Lao Tzu",
    source: "Tao Te Ching, 64",
    themes: ["baslangic", "degisim"],
  },
  {
    id: "buda-zihin",
    text: "Zihin her şeyin öncüsüdür; her şey zihinden doğar.",
    author: "Buda",
    source: "Dhammapada, 1",
    themes: ["duygu", "sebep", "farkindalik"],
  },
  {
    id: "buda-efendi",
    text: "Kişinin efendisi, yine kendisidir.",
    author: "Buda",
    source: "Dhammapada, 160",
    themes: ["kendini-bil"],
  },
  {
    id: "yunus-ben",
    text: "Bir ben vardır bende, benden içeri.",
    author: "Yunus Emre",
    source: "",
    themes: ["kendini-bil"],
  },
  {
    id: "aristoteles-aliskanlik",
    text: "Ahlaki erdem, alışkanlığın sonucunda ortaya çıkar.",
    author: "Aristoteles",
    source: "Nikomakhos'a Etik, II.1",
    themes: ["aliskanlik", "ritim"],
  },
  {
    id: "aristoteles-toplumsal",
    text: "İnsan, doğası gereği toplumsal bir varlıktır.",
    author: "Aristoteles",
    source: "Politika, I.2",
    themes: ["sosyal"],
  },
  {
    id: "thoreau-bilincli",
    text: "Bilinçli yaşamak istediğim için ormana gittim.",
    author: "Henry David Thoreau",
    source: "Walden",
    themes: ["farkindalik", "baslangic"],
  },
  {
    id: "goethe-gormek",
    text: "Her şeyden zor olan, sana en kolay gelen şeydir: gözlerinle, gözünün önündekini görmek.",
    author: "Goethe ve Schiller",
    source: "Xenien",
    themes: ["farkindalik", "kendini-bil"],
  },
  {
    id: "konfucyus-dusunmek",
    text: "Öğrenip düşünmeyen boşa çalışır; düşünüp öğrenmeyen tehlikeye düşer.",
    author: "Konfüçyüs",
    source: "Konuşmalar, 2.15",
    themes: ["farkindalik", "sebep"],
  },
];
