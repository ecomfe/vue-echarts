var fs = require('fs');
var path = require('path');

var fa2svg = require('font-awesome-svg');
var svgDir = path.resolve(__dirname, '../assets/svg');
fa2svg(svgDir);

var icons = {};
fs.readdirSync(svgDir).forEach(function (file) {
    var svg = fs.readFileSync(path.resolve(svgDir, file), 'utf8');
    var sizeMatch = svg.match(/ viewBox="0 0 (\d+) (\d+)"/);
    var dMatch = svg.match(/ d="([^"]+)"/);
    if (!sizeMatch || !dMatch) {
        return;
    }
    var icon = {};
    var name = file.replace(/^fa-/, '').replace(/\.svg$/, '');
    icons[name] = {
        width: parseInt(sizeMatch[1], 10),
        height: parseInt(sizeMatch[2], 10),
        paths: [{
            d: dMatch[1]
        }]
    };
});

fs.writeFileSync(path.resolve(__dirname, '../assets/icons.json'), JSON.stringify(icons, null, '  '));
