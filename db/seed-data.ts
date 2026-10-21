// Static demo content. The universe is Marvel's, moved to Paris and its
// inner suburbs so the maps have something to show.

export const DEMO_PASSWORD = "Demo1234!";

export type Place = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
};

export const PLACES: Place[] = [
  { name: "Châtelet", street: "Rue de Rivoli", postalCode: "75001", city: "Paris", lat: 48.8584, lng: 2.347 },
  { name: "Montmartre", street: "Rue Lepic", postalCode: "75018", city: "Paris", lat: 48.8867, lng: 2.3375 },
  { name: "Bastille", street: "Rue de la Roquette", postalCode: "75011", city: "Paris", lat: 48.8545, lng: 2.3735 },
  { name: "République", street: "Boulevard du Temple", postalCode: "75003", city: "Paris", lat: 48.8662, lng: 2.3655 },
  { name: "Belleville", street: "Rue de Belleville", postalCode: "75020", city: "Paris", lat: 48.8722, lng: 2.3828 },
  { name: "Montparnasse", street: "Boulevard du Montparnasse", postalCode: "75014", city: "Paris", lat: 48.8421, lng: 2.3219 },
  { name: "Bercy", street: "Rue de Bercy", postalCode: "75012", city: "Paris", lat: 48.8386, lng: 2.3826 },
  { name: "Quartier Latin", street: "Rue Saint-Jacques", postalCode: "75005", city: "Paris", lat: 48.8493, lng: 2.3445 },
  { name: "Champs-Élysées", street: "Avenue des Champs-Élysées", postalCode: "75008", city: "Paris", lat: 48.8698, lng: 2.3076 },
  { name: "Trocadéro", street: "Avenue Kléber", postalCode: "75016", city: "Paris", lat: 48.8648, lng: 2.2905 },
  { name: "La Défense", street: "Parvis de la Défense", postalCode: "92800", city: "Puteaux", lat: 48.8918, lng: 2.238 },
  { name: "Batignolles", street: "Rue des Batignolles", postalCode: "75017", city: "Paris", lat: 48.8873, lng: 2.3166 },
  { name: "Gare du Nord", street: "Boulevard de Magenta", postalCode: "75010", city: "Paris", lat: 48.8792, lng: 2.3565 },
  { name: "Canal Saint-Martin", street: "Quai de Valmy", postalCode: "75010", city: "Paris", lat: 48.871, lng: 2.3655 },
  { name: "Saint-Germain", street: "Boulevard Saint-Germain", postalCode: "75006", city: "Paris", lat: 48.8535, lng: 2.3335 },
  { name: "Butte-aux-Cailles", street: "Rue de la Butte-aux-Cailles", postalCode: "75013", city: "Paris", lat: 48.827, lng: 2.35 },
  { name: "Le Marais", street: "Rue des Francs-Bourgeois", postalCode: "75004", city: "Paris", lat: 48.8583, lng: 2.3602 },
  { name: "Opéra", street: "Boulevard Haussmann", postalCode: "75009", city: "Paris", lat: 48.8738, lng: 2.3319 },
  { name: "Saint-Denis", street: "Rue de la République", postalCode: "93200", city: "Saint-Denis", lat: 48.9362, lng: 2.3574 },
  { name: "Boulogne", street: "Route de la Reine", postalCode: "92100", city: "Boulogne-Billancourt", lat: 48.8397, lng: 2.2399 },
  { name: "Vincennes", street: "Avenue de Paris", postalCode: "94300", city: "Vincennes", lat: 48.8475, lng: 2.439 },
  { name: "Nation", street: "Cours de Vincennes", postalCode: "75012", city: "Paris", lat: 48.8476, lng: 2.3985 },
];

export type DemoHero = {
  key: string;
  alias: string;
  firstName: string;
  lastName: string;
  civility: "MR" | "MRS" | "OTHER";
  birthDate: string;
  bio: string;
  powers: string[];
  place: string;
  movies: string[];
  status: "APPROVED" | "PENDING";
};

export const HEROES: DemoHero[] = [
  {
    key: "spiderman",
    alias: "Spider-Man",
    firstName: "Peter",
    lastName: "Parker",
    civility: "MR",
    birthDate: "2001-08-10",
    bio: "Votre sympathique voisin. Mon sens d'araignée me prévient du danger avant tout le monde : j'interviens vite, surtout sur les toits.",
    powers: ["Sens d'araignée", "Agilité surhumaine", "Lance-toiles", "Adhérence aux parois"],
    place: "Montmartre",
    movies: ["tt2250912", "tt6320628", "tt10872600", "tt3498820", "tt4154756", "tt4154796"],
    status: "APPROVED",
  },
  {
    key: "ironman",
    alias: "Iron Man",
    firstName: "Tony",
    lastName: "Stark",
    civility: "MR",
    birthDate: "1970-05-29",
    bio: "Génie, milliardaire, philanthrope. Mon armure couvre l'Île-de-France en moins de quatre minutes.",
    powers: ["Armure high-tech", "Vol supersonique", "Rayons répulseurs", "Génie en ingénierie"],
    place: "La Défense",
    movies: ["tt0371746", "tt1228705", "tt1300854", "tt0848228", "tt2395427", "tt3498820", "tt4154756", "tt4154796"],
    status: "APPROVED",
  },
  {
    key: "captain",
    alias: "Captain America",
    firstName: "Steve",
    lastName: "Rogers",
    civility: "MR",
    birthDate: "1918-07-04",
    bio: "Je peux faire ça toute la journée. Spécialiste des prises d'otages et de la protection des civils.",
    powers: ["Force surhumaine", "Bouclier en vibranium", "Stratégie militaire", "Endurance accrue"],
    place: "Bastille",
    movies: ["tt0458339", "tt1843866", "tt3498820", "tt0848228", "tt2395427", "tt4154796"],
    status: "APPROVED",
  },
  {
    key: "widow",
    alias: "Black Widow",
    firstName: "Natasha",
    lastName: "Romanoff",
    civility: "MRS",
    birthDate: "1984-11-22",
    bio: "Ancienne espionne. Infiltration, filature et neutralisation discrète des réseaux criminels.",
    powers: ["Espionnage", "Arts martiaux", "Infiltration", "Armes de précision"],
    place: "Opéra",
    movies: ["tt3480822", "tt1228705", "tt0848228", "tt1843866", "tt4154796"],
    status: "APPROVED",
  },
  {
    key: "thor",
    alias: "Thor",
    firstName: "Thor",
    lastName: "Odinson",
    civility: "MR",
    birthDate: "1983-03-11",
    bio: "Dieu du tonnerre, protecteur de Midgard. Mjolnir me ramène là où l'on a besoin de moi.",
    powers: ["Mjolnir", "Contrôle de la foudre", "Force divine", "Vol"],
    place: "Trocadéro",
    movies: ["tt0800369", "tt1981115", "tt3501632", "tt0848228", "tt4154756"],
    status: "APPROVED",
  },
  {
    key: "hulk",
    alias: "Hulk",
    firstName: "Bruce",
    lastName: "Banner",
    civility: "MR",
    birthDate: "1969-12-18",
    bio: "Physicien le jour. Pour les situations où il faut soulever un bus ou arrêter un char.",
    powers: ["Force illimitée", "Régénération", "Résistance extrême", "Bonds géants"],
    place: "Quartier Latin",
    movies: ["tt0800080", "tt0848228", "tt3501632", "tt4154796"],
    status: "APPROVED",
  },
  {
    key: "marvel",
    alias: "Captain Marvel",
    firstName: "Carol",
    lastName: "Danvers",
    civility: "MRS",
    birthDate: "1979-04-24",
    bio: "Pilote de chasse devenue la héroïne la plus puissante de la galaxie. Je couvre la petite couronne.",
    powers: ["Projection d'énergie", "Vol spatial", "Force cosmique", "Absorption d'énergie"],
    place: "Vincennes",
    movies: ["tt4154664", "tt4154796"],
    status: "APPROVED",
  },
  {
    key: "panther",
    alias: "Black Panther",
    firstName: "T'Challa",
    lastName: "Udaku",
    civility: "MR",
    birthDate: "1977-02-16",
    bio: "Roi du Wakanda, en mission diplomatique à Paris. Wakanda forever.",
    powers: ["Combinaison en vibranium", "Sens surdéveloppés", "Agilité féline", "Combat rapproché"],
    place: "Belleville",
    movies: ["tt1825683", "tt3498820", "tt4154756"],
    status: "APPROVED",
  },
  {
    key: "strange",
    alias: "Doctor Strange",
    firstName: "Stephen",
    lastName: "Strange",
    civility: "MR",
    birthDate: "1976-11-18",
    bio: "Sorcier suprême. Les menaces mystiques et les portails interdimensionnels sont ma spécialité.",
    powers: ["Arts mystiques", "Téléportation", "Manipulation du temps", "Projection astrale"],
    place: "Saint-Germain",
    movies: ["tt1211837", "tt4154756", "tt10872600"],
    status: "APPROVED",
  },
  {
    key: "wanda",
    alias: "Scarlet Witch",
    firstName: "Wanda",
    lastName: "Maximoff",
    civility: "MRS",
    birthDate: "1989-02-10",
    bio: "La magie du chaos au service des Parisiens. J'interviens surtout sur les attentats.",
    powers: ["Magie du chaos", "Télékinésie", "Manipulation de la réalité", "Télépathie"],
    place: "Le Marais",
    movies: ["tt2395427", "tt3498820", "tt4154756", "tt9419884"],
    status: "APPROVED",
  },
  {
    key: "msmarvel",
    alias: "Ms. Marvel",
    firstName: "Kamala",
    lastName: "Khan",
    civility: "MRS",
    birthDate: "2006-10-02",
    bio: "Fan absolue des Avengers, je veux protéger mon quartier de Saint-Denis.",
    powers: ["Polymorphisme", "Poings géants", "Guérison accélérée"],
    place: "Saint-Denis",
    movies: [],
    status: "PENDING",
  },
  {
    key: "antman",
    alias: "Ant-Man",
    firstName: "Scott",
    lastName: "Lang",
    civility: "MR",
    birthDate: "1979-04-06",
    bio: "Ancien cambrioleur repenti. Je rétrécis, je grandis, je parle aux fourmis.",
    powers: ["Changement de taille", "Contrôle des fourmis", "Ingénierie"],
    place: "Boulogne",
    movies: [],
    status: "PENDING",
  },
];

// Movies waiting for a moderator's approval in the demo.
export const PENDING_HERO_MOVIES: { hero: string; imdbId: string }[] = [
  { hero: "thor", imdbId: "tt10648342" },
  { hero: "marvel", imdbId: "tt10676048" },
];

export type DemoMovie = {
  imdbId: string;
  title: string;
  year: number;
  synopsis: string;
};

export const MOVIES: DemoMovie[] = [
  { imdbId: "tt0371746", title: "Iron Man", year: 2008, synopsis: "Capturé en Afghanistan, l'industriel Tony Stark construit une armure pour s'évader, puis décide de la perfectionner pour combattre le mal." },
  { imdbId: "tt0800080", title: "L'Incroyable Hulk", year: 2008, synopsis: "Traqué par l'armée, Bruce Banner cherche un remède à la transformation qui le change en créature verte lorsqu'il perd son sang-froid." },
  { imdbId: "tt1228705", title: "Iron Man 2", year: 2010, synopsis: "Tony Stark a révélé son identité au monde. Le gouvernement réclame son armure, tandis qu'un ennemi surgi du passé prépare sa vengeance." },
  { imdbId: "tt0800369", title: "Thor", year: 2011, synopsis: "Banni d'Asgard par son père Odin, le puissant Thor est envoyé sur Terre où il doit apprendre l'humilité pour retrouver son marteau." },
  { imdbId: "tt0458339", title: "Captain America : First Avenger", year: 2011, synopsis: "En 1942, le frêle Steve Rogers devient un super-soldat grâce à un sérum expérimental et affronte Crâne Rouge et l'organisation Hydra." },
  { imdbId: "tt0848228", title: "Avengers", year: 2012, synopsis: "Nick Fury réunit une équipe de super-héros pour empêcher Loki, frère de Thor, de soumettre la Terre avec une armée extraterrestre." },
  { imdbId: "tt1300854", title: "Iron Man 3", year: 2013, synopsis: "Hanté par la bataille de New York, Tony Stark affronte le Mandarin, un terroriste qui détruit tout ce qui lui est cher." },
  { imdbId: "tt1981115", title: "Thor : Le Monde des ténèbres", year: 2013, synopsis: "Thor doit s'allier à Loki pour sauver les Neuf Royaumes d'un ennemi plus ancien que l'univers lui-même." },
  { imdbId: "tt1843866", title: "Captain America : Le Soldat de l'hiver", year: 2014, synopsis: "Steve Rogers découvre une conspiration au cœur du S.H.I.E.L.D. et affronte un mystérieux assassin venu de son passé." },
  { imdbId: "tt2395427", title: "Avengers : L'Ère d'Ultron", year: 2015, synopsis: "Une intelligence artificielle créée pour protéger la paix décide que l'humanité est la menace. Les Avengers doivent l'arrêter." },
  { imdbId: "tt3498820", title: "Captain America : Civil War", year: 2016, synopsis: "Les accords de Sokovie divisent les Avengers en deux camps : celui d'Iron Man et celui de Captain America." },
  { imdbId: "tt1211837", title: "Doctor Strange", year: 2016, synopsis: "Après un accident, un brillant neurochirurgien découvre le monde caché des arts mystiques et des dimensions parallèles." },
  { imdbId: "tt2250912", title: "Spider-Man : Homecoming", year: 2017, synopsis: "Encadré par Tony Stark, le jeune Peter Parker tente de concilier lycée et vie de super-héros face au redoutable Vautour." },
  { imdbId: "tt3501632", title: "Thor : Ragnarok", year: 2017, synopsis: "Emprisonné à l'autre bout de l'univers, Thor doit gagner un combat de gladiateurs contre Hulk pour sauver Asgard de Hela." },
  { imdbId: "tt1825683", title: "Black Panther", year: 2018, synopsis: "Devenu roi du Wakanda, T'Challa voit son trône contesté par Killmonger, un adversaire déterminé à changer le monde." },
  { imdbId: "tt4154756", title: "Avengers : Infinity War", year: 2018, synopsis: "Thanos rassemble les six Pierres d'Infinité pour anéantir la moitié de l'univers. Les Avengers doivent tout sacrifier pour l'arrêter." },
  { imdbId: "tt4154664", title: "Captain Marvel", year: 2019, synopsis: "Dans les années 1990, Carol Danvers découvre son passé de pilote terrienne au cœur d'une guerre galactique entre Kree et Skrulls." },
  { imdbId: "tt4154796", title: "Avengers : Endgame", year: 2019, synopsis: "Après la victoire de Thanos, les Avengers survivants tentent l'impossible pour inverser la catastrophe." },
  { imdbId: "tt6320628", title: "Spider-Man : Far From Home", year: 2019, synopsis: "En voyage scolaire en Europe, Peter Parker doit faire face à des créatures élémentaires et au mystérieux Mysterio." },
  { imdbId: "tt3480822", title: "Black Widow", year: 2021, synopsis: "Natasha Romanoff affronte les zones d'ombre de son passé d'espionne et la Chambre Rouge qui l'a formée." },
  { imdbId: "tt10872600", title: "Spider-Man : No Way Home", year: 2021, synopsis: "Son identité révélée, Peter Parker demande l'aide du Docteur Strange. Le sort tourne mal et ouvre la porte au multivers." },
  { imdbId: "tt9419884", title: "Doctor Strange in the Multiverse of Madness", year: 2022, synopsis: "Le Docteur Strange explore les dangers du multivers face à une menace inattendue : la Sorcière Rouge." },
  { imdbId: "tt10648342", title: "Thor : Love and Thunder", year: 2022, synopsis: "Thor cherche la paix intérieure, mais Gorr, le boucher des dieux, menace d'exterminer toutes les divinités." },
  { imdbId: "tt10676048", title: "The Marvels", year: 2023, synopsis: "Carol Danvers, Monica Rambeau et Kamala Khan échangent leurs places à chaque usage de leurs pouvoirs et doivent faire équipe." },
];

export type DemoVillain = {
  alias: string;
  firstName: string | null;
  lastName: string | null;
  description: string;
  mainSector: string;
  specialties: string[];
  imprisoned: boolean;
};

export const VILLAINS: DemoVillain[] = [
  { alias: "Thanos", firstName: null, lastName: null, description: "Le Titan Fou. Convaincu que l'univers est surpeuplé, il ne recule devant aucun massacre.", mainSector: "La Défense", specialties: ["TERROR_ATTACK", "MURDER"], imprisoned: false },
  { alias: "Loki", firstName: "Loki", lastName: "Laufeyson", description: "Dieu de la malice, maître de l'illusion et de la manipulation. Souvent aperçu près des lieux de pouvoir.", mainSector: "Opéra", specialties: ["THEFT", "HOSTAGE_TAKING"], imprisoned: false },
  { alias: "Le Bouffon Vert", firstName: "Norman", lastName: "Osborn", description: "Industriel rendu fou par un sérum expérimental. Attaque en planeur avec des bombes citrouilles.", mainSector: "Montmartre", specialties: ["TERROR_ATTACK", "ATTEMPTED_MURDER"], imprisoned: true },
  { alias: "Docteur Octopus", firstName: "Otto", lastName: "Octavius", description: "Scientifique doté de quatre bras mécaniques. Cible les laboratoires et les banques.", mainSector: "Bercy", specialties: ["BURGLARY", "HOSTAGE_TAKING"], imprisoned: false },
  { alias: "Crâne Rouge", firstName: "Johann", lastName: "Schmidt", description: "Chef historique d'Hydra. Organise enlèvements et attentats pour déstabiliser les institutions.", mainSector: "Champs-Élysées", specialties: ["TERROR_ATTACK", "KIDNAPPING"], imprisoned: true },
  { alias: "Ultron", firstName: null, lastName: null, description: "Intelligence artificielle hostile qui se réplique dans des corps robotiques.", mainSector: "La Défense", specialties: ["TERROR_ATTACK"], imprisoned: true },
  { alias: "Venom", firstName: "Eddie", lastName: "Brock", description: "Symbiote extraterrestre lié à un journaliste. Imprévisible et extrêmement violent.", mainSector: "Belleville", specialties: ["ATTEMPTED_MURDER", "THEFT"], imprisoned: false },
  { alias: "Le Caïd", firstName: "Wilson", lastName: "Fisk", description: "Parrain du crime organisé. Racket, cambriolages et séquestrations commanditées.", mainSector: "Champs-Élysées", specialties: ["BURGLARY", "KIDNAPPING"], imprisoned: false },
  { alias: "Le Vautour", firstName: "Adrian", lastName: "Toomes", description: "Ferrailleur équipé d'ailes mécaniques. Spécialiste des vols de technologies sensibles.", mainSector: "Gare du Nord", specialties: ["THEFT", "BURGLARY"], imprisoned: true },
  { alias: "Mysterio", firstName: "Quentin", lastName: "Beck", description: "Ancien technicien d'effets spéciaux. Ses illusions servent à couvrir des vols spectaculaires.", mainSector: "Châtelet", specialties: ["THEFT", "OTHER"], imprisoned: false },
  { alias: "Hela", firstName: null, lastName: null, description: "Déesse de la mort. Ses rares apparitions laissent des dégâts considérables.", mainSector: "Saint-Denis", specialties: ["MURDER", "TERROR_ATTACK"], imprisoned: false },
  { alias: "Killmonger", firstName: "Erik", lastName: "Stevens", description: "Ancien soldat d'élite. Prises d'otages méthodiques et préparées.", mainSector: "Bastille", specialties: ["ATTEMPTED_MURDER", "HOSTAGE_TAKING"], imprisoned: true },
  { alias: "Electro", firstName: "Max", lastName: "Dillon", description: "Ancien électricien capable de manipuler l'électricité. Provoque des pannes géantes.", mainSector: "Bercy", specialties: ["TERROR_ATTACK", "THEFT"], imprisoned: false },
  { alias: "Le Rhino", firstName: "Aleksei", lastName: "Sytsevich", description: "Homme de main en armure blindée. Fonce dans les vitrines des bijouteries.", mainSector: "République", specialties: ["BURGLARY", "THEFT"], imprisoned: false },
];

export type DemoCitizen = {
  key: string;
  email: string;
  civility: "MR" | "MRS" | "OTHER";
  firstName: string;
  lastName: string;
  birthDate: string;
  place: string;
  verified: boolean;
  activated: boolean;
  disabled?: boolean;
};

export const CITIZENS: DemoCitizen[] = [
  { key: "camille", email: "citoyen@heros-sos.test", civility: "MRS", firstName: "Camille", lastName: "Martin", birthDate: "1992-04-14", place: "République", verified: true, activated: true },
  { key: "lucas", email: "lucas.bernard@heros-sos.test", civility: "MR", firstName: "Lucas", lastName: "Bernard", birthDate: "1988-09-02", place: "Bastille", verified: true, activated: true },
  { key: "lea", email: "lea.dubois@heros-sos.test", civility: "MRS", firstName: "Léa", lastName: "Dubois", birthDate: "1995-01-23", place: "Montmartre", verified: true, activated: true },
  { key: "hugo", email: "hugo.thomas@heros-sos.test", civility: "MR", firstName: "Hugo", lastName: "Thomas", birthDate: "1979-06-30", place: "Bercy", verified: true, activated: true },
  { key: "chloe", email: "chloe.robert@heros-sos.test", civility: "MRS", firstName: "Chloé", lastName: "Robert", birthDate: "2000-12-05", place: "Belleville", verified: false, activated: true },
  { key: "nathan", email: "nathan.richard@heros-sos.test", civility: "MR", firstName: "Nathan", lastName: "Richard", birthDate: "1985-03-17", place: "Opéra", verified: true, activated: true },
  { key: "manon", email: "manon.petit@heros-sos.test", civility: "MRS", firstName: "Manon", lastName: "Petit", birthDate: "1998-07-21", place: "Saint-Germain", verified: false, activated: true },
  { key: "ines", email: "ines.durand@heros-sos.test", civility: "MRS", firstName: "Inès", lastName: "Durand", birthDate: "2003-02-11", place: "Vincennes", verified: false, activated: false },
  { key: "kevin", email: "kevin.moreau@heros-sos.test", civility: "MR", firstName: "Kévin", lastName: "Moreau", birthDate: "1990-10-09", place: "Châtelet", verified: false, activated: true, disabled: true },
];

export const INCIDENT_DESCRIPTIONS: Record<string, string[]> = {
  THEFT: [
    "Un individu masqué a arraché le sac d'une passante puis a escaladé la façade à une vitesse inhumaine.",
    "Vol de matériel électronique dans un magasin : le suspect a disparu dans un nuage de fumée verte.",
    "Plusieurs distributeurs vidés en même temps, des témoins parlent d'ailes mécaniques.",
  ],
  BURGLARY: [
    "Bijouterie dévalisée, la vitrine blindée a été enfoncée d'un seul coup.",
    "Cambriolage d'un laboratoire de recherche : des bras métalliques ont été aperçus par une fenêtre.",
    "Coffres d'une banque ouverts pendant une coupure de courant générale du quartier.",
  ],
  MURDER: [
    "Corps retrouvé près d'une ruelle, des témoins décrivent une silhouette entourée d'une aura sombre.",
    "Un vigile a été tué lors d'une attaque nocturne, l'agresseur s'est volatilisé.",
  ],
  ATTEMPTED_MURDER: [
    "Un homme a été attaqué par une créature noire couverte de tentacules, il est blessé mais conscient.",
    "Tir d'énergie dirigé vers un passant devant une terrasse, la victime s'est réfugiée dans un café.",
    "Agression violente dans le métro, l'assaillant semble doté d'une force anormale.",
  ],
  TERROR_ATTACK: [
    "Explosion sur le parvis, plusieurs bombes en forme de citrouille ont été lancées depuis un planeur.",
    "Panne électrique géante et arcs électriques visibles au-dessus du boulevard, la foule panique.",
    "Des drones robotisés attaquent les vitrines et les véhicules, plusieurs blessés.",
  ],
  HOSTAGE_TAKING: [
    "Une quinzaine de personnes retenues dans une agence bancaire par un individu armé.",
    "Un bus a été immobilisé, le conducteur et les passagers sont retenus à l'intérieur.",
  ],
  KIDNAPPING: [
    "Une adolescente a été enlevée à la sortie du lycée, embarquée dans un van noir sans plaque.",
    "Un chef d'entreprise séquestré dans son bureau, les accès de l'immeuble sont bloqués.",
  ],
  ATTEMPTED_KIDNAPPING: [
    "Tentative d'enlèvement d'un enfant au square, l'agresseur a pris la fuite par les toits.",
    "Deux hommes ont tenté de faire monter de force une passante dans une voiture.",
  ],
  OTHER: [
    "Phénomène étrange : un portail lumineux s'est ouvert au milieu de la place, des objets en sortent.",
    "Illusions géantes projetées sur les façades, plusieurs automobilistes ont perdu le contrôle.",
  ],
};

export const REVIEW_COMMENTS: { rating: number; comment: string | null }[] = [
  { rating: 5, comment: "Intervention ultra rapide, j'ai à peine eu le temps de raccrocher. Merci !" },
  { rating: 5, comment: "Calme, efficace et rassurant avec les enfants. Un vrai héros." },
  { rating: 4, comment: "Très efficace, même si quelques vitrines n'ont pas survécu." },
  { rating: 5, comment: null },
  { rating: 4, comment: "Arrivé en moins de cinq minutes, le suspect n'a eu aucune chance." },
  { rating: 3, comment: "Le problème est réglé mais il a fallu attendre un moment." },
  { rating: 5, comment: "Il a pris le temps de rassurer tout le monde après coup, merci." },
  { rating: 4, comment: null },
  { rating: 2, comment: "Le vilain s'est échappé et personne ne nous a tenus informés." },
  { rating: 5, comment: "Impressionnant. Toute la rue a applaudi." },
];

export const HERO_REPLIES = [
  "Merci à vous d'avoir donné l'alerte aussi vite, ça change tout.",
  "Content que tout le monde soit sain et sauf !",
  "Désolé pour l'attente, nous étions sur une autre intervention. On s'améliore.",
];

export const ARTICLES: { title: string; slug: string; html: string; daysAgo: number | null }[] = [
  {
    title: "Heros-SOS est en ligne : comment déclarer un incident",
    slug: "heros-sos-est-en-ligne",
    daysAgo: 45,
    html: "<p>La plateforme <strong>Heros-SOS</strong> rapproche enfin les citoyens et les super-héros. Depuis votre téléphone, un appui sur le buzzer suffit pour alerter les héros disponibles autour de vous.</p><h2>Trois gestes à retenir</h2><ol><li>Mettez-vous en sécurité.</li><li>Appuyez sur le buzzer SOS et confirmez le type d'incident.</li><li>Suivez l'intervention en direct depuis l'application.</li></ol><p>Les modérateurs vérifient chaque signalement pour éviter les doublons.</p>",
  },
  {
    title: "Bilan du mois : les vilains sous les verrous",
    slug: "bilan-du-mois-vilains-sous-les-verrous",
    daysAgo: 12,
    html: "<p>Ce mois-ci, nos super-héros ont mis fin aux agissements du <strong>Vautour</strong> et de <strong>Killmonger</strong>. Les cambriolages ont baissé de 18 % dans le nord-est parisien.</p><blockquote><p>« Chaque alerte compte. » — Captain America</p></blockquote><p>Merci aux citoyens qui ont pris le temps de noter les interventions : vos avis aident les héros à progresser.</p>",
  },
  {
    title: "Bien noter un super-héros après une intervention",
    slug: "bien-noter-un-super-heros",
    daysAgo: 4,
    html: "<p>Après chaque intervention terminée, vous recevez un email pour évaluer le héros qui est intervenu. La note sur 5 et le commentaire sont visibles sur sa page de réputation.</p><ul><li>Restez factuel et courtois.</li><li>Les commentaires injurieux sont masqués par la modération.</li><li>Le héros peut vous répondre publiquement.</li></ul>",
  },
  {
    title: "Brouillon : préparer son quartier à une attaque de grande ampleur",
    slug: "preparer-son-quartier",
    daysAgo: null,
    html: "<p>Article en cours de rédaction.</p>",
  },
];
