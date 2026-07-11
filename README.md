# MEISTER — Berliner Kebap · Ivry-sur-Seine

Site vitrine one-page du restaurant **Meister** (86 Bd Paul Vaillant Couturier, 94200 Ivry-sur-Seine).

## Contenu

- **Hero** néon animé (lettres en flicker, halos, ticker jaune)
- **Döner 3D** : décomposition du sandwich couche par couche, pilotée au scroll (CSS 3D + requestAnimationFrame)
- **Menu** : Berliner Kebap, Meister Veggie, Burger Maison, Mini Box & à côtés
- **Contact** : appel direct, SMS, itinéraire Google Maps, carte intégrée, horaires avec statut « Ouvert / Fermé » en temps réel
- 100 % statique, aucune dépendance externe (polices auto-hébergées), optimisé mobile, respecte `prefers-reduced-motion`

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Structure

```
index.html        — page unique
css/style.css     — design & animations
css/fonts.css     — @font-face (Anton, Yellowtail, Inter)
js/main.js        — döner 3D, statut horaires, nav, reveals
assets/fonts/     — polices woff2
assets/photos/    — photos du restaurant
```

## Mettre à jour le menu

Les plats sont dans `index.html`, section `<section class="menu">` — chaque plat est un bloc `<article class="dish">` (titre + ingrédients).
