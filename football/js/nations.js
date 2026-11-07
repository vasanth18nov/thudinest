/* The 48 nations of the 2026 World Cup (United States, Canada and Mexico, 11 June to 19 July 2026), in their real
   groups, with a starting XI from each final squad and the numbers they wore, home and change colours, and a strength
   rating (0 to 100; it sharpens or blunts the side's play, sim.js). Stars, marked *, are a little quicker and surer.
   `five`: the five a nation sends out on the futsal court (keeper, defender, two midfielders, forward), from its XI.
   Flags: football/flags (Twemoji, CC BY 4.0).
   XI: keeper | four defenders | three midfielders | three forwards (left, centre, right). */

const N = [
  // Group A
  ['mex', 'Mexico', 'A', 79, '0b6b3a ffffff c8102e ffffff', 'f2efe6 0b6b3a f2efe6 0b6b3a', 'Rangel 1|J. Sánchez 2,Montes 3,Vásquez 5,Gallardo 23|Álvarez* 4,Romo 7,L. Chávez 24|Vega 10,Giménez* 11,Jiménez 9', [0, 2, 5, 8, 9]],
  ['rsa', 'South Africa', 'A', 72, 'f6c700 1b6b36 f6c700 1b6b36', 'ffffff 1b6b36 ffffff 1b6b36', 'Williams 1|Mudau 20,Sibisi 19,Ndamane 3,Modiba 6|Mokoena* 4,Mbatha 5,Zwane 11|Appolis 7,Foster* 9,Mofokeng 10', [0, 2, 5, 10, 9]],
  ['kor', 'South Korea', 'A', 77, 'd2202f 151515 d2202f 151515', 'ffffff 151515 ffffff 1d2b5c', 'Kim Seung-gyu~Kim SG 1|Seol Young-woo~Seol 22,Kim Min-jae*~Kim MJ 4,Kim Tae-hyeon~Kim TH 5,Lee Tae-seok~Lee TS 13|Hwang In-beom~Hwang 6,Paik Seung-ho~Paik 8,Lee Kang-in*~Lee KI 19|Lee Jae-sung~Lee JS 10,Cho Gue-sung~Cho 9,Son Heung-min*~Son 7', [0, 2, 7, 10, 9]],
  ['cze', 'Czechia', 'A', 74, 'd7141a ffffff 11457e ffffff', 'ffffff ffffff ffffff d7141a', 'Kovář 1|Coufal 5,Hranáč 4,Krejčí 7,Jurásek 14|Souček* 22,Provod 17,Darida 8|Šulc 15,Schick* 10,Hložek 9', [0, 2, 5, 8, 9]],
  // Group B
  ['can', 'Canada', 'B', 75, 'd52b1e d52b1e d52b1e ffffff', 'ffffff ffffff ffffff d52b1e', 'St. Clair 1|Johnston 2,Bombito 15,Cornelius 13,Davies* 19|Eustáquio 7,Koné 8,Buchanan 17|Millar 11,J. David* 10,Larin 9', [0, 4, 5, 10, 9]],
  ['bih', 'Bosnia and Herzegovina', 'B', 72, '1b3f94 1b3f94 1b3f94 f2c51a', 'ffffff ffffff ffffff 1b3f94', 'Vasilj 1|Dedić 7,Katić 18,Muharemović 4,Kolašinac 5|Tahirović 6,Gigović 8,Hadžiahmetović 16|Bajraktarević 20,Džeko* 11,Demirović 10', [0, 2, 5, 8, 9]],
  ['qat', 'Qatar', 'B', 70, '7a1636 7a1636 7a1636 ffffff', 'ffffff ffffff ffffff 7a1636', 'Abunada 1|Pedro Miguel 2,Khoukhi 16,Mendes 3,Al-Hussain 25|Boudiaf 12,Hatem 6,Al-Haydos 10|Afif* 11,Almoez Ali* 19,Muntari 9', [0, 2, 7, 8, 9]],
  ['sui', 'Switzerland', 'B', 79, 'd52b1e ffffff d52b1e ffffff', 'ffffff d52b1e ffffff d52b1e', 'Kobel 1|Widmer 3,Akanji* 5,Elvedi 4,R. Rodríguez 13|Xhaka* 10,Freuler 8,Zakaria 6|Ndoye 11,Embolo 7,R. Vargas 17', [0, 2, 5, 8, 9]],
  // Group C
  ['bra', 'Brazil', 'C', 87, 'f9d71c 1c3f94 ffffff 0b8a3c 0b5c2e', '1c3f94 ffffff 1c3f94 f9d71c', 'Alisson* 1|Danilo 13,Marquinhos* 4,Gabriel 3,Alex Sandro 6|Casemiro 5,Bruno Guimarães 8,Neymar* 10|Raphinha* 11,Matheus Cunha 9,Vinícius Jr.* 7', [0, 2, 8, 10, 9]],
  ['mar', 'Morocco', 'C', 82, 'c1272d 0b6b3a c1272d 0b6b3a', 'ffffff ffffff ffffff c1272d', 'Bounou* 1|Hakimi* 2,Diop 14,Saadane 5,Mazraoui 3|Amrabat 4,Ounahi 8,El Khannouss 23|Brahim Díaz* 10,El Kaabi 20,Saibari 11', [0, 1, 7, 8, 9]],
  ['hai', 'Haiti', 'C', 64, '0a3a9e c8102e 0a3a9e c8102e', 'ffffff ffffff ffffff 0a3a9e', 'Placide 1|Arcus 2,Delcroix 5,Adé 4,Duverne 22|Bellegarde* 10,Sainté 6,Jean Jacques 17|Deedson 11,Nazon* 9,Isidor 18', [0, 2, 5, 8, 9]],
  ['sco', 'Scotland', 'C', 74, '1b2a5c ffffff 1b2a5c ffffff', 'f2f2f2 1b2a5c f2f2f2 1b2a5c', 'Gunn 1|Ralston 24,Hendry 13,Souttar 15,Robertson* 3|McTominay* 4,McGinn 7,Christie 11|Gannon-Doak 17,Dykes 9,Adams 10', [0, 4, 5, 6, 9]],
  // Group D
  ['usa', 'United States', 'D', 79, 'ffffff 1d2b5c ffffff 1d2b5c', '1d2b5c 1d2b5c 1d2b5c c8102e', 'Turner 1|Dest 2,Richards 3,Ream 13,A. Robinson 5|Adams 4,McKennie 8,Reyna 7|Weah 21,Balogun 20,Pulisic* 10', [0, 2, 6, 10, 9]],
  ['par', 'Paraguay', 'D', 75, 'd52b1e 1b3f94 ffffff ffffff', '1b3f94 1b3f94 1b3f94 d52b1e', 'R. Fernández 1|Velázquez 2,G. Gómez 15,Alderete 3,Alonso 6|Cubas 14,D. Gómez 8,Almirón* 10|Enciso* 19,Sanabria 9,Arce 18', [0, 2, 7, 8, 9]],
  ['aus', 'Australia', 'D', 74, 'ffcd00 00843d ffcd00 00843d', '00843d 00843d 00843d ffcd00', 'M. Ryan 1|Geria 6,Souttar* 19,Circati 3,Bos 5|O\'Neill 13,Metcalfe 8,Irvine 22|Irankunda* 17,Touré 9,Mabil 11', [0, 2, 6, 8, 9]],
  ['tur', 'Türkiye', 'D', 78, 'e30a17 ffffff e30a17 ffffff', 'ffffff e30a17 ffffff e30a17', 'Çakır 23|Çelik 2,Demiral 3,Bardakcı 14,Kadıoğlu 20|Çalhanoğlu* 10,Yüksek 16,Kökçü 6|Güler* 8,Yılmaz 21,Yıldız* 11', [0, 2, 5, 8, 10]],
  // Group E
  ['ger', 'Germany', 'E', 85, 'ffffff 151515 ffffff 151515', '1d2440 1d2440 1d2440 e8c23a', 'Neuer 1|Kimmich* 6,Rüdiger 2,Tah 4,Raum 22|Pavlović 5,Goretzka 8,Wirtz* 17|Musiala* 10,Havertz 7,Sané 19', [0, 3, 7, 8, 9]],
  ['cuw', 'Curaçao', 'E', 64, '1a3f9e 1a3f9e 1a3f9e f2c51a', 'ffffff ffffff ffffff 1a3f9e', 'Room 1|Sambo 2,Bazoer 23,Obispo 18,Floranus 5|L. Bacuna* 10,J. Bacuna 7,Comenencia 8|Kuwas 17,Locadia 9,Chong 21', [0, 2, 5, 8, 9]],
  ['civ', 'Ivory Coast', 'E', 77, 'f77f00 ffffff 0b8a3c ffffff', 'ffffff 0b8a3c ffffff f77f00', 'Y. Fofana 1|Singo 5,Kossounou 7,Ndicka 21,Konan 3|Kessié* 8,S. Fofana 6,Sangaré 18|Adingra 10,Bonny 9,Pépé 19', [0, 3, 5, 8, 9]],
  ['ecu', 'Ecuador', 'E', 78, 'ffdd00 1d2b5c c8102e 1d2b5c', '1d2b5c 1d2b5c 1d2b5c ffdd00', 'Galíndez 1|Preciado 17,Pacho* 6,Hincapié* 3,Estupiñán 7|M. Caicedo* 23,Páez 10,Vite 15|Yeboah 9,E. Valencia 13,Plata 19', [0, 2, 5, 10, 9]],
  // Group F
  ['ned', 'Netherlands', 'F', 85, 'f36c21 151515 f36c21 151515', '1d2b5c 1d2b5c 1d2b5c f36c21', 'Verbruggen 1|Dumfries 22,Van Dijk* 4,Van de Ven 15,Aké 5|Gravenberch 8,Reijnders 14,F. de Jong* 21|Malen 18,Depay 10,Gakpo* 11', [0, 2, 7, 10, 9]],
  ['jpn', 'Japan', 'F', 80, '0b2c7a ffffff 0b2c7a ffffff', 'ffffff ffffff ffffff 0b2c7a', 'Z. Suzuki 1|Sugawara 2,Itakura 4,Taniguchi 3,H. Itō 21|Endō 6,Tanaka 7,Kamada* 15|Kubo* 8,Ueda 18,Dōan 10', [0, 2, 7, 8, 9]],
  ['swe', 'Sweden', 'F', 77, 'fecb00 005293 fecb00 005293', '005293 005293 005293 fecb00', 'Zetterström 1|Lagerbielke 2,Lindelöf 3,Hien 4,Gudmundsson 5|Karlström 16,Ayari 18,Bergvall 7|Elanga 11,Gyökeres* 17,Isak* 9', [0, 3, 7, 10, 9]],
  ['tun', 'Tunisia', 'F', 72, 'e70013 ffffff e70013 ffffff', 'ffffff ffffff ffffff e70013', 'Dahmen 16|Valery 20,Talbi 3,Bronn 6,Abdi 2|Skhiri* 17,Mejbri 10,Khedira 13|Achouri 7,Mastouri 9,Saad 8', [0, 2, 5, 6, 9]],
  // Group G
  ['bel', 'Belgium', 'G', 83, 'c8102e c8102e c8102e f2c31c', 'f5f0e1 f5f0e1 f5f0e1 151515', 'Courtois* 1|Castagne 21,Debast 2,Theate 3,De Cuyper 5|Onana 24,Tielemans 8,De Bruyne* 7|Doku* 11,Lukaku 9,Trossard 10', [0, 2, 7, 8, 9]],
  ['egy', 'Egypt', 'G', 75, 'c8102e ffffff 151515 ffffff', 'ffffff 151515 ffffff c8102e', 'El Shenawy 1|Hany 3,Abdelmonem 6,Rabia 5,Hafez 15|Attia 19,Ashour 8,Zizo 25|Salah* 10,Marmoush* 22,Trezeguet 7', [0, 2, 7, 8, 9]],
  ['irn', 'Iran', 'G', 75, 'ffffff ffffff ffffff d52b1e', 'd52b1e d52b1e d52b1e ffffff', 'Beiranvand 1|Rezaeian 23,Khalilzadeh 4,Kanaanizadegan 13,Mohammadi 5|Ezatolahi 6,Ghoddos 14,Jahanbakhsh 7|Ghayedi 10,Taremi* 9,Alipour 11', [0, 2, 7, 8, 9]],
  ['nzl', 'New Zealand', 'G', 67, 'ffffff 151515 ffffff 151515', '151515 151515 151515 ffffff', 'Crocombe 1|Payne 2,Boxall 5,Bindon 4,Cacace 13|Bell 6,Stamenić 8,Thomas 23|Garbett 7,Wood* 9,Just 11', [0, 2, 6, 8, 9]],
  // Group H
  ['esp', 'Spain', 'H', 90, 'c60b1e 14254f 14254f f2c51a', 'f2efe6 f2efe6 f2efe6 c60b1e', 'Unai Simón 23|Porro 12,Cubarsí* 22,Laporte 14,Cucurella 24|Rodri* 16,Zubimendi 18,Pedri* 20|Yamal* 19,Oyarzabal 21,N. Williams* 17', [0, 2, 7, 8, 9]],
  ['cpv', 'Cape Verde', 'H', 69, '003893 003893 003893 cf2027', 'ffffff ffffff ffffff 003893', 'Vozinha 1|Stopira 2,Logan Costa 5,R. Lopes 4,S. Moreira 22|Kevin Pina 6,J. Monteiro 10,D. Duarte 14|Jovane 7,Livramento 19,Ryan Mendes* 20', [0, 2, 6, 10, 9]],
  ['ksa', 'Saudi Arabia', 'H', 71, '006c35 ffffff 006c35 ffffff', 'ffffff ffffff ffffff 006c35', 'Al-Aqidi 1|Abdulhamid 12,Al-Amri 4,Al-Tambakti 5,Boushal 13|Kanno 23,Al-Khaibari 15,Al-Juwayr 7|S. Al-Dawsari* 10,Al-Buraikan 9,Al-Shehri 11', [0, 2, 7, 8, 9]],
  ['uru', 'Uruguay', 'H', 82, '5cb8e6 151515 151515 151515', 'ffffff ffffff ffffff 5cb8e6', 'Rochet 1|Varela 13,J. M. Giménez 2,R. Araujo* 4,Olivera 16|Ugarte 5,Bentancur 6,Valverde* 8|Pellistri 11,Núñez* 9,De Arrascaeta 10', [0, 3, 7, 10, 9]],
  // Group I
  ['fra', 'France', 'I', 89, '1f3a7a ffffff c8102e ffffff', 'ffffff 1f3a7a ffffff 1f3a7a', 'Maignan 16|Koundé 5,Upamecano 4,Saliba* 17,T. Hernández 19|Tchouaméni 8,Rabiot 14,Zaïre-Emery 18|Dembélé* 7,Mbappé* 10,Olise* 11', [0, 3, 5, 8, 9]],
  ['sen', 'Senegal', 'I', 79, 'ffffff ffffff ffffff 0b8a3c', '0b8a3c 0b8a3c 0b8a3c f2c51a', 'E. Mendy 16|Diatta 15,Koulibaly* 3,Niakhaté 19,Jakobs 14|I. Gueye 5,P. Gueye 26,P. M. Sarr 17|I. Sarr 18,N. Jackson 11,Mané* 10', [0, 2, 7, 10, 9]],
  ['irq', 'Iraq', 'I', 69, '0b7a3d ffffff 0b7a3d ffffff', 'ffffff ffffff ffffff 0b7a3d', 'Talib 1|Hussein Ali 3,Sulaka 2,Tahseen 4,Doski 23|Bayesh 8,Amyn 7,Iqbal 14|Al-Hamadi 9,Aymen Hussein* 18,Mohanad Ali 10', [0, 2, 6, 10, 9]],
  ['nor', 'Norway', 'I', 80, 'ba0c2f ffffff 00205b ffffff', 'ffffff 00205b ffffff ba0c2f', 'Nyland 1|Ryerson 26,Ajer 3,Østigård 4,Wolfe 5|Berge 8,Ødegaard* 10,Berg 6|Nusa 20,Haaland* 9,Sørloth 7', [0, 3, 6, 8, 9]],
  // Group J
  ['arg', 'Argentina', 'J', 89, '8cc4ea 151515 ffffff ffffff 151515', '1d2b5c 1d2b5c 1d2b5c 8cc4ea', 'E. Martínez* 23|Molina 26,Romero* 13,Otamendi 19,Tagliafico 3|De Paul 7,Enzo Fernández 24,Mac Allister* 20|Messi* 10,Lautaro* 22,J. Álvarez* 9', [0, 2, 8, 10, 9]],
  ['alg', 'Algeria', 'J', 75, 'ffffff 0b6b3a 0b6b3a 0b6b3a', '0b6b3a ffffff 0b6b3a ffffff', 'Mastil 1|Belghali 17,Mandi 2,Tougaï 4,Aït-Nouri* 15|Zerrouki 6,Bentaleb 19,Aouar 8|Mahrez* 7,Amoura* 18,Gouiri 9', [0, 2, 7, 8, 9]],
  ['aut', 'Austria', 'J', 78, 'd71a28 ffffff d71a28 ffffff', 'ffffff 151515 ffffff d71a28', 'A. Schlager 1|Posch 5,Danso 3,Alaba* 8,Mwene 16|Seiwald 6,Laimer* 20,Sabitzer* 9|Schmid 18,Arnautović 7,Wimmer 21', [0, 3, 6, 7, 9]],
  ['jor', 'Jordan', 'J', 69, 'ffffff ffffff ffffff c8102e', 'c8102e c8102e c8102e ffffff', 'Abulaila 1|Abu Hashish 2,Nasib 3,Al-Arab 5,Haddad 23|Al-Rashdan 21,Al-Rawabdeh 8,Ayed 14|Al-Taamari* 10,Olwan 9,Abu Zrayq 7', [0, 2, 6, 8, 9]],
  // Group K
  ['por', 'Portugal', 'K', 87, 'a3122a 0b5c2e a3122a 0b5c2e', 'f5f0e1 f5f0e1 f5f0e1 a3122a', 'Diogo Costa 1|Cancelo 20,R. Dias* 3,Inácio 14,Nuno Mendes* 25|Vitinha* 23,João Neves 15,B. Fernandes* 8|B. Silva* 10,Ronaldo* 7,Leão 17', [0, 2, 7, 8, 9]],
  ['cod', 'DR Congo', 'K', 74, '1e90ff 1e90ff c8102e f2c51a', 'c8102e c8102e c8102e f2c51a', 'Mpasi 1|Wan-Bissaka 2,Mbemba* 22,Tuanzebe 4,Masuaku 26|Moutoussamy 8,Pickel 18,Sadiki 14|Elia 13,Wissa* 20,Bakambu 17', [0, 2, 6, 8, 9]],
  ['uzb', 'Uzbekistan', 'K', 71, 'ffffff 1b3f94 ffffff 1b3f94', '1b3f94 1b3f94 1b3f94 ffffff', 'Yusupov 1|Ashurmatov 5,Khusanov* 2,Eshmurodov 15,Alijonov 3|Shukurov 7,Hamrobekov 9,Masharipov 10|Fayzullaev* 22,Shomurodov* 14,Urunov 11', [0, 2, 7, 8, 9]],
  ['col', 'Colombia', 'K', 82, 'fcd116 0a2463 c8102e 0a2463', '0a2463 0a2463 0a2463 fcd116', 'Camilo Vargas 12|D. Muñoz 2,Lucumí 3,D. Sánchez 23,Mojica 17|Lerma 16,R. Ríos 6,James* 10|J. Arias 11,Córdoba 9,Luis Díaz* 7', [0, 2, 7, 10, 9]],
  // Group L
  ['eng', 'England', 'L', 88, 'ffffff 1d2a5b ffffff 1d2a5b', 'b5122e b5122e b5122e ffffff', 'Pickford 1|R. James 24,Stones 5,Guéhi 6,O\'Reilly 3|Rice* 4,Anderson 8,Bellingham* 10|Saka* 7,Kane* 9,Rashford 11', [0, 3, 7, 8, 9]],
  ['cro', 'Croatia', 'L', 82, 'ffffff 171796 171796 d50f25', '171796 171796 171796 ffffff', 'Livaković 1|Stanišić 2,Šutalo 6,Gvardiol* 4,Pongračić 3|Modrić* 10,Kovačić* 8,L. Sučić 21|Perišić 14,Kramarić 9,Baturina 16', [0, 3, 5, 8, 9]],
  ['gha', 'Ghana', 'L', 74, 'ffffff ffffff ffffff 151515', 'c8102e c8102e c8102e f2c51a', 'Ati-Zigi 1|Seidu 2,Mumin 6,Adjetey 4,Baba 17|Partey* 5,Sibo 8,Fatawu 7|Semenyo* 11,J. Ayew 9,Sulemana 22', [0, 2, 5, 8, 9]],
  ['pan', 'Panama', 'L', 70, 'd21034 1b3f94 d21034 ffffff', 'ffffff ffffff ffffff d21034', 'Mejía 1|Blackman 2,J. Córdoba 3,Escobar 4,Davis 15|Carrasquilla* 8,C. Martínez 6,Godoy 20|Bárcenas 11,Fajardo 17,Waterman 18', [0, 2, 5, 8, 9]],
];

// FIFA codes and flags (football/flags/<iso>.svg)
const CODE = { mex: 'MEX', rsa: 'RSA', kor: 'KOR', cze: 'CZE', can: 'CAN', bih: 'BIH', qat: 'QAT', sui: 'SUI', bra: 'BRA', mar: 'MAR', hai: 'HAI', sco: 'SCO', usa: 'USA', par: 'PAR', aus: 'AUS', tur: 'TUR', ger: 'GER', cuw: 'CUW', civ: 'CIV', ecu: 'ECU', ned: 'NED', jpn: 'JPN', swe: 'SWE', tun: 'TUN', bel: 'BEL', egy: 'EGY', irn: 'IRN', nzl: 'NZL', esp: 'ESP', cpv: 'CPV', ksa: 'KSA', uru: 'URU', fra: 'FRA', sen: 'SEN', irq: 'IRQ', nor: 'NOR', arg: 'ARG', alg: 'ALG', aut: 'AUT', jor: 'JOR', por: 'POR', cod: 'COD', uzb: 'UZB', col: 'COL', eng: 'ENG', cro: 'CRO', gha: 'GHA', pan: 'PAN' };
const ISO = { mex: 'mx', rsa: 'za', kor: 'kr', cze: 'cz', can: 'ca', bih: 'ba', qat: 'qa', sui: 'ch', bra: 'br', mar: 'ma', hai: 'ht', sco: 'sct', usa: 'us', par: 'py', aus: 'au', tur: 'tr', ger: 'de', cuw: 'cw', civ: 'ci', ecu: 'ec', ned: 'nl', jpn: 'jp', swe: 'se', tun: 'tn', bel: 'be', egy: 'eg', irn: 'ir', nzl: 'nz', esp: 'es', cpv: 'cv', ksa: 'sa', uru: 'uy', fra: 'fr', sen: 'sn', irq: 'iq', nor: 'no', arg: 'ar', alg: 'dz', aut: 'at', jor: 'jo', por: 'pt', cod: 'cd', uzb: 'uz', col: 'co', eng: 'eng', cro: 'hr', gha: 'gh', pan: 'pa' };

const hex = (s) => parseInt(s, 16);
const kitOf = (s) => { const [shirt, shorts, socks, trim, num] = s.split(' '); return { shirt: hex(shirt), shorts: hex(shorts), socks: hex(socks), trim: hex(trim), num: num ? hex(num) : undefined }; };
function squadOf(s) {
  return s.split('|').flatMap((g) => g.split(',')).map((t) => {
    const m = t.trim().match(/^(.*?)\s+(\d+)$/); let name = m[1]; const num = +m[2];
    const star = name.includes('*'); name = name.replace('*', '');
    let short = name; if (name.includes('~')) [name, short] = name.split('~');
    return { name, short, num, star };
  });
}

export const NATIONS = {};
export const GROUPS = {};
for (const [id, name, g, rate, home, away, xi, five] of N) {
  const kit = kitOf(home), alt = kitOf(away);
  const css = (n) => '#' + n.toString(16).padStart(6, '0');
  NATIONS[id] = {
    id, name, short: CODE[id], group: g, rate, nation: true, flag: `flags/${ISO[id]}.svg`,
    color: css(kit.shirt), alt: css(kit.shirt === kit.trim ? kit.shorts : kit.trim),
    kit, away: alt, squad: squadOf(xi), five,
  };
  (GROUPS[g] = GROUPS[g] || []).push(id);
}
export const NATION_IDS = Object.keys(NATIONS);

/* how it really ended, for the end of a World Cup run */
export const REAL_2026 = {
  champion: 'esp', runnerUp: 'arg', semis: ['fra', 'eng'],
  final: 'Spain beat Argentina 1–0 after extra time in the final at MetLife Stadium, New Jersey, on 19 July 2026, to win their second World Cup.',
};
