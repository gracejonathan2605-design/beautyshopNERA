import { NERA_IDENTITY } from "@/lib/nera-identity";

export const LEGAL_UPDATED = "3 octobre 2026";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export function sellerParagraph() {
  return `${NERA_IDENTITY.name} est l’enseigne commerciale de ${NERA_IDENTITY.legalName}, société immatriculée au Cameroun. Boutique : ${NERA_IDENTITY.addressLine}. Téléphone : ${NERA_IDENTITY.phoneDisplay}. E-mail : ${NERA_IDENTITY.email}. RCCM : ${NERA_IDENTITY.rccm}. NUI : ${NERA_IDENTITY.nui}.`;
}

function unpaidSentence(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "Une commande dont le paiement n’est pas confirmé peut être annulée et le stock libéré, sans indemnité.";
  }
  return `Une commande dont le paiement n’est pas confirmé dans les ${hours} heures peut être annulée et le stock libéré, sans indemnité.`;
}

export function cgvSections(unpaidHours: number): LegalSection[] {
  return [
    {
      id: "vendeur",
      title: "Qui vend",
      paragraphs: [
        sellerParagraph(),
        "Les présentes conditions régissent les ventes en magasin et les commandes passées sur ce site. Pour une commande en ligne, la version publiée sur le site au moment de la confirmation fait foi. En magasin, le ticket de caisse rappelle les règles essentielles.",
      ],
    },
    {
      id: "acceptation",
      title: "Acceptation",
      paragraphs: [
        "Passer commande, payer, ou retirer un article vaut acceptation pleine et entière des présentes conditions, des conditions de retour et de la notice de confidentialité.",
        "La boutique peut modifier ces textes. Une commande déjà confirmée reste soumise à la version acceptée à ce moment-là. La poursuite de l’usage du site après une mise à jour vaut information pour les commandes suivantes.",
      ],
    },
    {
      id: "produits",
      title: "Produits, photos et stock",
      paragraphs: [
        "Les fiches, photos, teintes et descriptions aident à choisir. Elles restent indicatives. Un écart de nuance, de texture, de lot ou de conditionnement qui ne rend pas l’article impropre à l’usage prévu n’est pas un défaut.",
        "La boutique vend des articles de beauté. Elle ne promet pas un résultat médical, esthétique ou capillaire, et ses conseils ne remplacent pas l’avis d’un professionnel de santé.",
        "L’offre vaut dans la limite du stock réel. Si une fiche est encore visible alors que la pièce vient d’être vendue, la boutique peut annuler cette ligne, prévenir le client et rembourser uniquement les sommes déjà encaissées pour cet article, sans autre indemnité.",
        "Une erreur évidente de prix, notamment un prix dérisoire ou une erreur de saisie, autorise la boutique à annuler la ligne avant la remise. Les sommes encaissées pour cette ligne sont remboursées. Le reste de la commande peut être maintenu.",
      ],
    },
    {
      id: "prix",
      title: "Prix et codes promo",
      paragraphs: [
        "Les prix sont en FCFA, tels qu’affichés au moment de la commande. Lorsque la livraison est choisie, ses frais s’ajoutent et sont indiqués avant la confirmation. Le retrait en magasin n’ajoute pas de frais de livraison.",
        "Un code promo est limité aux conditions affichées lors de son application. La boutique peut le refuser en cas d’usage répété, de diffusion publique ou de suspicion d’abus, et retirer une promotion pour toute commande dont le paiement n’est pas encore confirmé.",
      ],
    },
    {
      id: "commande",
      title: "Formation du contrat",
      paragraphs: [
        "La commande en ligne est une demande d’achat. Le contrat n’est formé que lorsque la boutique confirme avoir reçu le paiement du total dû. Avant cette confirmation, la boutique peut refuser ou annuler la demande, notamment si le stock ne suffit plus, si le téléphone ou l’adresse sont inexploitables, si le paiement est incomplet, ou en cas de suspicion de fraude.",
        unpaidSentence(unpaidHours),
        "Tant que le paiement n’est pas confirmé, aucun article n’est réservé de façon définitive.",
      ],
    },
    {
      id: "paiement",
      title: "Paiement",
      paragraphs: [
        "Orange Money se fait par le code marchand indiqué au moment du paiement. Lorsque ce canal est annoncé sans frais, ces frais restent offerts. MTN Mobile Money se fait par transfert vers le numéro indiqué. Les frais d’opérateur MTN restent à la charge du client. Les espèces sont acceptées en magasin, ou selon l’option proposée à la remise.",
        "Le client communique une référence de paiement lisible et un montant au moins égal au total. Un montant incomplet, une référence inutilisable ou un paiement envoyé sur un autre compte ne confirme pas la commande.",
        "La boutique ne demande pas le code secret du client. Elle n’est pas responsable d’une panne, d’un délai ou d’un rejet du côté d’Orange, de MTN ou du réseau téléphonique. En cas de doute sur un paiement, elle peut demander une confirmation supplémentaire et, à défaut, annuler la commande et rembourser ce qui a été reçu.",
      ],
    },
    {
      id: "livraison",
      title: "Livraison et retrait",
      paragraphs: [
        `Le retrait se fait à la boutique, ${NERA_IDENTITY.addressLine}, aux horaires affichés : ${NERA_IDENTITY.hoursWeekdays}. ${NERA_IDENTITY.hoursSunday}. La livraison concerne les zones de Yaoundé proposées au moment de la commande, aux frais alors affichés.`,
        "La mention « livraison 24h » est un objectif à Yaoundé, une fois le paiement confirmé et le client joignable. Ce n’est pas un délai sanctionné. Un retard dû à une adresse inexacte, à un téléphone qui ne répond pas, à une absence, à la circulation, à un opérateur ou à un cas de force majeure n’ouvre ni indemnité, ni annulation automatique.",
        "Le client garantit l’exactitude du nom, du téléphone et de l’adresse. Après un échec de livraison qui lui est imputable, une nouvelle présentation peut être facturée.",
        "Un retrait non effectué dans les sept jours suivant l’avis de disponibilité peut être annulé. Les articles retournent au stock. Les sommes encaissées pour les articles sont remboursées par le même canal. Les frais d’une tournée de livraison déjà tentée et infructueuse ne sont pas remboursés.",
      ],
    },
    {
      id: "risques",
      title: "Transfert des risques",
      paragraphs: [
        "En magasin, les risques passent au client dès la remise de l’article. En livraison, ils passent dès la remise à la personne présente à l’adresse indiquée, ou dès la confirmation de réception par le client.",
        "Une réclamation pour casse au transport doit être signalée, avec photo, dans les 24 heures de la réception. Passé ce délai, l’article est réputé accepté dans l’état où il a été remis, sous réserve d’un défaut caché.",
      ],
    },
    {
      id: "retours",
      title: "Retours",
      paragraphs: [
        "Les retours sont régis par les conditions de retour. En résumé : les articles d’hygiène, les cosmétiques ouverts, les parfums dont le sceau est rompu, et les mèches, perruques ou extensions ouvertes ou essayées ne sont ni repris ni échangés. Cette règle protège l’hygiène des clientes suivantes.",
      ],
    },
    {
      id: "usage",
      title: "Usage des produits",
      paragraphs: [
        "Avant usage, le client vérifie les ingrédients, la teinte et le mode d’emploi, en particulier en cas de peau sensible ou de cuir chevelu sensibilisé. Une réaction liée à une sensibilité personnelle, alors que le produit est conforme à sa description et n’est pas défectueux, n’est pas un défaut imputable à la boutique.",
        "Un message de conseil aide à choisir dans le catalogue. Il ne crée pas d’obligation de résultat.",
      ],
    },
    {
      id: "responsabilite",
      title: "Responsabilité",
      paragraphs: [
        "Sauf dommage corporel causé par un défaut du produit, lorsque la loi camerounaise ne permet pas d’écarter cette responsabilité, la responsabilité de la boutique est limitée au prix effectivement payé pour l’article concerné.",
        "Sont exclus les préjudices indirects : manque à gagner, perte de temps, déception esthétique et préjudice d’image.",
        "La boutique n’est pas responsable d’un cas de force majeure, notamment une panne générale de réseau ou d’électricité, une décision de l’autorité, un trouble à l’ordre public, un incendie, une inondation, ou une rupture d’approvisionnement indépendante de sa volonté.",
      ],
    },
    {
      id: "propriete",
      title: "Propriété intellectuelle",
      paragraphs: [
        "Les textes, photos, logo et la présentation du site appartiennent à la boutique ou à ses partenaires. Toute copie ou réutilisation sans autorisation écrite est interdite.",
      ],
    },
    {
      id: "preuve",
      title: "Preuve",
      paragraphs: [
        "Les enregistrements du site, les tickets, les messages WhatsApp liés à une commande et les références de paiement font foi entre les parties, sauf preuve contraire.",
      ],
    },
    {
      id: "droit",
      title: "Droit applicable et litiges",
      paragraphs: [
        "Les ventes sont soumises au droit de la République du Cameroun. Le client écrit d’abord à la boutique pour chercher un accord. À défaut d’accord, les tribunaux de Yaoundé sont compétents.",
        "Si une clause était écartée, les autres continueraient de s’appliquer.",
      ],
    },
  ];
}

const FIRM_SALE =
  "Les articles d’hygiène, les cosmétiques ouverts ou testés, les parfums dont le sceau est rompu, et les mèches, perruques ou extensions ouvertes ou essayées ne sont ni repris ni échangés.";

export function returnSections(shopTerms?: string | null): LegalSection[] {
  const extra = shopTerms?.replace(/\s+/g, " ").trim();
  const alreadyCovered = !extra || extra.toLowerCase().includes("mèches ouvertes") || extra.toLowerCase().includes("hygiène");
  return [
    {
      id: "principe",
      title: "La vente est ferme dès l’ouverture",
      paragraphs: [
        "Dès qu’un article d’hygiène, de cosmétique, de parfum ou de cheveu a été ouvert, descellé ou essayé, la vente est ferme. La boutique ne remet pas en rayon un produit qui a pu toucher la peau ou les cheveux d’une autre personne.",
        FIRM_SALE,
      ],
    },
    {
      id: "exclus",
      title: "Articles qui ne sont pas repris",
      paragraphs: [
        "Ne sont pas repris : les articles d’hygiène ; les soins, le maquillage et les cosmétiques ouverts ou testés ; les parfums dont le sceau est rompu ; les mèches, perruques, extensions et accessoires capillaires ouverts ou essayés.",
        "Un article incomplet, sans son emballage d’origine, ou portant des traces d’usage n’est pas repris. Un article acheté en promotion reste soumis aux mêmes exclusions.",
        ...(alreadyCovered || !extra ? [] : [extra]),
      ],
    },
    {
      id: "eligibles",
      title: "Ce qui peut être présenté",
      paragraphs: [
        "Un article non ouvert, encore scellé, complet et dans son emballage d’origine peut être présenté avec la preuve d’achat, dans le délai indiqué ci-dessous.",
        "Un changement d’avis n’oblige pas la boutique à rendre des espèces. Elle choisit, dans cet ordre : un échange contre un article disponible de prix égal ou inférieur ; un avoir à valoir en boutique ; un remboursement par le même canal de paiement, seulement si l’échange et l’avoir sont impossibles. Si l’article d’échange coûte moins cher, la différence reste un avoir, elle n’est pas rendue en espèces.",
      ],
    },
    {
      id: "delai",
      title: "Délai de 48 heures",
      paragraphs: [
        "La demande doit arriver dans les 48 heures de la remise en magasin ou de la livraison. Passé ce délai, la boutique peut refuser sans autre motif.",
      ],
    },
    {
      id: "demarche",
      title: "Comment demander",
      paragraphs: [
        `Écrire au ${NERA_IDENTITY.phoneDisplay} ou à ${NERA_IDENTITY.email}, avec le numéro de commande, puis présenter l’article en magasin aux horaires d’ouverture, sauf accord écrit pour un autre mode de retour.`,
        "Le transport du retour est à la charge du client, sauf si la boutique a remis un article différent de celui commandé ou un article déjà endommagé à l’arrivée.",
      ],
    },
    {
      id: "decision",
      title: "Vérification et remboursement",
      paragraphs: [
        "La boutique examine l’article. Son constat sur l’ouverture, l’usage et l’emballage fait foi, sauf preuve contraire apportée par le client. Un article qui ne remplit pas les conditions est rendu au client, sans échange ni remboursement.",
        "Lorsqu’un remboursement est accepté, il se fait par le même réseau que le paiement, après vérification, au plus tard sous sept jours. Les frais d’opérateur de ce remboursement, s’il y en a, restent à la charge du client. Les frais de livraison ne sont rendus que si la boutique n’a pas livré, ou a livré un article différent ou endommagé à l’arrivée.",
      ],
    },
    {
      id: "erreur",
      title: "Erreur ou casse imputable à la boutique",
      paragraphs: [
        "Article manquant, article différent de la commande, ou casse signalée avec photo dans les 24 heures de la réception : la boutique remplace en priorité. Si le remplacement est impossible, elle propose un avoir, puis le remboursement de la seule ligne concernée. Le reste de la commande reste acquis.",
      ],
    },
    {
      id: "magasin",
      title: "Achats en magasin",
      paragraphs: [
        "Les mêmes règles s’appliquent au ticket de caisse. Sans ticket ni trace de paiement identifiable, la boutique peut refuser la demande.",
      ],
    },
  ];
}

export function privacySections(): LegalSection[] {
  return [
    {
      id: "responsable",
      title: "Responsable du traitement",
      paragraphs: [
        sellerParagraph(),
        `${NERA_IDENTITY.legalName}, sous l’enseigne ${NERA_IDENTITY.name}, décide des finalités et des moyens des traitements décrits ici. Pour une question ou pour exercer un droit : ${NERA_IDENTITY.email}, ou ${NERA_IDENTITY.phoneDisplay}.`,
      ],
    },
    {
      id: "cadre",
      title: "Texte applicable",
      paragraphs: [
        "Cette notice est écrite pour la loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel au Cameroun. Elle applique les principes de cette loi : licéité et loyauté, finalité déterminée, minimisation, exactitude, conservation limitée, sécurité, et droits des personnes.",
        "Elle informe au moment de la collecte. Elle ne tient pas lieu de l’autorisation que l’Autorité de protection des données à caractère personnel peut exiger pour certains traitements.",
      ],
    },
    {
      id: "donnees",
      title: "Données collectées",
      paragraphs: [
        "Commande : nom, téléphone et, en livraison, adresse et ville. Rien de plus n’est demandé pour livrer.",
        "Compte : prénom, nom, e-mail, téléphone, adresse, ville, et mot de passe conservé sous forme d’empreinte illisible, jamais en clair.",
        "Paiement : réseau choisi (Orange Money, MTN Mobile Money ou espèces), référence de transaction et montant. Le code secret n’est ni demandé ni enregistré.",
        "Échanges : messages WhatsApp, appels ou e-mails liés à une commande, à une question, ou à une alerte de retour en stock que la personne a demandée.",
        "Technique : cookie de panier, cookie de connexion au compte, et journaux nécessaires à la sécurité du site.",
        "Mesure d’audience : Google Analytics et Google Tag Manager ne reçoivent des données de navigation (pages consultées, type d’appareil, indication approximative de localisation) et ne déposent un cookie qu’après un accord exprès sur le bandeau du site. Refuser n’empêche pas de commander.",
      ],
    },
    {
      id: "finalites",
      title: "Pourquoi ces données sont utilisées",
      paragraphs: [
        "Préparer, encaisser, livrer ou mettre à disposition la commande, et tenir le compte. La personne donne son accord par un acte positif : elle crée un compte ou elle confirme une commande. Le droit camerounais ne retient pas le contrat comme base autonome. Cet accord est limité à cette finalité.",
        "Conserver les tickets, commandes et preuves de paiement pour la comptabilité et le contrôle fiscal. Cette conservation repose sur une obligation légale. Elle ne tombe pas si la personne retire ensuite son accord pour l’avenir.",
        "Sécuriser le site et prévenir les paiements anormaux, dans la limite de ce qui est nécessaire au service demandé.",
        "Répondre sur WhatsApp lorsqu’une personne écrit, et envoyer le statut d’une commande qu’elle a passée. Un message de suivi de commande n’est pas une publicité.",
        "Mesurer la fréquentation du site pour comprendre quelles pages sont utiles, seulement après accord sur le bandeau. Refuser ou retirer cet accord n’empêche pas de commander. Le panier et la connexion au compte ne dépendent pas de cette mesure.",
        "La boutique ne prend pas de décision automatisée produisant un effet juridique. Elle ne constitue pas de fichier de santé, d’origine, d’opinions, de vie sexuelle ou de données judiciaires.",
      ],
    },
    {
      id: "destinataires",
      title: "Qui y a accès",
      paragraphs: [
        "Le personnel habilité de la boutique, pour la caisse, la préparation et la livraison.",
        "Les prestataires techniques qui hébergent le site et la base de données, uniquement pour faire fonctionner la boutique, et selon les instructions de la boutique.",
        "Google, pour la mesure d’audience, uniquement si la personne a accepté le bandeau. WhatsApp (Meta), lorsqu’un message est échangé sur ce canal. Orange et MTN, comme opérateurs que le client utilise lui-même pour payer : la boutique reçoit la référence, pas l’accès au compte mobile money.",
        "Les autorités, lorsque la loi l’impose. Les données ne sont ni vendues, ni louées, ni cédées à des fichiers publicitaires.",
      ],
    },
    {
      id: "transferts",
      title: "Transferts hors du Cameroun",
      paragraphs: [
        "L’hébergement du site, la mesure d’audience et WhatsApp peuvent traiter des données en dehors du Cameroun. Ces transferts sont limités au fonctionnement de la boutique et à la relation avec le client. Lorsque la loi exige une autorisation préalable de l’Autorité de protection des données, la boutique s’y conforme.",
      ],
    },
    {
      id: "durees",
      title: "Combien de temps",
      paragraphs: [
        "Le compte est conservé jusqu’à la demande de suppression, puis effacé ou anonymisé, sous réserve des pièces qui doivent rester.",
        "Les commandes, tickets et preuves de paiement sont conservés le temps exigé par les obligations comptables et fiscales camerounaises, en pratique dix ans pour les pièces commerciales.",
        "Le panier dure le temps de la visite, jusqu’à ce qu’il soit vidé ou que le cookie expire. Les messages liés à une commande suivent la durée du dossier de commande. Le choix du bandeau est mémorisé six mois. La mesure d’audience, si elle a été acceptée, suit les délais de l’outil.",
      ],
    },
    {
      id: "securite",
      title: "Sécurité",
      paragraphs: [
        "L’accès aux commandes est limité au personnel qui en a besoin. Les mots de passe de compte sont stockés sous forme d’empreinte. Le site est servi en HTTPS. Aucune mesure n’élimine tout risque.",
        "En cas de violation présentant un risque pour les personnes, la boutique en informe l’Autorité de protection des données et, lorsque ce risque l’exige, les personnes concernées.",
      ],
    },
    {
      id: "droits",
      title: "Droits des personnes",
      paragraphs: [
        "La loi n° 2024/017 reconnaît notamment un droit d’accès, de rectification, d’effacement lorsque les conditions sont réunies, d’opposition à la prospection, de limitation et de portabilité.",
        `La demande s’envoie à ${NERA_IDENTITY.email}. La boutique peut demander un élément permettant de vérifier qu’elle s’adresse à la bonne personne, afin de ne pas remettre un dossier à quelqu’un d’autre.`,
        "Une réclamation peut être portée devant l’Autorité de protection des données à caractère personnel prévue par cette loi.",
        "Retirer son accord vaut pour l’avenir. Cela n’efface pas les pièces qu’une obligation légale impose de conserver, ni la licéité de ce qui a déjà été fait sur la base de l’accord alors donné.",
      ],
    },
    {
      id: "mineurs",
      title: "Mineurs",
      paragraphs: [
        "Le site s’adresse aux personnes majeures. Une commande passée pour une personne de moins de 18 ans suppose l’accord de son représentant légal, comme l’exige la loi. La boutique peut annuler la commande si cet accord fait défaut.",
      ],
    },
    {
      id: "prospection",
      title: "Messages commerciaux",
      paragraphs: [
        "La boutique n’écrit pas dans un but publicitaire à une personne qui ne l’a pas contactée. Répondre à une question ou confirmer une commande n’est pas de la prospection.",
        "La personne peut s’opposer à tout message commercial ultérieur en l’écrivant à la boutique. L’opposition est prise en compte pour l’avenir.",
      ],
    },
    {
      id: "maj",
      title: "Mise à jour de cette notice",
      paragraphs: [
        "La notice peut être précisée. La date indiquée en tête de page est celle de la version en vigueur. Elle s’applique aux traitements qui commencent après sa publication.",
      ],
    },
  ];
}
