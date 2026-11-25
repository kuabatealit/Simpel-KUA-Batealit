export interface RegionHierarchy {
  [provinsi: string]: {
    [kabupaten: string]: {
      [kecamatan: string]: string[];
    };
  };
}

export const BATEALIT_VILLAGES = [
  'Bantrung',
  'Batealit',
  'Bawu',
  'Bringin',
  'Geneng',
  'Mindahan',
  'Mindahan Kidul',
  'Ngasem',
  'Pekalongan',
  'Raguklampitan',
  'Somosari',
] as const;

export const INDONESIAN_REGIONS: RegionHierarchy = {
  'Jawa Tengah': {
    'Kabupaten Jepara': {
      Batealit: [...BATEALIT_VILLAGES],
      Tahunan: [
        'Demangan',
        'Kecapi',
        'Krapyak',
        'Langon',
        'Mangunrekso',
        'Mantingan',
        'Ngabul',
        'Petekeyan',
        'Platar',
        'Semat',
        'Senenan',
        'Sukodono',
        'Tahunan',
        'Tegalsambi',
        'Telukawur',
      ],
      Jepara: [
        'Bapangan',
        'Bulu',
        'Demaan',
        'Jobokuto',
        'Karangkebagusan',
        'Kauman',
        'Kuwasen',
        'Mulyoharjo',
        'Panggang',
        'Pengkol',
        'Potroyudan',
        'Saripan',
        'Ujungbatu',
        'Wonorejo',
      ],
      Pecangaan: [
        'Gemulung',
        'Gerdu',
        'Kaliombo',
        'Karangrandu',
        'Krasak',
        'Lebuawu',
        'Ngeling',
        'Pecangaan Kulon',
        'Pecangaan Wetan',
        'Pulodarat',
        'Rengging',
        'Troso',
      ],
      Mayong: [
        'Bandung',
        'Buaran',
        'Bungu',
        'Datar',
        'Jebol',
        'Kuanyar',
        'Mayong Kidul',
        'Mayong Lor',
        'Ngoro-oro',
        'Pancur',
        'Paren',
        'Pelang',
        'Pelemkerep',
        'Pule',
        'Rajekwesi',
        'Sengonbugel',
        'Singorojo',
        'Tigajuru',
      ],
      'Pakis Aji': [
        'Bulungan',
        'Kawak',
        'Lebak',
        'Mambak',
        'Plajan',
        'Slagi',
        'Suwawal Timur',
        'Tanjung',
      ],
      Mlonggo: [
        'Jambu',
        'Jambu Timur',
        'Karanggondang',
        'Mororejo',
        'Sekuro',
        'Sinanggul',
        'Srobyong',
        'Suwawal',
      ],
      Bangsri: [
        'Banjar Agung',
        'Banjaran',
        'Bangsri',
        'Bondo',
        'Guyangan',
        'Jerukwangi',
        'Kedungleper',
        'Kepuk',
        'Papasan',
        'Srikandang',
        'Tengguli',
        'Wedelan',
      ],
      Kalinyamatan: [
        'Bakalan',
        'Bandungrejo',
        'Banyupetir',
        'Batukali',
        'Damaran',
        'Kriyan',
        'Manyargading',
        'Margoyoso',
        'Pendosawalan',
        'Purwogondo',
        'Robayan',
        'Sendang',
      ],
      Kedung: [
        'Bugel',
        'Bulakbaru',
        'Dongos',
        'Jondang',
        'Kalianyar',
        'Karangaji',
        'Kedungmalang',
        'Kerso',
        'Menganti',
        'Panggung',
        'Rau',
        'Sowan Kidul',
        'Sowan Lor',
        'Sukosono',
        'Surodadi',
        'Tanggultlare',
        'Tedunan',
        'Wanuso',
      ],
      Welahan: [
        'Brantaksekarjati',
        'Bugo',
        'Gedangan',
        'Gidangelo',
        'Guwosobokerto',
        'Kalipucang Kulon',
        'Kalipucang Wetan',
        'Karanganyar',
        'Kedungsarimulyo',
        'Kendengsidialit',
        'Ketilengsingolelo',
        'Sidigede',
        'Telukwetan',
        'Ujungpandan',
        'Welahan',
      ],
      Nalumsari: [
        'Bategede',
        'Bendanpete',
        'Blimbingrejo',
        'Daren',
        'Doranglempuyangan',
        'Gemiring Kidul',
        'Gemiring Lor',
        'Jatisari',
        'Karangnongko',
        'Muryolobo',
        'Nalumsari',
        'Ngetuk',
        'Pringtulis',
        'Tritis',
        'Tunggulpandean',
      ],
      Kembang: [
        'Balong',
        'Bucu',
        'Cepogo',
        'Dermolo',
        'Dudakawu',
        'Jinggotan',
        'Kaliaman',
        'Kancilan',
        'Pendem',
        'Sumanding',
        'Tubanan',
      ],
      Keling: [
        'Bumiharjo',
        'Damarwulan',
        'Gelang',
        'Jlegong',
        'Kaligarang',
        'Kelet',
        'Keling',
        'Klepu',
        'Kunir',
        'Tempur',
        'Tunahan',
        'Watuaji',
      ],
      Donorojo: [
        'Bandungharjo',
        'Banyumanis',
        'Blingoh',
        'Clering',
        'Jugo',
        'Sumberrejo',
        'Tulakan',
        'Ujungwatu',
      ],
      Karimunjawa: ['Karimunjawa', 'Kemojan', 'Parang', 'Nyamuk'],
    },
    'Kabupaten Kudus': {
      Kaliwungu: ['Bakalan Krapyak', 'Banget', 'Blimbing Kidul', 'Garung Kidul', 'Garung Lor', 'Kaliwungu', 'Kedungdowo', 'Mijen', 'Papringan', 'Prambatan Kidul', 'Prambatan Lor', 'Setrokalangan', 'Sidorekso'],
      Kota: ['Barongan', 'Burikan', 'Demaan', 'Glantengan', 'Janggalan', 'Kajeksan', 'Kaliputu', 'Kauman', 'Kerjasan', 'Kramat', 'Mlati Kidul', 'Mlati Lor', 'Panjunan', 'Purwosari', 'Sunggingan', 'Wergu Kulon', 'Wergu Wetan'],
      Gebog: ['Besito', 'Getasrabi', 'Gondosari', 'Gribig', 'Jurang', 'Karangmalang', 'Kedungsari', 'Klumpit', 'Menawan', 'Padurenan', 'Rahtawu'],
      Dawe: ['Cendono', 'Colo', 'Cranggang', 'Dukuhwaringin', 'Glagah Kulon', 'Japan', 'Kajar', 'Kandangmas', 'Lau', 'Margorejo', 'Piji', 'Puyoh', 'Rejosari', 'Samirejo', 'Soco', 'Tergo', 'Ternadi'],
      Jati: ['Getaspejaten', 'Jati Kulon', 'Jati Wetan', 'Jetiskapuan', 'Loram Kulon', 'Loram Wetan', 'Megawon', 'Ngemplak', 'Pasuruhan Kidul', 'Pasuruhan Lor', 'Ploso', 'Tanjungkarang', 'Tumpangkrasak'],
      Bae: ['Bacin', 'Bae', 'Dersalam', 'Gondangmanis', 'Karangbener', 'Ngembalrejo', 'Panjang', 'Peganjaran', 'Purworejo', 'Sukorejo'],
      Mejobo: ['Golantepus', 'Gulanggulung', 'Hadiwarno', 'Jepang', 'Jojo', 'Kesambi', 'Kirig', 'Mejobo', 'Payaman', 'Temulus', 'Tenggeles'],
      Jekulo: ['Bulungcangkring', 'Bulungkulon', 'Gondoharum', 'Hadipolo', 'Honggosoco', 'Jekulo', 'Klaling', 'Pladen', 'Sadang', 'Sidomulyo', 'Tanjungrejo', 'Terban'],
      Undaan: ['Glagahwaru', 'Kalirejo', 'Karangrowo', 'Kutuk', 'Lambrejo', 'Medini', 'Ngemplak', 'Sambung', 'Terangmas', 'Undaan Kidul', 'Undaan Lor', 'Undaan Tengah', 'Wates', 'Wonosoco'],
    },
    'Kabupaten Demak': {
      Demak: ['Bango', 'Betokan', 'Bintoro', 'Cabean', 'Donorojo', 'Kadilangu', 'Kalicilik', 'Kalikondang', 'Karangmlati', 'Katonsari', 'Kedondong', 'Mangunjiwan', 'Mulyorejo', 'Raji', 'Sedoh', 'Singorejo', 'Tempuran', 'Turirejo'],
      Mijen: ['Bakung', 'Bantengmati', 'Bermi', 'Gempolsongo', 'Geneng', 'Jleper', 'Mijen', 'Ngegot', 'Ngelo Kulon', 'Ngelo Wetan', 'Pasir', 'Pecuk', 'Rejosari', 'Tanggul'],
      Wedung: ['Babas', 'Berahan Kulon', 'Berahan Wetan', 'Bukor', 'Bungo', 'Jetak', 'Jungpasir', 'Jungsemi', 'Kedungkarang', 'Kedungmutih', 'Kendalasem', 'Kenduren', 'Mandung', 'Mutih Kulon', 'Mutih Wetan', 'Ngawen', 'Ruwit', 'Tedunan', 'Tempel', 'Wedung'],
      Bonang: ['Betahwalang', 'Bonangrejo', 'Gebang', 'Gebangarum', 'Jali', 'Jatimulyo', 'Jatirogo', 'Karangrejo', 'Kembangan', 'Krajanbogo', 'Margolinduk', 'Morodemak', 'Poncoharjo', 'Purworejo', 'Serangan', 'Sumberejo', 'Tlogoboyo', 'Tridonorejo', 'Weding', 'Wonosari'],
      Mranggen: ['Bandungrejo', 'Banyumeneng', 'Batursari', 'Brumbung', 'Candisari', 'Jamus', 'Kalitengah', 'Kangkung', 'Karangsono', 'Kebonbatur', 'Kembangarum', 'Menur', 'Mranggen', 'Ngemplak', 'Sumberejo', 'Tamansari', 'Tegalarum', 'Waru', 'Wringinjajar'],
    },
    'Kabupaten Pati': {
      Pati: ['Blaru', 'Dengkek', 'Gajahmati', 'Geritan', 'Kalidoro', 'Kutoharjo', 'Mulyoharjo', 'Mustokoharjo', 'Ngarus', 'Ngepungrejo', 'Panjunan', 'Parenggan', 'Pati Kidul', 'Pati Lor', 'Pati Wetan', 'Payang', 'Plangitan', 'Puri', 'Purworejo', 'Sarirejo', 'Semampir', 'Sidoharjo', 'Sidokerto', 'Sinoman', 'Sugiharjo', 'Tambaharjo', 'Tambahsari', 'Widorokandang', 'Winong'],
      Tayu: ['Bendokaton Kidul', 'Bulungan', 'Dororejo', 'Jepat Kidul', 'Jepat Lor', 'Kalikalong', 'Keboromo', 'Kedungbang', 'Kedungsari', 'Luwang', 'Margomulyo', 'Pakis', 'Pondowan', 'Pundenrejo', 'Purwokerto', 'Sambiroto', 'Sendangrejo', 'Tayu Kulon', 'Tayu Wetan', 'Tendas', 'Tunggalrejo'],
      Juana: ['Agungmulyo', 'Bajan', 'Bakaran Kulon', 'Bakaran Wetan', 'Bendar', 'Bringin', 'Bumirejo', 'Doropayung', 'Dukutalit', 'Gadingrejo', 'Genengmulyo', 'Growong Kidul', 'Growong Lor', 'Jepuro', 'Karang', 'Karangrejo', 'Kauman', 'Kebonsawahan', 'Kedungpancing', 'Kudukeras', 'Langgenharjo', 'Margomulyo', 'Mintomulyo', 'Pajeksan', 'Pekuwon', 'Sejomulyo', 'Tluwah', 'Trimulyo'],
    },
    'Kota Semarang': {
      'Semarang Tengah': ['Bangunharjo', 'Brumbungan', 'Gabahan', 'Jagalan', 'Karangkidul', 'Kauman', 'Kembangsari', 'Kranggan', 'Miroto', 'Pandansari', 'Pekunden', 'Pendrikan Kidul', 'Pendrikan Lor', 'Purwodinatan', 'Sekayu'],
      Tembalang: ['Bulusan', 'Jangli', 'Kedungmundu', 'Kramas', 'Mangunharjo', 'Meteseh', 'Rowosari', 'Sambiroto', 'Sendangguwo', 'Sendangmulyo', 'Tandang', 'Tembalang'],
      Pedurungan: ['Gemah', 'Kalicari', 'Muktiharjo Kidul', 'Palebon', 'Pedurungan Kidul', 'Pedurungan Lor', 'Pedurungan Tengah', 'Penggaron Kidul', 'Plamongan Sari', 'Tlogomulyo', 'Tlogosari Kulon', 'Tlogosari Wetan'],
      Banyumanik: ['Banyumanik', 'Gedawang', 'Jabungan', 'Ngesrep', 'Padangsari', 'Pedalangan', 'Pudakpayung', 'Srondol Kulon', 'Srondol Wetan', 'Sumurboto', 'Tinjomoyo'],
    },
    'Kota Surakarta': {
      Banjarsari: ['Banyuanyar', 'Gilingan', 'Joglo', 'Kadipiro', 'Keprabon', 'Kestalan', 'Ketelan', 'Manahan', 'Mangkubumen', 'Nusukan', 'Punggawan', 'Setabelan', 'Sumber', 'Timuran'],
      Laweyan: ['Bumi', 'Jajar', 'Karangasem', 'Kerten', 'Laweyan', 'Pajang', 'Panularan', 'Penumping', 'Purwosari', 'Sondakan', 'Sriwedari'],
    },
  },
  'DI Yogyakarta': {
    'Kabupaten Sleman': {
      Depok: ['Caturtunggal', 'Condongcatur', 'Maguwoharjo'],
      Mlati: ['Sendangadi', 'Sinduadi', 'Sumberadi', 'Tirtoadi', 'Tlogoadi'],
      Ngaglik: ['Donoharjo', 'Minomartani', 'Sardonoharjo', 'Sariharjo', 'Sinduharjo', 'Sukoharjo'],
    },
    'Kota Yogyakarta': {
      Gondokusuman: ['Baciro', 'Demangan', 'Klitren', 'Kotabaru', 'Terban'],
      Umbulharjo: ['Giwangan', 'Muja Muju', 'Pandeyan', 'Semaki', 'Sorosutan', 'Tahunan', 'Warungboto'],
    },
    'Kabupaten Bantul': {
      Bantul: ['Bantul', 'Palbapang', 'Ringinharjo', 'Sabdodadi', 'Trirenggo'],
      Kasihan: ['Bangunjiwo', 'Ngestiharjo', 'Tamantirto', 'Tirtonirmolo'],
    },
  },
  'Jawa Timur': {
    'Kota Surabaya': {
      Gubeng: ['Airlangga', 'Baratajaya', 'Gubeng', 'Kertajaya', 'Mojo', 'Pucang Sewu'],
      Wonokromo: ['Darmo', 'Jagir', 'Ngagel', 'Ngagelrejo', 'Sawunggaling', 'Wonokromo'],
      Rungkut: ['Kalirungkut', 'Kedung Baruk', 'Medokan Ayu', 'Penjaringan Sari', 'Rungkut Kidul', 'Wonorejo'],
    },
    'Kabupaten Sidoarjo': {
      Sidoarjo: ['Bulusidokare', 'Celep', 'Cemengbakalan', 'Cemengkalang', 'Gebang', 'Jati', 'Kemiri', 'Lebo', 'Magersari', 'Pucang', 'Pucanganom', 'Rangkah Kidul', 'Sarirogo', 'Sekardangan', 'Sidokare', 'Sidoklumpuk', 'Sidokumpul', 'Suko', 'Sumput', 'Urangagung'],
      Waru: ['Berbek', 'Bungurasih', 'Janti', 'Kedungrejo', 'Kepuhkiriman', 'Kureksari', 'Medaeng', 'Ngingas', 'Pepelegi', 'Tambakoso', 'Tambakrejo', 'Tambaksawah', 'Tambaksumur', 'Tropodo', 'Wadungasri', 'Waru', 'Wedoro'],
    },
    'Kota Malang': {
      Klojen: ['Bareng', 'Gading Kasri', 'Kasin', 'Kauman', 'Kiduldalem', 'Klojen', 'Oro-Oro Dowo', 'Penanggungan', 'Rampal Celaket', 'Samaan', 'Sukoharjo'],
      Lowokwaru: ['Dinoyo', 'Jatimulyo', 'Ketawanggede', 'Lowokwaru', 'Merjosari', 'Mojolangu', 'Sumbersari', 'Tasikmadu', 'Tlogomas', 'Tulusrejo', 'Tunggulwulung', 'Tunjungsekar'],
    },
    'Kabupaten Tuban': {
      Tuban: ['Baturetno', 'Doromukti', 'Karangsari', 'Kebonsari', 'Kembangbilo', 'Kingking', 'Kutorejo', 'Latsari', 'Mondokan', 'Perbon', 'Ronggomulyo', 'Sendangharjo', 'Sidomulyo', 'Sidorejo', 'Sugiharjo', 'Sukolilo', 'Sumurgung'],
    },
  },
  'Jawa Barat': {
    'Kota Bandung': {
      Coblong: ['Cipaganti', 'Dago', 'Lebak Gede', 'Lebak Siliwangi', 'Sadang Serang', 'Sekeloa'],
      BandungWetan: ['Cihapit', 'Citarum', 'Tamansari'],
    },
    'Kabupaten Bekasi': {
      'Cikarang Utara': ['Cikarang Kota', 'Harjamekar', 'Karangasih', 'Karangbaru', 'Karangraharja', 'Mekarmukti', 'Pasirgombong', 'Simpangan', 'Tanjungsari', 'Waluya', 'Wangunharja'],
      'Tambun Selatan': ['Jatimulya', 'Lambangjaya', 'Lambangsari', 'Mangunjaya', 'Mekarsari', 'Setiadarma', 'Setiamekar', 'Sumberjaya', 'Tambun', 'Tridayasakti'],
    },
    'Kota Bogor': {
      'Bogor Tengah': ['Babakan', 'Babakan Pasar', 'Cibogor', 'Ciwaringin', 'Gudang', 'Kebon Kalapa', 'Pabaton', 'Paledang', 'Panaragan', 'Sempur', 'Tegallega'],
    },
  },
  'DKI Jakarta': {
    'Kota Jakarta Selatan': {
      'Kebayoran Baru': ['Cipete Utara', 'Gandaria Utara', 'Gunung', 'Kramat Pela', 'Melawai', 'Petogogan', 'Pulo', 'Rawa Barat', 'Selong', 'Senayan'],
      Tebet: ['Bukit Duri', 'Kebon Baru', 'Manggarai', 'Manggarai Selatan', 'Menteng Dalam', 'Tebet Barat', 'Tebet Timur'],
    },
    'Kota Jakarta Timur': {
      Cakung: ['Cakung Barat', 'Cakung Timur', 'Jatinegara', 'Penggilingan', 'Pulo Gebang', 'Rawa Terate', 'Ujung Menteng'],
      'Duren Sawit': ['Duren Sawit', 'Klender', 'Malaka Jaya', 'Malaka Sari', 'Pondok Bambu', 'Pondok Kelapa', 'Pondok Kopi'],
    },
    'Kota Jakarta Pusat': {
      Menteng: ['Cikini', 'Gondangdia', 'Kebon Sirih', 'Menteng', 'Pegangsaan'],
    },
  },
  Banten: {
    'Kota Tangerang': {
      Tangerang: ['Babakan', 'Buaran Indah', 'Cikokol', 'Kelapa Indah', 'Sukaasih', 'Sukarasa', 'Sukasari', 'Tanah Tinggi'],
      Ciledug: ['Paninggilan', 'Paninggilan Utara', 'Parung Serab', 'Sudimara Barat', 'Sudimara Jaya', 'Sudimara Selatan', 'Sudimara Timur', 'Tajur'],
    },
    'Kota Serang': {
      Serang: ['Cimuncang', 'Cipare', 'Kagungan', 'Kaligandu', 'Kotabaru', 'Lontarbaru', 'Lopang', 'Serang', 'Sukawana', 'Sumurpecung', 'Terondol', 'Unyur'],
    },
  },
  'Sumatera Utara': {
    'Kota Medan': {
      'Medan Baru': ['Babura', 'Darat', 'Merdeka', 'Padang Bulan', 'Petisah Hulu', 'Titi Rante'],
    },
  },
  'Kalimantan Timur': {
    'Kota Balikpapan': {
      'Balikpapan Selatan': ['Damai Bahagia', 'Damai Baru', 'Gunung Bahagia', 'Sepinggan', 'Sepinggan Baru', 'Sepinggan Raya', 'Sungai Nangka'],
    },
  },
  'Sulawesi Selatan': {
    'Kota Makassar': {
      Panakkukang: ['Karampuang', 'Karuwisi', 'Karuwisi Utara', 'Masale', 'Pampang', 'Panaikang', 'Pandang', 'Paropo', 'Sinrijala', 'Tamamaung', 'Tello Baru'],
    },
  },
};

export function getProvinces(): string[] {
  return Object.keys(INDONESIAN_REGIONS);
}

export function getKabupatenList(provinsi: string): string[] {
  const prov = INDONESIAN_REGIONS[provinsi];
  return prov ? Object.keys(prov) : [];
}

export function getKecamatanList(provinsi: string, kabupaten: string): string[] {
  const kab = INDONESIAN_REGIONS[provinsi]?.[kabupaten];
  return kab ? Object.keys(kab) : [];
}

export function getDesaList(provinsi: string, kabupaten: string, kecamatan: string): string[] {
  return INDONESIAN_REGIONS[provinsi]?.[kabupaten]?.[kecamatan] ?? [];
}
