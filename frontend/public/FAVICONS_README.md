# Favicons

This folder contains the SVG canonical favicon used by the app. For best results (Google Search, SERP, older browsers and PWA/homescreen icons) you should provide PNG fallbacks and a multi-size ICO.

Commands to generate the recommended files locally (ImageMagick / rsvg-convert):

- Using ImageMagick (recommended when installed):

```bash
# generate PNG fallbacks
convert frontend/public/favicon.svg -background none -resize 192x192 frontend/public/favicon-192.png
convert frontend/public/favicon.svg -background none -resize 48x48 frontend/public/favicon-48.png

# regenerate a multi-size ICO (16/32/48/128/256)
convert frontend/public/favicon.svg -define icon:auto-resize=256,128,64,48,32,16 frontend/public/favicon.ico
```

- Using rsvg-convert (if imagemagick not available):

```bash
rsvg-convert -w 192 -h 192 -o frontend/public/favicon-192.png frontend/public/favicon.svg
rsvg-convert -w 48 -h 48 -o frontend/public/favicon-48.png frontend/public/favicon.svg
```

After generating the PNG/ICO files, run the Angular build and verify the files are present in the build output (assets):

```bash
cd frontend
npm run build
# check for the files under the output path (configured to ../backend/src/main/resources/static)
ls ../backend/src/main/resources/static/favicon*
```
