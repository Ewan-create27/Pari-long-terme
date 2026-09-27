# Pari à Long Terme — Neon + Render gratuit

Cette version remplace la base SQLite sur disque par **PostgreSQL sur Neon**. Elle conserve l’interface française, les cartes compactes, les icônes, les photos d’avatars, la création en quatre étapes, les résultats et l’archivage. **La suppression définitive des paris reste désactivée.**

## Ce que tu vas mettre en place

| Service | Rôle | Offre à sélectionner |
| --- | --- | --- |
| GitHub | Code + déclenchement des rappels | Dépôt privé, offre gratuite et minutes Actions incluses |
| Neon | Paris, participants, historiques, sessions, avatars et clés push | Free |
| Render | Application web et API | Free Web Service, sans disque |

Les photos sont compressées dans le navigateur puis enregistrées dans PostgreSQL, avec une limite de **250 Ko par photo**. Pour une petite bande, cela évite un quatrième service. Elles consomment le quota de stockage Neon ; les anciennes photos sont conservées, donc surveille ce quota si tu les changes souvent.

**Limite choisie pour cette version gratuite : les rappels sont vérifiés environ une fois par heure.** Un rappel prévu à 10 h 30 peut être envoyé à la vérification suivante. GitHub peut également retarder une exécution. Cette version ne promet pas une notification à la minute exacte.

Aucun compte OpenAI ou Cloudflare n’est nécessaire pour faire tourner le projet. Les comptes Neon, GitHub et Render restent les tiens.

## 1 — Créer la base Neon

1. Connecte-toi sur https://console.neon.tech et crée un projet **Free**, par exemple `pari-long-terme`.
2. Choisis une région aussi proche que possible de celle utilisée sur Render.
3. Dans **Connect**, sélectionne la base et le rôle créés par Neon, puis active **Connection pooling**.
4. Copie la chaîne de connexion PostgreSQL. Elle ressemble à :

```text
postgresql://UTILISATEUR:MOT_DE_PASSE@HOTE-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

Garde la vraie valeur privée. Ne la colle pas dans le code ou dans le README. Tu la mettras dans `DATABASE_URL` sur Render.

**Ne crée aucune table à la main.** Les migrations SQL sont appliquées automatiquement au premier démarrage, et les exemples sont ajoutés une seule fois.

Cette installation utilise une **nouvelle base**. Elle ne copie pas les données du site précédent ou d’une installation SQLite existante. Si tu as déjà saisi de vrais paris ailleurs, conserve l’ancien site et sa sauvegarde jusqu’à une migration spécifique.

## 2 — Mettre cette version sur GitHub

1. Décompresse l’archive.
2. Crée un dépôt **privé** sur https://github.com/new, par exemple `pari-long-terme`.
3. Envoie le contenu du dossier `Pari-Neon-Render`, pas le ZIP ni le dossier parent.
4. Vérifie que `package.json`, `pnpm-lock.yaml` et `render.yaml` sont à la racine.
5. Vérifie surtout que le fichier **`.github/workflows/rappels.yml`** est présent : il déclenche les rappels.

Le dossier `.github` peut être caché par ton explorateur. Git est la manière la plus fiable d’envoyer tous les fichiers. Depuis un terminal ouvert dans le dossier décompressé, pour un dépôt GitHub vide :

```sh
git init
git add .
git commit -m "Pari à Long Terme avec Neon et Render gratuit"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/pari-long-terme.git
git push -u origin main
```

Remplace `TON-COMPTE` et éventuellement le nom du dépôt. Si tu avais déjà envoyé l’ancienne archive, remplace ses fichiers par ceux de cette version dans ton dépôt : ne mélange pas les dossiers `server`, `lib` et `app/api` des deux versions. Les anciens dossiers `drizzle` et scripts SQLite ne sont plus utilisés.

N’envoie jamais `.env`, les sauvegardes ou `node_modules`. Le `.gitignore` fourni les exclut ; `.env.example` contient seulement des exemples et doit rester dans le dépôt.

## 3 — Déployer sur Render gratuit

1. Sur https://dashboard.render.com, choisis **New → Blueprint**.
2. Connecte ton compte GitHub et sélectionne le dépôt, branche `main`.
3. Render lit `render.yaml`. Vérifie : **Web Service, plan Free, aucun disque**.
4. Renseigne les deux valeurs demandées :
   - **DATABASE_URL** : la vraie chaîne de connexion copiée depuis Neon.
   - **ADMIN_PASSWORD** : le mot de passe partagé du groupe, entre 12 et 256 caractères.
5. Lance **Deploy Blueprint** et attends que le service soit disponible.
6. Ouvre son URL HTTPS, puis connecte-toi avec le mot de passe du groupe.

Le serveur crée automatiquement le schéma et les exemples. Les secrets `SESSION_SECRET` et `CRON_SECRET` sont générés par Render. Les clés Web Push sont générées dans Neon et réutilisées après chaque redémarrage.

Tous les membres du groupe ont les mêmes droits de gestion. Le choix d’un personnage dans Profil sert aux statistiques ; ce n’est pas un compte individuel.

### Alternative : création manuelle du Web Service

| Réglage | Valeur |
| --- | --- |
| Runtime | Node |
| Instance | Free |
| Branche | main |
| Root directory | vide si package.json est à la racine |
| Build command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build` |
| Start command | `pnpm start` |
| Health check | `/healthz` |
| Disque persistant | aucun |

Variables :

| Variable | Valeur |
| --- | --- |
| NODE_VERSION | `24` |
| NODE_ENV | `production` |
| DATABASE_URL | chaîne Neon privée |
| ADMIN_PASSWORD | mot de passe du groupe |
| SESSION_SECRET | secret aléatoire de 32 caractères minimum |
| CRON_SECRET | autre secret aléatoire de 32 caractères minimum |
| SEED_DEMO | `true` (ou `false` avant le tout premier démarrage pour une base sans exemples) |

Pour générer un secret avec Node installé :

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Lance cette commande deux fois pour deux secrets différents. Ne définis pas `DATA_DIR`, et ne conserve pas l’ancien `SCHEDULER_ENABLED` : ils ne sont plus utilisés.

## 4 — Activer les rappels GitHub Actions

Cette étape est nécessaire pour recevoir les rappels quand personne ne visite le site.

1. Dans Render → ton service → **Environment**, affiche et copie la valeur de **CRON_SECRET**. Ne la publie pas.
2. Dans GitHub → ton dépôt → **Settings → Secrets and variables → Actions → New repository secret**, ajoute :

| Nom du secret GitHub | Valeur |
| --- | --- |
| APP_URL | l’URL HTTPS Render de ton application, par exemple `https://TON-SERVICE.onrender.com`, sans chemin |
| CRON_SECRET | exactement la même valeur que dans Render |

3. Va dans l’onglet **Actions** du dépôt. Active les workflows s’ils ne le sont pas déjà.
4. Choisis **Vérifier les rappels → Run workflow → main → Run workflow**.
5. Vérifie que l’exécution se termine en vert. Recharge l’application : Profil doit afficher **Vérification horaire active**.

Le workflow s’exécute à la minute 17 de chaque heure UTC. Il commence par réveiller Render, avec un délai adapté au démarrage à froid, puis appelle `POST /api/cron` avec le secret. Aucune page n’a besoin de rester ouverte. Le workflow n’utilise pas de minuterie sur ton téléphone.

La fréquence horaire laisse Render et Neon retourner en veille. **Ne la remplace pas par une vérification toutes les minutes** sans examiner les quotas : cela pourrait garder Neon actif et épuiser son calcul gratuit. Le health check `/healthz` n’interroge pas la base.

Les exécutions programmées utilisent le workflow de la branche par défaut. Sur un dépôt public, GitHub peut désactiver la programmation après 60 jours sans activité ; cette raison s’ajoute à la recommandation d’un dépôt privé. Les minutes Actions gratuites d’un dépôt privé sont partagées avec tes autres projets : surveille leur consommation et configure les limites de dépenses de ton compte.

Si tu changes `CRON_SECRET` sur Render, mets immédiatement à jour celui de GitHub. Aucun `DATABASE_URL` ni mot de passe du groupe n’est nécessaire dans GitHub Actions.

## 5 — Activer les notifications sur les téléphones

1. Ouvre l’URL HTTPS et connecte-toi.
2. Installe la PWA si tu le souhaites. Sur iPhone/iPad compatible Web Push : Safari → Partager → **Sur l’écran d’accueil**, puis ouvre l’application depuis cette icône.
3. Dans **Profil**, clique sur **Activer** et accepte les notifications.
4. Fais cela sur chaque appareil qui doit recevoir les rappels. Tous les appareils abonnés à cet espace reçoivent les rappels du groupe.

### Faire un vrai test

- Crée un pari réel avec un rappel dans quelques minutes (les exemples de démonstration n’envoient pas de push).
- Attends que l’heure du rappel soit passée et ferme la page.
- Dans GitHub, lance **Run workflow** manuellement pour vérifier sans attendre l’heure suivante.
- Vérifie la notification sur ton téléphone et l’événement ajouté dans l’historique du pari.

Les notifications dépendent du navigateur, de la connexion et des réglages du téléphone. Leur contenu peut apparaître sur l’écran verrouillé. Une réponse réussie d’un fournisseur push ne garantit pas que le téléphone l’a affichée.

Les échéances et tentatives sont enregistrées dans Neon. Après une interruption, le prochain passage traite les rappels échus. Pour les rappels réguliers, les occurrences manquées sont regroupées en une seule notification, puis la date suivante est calculée. Les fuseaux IANA et les changements d’heure sont conservés.

Un rappel sans appareil abonné est consigné dans l’historique sans être renvoyé rétroactivement. Les rappels s’arrêtent à la clôture ou à l’archivage. Après restauration d’un pari archivé, il faut reprogrammer ses rappels.

Pour limiter la durée d’une exécution, le serveur traite au maximum 30 rappels par passage et conserve les envois partiels pour une reprise. Les erreurs temporaires sont réessayées à un passage ultérieur. Un doublon reste possible si le serveur s’arrête après l’envoi mais avant son enregistrement ; un identifiant de notification stable limite leur affichage en double.

## 6 — Ce que « gratuit » implique

- **Neon Free** : quotas de stockage, calcul et transfert. Les avatars et historiques font partie du stockage. Consulte les limites actuelles dans ton tableau de bord ; les offres peuvent évoluer.
- **Render Free** : mise en veille après 15 minutes sans trafic ; la première visite peut prendre environ une minute. Les quotas gratuits de ton compte s’appliquent aussi.
- **GitHub Actions** : minutes incluses sur les dépôts privés, partagées avec tes autres workflows. Les horaires peuvent être retardés, voire une exécution manquée en cas de forte charge.

Le projet vise un usage gratuit de petit groupe, pas une garantie de coût nul ou de disponibilité pendant plusieurs années. Reste sur les offres gratuites, surveille les quotas et les budgets, et garde des sauvegardes indépendantes. Sans activité récente du planificateur, Profil le signale après 90 minutes.

## 7 — Modifier et mettre à jour

Modifie le code puis pousse sur `main`. Avec le déploiement automatique activé, Render reconstruit le projet. Les données restent dans Neon : aucun fichier utilisateur ne dépend du disque local Render.

Ne supprime pas le projet/la branche Neon et ne remplace pas `DATABASE_URL` sans vérifier où sont tes données. Changer de base équivaut à ouvrir un nouvel espace.

Pour un domaine personnalisé, configure-le dans Render, ajoute `APP_URL=https://ton-domaine.example` à ses variables, puis mets à jour le secret GitHub `APP_URL`. Ouvre ensuite l’application sur cette origine et réactive les notifications. Sans domaine personnalisé, laisse Render fournir son URL automatiquement.

## 8 — Sauvegarder et restaurer

La base contient **tout** : paris, participants, images, sessions, clés push. Une sauvegarde complète est privée et ne doit jamais être déposée sur GitHub.

Pour sauvegarder depuis ton ordinateur :

1. Installe les outils clients PostgreSQL (`pg_dump`, version compatible avec le serveur Neon, identique ou supérieure).
2. Dans Neon → Connect, désactive temporairement le pooling dans la fenêtre de connexion et copie l’URL **directe** dans ton `.env` local. Cela ne change pas `DATABASE_URL` sur Render.
3. Après installation des dépendances locales, lance :

```sh
pnpm backup
```

Un fichier horodaté `.dump` est créé dans `backups/`. Il comprend les images et les clés. Garde une copie sûre sur un autre support et teste la restauration. Le script ne met pas en place de sauvegarde externe automatique.

Pour restaurer, utilise `pg_restore` vers une **nouvelle base vide**, avec la connexion directe et un rôle propriétaire, par exemple :

```sh
pg_restore --no-owner --no-acl --exit-on-error --dbname="CONNEXION_DIRECTE_NOUVELLE_BASE" backups/NOM_DU_FICHIER.dump
```

Cette commande est un exemple : ne publie pas l’URL réelle ni son mot de passe, et évite de la laisser dans un historique de commandes partagé. Vérifie la restauration avant de connecter Render à cette nouvelle base. Ne lance pas la restauration dans une base déjà utilisée. Conserve les clés push restaurées ; si elles sont remplacées, les appareils doivent se réabonner.

## 9 — Lancer sur ton ordinateur

Installe Node.js **24**. Depuis le dossier du projet :

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
```

Sous Windows PowerShell : `Copy-Item .env.example .env` remplace la dernière commande.

Renseigne une base Neon dédiée au développement dans `.env`, ainsi que le mot de passe et les deux secrets. N’utilise pas ta base réelle pour tes essais. Garde `APP_URL=http://localhost:3000`.

```sh
pnpm build
pnpm start
```

Ouvre http://localhost:3000. Pour développer l’interface : `pnpm dev` utilise http://localhost:5173 et l’API sur le port 3001. Relance cette commande après une modification du code serveur.

Aucun planificateur ne tourne automatiquement en local. Les rappels peuvent être traités en appelant `POST /api/cron` avec `Authorization: Bearer CRON_SECRET`, ou sur le site Render via GitHub Actions.

## 10 — Code et tests

| Chemin | Contenu |
| --- | --- |
| `app/page.tsx`, `app/globals.css` | Interface et styles |
| `client.tsx` | Connexion et démarrage React |
| `app/api/data/route.ts` | Création, archivage, résultats, participants |
| `app/api/avatar/route.ts` | Import et lecture des photos privées |
| `app/api/cron/route.ts` | Traitement sécurisé des rappels |
| `lib/` | Modèle, récurrences, Web Push |
| `server/` | Serveur HTTP, sessions et adaptateur PostgreSQL |
| `migrations/` | Schéma PostgreSQL, initialisation automatique |
| `.github/workflows/rappels.yml` | Vérification horaire externe |
| `render.yaml` | Déploiement Render Free |

```sh
pnpm typecheck
pnpm build
pnpm test
```

Les tests utilisent un moteur PostgreSQL embarqué **PGlite via son protocole réseau**, avec le même pilote `pg` que l’application. Ils n’utilisent pas tes identifiants Neon. Ils vérifient les migrations, les transactions, les sessions, les avatars, la persistance après redémarrage de l’application, l’archivage/restauration, les résultats et le déclenchement externe des rappels.

PGlite est uniquement une dépendance de test. Il ne remplace pas Neon en production et ne valide pas le réseau/TLS de ton compte Neon. La réception réelle d’une notification et le déploiement dans tes comptes restent à vérifier en suivant les étapes ci-dessus.

## Dépannage rapide

- **Le déploiement échoue** : vérifie DATABASE_URL, le mot de passe et les secrets. Le serveur requiert une connexion TLS vérifiée vers Neon.
- **Écran d’attente Render** : c’est le réveil du service gratuit ; patiente.
- **Aucune vérification automatique récente** : vérifie le workflow GitHub, sa présence sur `main`, les deux secrets, son activation et les quotas. Lance-le manuellement.
- **Erreur 401 dans Actions** : CRON_SECRET diffère entre GitHub et Render.
- **Erreur 403 dans l’application** : vérifie l’origine APP_URL, particulièrement avec un domaine personnalisé.
- **Les anciennes données n’apparaissent pas** : cette installation est indépendante ; vérifie que tu utilises la bonne base Neon.
- **Neon atteint sa limite** : regarde le stockage des avatars et l’usage du calcul. Ne règle pas le workflow sur une minute pour essayer de résoudre un retard.
- **Le workflow n’apparaît pas** : le dossier caché `.github` n’a probablement pas été envoyé dans GitHub.

## Références officielles

- Neon et Node.js : https://neon.com/docs/guides/node
- Offre Neon : https://neon.com/pricing
- Render gratuit : https://render.com/docs/free
- Blueprint Render : https://render.com/docs/infrastructure-as-code
- Planification GitHub : https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- Quotas GitHub Actions : https://docs.github.com/en/billing/concepts/product-billing/github-actions
- PostgreSQL pg_dump : https://www.postgresql.org/docs/current/app-pgdump.html
