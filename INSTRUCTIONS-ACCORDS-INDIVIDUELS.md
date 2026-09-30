# Accords individuels et propositions ciblées

## Mise en ligne

1. Décompressez cette archive et copiez son contenu dans le dépôt GitHub du site de paris, aux mêmes emplacements. Remplacez les fichiers correspondants et conservez tous les autres fichiers du dépôt.
2. Ajoutez bien les nouveaux fichiers `server/deals.ts` et `migrations/0006_individual_deals.sql`, ainsi que les tests.
3. Validez les modifications sur la branche connectée au service Render puis déployez le dernier commit.
4. Le démarrage du serveur applique automatiquement la migration 0006 sur votre base Neon existante. N’exécutez aucune remise à zéro. Aucune nouvelle variable d’environnement n’est requise.
5. Rechargez le site ou fermez puis rouvrez l’application installée.

Cette archive est une mise à jour cumulative, pas un dépôt complet. Conservez notamment package.json, pnpm-lock.yaml et les fichiers non fournis. Ne publiez jamais .env.

## Utilisation

Dans le détail d’un pari :
- **Accords acceptés**, en vert : engagements en vigueur, toujours affichés.
- **Proposer un accord** : sélectionnez un ou plusieurs adversaires, puis un montant, un gage, une récompense, un autre enjeu ou « Pour le plaisir ».
- **Tous les adversaires** sélectionne les participants actuels du camp opposé ; cela ne cible pas de futurs participants.
- **En discussion**, en orange : chaque destinataire peut accepter, refuser ou contre-proposer. Une proposition à trois adversaires crée trois discussions indépendantes.
- **Proposer une modification**, sur un accord vert : le même duo discute d’un remplacement. L’accord vert reste valable jusqu’à l’acceptation explicite du destinataire. Un refus ou un retrait laisse l’accord initial intact.

Il existe au plus un accord accepté et une proposition en attente par duo. Une contre-proposition remplace uniquement la discussion en attente de ce duo. Pour regrouper plusieurs gages au sein d’un même duo, décrivez-les ensemble dans un enjeu « Autre ».

Un proposant donne son accord en envoyant son offre. Seul son destinataire peut l’accepter ou la refuser. L’auteur peut retirer une proposition en attente ; un accord déjà accepté ne peut pas être retiré unilatéralement.

Exemple : Ewan–Ben acceptent 100 €, Ewan–Eva acceptent 1000 pompes. Si Ewan perd, les deux engagements s’appliquent. S’il gagne, Ben lui doit 100 € et Eva réalise 1000 pompes. À la clôture, chaque accord indique qui doit l’honorer et envers qui. Une annulation ou un résultat indéterminé ne désigne aucun débiteur.

Le créateur peut lancer le pari lorsqu’il y a deux camps et que chaque participant a au moins un accord accepté, y compris « Pour le plaisir ». Les inscriptions ferment au lancement ; les accords restent négociables jusqu’à la clôture ou la date limite. Les camps restent définitifs.

## Anciens paris

Les enjeux des paris déjà lancés, ainsi que ceux acceptés par tous au moment de la migration, sont conservés dans un bloc **Accord collectif d’origine**, avec les participants concernés. Ils ne sont pas répartis automatiquement en accords individuels : un ancien montant collectif de 100 € ne doit pas devenir plusieurs dettes de 100 €.

Ces accords collectifs restent inchangés ; les nouveaux accords individuels sont supplémentaires. Cette version ne propose pas de remplacement collectif des anciens accords. Les anciennes propositions non acceptées ne deviennent pas des engagements ; l’idée initiale reste disponible pour préparer une nouvelle proposition.

## Vérifications

- TypeScript et compilation de production.
- Tests via HTTP sur PostgreSQL local compatible (PGlite) : destinataires, autorisations, camps fixes, refus/retrait, contre-propositions, remplacement ciblé, transactions, concurrence, reprise après redémarrage et clôture.
- Test de migration avec anciens paris acceptés ou non : conservation des termes sans multiplication des montants.
- Contrôle Chromium de l’interface à 320, 390, 768 et 1280 pixels : accords, discussions, formulaire, sélection multiple et absence de débordement horizontal.

Commandes locales :
`corepack pnpm build`
`corepack pnpm test`

Les tests utilisent une base temporaire isolée. Ils n’accèdent pas à votre base Neon.
