# Dream Up Design — résumé (2026-03-22)

**Périmètre choisi (vélocité) :** deux écrans déjà spécifiés [P] — **Landing** + **Création d’événement** — plutôt que les 6 pages du scénario 01 en une passe.

## Livrables

| Écran | Fichier | Statut |
|-------|---------|--------|
| Landing marketing | `html-prototypes/01-landing.html` | Maquette HTML autonome |
| Nouvel événement | `html-prototypes/02-event-create.html` | Maquette + JS léger (modale publish, toggles) |

## Décisions prises en Dream (sans revalidation étape par étape)

1. **Landing** : header minimal (logo + connexion), pas d’`AppShell` club — conforme Open Questions spec.  
2. **Landing** : CTA sticky mobile après ~35 % scroll — conforme spec optionnelle.  
3. **Événement** : carte factice (dégradé + pin CSS) jusqu’à choix fournisseur carto.  
4. **Événement** : mobile — carte au-dessus du formulaire quand la carte est activée (`order` + `display: contents`).  
5. **Événement** : desktop — grille 2 colonnes, carte sticky à droite.  
6. **Événement** : segment Brouillon / Publié + `Enregistrer` + `<dialog>` natif pour confirmation publication MVP.  
7. **Composants extraits (logique)** : boutons primaire / ghost, cartes pilier, champs formulaire — à formaliser plus tard dans `D-Design-System` si besoin.

## Non réalisé dans cette passe Dream

- Pages 01.2–01.6, 02.2–02.6 (sign-up, directory, etc.)  
- Intégration React / Nx  
- Images OG / sketch JPG réels  

## Revue utilisateur

À ajuster librement : copies, espacements, seuil sticky, comportement après « Publier » (toast vs alert).

---

_WDS workflow-dream.md — exécution autonome_
