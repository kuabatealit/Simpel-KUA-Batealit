export interface VillageSeed {
  username: string;
  namaPetinggi: string;
  gelarDepan: string;
  gelarBelakang: string;
  nip: string;
  kepalaLingkungan: string;
}

export const DEFAULT_VILLAGE_SEEDS: Record<string, VillageSeed> = {
  Bantrung: {
    username: 'desa_bantrung',
    namaPetinggi: 'Ahmad Shodiq',
    gelarDepan: 'H.',
    gelarBelakang: 'S.H.',
    nip: '',
    kepalaLingkungan: 'Kasmani',
  },
  Batealit: {
    username: 'desa_batealit',
    namaPetinggi: 'Muhammad Noor',
    gelarDepan: '',
    gelarBelakang: 'S.Pd.',
    nip: '',
    kepalaLingkungan: 'Subiyanto',
  },
  Bawu: {
    username: 'desa_bawu',
    namaPetinggi: 'Kuzaeni',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Ag.',
    nip: '',
    kepalaLingkungan: 'Supriyadi',
  },
  Bringin: {
    username: 'desa_bringin',
    namaPetinggi: 'Sunarto',
    gelarDepan: '',
    gelarBelakang: 'S.E.',
    nip: '',
    kepalaLingkungan: 'Karsono',
  },
  Geneng: {
    username: 'desa_geneng',
    namaPetinggi: 'Mustain',
    gelarDepan: '',
    gelarBelakang: 'S.H.',
    nip: '',
    kepalaLingkungan: 'Sukirno',
  },
  Mindahan: {
    username: 'desa_mindahan',
    namaPetinggi: 'Abdul Wahid',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Pd.I.',
    nip: '',
    kepalaLingkungan: 'Darmaji',
  },
  'Mindahan Kidul': {
    username: 'desa_mindahankidul',
    namaPetinggi: 'Suyanto',
    gelarDepan: '',
    gelarBelakang: 'S.Sos.',
    nip: '',
    kepalaLingkungan: 'Slamet Riyadi',
  },
  Ngasem: {
    username: 'desa_ngasem',
    namaPetinggi: 'Mulyono',
    gelarDepan: '',
    gelarBelakang: 'S.H.',
    nip: '',
    kepalaLingkungan: 'Wahyudi',
  },
  Pekalongan: {
    username: 'desa_pekalongan',
    namaPetinggi: 'Nur Kholis',
    gelarDepan: 'H.',
    gelarBelakang: 'S.Ag.',
    nip: '',
    kepalaLingkungan: 'Sutrisno',
  },
  Raguklampitan: {
    username: 'desa_raguklampitan',
    namaPetinggi: 'Budi Santoso',
    gelarDepan: '',
    gelarBelakang: 'S.E.',
    nip: '',
    kepalaLingkungan: 'Haryanto',
  },
  Somosari: {
    username: 'desa_somosari',
    namaPetinggi: 'Syaiful Anwar',
    gelarDepan: '',
    gelarBelakang: 'S.Pd.',
    nip: '',
    kepalaLingkungan: 'Joko Susilo',
  },
};

export interface DemoFilingSeed {
  username: string;
  desa: string;
  nomor: string;
  suami: string;
  nikSuami: string;
  istri: string;
  nikIstri: string;
  wali: string;
  tglAkad: string;
  createdAt: string;
}

export const INITIAL_DEMO_FILINGS: DemoFilingSeed[] = [
  {
    username: 'desa_batealit',
    desa: 'Batealit',
    nomor: '474.2 / 141 / XI / 2026',
    suami: 'Ahmad Fauzi',
    nikSuami: '3320041205980001',
    istri: 'Nurul Hidayah',
    nikIstri: '3320046109000004',
    wali: 'Haji Abdul Karim',
    tglAkad: '2026-12-14',
    createdAt: '2026-11-18 09:15:00',
  },
  {
    username: 'desa_mindahan',
    desa: 'Mindahan',
    nomor: '474.2 / 089 / XI / 2026',
    suami: 'Muhammad Rizqi Pratama',
    nikSuami: '3320041807970002',
    istri: 'Siti Fatimatuz Zahro',
    nikIstri: '3320045403990005',
    wali: 'Kiai Sholehuddin',
    tglAkad: '2026-12-21',
    createdAt: '2026-11-20 10:40:00',
  },
  {
    username: 'desa_bawu',
    desa: 'Bawu',
    nomor: '474.2 / 112 / XI / 2026',
    suami: 'Bagus Setiawan',
    nikSuami: '3320042211960003',
    istri: 'Dewi Lestari',
    nikIstri: '3320046506010006',
    wali: 'Suharto',
    tglAkad: '2026-12-28',
    createdAt: '2026-11-22 08:25:00',
  },
];
