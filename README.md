# Kinleo

A minimal health tracker with a pixel character that reflects your real habits.
Plain HTML, CSS and JS. Open `index.html` with VS Code Live Server.

## Folders

```
index.html          entry point, opens the first page
shared/             used by every page
  theme.css           default style: colours, fonts, phone frame, logo, buttons
  app.js              app name (BRAND), page list and navigation (KinleoApp.go)
pages/              one folder per page
  start/              logo intro, then Get started / log in
  tour/               swipeable feature slides (edit SLIDES in tour.js)
character/          the customisable pixel character (see character/README.md)
```

## Adding a page

1. Copy `pages/start/` to `pages/<name>/` and rename its CSS and JS files.
2. Keep the head and the two shared links:
   `../../shared/theme.css` and `../../shared/app.js`.
3. In `shared/app.js`, set the page in `PAGES` from `null` to its folder name.
4. Link to it with `data-go="<name>"` on any button, or `KinleoApp.go('<name>')`.

Pages not built yet stay `null`; buttons to them show "This page is coming next"
instead of a broken link.

## Renaming the app

The name and tagline shown to users live only in `BRAND` in `shared/app.js`.
Pages use `data-brand-logo` and `data-brand-tagline` instead of typing the name.

## Page flow

start > tour (welcome, workouts, water, steps, meals, progress, plan, character)
> about you > build your character > create account.
"I already have an account" on start goes to log in.
