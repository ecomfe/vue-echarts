npm run build
cp -r ./src/* .
rm index.js
npm publish
rm -rf ./components
