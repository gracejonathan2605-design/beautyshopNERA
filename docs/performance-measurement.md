# Mesurer le catalogue et l’expérience mobile

Ne pas ajouter d’index ni modifier la recherche avant d’avoir enregistré un résultat de référence. Effectuer les mesures sur un environnement de préproduction représentatif, pas sur une base de production.

## Catalogue et recherche

Le script chronomètre la requête réelle de catalogue/recherche, de la requête HTTP applicative jusqu’au résultat paginé. Il ne modifie pas les données et ne journalise pas les termes saisis.

```bash
PERF_ALLOW_READONLY_DB=true \
PERF_ITERATIONS=7 \
npx tsx scripts/measure-catalog.ts
```

Avant le lancement, vérifier que `DATABASE_URL` pointe bien vers la base de préproduction. Par défaut, le script mesure la première page et trois recherches synthétiques (`mèche`, `meche`, `perruque`). Des termes génériques peuvent être remplacés par `PERF_SEARCH_TERMS`, séparés par des virgules. Le résultat JSON fournit le nombre de résultats et les latences p50/p95; conserver le commit, la date et l’environnement avec les résultats. Ne pas comparer des mesures prises sur des catalogues ou des bases de données différents.

Ce relevé mesure le temps observable depuis l’application, pas un plan SQL. Pour déterminer si un index est nécessaire, utiliser ensuite `EXPLAIN (ANALYZE, BUFFERS)` sur les requêtes candidates dans une base de préproduction avec des données représentatives.

## Parcours mobile

Le bac à sable de développement ne dispose pas de DNS/accès au site public et ne contient pas de base de données configurée : aucun score de production ni temps SQL réel n’est donc affirmé ici.

Sur une préproduction accessible, réaliser trois audits Lighthouse en profil mobile, sans soumettre de commande ni déclencher de paiement, pour `/`, `/boutique`, une catégorie, une fiche produit et `/panier`. Garder identiques le navigateur, le profil réseau/CPU et l’état du cache; noter le commit et retenir la médiane des trois mesures pour :

- LCP, INP et CLS (Core Web Vitals);
- TTFB et durée de chargement;
- poids transféré JavaScript et images;
- erreurs réseau ou console.

Répéter séparément en cache froid et cache chaud. Comparer les résultats entre versions avant toute optimisation, puis refaire exactement le même protocole.
