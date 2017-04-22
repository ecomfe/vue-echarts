var fs = require('fs');
var path = require('path');
var icons = require('../assets/icons.json');

var moduleTpl = fs.readFileSync(path.resolve(__dirname, './icon.tpl'), 'utf8');
var ICON_PATH = path.resolve(__dirname, '../src/icons');

var indexModule = '';
var names = Object.keys(icons);
names.forEach(function (name) {
    var icon = {};
    icon[name] = icons[name];
    fs.writeFileSync(ICON_PATH + '/' + name + '.js', moduleTpl.replace('${icon}', JSON.stringify(icon)));
    indexModule += 'import \'./' + name + '\'\n';
})

fs.writeFileSync(ICON_PATH + '/index.js', indexModule);
console.log(names.length + ' icon modules generated.');
