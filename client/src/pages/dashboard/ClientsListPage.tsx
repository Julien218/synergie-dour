import { useState, useMemo } from "preact/hooks";
import { Search, Users, ToggleLeft, ToggleRight, Download, RefreshCw } from "lucide-react";

// Données brutes du Sheets (884 commerçants)
const RAW_CLIENTS = [
  {
    "id": 1,
    "type": "Accessoires voitures",
    "nom": "Auto Part à Dour",
    "adresse": "Rue des Canadiens, 134",
    "localite": "7370 - DOUR",
    "telephone": "Personnelle : +3269/54.54.44   Professionnelle: +3265/65.17.18",
    "email": "info@autopartsdour.be",
    "actif": true
  },
  {
    "id": 2,
    "type": "Accoucheuse",
    "nom": "Djemal Yasmina",
    "adresse": "Rue Emile Cornez, 35",
    "localite": "7370 - DOUR",
    "telephone": "0478/28.12.05",
    "email": "yasmina@votredour.be",
    "actif": true
  },
  {
    "id": 3,
    "type": "Achat et vente d'antiquités",
    "nom": "Di domenico Grégory",
    "adresse": "Rue du roi albert, 75",
    "localite": "7370 - DOUR",
    "telephone": "0478/39.93.34",
    "email": "https://www.antiquites-gregory.com (Contacte par mail via son site WEB)",
    "actif": true
  },
  {
    "id": 4,
    "type": "Activité de gestion & d'administration de holding",
    "nom": "Dour Vancau SA",
    "adresse": "Rue de France,27",
    "localite": "7370 - DOUR",
    "telephone": "065/63.36.28",
    "email": "??",
    "actif": true
  },
  {
    "id": 5,
    "type": "Activité sportive",
    "nom": "Every activities ASBL",
    "adresse": "Chemin de Thulin, 10",
    "localite": "7370 - DOUR",
    "telephone": "0474/44.15.54",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 6,
    "type": "Activités multi-services",
    "nom": "Atout Services SCRL",
    "adresse": "Rue Grande, 65",
    "localite": "7370 - DOUR",
    "telephone": "/ Mil&va babystore ???",
    "email": "/",
    "actif": true
  },
  {
    "id": 7,
    "type": "Activités musicales",
    "nom": "S.R.F.D. ASBL",
    "adresse": "Grand Place, 6",
    "localite": "7370 - DOUR",
    "telephone": "??",
    "email": "faillite ???",
    "actif": true
  },
  {
    "id": 8,
    "type": "Adaptations des véhicules/Transport de personnes à mobilité réduite",
    "nom": "Handicap-Car SPRL",
    "adresse": "Rue du Cimetière, 45",
    "localite": "7370 - DOUR",
    "telephone": "065/63.11.92",
    "email": "info@handicap-car.be",
    "actif": true
  },
  {
    "id": 9,
    "type": "Administratif",
    "nom": "S.F.I.S.D.Dour SPRL",
    "adresse": "Rue Alfred Defuisseaux, 7",
    "localite": "7370 - DOUR",
    "telephone": "0479/89.29.96",
    "email": "Donnée Non disponible  (liquidation depuis le 09/2025)",
    "actif": true
  },
  {
    "id": 10,
    "type": "Agence de communication/Publicité",
    "nom": "Trilateral SCRI",
    "adresse": "Avenue Jules Sartieaux, 6 B",
    "localite": "7370 - DOUR",
    "telephone": "0474/21.82.27",
    "email": "info@trilateral.be",
    "actif": true
  },
  {
    "id": 11,
    "type": "Agence de pari",
    "nom": "Derby SA (765)",
    "adresse": "Rue Grande, 29",
    "localite": "7370 - DOUR",
    "telephone": "065/67.24.84",
    "email": "Mail pas disopnible",
    "actif": true
  },
  {
    "id": 12,
    "type": "Agence de voyage",
    "nom": "Amoudys Traval SPRL",
    "adresse": "Rue du général Leman 27/1",
    "localite": "7370 - DOUR",
    "telephone": "065/65.08.80",
    "email": "amoudystravel@skynet.be",
    "actif": true
  },
  {
    "id": 13,
    "type": "Agence immobilière",
    "nom": "Century 21 Decroly",
    "adresse": "pas d'agence century 21",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 14,
    "type": "Agence sportive",
    "nom": "All in fitness SPRL",
    "adresse": "/",
    "localite": "7370 - DOUR",
    "telephone": "définitevement fermé",
    "email": "/",
    "actif": true
  },
  {
    "id": 15,
    "type": "Agent commercial",
    "nom": "Group knives sachinidis SPRL",
    "adresse": "Rue d'élouges, 47",
    "localite": "7370 - DOUR",
    "telephone": "0475/37.60.20   ou 065/63.15.38",
    "email": "gks.kai@gmail.com",
    "actif": true
  },
  {
    "id": 16,
    "type": "Agent commercial en commerce de meubles,…",
    "nom": "Raeekelboom Rudy",
    "adresse": "Rue de la Frontière, 422",
    "localite": "7370 - DOUR",
    "telephone": "0475/28.25.44",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 17,
    "type": "Agriculteur",
    "nom": "Ferme Coolsaet-wittouck S.Agricole",
    "adresse": "Route de Quiévrain, 3",
    "localite": "7370 - DOUR",
    "telephone": "065/63.28.32  ou 0470/89.90.33",
    "email": "https://hainaut-terredegouts.be/producteur/ferme-coolsaet-au-pavillon/     (Contacte par mail via le site web)",
    "actif": true
  },
  {
    "id": 18,
    "type": "Agriculteur",
    "nom": "Sagri Stievenart Gray S.Agr",
    "adresse": "/",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 19,
    "type": "Agriculteur",
    "nom": "Soc. Van & Co",
    "adresse": "Rue basse,164",
    "localite": "7370 - DOUR",
    "telephone": "0475/35.27.68",
    "email": "contacte par whataspp",
    "actif": true
  },
  {
    "id": 20,
    "type": "Agriculteur",
    "nom": "Denis Jean-Baptiste",
    "adresse": "Rue Basse,166B",
    "localite": "7370 - DOUR",
    "telephone": "065/78.12.80 ou 065/65.53.05",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 21,
    "type": "Agriculteur",
    "nom": "Ferme Biologique",
    "adresse": "Rue Cauderloo,14",
    "localite": "7370 - DOUR",
    "telephone": "0479/32.76.57 ou 065/65.42.58",
    "email": "Bernard.brouckaert@skynet.be",
    "actif": true
  },
  {
    "id": 22,
    "type": "Agriculteur",
    "nom": "Dubruille Frank",
    "adresse": "Rue Culot Quezo,14",
    "localite": "7370 - DOUR",
    "telephone": "065/65.42.61",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 23,
    "type": "Agriculteur",
    "nom": "De Geyter Marc",
    "adresse": "Rue d'Offignies, 14",
    "localite": "7370 - DOUR",
    "telephone": "065/75.55.34",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 24,
    "type": "Agriculteur",
    "nom": "Pouille Olivier",
    "adresse": "Rue de Bavay,40 / (adresse entreprise:  rue du vert pignon 8 7387 Erquennes)",
    "localite": "7370 - DOUR",
    "telephone": "0476/92.18.82",
    "email": "mavanquick@skynet.be",
    "actif": true
  },
  {
    "id": 25,
    "type": "Agriculteur",
    "nom": "S.AGR. Vandecasteele-Lemaire",
    "adresse": "Rue de Belle Vue,12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.44.60",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 26,
    "type": "Agriculteur",
    "nom": "Nouvelle Pol",
    "adresse": "Rue de la frontière,184",
    "localite": "7370 - DOUR",
    "telephone": "pas d'information",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 27,
    "type": "Agriculteur",
    "nom": "Lecomte Franz & Philippe (Agri-Lecomte & fils SPRL)",
    "adresse": "Rue de la Grande Veine,54",
    "localite": "7370 - DOUR",
    "telephone": "0495/52.17.03",
    "email": "agrilecomteetfils@hotmail.com",
    "actif": true
  },
  {
    "id": 28,
    "type": "Agriculteur",
    "nom": "Vandewynckel Yvon",
    "adresse": "Rue des Andrieux,140",
    "localite": "7370 - DOUR",
    "telephone": "065/65.24.95",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 29,
    "type": "Agriculteur",
    "nom": "Dufour Norbert",
    "adresse": "Rue Fally,18",
    "localite": "7370 - DOUR",
    "telephone": "(+32)65/65.24.05",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 30,
    "type": "Agriculteur",
    "nom": "Dufour Norbert",
    "adresse": "Rue du chênes,184",
    "localite": "7370 - DOUR",
    "telephone": "pas d'information",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 31,
    "type": "Agriculteur",
    "nom": "Abrassart Henry",
    "adresse": "Rue des Vainqueurs, 83",
    "localite": "7370 - DOUR",
    "telephone": "065/65.35.89",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 32,
    "type": "Agriculteur",
    "nom": "Gossuin Yves",
    "adresse": "Rue du Cimetière, 49",
    "localite": "7370 - DOUR",
    "telephone": "0477/58.74.26 ou 065/ 65 25 58",
    "email": "https://hainaut-terredegouts.be/producteur/ferme-gossuin-yves-et-yvon/    (Contacte par mail via le site)",
    "actif": true
  },
  {
    "id": 33,
    "type": "Agriculteur",
    "nom": "Abrassart Freddy",
    "adresse": "Rue du Commerce, 78",
    "localite": "7370 - DOUR",
    "telephone": "0477/25.09.15 ou 065/65.32.64",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 34,
    "type": "Agriculteur",
    "nom": "Delanoy Philippe",
    "adresse": "Rue du Joncquois, 33",
    "localite": "7370 - DOUR",
    "telephone": "0475/85.34.51",
    "email": "agrijoncq.phil@gmail.com",
    "actif": true
  },
  {
    "id": 35,
    "type": "Agriculteur",
    "nom": "Goch Irena",
    "adresse": "/",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 36,
    "type": "Agriculteur",
    "nom": "Lemaire Pierre",
    "adresse": "Rue du Plat pied, 78",
    "localite": "7370 - DOUR",
    "telephone": "065/65.28.68",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 37,
    "type": "Agriculteur",
    "nom": "Joly SOC.AGR.",
    "adresse": "Rue du Préfeuillet, 27",
    "localite": "7370 - DOUR",
    "telephone": "0477/29.44.60 ou 0465/65.26.36",
    "email": "mjol@swing.be  ou sur https://www.pagesdor.be/entreprise/Dour/L10809398/AGRI-+JOLY/",
    "actif": true
  },
  {
    "id": 38,
    "type": "Agriculteur",
    "nom": "Stievenart Edouard",
    "adresse": "Rue du Préfeuillet, 36",
    "localite": "7370 - DOUR",
    "telephone": "065/65.14.07",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 39,
    "type": "Agriculteur",
    "nom": "Halle Christian",
    "adresse": "Rue du Quesnoy, 165",
    "localite": "7370 - DOUR",
    "telephone": "0477/44.75.33",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 40,
    "type": "Agriculteur",
    "nom": "Gallez Eddy",
    "adresse": "Rue du Quesnoy, 52",
    "localite": "7370 - DOUR",
    "telephone": "065/65.64.91",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 41,
    "type": "Agriculteur",
    "nom": "Dubuisson Marcel",
    "adresse": "Rue Fabien Gérard, 26",
    "localite": "7370 - DOUR",
    "telephone": "065/65.31.12",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 42,
    "type": "Agriculteur",
    "nom": "Hénaut Dany",
    "adresse": "Rue Planche Cabeille, 78 ou rue de la frontière 37",
    "localite": "7370 - DOUR",
    "telephone": "065/63.14.65 ou 065/63.48.00",
    "email": "dany.henaut@gmail.com",
    "actif": true
  },
  {
    "id": 43,
    "type": "Agriculteur",
    "nom": "Vandewynckel Eddy",
    "adresse": "Rue Robert Tachenion, 39",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.13",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 44,
    "type": "Agriculteur",
    "nom": "Vandurme Pierre",
    "adresse": "Voie Blanche, 21",
    "localite": "7370 - DOUR",
    "telephone": "065/65.15.51",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 45,
    "type": "Agriculteur - divers",
    "nom": "Brunin Céline",
    "adresse": "Rue du Préfeuillet, 32",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 46,
    "type": "Agricultrice",
    "nom": "Lievens-Meersseman S. Agr.",
    "adresse": "Quaregnon",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 47,
    "type": "Agro-alimentaire",
    "nom": "Food Invest SA",
    "adresse": "Rue Planche à l'Aulne, 49",
    "localite": "7370 - DOUR",
    "telephone": "065/63.10.76",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 48,
    "type": "Aide à la jeunesse",
    "nom": "Parler pour le dire",
    "adresse": "Rue Emile Cornez, 48",
    "localite": "7370 - DOUR",
    "telephone": "065/79.10.31",
    "email": "info@parlerpourledire.be",
    "actif": true
  },
  {
    "id": 49,
    "type": "Aide aux entreprises",
    "nom": "Bary Cynthia",
    "adresse": "Rue Nacfer, 79",
    "localite": "7370 - DOUR",
    "telephone": "065/65.63.81",
    "email": "bs-librairie@hotmail.com",
    "actif": true
  },
  {
    "id": 50,
    "type": "Alimentation générale",
    "nom": "Dour Mini Market",
    "adresse": "Place verte,1",
    "localite": "7370 - DOUR",
    "telephone": "065/77.00.25 ou 0470/77.20.99",
    "email": "Dourminimarket@gmail.com",
    "actif": true
  },
  {
    "id": 51,
    "type": "Alimentation générale",
    "nom": "Colruyt Ets",
    "adresse": "Rue d'Élouges, 104",
    "localite": "7370 - DOUR",
    "telephone": "065/65.91.51",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 52,
    "type": "Alimentation générale",
    "nom": "AD Delhaize",
    "adresse": "Rue d'élouges, 3",
    "localite": "7370 - DOUR",
    "telephone": "065/69.00.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 53,
    "type": "Alimentation générale",
    "nom": "Lidl",
    "adresse": "Rue de la Grande Veine, 187",
    "localite": "7370 - DOUR",
    "telephone": "(+32) 23/54.85.91",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 54,
    "type": "Alimentation générale",
    "nom": "Chez Mario bis",
    "adresse": "Rue de la Perche, 1",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.60",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 55,
    "type": "Alimentation générale",
    "nom": "Au petit Dour (Superette Chez Christelle)",
    "adresse": "Rue de Ropaix, 48",
    "localite": "7370 - DOUR",
    "telephone": "065/65.99.71",
    "email": "christelle.superette@gmail.com",
    "actif": true
  },
  {
    "id": 56,
    "type": "Alimentation générale",
    "nom": "L'indispensable",
    "adresse": "Rue du Commerce, 105",
    "localite": "7370 - DOUR",
    "telephone": "0493/30.30.87",
    "email": "andreoli.mathias@outlook.com",
    "actif": true
  },
  {
    "id": 57,
    "type": "Alimentation générale",
    "nom": "Noab Tabac shop",
    "adresse": "Rue du Commerce, 179",
    "localite": "7370 - DOUR",
    "telephone": "065/45.74.28 ou 0487/99.36.69",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 58,
    "type": "Alimentation générale",
    "nom": "Carrefour Market",
    "adresse": "Rue du commerce, 352",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.74",
    "email": "info@carrefour.eu",
    "actif": true
  },
  {
    "id": 59,
    "type": "Alimentation générale",
    "nom": "Chez Christiane",
    "adresse": "Rue Sainte-Catherine, 23",
    "localite": "7370 - DOUR",
    "telephone": "065/65.07.93",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 60,
    "type": "Ambulant",
    "nom": "Colmant Jessica",
    "adresse": "Rue Aimeries, 180",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 61,
    "type": "Alimentation générale (fruits/légumes)",
    "nom": "Vandecasteele Henri",
    "adresse": "Rue des Andrieux, 85",
    "localite": "7370 - DOUR",
    "telephone": "065/63.06.47",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 62,
    "type": "Animalerie",
    "nom": "TOM & CO",
    "adresse": "Rue d'élouges, 106",
    "localite": "7370 - DOUR",
    "telephone": "065/77.97.08",
    "email": "30257@tomandco.eu",
    "actif": true
  },
  {
    "id": 63,
    "type": "Animalerie",
    "nom": "Reptile univers / (pas la bonne adresse)",
    "adresse": "Rue Général Leman, 23/B",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 64,
    "type": "Apiculture",
    "nom": "Apidays",
    "adresse": "Ruelle d'élouges, 5",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "inactif depuis le 10/2024",
    "actif": true
  },
  {
    "id": 65,
    "type": "Architecte",
    "nom": "Bureau d'architecture (Huez Michel)",
    "adresse": "Rue Alfred danhier, 37",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.48",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 66,
    "type": "Architecte",
    "nom": "Atelier d'architecture Druart Sabine SPRL",
    "adresse": "Rue Henri Pochez, 122",
    "localite": "7370 - DOUR",
    "telephone": "065/63.32.14 ou 0497/53.90.65",
    "email": "druartsabine@hotmail.com",
    "actif": true
  },
  {
    "id": 67,
    "type": "Architecte",
    "nom": "Atelier d'architecture Nathalie Dame SC SPRL",
    "adresse": "Rue du Tombois, 3",
    "localite": "7370 - DOUR",
    "telephone": "0479/80.34.86",
    "email": "dame.nathalie1@gmail.com",
    "actif": true
  },
  {
    "id": 68,
    "type": "Architecte",
    "nom": "Moreau Pierre-Pol",
    "adresse": "Rue d'offignies, 63",
    "localite": "7370 - DOUR",
    "telephone": "0476/82.44.55",
    "email": "pierre-pol.moreau@aor-architecture.be",
    "actif": true
  },
  {
    "id": 69,
    "type": "Architecte",
    "nom": "Cordier Arnaud",
    "adresse": "Rue de la Frontière, 216/218",
    "localite": "7370 - DOUR",
    "telephone": "0478/63.17.68",
    "email": "arnaudcordier.archi@gmail.com",
    "actif": true
  },
  {
    "id": 70,
    "type": "Architecte",
    "nom": "Grolaux Philippe",
    "adresse": "Rue de la Frontière, 313",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.20 ou 0477/46.61.37",
    "email": "info@grolauxarchitecte.be",
    "actif": true
  },
  {
    "id": 71,
    "type": "Architecte",
    "nom": "Lo Monaco Salvatore",
    "adresse": "Rue de la Frontière, 58",
    "localite": "7370 - DOUR",
    "telephone": "0473/32.60.27",
    "email": "lomonacosalvatore@msn.com",
    "actif": true
  },
  {
    "id": 72,
    "type": "Architecte",
    "nom": "Morazzini Mélanie",
    "adresse": "Rue du Coron, 9",
    "localite": "7370 - DOUR",
    "telephone": "",
    "email": "m.morazzini@slhe.be  ou melaniemorazzini@hotmail.com",
    "actif": true
  },
  {
    "id": 73,
    "type": "Architecte",
    "nom": "Atelier d'architecture Pierre Nee SC SPRL",
    "adresse": "Rue du Coron, 95",
    "localite": "7370 - DOUR",
    "telephone": "065/65.04.92",
    "email": "pierre.nee@skynet.be",
    "actif": true
  },
  {
    "id": 74,
    "type": "Architecte",
    "nom": "Dejeans Thierry",
    "adresse": "Rue du Moulin Mollet, 7",
    "localite": "7370 - DOUR",
    "telephone": "065/65.93.30",
    "email": "archi.dejeans@hotmail.com",
    "actif": true
  },
  {
    "id": 75,
    "type": "Architecte",
    "nom": "Delsine Christian",
    "adresse": "Rue Isodore Godfrin, 22",
    "localite": "7370 - DOUR",
    "telephone": "065/65.45.77",
    "email": "christian.delsine@skynet.be",
    "actif": true
  },
  {
    "id": 76,
    "type": "Architecte",
    "nom": "Saussez Flavien",
    "adresse": "Rue Jean-Baptiste Foriez, 6",
    "localite": "7370 - DOUR",
    "telephone": "Inactif depuis le 04/2024",
    "email": "/",
    "actif": true
  },
  {
    "id": 77,
    "type": "Aromathérapie",
    "nom": "De Jean Isabelle",
    "adresse": "Rue de l'yser, 25",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 78,
    "type": "Articles bébé",
    "nom": "SPRL Baby Rêve",
    "adresse": "Rue Grande, 45",
    "localite": "7370 - DOUR",
    "telephone": "définitevement fermé",
    "email": "/",
    "actif": true
  },
  {
    "id": 79,
    "type": "Artistique",
    "nom": "Amicitia ASBL",
    "adresse": "Rue des Chênes, 96",
    "localite": "7370 - DOUR",
    "telephone": "0473/29.16.46",
    "email": "amicitiadour@gmail.com",
    "actif": true
  },
  {
    "id": 80,
    "type": "Associatif",
    "nom": "Dancing ovation(DO) ASBL",
    "adresse": "Rue de la Frontière, 140",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 81,
    "type": "Association personnes handicapées",
    "nom": "Eva ASBL",
    "adresse": "Rue d'Offignies, 70",
    "localite": "7370 - DOUR",
    "telephone": "065/65.53.62",
    "email": "info@eva-bap.be",
    "actif": true
  },
  {
    "id": 82,
    "type": "Assurances",
    "nom": "Drogo-Dupont",
    "adresse": "Rue Deval, 38",
    "localite": "7370 - DOUR",
    "telephone": "065/60.01.69",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 83,
    "type": "Assurances",
    "nom": "Espace SA",
    "adresse": "Rue Grande, 17",
    "localite": "7370 - DOUR",
    "telephone": "065/65.65.65",
    "email": "info@espace-assurances.be",
    "actif": true
  },
  {
    "id": 84,
    "type": "Atelier de création",
    "nom": "Art schéma SPRL",
    "adresse": "Rue de la Frontière, 169",
    "localite": "7370 - DOUR",
    "telephone": "065/36.57.25",
    "email": "brigitte@art-schema.be",
    "actif": true
  },
  {
    "id": 85,
    "type": "Autres travaux de construction",
    "nom": "Ets Multi-Sablage",
    "adresse": "Rue des Canadiens, 69",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 86,
    "type": "Avocat",
    "nom": "Debouche Nathalie",
    "adresse": "Grand Place, 13",
    "localite": "7370 - DOUR",
    "telephone": "065/65.55.55",
    "email": "n.debouche@avocat.be",
    "actif": true
  },
  {
    "id": 87,
    "type": "Avocat",
    "nom": "Mariscal Roland",
    "adresse": "Rue Camille Moury, 144",
    "localite": "7370 - DOUR",
    "telephone": "065/65.24.11 ou 0475/41.88.80",
    "email": "info@avocatmariscal.be",
    "actif": true
  },
  {
    "id": 88,
    "type": "Avocat",
    "nom": "Benedetti Sylvia",
    "adresse": "Place Emile Vandervelde, 7",
    "localite": "7370 - DOUR",
    "telephone": "0464/67.30.27",
    "email": "s.benedetti@avocat.be",
    "actif": true
  },
  {
    "id": 89,
    "type": "Avocat",
    "nom": "Legal Parc Mons",
    "adresse": "Rue grande, 14-16",
    "localite": "7370 - DOUR",
    "telephone": "065/34.77.77",
    "email": "avocats.gueritte@skynet.be",
    "actif": true
  },
  {
    "id": 90,
    "type": "Balade à dos d'âne",
    "nom": "Rand'ânes",
    "adresse": "Rue de Ropaix, 232",
    "localite": "7370 - DOUR",
    "telephone": "0486/49.37.04 ou 065/22.72.90",
    "email": "peteretcatherine@randanes.be",
    "actif": true
  },
  {
    "id": 91,
    "type": "Banque",
    "nom": "Axa Banque - JDMC SPRL",
    "adresse": "Place des Martyrs, 11",
    "localite": "7370 - DOUR",
    "telephone": "065/63.16.63",
    "email": "agency.13801@axa-bank.be",
    "actif": true
  },
  {
    "id": 92,
    "type": "Banque",
    "nom": "Belfius Val d'haine et haut-pays SCRL",
    "adresse": "Place Emile Vandervelde, 13",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 93,
    "type": "Banque",
    "nom": "Belfius Val d'haine et haut-pays SCRL",
    "adresse": "Rue du commerce, 251",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 94,
    "type": "Banque",
    "nom": "ING Belgique SA",
    "adresse": "Rue Grande, 2-3",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 95,
    "type": "Banque",
    "nom": "Fortis Banque",
    "adresse": "Rue Grande, 56",
    "localite": "7370 - DOUR",
    "telephone": "065/61.14.50",
    "email": "dour@bnpparibasfortis.com",
    "actif": true
  },
  {
    "id": 96,
    "type": "Banque",
    "nom": "Crelan-Agence 6475",
    "adresse": "Rue Grande, 77",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 97,
    "type": "Banque",
    "nom": "Banque C.P.H",
    "adresse": "Rue Maréchal Foch, 18",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 98,
    "type": "Bâtiment",
    "nom": "On bati SPRL",
    "adresse": "Rue Grande, 53",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 99,
    "type": "Bijouterie - Horlogerie",
    "nom": "Miraux horlogerie-bijouterie",
    "adresse": "Rue Grande, 72",
    "localite": "7370 - DOUR",
    "telephone": "065/65.06.60",
    "email": "alain.miraux@skynet.be",
    "actif": true
  },
  {
    "id": 100,
    "type": "Bijoux, sacs",
    "nom": "Fanfreluche",
    "adresse": "Rue Grande, 23",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 101,
    "type": "Blanchisserie - nettoyage à sec",
    "nom": "Atelier social le roseau vert ASBL",
    "adresse": "Rue Robert Tachenion, 4",
    "localite": "7370 - DOUR",
    "telephone": "065/65.04.38",
    "email": "le.roseau.vert@skynet.be",
    "actif": true
  },
  {
    "id": 102,
    "type": "Boucherie",
    "nom": "Boucherie Omer",
    "adresse": "Rue du Commerce, 220",
    "localite": "7370 - DOUR",
    "telephone": "065/65.31.96",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 103,
    "type": "Boucherie",
    "nom": "Saveurs & traditions",
    "adresse": "Rue Grande, 73",
    "localite": "7370 - DOUR",
    "telephone": "0494/30.41.20",
    "email": "dina1603@gmail.com",
    "actif": true
  },
  {
    "id": 104,
    "type": "Boucherie",
    "nom": "Boucherie Delmotte Paulette",
    "adresse": "Rue Neuve, 45",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 105,
    "type": "Boucherie",
    "nom": "Vandurme Benoit",
    "adresse": "Voie Blanche, 36",
    "localite": "7370 - DOUR",
    "telephone": "065/63.35.89",
    "email": "v.db36@hotmail.com",
    "actif": true
  },
  {
    "id": 106,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Boulangerie Joël & Christine",
    "adresse": "Place du Jeu de Balle, 22",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.01",
    "email": "boulangerie.joel@skynet.be",
    "actif": true
  },
  {
    "id": 107,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Boulangerie Michel SA",
    "adresse": "Place Emile Vandervelde, 3",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 108,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Saray SPRL",
    "adresse": "Place Emile Vandervelde, 3",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 109,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Sa Pâtisserie Pierre SAEY",
    "adresse": "Place Emile Vandervelde, 35",
    "localite": "7370 - DOUR",
    "telephone": "065/65.26.67",
    "email": "patisserie.saey@skynet.be",
    "actif": true
  },
  {
    "id": 110,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Boulangerie \"Au Campagnard\"",
    "adresse": "Rue de la Frontière, 165/B",
    "localite": "7370 - DOUR",
    "telephone": "065/63.45.96",
    "email": "vandiependaelallan@gmail.com",
    "actif": true
  },
  {
    "id": 111,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Saveurs française",
    "adresse": "Rue du Commerce, 254",
    "localite": "7370 - DOUR",
    "telephone": "065/97.34.57",
    "email": "saveurs.francaises.boussu@gmail.com",
    "actif": true
  },
  {
    "id": 112,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Boulangerie Avarello G.",
    "adresse": "Rue du Peuple, 51",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 113,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Boulangerie-Patisserie Mattucci-Avarello SPRL",
    "adresse": "Rue du Stade, 18",
    "localite": "7370 - DOUR",
    "telephone": "065/45.74.52 ou 0494/82.41.44",
    "email": "mattucci@skynet.be",
    "actif": true
  },
  {
    "id": 114,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Saveurs française",
    "adresse": "Rue Grande, 78",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 115,
    "type": "Boulangerie - Pâtisserie",
    "nom": "Laissez-vous tenter",
    "adresse": "Rue Masson, 1",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 116,
    "type": "Brasserie",
    "nom": "Brasserie de Blaugies SCRL",
    "adresse": "Rue de la Frontière, 435",
    "localite": "7370 - DOUR",
    "telephone": "065/65.03.60",
    "email": "info@brasseriedeblaugies.com",
    "actif": true
  },
  {
    "id": 117,
    "type": "Brasseur",
    "nom": "Ets Roucou-Liénard",
    "adresse": "Rue Fally, 16",
    "localite": "7370 - DOUR",
    "telephone": "065/65.94.11 ou 0474/31.09.93",
    "email": "roucou.lienard@skynet.be",
    "actif": true
  },
  {
    "id": 118,
    "type": "Brasseur - drink",
    "nom": "Ets Durigneux",
    "adresse": "Rue de l'Eglise, 45-49",
    "localite": "7370 - DOUR",
    "telephone": "065/63.18.83",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 119,
    "type": "Brasseur - drink + alimentation générale",
    "nom": "Dour Boisson",
    "adresse": "Rue aimeries, 115",
    "localite": "7370 - DOUR",
    "telephone": "065/65.29.78",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 120,
    "type": "Brico",
    "nom": "Hubo",
    "adresse": "Place Emile Vandervelde, 22",
    "localite": "7370 - DOUR",
    "telephone": "065/71.80.50",
    "email": "contact@hubo.be",
    "actif": true
  },
  {
    "id": 121,
    "type": "Bureau d'assurances",
    "nom": "Parent assurances SPRL",
    "adresse": "Rue de l'yser, 58",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.37",
    "email": "sophie.parent@portima.be",
    "actif": true
  },
  {
    "id": 122,
    "type": "Bureau d'études",
    "nom": "Technical design assistance SCRIS",
    "adresse": "Rue de Là-Haut, 182",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 123,
    "type": "Bureaux d'étude",
    "nom": "Energy village SPRL",
    "adresse": "Rue Mitrecq, 5",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 124,
    "type": "Business Development consultant",
    "nom": "Security",
    "adresse": "Rue Henri Pochez, 169/1",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 125,
    "type": "Cabinet de médecine générale",
    "nom": "Cabinet Cap Santé SPRL",
    "adresse": "Rue d'Offignies, 36",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 126,
    "type": "Café",
    "nom": "Café \"Marie-Boulette\"",
    "adresse": "Chemin de Wasmes, 45",
    "localite": "7370 - DOUR",
    "telephone": "0471/54.57.42",
    "email": "samyntem@hotmail.com",
    "actif": true
  },
  {
    "id": 127,
    "type": "Café",
    "nom": "Le Bob'art",
    "adresse": "Grand Place, 22",
    "localite": "7370 - DOUR",
    "telephone": "065/42.47.55",
    "email": "fionascire25@outlook.com",
    "actif": true
  },
  {
    "id": 128,
    "type": "Café",
    "nom": "Greco Giueseppe",
    "adresse": "Grand Place, 6",
    "localite": "7370 - DOUR",
    "telephone": "inactif depuis le 01/2025",
    "email": "inactif depuis le 01/2025",
    "actif": true
  },
  {
    "id": 129,
    "type": "Café",
    "nom": "La Ruche Boraine SCRL",
    "adresse": "Rue Sainte-Catherine, 109",
    "localite": "7370 - DOUR",
    "telephone": "065/97.41.87",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 130,
    "type": "Café",
    "nom": "Le midi a dour SPRL",
    "adresse": "Place Emile Vandervelde, 28",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.07 ou 0479/69.37.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 131,
    "type": "Café",
    "nom": "La taverne Douroise",
    "adresse": "Place Emile Vandervelde, 67",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 132,
    "type": "Café",
    "nom": "Chez Samuel",
    "adresse": "Place Emile Vandervelde, 9",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 133,
    "type": "Café",
    "nom": "Café \"les trichères\"",
    "adresse": "Place Emile Vandervelde, 17",
    "localite": "7370 - DOUR",
    "telephone": "065/65.93.43",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 134,
    "type": "Café",
    "nom": "Les bleus SCRL",
    "adresse": "Rue de l'église, 19",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.62",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 135,
    "type": "Café",
    "nom": "Café 'Le salon de Blaugies'",
    "adresse": "Rue de la Frontière, 31",
    "localite": "7370 - DOUR",
    "telephone": "065/65.16.26 ou 0455/10.05.78",
    "email": "arkia.salon@gmail.com",
    "actif": true
  },
  {
    "id": 136,
    "type": "Café",
    "nom": "Café \"Le vieux Terroir\"",
    "adresse": "Rue du Commerce, 174",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 137,
    "type": "Café",
    "nom": "Café \"Au tram 6\"",
    "adresse": "Rue du Commerce, 177",
    "localite": "7370 - DOUR",
    "telephone": "0474/62.95.55",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 138,
    "type": "Café",
    "nom": "Taverne \"Le Gavroche\"",
    "adresse": "Rue du Commerce, 210",
    "localite": "7370 - DOUR",
    "telephone": "065/63.28.91",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 139,
    "type": "Café",
    "nom": "Café \"Le blanc minnet\"",
    "adresse": "Rue du Commerce, 317",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 140,
    "type": "Café",
    "nom": "Café \"La maison du peuple\"",
    "adresse": "Rue du Stade, 20",
    "localite": "7370 - DOUR",
    "telephone": "0496/76.63.68",
    "email": "gaetanmarcq.marcq2@gmail.com",
    "actif": true
  },
  {
    "id": 141,
    "type": "Café",
    "nom": "Café de La poste",
    "adresse": "Rue Grande, 80",
    "localite": "7370 - DOUR",
    "telephone": "0488/51.10.43",
    "email": "timingdour@msn.com",
    "actif": true
  },
  {
    "id": 142,
    "type": "Café",
    "nom": "Café \"Aux 4 saisons\"",
    "adresse": "Voie du Prêtre, 88",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 143,
    "type": "Café",
    "nom": "Les rouges SCRL",
    "adresse": "Rue du l'église, 12",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information mais toujours actif",
    "email": "/",
    "actif": true
  },
  {
    "id": 144,
    "type": "Carreleur",
    "nom": "Diependale Michael",
    "adresse": "Rue Camille Moury, 47",
    "localite": "7370 - DOUR",
    "telephone": "Faillite",
    "email": "/",
    "actif": true
  },
  {
    "id": 145,
    "type": "Carrosserie",
    "nom": "VBC design",
    "adresse": "Rue Benoît, 2",
    "localite": "7370 - DOUR",
    "telephone": "065/43.19.99",
    "email": "Vbc.design@skynet.be",
    "actif": true
  },
  {
    "id": 146,
    "type": "Centre d'hébergement pour personnes handicapées",
    "nom": "Le jardin des anges ASBL",
    "adresse": "Rue Ropaix, 16",
    "localite": "7370 - DOUR",
    "telephone": "065/88.78.00",
    "email": "direction@lejardindesanges.be",
    "actif": true
  },
  {
    "id": 147,
    "type": "Centre de bien-être",
    "nom": "Les Bains d'artémis",
    "adresse": "Rue ropaix, 239",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 148,
    "type": "Centre de bronzage",
    "nom": "Phanie'Soleil",
    "adresse": "Rue Grande, 79",
    "localite": "7370 - DOUR",
    "telephone": "0471/69.59.01",
    "email": "Pas d'info si toujours ouvert ou non",
    "actif": true
  },
  {
    "id": 149,
    "type": "Centre de fitness",
    "nom": "Haltères & go",
    "adresse": "Rue de Commerce, 132/A",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.98",
    "email": "https://www.facebook.com/halteresetgo/?locale=fr_FR      (contacte via facebook)",
    "actif": true
  },
  {
    "id": 150,
    "type": "Centre de prélèvement",
    "nom": "Dramaix Sylvianne (LOGOPEDE)",
    "adresse": "Place verte, 25",
    "localite": "7370 - DOUR",
    "telephone": "0479/33.29.63",
    "email": "dramaix.sylvianne@skynet.be",
    "actif": true
  },
  {
    "id": 151,
    "type": "Centre de prélèvement",
    "nom": "SPRL Chantal Lemaire",
    "adresse": "Rue du Cauderloo, 71",
    "localite": "7370 - DOUR",
    "telephone": "065/38.59.88",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 152,
    "type": "Centre de prélèvement",
    "nom": "Centre de Dour",
    "adresse": "Rue Grande, 66",
    "localite": "7370 - DOUR",
    "telephone": "0471/26.20.88",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 153,
    "type": "Centre de prélèvement",
    "nom": "Centre d'Elouges",
    "adresse": "Rue du Commerce, 137",
    "localite": "7370 - DOUR",
    "telephone": "0471/26.20.88",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 154,
    "type": "Centre équestre",
    "nom": "Equidour Stables ASBL",
    "adresse": "Rue Henri Pochez, 153",
    "localite": "7370 - DOUR",
    "telephone": "0474/48.49.22",
    "email": "criquette.equidour@outlook.com",
    "actif": true
  },
  {
    "id": 155,
    "type": "Chauffage",
    "nom": "Solimando Michelo",
    "adresse": "Rue de Pairois, 60",
    "localite": "7370 - DOUR",
    "telephone": "065/69.11.36 ou 0478/70.47.61",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 156,
    "type": "Chauffage - Sanitaire - Electricité",
    "nom": "Duchateau Lysian",
    "adresse": "Rue Moranfayt, 105",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 157,
    "type": "Chauffage - Sanitaire - Electricité (Agriculteur Leuze-en-Hainaut)",
    "nom": "Wannyn Joël",
    "adresse": "Rue de la Gayolle, 78",
    "localite": "7370 - DOUR",
    "telephone": "065/65.96.99",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 158,
    "type": "Chauffage - Sanitaire - Maçonnerie - Toiture - Zingage",
    "nom": "Ets Harmegnies Pierre",
    "adresse": "Rue de Ropaix, 268/A",
    "localite": "7370 - DOUR",
    "telephone": "0473/36.78.14",
    "email": "chauffazinc@gmail.com",
    "actif": true
  },
  {
    "id": 159,
    "type": "Chauffage - Sanitaire - parcs et jardins",
    "nom": "Dehon Dany",
    "adresse": "Rue de Belle Vue, 55",
    "localite": "7370 - DOUR",
    "telephone": "065/67.73.78",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 160,
    "type": "Chauffagiste",
    "nom": "Spampinato Sébastien",
    "adresse": "Rue du Trieu, 41",
    "localite": "7370 - DOUR",
    "telephone": "0473/29.90.84",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 161,
    "type": "Chaussures, accessoires et vêtements",
    "nom": "Surin SA",
    "adresse": "Rue Grande, 105",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 162,
    "type": "Chaussures, sacs, bijoux…",
    "nom": "Dour Tendance",
    "adresse": "Rue Grande, 95/B",
    "localite": "7370 - DOUR",
    "telephone": "0477/95.49.16",
    "email": "laloyeraude@hotmail.com",
    "actif": true
  },
  {
    "id": 163,
    "type": "Chevaux/kiné",
    "nom": "Mouton Annie",
    "adresse": "Route Verte, 86",
    "localite": "7370 - DOUR",
    "telephone": "065/63.42.88",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 164,
    "type": "Coach sportif",
    "nom": "Brunelli Jean-Luc",
    "adresse": "Rue du Chêne Brûlé, 67",
    "localite": "7370 - DOUR",
    "telephone": "065/63.04.41",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 165,
    "type": "Coach weight watchers",
    "nom": "Mercier Nathalie",
    "adresse": "Rue Baille de Fer, 5",
    "localite": "7370 - DOUR",
    "telephone": "0495/77.96.98",
    "email": "mariposacoaching28@gmail.com",
    "actif": true
  },
  {
    "id": 166,
    "type": "Coaching bien-être",
    "nom": "Caufriez Fanny",
    "adresse": "Rue Fulgence Masson, 24",
    "localite": "7370 - DOUR",
    "telephone": "0477/63.17.19",
    "email": "courantindigo@gmail.com   ou fannycaufriez@hotmail.com",
    "actif": true
  },
  {
    "id": 167,
    "type": "Coiffeuse",
    "nom": "Infini-tif",
    "adresse": "Place Verte, 27",
    "localite": "7370 - DOUR",
    "telephone": "Définitevement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 168,
    "type": "Coiffeuse",
    "nom": "Cindy style",
    "adresse": "Rue des Canadiens, 28",
    "localite": "7370 - DOUR",
    "telephone": "0479/35.54.56",
    "email": "https://www.facebook.com/p/Cindy-style-100083559633125/  (Contacte via facebook)",
    "actif": true
  },
  {
    "id": 169,
    "type": "Coiffeuse",
    "nom": "Cultrera Francesca",
    "adresse": "Rue Ferrer, 13",
    "localite": "7370 - DOUR",
    "telephone": "065/65.35.40",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 170,
    "type": "Coiffeuse",
    "nom": "La grange à tif",
    "adresse": "Rue Ferrer, 77",
    "localite": "7370 - DOUR",
    "telephone": "0479/46.25.14",
    "email": "lagrangeatif@hotmail.com",
    "actif": true
  },
  {
    "id": 171,
    "type": "Coiffeuse",
    "nom": "Coiffure Maria",
    "adresse": "Rue Moranfayt, 171",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information(065/78,01,99)",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 172,
    "type": "Coiffeuse",
    "nom": "Tana style coiffure",
    "adresse": "Rue Pairois, 82",
    "localite": "7370 - DOUR",
    "telephone": "065/65.38.49 ou 077/94.80.57",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 173,
    "type": "Coiffeuse à domicile",
    "nom": "Fazzino Isabella",
    "adresse": "Place des Martyrs, 5",
    "localite": "7370 - DOUR",
    "telephone": "0479/09.88.57 ou 065/65.92.16",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 174,
    "type": "Commerçant ambulant en fruits & légumes",
    "nom": "Estievenart Thierry",
    "adresse": "Rue Planche d'Aulne, 26",
    "localite": "7370 - DOUR",
    "telephone": "065/63.14.04",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 175,
    "type": "Commerce ambulant - marché",
    "nom": "Dubuisson  Bernadette",
    "adresse": "Rue de la Grande Veine, 97",
    "localite": "7370 - DOUR",
    "telephone": "065/63.41.76",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 176,
    "type": "Commerce de détail d'équipement de bureau, d'ordinateur,…",
    "nom": "Alpha Development SPRL",
    "adresse": "Rue de la Frontière, 171",
    "localite": "7370 - DOUR",
    "telephone": "0476/03.43.46",
    "email": "info@alpha-development.com",
    "actif": true
  },
  {
    "id": 177,
    "type": "Commerce de détail optique",
    "nom": "Jdh optical sprl",
    "adresse": "Rue Aimeries, 173",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 178,
    "type": "Commercee de gros pneus",
    "nom": "Garage Busieau &fils",
    "adresse": "Rue d'Audregnies, 68",
    "localite": "7370 - DOUR",
    "telephone": "0476/72.81.27",
    "email": "a_s2000_10@hotmail.com",
    "actif": true
  },
  {
    "id": 179,
    "type": "Communauté",
    "nom": "L'institut le Roseau Vert",
    "adresse": "Rue Fleurichamps, 14",
    "localite": "7370 - DOUR",
    "telephone": "065/66.62.66 ou 065/71.63.40",
    "email": "imp.roseauvert@hainaut.be",
    "actif": true
  },
  {
    "id": 180,
    "type": "Communauté-Hébergement personnes handicapées",
    "nom": "Mon chez nous",
    "adresse": "Rue Béatam, 5",
    "localite": "7370 - DOUR",
    "telephone": "065/78.91.00",
    "email": "contact@moncheznous-asbl.net",
    "actif": true
  },
  {
    "id": 181,
    "type": "Communauté-Service d'accompagnement et logement",
    "nom": "Le Passage ACIS",
    "adresse": "Rue Maréchal foch, 2",
    "localite": "7370 - DOUR",
    "telephone": "065/65.57.92",
    "email": "lepassage-dour@acis-group.org",
    "actif": true
  },
  {
    "id": 182,
    "type": "Comptabilité/fiscalité",
    "nom": "J.S bureautic",
    "adresse": "Rue Aimeries, 71",
    "localite": "7370 - DOUR",
    "telephone": "065/34.87.33 ou 0477/49.89.21",
    "email": "keyfico@keyfico.be",
    "actif": true
  },
  {
    "id": 183,
    "type": "Comptable",
    "nom": "JLA Compta",
    "adresse": "Rue Robert Tachenion, 49",
    "localite": "7370 - DOUR",
    "telephone": "0483/04.57.47",
    "email": "joris@querson.be",
    "actif": true
  },
  {
    "id": 184,
    "type": "Comptable",
    "nom": "Querson Rudy",
    "adresse": "Rue V. delporte, 97",
    "localite": "7370 - DOUR",
    "telephone": "0474/68.29.48",
    "email": "info@querson.be",
    "actif": true
  },
  {
    "id": 185,
    "type": "Comptable-Fiscaliste",
    "nom": "Roland Andy",
    "adresse": "Rue du Joncquois, 36",
    "localite": "7370 - DOUR",
    "telephone": "065/77.96.88 ou 0477/87.76.71",
    "email": "rol.andy@yahoo.fr",
    "actif": true
  },
  {
    "id": 186,
    "type": "Conception, réalisation de publicités",
    "nom": "Isimark SPRL",
    "adresse": "Rue du Parc, 17",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 187,
    "type": "Conseil gestion",
    "nom": "Capdent SPRL",
    "adresse": "Rue d'Audregnies, 44",
    "localite": "7370 - DOUR",
    "telephone": "ouverture de Faillite",
    "email": "Ouverture de Faillite",
    "actif": true
  },
  {
    "id": 188,
    "type": "Conseil gestion",
    "nom": "E-Charles SA",
    "adresse": "Rue des Chênes, 97",
    "localite": "7370 - DOUR",
    "telephone": "065/46.02.08",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 189,
    "type": "Construction",
    "nom": "Silva Construct",
    "adresse": "Rue du Coron, 216",
    "localite": "7370 - DOUR",
    "telephone": "0470/86.36.40",
    "email": "Sprlsilvaconstruct@hotmail.com",
    "actif": true
  },
  {
    "id": 190,
    "type": "Construction",
    "nom": "Pro toit et construction SPRL",
    "adresse": "Rue Pairois, 39/Bte3",
    "localite": "7370 - DOUR",
    "telephone": "0486/83.42.25 ou 065/31.89.17",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 191,
    "type": "Consultance",
    "nom": "Namur Vincent",
    "adresse": "Avenue H.Harmegnies, 35",
    "localite": "7370 - DOUR",
    "telephone": "Inactif depuis 10/2018",
    "email": "Inactif depuis 10/2018",
    "actif": true
  },
  {
    "id": 192,
    "type": "Consultance",
    "nom": "AV-Solution SPRL",
    "adresse": "Rue du Préfeuillet, 11",
    "localite": "7370 - DOUR",
    "telephone": "0498/53.18.07",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 193,
    "type": "Consultance",
    "nom": "Neolima SPRL",
    "adresse": "Rue Mitrecq, 7",
    "localite": "7370 - DOUR",
    "telephone": "065/69.15.57",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 194,
    "type": "Consultance informatique",
    "nom": "Sd Consult SCS",
    "adresse": "Rue de Ropaix, 171/Bis",
    "localite": "7370 - DOUR",
    "telephone": "0476/44.86.97 ou 065/65.05.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 195,
    "type": "Consultance informatique",
    "nom": "EID-Tech SPRL",
    "adresse": "Rue Saint-louis, 47",
    "localite": "7370 - DOUR",
    "telephone": "Cessation en 2023",
    "email": "Cessation en 2023",
    "actif": true
  },
  {
    "id": 196,
    "type": "Cordonnerie",
    "nom": "Minute Men shoes",
    "adresse": "Rue Maréchal Foch, 13",
    "localite": "7370 - DOUR",
    "telephone": "065/63.07.79",
    "email": "minutemenshoe@hotmail.com",
    "actif": true
  },
  {
    "id": 197,
    "type": "Cours de langue",
    "nom": "Abelao ASBL",
    "adresse": "Route Verte, 10",
    "localite": "7370 - DOUR",
    "telephone": "065/63.09.52",
    "email": "nicolas.atas@kuleuven.be",
    "actif": true
  },
  {
    "id": 198,
    "type": "Cours de sport",
    "nom": "Allinaqua",
    "adresse": "Rue du Stade, 78/A",
    "localite": "7370 - DOUR",
    "telephone": "065/80.09.69",
    "email": "allinaqua.dour@gmail.com",
    "actif": true
  },
  {
    "id": 199,
    "type": "Courtier d'assurances",
    "nom": "A.Lavenne Assurfinance SPRL",
    "adresse": "Rue Grande, 19",
    "localite": "7370 - DOUR",
    "telephone": "065/65.33.51",
    "email": "bureau@lavenneassur.be",
    "actif": true
  },
  {
    "id": 200,
    "type": "Créateur - illustrateur",
    "nom": "Les clefs s'emportent",
    "adresse": "Rue Pairois, 35",
    "localite": "7370 - DOUR",
    "telephone": "0493/06.47.11",
    "email": "lesclefssemportent@gmail.com",
    "actif": true
  },
  {
    "id": 201,
    "type": "Création de céramiques artisanales",
    "nom": "Atelier du Capricorne",
    "adresse": "Rue des Chênes, 100",
    "localite": "7370 - DOUR",
    "telephone": "0477/76.57.27",
    "email": "atelierducapricorne@hotmail.com",
    "actif": true
  },
  {
    "id": 202,
    "type": "Crèche",
    "nom": "Crèche Jardin d'Eden",
    "adresse": "Rue des Andrieux, 178",
    "localite": "7370 - DOUR",
    "telephone": "065/75.12.39",
    "email": "jardindeden@entraideprotestante.be",
    "actif": true
  },
  {
    "id": 203,
    "type": "Crèche",
    "nom": "Agape ASBL",
    "adresse": "Rue du Chêne Brûlé, 40",
    "localite": "7370 - DOUR",
    "telephone": "065/65.92.84",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 204,
    "type": "Culture et élevage",
    "nom": "Denis Jean-Baptiste & Delmotte Johan GR",
    "adresse": "Rue Basse, 166",
    "localite": "7370 - DOUR",
    "telephone": "0476/76.73.82",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 205,
    "type": "Culturelles",
    "nom": "Actions et recherche culturelles ASBL",
    "adresse": "Rue du général Leman, 23B",
    "localite": "7370 - DOUR",
    "telephone": "0475/80.53.05",
    "email": "dourityourself@gmail.com",
    "actif": true
  },
  {
    "id": 206,
    "type": "Décoration porcelaine",
    "nom": "Vieux beau dour SPRL",
    "adresse": "Avenue jules Sartieaux, 27",
    "localite": "7370 - DOUR",
    "telephone": "065/65.45.52",
    "email": "vieux.beaudour@skynet.be",
    "actif": true
  },
  {
    "id": 207,
    "type": "Dentiste",
    "nom": "Jeremy Paget SPRL",
    "adresse": "Rue de la Chapelle, 84",
    "localite": "7370 - DOUR",
    "telephone": "065/98.00.34",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 208,
    "type": "Dentisterie",
    "nom": "Cabinet dentaire Roseline Dame SPRL",
    "adresse": "Rue de la Fontaine, 22",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 209,
    "type": "Dentisterie",
    "nom": "Cabinet Dentaire Benit SC SPRL",
    "adresse": "Rue E. Estiévenart, 2",
    "localite": "7370 - DOUR",
    "telephone": "065/65.26.73",
    "email": "xavier.benit@gmail.com",
    "actif": true
  },
  {
    "id": 210,
    "type": "Dentisterie",
    "nom": "Stievenart Geneviève",
    "adresse": "Rue Fleurichamps, 45",
    "localite": "7370 - DOUR",
    "telephone": "065/65.61.87",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 211,
    "type": "Dépannage auto + vente de pièces",
    "nom": "Mac'Mobile",
    "adresse": "Rue du Coron, 89",
    "localite": "7370 - DOUR",
    "telephone": "0488/86.34.93",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 212,
    "type": "Dépannage PC",
    "nom": "Vandenborre Christian",
    "adresse": "Rue de la Frontière, 59",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 213,
    "type": "Dépannage TV + Divers",
    "nom": "Ets Honorez Didier",
    "adresse": "Rue de la Grande Veine, 32",
    "localite": "7370 - DOUR",
    "telephone": "Décédé",
    "email": "Décédé",
    "actif": true
  },
  {
    "id": 214,
    "type": "Dépannage TV + Divers",
    "nom": "Center pièces SPRL",
    "adresse": "Rue Victor Delporte, 170",
    "localite": "7370 - DOUR",
    "telephone": "0496/41.19.96",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 215,
    "type": "Détaillant en vin",
    "nom": "Ets Lecourt Pascale",
    "adresse": "Rue du Chêne Brûlé, 10",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "pascale.lecourt@freebel.net",
    "actif": true
  },
  {
    "id": 216,
    "type": "Diététicienne",
    "nom": "Colmant Valérie",
    "adresse": "Grand Place, 5",
    "localite": "7370 - DOUR",
    "telephone": "0475/40.92.26 ou 065/65.30.79",
    "email": "valerie.colmant@icloud.com",
    "actif": true
  },
  {
    "id": 217,
    "type": "Dour Festival",
    "nom": "Dour music festival SCRL",
    "adresse": "Rue des Canadiens, 100",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18 ou 065/71.87.12",
    "email": "hello@dourfestival.eu",
    "actif": true
  },
  {
    "id": 218,
    "type": "Droguerie",
    "nom": "Drogueries Pauwel Group SPRL",
    "adresse": "Rue Grande, 33",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 219,
    "type": "Ecole",
    "nom": "Institut de promotion sociale de Dour",
    "adresse": "Rue de Boussu, 84",
    "localite": "7370 - DOUR",
    "telephone": "065/65.24.47",
    "email": "info@eafc-hp.be",
    "actif": true
  },
  {
    "id": 220,
    "type": "Ecole",
    "nom": "Athenée Royal de dour",
    "adresse": "Rue de l'Athenée, 23",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.87",
    "email": "info@ardour.be",
    "actif": true
  },
  {
    "id": 221,
    "type": "Ecole",
    "nom": "Institut d'enseignement libre catholique a Dour",
    "adresse": "Rue du Roi Albert, 10",
    "localite": "7370 - DOUR",
    "telephone": "065/65.28.45",
    "email": "benjamin.picry@isu-dour.be    (Secrétaire de direction)",
    "actif": true
  },
  {
    "id": 222,
    "type": "Ecole",
    "nom": "Saint-Victor & Saint-Joseph",
    "adresse": "Rue Pairois & Place E. Vandervelde",
    "localite": "7370 - DOUR",
    "telephone": "065/69.10.55",
    "email": "direction@stvictor-stjoseph-dour.be",
    "actif": true
  },
  {
    "id": 223,
    "type": "Ecole des jeunes sapeurs-pompiers",
    "nom": "JSPD ASBL",
    "adresse": "Avenue V.Régnart, 10",
    "localite": "7370 - DOUR",
    "telephone": "065/65.00.65 ou 0479/67.04.81",
    "email": "noel.fred@skynet.be",
    "actif": true
  },
  {
    "id": 224,
    "type": "Electricité générale",
    "nom": "Delcroix Roméo",
    "adresse": "Place Emile Vandervelde, 33B",
    "localite": "7370 - DOUR",
    "telephone": "065/42.15.73 ou 0477/71.18.39",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 225,
    "type": "Electricité générale/Alarme",
    "nom": "MM électricité - Alarme",
    "adresse": "Rue d'Audregnies, 73",
    "localite": "7370 - DOUR",
    "telephone": "065/65.96.20",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 226,
    "type": "Electro TV - Réparation",
    "nom": "Bernier Ruddy",
    "adresse": "Rue du Quesnoy, 14",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "contact@belfix.be",
    "actif": true
  },
  {
    "id": 227,
    "type": "Elevage d'ovins",
    "nom": "Dame Denis",
    "adresse": "Rue des Chênes, 147",
    "localite": "7370 - DOUR",
    "telephone": "065/65.24.40",
    "email": "dame.d@skynet.be",
    "actif": true
  },
  {
    "id": 228,
    "type": "Elevage de persans",
    "nom": "Les joyaux de Varsovie",
    "adresse": "Rue de la Chaumière, 18",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitiivement fermé",
    "actif": true
  },
  {
    "id": 229,
    "type": "Elevage de poules",
    "nom": "Pomanel Cuvelier Andre SA",
    "adresse": "Rue de la Frontière, 403",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.56",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 230,
    "type": "Entraineur de chevaux",
    "nom": "Gobert Rening Horses SPRL",
    "adresse": "Route Verte, 86",
    "localite": "7370 - DOUR",
    "telephone": "0472/61.61.93 ou 0474/50.08.36",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 231,
    "type": "Entrepreneur",
    "nom": "Entreprise de construction Bourlard Didier SPRL",
    "adresse": "Rue Aimeries, 97/C",
    "localite": "7370 - DOUR",
    "telephone": "065/65.98.13 ou 0475/85.29.64",
    "email": "bourlard.didier@skynet.be",
    "actif": true
  },
  {
    "id": 232,
    "type": "Entrepreneur",
    "nom": "Eric visee SPRL",
    "adresse": "Rue d'Offignies, 64",
    "localite": "7370 - DOUR",
    "telephone": "0477/69.72.43",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 233,
    "type": "Entrepreneur",
    "nom": "Actibat SPRL",
    "adresse": "Rue de la Machine à Feu, 7",
    "localite": "7370 - DOUR",
    "telephone": "065/66.23.95",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 234,
    "type": "Entrepreneur",
    "nom": "Scavone Riccardo",
    "adresse": "Rue Mouligneau, 10/Apt2",
    "localite": "7370 - DOUR",
    "telephone": "0477/69.55.04",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 235,
    "type": "Entrepreneur de jardin",
    "nom": "Descamps Raphaël",
    "adresse": "Rue Henri Pochez, 92",
    "localite": "7370 - DOUR",
    "telephone": "071/50.43.70 ou 0496/72.76.04",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 236,
    "type": "Entreprise de toiture",
    "nom": "Tout pour toit",
    "adresse": "Rue César depaepe, 12",
    "localite": "7370 - DOUR",
    "telephone": "065/95.48.52",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 237,
    "type": "Entreprise horticole",
    "nom": "Ets Durant",
    "adresse": "Rue de la Grande Veine, 189",
    "localite": "7370 - DOUR",
    "telephone": "065/75.01.95",
    "email": "sprldurant@sprldurant.be",
    "actif": true
  },
  {
    "id": 238,
    "type": "Entretien corporel",
    "nom": "Hydrotonis SPRL",
    "adresse": "Rue Moranfayt, 227",
    "localite": "7370 - DOUR",
    "telephone": "065/63.19.05",
    "email": "ingrid.anthonis@hotmail.com",
    "actif": true
  },
  {
    "id": 239,
    "type": "Entretien corporel, formations (bien-être, soins énergétiques,..)",
    "nom": "Terre de Reiki",
    "adresse": "Rue Pairois, 84",
    "localite": "7370 - DOUR",
    "telephone": "0474/83.22.55",
    "email": "florence_waterlot@yahoo.fr",
    "actif": true
  },
  {
    "id": 240,
    "type": "Entretien et création d'espaces verts",
    "nom": "Ets Passelecq",
    "adresse": "Rue du Commerce, 334",
    "localite": "7370 - DOUR",
    "telephone": "0479/80.62.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 241,
    "type": "Entretien psychologiques",
    "nom": "Peralta Maria",
    "adresse": "Rue Robert tachenion, 12",
    "localite": "7370 - DOUR",
    "telephone": "0472/41.87.74 ou 065/65.38.77",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 242,
    "type": "Epuration",
    "nom": "RO-épuration SPRL",
    "adresse": "Rue de Belle-Vue, 46",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.05",
    "email": "olivier@rougraff.com",
    "actif": true
  },
  {
    "id": 243,
    "type": "Equestre",
    "nom": "Cruyppeninck Didier",
    "adresse": "Rue de la Frontière, 487",
    "localite": "7370 - DOUR",
    "telephone": "065/65.35.58",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 244,
    "type": "Esthéticienne",
    "nom": "Zenitude",
    "adresse": "Rue de la Frontière, 88",
    "localite": "7370 - DOUR",
    "telephone": "0471/40.01.01",
    "email": "walsh.meg@hotmail.com",
    "actif": true
  },
  {
    "id": 245,
    "type": "Esthéticienne",
    "nom": "Musin Aurélie",
    "adresse": "Rue Mouligneau, 26",
    "localite": "7370 - DOUR",
    "telephone": "0485/18.00.29",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 246,
    "type": "Esthétique",
    "nom": "Nails Gallery",
    "adresse": "Route Verte, 26",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 247,
    "type": "Esthétique",
    "nom": "Verbeck Stéphanie",
    "adresse": "Sentier de l'Alouette, 37",
    "localite": "7370 - DOUR",
    "telephone": "0493/75.09.37",
    "email": "Esthemoda@gmail.com",
    "actif": true
  },
  {
    "id": 248,
    "type": "Etang de pêche",
    "nom": "L'étang des copains",
    "adresse": "Rue de Bavay, 51",
    "localite": "7370 - DOUR",
    "telephone": "0491/19.08.42",
    "email": "info@letangdescopains.com",
    "actif": true
  },
  {
    "id": 249,
    "type": "Etudes et management-construction",
    "nom": "Probati SPRL",
    "adresse": "Rue Général Leman, 21",
    "localite": "7370 - DOUR",
    "telephone": "0475/25.13.32",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 250,
    "type": "Expert-comptable",
    "nom": "Mulliez Etienne",
    "adresse": "Grand place, 12/Bte 1",
    "localite": "7370 - DOUR",
    "telephone": "065/63.05.93",
    "email": "etienne@mulliez.be",
    "actif": true
  },
  {
    "id": 251,
    "type": "Expert-comptable",
    "nom": "Nicolas Di Zenzo & cie Sc SPRL",
    "adresse": "Rue Fauvette, 43",
    "localite": "7370 - DOUR",
    "telephone": "065/57.05.42",
    "email": "ndz@skynet.be",
    "actif": true
  },
  {
    "id": 252,
    "type": "Experts en dommages/risques & défenses",
    "nom": "Expertises Automobiles",
    "adresse": "Rue Pont-à-Cavains, 107",
    "localite": "7370 - DOUR",
    "telephone": "Inactif depuis 01/2024",
    "email": "Inactif depuis 01/2024",
    "actif": true
  },
  {
    "id": 253,
    "type": "Exploitation forestière",
    "nom": "Pouille Christian",
    "adresse": "Rue de Ropaix, 23",
    "localite": "7370 - DOUR",
    "telephone": "065/63.01.87 ou 0476/47.18.15",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 254,
    "type": "Fabrication câbles",
    "nom": "Nexans SA",
    "adresse": "Zoning Industriel R. Benoît",
    "localite": "7370 - DOUR",
    "telephone": "065/63.26.41",
    "email": "info.ncs@nexans.com",
    "actif": true
  },
  {
    "id": 255,
    "type": "Fabrication de gaufres",
    "nom": "Milcamps SA",
    "adresse": "Rue de la Machine à feu, 10",
    "localite": "7370 - DOUR",
    "telephone": "065/69.00.39",
    "email": "info@milcamps.be",
    "actif": true
  },
  {
    "id": 256,
    "type": "Fabrication et conditionnement de produits d'entretien",
    "nom": "Delta product SA",
    "adresse": "Chemin de Belle-vue, 50-55",
    "localite": "7370 - DOUR",
    "telephone": "065/66.58.09",
    "email": "admin@deltaproduct.be",
    "actif": true
  },
  {
    "id": 257,
    "type": "Fabrication gaines de ventilation",
    "nom": "Euro conditionnement SA",
    "adresse": "Rue de France,50",
    "localite": "7370 - DOUR",
    "telephone": "065/63.42.33",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 258,
    "type": "Fabrication matériel agricolee",
    "nom": "Menart A. Ets SPRL",
    "adresse": "Rue Benoît, 31",
    "localite": "7370 - DOUR",
    "telephone": "065/61.07.60",
    "email": "info@menart.eu",
    "actif": true
  },
  {
    "id": 259,
    "type": "Fiduciaire",
    "nom": "Figeaco SPRL",
    "adresse": "Place Verte, 41",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.70",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 260,
    "type": "Fleurs",
    "nom": "Baccara",
    "adresse": "Rue Maréchal foch, 27",
    "localite": "7370 - DOUR",
    "telephone": "065/63.40.70",
    "email": "contact@sessile.fr",
    "actif": true
  },
  {
    "id": 261,
    "type": "Formation",
    "nom": "EFT l'appui",
    "adresse": "Rue Alexandre Patte, 11/B",
    "localite": "7370 - DOUR",
    "telephone": "065/61.01.79",
    "email": "info@eftlappui.be",
    "actif": true
  },
  {
    "id": 262,
    "type": "Formatiion et prévention",
    "nom": "Mission Wallone des secteurs verts ASBL",
    "adresse": "Rue du Roi Albert, 87",
    "localite": "7370 - DOUR",
    "telephone": "065/61.13.70",
    "email": "info@secteursverts.be",
    "actif": true
  },
  {
    "id": 263,
    "type": "Friterie",
    "nom": "Chez Marino",
    "adresse": "Chemin du Rouge Bonnet, 63",
    "localite": "7370 - DOUR",
    "telephone": "0478/02.87.07",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 264,
    "type": "Friterie",
    "nom": "Burger Grill",
    "adresse": "Grand Place, 21",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 265,
    "type": "Friterie",
    "nom": "Chez Cesare",
    "adresse": "Place Emile Vandervelde, 15",
    "localite": "7370 - DOUR",
    "telephone": "065/63.35.43",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 266,
    "type": "Friterie",
    "nom": "Pitta Istanbul",
    "adresse": "Place Verte, 17/B",
    "localite": "7370 - DOUR",
    "telephone": "0483/43.22.39",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 267,
    "type": "Friterie",
    "nom": "Friterie \"Le Belvédère\"",
    "adresse": "Rue d'élouges, 2",
    "localite": "7370 - DOUR",
    "telephone": "0478/07.49.37",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 268,
    "type": "Friterie",
    "nom": "Le petit Resto SPRL AEF",
    "adresse": "Rue de l'Athenée, 2",
    "localite": "7370 - DOUR",
    "telephone": "0478/62.47.00",
    "email": "geraldhallez@hotmail.com",
    "actif": true
  },
  {
    "id": 269,
    "type": "Friterie",
    "nom": "The Sixties- Chez Malcom",
    "adresse": "Rue de l'église, 54",
    "localite": "7370 - DOUR",
    "telephone": "065/61.01.80",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 270,
    "type": "Friterie",
    "nom": "Crousti frite \"Cheez Christine\"",
    "adresse": "Rue de Ropaix, 73",
    "localite": "7370 - DOUR",
    "telephone": "065/77.97.28",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 271,
    "type": "Friterie",
    "nom": "Fally frites",
    "adresse": "Rue du Commerce, 300",
    "localite": "7370 - DOUR",
    "telephone": "0486/27.09.64",
    "email": "Fallyfrites@gmail.com",
    "actif": true
  },
  {
    "id": 272,
    "type": "Friterie",
    "nom": "La California",
    "adresse": "Rue Grande, 24",
    "localite": "7370 - DOUR",
    "telephone": "065/65.17.59",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 273,
    "type": "Friterie",
    "nom": "Au Cornet Gourmand",
    "adresse": "Rue Grande, 53C",
    "localite": "7370 - DOUR",
    "telephone": "065/84.83.06",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 274,
    "type": "Funérarium",
    "nom": "Ets Palomar & Fils",
    "adresse": "Rue de Ropaix, 183-185",
    "localite": "7370 - DOUR",
    "telephone": "065/64.33.10",
    "email": "funeraillespalomar@gmail.com",
    "actif": true
  },
  {
    "id": 275,
    "type": "Funérarium",
    "nom": "Cordier SPRL",
    "adresse": "Rue de général leman, 18",
    "localite": "7370 - DOUR",
    "telephone": "065/65.36.24",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 276,
    "type": "Garage",
    "nom": "Busieau Steve",
    "adresse": "Rue d'audregnies, 68",
    "localite": "7370 - DOUR",
    "telephone": "0476/72.81.27",
    "email": "a_s2000_10@hotmail.com",
    "actif": true
  },
  {
    "id": 277,
    "type": "Garage",
    "nom": "Garage DI Valerio",
    "adresse": "Rue de Boussu, 71",
    "localite": "7370 - DOUR",
    "telephone": "065/65.96.55",
    "email": "garagedivalerio@gmail.com",
    "actif": true
  },
  {
    "id": 278,
    "type": "Garage",
    "nom": "Garage Sammito Santo",
    "adresse": "Rue du Quesnoy, 46",
    "localite": "7370 - DOUR",
    "telephone": "065/69.05.57",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 279,
    "type": "Garage",
    "nom": "Garage Fayt & fils SPRL",
    "adresse": "Rue Moranfayt, 183",
    "localite": "7370 - DOUR",
    "telephone": "065/71.83.00",
    "email": "contact@opelfayt.be",
    "actif": true
  },
  {
    "id": 280,
    "type": "Garage-Station service",
    "nom": "Denis Garage sprl",
    "adresse": "Rue de boussu, 142",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.37",
    "email": "garage.denis@skynet.be",
    "actif": true
  },
  {
    "id": 281,
    "type": "Garagiste",
    "nom": "Dour auto's",
    "adresse": "Rue d'élouges, 53",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.08",
    "email": "vachaudezjeremy@hotmail.com",
    "actif": true
  },
  {
    "id": 282,
    "type": "Garagiste",
    "nom": "Cordier Yves",
    "adresse": "Rue de la Frontière, 216/218",
    "localite": "7370 - DOUR",
    "telephone": "065/65.04.91",
    "email": "garagecordier@skynet.be",
    "actif": true
  },
  {
    "id": 283,
    "type": "Garagiste",
    "nom": "FKG Motors",
    "adresse": "Rue du peuple, 15",
    "localite": "7370 - DOUR",
    "telephone": "0485/43.88.59",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 284,
    "type": "Géomètre-expert",
    "nom": "Patris Didier",
    "adresse": "Rue Camille Moury, 12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.91.74 ou 0479/72.98.87",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 285,
    "type": "Géomètre-expert",
    "nom": "Cardinal Pierre",
    "adresse": "Rue de la Frontière, 320",
    "localite": "7370 - DOUR",
    "telephone": "0472/27.37.59 ou 065/97.27.80",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 286,
    "type": "Géomètre-expert",
    "nom": "Audin Daniel",
    "adresse": "Rue Nacfer, 41",
    "localite": "7370 - DOUR",
    "telephone": "0474/22.48.00",
    "email": "geometreaudin@gmail.com",
    "actif": true
  },
  {
    "id": 287,
    "type": "Gestion d'évènements",
    "nom": "GOGOGO asbl",
    "adresse": "Rue des Canadiens, 100",
    "localite": "7370 - DOUR",
    "telephone": "Faillite",
    "email": "Faillite",
    "actif": true
  },
  {
    "id": 288,
    "type": "Gestion Holding",
    "nom": "Dumaphar SA",
    "adresse": "Rue de l'église, 32",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 289,
    "type": "Gros œuvre rénovation",
    "nom": "DLS renovation",
    "adresse": "Rue de la Frontière, 291",
    "localite": "7370 - DOUR",
    "telephone": "065/80.36.67 ou 0474/64.03.42",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 290,
    "type": "Grossiste en jouets",
    "nom": "KDO SCRL",
    "adresse": "Rue des Vainqueurs, 116",
    "localite": "7370 - DOUR",
    "telephone": "065/65.14.30",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 291,
    "type": "Grossiste fourniture hygiène",
    "nom": "Octa",
    "adresse": "Rue Nacfer, 87",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 292,
    "type": "Grossiste multimédia",
    "nom": "Media Diffusion SPRL",
    "adresse": "Rue de Baisieux, 10",
    "localite": "7370 - DOUR",
    "telephone": "Faillite",
    "email": "Faillite",
    "actif": true
  },
  {
    "id": 293,
    "type": "Groupe musical",
    "nom": "Les sourissimos asbl",
    "adresse": "Rue de Ropaix, 222",
    "localite": "7370 - DOUR",
    "telephone": "0476/56.52.79",
    "email": "les_sourissimos@hotmail.com",
    "actif": true
  },
  {
    "id": 294,
    "type": "Gynécologue",
    "nom": "Wacri sprl",
    "adresse": "Rue Grande, 99",
    "localite": "7370 - DOUR",
    "telephone": "065/65.45.16",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 295,
    "type": "Gynécologue",
    "nom": "Scorey Catherine",
    "adresse": "Ruee Pairois, 117",
    "localite": "7370 - DOUR",
    "telephone": "0497/22.23.86",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 296,
    "type": "Hébergement personnes avec petit handicap",
    "nom": "A l'ore du bois",
    "adresse": "Rue Trieu Jean Sart, 24",
    "localite": "7370 - DOUR",
    "telephone": "065/80.08.98",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 297,
    "type": "Horticulteur",
    "nom": "Del- garden",
    "adresse": "Rue Basse, 166",
    "localite": "7370 - DOUR",
    "telephone": "065/42.32.25 ou 0497/35.11.56",
    "email": "johandelmotte1203@gmail.com",
    "actif": true
  },
  {
    "id": 298,
    "type": "Horticulteur",
    "nom": "Estievnart Marc",
    "adresse": "Rue de la Frontière, 302",
    "localite": "7370 - DOUR",
    "telephone": "065/65.12.89",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 299,
    "type": "Horticulteur",
    "nom": "Copennaux François",
    "adresse": "Rue de la Frontière, 491",
    "localite": "7370 - DOUR",
    "telephone": "0471/21.71.24",
    "email": "copennaux.francois@gmail.com",
    "actif": true
  },
  {
    "id": 300,
    "type": "Horticulteur prof.acces",
    "nom": "Cliquet Mary",
    "adresse": "Rue des Vainqueurs, 79",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 301,
    "type": "Huissier de justice",
    "nom": "Bruynooghe Jean-Pierre",
    "adresse": "Rue du Peuple, 42A",
    "localite": "7370 - DOUR",
    "telephone": "065/65.10.96",
    "email": "Info@unilex.be",
    "actif": true
  },
  {
    "id": 302,
    "type": "Huissier de justice",
    "nom": "Cassettai Fulvio",
    "adresse": "Rue du Commerce, 289",
    "localite": "7370 - DOUR",
    "telephone": "0479/72.68.94",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 303,
    "type": "Huissier de justice",
    "nom": "Proximilex",
    "adresse": "Rue du Commerce, 289",
    "localite": "7370 - DOUR",
    "telephone": "065/65.53.06 ou 065/65.53.19",
    "email": "www.proximilex.be (email via web)",
    "actif": true
  },
  {
    "id": 304,
    "type": "Huissier de justice",
    "nom": "Boscariol",
    "adresse": "Rue du Rosignol, 56",
    "localite": "7370 - DOUR",
    "telephone": "0496/73.88.21ou 065/62.35.23",
    "email": "info@akeroia.be (email via site web)",
    "actif": true
  },
  {
    "id": 305,
    "type": "Huissier de justice",
    "nom": "Emiveria",
    "adresse": "Rue du Rossignol, 56",
    "localite": "7370 - DOUR",
    "telephone": "0496/73.88.21ou 065/62.35.23",
    "email": "info@akeroia.be (email via site web)",
    "actif": true
  },
  {
    "id": 306,
    "type": "Humanitaire",
    "nom": "Tictac Fondation Privée",
    "adresse": "Rue de la Frontière, 427",
    "localite": "7370 - DOUR",
    "telephone": "065/65.41.86 0470/76.79.01",
    "email": "tictaczen@hotmail.com (pour GSM: personne de contact Mr Lecomte Norbel Thierry, Président)",
    "actif": true
  },
  {
    "id": 307,
    "type": "Humanitaire",
    "nom": "Afrique Solidarité ASBL",
    "adresse": "Rue de la Frontière, 469",
    "localite": "7370 - DOUR",
    "telephone": "065/65.03.78",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 308,
    "type": "Immobilier",
    "nom": "A.G.V. Immo SC Srl",
    "adresse": "Rue d'Elouges,160",
    "localite": "7370 - DOUR",
    "telephone": "065/71.81.27",
    "email": "http://www.agvimmo.com (mail via site web)",
    "actif": true
  },
  {
    "id": 309,
    "type": "Immobilier",
    "nom": "Fracla SRL",
    "adresse": "Rue de Belle-Vue, 46",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.05",
    "email": "www.rougraff.com",
    "actif": true
  },
  {
    "id": 310,
    "type": "Immobilier",
    "nom": "Fridenbergs Alban",
    "adresse": "Rue de la Drève, 24",
    "localite": "7370 - DOUR",
    "telephone": "065/65.34.73",
    "email": "info@fridenbergs.be",
    "actif": true
  },
  {
    "id": 311,
    "type": "Immobilière",
    "nom": "Godimmo SA",
    "adresse": "Grand-Place, 10",
    "localite": "7370 - DOUR",
    "telephone": "065/63.35.33",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 312,
    "type": "Immobilière",
    "nom": "Dour Dépots",
    "adresse": "Place Verte, 33",
    "localite": "7370 - DOUR",
    "telephone": "065/.65.34.73",
    "email": "www.fridenbergs.be",
    "actif": true
  },
  {
    "id": 313,
    "type": "Immobilière",
    "nom": "VBC IMMO",
    "adresse": "Rue Benoit, 2",
    "localite": "7370- DOUR",
    "telephone": "065/43.19.99",
    "email": "www.fridenbergs.be",
    "actif": true
  },
  {
    "id": 314,
    "type": "Immobilière",
    "nom": "AZ-Fashion Srl",
    "adresse": "Rue du Commerce, 163",
    "localite": "7370 - DOUR",
    "telephone": "065/35.22.03 - 0473/30.38.07",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 315,
    "type": "Immobilière",
    "nom": "Immobilière du Préfeuillet",
    "adresse": "Rue du Préfeuillet, 27",
    "localite": "7370 - DOUR",
    "telephone": "065/65.26.36 - 0477/29.44.60",
    "email": "mjol@skynet.be",
    "actif": true
  },
  {
    "id": 316,
    "type": "Immobilière",
    "nom": "DIG'IMMO Srl",
    "adresse": "Rue du Stade, 17",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 317,
    "type": "Immobilière",
    "nom": "Cap 3010 Srl",
    "adresse": "Rue Marcielle, 24",
    "localite": "7370 - DOUR",
    "telephone": "0476/77.45.87 ou 065/46.59.19",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 318,
    "type": "Immobilière",
    "nom": "BH Invent Srl",
    "adresse": "Rue Mitrecq, 5",
    "localite": "7370 - DOUR",
    "telephone": "065/69.15.60",
    "email": "etienne@dour-coworking-village.be - eb@bh-invent.be",
    "actif": true
  },
  {
    "id": 319,
    "type": "Immobilière",
    "nom": "BERNARD Frédérique Srl",
    "adresse": "Rue Ruinsette, 23-25",
    "localite": "7370 - DOUR",
    "telephone": "Faillite",
    "email": "Faillite",
    "actif": true
  },
  {
    "id": 320,
    "type": "Immobilière civile",
    "nom": "C.A.T. Immo Srl",
    "adresse": "Rue des Ecoles, 16",
    "localite": "7370 - DOUR",
    "telephone": "065/33.81.91",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 321,
    "type": "Immobilière commerciale",
    "nom": "Dour Locations Srl",
    "adresse": "Rue des Canadiens, 100",
    "localite": "7370 - DOUR",
    "telephone": "065/65.02.03",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 322,
    "type": "Immobilière patrimoniale",
    "nom": "Jumédia",
    "adresse": "Rue de la Frontière, 127",
    "localite": "7370 - DOUR",
    "telephone": "065/65.23.04 ou 0475/97.60.46",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 323,
    "type": "Immobilière patrimoniale",
    "nom": "Les Jardins de Jouvence SCRL",
    "adresse": "Rue de Ropaix, 14",
    "localite": "7370 - DOUR",
    "telephone": "065/65.99.78",
    "email": "lesjardinsdejouvence@skynet.be",
    "actif": true
  },
  {
    "id": 324,
    "type": "Immobilière patrimoniale",
    "nom": "L'Immo L'Entraîde SA",
    "adresse": "Rue des Canadiens, 100",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 325,
    "type": "Immobilière patrimoniale",
    "nom": "Baasimmo SA",
    "adresse": "Rue Masson, 16",
    "localite": "7370 - DOUR",
    "telephone": "065/65.42.84 - 0475/57.77.96",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 326,
    "type": "Immobilières",
    "nom": "Résidence \"Les Jours Heureux\" SCRL",
    "adresse": "Rue de Ropaix, 16",
    "localite": "7370 - DOUR",
    "telephone": "065/88.78.88 (Définitivement fermé)",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 327,
    "type": "Immobilières",
    "nom": "Quadrimmo SA",
    "adresse": "Rue du Général Leman, 18",
    "localite": "7370 - DOUR",
    "telephone": "065/65.36.24",
    "email": "http://netdir.be/fr/contact.html",
    "actif": true
  },
  {
    "id": 328,
    "type": "Importateur portes + fabrication porte massive",
    "nom": "Frabel Doors SA",
    "adresse": "Z.l. Rue Benoit, 51",
    "localite": "7370 - DOUR",
    "telephone": "065/63.22.18 - 071/25.39.80(siège social)",
    "email": "www.frabeldoors.be/fr/contact",
    "actif": true
  },
  {
    "id": 329,
    "type": "Infirmier à domicile",
    "nom": "Pinsco Srl",
    "adresse": "Rue de la Paix, 10",
    "localite": "7370 - DOUR",
    "telephone": "0476/26.00.69",
    "email": "https://infirmière.nosavis.be",
    "actif": true
  },
  {
    "id": 330,
    "type": "Infirmier à domicile",
    "nom": "Foriez Nicolas",
    "adresse": "Avenue Prince Charles 24",
    "localite": "7350 - THULIN",
    "telephone": "0479/92.18.37",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 331,
    "type": "Infirmier à domicile",
    "nom": "Nisol Stéphanie",
    "adresse": "Rue Fally, 25",
    "localite": "7370 - DOUR",
    "telephone": "065/77.85.94",
    "email": "https://www.nisol-stephanie-infimiere.be",
    "actif": true
  },
  {
    "id": 332,
    "type": "Infirmier indépendant",
    "nom": "Damée Ludovic",
    "adresse": "Rue de Boussu, 19/D",
    "localite": "7370 - DOUR",
    "telephone": "Décéder en 2024",
    "email": "/",
    "actif": true
  },
  {
    "id": 333,
    "type": "Infimière à domicile",
    "nom": "Dewaulle Soins Infirmiers Srl",
    "adresse": "Avenue V. Régnart, 95",
    "localite": "7370 - DOUR",
    "telephone": "0471/65.02.76",
    "email": "https://infirmiers.nosavis.be",
    "actif": true
  },
  {
    "id": 334,
    "type": "Infirmière à domicile",
    "nom": "Infinat Srl",
    "adresse": "Chemin de Thulin, 60",
    "localite": "7370 - DOUR",
    "telephone": "0476/76.94.85 - 0471/87.40.34",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 335,
    "type": "Infirmière à domicile",
    "nom": "Brasseur Ariane",
    "adresse": "Rue César Depaepe,81",
    "localite": "7370 - DOUR",
    "telephone": "0491/19.34.99",
    "email": "ariabrasser@hotmail.com",
    "actif": true
  },
  {
    "id": 336,
    "type": "Infirmière à domicile",
    "nom": "Soins à domicile K.S. SC Srl",
    "adresse": "Rue Culot Quézo, 8",
    "localite": "7370 - DOUR",
    "telephone": "0474/63.24.27 - 065/65.92.58",
    "email": "konieczny.sylviane@scarlet.be",
    "actif": true
  },
  {
    "id": 337,
    "type": "Infirmière à domicile",
    "nom": "Pann Vann Vuther",
    "adresse": "Rue d'Audregnies, 11/B",
    "localite": "7370 - DOUR",
    "telephone": "065/42.81.05 - 0475/87.76.23",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 338,
    "type": "Infirmière à domicile",
    "nom": "Cruyppeninck Marie",
    "adresse": "Rue de Baudinchamp, 1",
    "localite": "7370 - DOUR",
    "telephone": "0478/24.32.40",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 339,
    "type": "Infirmière à domicile",
    "nom": "Cuvelier Marie-France",
    "adresse": "Rue de la Frontière, 315",
    "localite": "7370 - DOUR",
    "telephone": "0476/20.94.68",
    "email": "mariefrance.cuvelier@skynet.be",
    "actif": true
  },
  {
    "id": 340,
    "type": "Infirmière à domicile",
    "nom": "Soins Infi.Dom. SC Srl",
    "adresse": "Rue de la Gare de Wihéries, 22",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 341,
    "type": "Infirmière à domicile",
    "nom": "Bertiaux Daisy",
    "adresse": "Rue de la Gare de  Wihéries, 28",
    "localite": "7370 - DOUR",
    "telephone": "0497/93.60.46",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 342,
    "type": "Infirmière à domicile",
    "nom": "Infi-Safe Srl",
    "adresse": "Rue de Là-Haut, 144",
    "localite": "7370 - DOUR",
    "telephone": "065/65.93.54 - 0472/49.03.89",
    "email": "infisafe@hotmail.com",
    "actif": true
  },
  {
    "id": 343,
    "type": "Infirmière à domicile",
    "nom": "Soins Infirmiers à domicile LMT SC Srl",
    "adresse": "Rue de Ropaix, 217",
    "localite": "7370 - DOUR",
    "telephone": "065/65.50.89",
    "email": "https://nosavis.be (via site web)",
    "actif": true
  },
  {
    "id": 344,
    "type": "Infirmière à domicile",
    "nom": "Levecq Aurélie",
    "adresse": "Rue des Andrieux, 192",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 345,
    "type": "Infirmière à domicile",
    "nom": "Tailler Valérie",
    "adresse": "Rue des Chênes, 6",
    "localite": "7370 - DOUR",
    "telephone": "Ps d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 346,
    "type": "Infirmière à domicile",
    "nom": "Infirmière Delpature Vanessa Srl",
    "adresse": "Rue du Commerce 172",
    "localite": "7370 - DOUR",
    "telephone": "065/63.33.81",
    "email": "ducloyéskynet.be",
    "actif": true
  },
  {
    "id": 347,
    "type": "Infirmière à domicile",
    "nom": "Deroubaix Louise",
    "adresse": "Rue du Parc 25",
    "localite": "7370 - DOUR",
    "telephone": "0499/60.43.36",
    "email": "https://nosavis.be (via site web)",
    "actif": true
  },
  {
    "id": 348,
    "type": "Infirmière à domicile",
    "nom": "Rousseau Christel",
    "adresse": "Rue du Quesnoy 44",
    "localite": "7370 - DOUR",
    "telephone": "0497/66.14.35",
    "email": "https://nosavis .be (via site web)",
    "actif": true
  },
  {
    "id": 349,
    "type": "Infirmière à domicile",
    "nom": "Desfachelle Corinne",
    "adresse": "Rue Pairois 47",
    "localite": "7370 - DOUR",
    "telephone": "0474/36.77.57",
    "email": "Inactive",
    "actif": true
  },
  {
    "id": 350,
    "type": "Infirmière à domicile",
    "nom": "Hecq Arlette",
    "adresse": "Rue Pont-à-Cavains 105",
    "localite": "7370 - DOUR",
    "telephone": "0475/73.49.60",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 351,
    "type": "Infirmière à domicile",
    "nom": "Marano Saverina",
    "adresse": "Rue Pont-à-Cavains 108",
    "localite": "7370 - DOUR",
    "telephone": "0473/33.07.89",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 352,
    "type": "Infirmière à domicile",
    "nom": "Duez Amélie",
    "adresse": "Rue Aimerie 177",
    "localite": "7370 - DOUR",
    "telephone": "0470/35.31.58",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 353,
    "type": "Infirmière à domicile",
    "nom": "Durieux Louise",
    "adresse": "Rue Sainte-Catherine 85",
    "localite": "7370 - DOUR",
    "telephone": "0498/64.73.03 - 065/63.06.20",
    "email": "https://nosavis .be (via site web)",
    "actif": true
  },
  {
    "id": 354,
    "type": "Infirmière à domicile",
    "nom": "Bourlard Christiane",
    "adresse": "Rue Saussette 22",
    "localite": "7370 - DOUR",
    "telephone": "065/65.07.93",
    "email": "pas information",
    "actif": true
  },
  {
    "id": 355,
    "type": "Infirmière à domicile",
    "nom": "Infi.SI Srl",
    "adresse": "Rue des Canarderie 81",
    "localite": "7370 - DOUR",
    "telephone": "065/65.28.94 - 0472/59.11.63",
    "email": "https:/local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 356,
    "type": "Infirmière à domicile",
    "nom": "Infi-Soins Services SPRL-Starter sRL",
    "adresse": "Rue Vivtor Caudron 10",
    "localite": "7370 - DOUR",
    "telephone": "Fermer",
    "email": "cloture de liquidation",
    "actif": true
  },
  {
    "id": 357,
    "type": "Infirmière à domicile",
    "nom": "Badjir stéphanie",
    "adresse": "Rue Victor Caudron 10",
    "localite": "7370 - DOUR",
    "telephone": "0474/64.53.00",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 358,
    "type": "Infirmière à domicile",
    "nom": "Bertiaux Michelle",
    "adresse": "Sentier de Montignies 11",
    "localite": "7370 - DOUR",
    "telephone": "0484/76.25.53",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 359,
    "type": "Infirmière à domicile",
    "nom": "Tourneur Naïs",
    "adresse": "Voie de Sars 34",
    "localite": "7370 - DOUR",
    "telephone": "0479/38.12.08",
    "email": "https://nosavis.be (via site web)",
    "actif": true
  },
  {
    "id": 360,
    "type": "Infographie",
    "nom": "Bruyere Thomas",
    "adresse": "Rue Trieu Jean Sart 30",
    "localite": "7370 - DOUR",
    "telephone": "0496/21.60.16",
    "email": "pas dinformation",
    "actif": true
  },
  {
    "id": 361,
    "type": "Infographisme, publicité",
    "nom": "TOP PUB",
    "adresse": "Place Verte 1 A",
    "localite": "7370 - DOUR",
    "telephone": "065/66.73.14",
    "email": "www.toppub.be",
    "actif": true
  },
  {
    "id": 362,
    "type": "Informatique",
    "nom": "Vasseur Julien",
    "adresse": "Rue Alexandre Patte 26",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermer",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 363,
    "type": "Informatique",
    "nom": "Valex Informatique",
    "adresse": "Rue de la Chapelle 8",
    "localite": "7370 - DOUR",
    "telephone": "065/63.34.33",
    "email": "pas d'information",
    "actif": true
  },
  {
    "id": 364,
    "type": "Informatique",
    "nom": "Infodep",
    "adresse": "Rue de la Grande Veine 143",
    "localite": "7370 - DOUR",
    "telephone": "0495/58.52.43",
    "email": "gregory.winkowski@infodep.be",
    "actif": true
  },
  {
    "id": 365,
    "type": "Informatique, création de site web,...",
    "nom": "Tricart Joël",
    "adresse": "Rue des Honnelles 2",
    "localite": "7370 - DOUR",
    "telephone": "065/66.43.34 - 0474/66.05.97",
    "email": "pas d'information",
    "actif": true
  },
  {
    "id": 366,
    "type": "Ingénieur en construction",
    "nom": "Coquelet Anne-Sophie",
    "adresse": "Rue de Ropaix 289",
    "localite": "7370 - DOUR",
    "telephone": "0477/27.28.26",
    "email": "pas d'information",
    "actif": true
  },
  {
    "id": 367,
    "type": "Institut de beauté",
    "nom": "Institut de beauté Cléopatra",
    "adresse": "Rue du Chêne Brûlé 82",
    "localite": "7370 - DOUR",
    "telephone": "065/63.04.41 - 0477/80.64.06",
    "email": "institut.cleopatra@gmail.com",
    "actif": true
  },
  {
    "id": 368,
    "type": "Intermédiaire commercial",
    "nom": "Quenon Robert",
    "adresse": "Rue de Ropaix 8",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Arrêt activité",
    "actif": true
  },
  {
    "id": 369,
    "type": "Intermédiaire commercial",
    "nom": "I.C.M Srl",
    "adresse": "Rue des Cerisiers 3",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Arrêt , Cloture de liquidation",
    "actif": true
  },
  {
    "id": 370,
    "type": "Intermédiaire commercial",
    "nom": "Bertiau Pierre",
    "adresse": "Rue Planche d'Aulne 25",
    "localite": "7370 - DOUR",
    "telephone": "065/62.13.67",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 371,
    "type": "Intermédiaires en commerce de textiles, habillement",
    "nom": "ALC DIFFUSION Srl",
    "adresse": "Avenue Jules Sartieaux 40",
    "localite": "7370 - DOUR",
    "telephone": "065/82.46.33",
    "email": "alc-diffusion@live.be",
    "actif": true
  },
  {
    "id": 372,
    "type": "Intermédiaires non spécialisés en commerce",
    "nom": "(Group Knives) Sachinidis Athanassios",
    "adresse": "Rue d'Elouges 47",
    "localite": "7370 - DOUR",
    "telephone": "065/63.15.38 - 0475/37.60.20",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 373,
    "type": "Intermédiaire non spécialisés en commerce",
    "nom": "Ducobu Jean-Luc",
    "adresse": "Rue Saint-Louis 33",
    "localite": "7370 - DOUR",
    "telephone": "0476/89.08.86",
    "email": "pas d'information",
    "actif": true
  },
  {
    "id": 374,
    "type": "Investissements",
    "nom": "Blendwell Invest Srl",
    "adresse": "Rue Benoit 50",
    "localite": "7370 - DOUR",
    "telephone": "065/67.86.73 - 0479/99.32.58",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 375,
    "type": "Isolation Industrielle",
    "nom": "Isolation Invest & CO Srl",
    "adresse": "Rue Nacfer 17",
    "localite": "7370 - DOUR",
    "telephone": "065/63.44.20 - 0489/30.76.34",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 376,
    "type": "Kinésithérapeute",
    "nom": "Graci Amaury",
    "adresse": "Rue de la Gayolle 102",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.60 - 0473/74.12.16",
    "email": "https://nosavis.be",
    "actif": true
  },
  {
    "id": 377,
    "type": "Kinésithérapeute",
    "nom": "Poisy Guillaume",
    "adresse": "Rue de l'Yser 80",
    "localite": "7370 - DOUR",
    "telephone": "0477/65.22.02",
    "email": "poisy.guillaume@gmail.com",
    "actif": true
  },
  {
    "id": 378,
    "type": "Kinésithérapeute",
    "nom": "Dehon Etienne",
    "adresse": "rue des Andrieux 31",
    "localite": "7370 - DOUR",
    "telephone": "065/63.35.15 (privé) - 065/63.06.46",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 379,
    "type": "Kinésithérapeute",
    "nom": "Gilron Philippe",
    "adresse": "Rue des andrieux 31",
    "localite": "7370 - DOUR",
    "telephone": "065/65.58.26 - 0479/21.25.04",
    "email": "pgilron@gmail.com",
    "actif": true
  },
  {
    "id": 380,
    "type": "Kinésithérapeute",
    "nom": "Cabinet Para Médical Elie Cuvelier",
    "adresse": "Rue des Canadiens 193",
    "localite": "7370 - DOUR",
    "telephone": "065/65.34.32",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 381,
    "type": "Kinésithérapeute",
    "nom": "Gymnastique et santé Srl",
    "adresse": "Rue du Parc 28",
    "localite": "7370 - DOUR",
    "telephone": "065/65.37.25",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 382,
    "type": "Kinésithérapeute",
    "nom": "Declercq Olivier",
    "adresse": "Rue de Roi Albert 2",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.05",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 383,
    "type": "Kinésithérapeute",
    "nom": "Delhaye Isabelle",
    "adresse": "Rue Ferrer 69",
    "localite": "7370 - DOUR",
    "telephone": "065/63.09.51",
    "email": "https://nosavis .be (via site web)",
    "actif": true
  },
  {
    "id": 384,
    "type": "Kinésithérapeute",
    "nom": "Kiné Wantiez",
    "adresse": "Rue Grande 90 - 92",
    "localite": "7370 - DOUR",
    "telephone": "065/75.96.28 (privé) - 065/65.15.58",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 385,
    "type": "Kinésithérapeute",
    "nom": "Brohée Chantal",
    "adresse": "Rue Henri Pochez 159",
    "localite": "7370 - DOUR",
    "telephone": "065/65.91.67",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 386,
    "type": "Kinésithérapeute",
    "nom": "Colmant Emmanuel",
    "adresse": "Rue du Pont-à-Cavains 15",
    "localite": "7370 - DOUR",
    "telephone": "065/75.56.00",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 387,
    "type": "Kinésithérapeute",
    "nom": "Wuilquot Gaelle",
    "adresse": "Rue Robert Tachenion 12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.38.88 - 0477/42.54.97",
    "email": "www.locauxdeschaperons.be (via site web)",
    "actif": true
  },
  {
    "id": 388,
    "type": "Kinésithérapeute",
    "nom": "Frisque Nelson",
    "adresse": "Rue de la Fontière 181",
    "localite": "7370 - DOUR",
    "telephone": "065/78.38.54 - 0472/01.92.58",
    "email": "nelson_frisque@gmail.com",
    "actif": true
  },
  {
    "id": 389,
    "type": "Kinésithérapeute",
    "nom": "Honoré Jean-Luc",
    "adresse": "Rue d'Elouges 50",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.75",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 390,
    "type": "Kinésithérapeute",
    "nom": "Graci Pierre",
    "adresse": "Rue de la Gayolle 102",
    "localite": "7370 - DOUR",
    "telephone": "0475/69.68.78",
    "email": "https://nosavis.be (via site web)",
    "actif": true
  },
  {
    "id": 391,
    "type": "Kinésithérapeute",
    "nom": "Laskowski Natacha",
    "adresse": "Rue du Parc 8",
    "localite": "7370 - DOUR",
    "telephone": "065/65.62.21 - 0478/96.32.73",
    "email": "https://nosavis.be (via site web)",
    "actif": true
  },
  {
    "id": 392,
    "type": "Kinésithérapeute",
    "nom": "Delsaut Corinne",
    "adresse": "Rue Grande 16",
    "localite": "7370 - DOUR",
    "telephone": "065/65.62.70 - 0474/34.82.72",
    "email": "https://facebook.com/messages/t/bpagina.be?ref=cylex",
    "actif": true
  },
  {
    "id": 393,
    "type": "Kinésithérapeute- Infirmière indépendantes",
    "nom": "Cabinet Defrise-Bouchez Srl",
    "adresse": "Rue Saint-Antoine 110",
    "localite": "7300 - BOUSSU",
    "telephone": "0474/76.63.77",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 394,
    "type": "Lavage vitres",
    "nom": "H20 Clean",
    "adresse": "Rue Fleurichamps 43",
    "localite": "7370 - DOUR",
    "telephone": "0472/67.51.60",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 395,
    "type": "Lavoir",
    "nom": "Lavoir Blianca",
    "adresse": "Rue Henri Pochez 144",
    "localite": "7370 - DOUR",
    "telephone": "0474/97.33.93",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 396,
    "type": "Lavoir public",
    "nom": "Lavoir de la place",
    "adresse": "Rue du Commerce 157",
    "localite": "7370 - DOUR",
    "telephone": "0473/61.66.79 - 0471/67.28.50",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 397,
    "type": "Librairie",
    "nom": "Librairie Robert Frédéric (INFOCADO)",
    "adresse": "Grand'Place 29",
    "localite": "7370 - DOUR",
    "telephone": "065/65.63.78",
    "email": "https://fr.cylex-belgie.be/contactform?companyId=13038906&companyName=infocado",
    "actif": true
  },
  {
    "id": 398,
    "type": "Librairie",
    "nom": "Librairie des Trichères",
    "adresse": "Place Emile Vandervelde 43",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 399,
    "type": "Librairie",
    "nom": "Librairie DENIS Toni",
    "adresse": "Rue du Commerce 203",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 400,
    "type": "Librairie",
    "nom": "Librairie Lespinne",
    "adresse": "Rue du Commerce 303",
    "localite": "7370 - DOUR",
    "telephone": "065/69.09.99 - 069/57.95.05 (privé)",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 401,
    "type": "Librairie",
    "nom": "Librairie Spécialisée \"Néopolis\"",
    "adresse": "Rue Grande 85",
    "localite": "7370 - DOUR",
    "telephone": "065/66.15.00 - 065/51.23.97",
    "email": "https://www.neopolisdour.be",
    "actif": true
  },
  {
    "id": 402,
    "type": "Librairie",
    "nom": "Librairie Bortolini",
    "adresse": "Rue Maréchal Foch 33-35",
    "localite": "7370 - DOUR",
    "telephone": "065/65.21.32",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 403,
    "type": "Librairie",
    "nom": "Bary Séverine",
    "adresse": "Rue Nacfer 79",
    "localite": "7370 - DOUR",
    "telephone": "0474/44.45.96",
    "email": "www.librairienicole.be",
    "actif": true
  },
  {
    "id": 404,
    "type": "Librairie",
    "nom": "Librairie Nicole",
    "adresse": "Rue Nacfer 79",
    "localite": "7370 - DOUR",
    "telephone": "065/65.63.81",
    "email": "bs-librairie@hotmail.com",
    "actif": true
  },
  {
    "id": 405,
    "type": "Lingerie",
    "nom": "Magasin \"La Française\"",
    "adresse": "Rue Maréchal Foch 45",
    "localite": "7370 - DOUR",
    "telephone": "065/65.27.58 (magasin)",
    "email": "fa542830@skynet.be",
    "actif": true
  },
  {
    "id": 406,
    "type": "Livraison courrier médical",
    "nom": "Colson Rodrigue",
    "adresse": "Rue de la Chapelle 103",
    "localite": "7370 - DOUR",
    "telephone": "0497/66.74.94",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 407,
    "type": "Livreur",
    "nom": "Payen Gérôme",
    "adresse": "Rue Neuve 2",
    "localite": "7370 - DOUR",
    "telephone": "065/97.19.52 - 0474/67.24.37",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 408,
    "type": "Location de Garages",
    "nom": "Capouillez Roger",
    "adresse": "Rue Moranfayt 225",
    "localite": "7370 - DOUR",
    "telephone": "065/65.54.26",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 409,
    "type": "Location de Garages",
    "nom": "Galimberti Anna Maria",
    "adresse": "Rue saussette 105",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 410,
    "type": "Location logements sociaux",
    "nom": "Le Logis Dourois Scrl",
    "adresse": "Rue des Anémones 13-14",
    "localite": "7370 - DOUR",
    "telephone": "065/61.20.10",
    "email": "info@lelogisdourois.be",
    "actif": true
  },
  {
    "id": 411,
    "type": "Location lmatériel horeca",
    "nom": "Pierart Christophe",
    "adresse": "Rue Planche à l'Aulne 7",
    "localite": "7370 - DOUR",
    "telephone": "065/63.44.26 - 0476/30.03.98",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 412,
    "type": "Logopède",
    "nom": "Dramaix Sylvianne",
    "adresse": "Place Verte 25",
    "localite": "7370 - DOUR",
    "telephone": "065/79.50.97 - 0479/33.29.63",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 413,
    "type": "Logopède",
    "nom": "Mahieu Nathalie",
    "adresse": "rue de la Frontière 44",
    "localite": "7370 - DOUR",
    "telephone": "065/46.59.27 - 0476/84.77.79",
    "email": "pas de mail",
    "actif": true
  },
  {
    "id": 414,
    "type": "Logopède",
    "nom": "Crapez Pauline",
    "adresse": "Avenue Noël Deprez 2",
    "localite": "7334 - ST-GHISLAIN",
    "telephone": "0477/07.51.55",
    "email": "crapezpauline.1411@gmail.com",
    "actif": true
  },
  {
    "id": 415,
    "type": "Logopède",
    "nom": "Pauwels Marie",
    "adresse": "Rue des Andrieux 80",
    "localite": "7370 - DOUR",
    "telephone": "0473/29.62.09 - 0476/74.27.74",
    "email": "marie-pauwels@hotmail.com",
    "actif": true
  },
  {
    "id": 416,
    "type": "Logopède",
    "nom": "Roensmaens Marie-Eve",
    "adresse": "Rue des Andrieux 83",
    "localite": "7370 - DOUR",
    "telephone": "0479/73.19.03",
    "email": "source à vérifier car sur internet apparait comme kiné",
    "actif": true
  },
  {
    "id": 417,
    "type": "Logopède",
    "nom": "Gallez Marie",
    "adresse": "Rue Grande 110",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "source à vérifier car sur internet apparait comme kiné",
    "actif": true
  },
  {
    "id": 418,
    "type": "Logopède",
    "nom": "Cabinet de Logopèdie Beaudoint Mélanie",
    "adresse": "Rue Quevauville 52",
    "localite": "7370 - DOUR",
    "telephone": "0483/13.03.37",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 419,
    "type": "Logopède",
    "nom": "Renard Maud",
    "adresse": "Rue Robert Tachenion 12",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 420,
    "type": "Magasin alimentaire",
    "nom": "Le courthéoux \"magasin d'alimentation\"",
    "adresse": "Rue Basse 19",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.44",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 421,
    "type": "Magasin alimentaire",
    "nom": "Magasin d'alimentation",
    "adresse": "Rue de la Frontière 37",
    "localite": "7370 - DOUR",
    "telephone": "065/63.14.65",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 422,
    "type": "Magasin articles equestre",
    "nom": "Esquestrian Equipment Virginie Bourlart-Fayt",
    "adresse": "Rue Moranfayt 175",
    "localite": "7370 - DOUR",
    "telephone": "0476/36.91.15",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 423,
    "type": "Maintenance industrielle",
    "nom": "European Services Maintenance Industrielle Srl",
    "adresse": "Rue des Vainqueurs 5/apt 1",
    "localite": "7370 - DOUR",
    "telephone": "065/69.08.42 - 0474/51.19.08 - 0473/92.15.35",
    "email": "rioda_franck@hotmail.com",
    "actif": true
  },
  {
    "id": 424,
    "type": "Maison de Repos",
    "nom": "Entraide protestante ASBL\"Bienvenue\"",
    "adresse": "Rue de la Frontière 77",
    "localite": "7370 - DOUR",
    "telephone": "065/75.14.10 - 065/65.28.94 - 065/65.28.90",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 425,
    "type": "Maison de Repos",
    "nom": "Entraide protestante ASBL \"Bon Accueil\"",
    "adresse": "Rue des Andrieux 180",
    "localite": "7370 - DOUR",
    "telephone": "065/75.12.20",
    "email": "secretariat@entraideprotestante-bonaccueil.be",
    "actif": true
  },
  {
    "id": 426,
    "type": "Maison de Repos",
    "nom": "Le Bon Repos",
    "adresse": "Rue d'Elouges 86",
    "localite": "7373 - DOUR",
    "telephone": "065/45.00.40",
    "email": "virginie.tokarski@cpas-dour.be",
    "actif": true
  },
  {
    "id": 427,
    "type": "Management",
    "nom": "A &G Management Srl",
    "adresse": "Rue Planche Cabeille 61",
    "localite": "7370 - DOUR",
    "telephone": "0476/96.21.80",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 428,
    "type": "Manifectations sportives + culturelles",
    "nom": "SLC DOUR ASBL",
    "adresse": "Place du Jeu de Balle 24",
    "localite": "7370 - DOUR",
    "telephone": "0473/19.14.56",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 429,
    "type": "Maraîcher Bio",
    "nom": "Jeune Pousse",
    "adresse": "Rue de Boussu 26",
    "localite": "7370 - DOUR",
    "telephone": "0473/67.30.74",
    "email": "https://hainaut-terredegouts.be",
    "actif": true
  },
  {
    "id": 430,
    "type": "Maraîcher Bio",
    "nom": "Carre Philippe \"Les Folies Maraîchères\"",
    "adresse": "Rue du commerce 147",
    "localite": "7370 - DOUR",
    "telephone": "0478/51.68.22",
    "email": "philippe.carre[at]skynet.be",
    "actif": true
  },
  {
    "id": 431,
    "type": "Marche Nordique",
    "nom": "Mielikki ASBL",
    "adresse": "Rue des Cocars 56",
    "localite": "7370 - DOUR",
    "telephone": "065/63.05.13 - 0472/68.28.71",
    "email": "info@mielikki.be",
    "actif": true
  },
  {
    "id": 432,
    "type": "Marketing de réseau",
    "nom": "Chasserez Alisson",
    "adresse": "Rue de Quesnoy 75",
    "localite": "7370 - DOUR",
    "telephone": "065/64.30.84 - 0479/72.01.68",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 433,
    "type": "Massage harmonisant",
    "nom": "Les clefs du bien être",
    "adresse": "Rue de la Frontière 465",
    "localite": "7370 - DOUR",
    "telephone": "0479/59.27.94",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 434,
    "type": "Matériaux de Construction",
    "nom": "Delhaye Négoce Srl",
    "adresse": "Chemin des Fours 13",
    "localite": "7370 - DOUR",
    "telephone": "065/63.28.35 - 0477/23.96.87",
    "email": "hubert.delhaye@skynet.be",
    "actif": true
  },
  {
    "id": 435,
    "type": "Matériaux de Construction",
    "nom": "Dour Matériaux Sa",
    "adresse": "Rue Aimeries 95",
    "localite": "7370 - DOUR",
    "telephone": "065/65.92.50 - 0474/78.70.05",
    "email": "dour.materiaux@skynet.be",
    "actif": true
  },
  {
    "id": 436,
    "type": "Matériaux de Construction",
    "nom": "Van Roy matériaux Srl",
    "adresse": "Rue Robert Tachenion 57",
    "localite": "7370 - DOUR",
    "telephone": "065/63.17.63",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 437,
    "type": "Médecin",
    "nom": "Saussez Gaëtan",
    "adresse": "Rue Alfred Danhier 19",
    "localite": "7370 - DOUR",
    "telephone": "065/65.05.75 - 0474/75.69.58",
    "email": "drsaussez.mikrono.com",
    "actif": true
  },
  {
    "id": 438,
    "type": "Médecin",
    "nom": "Di Emidio T. Srl",
    "adresse": "Rue de la Frontière 126",
    "localite": "7370 - DOUR",
    "telephone": "065/82.24.81",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 439,
    "type": "Médecin",
    "nom": "Dufrasne Amandine",
    "adresse": "Rue de Ropaix 192",
    "localite": "7370 - DOUR",
    "telephone": "0476/39.26.91",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 440,
    "type": "Médecin",
    "nom": "Docteurs Caravella & Colmant SC Srl",
    "adresse": "Rue des Andrieux 150",
    "localite": "7370 - DOUR",
    "telephone": "065/65.16.50",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 441,
    "type": "Médecin",
    "nom": "Docteur Pascal Nagypal Srl",
    "adresse": "Rue du Chêne Brûlé 14",
    "localite": "7370 - DOUR",
    "telephone": "065/67.73.13 - 0474/45.14.13",
    "email": "https://www.infobel.com",
    "actif": true
  },
  {
    "id": 442,
    "type": "Médecin",
    "nom": "Docteur Cherif Djemal Srl",
    "adresse": "Rue du Chêne Brûlé 89",
    "localite": "7370 - DOUR",
    "telephone": "065/67.93.22",
    "email": "https://www.dr-djemal.com",
    "actif": true
  },
  {
    "id": 443,
    "type": "Médecin",
    "nom": "Chauvin Caroline",
    "adresse": "Sentier de Montignies 7",
    "localite": "7370 - DOUR",
    "telephone": "065/80.17.92",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 444,
    "type": "Médecin",
    "nom": "Dequevy Marie-Thérèse",
    "adresse": "Rue du Commerce 92",
    "localite": "7370 - DOUR",
    "telephone": "065/63.10.34",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 445,
    "type": "Médecin",
    "nom": "Destrebecq Steve",
    "adresse": "Rue Emile Estièvenant 15",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 446,
    "type": "Médecin",
    "nom": "Srl Docteur Sandra Amorelli",
    "adresse": "Rue du Marché 74",
    "localite": "7370 - DOUR",
    "telephone": "065/69.06.28",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 447,
    "type": "Médecin",
    "nom": "Masy Philippe",
    "adresse": "Rue Grande 70",
    "localite": "7370 - DOUR",
    "telephone": "065/65.11.44",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 448,
    "type": "Médecin",
    "nom": "D'Emidio Valéria",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (Centre Médical Dourois)",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 449,
    "type": "Médecin",
    "nom": "Maffeo SC Srl",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (centre médical Dourois) - 065/65.24.29",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 450,
    "type": "Médecin",
    "nom": "Valente Fernandes Julie",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (centre médical Dourois )",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 451,
    "type": "Médecin",
    "nom": "Zaro Massimo",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (centre médical Dourois )",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 452,
    "type": "Médecin",
    "nom": "Louvrier Srl",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (centre médical Dourois) - 065/63.11.15 (privé)",
    "email": "info@progenda .be",
    "actif": true
  },
  {
    "id": 453,
    "type": "Médecin",
    "nom": "Reversez Anne",
    "adresse": "Rue Nacfer 15",
    "localite": "7370 - DOUR",
    "telephone": "065/65.19.65 - 0470/97.13.89",
    "email": "reversez_anne@hotmail.com",
    "actif": true
  },
  {
    "id": 454,
    "type": "Médecin",
    "nom": "Reversez Georges",
    "adresse": "Rue Nacfer 15",
    "localite": "7370 - DOUR",
    "telephone": "065/65.54.30 - 065/65.54.90",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 455,
    "type": "Médecin",
    "nom": "Saussez Alain",
    "adresse": "Rue Pairois 43",
    "localite": "7370 - DOUR",
    "telephone": "065/65.35.28",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 456,
    "type": "Médecin",
    "nom": "Pépin Hubert",
    "adresse": "Rue de la chapelle 71",
    "localite": "7370 - DOUR",
    "telephone": "065/65.33.96",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 457,
    "type": "Médecin",
    "nom": "Baugnies Philippe",
    "adresse": "Rue du Moulin Mollet 1",
    "localite": "7370 - DOUR",
    "telephone": "065/65.05.89",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 458,
    "type": "Médecin",
    "nom": "Paquay Renaud",
    "adresse": "Rue Aimeries 161",
    "localite": "7370 - DOUR",
    "telephone": "065/65.65.90",
    "email": "docteur-renaud-paquay.business.site",
    "actif": true
  },
  {
    "id": 459,
    "type": "Médecin Généraliste",
    "nom": "Vilain L.Srl",
    "adresse": "Rue d'Offignies 90",
    "localite": "7370 - DOUR",
    "telephone": "065/63.09.06",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 460,
    "type": "Médecin Généraliste",
    "nom": "Namur Anne-Lyse",
    "adresse": "Rue de Boussu 28",
    "localite": "7370 - DOUR",
    "telephone": "065/65.29.00",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 461,
    "type": "Médecin Généraliste",
    "nom": "Goart José Srl",
    "adresse": "Rue Drève Jouveneau 24",
    "localite": "7370 - DOUR",
    "telephone": "065/63.16.09 - 0475/40.83.54",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 462,
    "type": "Médecin Généraliste",
    "nom": "Strappazon Marie-Claude",
    "adresse": "Rue du Commerce 404",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 463,
    "type": "Médecin Généraliste",
    "nom": "Hecq Bernard Daniel",
    "adresse": "Rue du Roi Albert 33",
    "localite": "7370 - DOUR",
    "telephone": "065/65.20.36",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 464,
    "type": "Médecin Généraliste",
    "nom": "Henry Gérard Srl",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (centre médical Dourois)",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 465,
    "type": "Médiations et atelier de développement",
    "nom": "Indigo ASBL",
    "adresse": "Rue Fulgence Masson 24",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 466,
    "type": "Médicale",
    "nom": "Cabinet médical du docteur Jacques Dufrane Srl",
    "adresse": "Rue de la Chapelle 86",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 467,
    "type": "Médicale",
    "nom": "Dufrane Anouk",
    "adresse": "Hameau de Poningue 110",
    "localite": "7350 - Thulin",
    "telephone": "065/60.04.55 - 0476/89.04.30",
    "email": "anouk.duf@gmail.com",
    "actif": true
  },
  {
    "id": 468,
    "type": "Médicale",
    "nom": "Harmati Koralie",
    "adresse": "Rue des Andrieux 150",
    "localite": "7370 - DOUR",
    "telephone": "065/56.88.56 - 0478/18.28.63",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 469,
    "type": "Menuiserie",
    "nom": "Menuiserie pepe Domenico",
    "adresse": "Rue de la Grande Veine 69",
    "localite": "7370 - DOUR",
    "telephone": "065/69.11.31 - 0473/31.35.48 Mr Domenico - 0487/14.26.07 Mr Alessandro",
    "email": "Menuiseriepepe@gmail.com",
    "actif": true
  },
  {
    "id": 470,
    "type": "Menuiserie",
    "nom": "Vandenberghe Jean-Luc",
    "adresse": "Rue de Ropaix 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.36.29",
    "email": "menuiserie.vendenberghe@skynet.be",
    "actif": true
  },
  {
    "id": 471,
    "type": "Menuiserie",
    "nom": "Ledune Srl",
    "adresse": "Rue du Roi Albert 64",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 472,
    "type": "Menuiserie",
    "nom": "Ruelle David",
    "adresse": "Rue du Stade 28",
    "localite": "7370 - DOUR",
    "telephone": "065/46.54.78 - 0474/34.16.47",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 473,
    "type": "Menuiserie",
    "nom": "Smoos Pascal",
    "adresse": "Rue Emile Cornez 7",
    "localite": "7370 - DOUR",
    "telephone": "065/66.30.68 - 0489/57.14.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 474,
    "type": "Menuiserie",
    "nom": "Ruscart Claude",
    "adresse": "Rue Henri Pochez 171",
    "localite": "7370 - DOUR",
    "telephone": "065/23.56.68 - 0476/60.96.48",
    "email": "claude.ruscart@belgacom.net",
    "actif": true
  },
  {
    "id": 475,
    "type": "Menuiserie",
    "nom": "Frans Richez",
    "adresse": "Rue Jean Volders 4",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.08 - 0472/23.85.52",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 476,
    "type": "Menuiserie",
    "nom": "Baudouin Beriot Srl",
    "adresse": "Rue Planche à l'Aulne 50",
    "localite": "7370 - DOUR",
    "telephone": "065/65.93.26 - 0479/23.63.63",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 477,
    "type": "Menuiserie-Toiture",
    "nom": "Cupelli Guiseppe",
    "adresse": "Rue de Boussu 107",
    "localite": "7370 - DOUR",
    "telephone": "065/63.36.82",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 478,
    "type": "Menuiserie-volets-protections scolaire",
    "nom": "Sandibleux Robert et fils Srl",
    "adresse": "Rue Culot Quézo 2",
    "localite": "7370 - DOUR",
    "telephone": "065/67.43.52 - 0473/53.97.20",
    "email": "robert.gandibleux@skynet .be",
    "actif": true
  },
  {
    "id": 479,
    "type": "Négoce",
    "nom": "Multi Bazar SCRL",
    "adresse": "Rue de la Frontière 422",
    "localite": "7370 - DOUR",
    "telephone": "065/78.46.57 - 0475/28.25.44",
    "email": "https://www.multibazar.be",
    "actif": true
  },
  {
    "id": 480,
    "type": "Négoce alimentaire",
    "nom": "Walagri",
    "adresse": "Z.IRue Benoit 54",
    "localite": "7370 - DOUR",
    "telephone": "0473/83.60.49",
    "email": "elouges@lebrun.be",
    "actif": true
  },
  {
    "id": 481,
    "type": "Négociant en grains",
    "nom": "Godart Serge",
    "adresse": "Rue de la Frontière 190",
    "localite": "7370 - DOUR",
    "telephone": "065/65.21.39",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 482,
    "type": "Négociant en produits agricoles",
    "nom": "Ets De Poortere Jean SA",
    "adresse": "Rue de France 52",
    "localite": "7370 - DOUR",
    "telephone": "065/65.29.71 - 0475/28.81.62",
    "email": "https://depoortere-jean.be (via site web)",
    "actif": true
  },
  {
    "id": 483,
    "type": "Night Shop",
    "nom": "Night Shop",
    "adresse": "Rue MaréchalFoch 11",
    "localite": "7370 - DOUR",
    "telephone": "065/63.46.23 - 0479/50.49.09",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 484,
    "type": "Notaire",
    "nom": "Anne Wuilquot & Emmanuel Nizet",
    "adresse": "Rue d'Elouges 160",
    "localite": "7370 - DOUR",
    "telephone": "065/71.81.20",
    "email": "info@wuiloquot.be",
    "actif": true
  },
  {
    "id": 485,
    "type": "Notaire",
    "nom": "Jean-Louis Lothe & Roseline Mac Callum",
    "adresse": "Rue Henri Pochez 149",
    "localite": "7370 - DOUR",
    "telephone": "065/65.20.62",
    "email": "roseline.maccallum@belnot.be (Mme Mac Callum) - jeanlouis.lhote@belnot.be (Mr Lhôte)",
    "actif": true
  },
  {
    "id": 486,
    "type": "Opticien",
    "nom": "Optique Boulvin Olivier",
    "adresse": "Rue Grande 96",
    "localite": "7370 - DOUR",
    "telephone": "065/63.04.59",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 487,
    "type": "Organisation administrative d'une équipe d'infirmières",
    "nom": "Equipe Pluridisciplinaire en Soins Infirmiers ASBL",
    "adresse": "Rue Moranfayt 144",
    "localite": "7370 - DOUR",
    "telephone": "065/63.25.57 - 0477/53.10.06",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 488,
    "type": "Organisationde soirée, de galas",
    "nom": "FDC ASBL",
    "adresse": "Rue Alfred Danhier 57",
    "localite": "7370 - DOUR",
    "telephone": "065/65.49.73 - 0476/42.29.69",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 489,
    "type": "Organisation kermesse 4eme Week-end Août",
    "nom": "Blaugies Patrimoine ASBL",
    "adresse": "Route Verte 16",
    "localite": "7370 - DOUR",
    "telephone": "065/75.52.43 - 0479/71.75.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 490,
    "type": "ORL",
    "nom": "Antoine J",
    "adresse": "Rue des Canadiens 193",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 491,
    "type": "ORL",
    "nom": "Saussez Sven",
    "adresse": "Rue Jean-Baptaste Foriez 34",
    "localite": "7370 - DOUR",
    "telephone": "0460/95.58.80",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 492,
    "type": "Outillage",
    "nom": "Ballez Maison SA",
    "adresse": "Rue Grande 36",
    "localite": "7370 - DOUR",
    "telephone": "065/65.21.38 - 0498/11.31.35",
    "email": "maison.ballez@gmail.com",
    "actif": true
  },
  {
    "id": 493,
    "type": "Parapsycologue",
    "nom": "Dubrunquez Sylvia-Roberte",
    "adresse": "Rue du Peuple 22",
    "localite": "7370 - DOUR",
    "telephone": "0472/30.93.15",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 494,
    "type": "Parcs et jardins",
    "nom": "Coolsaet Catherine",
    "adresse": "Avenue J.Sartieaux 37",
    "localite": "7370 - DOUR",
    "telephone": "0477/47.15.38",
    "email": "Pas d'informaton",
    "actif": true
  },
  {
    "id": 495,
    "type": "Parc et jardins",
    "nom": "Turpin Jérémie",
    "adresse": "Rue Moranfayt 219",
    "localite": "7370 - DOUR",
    "telephone": "065/65.45.39 - 0478/69.99.52",
    "email": "turpinjeremie69@gmail.com",
    "actif": true
  },
  {
    "id": 496,
    "type": "Parc et jardins",
    "nom": "Parent - Delmotte Srl",
    "adresse": "Rue de la Machine à Feu 9",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.29",
    "email": "info@parent-delmotte.com",
    "actif": true
  },
  {
    "id": 497,
    "type": "Parcs et jardins",
    "nom": "Abrassart Jérôme",
    "adresse": "Rue du Coin du Bois 26",
    "localite": "7370 - DOUR",
    "telephone": "065/65.40.32 - 0473/38.40.80",
    "email": "info@abrassart.be",
    "actif": true
  },
  {
    "id": 498,
    "type": "Parcs et jardins",
    "nom": "Arborias",
    "adresse": "Rue du Quesnoy 69",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.92 - 0479/26.84.75",
    "email": "https://local.infobel.be (via site web)",
    "actif": true
  },
  {
    "id": 499,
    "type": "Parcs et jardins",
    "nom": "nom illisible",
    "adresse": "",
    "localite": "",
    "telephone": "",
    "email": "",
    "actif": true
  },
  {
    "id": 500,
    "type": "Pédicure à domicile",
    "nom": "Furmaniak Véronique",
    "adresse": "Rue Moranfayt 5",
    "localite": "7370 - DOUR",
    "telephone": "065/57.09.10 - 0477/60.38.67",
    "email": "https://www.facebook.com ( avec Nom et Prénom)",
    "actif": true
  },
  {
    "id": 501,
    "type": "Pédicure médicale - Esthétique",
    "nom": "Mélimél'Ongles",
    "adresse": "Rue de la Frontière 300",
    "localite": "7370 - DOUR",
    "telephone": "065/75.53.67 - 0474/39.71.63",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 502,
    "type": "Peintre",
    "nom": "Lietard Daniel & Mickaël",
    "adresse": "Rue Mitrecq 34",
    "localite": "7370 - DOUR",
    "telephone": "065/65.28.00 - 0476/48.02.84",
    "email": "lietardmickael@gmail.com",
    "actif": true
  },
  {
    "id": 503,
    "type": "Peinture - Décoration",
    "nom": "Idéal Concept Color",
    "adresse": "Rue des Andrieux 97",
    "localite": "7370 - DOUR",
    "telephone": "065/77.00.74 - 0488/48.00.74",
    "email": "https://www.facebook.com ( avec nom de l'entreprise)",
    "actif": true
  },
  {
    "id": 504,
    "type": "Peinture - Papier peints",
    "nom": "Dour-Décor",
    "adresse": "Rue du Marché 32",
    "localite": "7370 - DOUR",
    "telephone": "065/65.35.47",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 505,
    "type": "Pharmacie",
    "nom": "Pharmacie Dehaut",
    "adresse": "Grand Place 28",
    "localite": "7370 - DOUR",
    "telephone": "065/69.02.39",
    "email": "pharmacie.dehaut@gmail.com",
    "actif": true
  },
  {
    "id": 506,
    "type": "Pharmacie",
    "nom": "Duviphar Srl",
    "adresse": "Place Emile Vandervelde 1",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 507,
    "type": "Pharmacie",
    "nom": "Mecla SA",
    "adresse": "Rue de l'Eglise 32",
    "localite": "7370 - DOUR",
    "telephone": "065/65.21.02",
    "email": "phie.mecla@gmail.com",
    "actif": true
  },
  {
    "id": 508,
    "type": "Pharmacie",
    "nom": "Capette-Brasseur SA",
    "adresse": "Rue des Andrieux 74",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.56",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 509,
    "type": "Pharmacie",
    "nom": "I-Planet SA",
    "adresse": "Rue du Commerce 185",
    "localite": "7370 - DOUR",
    "telephone": "065/69.10.00",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 510,
    "type": "Pharmacie",
    "nom": "Multipharma SCRL",
    "adresse": "Rue du Peuple 14",
    "localite": "7370 - DOUR",
    "telephone": "065/65.28.34",
    "email": "https://www.multipharma.be/fr/",
    "actif": true
  },
  {
    "id": 511,
    "type": "Pharmacie",
    "nom": "Pharmacie Brouillard Srl",
    "adresse": "Rue du Stade 17",
    "localite": "7370 - DOUR",
    "telephone": "065/65.21.49",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 512,
    "type": "Pharmacie",
    "nom": "Pharmacie Familia",
    "adresse": "Rue Grande 60",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "définitivement fermé",
    "actif": true
  },
  {
    "id": 513,
    "type": "Pharmacie",
    "nom": "Pharmacie Douroise",
    "adresse": "Rue Pairois 127",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "définitivement fermé",
    "actif": true
  },
  {
    "id": 514,
    "type": "Pharmacie",
    "nom": "Pharmacie Lavaert Srl",
    "adresse": "Rue de la Frontière 33",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.85",
    "email": "phie.lavaert@hotmail.com",
    "actif": true
  },
  {
    "id": 515,
    "type": "Pharmacie",
    "nom": "Vilain Méganne",
    "adresse": "Rue Nacfer 89",
    "localite": "7370 - DOUR",
    "telephone": "0496/08.50.48",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 516,
    "type": "Photographe",
    "nom": "Delightfull.BE",
    "adresse": "Rue du Parc 29",
    "localite": "7370 - DOUR",
    "telephone": "0476/94.91.73",
    "email": "denis.photo@hotmail.com",
    "actif": true
  },
  {
    "id": 517,
    "type": "Photographe",
    "nom": "Coomans Chan",
    "adresse": "Rue Mitrecq 42",
    "localite": "7370 - DOUR",
    "telephone": "0498/16.78.77",
    "email": "info@digitalcreation.be",
    "actif": true
  },
  {
    "id": 518,
    "type": "Photographe",
    "nom": "Onde Upon a time",
    "adresse": "Rue Moranfayt 148",
    "localite": "7370 - DOUR",
    "telephone": "0470/33.33.61",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 519,
    "type": "Photographe",
    "nom": "D'Agostino Dimitri",
    "adresse": "Voie Blanche 42",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 520,
    "type": "Pièces automobiles",
    "nom": "E.P.A SA",
    "adresse": "Rue Grande 89",
    "localite": "7370 - DOUR",
    "telephone": "065/79.32.71",
    "email": "info@europiecesauto.com",
    "actif": true
  },
  {
    "id": 521,
    "type": "Pièces automobiles, garage de réparation et d'entretien",
    "nom": "Dour-Automobile",
    "adresse": "Rue de Boussu 95",
    "localite": "7370 - DOUR",
    "telephone": "065/65.12.65 - 0470/01.18.17",
    "email": "dourautomobile@skynet.be",
    "actif": true
  },
  {
    "id": 522,
    "type": "Pièces automobiles",
    "nom": "Récup'Opel",
    "adresse": "Rue Camille Moury 149",
    "localite": "7370 - DOUR",
    "telephone": "065/65.33.62 - 0475/60.18.39",
    "email": "recup-opel@skynet.be",
    "actif": true
  },
  {
    "id": 523,
    "type": "Pizzéria",
    "nom": "La Pizzéria du Peuple",
    "adresse": "Place Emile Vandervelde 28",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.07",
    "email": "https://www.facebook.com (nom de l'entreprise)",
    "actif": true
  },
  {
    "id": 524,
    "type": "Pizzéria",
    "nom": "Famiglia D Srl",
    "adresse": "Rue du Commerce 163",
    "localite": "7370 - DOUR",
    "telephone": "065/79.58.95 - 0493/18.17.37",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 525,
    "type": "Pizzéria",
    "nom": "Pizza Sprint",
    "adresse": "Place Verte 37",
    "localite": "7370 - DOUR",
    "telephone": "065/63.30.10",
    "email": "https://www.pizzasprintdour.be",
    "actif": true
  },
  {
    "id": 526,
    "type": "Plafonnage",
    "nom": "Nee Guillaume",
    "adresse": "Chemin du Rouge Bonnet 12",
    "localite": "7370 - DOUR",
    "telephone": "0475/58.07.07",
    "email": "jcgm.guillaume@gmail.com ou jcgm.plafonnage@gmail.com",
    "actif": true
  },
  {
    "id": 527,
    "type": "Plafonnage",
    "nom": "Druart Daniel",
    "adresse": "Rue des Canadiens 6",
    "localite": "7370 - DOUR",
    "telephone": "065/35.42.63 - 0472/71.53.10",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 528,
    "type": "Plafonnage",
    "nom": "Cle Au PLatre Srl",
    "adresse": "Rue du Commerce 168",
    "localite": "7370 - DOUR",
    "telephone": "065/74.27.93 - 0476/41.64.89",
    "email": "cleauplatre@gmail.com",
    "actif": true
  },
  {
    "id": 529,
    "type": "Plaine de Jeux",
    "nom": "Birdy Land",
    "adresse": "Rue d'Elouges 159/B",
    "localite": "7370 - DOUR",
    "telephone": "065/66.40.84 - 0488/28.20.73",
    "email": "rohan@hotmail.com",
    "actif": true
  },
  {
    "id": 530,
    "type": "Poêlerie",
    "nom": "Maison Ansseau",
    "adresse": "Grand'Place 15",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 531,
    "type": "Pomme de Terre- stockage",
    "nom": "Agri Vervaeke",
    "adresse": "Rue Benoit 52",
    "localite": "7370 - DOUR",
    "telephone": "051/46.68.41 - 0499/55.88.06",
    "email": "https://agri.vervaeke.be/fr/contact",
    "actif": true
  },
  {
    "id": 532,
    "type": "Pompes Funèbres",
    "nom": "Anciennement Pompes Funèbres Narcisse Denis",
    "adresse": "Rue de la Chapelle 1",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.66",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 533,
    "type": "Prestataire de service \"Horeca\"",
    "nom": "Roman Tatum",
    "adresse": "Rue Henri Pochez 107",
    "localite": "7370 - DOUR",
    "telephone": "0486/32.81.13",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 534,
    "type": "Prestation de service",
    "nom": "Duquesnoy Stéphane",
    "adresse": "Chemin Sainte-Henriette 4",
    "localite": "7370 - DOUR",
    "telephone": "0473/52.51.61",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 535,
    "type": "Prestation de sevice",
    "nom": "Bériot Dominique",
    "adresse": "Rue de la Frontière 74",
    "localite": "7370 - DOUR",
    "telephone": "0479/29.43.03",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 536,
    "type": "Prestation de service",
    "nom": "GGR Services",
    "adresse": "Voie des Cocars47",
    "localite": "7370 - DOUR",
    "telephone": "0479/68.51.26",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 537,
    "type": "Prestation de Services en agriculture et horticulture",
    "nom": "Passelecq Joachim",
    "adresse": "Rue du Commerce 334",
    "localite": "7370 - DOUR",
    "telephone": "0479/80.62.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 538,
    "type": "Prêt-à-porter",
    "nom": "Magasin Chloë",
    "adresse": "Rue Pairois 125",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 539,
    "type": "Prêts & Assurances",
    "nom": "Fridenberghs AF Srl",
    "adresse": "Place Verte 33",
    "localite": "7370 - DOUR",
    "telephone": "065/65.34.73",
    "email": "info@fridenberghs.be",
    "actif": true
  },
  {
    "id": 540,
    "type": "Production audiovisuelle",
    "nom": "Amorce Productions Srl",
    "adresse": "Rue des Chênes 112",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 541,
    "type": "Production d'élèctricité verte (Eoliennes)",
    "nom": "Les moulins du Haut-Pays SCRL",
    "adresse": "Rue des Canadiens 100",
    "localite": "7370 - DOUR",
    "telephone": "065/63.31.66",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 542,
    "type": "Produits chimiques",
    "nom": "Blendwell SA",
    "adresse": "Zoning Industriel Rue Benoit 50",
    "localite": "7370 - DOUR",
    "telephone": "065/67.86.73 - 0479/99.32.58",
    "email": "info@blendwell.com",
    "actif": true
  },
  {
    "id": 543,
    "type": "Psychologue",
    "nom": "Ruelle Alexandrine",
    "adresse": "Rue Coron du Bois 67",
    "localite": "7370 - DOUR",
    "telephone": "0478/21.98.36 (privé) - 0495/71.43.45 (prof.)",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 544,
    "type": "Psychologue",
    "nom": "Carruana Luca",
    "adresse": "Rue Henri Pochez 124",
    "localite": "7370 - DOUR",
    "telephone": "0478/57.62.38",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 545,
    "type": "Psychothérapeute",
    "nom": "Busiaux Françoise",
    "adresse": "Rue du Parc 15",
    "localite": "7370 - DOUR",
    "telephone": "065/77.96.97 - 0472/03.00.64",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 546,
    "type": "Publicité-Lettrage",
    "nom": "Dominicus publicité",
    "adresse": "Rue de Boussu 1",
    "localite": "7370 - DOUR",
    "telephone": "065/65.65.64 - 065/97.45.31 - 0478/39.15.29",
    "email": "Contact via Facebook et messenger (nom de l'entreprise)",
    "actif": true
  },
  {
    "id": 547,
    "type": "Réalisation de charpentes et de couvertures",
    "nom": "S Toiture",
    "adresse": "Voie du Prêtre 62",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 548,
    "type": "Recouvement de créances",
    "nom": "Optimal Recover Srl",
    "adresse": "Rue des Andrieux 76",
    "localite": "7370 - DOUR",
    "telephone": "02/891.00.45 (siège social Nivelles) - 0485/20.02.20",
    "email": "secretatiat@optimal-recover.be",
    "actif": true
  },
  {
    "id": 549,
    "type": "Regroupement médecins généralistes",
    "nom": "U.M.G.B. ASBL",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 550,
    "type": "Rénovation",
    "nom": "Novirenov Srl",
    "adresse": "Rue du Commerce 104",
    "localite": "7370 - DOUR",
    "telephone": "Faillite",
    "email": "Faillite",
    "actif": true
  },
  {
    "id": 551,
    "type": "Restaurant",
    "nom": "La ferme des Templiers",
    "adresse": "Rue de Ropaix 169",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 552,
    "type": "Restaurant & Taverne",
    "nom": "La Piazzetta",
    "adresse": "Grand'Place 32",
    "localite": "7370 - DOUR",
    "telephone": "065/78.56.67 - 0475/86.34.06",
    "email": "restopiazzetta@outlook.com",
    "actif": true
  },
  {
    "id": 553,
    "type": "Restaurant & Taverne",
    "nom": "Le Fourquet SCRL",
    "adresse": "Rue de la Frontière 438",
    "localite": "7370 - DOUR",
    "telephone": "065/69.00.79",
    "email": "Lefourquet@icloud.com",
    "actif": true
  },
  {
    "id": 554,
    "type": "Restaurant & Taverne",
    "nom": "La Saline",
    "adresse": "Rue de Ropaix 39",
    "localite": "7370 - DOUR",
    "telephone": "065/62.10.18 - 0477/23.49.69",
    "email": "info@lasaline.be",
    "actif": true
  },
  {
    "id": 555,
    "type": "Restaurant & Taverne",
    "nom": "La Table d'Auguste",
    "adresse": "Rue Général Leman 23",
    "localite": "7370 - DOUR",
    "telephone": "065/66.68.12",
    "email": "info@latabledauguste.be",
    "actif": true
  },
  {
    "id": 556,
    "type": "Restaurant & Taverne",
    "nom": "L'Auberge des Aulnes",
    "adresse": "Rue Planche à l'Aulne 20",
    "localite": "7370 - DOUR",
    "telephone": "065/65.91.15",
    "email": "aubergedesaulnes@hotmail.com",
    "actif": true
  },
  {
    "id": 557,
    "type": "Restaurant Chinois",
    "nom": "Cité du Saké",
    "adresse": "Place Verte 40",
    "localite": "7370 - DOUR",
    "telephone": "065/66.96.66",
    "email": "Contact via Facebook et messenger (nom de l'entreprise)",
    "actif": true
  },
  {
    "id": 558,
    "type": "Restaurant Chinois",
    "nom": "La Perle Rare",
    "adresse": "Rue d'Elouges 12",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 559,
    "type": "Restauration Bâtiment",
    "nom": "EBC SA",
    "adresse": "Rue de Ropaix 169",
    "localite": "7370 - DOUR",
    "telephone": "065/80.08.62 - 0475/59.12.63",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 560,
    "type": "Restauration de meuble",
    "nom": "Ebénisterie-artisan Kris",
    "adresse": "Rue du Parc 25",
    "localite": "7370 - DOUR",
    "telephone": "065/79.55.92 - 0474/22.29.71",
    "email": "kris.fanni@hotmail.com",
    "actif": true
  },
  {
    "id": 561,
    "type": "Salle de Banquet",
    "nom": "Local \"Chez Nous\"",
    "adresse": "Rue de la Frontière 33",
    "localite": "7370 - DOUR",
    "telephone": "065/65.37.65 - 065/65.25.85 (privé)",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 562,
    "type": "Salle de Banquet-Traiteur",
    "nom": "Le Ripaillons",
    "adresse": "Rue de Ropaix 46",
    "localite": "7370 - DOUR",
    "telephone": "065/79.51.60 - 0496/40.56.35",
    "email": "leripaillons@hotmail.com",
    "actif": true
  },
  {
    "id": 563,
    "type": "Salon de Coiffure",
    "nom": "8emeArt coiffure",
    "adresse": "Place des Martyrs 2",
    "localite": "7370 - DOUR",
    "telephone": "065/62.39.29 - 0470/82.50.35",
    "email": "kametteemilie@gmail.com",
    "actif": true
  },
  {
    "id": 564,
    "type": "Salon de Coiffure",
    "nom": "Coiff'Hair",
    "adresse": "Place des Martyrs 5",
    "localite": "7370 - DOUR",
    "telephone": "065/65.92.16",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 565,
    "type": "Salon de Coiffure",
    "nom": "Bronsart Maryse",
    "adresse": "Place des Martyrs 7",
    "localite": "7370 - DOUR",
    "telephone": "065/65.04.85",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 566,
    "type": "Salon de Coiffure",
    "nom": "Zianne/Sébastian",
    "adresse": "Rue Culot Quézo 24",
    "localite": "7370 - DOUR",
    "telephone": "065/87.49.99 - 0479/61.05.20",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 567,
    "type": "Salon de Coiffure",
    "nom": "Salon de coiffure Isabelle",
    "adresse": "Rue de la Chapelle 34",
    "localite": "7370 - DOUR",
    "telephone": "Fermé",
    "email": "Fermé",
    "actif": true
  },
  {
    "id": 568,
    "type": "Salon de Coiffure",
    "nom": "Les salons ER",
    "adresse": "Rue Grande 112",
    "localite": "7370 - DOUR",
    "telephone": "065/67.97.10 - 0477/98.99.91",
    "email": "lessalonser@hotmail.com",
    "actif": true
  },
  {
    "id": 569,
    "type": "Salon de Coiffure",
    "nom": "Hair Beauty",
    "adresse": "Rue Grande 51/B",
    "localite": "7370 - DOUR",
    "telephone": "0494/32.74.41",
    "email": "demard@orange.fr",
    "actif": true
  },
  {
    "id": 570,
    "type": "Salon de Coiffure",
    "nom": "Salon Angie",
    "adresse": "Rue Grande 83/A",
    "localite": "7370 - DOUR",
    "telephone": "0493/98.40.82",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 571,
    "type": "Salon de Coiffure",
    "nom": "Jean Motte Coiffure Création",
    "adresse": "Rue Victor Delporte 31",
    "localite": "7370 - DOUR",
    "telephone": "065/65.67.05",
    "email": "christelj-luc@hotmail.com",
    "actif": true
  },
  {
    "id": 572,
    "type": "Sandwicherie",
    "nom": "L'Auberg'in",
    "adresse": "Place des Martyrs 4",
    "localite": "7370 - DOUR",
    "telephone": "065/79.54.14",
    "email": "magali.mauro@hotmail.com",
    "actif": true
  },
  {
    "id": 573,
    "type": "Sandwicherie",
    "nom": "La Tartine",
    "adresse": "Place Emile Vandervelde 15",
    "localite": "7370 - DOUR",
    "telephone": "0492/46.65.02",
    "email": "Contact via Facebook et messenger (nom de l'entreprise)",
    "actif": true
  },
  {
    "id": 574,
    "type": "Sandwicherie",
    "nom": "La P'Tite Fringale",
    "adresse": "Rue Grande 58",
    "localite": "7370 - DOUR",
    "telephone": "0494/43.03.90 - 0492/46.65.02",
    "email": "lapetitefringale58@gmail.com",
    "actif": true
  },
  {
    "id": 575,
    "type": "Scouts",
    "nom": "Association Scouts-Fanfare en Avant SCRL",
    "adresse": "Grand'Place 6",
    "localite": "7370 - DOUR",
    "telephone": "065/65.43.87",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 576,
    "type": "Sécrétariat médical et juridique",
    "nom": "Sédal",
    "adresse": "Avenue Victor Régnart 153",
    "localite": "7370 - DOUR",
    "telephone": "065/63.38.21 - 0486/24.67.84",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 577,
    "type": "Sérrurerie",
    "nom": "Serrurie Minute",
    "adresse": "Rue Maréchal Foch 11",
    "localite": "7370 - DOUR",
    "telephone": "065/63.07.79 - 0473/61.54.09",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 578,
    "type": "Service",
    "nom": "Saussez Yves",
    "adresse": "RueTrieu Poulain 6",
    "localite": "7370 - DOUR",
    "telephone": "065/63.32.49 - 0498/12.22.00",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 579,
    "type": "Service annexe à la culture",
    "nom": "Gobert Emile",
    "adresse": "Rue de la Frontière 275",
    "localite": "7370 - DOUR",
    "telephone": "065/65.93.21",
    "email": "htps://www.bizzlister.be",
    "actif": true
  },
  {
    "id": 580,
    "type": "Service aux Entreprises",
    "nom": "Gérin Stéphane",
    "adresse": "Rue Moranfayt 3",
    "localite": "7370 - DOUR",
    "telephone": "0498/47.48.43",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 581,
    "type": "Service Santé Mentale",
    "nom": "La Kalaude",
    "adresse": "Rue du Commerce 137",
    "localite": "7370 - DOUR",
    "telephone": "065/80.15.25",
    "email": "https://www.docto.be",
    "actif": true
  },
  {
    "id": 582,
    "type": "Service Traiteur",
    "nom": "Le Tableau Gourmand",
    "adresse": "Rue Saussette 84",
    "localite": "7370 - DOUR",
    "telephone": "065/63.24.81 - 0475/69.18.94",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 583,
    "type": "Service annexes à la culture agricole",
    "nom": "Cuvelier Michaël",
    "adresse": "Rue de la Frontière 403",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.56 - 0473/27.08.32",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 584,
    "type": "Services aux entreprises",
    "nom": "Retup Solutions",
    "adresse": "Voie d'Hainin 14",
    "localite": "7370 - DOUR",
    "telephone": "0487/14.26.07",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 585,
    "type": "Shop",
    "nom": "Au Joker",
    "adresse": "Rue de France 1",
    "localite": "7370 - DOUR",
    "telephone": "065/46.00.92",
    "email": "juniconcept.dour@gmail.com",
    "actif": true
  },
  {
    "id": 586,
    "type": "Snack-Friterie",
    "nom": "Crousti Frite",
    "adresse": "Rue de l'Eglise 17/B",
    "localite": "7370 - DOUR",
    "telephone": "0497/71.21.50",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 587,
    "type": "Snack-Friterie",
    "nom": "Il était une Frite",
    "adresse": "Rue de la Frontière 52",
    "localite": "7370 - DOUR",
    "telephone": "0468/38.97.81",
    "email": "il.etait.une.frite@hotmail.com",
    "actif": true
  },
  {
    "id": 588,
    "type": "Société Agricole",
    "nom": "Namur-Willemart S.Agr.",
    "adresse": "Route Verte 85",
    "localite": "7370 - DOUR",
    "telephone": "065/65.03.34 - 065/69.16.13 - 0494/27.99.85",
    "email": "al.wautelet@skynet.be",
    "actif": true
  },
  {
    "id": 589,
    "type": "Société d'assurances",
    "nom": "Olivier Trévis consulting Srl",
    "adresse": "Grand'Place 9",
    "localite": "7370 - DOUR",
    "telephone": "0499/57.93.67",
    "email": "olivier.trevis@pv.be",
    "actif": true
  },
  {
    "id": 590,
    "type": "Société de management fee",
    "nom": "Dufrinvest Srl",
    "adresse": "Rue de la Corderie 19",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 591,
    "type": "Société Holding",
    "nom": "Financière L.M.Srl",
    "adresse": "Rue de la Frontière 473",
    "localite": "7370 - DOUR",
    "telephone": "0471/20.02.24",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 592,
    "type": "Société immobilière",
    "nom": "Les Terres de Saint Antoine SA",
    "adresse": "Rue de Belle-Vue 12",
    "localite": "7370 - DOUR",
    "telephone": "065/63.06.47 - 0475/53.55.84",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 593,
    "type": "Société immobilière",
    "nom": "Les Aulnes SCRL",
    "adresse": "Rue des Canadiens 100",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18 - 065/63.27.49",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 594,
    "type": "Société immobilière",
    "nom": "Les Galeries",
    "adresse": "Rue du Général Leman 23/A",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18 - 0464/55.54.67",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 595,
    "type": "Société immobilière",
    "nom": "Sogevest SA",
    "adresse": "Rue du Général Leman 23/A",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 596,
    "type": "Société immobilière",
    "nom": "La Concorde SA",
    "adresse": "Rue Grande 50",
    "localite": "7370 - DOUR",
    "telephone": "065/69.11.00",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 597,
    "type": "Société patrimoniale",
    "nom": "K.Quenon Srl",
    "adresse": "Rue Alexandre Patte 73",
    "localite": "7370 - DOUR",
    "telephone": "0478/20.74.82",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 598,
    "type": "Soins à Domicile",
    "nom": "A.S. Nursing Srl",
    "adresse": "Rue du Préfeuillet 17",
    "localite": "7370 - DOUR",
    "telephone": "0476/45.09.96",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 599,
    "type": "Soins à Domicile",
    "nom": "Saintghislain Amélie",
    "adresse": "Rue du Préfeuillet 17",
    "localite": "7370 - DOUR",
    "telephone": "0479/64.15.49",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 600,
    "type": "Soins Energétiques",
    "nom": "Chrysalide",
    "adresse": "Rue Béatam 6",
    "localite": "7370 - DOUR",
    "telephone": "065/65.56.26 - 0474/70.65.23",
    "email": "chrysalide2017@outlook.com",
    "actif": true
  },
  {
    "id": 601,
    "type": "Solderie",
    "nom": "Nordiscount",
    "adresse": "Place Emile Vandervelde 3",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 602,
    "type": "Sophrologue",
    "nom": "Blondiau Nathalie",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13 (Centre Médical Dourois)",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 603,
    "type": "Soutien aux cultures",
    "nom": "Ferme de La cour SCS",
    "adresse": "Route de Quiévrain 3",
    "localite": "7370 - DOUR",
    "telephone": "065/63.28.32 - 061/22.32.62 (siège social Herbeumont) - 0470/94.14.50",
    "email": "contact@lafermedelacour.be",
    "actif": true
  },
  {
    "id": 604,
    "type": "Soutien du Culte Protestant",
    "nom": "Les Oeuvres de l'Eglise Protestante de Dour ASBL",
    "adresse": "Rue du Roi Albert 56",
    "localite": "7370 - DOUR",
    "telephone": "065/63.43.17",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 605,
    "type": "Spectacle",
    "nom": "Zoneart ASBL",
    "adresse": "Rue Trieu Jean Sart 51",
    "localite": "7370 - DOUR",
    "telephone": "065/69.10.65 - 0491/50.24.75",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 606,
    "type": "Sport Tennis",
    "nom": "Tennis Club Dour Le Belvedere ASBL",
    "adresse": "Chemin des Croix 1",
    "localite": "7370 - DOUR",
    "telephone": "0478/47.10.64 (secrétaire) - 0493/85.76.97 (Président)",
    "email": "tcdour.belvedere@gmail.com (secrétaire) - joneshenry_6@hotmail.com (Président)",
    "actif": true
  },
  {
    "id": 607,
    "type": "Station-Service",
    "nom": "Station Texaco Belgium SA",
    "adresse": "Rue Emile Estièvenart 32",
    "localite": "7370 - DOUR",
    "telephone": "065/65.20.18 - 0484/79.62.36",
    "email": "https://texaco.be",
    "actif": true
  },
  {
    "id": 608,
    "type": "Stockage Céréales",
    "nom": "Agri Dour Logistique Srl",
    "adresse": "Rue de France 52",
    "localite": "7370 - DOUR",
    "telephone": "065/65.29.71 - 065/43.11.25 - 0475/28.81.62",
    "email": "jdepoortere@skynet.be",
    "actif": true
  },
  {
    "id": 609,
    "type": "Stop Graffiti",
    "nom": "Stop Graffiti - Decap express",
    "adresse": "Rue Jean-Baptiste Foriez 40",
    "localite": "7370 - DOUR",
    "telephone": "0473/26.73.26",
    "email": "info@decap-express.be",
    "actif": true
  },
  {
    "id": 610,
    "type": "Stylisme",
    "nom": "Journal Intime Srl",
    "adresse": "Rue de la Bascule 10",
    "localite": "7370 - DOUR",
    "telephone": "065/77.07.05 - 0476/99.76.04",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 611,
    "type": "Syndicat",
    "nom": "FGTB",
    "adresse": "Place Verte 41",
    "localite": "7370 - DOUR",
    "telephone": "065/32.38.00",
    "email": "chomage.dour@fgtb.be",
    "actif": true
  },
  {
    "id": 612,
    "type": "Syndicat",
    "nom": "CSC Mons La Louvière",
    "adresse": "Rue Pairois 48",
    "localite": "7370 - DOUR",
    "telephone": "065/37.25.11",
    "email": "https://www.lacsc.be",
    "actif": true
  },
  {
    "id": 613,
    "type": "Tarification de Soins Infirmiers",
    "nom": "Amata Nunzia (Tempo-Libre)",
    "adresse": "Rue de Baudinchamp 1",
    "localite": "7370 - DOUR",
    "telephone": "065/56.57.63 - 0477/79.61.63",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 614,
    "type": "Tatouage",
    "nom": "La P'tite Hervète Tattoo",
    "adresse": "Rue Maréchal Foch 16",
    "localite": "7370 - DOUR",
    "telephone": "0483/72.14;14",
    "email": "zalex.2977@hotmail.fr",
    "actif": true
  },
  {
    "id": 615,
    "type": "Téléphone",
    "nom": "Belgacom SA (Proximus)",
    "adresse": "Rue des Câbleries 4",
    "localite": "7370 - DOUR",
    "telephone": "0800/33.800",
    "email": "customer.care@proximus.be",
    "actif": true
  },
  {
    "id": 616,
    "type": "Terrassement",
    "nom": "Rougraff Olivier",
    "adresse": "Rue Belle-Vue 46",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.05 - 0473/30.17.46",
    "email": "olivier@rougraff.com",
    "actif": true
  },
  {
    "id": 617,
    "type": "Terrassement",
    "nom": "Ets Osyra Bogdan",
    "adresse": "Rue de Ropaix 206",
    "localite": "7370 - DOUR",
    "telephone": "Décéder en 2025",
    "email": "/",
    "actif": true
  },
  {
    "id": 618,
    "type": "Terrassement",
    "nom": "Richard Jérôme",
    "adresse": "Voie Blanche 23",
    "localite": "7370 - DOUR",
    "telephone": "0476/52.96.78",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 619,
    "type": "Textile",
    "nom": "Des Habits & Vous",
    "adresse": "Rue Maréchal Foch 25",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 620,
    "type": "Textile",
    "nom": "Textra",
    "adresse": "Rue Maréchal Foch 39",
    "localite": "7370 - DOUR",
    "telephone": "065/65.21.58",
    "email": "isabelleheregods68@gmail.com",
    "actif": true
  },
  {
    "id": 621,
    "type": "Théâtre",
    "nom": "Roulotte Théatrale ASBL",
    "adresse": "Rue de La Paix 18",
    "localite": "7370 - DOUR",
    "telephone": "065/65.55.92 - 0478/25.95.54",
    "email": "roulottetheatrale@gmail.com",
    "actif": true
  },
  {
    "id": 622,
    "type": "Tir Sportif",
    "nom": "Club de Tir de Wiheries ASBL",
    "adresse": "Rue de l'Eglise 19",
    "localite": "7370 - DOUR",
    "telephone": "065/63.40.42 - 0497/89.12.79",
    "email": "pierre.burion1963@gmail.com",
    "actif": true
  },
  {
    "id": 623,
    "type": "Tir Sportif",
    "nom": "Cercle Sportif de Tir Dourois ASBL",
    "adresse": "Rue de La Grande Veine 52",
    "localite": "7370 - DOUR",
    "telephone": "065/64.35.55 - 0479/24.84.17 (responsable)",
    "email": "cstdour@gmail.com",
    "actif": true
  },
  {
    "id": 624,
    "type": "Titre Services",
    "nom": "Confort-Services Srl",
    "adresse": "Rue du Cimetière 45 (vérifier adresse)",
    "localite": "7370 - DOUR",
    "telephone": "065/63.11.92 (a vérifier)",
    "email": "a vérifier adresse et tel",
    "actif": true
  },
  {
    "id": 625,
    "type": "Titres-Services",
    "nom": "Clic & Net Srvices SCRL (rachat par EKOSERVICES)",
    "adresse": "Rue Alexandre Patte 11/B",
    "localite": "7370 - DOUR",
    "telephone": "065/52.99.92",
    "email": "dour@ekoservices.be",
    "actif": true
  },
  {
    "id": 626,
    "type": "Titres-Services",
    "nom": "Clic & Net Services SCRL",
    "adresse": "Rue Grande 65",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.60 - 065/52.99.92 - 0486/69.09.85",
    "email": "stephanie@clicetnet.be",
    "actif": true
  },
  {
    "id": 627,
    "type": "Toilettage",
    "nom": "L'Ombre d'un Poil",
    "adresse": "Rue de La Chapelle 11",
    "localite": "7370 - DOUR",
    "telephone": "065/66.94.21 - 0497/53.28.33",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 628,
    "type": "Toilettage",
    "nom": "Funny Dog",
    "adresse": "Rue du Commerce 94",
    "localite": "7370 - DOUR",
    "telephone": "065/63.12.50",
    "email": "funnydog122@gmail.com",
    "actif": true
  },
  {
    "id": 629,
    "type": "Toilettage - accessoires",
    "nom": "Précieuses Peluches",
    "adresse": "Rue Général Leman 8/Bte 1",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 630,
    "type": "Toilettage pour Chiens",
    "nom": "Toilettage Patricia",
    "adresse": "Rue Camille Moury 96",
    "localite": "7370 - DOUR",
    "telephone": "065/65.07.68",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 631,
    "type": "Traductrice",
    "nom": "Andrzejewski Sophie",
    "adresse": "Rue Basse 148",
    "localite": "7370 - DOUR",
    "telephone": "0474/24.48.08",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 632,
    "type": "Traductrice",
    "nom": "Molnar Céline",
    "adresse": "Rue Pierre Gallet 65",
    "localite": "7370 - DOUR",
    "telephone": "065/75.97.62",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 633,
    "type": "Traductrice",
    "nom": "Mladenova Petia",
    "adresse": "Rue Mirliton 37",
    "localite": "7370 - DOUR",
    "telephone": "0477/90.88.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 634,
    "type": "Traitement Numérique de l'Image,Vidéo",
    "nom": "Digital Vidéo Event",
    "adresse": "Rue de La Gayolle 86",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.80",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 635,
    "type": "Traiteur",
    "nom": "Traiteur Leblanc",
    "adresse": "Place Verte 42",
    "localite": "7370 - DOUR",
    "telephone": "065/63.30.74 - 0476/90.37.35",
    "email": "philippe.leblanc@skynet.be",
    "actif": true
  },
  {
    "id": 636,
    "type": "Traiteur",
    "nom": "Aucello Fabrizio",
    "adresse": "Rue de Ropaix 219",
    "localite": "7370 - DOUR",
    "telephone": "065/52.16.63 - 0495/52.57.86",
    "email": "fabrice@traiteuraz.be",
    "actif": true
  },
  {
    "id": 637,
    "type": "Transport",
    "nom": "Delhaye Hubert",
    "adresse": "Rue d'Offignies 5",
    "localite": "7370 - DOUR",
    "telephone": "065/65.20.28",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 638,
    "type": "Transport",
    "nom": "Jocotrans Srl",
    "adresse": "Rue du Quesnoy 115",
    "localite": "7370 - DOUR",
    "telephone": "065/63.46.20",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 639,
    "type": "Transport",
    "nom": "Transports Jeanmotte",
    "adresse": "Rue du Roi Albert 45",
    "localite": "7370 - DOUR",
    "telephone": "065/63.05.56 - 0477/59.38.19",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 640,
    "type": "Transport",
    "nom": "Boulard Roger SA",
    "adresse": "Rue de Belle Vue 54",
    "localite": "7370 - DOUR",
    "telephone": "065/65.22.01 - 0479/56.85.09",
    "email": "info@trust-trucks.be",
    "actif": true
  },
  {
    "id": 641,
    "type": "Transport de Marchandises",
    "nom": "Andreoli Carlo",
    "adresse": "Chemin du Rouge Bonnet 10",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 642,
    "type": "Transport et Logistique",
    "nom": "DK Trans Logistics Srl",
    "adresse": "Rue de Belle-Vue 55",
    "localite": "7370 - DOUR",
    "telephone": "065/60.03.37 - 0475/70.38.59",
    "email": "fdekeyser@skynet.be",
    "actif": true
  },
  {
    "id": 643,
    "type": "Transport Routier - Exploitation forestière",
    "nom": "Arman Vincent",
    "adresse": "Rue de Ropaix 212",
    "localite": "7370 - DOUR",
    "telephone": "065/52.13.18 - 0498/62.01.85",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 644,
    "type": "Transports",
    "nom": "Transports Wantiez Didier Srl",
    "adresse": "Sentier Plantis Jacquette 6",
    "localite": "7370 - DOUR",
    "telephone": "065/65.44.48 - 0475/50.03.52",
    "email": "transwantiez@hotmail.com",
    "actif": true
  },
  {
    "id": 645,
    "type": "Travaux Agricoles",
    "nom": "Mikagri Srl",
    "adresse": "Rue de la Frontière 403",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.56 - 0473/27.08.32",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 646,
    "type": "Travaux agricoles et forestiers",
    "nom": "Carlier Kévin",
    "adresse": "Rue Warechaix 5/7",
    "localite": "7370 - DOUR",
    "telephone": "065/95.34.55 - 0475/75.03.25",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 647,
    "type": "Travaux bâtiments - ramonage",
    "nom": "Travsart SCRL",
    "adresse": "Rue Aimeries 218",
    "localite": "7370 - DOUR",
    "telephone": "065/65.31.91 - 065/65.32.16",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 648,
    "type": "Travaux de Finition",
    "nom": "Les Halles Malinoises",
    "adresse": "Rue Mirliton 20",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.84",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 649,
    "type": "Travaux de Toiture",
    "nom": "PHD Toiture Srl",
    "adresse": "Rue Cauderloo 132",
    "localite": "7370 - DOUR",
    "telephone": "0496/14.23.97",
    "email": "hdtoit@hotmail.be",
    "actif": true
  },
  {
    "id": 650,
    "type": "Valorisation et Gestion Patrimoine (mobilier/immobilier)",
    "nom": "M.L.D.F. SC Srl",
    "adresse": "Rue Nacfer 44",
    "localite": "7370 - DOUR",
    "telephone": "065/65.59.68",
    "email": "labilloy.jospin@gmail.com",
    "actif": true
  },
  {
    "id": 651,
    "type": "Vélo + accessoires",
    "nom": "Cycles Liégeois",
    "adresse": "Grand'Place 25",
    "localite": "7370 - DOUR",
    "telephone": "065/65.37.35",
    "email": "contact@infobike.org",
    "actif": true
  },
  {
    "id": 652,
    "type": "Vendeur Automobile",
    "nom": "Jospin Julien",
    "adresse": "Rue de l'Argilière 6",
    "localite": "7370 - DOUR",
    "telephone": "0497/79.53.25",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 653,
    "type": "Vente",
    "nom": "Herbalife",
    "adresse": "Rue Camille Moury 25",
    "localite": "7370 - DOUR",
    "telephone": "0496/39.68.54",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 654,
    "type": "Vente d'instruments de Météorologie et de Mesure",
    "nom": "Météobel",
    "adresse": "Rue Culot Quézo 12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.25.21 - 0497/63.40.60",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 655,
    "type": "Vente de Bois",
    "nom": "Saussez Lance",
    "adresse": "Rue Alfred Defuisseaux 50",
    "localite": "7370 - DOUR",
    "telephone": "0476/30.23.08",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 656,
    "type": "Vente de Bois de Chauffage et de Pellet",
    "nom": "RS Bois SCRI",
    "adresse": "Rue Basse 31",
    "localite": "7370 - DOUR",
    "telephone": "0491/87.70.04",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 657,
    "type": "Vente de Cuisines Equipées",
    "nom": "Boudry Antony",
    "adresse": "Rue Modeste Richard 3",
    "localite": "7370 - DOUR",
    "telephone": "065/65.45.83 - 065/65.46.10 - 0477/66.21.19",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 658,
    "type": "Vente de Véhicule et Mécaniques",
    "nom": "PPG arage",
    "adresse": "Rue des Andrieux 201",
    "localite": "7370 - DOUR",
    "telephone": "065/65.16.25 - 0474/90.91.22",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 659,
    "type": "Vente de Véhicules",
    "nom": "Garage Dour Auto'S",
    "adresse": "Rue d'Elouges 53",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.08 - 0475/78.07.47",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 660,
    "type": "Vente de Véhicules d'occasion",
    "nom": "Devergnies Antoine",
    "adresse": "Rue Robert Tachenion 7",
    "localite": "7370 - DOUR",
    "telephone": "Décéder",
    "email": "Décéder",
    "actif": true
  },
  {
    "id": 661,
    "type": "Vente de Vêtements et Tatouages",
    "nom": "Au Chat de l'Aiguille",
    "adresse": "Rue Grande 67",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 662,
    "type": "Vente et Réparation de moteur tondeuse",
    "nom": "Colmant Eric",
    "adresse": "Rue Valentin Nisol 8",
    "localite": "7370 - DOUR",
    "telephone": "065/63.05.92 - 0479/96.28.80",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 663,
    "type": "Vente Service",
    "nom": "Besafe Srl",
    "adresse": "Rue Maréchal Foch 8/Bte D",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation en 2024",
    "email": "Cloture de liquidation en 2024",
    "actif": true
  },
  {
    "id": 664,
    "type": "Vente Voitures",
    "nom": "A.K. Cars-Starter Srl",
    "adresse": "Rue de Ropaix 197",
    "localite": "7370 - DOUR",
    "telephone": "0492/78.08.96",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 665,
    "type": "Vente-achat transformation, entretien d'immeubles",
    "nom": "Immobilière de la Frontière Srl",
    "adresse": "Rue des Vainqueurs 3",
    "localite": "7370 - DOUR",
    "telephone": "065/69.08.42 - 0473/92.15.35",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 666,
    "type": "Ventes & Installation de Piscines",
    "nom": "J.F.T.Piscines",
    "adresse": "Rue de la Machine à Feu 3",
    "localite": "7370 - DOUR",
    "telephone": "065/65.08.00 - 0477/50.64.26",
    "email": "https://local.infobel.be",
    "actif": true
  },
  {
    "id": 667,
    "type": "Vente Prêt à Porter, déco",
    "nom": "Rose Orange",
    "adresse": "Rue des Vainqueurs 3",
    "localite": "7370 - DOUR",
    "telephone": "0473/92.15.35",
    "email": "roseorange@live.be",
    "actif": true
  },
  {
    "id": 668,
    "type": "Vêtements",
    "nom": "Nic Nac 2",
    "adresse": "Rue Grande 10",
    "localite": "7370 - DOUR",
    "telephone": "065/63.46.35",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 669,
    "type": "Vétérinaire",
    "nom": "Malec Nicolas",
    "adresse": "Avenue Victor Régnart 127",
    "localite": "7370 - DOUR",
    "telephone": "Inactif",
    "email": "Inactif",
    "actif": true
  },
  {
    "id": 670,
    "type": "Vétérinaire",
    "nom": "Pouille Lucien",
    "adresse": "Avenue Wauters 1/A",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.41 - 065/63.00.57",
    "email": "lucien.pouille@skynet.be",
    "actif": true
  },
  {
    "id": 671,
    "type": "Vétérinaire",
    "nom": "Dubray Fabian",
    "adresse": "Rue d'Elouges 124",
    "localite": "7370 - DOUR",
    "telephone": "065/65.07.28 - 0477/62.68.84",
    "email": "fabiendubray@skynet .be",
    "actif": true
  },
  {
    "id": 672,
    "type": "Vétérinaire",
    "nom": "Cabinet Vétérinaire Vétagora",
    "adresse": "Rue d'Elouges 60",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.18",
    "email": "vetagora@benoitbrouckaert.be",
    "actif": true
  },
  {
    "id": 673,
    "type": "Vétérinaire",
    "nom": "Vasseur Etienne",
    "adresse": "Rue de Ropaix 249",
    "localite": "7370 - DOUR",
    "telephone": "065/63.16.84",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 674,
    "type": "Vidéothèque",
    "nom": "Shop 67",
    "adresse": "Chemin du Rouge Bonnet 67",
    "localite": "7370 - DOUR",
    "telephone": "0478/02.87.02",
    "email": "shop67dour@gmail.com",
    "actif": true
  },
  {
    "id": 675,
    "type": "Vidéothèque",
    "nom": "Vidéothèque",
    "adresse": "Rue du Peuple 1",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 676,
    "type": "?",
    "nom": "Culot Christelle",
    "adresse": "Avenue H. Harmegnies 23",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 677,
    "type": "?",
    "nom": "FT Construct",
    "adresse": "Avenue H. Harmegnies 23",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 678,
    "type": "?",
    "nom": "Bati-Fabrice",
    "adresse": "Avenue H. Harmegnies 47",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 679,
    "type": "Agent Immobilier",
    "nom": "Fridenbergs Janis",
    "adresse": "Avenue H. Harmegnies 55",
    "localite": "7370 - DOUR",
    "telephone": "065/65.34.73",
    "email": "bureau.fridenbergs@portima.be",
    "actif": true
  },
  {
    "id": 680,
    "type": "Photographe",
    "nom": "Jospin Katiana",
    "adresse": "Avenue H. Harmegnies67",
    "localite": "7370 - DOUR",
    "telephone": "INACTIVE",
    "email": "INACTIVE",
    "actif": true
  },
  {
    "id": 681,
    "type": "Entreprise de Rénovation",
    "nom": "AS-N Rénovation",
    "adresse": "Avenue wauters 67",
    "localite": "7370 - DOUR",
    "telephone": "0472/07.25.21",
    "email": "ASrenovation@outlook.be",
    "actif": true
  },
  {
    "id": 682,
    "type": "Association",
    "nom": "UHURU Universal Event ASBL",
    "adresse": "Chemin de Wasmes 45",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de Liquidation en 2024",
    "email": "Cloture de Liquidation en 2024",
    "actif": true
  },
  {
    "id": 683,
    "type": "Association",
    "nom": "Vie Abondante ASBL",
    "adresse": "Chemin de Wasmes 45",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de Liquidation en 2024",
    "email": "Cloture de Liquidation en 2024",
    "actif": true
  },
  {
    "id": 684,
    "type": "Menuisierie",
    "nom": "Buisseret Sylvain (Artisan du Chassis)",
    "adresse": "Chemin des Fours 55",
    "localite": "7370 - DOUR",
    "telephone": "0492/40.10.95 (siège social Quaregnon)",
    "email": "artisanduchassis@gmail.com",
    "actif": true
  },
  {
    "id": 685,
    "type": "",
    "nom": "AZ Construct Srl",
    "adresse": "Chemin des Wallants 1/6",
    "localite": "7370 - DOUR",
    "telephone": "",
    "email": "",
    "actif": true
  },
  {
    "id": 686,
    "type": "Vente de Pneus de Voiture",
    "nom": "Dour Pneu",
    "adresse": "Chemin des Wallants 1/Bte 4",
    "localite": "7370 - DOUR",
    "telephone": "0489/50.66.09",
    "email": "info@dourpneu.be",
    "actif": true
  },
  {
    "id": 687,
    "type": "Magasin Vestimentaire",
    "nom": "Actu Light",
    "adresse": "Rue du Chêne 67",
    "localite": "7080 - FRAMERIES",
    "telephone": "0475/77.03.52",
    "email": "actu-light@skynet.be",
    "actif": true
  },
  {
    "id": 688,
    "type": "Centre pour différents Evénements",
    "nom": "Centre Culturel de Dour",
    "adresse": "Grand'Place 1",
    "localite": "7370 - DOUR",
    "telephone": "065/76.18.47",
    "email": "info@centrecultureldour.be",
    "actif": true
  },
  {
    "id": 689,
    "type": "Centre Sportif",
    "nom": "Centre Sportif d'Elouges/Dour ASBL",
    "adresse": "Rue de la Fontaine 66",
    "localite": "7370 - DOUR",
    "telephone": "065/76.18.10",
    "email": "info@communedour.be",
    "actif": true
  },
  {
    "id": 690,
    "type": "Infirmière",
    "nom": "Ombrini Pauline",
    "adresse": "Grand'Place 18",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "/",
    "actif": true
  },
  {
    "id": 691,
    "type": "Sandwicherie",
    "nom": "La Mie Dorée",
    "adresse": "Grand'Place 24",
    "localite": "7370 - DOUR",
    "telephone": "065/65.92.65",
    "email": "laggabmadjide@gmail.com",
    "actif": true
  },
  {
    "id": 692,
    "type": "Pharmacie",
    "nom": "Les Pharmacies Benit-Dehaut-Rion Srl",
    "adresse": "Place Emile Vandervelde 1",
    "localite": "7370 - DOUR",
    "telephone": "065/65.23.01",
    "email": "lespharmacies@gmail.com",
    "actif": true
  },
  {
    "id": 693,
    "type": "Pizzeria",
    "nom": "Salpao Srl",
    "adresse": "Grand'Place 32",
    "localite": "7370 - DOUR",
    "telephone": "065/78.56.67",
    "email": "restopiazetta@outlook.com",
    "actif": true
  },
  {
    "id": 694,
    "type": "Magasin de Décoration",
    "nom": "Atout Maison",
    "adresse": "Grand'Place 9",
    "localite": "7370 - DOUR",
    "telephone": "0476/90.15.16",
    "email": "https://www.atout-maison.com (contact via site internet)",
    "actif": true
  },
  {
    "id": 695,
    "type": "Société de construction",
    "nom": "Rosseno SA",
    "adresse": "Rue du Coron du Bois 29",
    "localite": "7370 - DOUR",
    "telephone": "065/67.17.27",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 696,
    "type": "Magasin Accessoires Bijoux, Parfums, vêtements",
    "nom": "Miss'Tinguette",
    "adresse": "Place des Marthyrs 6",
    "localite": "7370 - DOUR",
    "telephone": "0494/90.41.61",
    "email": "sandra.stievenart@gmail.com",
    "actif": true
  },
  {
    "id": 697,
    "type": "Café",
    "nom": "Café \"La Maison du Peuple\"",
    "adresse": "Place du Jeu de Balle 24",
    "localite": "7370 - DOUR",
    "telephone": "065/42.26.74",
    "email": "grecorosalba3004@gmail.com",
    "actif": true
  },
  {
    "id": 698,
    "type": "Centre",
    "nom": "Sports et Culture ASBL",
    "adresse": "Place Emile Vandervelde 28",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé - CAFE A CETTE ADRESSE",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 699,
    "type": "?",
    "nom": "LDK Invest",
    "adresse": "Rue du Moulin 34",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 700,
    "type": "Société Energie",
    "nom": "Energy Village Installation Srl",
    "adresse": "Place Emile Vanvervelde 7",
    "localite": "7370 - DOUR",
    "telephone": "065/69.15.60 - 0485/70.58.67",
    "email": "https://www.energy-village.be (contact via site internet)",
    "actif": true
  },
  {
    "id": 701,
    "type": "Agence Immobilière",
    "nom": "Hantson Laureen",
    "adresse": "Place Verte 33",
    "localite": "7370 - DOUR",
    "telephone": "Remplacer par Agence Fridenbergs",
    "email": "Remplacer par Agence Fridenbergs",
    "actif": true
  },
  {
    "id": 702,
    "type": "Courtiers en Assurances (Beobank)",
    "nom": "Lucingo Business Office",
    "adresse": "Place Verte 34",
    "localite": "7370 - DOUR",
    "telephone": "065/65.04.69",
    "email": "agentdour@beobank.be",
    "actif": true
  },
  {
    "id": 703,
    "type": "Remplacer par Syndicat",
    "nom": "Fides ASBL  FGTB",
    "adresse": "Place Verte 41",
    "localite": "7370 - DOUR",
    "telephone": "065/32.38.00",
    "email": "chomage.dour@fgtb.be",
    "actif": true
  },
  {
    "id": 704,
    "type": "pas le même prénom",
    "nom": "Ruggieri Aurélie (Francesco)",
    "adresse": "Rue Alfred Defuisseaux 1",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "? (Pas d'information sous le nom de Aurélie)",
    "actif": true
  },
  {
    "id": 705,
    "type": "Société de Plafonnage",
    "nom": "ILA Plafonnage",
    "adresse": "Rue Alfred Defuisseaux 52",
    "localite": "7370 - DOUR",
    "telephone": "0497/24.79.03",
    "email": "ilaplafonnage@hotmail.com",
    "actif": true
  },
  {
    "id": 706,
    "type": "Service de Nettoyage",
    "nom": "Nett'évasion",
    "adresse": "Rue Aimeries 132",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 707,
    "type": "Société de construction et Rénovation",
    "nom": "GC Construction",
    "adresse": "Rue Aimeries 230",
    "localite": "7370 - DOUR",
    "telephone": "0483/49.99.19",
    "email": "Gcconstruction.cornez@hotmail.com",
    "actif": true
  },
  {
    "id": 708,
    "type": "Société de construction",
    "nom": "JCC Construct",
    "adresse": "Rue Basse 50",
    "localite": "7370 - DOUR",
    "telephone": "0476/02.67.24",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 709,
    "type": "Entreprise de construction",
    "nom": "Alcantarini Léonardo",
    "adresse": "Rue Camille Moury 105",
    "localite": "7370 - DOUR",
    "telephone": "065/65.40.76 - 0494/10.44.71",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 710,
    "type": "Agence Immobilière",
    "nom": "Immo Basecq Srl",
    "adresse": "RueCamille Moury 133",
    "localite": "7370 - DOUR",
    "telephone": "065/65.33.62",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 711,
    "type": "Société d'Electricité",
    "nom": "O.M. Elec",
    "adresse": "Rue des Vivroeulx 44",
    "localite": "7370 - DOUR",
    "telephone": "065/98.00.66 - 0472/10.45.18",
    "email": "om-elec@hotmail.com",
    "actif": true
  },
  {
    "id": 712,
    "type": "Cabinet fiscal",
    "nom": "Faucon & Partners",
    "adresse": "Rue Cauderloo 77",
    "localite": "7370 - DOUR",
    "telephone": "065/79.40.51",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 713,
    "type": "Comptable",
    "nom": "Faucon Frédéric",
    "adresse": "Rue Cauderloo 77",
    "localite": "7370 - DOUR",
    "telephone": "065/79.40.51",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 714,
    "type": "Travaux généraux d'installation électrotechnique",
    "nom": "GW Associated SCRL",
    "adresse": "Rue Coin du Bois 23",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 715,
    "type": "Association, refuge Animaux",
    "nom": "Nos amies les bêtes ASBL",
    "adresse": "Voie des Cocars 27",
    "localite": "7370 - DOUR",
    "telephone": "065/65.24.20 - 0474/10.71.65",
    "email": "nosamieslesbetesasbl@hotmail.com",
    "actif": true
  },
  {
    "id": 716,
    "type": "Photographe",
    "nom": "Mascia Emilie",
    "adresse": "Rue Culot Quézo 10",
    "localite": "7370 - DOUR",
    "telephone": "0478/32.26.03",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 717,
    "type": "Association",
    "nom": "Amicale des Gens de la-Haut ASBL",
    "adresse": "Rue du Cimetière 5",
    "localite": "7370 - DOUR",
    "telephone": "0497/27.34.50",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 718,
    "type": "Infirmier",
    "nom": "Kempa Gautier",
    "adresse": "Rue Culot Quézo 8",
    "localite": "7370 - DOUR",
    "telephone": "0477/27.32.68",
    "email": "contact via https://nosavis.be",
    "actif": true
  },
  {
    "id": 719,
    "type": "Infirmière",
    "nom": "Sarrazin Corine",
    "adresse": "Rue d'Audregnies 22",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 720,
    "type": "Poissonnier",
    "nom": "Djurbizz Group Srl",
    "adresse": "Rue d'Audregnies 44",
    "localite": "7370 - DOUR",
    "telephone": "Faillite",
    "email": "Faillite",
    "actif": true
  },
  {
    "id": 721,
    "type": "Société de téléphone",
    "nom": "Euphony",
    "adresse": "Rue d'Italie 48",
    "localite": "7370 - DOUR",
    "telephone": "Définivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 722,
    "type": "Société de Jardinage",
    "nom": "ABC Jardins",
    "adresse": "Rue d'Offignies 35",
    "localite": "7370 - DOUR",
    "telephone": "065/46.52.82 - 0477/31.01.73",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 723,
    "type": "Agence Immobilière",
    "nom": "Immo DG Srl",
    "adresse": "Rue de Baisieux 10",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 724,
    "type": "Pizzeria",
    "nom": "Pizzeria de la Campagne",
    "adresse": "Rue de Bavay 13",
    "localite": "7370 - DOUR",
    "telephone": "065/95.32.82",
    "email": "Contact via Facebook",
    "actif": true
  },
  {
    "id": 725,
    "type": "?",
    "nom": "Mylène (Terache)",
    "adresse": "Rue Belle-Vue 13",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information à l'adresse est \"Terache\"",
    "actif": true
  },
  {
    "id": 726,
    "type": "?",
    "nom": "Malou Nadège",
    "adresse": "Rue Belle-Vue 13",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 727,
    "type": "?",
    "nom": "Q-SET",
    "adresse": "Rue Belle-Vue 54/Bte 3",
    "localite": "7370 - DOUR",
    "telephone": "065.65.30.35",
    "email": "info@qset.be",
    "actif": true
  },
  {
    "id": 728,
    "type": "Agence Immobilière",
    "nom": "DK Immo Srl",
    "adresse": "Rue Belle- Vue 55",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 729,
    "type": "Coiffure",
    "nom": "Marie-Coiff",
    "adresse": "Rue Léon Defuisseaux 46",
    "localite": "7080 - FRAMERIES",
    "telephone": "0477/91.43.99",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 730,
    "type": "?",
    "nom": "Oubouz Karima",
    "adresse": "Rue de Boussu 63",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 731,
    "type": "?",
    "nom": "Megs Srl",
    "adresse": "Rue de Boussu 34",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 732,
    "type": "Société de Jardinage",
    "nom": "Bruwière Bruno",
    "adresse": "Rue de France 5",
    "localite": "7370 - DOUR",
    "telephone": "0473/76.83.41",
    "email": "bruno.bruwiere@gmail.com",
    "actif": true
  },
  {
    "id": 733,
    "type": "Club & Centre Sportif",
    "nom": "Tout Terrain ASBL",
    "adresse": "Rue du Stade 31",
    "localite": "7370 - DOUR",
    "telephone": "0474/24.45.94",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 734,
    "type": "?",
    "nom": "Balance Production ASBL",
    "adresse": "Rue de l'Athénée 1/A",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 735,
    "type": "Association",
    "nom": "Association sde Fait Stages Antonacci-Rizzo",
    "adresse": "Rue de l'Athénée 8",
    "localite": "7370 - DOUR",
    "telephone": "0477/47.33.08",
    "email": "antonellarizzo@hotmail.be",
    "actif": true
  },
  {
    "id": 736,
    "type": "Informaticien",
    "nom": "Bruylands Baptiste-Arthur",
    "adresse": "Rue de l'Eglise 13",
    "localite": "7370 - DOUR",
    "telephone": "065/65.34.52",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 737,
    "type": "Musique",
    "nom": "RFUW ASBL",
    "adresse": "Rue de l'Eglise 19",
    "localite": "7370 - DOUR",
    "telephone": "0474/21.47.04",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 738,
    "type": "?",
    "nom": "Antoit Srl",
    "adresse": "Rue de l'Eglise 32",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 739,
    "type": "Club & Centre Sportif",
    "nom": "Lienard Cyrille",
    "adresse": "Rue de l'Yser 102",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 740,
    "type": "Férroneire",
    "nom": "Jigé Ferronerie/Jigé Sculptor",
    "adresse": "Rue de l'Yser 15",
    "localite": "7370 - DOUR",
    "telephone": "065/63.40.74 - 0477/31.29.56",
    "email": "gallez.jeremy@gmail.com",
    "actif": true
  },
  {
    "id": 741,
    "type": "?",
    "nom": "Molle Alexis",
    "adresse": "Rue de l'Yser 61",
    "localite": "7370 - DOUR",
    "telephone": "/",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 742,
    "type": "?",
    "nom": "PALKA Entreprise",
    "adresse": "Rue de la Carrière 1",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "pas d'information",
    "actif": true
  },
  {
    "id": 743,
    "type": "Société d'Entretien et Réparation de Voitures",
    "nom": "Nitro-Clean Srl",
    "adresse": "Rue de la Drève 16/B",
    "localite": "7370 - DOUR",
    "telephone": "065/82.53.90",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 744,
    "type": "Diététicienne",
    "nom": "Pignato Samantha",
    "adresse": "Rue Guérin 32",
    "localite": "7300 - BOUSSU",
    "telephone": "/",
    "email": "contact via https://nosavis.be",
    "actif": true
  },
  {
    "id": 745,
    "type": "Société de Graphisme",
    "nom": "Inka Graphisme",
    "adresse": "Rue de la Fontaine 21",
    "localite": "7370 - DOUR",
    "telephone": "065/65.01.69 - 0473/76.26.05",
    "email": "Paas de mail",
    "actif": true
  },
  {
    "id": 746,
    "type": "Société de Construction",
    "nom": "DLS.G.C. Constructions Srl",
    "adresse": "Rue de la Frontière 291",
    "localite": "7370 - DOUR",
    "telephone": "065/80.36.67 - 0474/64.03.42",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 747,
    "type": "?",
    "nom": "Black Hole ASBL",
    "adresse": "Rue de la Frontière 317",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 748,
    "type": "",
    "nom": "CP Geoconsulting SC SCS",
    "adresse": "Rue de la Frontière 320",
    "localite": "7370 - DOUR",
    "telephone": "Définivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 749,
    "type": "Médecin",
    "nom": "DR Janssens Neonat SC Srl",
    "adresse": "Rue de la Frontière 320",
    "localite": "7370 - DOUR",
    "telephone": "065/95.24.02 - 0477/77.90.64",
    "email": "melanie_janssens@yahoo.fr",
    "actif": true
  },
  {
    "id": 750,
    "type": "?",
    "nom": "Mallae ASBL",
    "adresse": "Rue de la Frontière 450",
    "localite": "7370 - DOUR",
    "telephone": "0495/16.41.91",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 751,
    "type": "Friterie",
    "nom": "Il était une Frite",
    "adresse": "Rue de la Frontière 54",
    "localite": "7370 - DOUR",
    "telephone": "0468/38.97.81",
    "email": "il.etait.une.fois@hotmail.com",
    "actif": true
  },
  {
    "id": 752,
    "type": "?",
    "nom": "Saxe Arnaud",
    "adresse": "Rue de la Frontière 65",
    "localite": "7370 - DOUR",
    "telephone": "0476/48.82.71",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 753,
    "type": "Centre de Santé",
    "nom": "Espace Santé Blidegardien",
    "adresse": "Rue de la Frontière 68",
    "localite": "7370 - DOUR",
    "telephone": "065/63.06.46",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 754,
    "type": "Médiation",
    "nom": "Baton Georgette",
    "adresse": "Rue de la Gayolle 87",
    "localite": "7370 - DOUR",
    "telephone": "065/65.39.00 - 0476/90.92.64",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 755,
    "type": "Arboriculture et production de fruits",
    "nom": "Agri-Lecomte & Fils Srl",
    "adresse": "Rue de la Grande Veine 103",
    "localite": "7370 - DOUR",
    "telephone": "065/45.81.79",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 756,
    "type": "Culture de céréales et légumineuses et graines",
    "nom": "Ass.de Fait Lecomte Franz-Nicolas-Christopher",
    "adresse": "Rue de la Grande Veine 54",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.76 - 0495/52.17.03",
    "email": "lecomtefnc@hotmail.com",
    "actif": true
  },
  {
    "id": 757,
    "type": "Culture de céréales et légumineuses et graines",
    "nom": "Lecomte Christopher",
    "adresse": "Rue de la Grande Veine 58",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.76",
    "email": "lecomtefnc@hotmail.com",
    "actif": true
  },
  {
    "id": 758,
    "type": "Culture de céréales et légumineuses et graines",
    "nom": "Lecomte Nicolas",
    "adresse": "Rue de la Grande Veine 58",
    "localite": "7370 - DOUR",
    "telephone": "065/65.90.76",
    "email": "lecomtefnc@hotmail.com",
    "actif": true
  },
  {
    "id": 759,
    "type": "Toiturier",
    "nom": "Trevisan Srl",
    "adresse": "Rue de la Machine à Feu 5",
    "localite": "7370 - DOUR",
    "telephone": "065/65.98.57",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 760,
    "type": "Agence Immobilière",
    "nom": "Adel immo",
    "adresse": "Rue de la Machine à Feu 7",
    "localite": "7370 - DOUR",
    "telephone": "065/66.23.95 - 0478/68.55.60",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 761,
    "type": "Vente à domicile",
    "nom": "Delvallée Céline",
    "adresse": "Rue de la Tournelle 10",
    "localite": "7370 - DOUR",
    "telephone": "0472/07.36.63",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 762,
    "type": "Société de Rénovation",
    "nom": "Unibat Setr",
    "adresse": "Rue de Là-Haut 75",
    "localite": "7370 - DOUR",
    "telephone": "065/57.32.55",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 763,
    "type": "Restauration",
    "nom": "EBC Group",
    "adresse": "Rue de Ropaix 169",
    "localite": "7370 - DOUR",
    "telephone": "065/80.08.62 - 0475/59.12.63",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 764,
    "type": "Pédicure Médicale - Esthéticienne",
    "nom": "Emmanuelle Soins de Santé",
    "adresse": "Rue de Ropaix 174",
    "localite": "7370 - DOUR",
    "telephone": "0477/31.08.68",
    "email": "cassidy026@outlook.com",
    "actif": true
  },
  {
    "id": 765,
    "type": "Société Jardiniage",
    "nom": "Ambiance Jardin",
    "adresse": "Rue de Ropaix 19",
    "localite": "7370 - DOUR",
    "telephone": "065/95.39.82 - 0476/85.70.85",
    "email": "ambiancejardin@outlook.be",
    "actif": true
  },
  {
    "id": 766,
    "type": "Société de Chauffage Central",
    "nom": "Technical Solution",
    "adresse": "Rue de Ropaix 253",
    "localite": "7370 - DOUR",
    "telephone": "065/66.24.33 - 0471/63.38.31",
    "email": "jfy@technical-solution.be",
    "actif": true
  },
  {
    "id": 767,
    "type": "?",
    "nom": "LD-BI Srl",
    "adresse": "Rue de Ropaix 276",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 768,
    "type": "Centre Sportif",
    "nom": "FPS Sport ASBL",
    "adresse": "Rue de Tournelle 12",
    "localite": "7370 - DOUR",
    "telephone": "065/88.56.68",
    "email": "fc.so.elouges@gmail.com à vérifier car pas même nom société, verifier aussi adresse et nom société",
    "actif": true
  },
  {
    "id": 769,
    "type": "Société de Construction",
    "nom": "M S Construction  Srl",
    "adresse": "Rue Delval 38/A",
    "localite": "7370 - DOUR",
    "telephone": "0470/56.37.81",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 770,
    "type": "Centre Sportif",
    "nom": "Up'Coach",
    "adresse": "Rue delval 40",
    "localite": "7370 - DOUR",
    "telephone": "0475/30.93.44 à vérifier car pas même adresse",
    "email": "sandrine.duchesne28@gmail.com à vérifier car pas même adresse",
    "actif": true
  },
  {
    "id": 771,
    "type": "?",
    "nom": "Werniers Pascal",
    "adresse": "Rue des Andrieux 114",
    "localite": "7370 - DOUR",
    "telephone": "065/75.99.53",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 772,
    "type": "?",
    "nom": "LC Repair SCS",
    "adresse": "Rue des Andrieux 117",
    "localite": "7370 - DOUR",
    "telephone": "065/.22.85.91",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 773,
    "type": "Centre Sportif",
    "nom": "Futsal STE Odile Jeunes Dour ASBL",
    "adresse": "Rue des Andrieux 121",
    "localite": "7370 - DOUR",
    "telephone": "? ( vérifier le nom)",
    "email": "?",
    "actif": true
  },
  {
    "id": 774,
    "type": "Psychologue",
    "nom": "Rizzo Victoria",
    "adresse": "Rue des Andrieux 150",
    "localite": "7370 - DOUR",
    "telephone": "0496/03.64.68",
    "email": "psychologue.victoria.rizzo@gmail.com",
    "actif": true
  },
  {
    "id": 775,
    "type": "Société de Chauffage",
    "nom": "Chauffage Vandember",
    "adresse": "Rue des Andrieux 158",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 776,
    "type": "?",
    "nom": "Zabeli Srl",
    "adresse": "Rue des Andrieux 18",
    "localite": "7370 - DOUR",
    "telephone": "0473/75.80.64",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 777,
    "type": "Institution et Organisation Sportive",
    "nom": "MM Events & Sales",
    "adresse": "Rue des Andrieux 196",
    "localite": "7370 - DOUR",
    "telephone": "0484/91.20.07",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 778,
    "type": "Médecin",
    "nom": "Fierain Camille",
    "adresse": "Rue de Baudinchamp 3",
    "localite": "7370 - DOUR",
    "telephone": "0498/97.00.66",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 779,
    "type": "Service/Copy Center",
    "nom": "Debrue Gauthier",
    "adresse": "Rue des Andrieux 87",
    "localite": "7370 - DOUR",
    "telephone": "065/31.46.81",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 780,
    "type": "Association",
    "nom": "3D ASBL",
    "adresse": "Rue de la Corderie 19",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18",
    "email": "info@3dasbl.be",
    "actif": true
  },
  {
    "id": 781,
    "type": "Conseiller en Affaires & Conseiller en Gestion",
    "nom": "La Sensacion Srl",
    "adresse": "Rue des Canadiens 100 (siège social)-Rue des vainqueurs 125-Rue Général Leman 23",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 782,
    "type": "Kinésithérapeute",
    "nom": "Gueben Florine",
    "adresse": "Rue des Canadiens 193",
    "localite": "7370 - DOUR",
    "telephone": "0491/43.44.52",
    "email": "florine.gueben@okineo.be",
    "actif": true
  },
  {
    "id": 783,
    "type": "Kninésithérapeute",
    "nom": "Huart Adélaïde",
    "adresse": "Rue des Canadiens 193",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 784,
    "type": "Pédicure",
    "nom": "Lechien Pascale",
    "adresse": "Rue des Canadiens 193",
    "localite": "7370 - DOUR",
    "telephone": "065/75.01.81",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 785,
    "type": "?",
    "nom": "DD Rénov",
    "adresse": "Rue des Canadiens 74/Et.2",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 786,
    "type": "Société Chauffage et Sanitaire",
    "nom": "Denis  L Chauffage et Sanitaire",
    "adresse": "Rue des Chênes 24",
    "localite": "7370 - DOUR",
    "telephone": "065/65.69.69",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 787,
    "type": "?",
    "nom": "Coppi Antoni",
    "adresse": "Rue des Chênes 25",
    "localite": "7370 - DOUR",
    "telephone": "0476/65.98.33",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 788,
    "type": "Service d'Aménagement Paysager",
    "nom": "Storet Gaëtan",
    "adresse": "Rue des Chênes 52",
    "localite": "7370 - DOUR",
    "telephone": "0479/73.91.65",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 789,
    "type": "Nettoyage de lieux et Embaumeur",
    "nom": "Activité Thanatopraxie Srl",
    "adresse": "Rue des Chênes 69",
    "localite": "7370 - DOUR",
    "telephone": "0468/38.54.82",
    "email": "a.tanatopraxie@gmail.com",
    "actif": true
  },
  {
    "id": 790,
    "type": "?",
    "nom": "Le jardin de Louca",
    "adresse": "Rue des Vainqueurs 128",
    "localite": "7370 - DOUR",
    "telephone": "0488/29.12.10",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 791,
    "type": "Boutique d'appareils élèctroniques",
    "nom": "A D Websys Srl",
    "adresse": "Rue Victor Caudron 38",
    "localite": "7370 - DOUR",
    "telephone": "065/65.92.60 - 0471/69.01.39",
    "email": "info@adwebsys.be",
    "actif": true
  },
  {
    "id": 792,
    "type": "Sophrologue",
    "nom": "Sophrologie caycédienne Papillon",
    "adresse": "Rue du Chêne Brûlé 32",
    "localite": "7370 - DOUR",
    "telephone": "0477/96.74.28",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 793,
    "type": "Institut de Beauté",
    "nom": "Ofildelâme",
    "adresse": "Rue du Cimetière 45 (vérifier adresse)",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 794,
    "type": "?",
    "nom": "Bohez Christophe",
    "adresse": "Rue su Coin du Bois 31",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 795,
    "type": "Psychologue/Hypnothérapeute",
    "nom": "Jacques Noémie",
    "adresse": "Rue du Commerce 158",
    "localite": "7370 - DOUR",
    "telephone": "0475/51.62.44",
    "email": "noemie_jacques@hotmail.com",
    "actif": true
  },
  {
    "id": 796,
    "type": "Extrascolaire (Activité psychomotricité et parascolaire)",
    "nom": "Les Petits Chaperons Bougent",
    "adresse": "Rue du Commerce 158",
    "localite": "7370 - DOUR",
    "telephone": "065/65.38.88 - 0479/33.94.73",
    "email": "lespetitschaperonsbougent@gmail.com",
    "actif": true
  },
  {
    "id": 797,
    "type": "Travaux Agricole",
    "nom": "Abrassart Geoffrey",
    "adresse": "Rue du Commerce 78",
    "localite": "7370 - DOUR",
    "telephone": "0477/35.60.80",
    "email": "gosu@live.be",
    "actif": true
  },
  {
    "id": 798,
    "type": "?",
    "nom": "Ruelle Dorothée",
    "adresse": "Rue du Commerce 87",
    "localite": "7370 - DOUR",
    "telephone": "0476/40.54.61",
    "email": "thierry2012@live.be",
    "actif": true
  },
  {
    "id": 799,
    "type": "?",
    "nom": "Profull",
    "adresse": "Rue du Coron 124",
    "localite": "7370 - DOUR",
    "telephone": "0493/04.24.24",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 800,
    "type": "Organisation (culture et évènement)",
    "nom": "Dour en Action",
    "adresse": "Rue de la Corderie 19",
    "localite": "7370 - DOUR",
    "telephone": "065/71.87.18 - 0478/67.22.94",
    "email": "info@dourenaction.be",
    "actif": true
  },
  {
    "id": 801,
    "type": "Vente Automobiles",
    "nom": "AIT-Cars",
    "adresse": "Rue de Bavay 144",
    "localite": "7080 - FRAMERIES",
    "telephone": "0484/57.06.20",
    "email": "aitcars@hotmail.com",
    "actif": true
  },
  {
    "id": 802,
    "type": "?",
    "nom": "NLR ASBL",
    "adresse": "Rue du Dérodé 5",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 803,
    "type": "Soins à Domicile",
    "nom": "Domicile Confort",
    "adresse": "Rue du Trieu 3",
    "localite": "7370 - DOUR",
    "telephone": "0488/28.25.48",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 804,
    "type": "?",
    "nom": "IC Tech Consulting",
    "adresse": "Rue du Longterne 31",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 805,
    "type": "Esthéticienne - pédicure médicale",
    "nom": "Les secrets de beauté de Sulay",
    "adresse": "Rue du Longterne 31",
    "localite": "7370 - DOUR",
    "telephone": "0488/34.23.03",
    "email": "sulypenafiel@icloud.com",
    "actif": true
  },
  {
    "id": 806,
    "type": "Institut de Beauté",
    "nom": "Tic Tac Bun",
    "adresse": "Rue du Marché 2",
    "localite": "7370 - DOUR",
    "telephone": "065/95.74.68 - 0479/79.40.45 (gms à vérifier)",
    "email": "gaelledehaut@gmail.com (à vérifier)",
    "actif": true
  },
  {
    "id": 807,
    "type": "Société de Rénovation",
    "nom": "Europetubes",
    "adresse": "Rue du Moulin 10",
    "localite": "7370 - DOUR",
    "telephone": "065/66.68.20 - 0483/26.56.33",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 808,
    "type": "Réparateurs et Entretien produits élétroniques",
    "nom": "Vanden Elsen - Tenaerts Patrick",
    "adresse": "Rue du Parc 17",
    "localite": "7370 - DOUR",
    "telephone": "065/31.80.69",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 809,
    "type": "Immobilier",
    "nom": "Immobilière du Petit Parc",
    "adresse": "Rue du Parc 19/E",
    "localite": "7370 - DOUR",
    "telephone": "065/62.32.70 - 0486/55.60.52",
    "email": "ipp1956@yahoo.fr",
    "actif": true
  },
  {
    "id": 810,
    "type": "?",
    "nom": "Didier Grégory",
    "adresse": "Rue du Parc 20",
    "localite": "7370- DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 811,
    "type": "?",
    "nom": "Soulamain",
    "adresse": "Rue du Parc 26",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 812,
    "type": "Magasin (Article cadeaux, Détente)",
    "nom": "DAE-CIG",
    "adresse": "Rue du Pleuple 2",
    "localite": "7370 - DOUR",
    "telephone": "056/84.06.86 - 0487/37.43.26",
    "email": "info@provap.be",
    "actif": true
  },
  {
    "id": 813,
    "type": "Huissier de Justice",
    "nom": "Unilex",
    "adresse": "Rue des Andrieux 25/B1",
    "localite": "7370 - DOUR",
    "telephone": "065/66.29.89",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 814,
    "type": "Service de Transport",
    "nom": "Boudart Bertrand",
    "adresse": "Rue du Plat-Pied 12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.46.42 - 0485/68.09.89",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 815,
    "type": "Fruits et Légumes",
    "nom": "Carbon Martine",
    "adresse": "Rue du Préfeuillet 32",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.72",
    "email": "http://hainaut-terredegouts.be (via site web)",
    "actif": true
  },
  {
    "id": 816,
    "type": "Agriculture (Vente de PDT)",
    "nom": "Ferme Brunin",
    "adresse": "Rue du Préfeuillet 32",
    "localite": "7370 - DOUR",
    "telephone": "065/65.30.72",
    "email": "http://hainaut-terredegouts.be (via site web)",
    "actif": true
  },
  {
    "id": 817,
    "type": "?",
    "nom": "Langlet Rémy",
    "adresse": "Rue du Quesnoy 130",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 818,
    "type": "Service de Télécommunications",
    "nom": "Bichon Nicolas",
    "adresse": "Rue du Quesnoy 40",
    "localite": "7370 - DOUR",
    "telephone": "0477/58.69.31",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 819,
    "type": "Rénovation Façades",
    "nom": "J M B Crépis & Façades",
    "adresse": "Rue du Quesnoy 45",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de Faillite",
    "email": "Cloture de Faillite",
    "actif": true
  },
  {
    "id": 820,
    "type": "Aménagerment, Entretien de Jardin",
    "nom": "Arborias",
    "adresse": "Rue du Quesnoy 69",
    "localite": "7370 - DOUR",
    "telephone": "065/69.01.92 - 0470/84.61.01",
    "email": "arborias@hotmail.com",
    "actif": true
  },
  {
    "id": 821,
    "type": "Etablissement Finaciers",
    "nom": "Contino Philippe",
    "adresse": "Rue du Rossignol 52",
    "localite": "7370 - DOUR",
    "telephone": "065/52.00.51 - 0474/69.32.52",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 822,
    "type": "Kinésithérapeute",
    "nom": "Delplanque Chloé (prénom à vérifier car sur internet \"Claude\")",
    "adresse": "Rue du Rossignol 75",
    "localite": "7370 - DOUR",
    "telephone": "065/65.29.63",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 823,
    "type": "Boulangerie-Patisserie",
    "nom": "Mattucci-Avarello",
    "adresse": "Rue du Stade 18",
    "localite": "7370 - DOUR",
    "telephone": "065/45.74.52",
    "email": "mattucci@skynet.be",
    "actif": true
  },
  {
    "id": 824,
    "type": "Pharmacie",
    "nom": "Dufour Emilie",
    "adresse": "Rue du Stade 56",
    "localite": "7370 - DOUR",
    "telephone": "0476/56.62.75",
    "email": "d_emilie459@hotmail.com",
    "actif": true
  },
  {
    "id": 825,
    "type": "Fleuriste",
    "nom": "A Fleur d'Ame",
    "adresse": "Rue du Stade 70/C",
    "localite": "7370 - DOUR",
    "telephone": "065/95.55.79",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 826,
    "type": "Architecte",
    "nom": "View Architecture",
    "adresse": "Rue du Stade 78",
    "localite": "7370 - DOUR",
    "telephone": "065/65.56.74 - 0476/21.79.98",
    "email": "he.concept@skynet.be",
    "actif": true
  },
  {
    "id": 827,
    "type": "Centre Sportif",
    "nom": "All In Aqua",
    "adresse": "Rue du Stade 78/A",
    "localite": "7370 - DOUR",
    "telephone": "065/80.09.69",
    "email": "allinaqua.dour@gmail.com",
    "actif": true
  },
  {
    "id": 828,
    "type": "?",
    "nom": "BY Aurore",
    "adresse": "Rue du Trieu 39",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 829,
    "type": "Club Sportif",
    "nom": "Amicale Anderlecht Avia Hockey Club",
    "adresse": "Pas d'adresse connue pour Dour - Drève Olympique 7 (siège social)",
    "localite": "1070 - BRUXELLES",
    "telephone": "02/675.2977 (siège social) - 0476/48.92.46 (responsable)",
    "email": "info@amicale-anderlecht.com",
    "actif": true
  },
  {
    "id": 830,
    "type": "?",
    "nom": "Dans ma Bulle",
    "adresse": "Rue Edouard André 21",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 831,
    "type": "Kinésithérapeute",
    "nom": "Héraut Marie-Odile",
    "adresse": "Rue Emile Estièvenart 12",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "heraut.marieodile@gmail.com",
    "actif": true
  },
  {
    "id": 832,
    "type": "Cabinet Fiscal",
    "nom": "DIZ-Invest",
    "adresse": "Rue Fauvette 43 à vérifier",
    "localite": "7370 - DOUR",
    "telephone": "065/57.05.42",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 833,
    "type": "Peinture intérieur, extérieur, revêtem. murs et sols, pose de parquet etc..",
    "nom": "MC Color Renov'",
    "adresse": "Rue Ferrer 17/D",
    "localite": "7370 - DOUR",
    "telephone": "0472/78.70.29",
    "email": "mc.color.renov@gmail.com",
    "actif": true
  },
  {
    "id": 834,
    "type": "Agents et Courtiers en Services Bancaires",
    "nom": "Cofoma Conseils",
    "adresse": "Rue de a Licorne 54",
    "localite": "7022 - MONS",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 835,
    "type": "Agents et Courtiers en Services Bancaires",
    "nom": "TF Conseils Srl",
    "adresse": "Rue Ferrer 69",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de liquidation",
    "email": "Cloture de liquidation",
    "actif": true
  },
  {
    "id": 836,
    "type": "Construction générale, Travaux de toiture",
    "nom": "Jordy Transform",
    "adresse": "Rue Fontaine Déclaret 8",
    "localite": "7370 - DOUR",
    "telephone": "065/98.21.05",
    "email": "jordytransform@hotmail.com (A VERIFIER CAR 2 APPARAISSENT SUR INTERNET FONCTION DIFFERENTE)",
    "actif": true
  },
  {
    "id": 837,
    "type": "Restauration Rapide",
    "nom": "Wantiez Marie-Hélène",
    "adresse": "Rue de Houdain 4",
    "localite": "7000 - MONS",
    "telephone": "Définitivement Fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 838,
    "type": "Restaurant, Bar",
    "nom": "Gaudi Bar A Tapas",
    "adresse": "Rue Grande 103",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement Fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 839,
    "type": "Boutique Vêtements pour Femmes",
    "nom": "Trendy Women's",
    "adresse": "Rue Grande 103 (à vérifier)",
    "localite": "7370 - DOUR",
    "telephone": "0476/91.34.72",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 840,
    "type": "?",
    "nom": "Durabuild Group srl",
    "adresse": "Rue Grande 15",
    "localite": "7370 - DOUR",
    "telephone": "Définitivement Fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 841,
    "type": "Magasin Accessoires Médical",
    "nom": "VS Médical Srl",
    "adresse": "Rue des Chênes 2B",
    "localite": "7370 - DOUR",
    "telephone": "065/66.87.07 - 0477/61.13.80",
    "email": "vsmedical@gmail.com",
    "actif": true
  },
  {
    "id": 842,
    "type": "Salon de Manucure",
    "nom": "Severi'nails",
    "adresse": "Rue Sainte Catherine 101",
    "localite": "7370 - DOUR",
    "telephone": "068/33.22.11 - 0477/85.92.18",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 843,
    "type": "Centre de Fitness",
    "nom": "Tout En Fitness ASBL",
    "adresse": "Rue Grande 3/A",
    "localite": "7370 - DOUR",
    "telephone": "Cloture de Liquidation",
    "email": "Cloture de Liquidation",
    "actif": true
  },
  {
    "id": 844,
    "type": "Fournisseur en Energie",
    "nom": "Jamilhoir.ean-télécom",
    "adresse": "Rue des Droits de l'Homme 6",
    "localite": "7000 - MONS",
    "telephone": "0488/88.66.12",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 845,
    "type": "Société de Nettoyage",
    "nom": "Ménage Express",
    "adresse": "Rue Grande 47",
    "localite": "7370 - DOUR",
    "telephone": "0486/05.42.88",
    "email": "menage.express7370@gmail.com",
    "actif": true
  },
  {
    "id": 846,
    "type": "Pizzeria",
    "nom": "Le Gambrinus 2",
    "adresse": "Rue Grande 49",
    "localite": "7370 - DOUR",
    "telephone": "0473/65.89.10",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 847,
    "type": "Magasin de Bougies",
    "nom": "D'ici ou D'ailleurs",
    "adresse": "Rue Grande 54",
    "localite": "7370 - DOUR",
    "telephone": "0497/78.65.28",
    "email": "dicioudailleurs@skynet.be",
    "actif": true
  },
  {
    "id": 848,
    "type": "Tatoueuse",
    "nom": "Cianci Marie-France",
    "adresse": "Rue Grande 66",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 849,
    "type": "Agnece Immobilière",
    "nom": "Zone 7 Immo Srl",
    "adresse": "Rue Grande 66",
    "localite": "7370 - DOUR",
    "telephone": "065/67.79.97 - 0499/16.34.26",
    "email": "zone7@outlook.fr",
    "actif": true
  },
  {
    "id": 850,
    "type": "?",
    "nom": "Au Chat de l'Aiguille",
    "adresse": "Rue Grande 67",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 851,
    "type": "Electroménager - Hifi",
    "nom": "G.Pompilii",
    "adresse": "Rue Grande 68",
    "localite": "7370 - DOUR",
    "telephone": "065/65.49.08 - 0499/16.34.26",
    "email": "gpompilii@skynet .be",
    "actif": true
  },
  {
    "id": 852,
    "type": "Association pour Hommage aux Soldats",
    "nom": "Infantry 44 ASBL",
    "adresse": "Rue Grande 70",
    "localite": "7370 - DOUR",
    "telephone": "065/65.11.44 - 0477/44.29.24",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 853,
    "type": "Hébergement et autres",
    "nom": "Hielo Mombo",
    "adresse": "Rue Grande 77/C",
    "localite": "7370 - DOUR",
    "telephone": "0484/73.22.50",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 854,
    "type": "Kinésithérapeute",
    "nom": "Cauchies Antoine",
    "adresse": "Rue Grande 90",
    "localite": "7370 - DOUR",
    "telephone": "0472/86.48.06",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 855,
    "type": "Equitation",
    "nom": "Les Cavaliers du Sanpas",
    "adresse": "Rue Henri Pochez 104",
    "localite": "7370 - DOUR",
    "telephone": "065/46.56.66",
    "email": "lesanpas1999@gmail.com",
    "actif": true
  },
  {
    "id": 856,
    "type": "?",
    "nom": "Elektra arms",
    "adresse": "Rue Henri Pochez 134",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 857,
    "type": "Agence Immoblière",
    "nom": "S.M. Company",
    "adresse": "Rue Henri Pochez 6",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 858,
    "type": "Traiteurs",
    "nom": "New Epsom Two",
    "adresse": "Rue Henri Pochez 169/Bte 6",
    "localite": "7370 - DOUR",
    "telephone": "065/63.16.59",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 859,
    "type": "?",
    "nom": "Dubois Jean-Marie",
    "adresse": "Rue Henri Pochez 40",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 860,
    "type": "?",
    "nom": "Bolome",
    "adresse": "Rue Henri Pochez 44",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 861,
    "type": "?",
    "nom": "Herman Richard",
    "adresse": "Rue Henri Pochez 44",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 862,
    "type": "Porduction Graines et Semences",
    "nom": "Glineur Jean-Baptiste",
    "adresse": "Rue Hardret 33",
    "localite": "7370 - DOUR",
    "telephone": "0477/76.97.37",
    "email": "jb.glineur@gmail.com",
    "actif": true
  },
  {
    "id": 863,
    "type": "Société piercing",
    "nom": "Black Rose Piercing",
    "adresse": "Rue Maréchal Foch 16",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 864,
    "type": "Tatoueur",
    "nom": "Massa Nicolas",
    "adresse": "Rue Maréchal Foch 16",
    "localite": "7370 - DOUR",
    "telephone": "0477/31.26.46",
    "email": "https://be.top10place.com (via web)",
    "actif": true
  },
  {
    "id": 865,
    "type": "Centre Médical",
    "nom": "CM Dourois SC Srl",
    "adresse": "Rue Maréchal Foch 56",
    "localite": "7370 - DOUR",
    "telephone": "065/65.51.13",
    "email": "info@progenda.be",
    "actif": true
  },
  {
    "id": 866,
    "type": "Photographe",
    "nom": "Roméo Laêtitia",
    "adresse": "Rue Maréchal Foch 72",
    "localite": "7370 - DOUR",
    "telephone": "065/67.70.55 - 0475/36.61.88",
    "email": "romeo-artphotography@mail.com",
    "actif": true
  },
  {
    "id": 867,
    "type": "?",
    "nom": "Selaklean Thulin ASBL",
    "adresse": "Rue Maréchal Foch 8",
    "localite": "7370 - DOUR",
    "telephone": "0800/96.526 - 0488/50.13.34 Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 868,
    "type": "?",
    "nom": "Noël Cynthia",
    "adresse": "Rue Moranfayt 124",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 869,
    "type": "?",
    "nom": "Scara Design",
    "adresse": "Rue Nacfer 1/Bte 2",
    "localite": "7370 - DOUR",
    "telephone": "?",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 870,
    "type": "Chauffagiste",
    "nom": "Etablissement Mahieu",
    "adresse": "Rue Nacfer 38",
    "localite": "7370 - DOUR",
    "telephone": "065/95.19.87",
    "email": "etablissement.mahieu@gmail.com",
    "actif": true
  },
  {
    "id": 871,
    "type": "Infirmière",
    "nom": "Van de Maele Corinne",
    "adresse": "Rue Neuve 37",
    "localite": "7370 - DOUR",
    "telephone": "065/69.11.93",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 872,
    "type": "Infirmière à Domicile",
    "nom": "Urbain Laurence",
    "adresse": "Rue Paul Pastur 25",
    "localite": "7370 - DOUR",
    "telephone": "0477/94.88;36",
    "email": "Pas de mail",
    "actif": true
  },
  {
    "id": 873,
    "type": "?",
    "nom": "Transcor Srl",
    "adresse": "Rue Pairois 36",
    "localite": "7370 - DOUR",
    "telephone": "0477/89.04.14",
    "email": "Pas d'information",
    "actif": true
  },
  {
    "id": 874,
    "type": "Rénovation et construction",
    "nom": "Innovconstruct",
    "adresse": "Rue Pairois 39/2",
    "localite": "7370 - DOUR",
    "telephone": "0483/09.36.08",
    "email": "innovconstruct@outlook.com",
    "actif": true
  },
  {
    "id": 875,
    "type": "?",
    "nom": "Leroy Ludivine",
    "adresse": "Rue Paul Pastur 16",
    "localite": "7370 - DOUR",
    "telephone": "065/26.87.11Définitivement fermé",
    "email": "Définitivement fermé",
    "actif": true
  },
  {
    "id": 876,
    "type": "Infirmière",
    "nom": "Pince Sophie",
    "adresse": "Rue de la Nichée Studieuse 19",
    "localite": "7300 - BOUSSU",
    "telephone": "0471/02.08.72",
    "email": "petittonner469@gmail.com",
    "actif": true
  },
  {
    "id": 877,
    "type": "?",
    "nom": "XS ASBL",
    "adresse": "Rue Paul Pastur 7",
    "localite": "7370 - DOUR",
    "telephone": "Pas d'information",
    "email": "Pad d'information",
    "actif": true
  },
  {
    "id": 878,
    "type": "Service de Construction",
    "nom": "Cri Consulting",
    "adresse": "Rue Planche à l'Aulne 25",
    "localite": "7370 - DOUR",
    "telephone": "0484/90.80.60",
    "email": "info@criconsulting.be",
    "actif": true
  },
  {
    "id": 879,
    "type": "Infirmière",
    "nom": "Emilie Infisoins",
    "adresse": "Rue Planche Cabeille 72",
    "localite": "7370 - DOUR",
    "telephone": "0472/88.11.17",
    "email": "emilie.ricottone 81@gmail.com",
    "actif": true
  },
  {
    "id": 880,
    "type": "Société de Terrassement",
    "nom": "Boychuk",
    "adresse": "Rue Robert Tachenion 63",
    "localite": "7370 - DOUR",
    "telephone": "0472/19.49.20",
    "email": "https://terrassement .nosavis.be",
    "actif": true
  },
  {
    "id": 881,
    "type": "Centre Médical",
    "nom": "Cleves Madison",
    "adresse": "Rue Robert Tachenion 12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.38.88 - 0499/29.88.48",
    "email": "centredeschaperons@gmail.com",
    "actif": true
  },
  {
    "id": 882,
    "type": "Logopède - Centre Médical",
    "nom": "Di Pietro Camille",
    "adresse": "Rue Robert Tachenion 12",
    "localite": "7370 - DOUR",
    "telephone": "0477/42.54.97",
    "email": "centredeschaperons@gmail.com",
    "actif": true
  },
  {
    "id": 883,
    "type": "Centre Médical",
    "nom": "Thérapeute psycho-corporel",
    "adresse": "Rue Robert Tachenion 12",
    "localite": "7370 - DOUR",
    "telephone": "065/65.38.88",
    "email": "centredeschaperons@gmail.com",
    "actif": true
  },
  {
    "id": 884,
    "type": "?",
    "nom": "Les couleurs de la Vie",
    "adresse": "Rue Robert Tachenion 31",
    "localite": "7370 - DOUR",
    "telephone": "0475/78.96.37",
    "email": "Pas de mail",
    "actif": true
  }
];

export default function ClientsListPage() {
  const [clients, setClients] = useState(
    RAW_CLIENTS.map((c: any) => ({ ...c, actif: true }))
  );
  const [search, setSearch] = useState("");
  const [filterActif, setFilterActif] = useState<"all"|"on"|"off">("all");

  const filtered = useMemo(() => {
    return clients.filter((c: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.nom.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.adresse.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchActif =
        filterActif === "all" ||
        (filterActif === "on" && c.actif) ||
        (filterActif === "off" && !c.actif);
      return matchSearch && matchActif;
    });
  }, [clients, search, filterActif]);

  const toggleClient = (id: number) => {
    setClients((prev: any[]) =>
      prev.map((c: any) => c.id === id ? { ...c, actif: !c.actif } : c)
    );
  };

  const toggleAll = (val: boolean) => {
    setClients((prev: any[]) => prev.map((c: any) => ({ ...c, actif: val })));
  };

  const activeCount = clients.filter((c: any) => c.actif).length;
  const totalCount = clients.length;

  const exportCSV = () => {
    const active = clients.filter((c: any) => c.actif);
    const header = "ID,Type,Nom,Adresse,Localite,Telephone,Email\n";
    const rows = active.map((c: any) =>
      [c.id, `"${c.type}"`, `"${c.nom}"`, `"${c.adresse}"`, `"${c.localite}"`, `"${c.telephone}"`, `"${c.email}"`].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_actifs_synergiedour_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#001a3d] text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
              <Users className="w-6 h-6" />
              Liste Clients — Diffusion
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              {activeCount} actifs sur {totalCount} commerçants
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => toggleAll(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <ToggleRight className="w-4 h-4" /> Tout activer
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <ToggleLeft className="w-4 h-4" /> Tout désactiver
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] rounded-lg text-sm font-bold flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> Export CSV actifs
            </button>
          </div>
        </div>

        {/* Barre de recherche + filtre */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
            <input
              type="text"
              placeholder="Rechercher nom, type, adresse, email..."
              value={search}
              onInput={(e: any) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#002366] border border-[#D4AF37]/30 rounded-lg text-sm text-white placeholder-blue-300 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <select
            value={filterActif}
            onChange={(e: any) => setFilterActif(e.target.value)}
            className="px-3 py-2 bg-[#002366] border border-[#D4AF37]/30 rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="all">Tous ({totalCount})</option>
            <option value="on">Actifs ({activeCount})</option>
            <option value="off">Inactifs ({totalCount - activeCount})</option>
          </select>
        </div>
      </div>

      {/* Compteur résultats */}
      <div className="mb-3 text-sm text-blue-300">
        {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D4AF37]/20">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#002366] border-b border-[#D4AF37]/30">
              <th className="px-3 py-3 text-left text-[#D4AF37] font-semibold w-12">#</th>
              <th className="px-3 py-3 text-left text-[#D4AF37] font-semibold">Nom</th>
              <th className="px-3 py-3 text-left text-[#D4AF37] font-semibold hidden md:table-cell">Type</th>
              <th className="px-3 py-3 text-left text-[#D4AF37] font-semibold hidden lg:table-cell">Adresse</th>
              <th className="px-3 py-3 text-left text-[#D4AF37] font-semibold hidden xl:table-cell">Téléphone</th>
              <th className="px-3 py-3 text-left text-[#D4AF37] font-semibold hidden xl:table-cell">Email</th>
              <th className="px-3 py-3 text-center text-[#D4AF37] font-semibold">Diffusion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr
                key={c.id}
                className={`border-b border-[#D4AF37]/10 transition-colors ${
                  c.actif
                    ? "bg-[#001a3d] hover:bg-[#002366]"
                    : "bg-[#0a0a1a] opacity-50 hover:bg-[#111130]"
                }`}
              >
                <td className="px-3 py-2.5 text-blue-400 text-xs">{c.id}</td>
                <td className="px-3 py-2.5 font-medium text-white">{c.nom}</td>
                <td className="px-3 py-2.5 text-blue-200 hidden md:table-cell">
                  <span className="bg-[#002366] px-2 py-0.5 rounded text-xs">{c.type}</span>
                </td>
                <td className="px-3 py-2.5 text-blue-300 hidden lg:table-cell text-xs">{c.adresse}</td>
                <td className="px-3 py-2.5 text-blue-300 hidden xl:table-cell text-xs">{c.telephone}</td>
                <td className="px-3 py-2.5 text-blue-300 hidden xl:table-cell text-xs">{c.email}</td>
                <td className="px-3 py-2.5 text-center">
                  <button
                    onClick={() => toggleClient(c.id)}
                    className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors focus:outline-none ${
                      c.actif ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                    title={c.actif ? "Désactiver" : "Activer"}
                  >
                    <span
                      className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        c.actif ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-blue-300">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun résultat pour "{search}"</p>
        </div>
      )}
    </div>
  );
}
