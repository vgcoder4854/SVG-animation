/* ============================================================
   Construction Diorama — animated isometric construction scene
   ------------------------------------------------------------
   A single continuous 15s time-lapse: empty plot -> surveyed
   site -> foundation -> structure -> walls -> roof -> finishes
   -> landscaping -> furnished interior -> handover.
   Pure SVG + JS parametric timeline. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     Isometric projection (shared scene coordinate system)
     World: x -> screen down-right, y -> screen down-left, z up
     --------------------------------------------------------- */
  var S = 26,                       // px per world unit
      C = 0.8660254,                // cos 30°
      N = 0.5,                      // sin 30°
      OX = 600, OY = 150;           // screen origin

  function X(x, y, z) { return (x - y) * C * S + OX; }
  function Y(x, y, z) { return (x + y) * N * S - (z || 0) * S + OY; }
  function PT(x, y, z) { return X(x, y, z).toFixed(1) + ',' + Y(x, y, z).toFixed(1); }

  function poly(pts, fill, extra) {
    var s = pts.map(function (p) { return PT(p[0], p[1], p[2]); }).join(' ');
    return '<polygon points="' + s + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  // Vertical box: top face, left (+y) face, right (+x) face
  function box(x, y, z, w, d, h, ct, cl, cr, extra) {
    return poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], cl, extra)
         + poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], cr, extra)
         + poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], ct, extra);
  }
  // Rectangle on a vertical plane at fixed y (front/back walls)
  function planeY(y, x0, x1, z0, z1, fill, extra) {
    return poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, extra);
  }
  // Rectangle on a vertical plane at fixed x (side walls)
  function planeX(x, y0, y1, z0, z1, fill, extra) {
    return poly([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], fill, extra);
  }
  // Local-space variants (no scene origin) for elements positioned by a
  // parent transform, e.g. crates carried by the waypoint mover.
  function PTl(x, y, z) { return ((x - y) * C * S).toFixed(1) + ',' + ((x + y) * N * S - (z || 0) * S).toFixed(1); }
  function polyl(pts, fill, extra) {
    var s = pts.map(function (p) { return PTl(p[0], p[1], p[2]); }).join(' ');
    return '<polygon points="' + s + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function boxL(x, y, z, w, d, h, ct, cl, cr) {
    return polyl([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], cl)
         + polyl([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], cr)
         + polyl([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], ct);
  }
  function line(x0, y0, z0, x1, y1, z1, stroke, w, extra) {
    return '<line x1="' + X(x0, y0, z0).toFixed(1) + '" y1="' + Y(x0, y0, z0).toFixed(1) +
           '" x2="' + X(x1, y1, z1).toFixed(1) + '" y2="' + Y(x1, y1, z1).toFixed(1) +
           '" stroke="' + stroke + '" stroke-width="' + w + '"' + (extra ? ' ' + extra : '') + '/>';
  }

  /* ---------------------------------------------------------
     Palette
     --------------------------------------------------------- */
  var PAL = {
    grass: '#b9cda6', grassDark: '#a9bf95', soil: '#c8b28a', dig: '#b79c78', digDeep: '#a58a66',
    concreteT: '#ddd7c9', concreteL: '#d2ccbe', concreteR: '#c6c0b2',
    brickT: '#c38758', brickL: '#b5764a', brickR: '#a5673d',
    paintT: '#f7f1e2', paintL: '#f2ead9', paintR: '#e7dcc4',
    roof: '#bd6b52', roofDark: '#a5583f', ridge: '#8f4a38',
    wood: '#a97c50', woodL: '#b98f5e', woodT: '#c9a06c',
    glass: '#b9d9de', frame: '#f7f2e6', door: '#7a5a3e',
    road: '#8d8578', dash: '#efe9db', path: '#ded5c2'
  };

  /* ---------------------------------------------------------
     Reusable element builders
     --------------------------------------------------------- */
  function tree(x, y, s, delay) {
    return '<g transform="translate(' + X(x, y).toFixed(1) + ',' + Y(x, y).toFixed(1) + ') scale(' + s + ')">'
      + '<ellipse cx="0" cy="1" rx="17" ry="6" fill="rgba(70,80,60,.15)"/>'
      + '<rect x="-3.4" y="-34" width="6.8" height="34" rx="3" fill="#8a6a4a"/>'
      + '<g class="treeTop" style="animation-delay:' + delay + 's">'
      + '<circle cx="0" cy="-50" r="21" fill="#8fae94"/>'
      + '<circle cx="-15" cy="-37" r="15" fill="#7fa079"/>'
      + '<circle cx="14" cy="-38" r="16" fill="#9dbd9f"/>'
      + '<circle cx="0" cy="-61" r="13" fill="#a7c4a8"/>'
      + '</g></g>';
  }

  function bush(x, y, s, id) {
    return '<g transform="translate(' + X(x, y).toFixed(1) + ',' + Y(x, y).toFixed(1) + ') scale(' + s + ')">'
      + '<g id="' + id + '" class="anim-pop" style="opacity:0">'
      + '<ellipse cx="0" cy="1" rx="15" ry="5" fill="rgba(70,80,60,.14)"/>'
      + '<circle cx="-8" cy="-8" r="9" fill="#7fa079"/>'
      + '<circle cx="7" cy="-10" r="11" fill="#8fae94"/>'
      + '<circle cx="0" cy="-15" r="8" fill="#9dbd9f"/>'
      + '<circle cx="-3" cy="-10" r="2.2" fill="#e8a0a0"/><circle cx="6" cy="-14" r="2" fill="#f2d8a0"/><circle cx="9" cy="-7" r="1.8" fill="#e8a0a0"/>'
      + '</g></g>';
  }

  function cloud(x, y, s, dur, delay) {
    return '<g class="cloud" style="animation-duration:' + dur + 's;animation-delay:' + delay + 's">'
      + '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')" opacity=".8">'
      + '<ellipse cx="0" cy="0" rx="34" ry="12" fill="#ffffff"/>'
      + '<ellipse cx="23" cy="4" rx="24" ry="9" fill="#ffffff"/>'
      + '<ellipse cx="-22" cy="5" rx="20" ry="8" fill="#ffffff"/>'
      + '</g></g>';
  }

  function worker(id, skin, shirt, helmet, carryContent) {
    return '<g id="' + id + '" class="worker" style="opacity:0">'
      + '<ellipse cx="0" cy="0" rx="10" ry="4" fill="rgba(70,80,60,.20)"/>'
      + '<g class="flip"><g class="wbody">'
      + '<rect class="leg legL" x="-4.6" y="-15" width="4" height="15" rx="2" fill="#4a505c"/>'
      + '<rect class="leg legR" x="0.6" y="-15" width="4" height="15" rx="2" fill="#3b414c"/>'
      + '<rect x="-7" y="-33" width="14" height="19" rx="5" fill="' + shirt + '"/>'
      + '<rect x="-7" y="-28.6" width="14" height="3.2" fill="rgba(255,255,255,.35)"/>'
      + '<circle cx="0" cy="-39" r="5.8" fill="' + skin + '"/>'
      + '<path d="M-6.4 -39 A6.4 6.4 0 0 1 6.4 -39 Z" fill="' + helmet + '"/>'
      + '<rect x="-7.4" y="-40.4" width="14.8" height="2.6" rx="1.3" fill="' + helmet + '"/>'
      + '<g class="carry" opacity="0">' + carryContent + '</g>'
      + '</g></g></g>';
  }

  // family members (no helmets, hair instead, scalable for the child)
  function person(id, skin, shirt, pants, hair, scale) {
    return '<g id="' + id + '" class="worker" style="opacity:0">'
      + '<ellipse cx="0" cy="0" rx="9" ry="3.6" fill="rgba(70,80,60,.20)"/>'
      + '<g class="flip"><g class="wbody"><g transform="scale(' + scale + ')">'
      + '<rect class="leg legL" x="-4.6" y="-15" width="4" height="15" rx="2" fill="' + pants + '"/>'
      + '<rect class="leg legR" x="0.6" y="-15" width="4" height="15" rx="2" fill="' + pants + '"/>'
      + '<rect x="-7" y="-33" width="14" height="19" rx="5" fill="' + shirt + '"/>'
      + '<circle cx="0" cy="-39" r="5.8" fill="' + skin + '"/>'
      + '<path d="M-6.3 -38.6 A6.3 6.3 0 0 1 6.3 -38.6 L6.3 -36.6 L-6.3 -36.6 Z" fill="' + hair + '"/>'
      + '</g></g></g></g>';
  }

  var CARRY_BRICKS = '<rect x="-9" y="-36" width="18" height="11" rx="2" fill="' + PAL.brickL + '" stroke="#8a5636" stroke-width="1.2"/>'
    + '<line x1="-9" y1="-32.5" x2="9" y2="-32.5" stroke="' + PAL.brickR + '" stroke-width="1.2"/>'
    + '<line x1="-9" y1="-29.5" x2="9" y2="-29.5" stroke="' + PAL.brickR + '" stroke-width="1.2"/>';
  var CARRY_PLAN = '<rect x="3" y="-37" width="15" height="10" rx="1.5" fill="#f7f2e6" stroke="#c9bfa8" stroke-width="1"/>'
    + '<line x1="6" y1="-33.8" x2="15" y2="-33.8" stroke="#7d9cbd" stroke-width="1.2"/>'
    + '<line x1="6" y1="-30.8" x2="12" y2="-30.8" stroke="#7d9cbd" stroke-width="1.2"/>';
  var CARRY_CRATE = '<rect x="-10" y="-38" width="20" height="13" rx="2" fill="' + PAL.woodL + '"/>'
    + '<line x1="-10" y1="-31.5" x2="10" y2="-31.5" stroke="' + PAL.wood + '" stroke-width="1.4"/>'
    + '<line x1="0" y1="-38" x2="0" y2="-25" stroke="' + PAL.wood + '" stroke-width="1.4"/>';

  /* ---------------------------------------------------------
     House geometry (footprint x 9..17, y 4..10, walls z .35..3)
     --------------------------------------------------------- */
  var BRICK = [PAL.brickT, PAL.brickL, PAL.brickR];
  var PAINT = [PAL.paintT, PAL.paintL, PAL.paintR];

  function wallBox(kind) {
    var c = kind === 'paint' ? PAINT : BRICK;
    return {
      back:  function () { return box(9, 4, 0.35, 8, 0.4, 2.65, c[0], c[1], c[2]); },
      left:  function () { return box(9, 4.4, 0.35, 0.4, 5.2, 2.65, c[0], c[1], c[2]); },
      front: function () { return box(9, 9.6, 0.35, 8, 0.4, 2.65, c[0], c[1], c[2]); },
      right: function () { return box(16.6, 4.4, 0.35, 0.4, 5.2, 2.65, c[0], c[1], c[2]); }
    };
  }
  var wbBrick = wallBox('brick'), wbPaint = wallBox('paint');

  function windowFront(id, x0, x1) {
    return '<g id="' + id + '" class="anim-popc" style="opacity:0">'
      + planeY(10.012, x0 - 0.09, x1 + 0.09, 1.04, 2.56, PAL.frame)
      + planeY(10.02, x0, x1, 1.13, 2.47, PAL.glass)
      + planeY(10.03, (x0 + x1) / 2 - 0.035, (x0 + x1) / 2 + 0.035, 1.13, 2.47, PAL.frame)
      + planeY(10.03, x0, x1, 1.76, 1.83, PAL.frame)
      + planeY(10.035, x0 + 0.08, (x0 + x1) / 2 - 0.12, 2.28, 2.42, 'rgba(255,255,255,.5)')
      + '</g>';
  }

  /* ---------------------------------------------------------
     Build the full SVG scene (painter's order: back -> front)
     --------------------------------------------------------- */
  function buildSVG() {
    var m = [];
    m.push('<svg viewBox="0 0 1380 830" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated isometric construction site time-lapse">');

    m.push('<defs>'
      + '<radialGradient id="csGlow" cx="50%" cy="50%" r="50%">'
      + '<stop offset="0%" stop-color="#ffd98a" stop-opacity=".9"/>'
      + '<stop offset="100%" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>'
      + '<filter id="csBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>'
      + '</defs>');

    /* --- sky décor --- */
    m.push('<circle cx="180" cy="110" r="95" fill="url(#csGlow)" opacity=".55"/>');
    m.push('<circle cx="180" cy="110" r="42" fill="#fbe6b0"/>');
    m.push(cloud(0, 92, 1.0, 95, -12));
    m.push(cloud(0, 150, 0.7, 70, -45));

    /* --- ground --- */
    m.push(poly([[-5, -4], [31, -4], [31, 23.5], [-5, 23.5]], '#f0e9da'));
    m.push('<ellipse cx="' + X(13, 11).toFixed(0) + '" cy="' + (Y(13, 11) + 60).toFixed(0) + '" rx="560" ry="150" fill="#e9dfc9" opacity=".45"/>');
    m.push(poly([[0, 0], [26, 0], [26, 18], [0, 18]], PAL.grass, 'stroke="' + PAL.grassDark + '" stroke-width="1.5"'));
    // subtle grass patches
    m.push(poly([[2, 3], [6, 2.4], [7.4, 4.4], [3.2, 5.2]], PAL.grassDark, 'opacity=".35"'));
    m.push(poly([[20, 13], [24, 12.4], [25, 14.8], [21.2, 15.6]], PAL.grassDark, 'opacity=".3"'));
    m.push(poly([[3, 14.5], [6.4, 14], [7, 16.2], [3.8, 16.8]], PAL.grassDark, 'opacity=".28"'));

    /* --- road --- */
    m.push(poly([[-5, 18.7], [31, 18.7], [31, 22], [-5, 22]], PAL.road));
    m.push(line(-5, 18.7, 0, 31, 18.7, 0, '#7a7368', 2));
    var dashes = '';
    for (var dx = -3; dx < 30; dx += 3.2) dashes += poly([[dx, 20.28], [dx + 1.5, 20.28], [dx + 1.5, 20.5], [dx, 20.5]], PAL.dash, 'opacity=".75"');
    m.push(dashes);

    /* --- driveway (appears during landscaping) --- */
    m.push('<g id="drivewayG" style="opacity:0">'
      + poly([[12.5, 10.32], [14, 10.32], [14.7, 18.7], [11.8, 18.7]], PAL.path)
      + line(12.1, 13, 0.01, 14.3, 13, 0.01, '#c9bfa8', 1.4)
      + line(12.0, 15.6, 0.01, 14.5, 15.6, 0.01, '#c9bfa8', 1.4)
      + '</g>');

    /* --- car parking pad (paved during the finale) --- */
    m.push('<g id="padG" style="opacity:0">'
      + poly([[15.4, 11.6], [20.0, 11.6], [20.0, 15.0], [15.4, 15.0]], '#ded5c2')
      + line(15.62, 11.85, 0.01, 19.88, 11.85, 0.01, '#f7f2e6', 1.8)
      + line(15.62, 14.75, 0.01, 19.88, 14.75, 0.01, '#f7f2e6', 1.8)
      + line(15.68, 11.85, 0.01, 15.68, 14.75, 0.01, '#f7f2e6', 1.8)
      + line(19.82, 11.85, 0.01, 19.82, 14.75, 0.01, '#f7f2e6', 1.8)
      + box(16.7, 11.75, 0, 1.3, 0.28, 0.14, PAL.concreteT, PAL.concreteL, PAL.concreteR)
      + '</g>');

    /* --- site sign --- */
    m.push('<g transform="translate(' + X(5.2, 17.3).toFixed(1) + ',' + Y(5.2, 17.3).toFixed(1) + ')">'
      + '<g id="siteSign" class="anim-pop" style="opacity:0">'
      + '<ellipse cx="0" cy="1" rx="12" ry="4" fill="rgba(70,80,60,.15)"/>'
      + '<rect x="-2" y="-30" width="4" height="30" fill="#8a6a4a"/>'
      + '<rect x="-20" y="-56" width="40" height="28" rx="3" fill="#fffdf8" stroke="#c9bfa8" stroke-width="1.5"/>'
      + '<rect x="-15" y="-50" width="12" height="10" rx="1.5" fill="' + PAL.roof + '"/>'
      + '<line x1="1" y1="-48" x2="15" y2="-48" stroke="#b9ab90" stroke-width="2.4"/>'
      + '<line x1="1" y1="-43" x2="15" y2="-43" stroke="#b9ab90" stroke-width="2.4"/>'
      + '<line x1="-15" y1="-35" x2="15" y2="-35" stroke="#d8cdb4" stroke-width="2.4"/>'
      + '</g></g>');

    /* --- survey stakes + string lines --- */
    var stakes = '<g id="stakesG" style="opacity:0">'
      + line(8.7, 3.7, 0.12, 17.3, 3.7, 0.12, '#f3ead6', 1.3)
      + line(17.3, 3.7, 0.12, 17.3, 10.3, 0.12, '#f3ead6', 1.3)
      + line(17.3, 10.3, 0.12, 8.7, 10.3, 0.12, '#f3ead6', 1.3)
      + line(8.7, 10.3, 0.12, 8.7, 3.7, 0.12, '#f3ead6', 1.3);
    [[8.7, 3.7], [17.3, 3.7], [17.3, 10.3], [8.7, 10.3]].forEach(function (c) {
      stakes += line(c[0], c[1], 0, c[0], c[1], 0.42, '#8a6a4a', 3, 'stroke-linecap="round"');
    });
    stakes += '</g>';
    m.push(stakes);

    /* --- surveyor tripod --- */
    m.push('<g transform="translate(' + X(12.4, 12.9).toFixed(1) + ',' + Y(12.4, 12.9).toFixed(1) + ')">'
      + '<g id="tripod" class="anim-pop" style="opacity:0">'
      + '<line x1="0" y1="-25" x2="-11" y2="0" stroke="#6b5a44" stroke-width="2.4" stroke-linecap="round"/>'
      + '<line x1="0" y1="-25" x2="11" y2="0" stroke="#6b5a44" stroke-width="2.4" stroke-linecap="round"/>'
      + '<line x1="0" y1="-25" x2="1" y2="1" stroke="#54452f" stroke-width="2.4" stroke-linecap="round"/>'
      + '<rect x="-6.5" y="-35" width="13" height="10" rx="2" fill="#3f5d50"/>'
      + '<circle cx="0" cy="-30" r="2.6" fill="#ffd98a"/>'
      + '</g></g>');

    /* --- excavation --- */
    m.push('<g id="excavate" style="opacity:0">'
      + poly([[8.2, 3.2], [17.8, 3.2], [17.8, 10.8], [8.2, 10.8]], PAL.dig)
      + poly([[8.5, 3.5], [17.5, 3.5], [17.5, 4.1], [8.5, 4.1]], PAL.digDeep)
      + poly([[8.5, 9.9], [17.5, 9.9], [17.5, 10.5], [8.5, 10.5]], PAL.digDeep)
      + poly([[8.5, 3.5], [9.1, 3.5], [9.1, 10.5], [8.5, 10.5]], PAL.digDeep)
      + poly([[16.9, 3.5], [17.5, 3.5], [17.5, 10.5], [16.9, 10.5]], PAL.digDeep)
      + '</g>');

    /* --- planning hologram: illusional sketch of the house on the plot --- */
    var HF = 'rgba(127,212,224,0.14)', HS = 'stroke="#8fe0ee" stroke-width="1.2" stroke-linejoin="round"';
    m.push('<g id="holoHouse" class="anim-grow" style="opacity:0">'
      + poly([[8.7, 3.7, 0.02], [17.3, 3.7, 0.02], [17.3, 10.3, 0.02], [8.7, 10.3, 0.02]], 'rgba(127,212,224,0.10)', 'stroke="#8fe0ee" stroke-width="1.4" stroke-dasharray="7 5"')
      + planeY(4, 9, 17, 0.35, 3, HF, HS)   // back
      + planeX(9, 4, 10, 0.35, 3, HF, HS)   // left
      + planeY(10, 9, 17, 0.35, 3, HF, HS)  // front
      + planeX(17, 4, 10, 0.35, 3, HF, HS)  // right
      + planeY(10.01, 10.3, 11.9, 1.13, 2.47, 'rgba(127,212,224,0.10)', HS) // window sketches
      + planeY(10.01, 14.3, 15.9, 1.13, 2.47, 'rgba(127,212,224,0.10)', HS)
      + planeY(10.01, 12.68, 13.72, 0.35, 2.46, 'rgba(127,212,224,0.10)', HS) // door sketch
      + poly([[8.55, 3.45, 2.95], [17.45, 3.45, 2.95], [17.45, 7, 5.05], [8.55, 7, 5.05]], 'rgba(127,212,224,0.08)', HS)  // far slope
      + poly([[8.55, 10.55, 2.95], [17.45, 10.55, 2.95], [17.45, 7, 5.05], [8.55, 7, 5.05]], 'rgba(127,212,224,0.20)', HS) // near slope
      + poly([[17.45, 3.45, 2.95], [17.45, 10.55, 2.95], [17.45, 7, 5.05]], 'rgba(127,212,224,0.16)', HS) // gable
      + line(8.5, 7, 5.08, 17.5, 7, 5.08, '#8fe0ee', 1.5) // ridge
      + '</g>');

    /* --- house soft shadow --- */
    m.push('<g id="houseShadow" style="opacity:0" filter="url(#csBlur)">'
      + poly([[8.4, 3.4], [17.6, 3.4], [17.6, 10.7], [8.4, 10.7]], '#45503f')
      + '</g>');

    /* --- foundation slab --- */
    m.push('<g id="slab" class="anim-grow" style="opacity:0">'
      + box(8.7, 3.7, 0, 8.6, 6.6, 0.35, PAL.concreteT, PAL.concreteL, PAL.concreteR)
      + '</g>');

    /* --- structural columns --- */
    var cols = [[9, 4], [12.8, 4], [16.6, 4], [9, 9.6], [12.8, 9.6], [16.6, 9.6]];
    cols.forEach(function (c, i) {
      m.push('<g id="col' + i + '" class="anim-grow" style="opacity:0">'
        + box(c[0], c[1], 0.35, 0.4, 0.4, 2.65, '#d8d2c4', '#cfc9ba', '#c4beaf')
        + '</g>');
    });

    /* --- back + left walls (behind interior) --- */
    m.push('<g id="wallBackO"><g id="wallBackG" class="anim-grow" style="opacity:0">'
      + wbBrick.back()
      + '<g id="paintBack" style="opacity:0">' + wbPaint.back() + '</g>'
      + '</g></g>');
    m.push('<g id="wallLeftO"><g id="wallLeftG" class="anim-grow" style="opacity:0">'
      + wbBrick.left()
      + '<g id="paintLeft" style="opacity:0">' + wbPaint.left() + '</g>'
      + '</g></g>');

    /* --- interior (revealed by cutaway at the end) --- */
    m.push('<g id="interiorG">'
      // wooden floor
      + '<g id="floorWood" style="opacity:0">'
      + box(9.42, 4.42, 0.36, 7.16, 5.16, 0.06, '#cfa878', '#c49a68', '#b98f5e')
      + line(9.45, 5.4, 0.43, 16.55, 5.4, 0.43, '#b98f5e', 0.8, 'opacity=".55"')
      + line(9.45, 6.4, 0.43, 16.55, 6.4, 0.43, '#b98f5e', 0.8, 'opacity=".55"')
      + line(9.45, 7.4, 0.43, 16.55, 7.4, 0.43, '#b98f5e', 0.8, 'opacity=".55"')
      + line(9.45, 8.4, 0.43, 16.55, 8.4, 0.43, '#b98f5e', 0.8, 'opacity=".55"')
      + '</g>'
      // rug
      + '<g id="rugG" class="anim-pop" style="opacity:0">'
      + poly([[10.4, 6.7, 0.43], [13.0, 6.7, 0.43], [13.0, 8.7, 0.43], [10.4, 8.7, 0.43]], '#c96f4a')
      + poly([[10.7, 7.0, 0.435], [12.7, 7.0, 0.435], [12.7, 8.4, 0.435], [10.7, 8.4, 0.435]], '#da8a63')
      + '</g>'
      // kitchen
      + '<g id="kitchenG" class="anim-pop" style="opacity:0">'
      + box(13.6, 4.55, 0.41, 2.8, 0.95, 0.85, PAL.woodT, '#f0e8d8', '#e2d8c2')
      + box(13.8, 4.5, 1.95, 2.4, 0.5, 0.75, '#f4ede0', '#f0e8d8', '#e2d8c2')
      + poly([[14.4, 4.75, 1.27], [15.2, 4.75, 1.27], [15.2, 5.25, 1.27], [14.4, 5.25, 1.27]], '#9aa4a8')
      + poly([[15.6, 4.75, 1.27], [16.2, 4.75, 1.27], [16.2, 5.25, 1.27], [15.6, 5.25, 1.27]], '#5a544c')
      + '</g>'
      // sofa
      + '<g id="sofaG" class="anim-pop" style="opacity:0">'
      + box(10.0, 4.95, 0.41, 2.4, 0.34, 1.05, '#93b097', '#8aa88e', '#7d9a82')
      + box(10.0, 4.9, 0.41, 2.4, 1.2, 0.42, '#9cb8a0', '#93b097', '#86a18b')
      + box(10.0, 4.9, 0.41, 0.3, 1.2, 0.78, '#93b097', '#8aa88e', '#7d9a82')
      + box(12.1, 4.9, 0.41, 0.3, 1.2, 0.78, '#93b097', '#8aa88e', '#7d9a82')
      + box(10.4, 5.35, 0.83, 0.85, 0.68, 0.22, '#b6cfba', '#aec9b2', '#a2bda7')
      + box(11.35, 5.35, 0.83, 0.85, 0.68, 0.22, '#b6cfba', '#aec9b2', '#a2bda7')
      + '</g>'
      // coffee table
      + '<g id="coffeeG" class="anim-pop" style="opacity:0">'
      + box(10.95, 7.3, 0.43, 1.3, 0.75, 0.3, PAL.woodT, PAL.woodL, PAL.wood)
      + '</g>'
      // dining set
      + '<g id="diningG" class="anim-pop" style="opacity:0">'
      + box(14.1, 6.8, 0.43, 1.7, 1.5, 0.52, PAL.woodT, PAL.woodL, PAL.wood)
      + box(13.55, 7.0, 0.43, 0.45, 0.45, 0.42, '#d8b98a', '#c9a06c', '#b98f5e')
      + box(13.55, 7.85, 0.43, 0.45, 0.45, 0.42, '#d8b98a', '#c9a06c', '#b98f5e')
      + box(15.9, 7.0, 0.43, 0.45, 0.45, 0.42, '#d8b98a', '#c9a06c', '#b98f5e')
      + box(15.9, 7.85, 0.43, 0.45, 0.45, 0.42, '#d8b98a', '#c9a06c', '#b98f5e')
      + '</g>'
      // floor lamp
      + '<g id="lampG" class="anim-pop" style="opacity:0">'
      + box(9.9, 9.05, 0.43, 0.18, 0.18, 1.45, '#8a6a4a', '#7d6040', '#6e5438')
      + box(9.76, 8.91, 1.7, 0.46, 0.46, 0.4, '#f2d8a0', '#eec98a', '#e0b878')
      + '</g>'
      // plant
      + '<g id="plantG" class="anim-pop" style="opacity:0">'
      + box(16.05, 8.95, 0.43, 0.4, 0.4, 0.32, '#d98a63', '#c96f4a', '#b85f3c')
      + '<circle cx="' + X(16.25, 9.15, 1.05).toFixed(1) + '" cy="' + Y(16.25, 9.15, 1.05).toFixed(1) + '" r="7" fill="#7fa079"/>'
      + '<circle cx="' + X(16.05, 9.3, 0.85).toFixed(1) + '" cy="' + Y(16.05, 9.3, 0.85).toFixed(1) + '" r="5.5" fill="#8fae94"/>'
      + '<circle cx="' + X(16.45, 9.3, 0.9).toFixed(1) + '" cy="' + Y(16.45, 9.3, 0.9).toFixed(1) + '" r="5" fill="#9dbd9f"/>'
      + '</g>'
      // picture frame on back wall (inner face)
      + '<g id="pictureG" class="anim-popc" style="opacity:0">'
      + planeY(4.41, 10.9, 12.1, 1.35, 2.15, PAL.wood)
      + planeY(4.415, 11.0, 12.0, 1.45, 2.05, '#dfe9e4')
      + planeY(4.42, 11.05, 11.6, 1.45, 1.8, '#9dbd9f')
      + '</g>'
      // warm floor glow
      + '<ellipse id="glowFloor" class="pulseGlow" cx="' + X(13, 7).toFixed(1) + '" cy="' + Y(13, 7, 0.4).toFixed(1) + '" rx="130" ry="52" fill="url(#csGlow)" style="opacity:0"/>'
      + '<circle id="lampGlow" class="pulseGlow" cx="' + X(9.99, 9.14, 1.9).toFixed(1) + '" cy="' + Y(9.99, 9.14, 1.9).toFixed(1) + '" r="30" fill="url(#csGlow)" style="opacity:0"/>'
      + '</g>');

    /* --- front + right walls (cut away at interior reveal) --- */
    m.push('<g id="wallFrontO"><g id="wallFrontG" class="anim-grow" style="opacity:0">'
      + wbBrick.front()
      + '<g id="paintFront" style="opacity:0">' + wbPaint.front() + '</g>'
      + windowFront('winF1', 10.3, 11.9)
      + windowFront('winF2', 14.3, 15.9)
      + '<g id="doorG" class="anim-popc" style="opacity:0">'
      + planeY(10.012, 12.58, 13.82, 0.33, 2.56, PAL.frame)
      + planeY(10.02, 12.68, 13.72, 0.35, 2.46, PAL.door)
      + planeY(10.03, 13.16, 13.24, 0.35, 2.46, '#66492f')
      + '<circle cx="' + X(13.5, 10.04, 1.35).toFixed(1) + '" cy="' + Y(13.5, 10.04, 1.35).toFixed(1) + '" r="1.8" fill="#e8c98a"/>'
      + '</g>'
      + '</g></g>');
    m.push('<g id="wallRightO"><g id="wallRightG" class="anim-grow" style="opacity:0">'
      + wbBrick.right()
      + '<g id="paintRight" style="opacity:0">' + wbPaint.right() + '</g>'
      + '<g id="winR1" class="anim-popc" style="opacity:0">'
      + planeX(17.012, 5.32, 7.28, 1.04, 2.56, PAL.frame)
      + planeX(17.02, 5.4, 7.2, 1.13, 2.47, PAL.glass)
      + planeX(17.03, 6.26, 6.34, 1.13, 2.47, PAL.frame)
      + planeX(17.03, 5.4, 7.2, 1.76, 1.83, PAL.frame)
      + '</g>'
      + '</g></g>');

    /* --- doorstep (stays solid during cutaway) --- */
    m.push('<g id="doorstepG" style="opacity:0">'
      + box(12.5, 10.05, 0, 1.5, 0.6, 0.16, '#ddd7c9', '#d2ccbe', '#c6c0b2')
      + '</g>');

    /* --- warm window glow (lit windows once the family is home) --- */
    m.push('<g id="winGlowG" style="opacity:0">'
      + planeY(10.045, 10.3, 11.9, 1.13, 2.47, '#ffd98a', 'opacity=".8"')
      + planeY(10.045, 14.3, 15.9, 1.13, 2.47, '#ffd98a', 'opacity=".8"')
      + planeX(17.045, 5.4, 7.2, 1.13, 2.47, '#ffd98a', 'opacity=".8"')
      + '</g>');

    /* --- roof (drops in; ghosted with the cutaway) --- */
    var slopeLine = '';
    [9.9, 9.15, 8.4, 7.65].forEach(function (yy) {
      var zz = 2.95 + (10.55 - yy) * (2.1 / 3.55);
      slopeLine += line(8.55, yy, zz, 17.45, yy, zz, PAL.roofDark, 1.1, 'opacity=".45"');
    });
    m.push('<g id="roofO"><g id="roofG" style="opacity:0">'
      // chimney first so the slope overlaps its base
      + '<g id="chimneyG" class="anim-grow">'
      + box(15.4, 4.9, 2.0, 0.8, 0.8, 3.7, PAL.paintT, PAL.paintL, PAL.paintR)
      + box(15.3, 4.8, 5.7, 1.0, 1.0, 0.22, PAL.ridge, PAL.ridge, '#7d3f2f')
      + '</g>'
      // near slope (the one the camera sees)
      + poly([[8.55, 10.55, 2.95], [17.45, 10.55, 2.95], [17.45, 7, 5.05], [8.55, 7, 5.05]], PAL.roof)
      + slopeLine
      // ridge cap
      + box(8.5, 6.82, 4.98, 9, 0.36, 0.16, PAL.ridge, PAL.ridge, '#7d3f2f')
      // right gable
      + poly([[17.45, 3.45, 2.95], [17.45, 10.55, 2.95], [17.45, 7, 5.05]], PAL.paintL, 'stroke="#ddd2ba" stroke-width="1"')
      // fascia boards
      + box(8.5, 10.45, 2.78, 9, 0.18, 0.24, '#6e5646', '#6e5646', '#5d4739')
      + box(17.35, 3.4, 2.78, 0.18, 7.3, 0.24, '#6e5646', '#6e5646', '#5d4739')
      + '</g></g>');

    /* --- scaffolding --- */
    var scaf = '<g id="scaffoldG" style="opacity:0">';
    [[9.2, 10.75], [12, 10.75], [14.8, 10.75], [16.9, 10.75]].forEach(function (p) {
      scaf += box(p[0], p[1], 0, 0.16, 0.16, 3.5, '#a98c68', '#9c7f5c', '#8e7352');
    });
    scaf += box(8.9, 10.6, 1.7, 8.35, 0.55, 0.1, PAL.woodT, PAL.woodL, PAL.wood);
    scaf += box(8.9, 10.62, 3.15, 8.35, 0.12, 0.1, '#a98c68', '#9c7f5c', '#8e7352');
    [[17.75, 4.4], [17.75, 7], [17.75, 9.7]].forEach(function (p) {
      scaf += box(p[0], p[1], 0, 0.16, 0.16, 3.5, '#a98c68', '#9c7f5c', '#8e7352');
    });
    scaf += box(17.6, 4.2, 1.7, 0.55, 5.9, 0.1, PAL.woodT, PAL.woodL, PAL.wood);
    scaf += box(17.62, 4.2, 3.15, 0.12, 5.9, 0.1, '#a98c68', '#9c7f5c', '#8e7352');
    scaf += '</g>';
    m.push(scaf);

    /* --- back trees (behind the house) --- */
    m.push(tree(2.5, 2.5, 1.05, 0));
    m.push(tree(23.5, 2.6, 0.95, -2.2));
    m.push(tree(19.5, 0.6, 0.7, -3.6));

    /* --- building materials --- */
    // brick pallet (shrinks as the walls rise)
    m.push('<g id="palletG" class="anim-pop" style="opacity:0"><g id="brickStack" class="anim-grow">'
      + box(6.55, 13.3, 0, 1.7, 1.3, 0.12, PAL.woodT, PAL.woodL, PAL.wood)
      + box(6.65, 13.4, 0.12, 1.5, 1.1, 0.78, PAL.brickT, PAL.brickL, PAL.brickR)
      + line(6.65, 14.51, 0.38, 8.15, 14.51, 0.38, PAL.brickR, 1.2, 'opacity=".7"')
      + line(6.65, 14.51, 0.64, 8.15, 14.51, 0.64, PAL.brickR, 1.2, 'opacity=".7"')
      + '</g></g>');
    // sand pile (used up by the concrete pour)
    m.push('<g transform="translate(' + X(5.4, 15.7).toFixed(1) + ',' + Y(5.4, 15.7).toFixed(1) + ')">'
      + '<g id="sandG" class="anim-pop" style="opacity:0"><g id="sandMound" class="anim-grow">'
      + '<ellipse cx="0" cy="0" rx="22" ry="8" fill="#c8ab7c"/>'
      + '<path d="M-19 0 Q-13 -15 0 -16.5 Q13 -15 19 0 Z" fill="#d9bd8e"/>'
      + '</g></g></g>');
    // cement bags
    m.push('<g id="cementG" class="anim-pop" style="opacity:0">'
      + box(8.7, 14.9, 0, 0.75, 0.55, 0.24, '#eee8da', '#e4ddcc', '#d8d0bc')
      + box(9.5, 15.0, 0, 0.75, 0.55, 0.24, '#eee8da', '#e4ddcc', '#d8d0bc')
      + box(9.1, 14.95, 0.24, 0.75, 0.55, 0.24, '#f2ecdf', '#e4ddcc', '#d8d0bc')
      + '</g>');
    // concrete mixer
    m.push('<g transform="translate(' + X(7.6, 11.2).toFixed(1) + ',' + Y(7.6, 11.2).toFixed(1) + ')">'
      + '<g id="mixerG" class="anim-pop" style="opacity:0">'
      + '<ellipse cx="0" cy="1" rx="14" ry="5" fill="rgba(70,80,60,.16)"/>'
      + '<line x1="-8" y1="0" x2="-3" y2="-16" stroke="#5a544c" stroke-width="2.6" stroke-linecap="round"/>'
      + '<line x1="8" y1="0" x2="3" y2="-16" stroke="#5a544c" stroke-width="2.6" stroke-linecap="round"/>'
      + '<g class="spin"><circle cx="0" cy="-20" r="11" fill="#d97b4f"/>'
      + '<line x1="-11" y1="-20" x2="11" y2="-20" stroke="#b85f3c" stroke-width="3"/>'
      + '<circle cx="0" cy="-20" r="3.4" fill="#f4ede0"/></g>'
      + '</g></g>');

    /* --- planning table with sketch plan (the team gathers around it) --- */
    m.push('<g id="planTable" class="anim-pop" style="opacity:0">'
      + box(10.35, 13.95, 0, 0.1, 0.1, 0.7, PAL.woodL, PAL.wood, '#8e6a42')
      + box(11.35, 13.95, 0, 0.1, 0.1, 0.7, PAL.woodL, PAL.wood, '#8e6a42')
      + box(10.35, 14.65, 0, 0.1, 0.1, 0.7, PAL.woodL, PAL.wood, '#8e6a42')
      + box(11.35, 14.65, 0, 0.1, 0.1, 0.7, PAL.woodL, PAL.wood, '#8e6a42')
      + box(10.25, 13.85, 0.7, 1.3, 1.0, 0.09, PAL.woodT, PAL.woodL, PAL.wood)
      // blueprint sheet with a little house plan drawn on it
      + poly([[10.4, 14.0, 0.80], [11.4, 14.0, 0.80], [11.4, 14.7, 0.80], [10.4, 14.7, 0.80]], '#f4f9ff', 'stroke="#7d9cbd" stroke-width="1"')
      + poly([[10.58, 14.16, 0.801], [11.2, 14.16, 0.801], [11.2, 14.55, 0.801], [10.58, 14.55, 0.801]], 'none', 'stroke="#7d9cbd" stroke-width="1.1"')
      + line(10.82, 14.55, 0.802, 10.95, 14.55, 0.802, '#f4f9ff', 1.6)
      + line(10.58, 14.35, 0.802, 10.75, 14.35, 0.802, '#7d9cbd', 0.9)
      + '</g>');

    /* --- virtual miniature of the house, floating above the table --- */
    m.push('<g id="holoMini" class="anim-pop" style="opacity:0"><g class="holoBob">'
      + box(10.52, 14.02, 1.28, 0.76, 0.6, 0.5, 'rgba(140,224,238,0.4)', 'rgba(127,212,224,0.3)', 'rgba(127,212,224,0.22)', 'stroke="#a5ecf7" stroke-width="1.1"')
      + poly([[10.47, 14.68, 1.78], [11.33, 14.68, 1.78], [11.33, 14.32, 1.99], [10.47, 14.32, 1.99]], 'rgba(140,224,238,0.35)', 'stroke="#a5ecf7" stroke-width="1.1"')
      + poly([[10.47, 13.98, 1.78], [11.33, 13.98, 1.78], [11.33, 14.32, 1.99], [10.47, 14.32, 1.99]], 'rgba(127,212,224,0.18)', 'stroke="#a5ecf7" stroke-width="1.1"')
      + line(10.47, 14.32, 1.99, 11.33, 14.32, 1.99, '#a5ecf7', 1.2)
      + '</g></g>');

    /* --- furniture crates (arrive on the second lorry trip) --- */
    function crate(id, w, d, h) {
      return '<g id="' + id + '" style="opacity:0"><g class="anim-pop">'
        + boxL(-w / 2, -d / 2, 0, w, d, h, PAL.woodT, PAL.woodL, PAL.wood)
        + '<line x1="' + PTl(-w / 2, d / 2, h * 0.5).split(',')[0] + '" y1="' + PTl(-w / 2, d / 2, h * 0.5).split(',')[1]
        + '" x2="' + PTl(w / 2, d / 2, h * 0.5).split(',')[0] + '" y2="' + PTl(w / 2, d / 2, h * 0.5).split(',')[1]
        + '" stroke="' + PAL.wood + '" stroke-width="1.4" opacity=".8"/>'
        + '</g></g>';
    }
    m.push('<g id="crate1M">' + crate('crate1G', 1.0, 0.8, 0.7) + '</g>');
    m.push('<g id="crate2M">' + crate('crate2G', 0.8, 0.7, 0.55) + '</g>');

    /* --- lorry --- */
    m.push('<g id="lorryG" style="opacity:0">'
      + '<ellipse cx="2" cy="3" rx="46" ry="8" fill="rgba(60,60,50,.18)"/>'
      + '<g id="lorryBody">'
      + '<rect x="-40" y="-36" width="54" height="26" rx="3" fill="#6b7a72"/>'
      + '<rect x="-40" y="-39" width="54" height="6" rx="2.5" fill="#5b6a62"/>'
      + '<g id="loadBricks">'
      + '<rect x="-36" y="-52" width="46" height="14" rx="2" fill="' + PAL.brickL + '"/>'
      + '<line x1="-36" y1="-48" x2="10" y2="-48" stroke="' + PAL.brickR + '" stroke-width="1.4"/>'
      + '<line x1="-36" y1="-44" x2="10" y2="-44" stroke="' + PAL.brickR + '" stroke-width="1.4"/>'
      + '<line x1="-24" y1="-52" x2="-24" y2="-38" stroke="' + PAL.brickR + '" stroke-width="1.4"/>'
      + '<line x1="-12" y1="-52" x2="-12" y2="-38" stroke="' + PAL.brickR + '" stroke-width="1.4"/>'
      + '<line x1="-1" y1="-52" x2="-1" y2="-38" stroke="' + PAL.brickR + '" stroke-width="1.4"/>'
      + '</g>'
      + '<g id="loadCrates" style="opacity:0">'
      + '<rect x="-34" y="-52" width="22" height="14" rx="2" fill="' + PAL.woodL + '"/>'
      + '<rect x="-10" y="-49" width="18" height="11" rx="2" fill="' + PAL.woodT + '"/>'
      + '<line x1="-23" y1="-52" x2="-23" y2="-38" stroke="' + PAL.wood + '" stroke-width="1.6"/>'
      + '</g>'
      + '<rect x="14" y="-32" width="22" height="22" rx="3.5" fill="#3f5d50"/>'
      + '<path d="M17 -29 L33 -29 L33 -17 L26 -17 Z" fill="#bfe0e8"/>'
      + '<rect x="14" y="-13" width="24" height="4" rx="2" fill="#35443b"/>'
      + '<rect x="-42" y="-12" width="82" height="5" rx="2.4" fill="#4a4238"/>'
      + '<g class="wheel"><circle cx="-26" cy="-3" r="7.5" fill="#2e2a26"/><circle cx="-26" cy="-3" r="3" fill="#8d8578"/><line x1="-26" y1="-9" x2="-26" y2="3" stroke="#8d8578" stroke-width="1.6"/></g>'
      + '<g class="wheel"><circle cx="-8" cy="-3" r="7.5" fill="#2e2a26"/><circle cx="-8" cy="-3" r="3" fill="#8d8578"/><line x1="-8" y1="-9" x2="-8" y2="3" stroke="#8d8578" stroke-width="1.6"/></g>'
      + '<g class="wheel"><circle cx="27" cy="-3" r="7.5" fill="#2e2a26"/><circle cx="27" cy="-3" r="3" fill="#8d8578"/><line x1="27" y1="-9" x2="27" y2="3" stroke="#8d8578" stroke-width="1.6"/></g>'
      + '</g></g>');

    /* --- workers (consistent cast) --- */
    m.push(worker('w1', '#e8b48a', '#d97b4f', '#f2b134', CARRY_BRICKS)); // general builder, yellow helmet
    m.push(worker('w2', '#8a5a3b', '#7fa079', '#e07840', CARRY_BRICKS)); // mason, orange helmet
    m.push(worker('w3', '#eabf9b', '#4a5a6a', '#f4ede0', CARRY_PLAN));   // architect, white helmet
    m.push(worker('w4', '#c98d63', '#c9a86a', '#6b8e4e', CARRY_CRATE));  // surveyor/finisher, green helmet

    /* --- front trees + landscaping --- */
    m.push(tree(24.2, 15.8, 1.1, -1.1));
    m.push(tree(0.9, 13.2, 0.8, -4.3));
    m.push(bush(10.8, 10.85, 1, 'bush1'));
    m.push(bush(15.95, 10.9, 0.9, 'bush2'));
    var flowers = '<g id="flowersG" style="opacity:0">';
    [[12.05, 12.2, '#e8a0a0'], [12.2, 13.4, '#f2d8a0'], [12.0, 14.6, '#e8a0a0'],
     [14.5, 12.5, '#f2d8a0'], [14.35, 13.8, '#e8a0a0'], [14.55, 15.0, '#f2d8a0']].forEach(function (f) {
      flowers += '<circle cx="' + X(f[0], f[1]).toFixed(1) + '" cy="' + (Y(f[0], f[1]) - 3) + '" r="2.6" fill="' + f[2] + '"/>'
               + line(f[0], f[1], 0, f[0], f[1], 0.16, '#7fa079', 1.4);
    });
    flowers += '</g>';
    m.push(flowers);

    /* --- compound wall with gate opening at the driveway (finale) --- */
    m.push('<g id="compoundG">'
      + '<g id="wallSegL" class="anim-grow" style="opacity:0">'
      + box(0.3, 17.85, 0, 11.5, 0.3, 0.55, PAL.paintT, PAL.paintL, PAL.paintR)
      + box(0.25, 17.8, 0.55, 11.6, 0.4, 0.09, PAL.roof, PAL.roofDark, PAL.ridge)
      + '</g>'
      + '<g id="wallSegR" class="anim-grow" style="opacity:0">'
      + box(14.7, 17.85, 0, 11.0, 0.3, 0.55, PAL.paintT, PAL.paintL, PAL.paintR)
      + box(14.65, 17.8, 0.55, 11.1, 0.4, 0.09, PAL.roof, PAL.roofDark, PAL.ridge)
      + '</g>'
      + [[0.15, 'gp1'], [11.5, 'gp2'], [14.75, 'gp3'], [25.45, 'gp4']].map(function (p) {
        return '<g id="' + p[1] + '" class="anim-pop" style="opacity:0">'
          + box(p[0], 17.76, 0, 0.55, 0.48, 0.95, PAL.paintT, PAL.paintL, PAL.paintR)
          + box(p[0] - 0.07, 17.7, 0.95, 0.69, 0.6, 0.13, PAL.ridge, PAL.ridge, '#7d3f2f')
          + '</g>';
      }).join('')
      + '</g>');

    /* --- family car --- */
    m.push('<g id="carG" style="opacity:0"><g class="carRot"><g transform="scale(1.4)">'
      + '<ellipse cx="0" cy="2" rx="30" ry="6" fill="rgba(60,60,50,.18)"/>'
      + '<rect x="-25" y="-18" width="50" height="14" rx="6" fill="#d96a5a"/>'
      + '<path d="M-14 -17 Q-11 -27 -2 -27 L9 -27 Q16 -27 17 -17 Z" fill="#c25848"/>'
      + '<path d="M-11 -17.5 Q-8.5 -24.5 -2 -24.5 L2 -24.5 L2 -17.5 Z" fill="#bfe0e8"/>'
      + '<path d="M4 -17.5 L4 -24.5 L8.5 -24.5 Q13 -24.5 14.5 -17.5 Z" fill="#bfe0e8"/>'
      + '<circle cx="24" cy="-9" r="2.2" fill="#ffe9a8"/>'
      + '<circle cx="-24.5" cy="-9" r="1.8" fill="#a83232"/>'
      + '<g class="wheel"><circle cx="-14" cy="-2" r="5.5" fill="#2e2a26"/><circle cx="-14" cy="-2" r="2.2" fill="#c9c2b2"/><line x1="-14" y1="-7" x2="-14" y2="3" stroke="#c9c2b2" stroke-width="1.2"/></g>'
      + '<g class="wheel"><circle cx="14" cy="-2" r="5.5" fill="#2e2a26"/><circle cx="14" cy="-2" r="2.2" fill="#c9c2b2"/><line x1="14" y1="-7" x2="14" y2="3" stroke="#c9c2b2" stroke-width="1.2"/></g>'
      + '</g></g></g>');

    /* --- the family --- */
    m.push(person('f1', '#c98d63', '#4a6b8a', '#3b414c', '#3a2f28', 1));    // father
    m.push(person('f2', '#eabf9b', '#c96f8a', '#5a4a5a', '#5a3a28', 0.92)); // mother
    m.push(person('f3', '#e8b48a', '#f2b134', '#4a5a6a', '#2e2a26', 0.62)); // child

    /* --- loop wrap fade --- */
    m.push('<rect id="wrapFade" x="0" y="0" width="1380" height="830" fill="#f6f1e7" style="opacity:0"/>');

    m.push('</svg>');
    return m.join('');
  }

  /* ---------------------------------------------------------
     Controls markup
     --------------------------------------------------------- */
  function buildControls() {
    return '<div class="cs-controls">'
      + '<button id="csPlay" class="primary" title="Play / Pause (Space)" aria-label="Play or pause">&#10074;&#10074;</button>'
      + '<button id="csReplay" title="Replay (R)" aria-label="Replay">&#8635;</button>'
      + '<input id="csScrub" type="range" min="0" max="1000" value="0" aria-label="Scrub timeline">'
      + '<span class="cs-time" id="csTime">0.0s / 23.5s</span>'
      + '<select id="csSpeed" aria-label="Playback speed">'
      + '<option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option>'
      + '</select>'
      + '<span class="cs-phase" id="csPhase">Site Survey</span>'
      + '</div>';
  }

  /* ---------------------------------------------------------
     Timeline engine
     --------------------------------------------------------- */
  // Timeline units: the original build montage spans 0..1 (= 15s).
  // The planning scene (0.145–0.295) is inserted before the foundation pour;
  // everything from PLAN_T onward shifts by PLAN_DT. SPAN = 23.5s total.
  var PLAN_T = 0.19, PLAN_DT = 0.10;
  var SPAN = 23.5 / 15;
  var DURATION = 23500, HOLD = 2200, LOOP = DURATION + HOLD;
  var tracks = [];
  var elStates = new Map(); // element -> { def, dirty, applied }
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var EZ = {
    linear: function (p) { return p; },
    io: function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    back: function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  };
  function regEl(el) {
    if (el && !elStates.has(el)) elStates.set(el, { def: el.getAttribute('style') || '', dirty: false, applied: false });
  }
  // twU() registers a track in FINAL extended units — no planning shift.
  function twU(t0, t1, fn, ease, el) {
    tracks.push({ t0: t0 / SPAN, t1: t1 / SPAN, fn: fn, ease: ease || EZ.io, el: el || null });
    regEl(el);
  }
  // tw() registers a montage track — times at/after PLAN_T shift by PLAN_DT.
  function tw(t0, t1, fn, ease, el) {
    if (t0 >= PLAN_T) { t0 += PLAN_DT; t1 += PLAN_DT; }
    twU(t0, t1, fn, ease, el);
  }
  // twRaw() registers an always-on track in normalized units (waypoint movers).
  function twRaw(fn, el) {
    tracks.push({ t0: 0, t1: 1, fn: fn, ease: EZ.linear, el: el || null });
    regEl(el);
  }

  // appearance helpers -------------------------------------------------
  function fadeIn(el, t0, t1) { tw(t0, t1, function (p) { el.style.opacity = p.toFixed(3); }, EZ.io, el); }
  function fadeOut(el, t0, t1) { tw(t0, t1, function (p) { el.style.opacity = (1 - p).toFixed(3); }, EZ.io, el); }
  function growY(el, t0, t1) {
    tw(t0, t1, function (p) {
      el.style.transform = 'scaleY(' + Math.max(0.001, p) + ')';
      el.style.opacity = Math.min(1, p * 5).toFixed(3);
    }, EZ.out, el);
  }
  function pop(el, t0, t1) {
    tw(t0, t1, function (p) {
      el.style.transform = 'scale(' + (0.3 + 0.7 * p) + ')';
      el.style.opacity = Math.min(1, p * 2.5).toFixed(3);
    }, EZ.back, el);
  }
  function dropIn(el, t0, t1) {
    tw(t0, t1, function (p) {
      el.style.transform = 'translateY(' + (-90 * (1 - p)) + 'px)';
      el.style.opacity = Math.min(1, p * 2.2).toFixed(3);
    }, EZ.out, el);
  }
  function riseIn(el, t0, t1) {
    tw(t0, t1, function (p) {
      el.style.transform = 'translateY(' + (26 * (1 - p)) + 'px)';
      el.style.opacity = Math.min(1, p * 3).toFixed(3);
    }, EZ.out, el);
  }

  // unshifted variants for the planning scene (already in final units) ------
  function fadeInU(el, t0, t1) { twU(t0, t1, function (p) { el.style.opacity = p.toFixed(3); }, EZ.io, el); }
  function fadeOutU(el, t0, t1) { twU(t0, t1, function (p) { el.style.opacity = (1 - p).toFixed(3); }, EZ.io, el); }
  function growYU(el, t0, t1) {
    twU(t0, t1, function (p) {
      el.style.transform = 'scaleY(' + Math.max(0.001, p) + ')';
      el.style.opacity = Math.min(1, p * 5).toFixed(3);
    }, EZ.out, el);
  }
  function popU(el, t0, t1) {
    twU(t0, t1, function (p) {
      el.style.transform = 'scale(' + (0.3 + 0.7 * p) + ')';
      el.style.opacity = Math.min(1, p * 2.5).toFixed(3);
    }, EZ.back, el);
  }

  // waypoint mover for workers ----------------------------------------
  // Waypoints use extended units (1.0 = 15s); the 2nd fn arg is extended time.
  // Montage waypoints at/after PLAN_T shift by PLAN_DT, same as tw() tracks.
  function shiftWps(wps) {
    return wps.map(function (w) {
      if (w.t < PLAN_T) return w;
      var c = {}; for (var k in w) c[k] = w[k];
      c.t = w.t + PLAN_DT;
      return c;
    });
  }
  function walker(el, wps) {
    wps = shiftWps(wps);
    var flip = el.querySelector('.flip');
    var carry = el.querySelector('.carry');
    twRaw(function (p, t) {
      if (t < wps[0].t) { el.style.opacity = 0; return; }
      el.style.opacity = 1;
      var i = 0;
      while (i < wps.length - 2 && t >= wps[i + 1].t) i++;
      var a = wps[i], b = wps[i + 1];
      var u = clamp01((t - a.t) / ((b.t - a.t) || 1));
      var x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      el.style.transform = 'translate(' + X(x, y, 0).toFixed(1) + 'px,' + Y(x, y, 0).toFixed(1) + 'px)';
      var sdx = (b.x - a.x) - (b.y - a.y);
      flip.style.transform = sdx < -0.001 ? 'scaleX(-1)' : '';
      var moving = (Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) > 0.001 && u < 1;
      el.classList.toggle('walking', moving);
      if (carry) carry.setAttribute('opacity', a.c ? 1 : 0);
    }, el);
  }

  // waypoint mover for props (optional steering rotation for vehicles) --
  function mover(el, wps, onState, rotEl) {
    wps = shiftWps(wps);
    twRaw(function (p, t) {
      var i = 0;
      while (i < wps.length - 2 && t >= wps[i + 1].t) i++;
      var a = wps[i], b = wps[i + 1];
      var u = clamp01((t - a.t) / ((b.t - a.t) || 1));
      var x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      el.style.transform = 'translate(' + X(x, y, 0).toFixed(1) + 'px,' + Y(x, y, 0).toFixed(1) + 'px)';
      var moving = (Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) > 0.001 && u < 1;
      if (rotEl) {
        var ang = moving ? Math.atan2(Y(b.x, b.y, 0) - Y(a.x, a.y, 0), X(b.x, b.y, 0) - X(a.x, a.y, 0)) * 180 / Math.PI : 0;
        rotEl.style.transform = 'rotate(' + (ang * 0.6).toFixed(1) + 'deg)';
      }
      if (onState) onState(moving, t);
    }, el);
  }

  /* ---------------------------------------------------------
     Phase metadata
     --------------------------------------------------------- */
  var PHASES = [ // final extended units (1.0 = 15s), planning shift applied
    [0.065, 'Site Survey'], [0.145, 'Site Preparation'], [0.20, 'Material Delivery'],
    [0.295, 'Planning & 3D Preview'], [0.39, 'Pouring Foundation'], [0.47, 'Structural Columns'],
    [0.59, 'Masonry Walls'], [0.65, 'Scaffolding'], [0.73, 'Roofing'],
    [0.83, 'Exterior Finishing'], [0.93, 'Landscaping & Cleanup'], [1.045, 'Interior Fit-Out'],
    [1.11, 'Ready for Handover'], [1.21, 'Compound Wall & Gate'], [1.36, 'Car Parking'],
    [1.48, 'Family Arrives'], [1.57, 'Welcome Home']
  ];

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  function init() {
    var container = document.getElementById('construction-scene');
    if (!container) return;
    container.innerHTML = buildSVG() + buildControls();

    var $ = function (id) { return container.querySelector('#' + id); };

    /* ============ build the coordinated timeline ============ */

    // -- phase 1: survey (0.00 - 0.13) --------------------------------
    pop($('tripod'), 0.015, 0.05);
    fadeOut($('tripod'), 0.30, 0.34);
    fadeIn($('stakesG'), 0.055, 0.09);
    fadeOut($('stakesG'), 0.34, 0.38);
    pop($('siteSign'), 0.04, 0.07);
    fadeOut($('siteSign'), 0.76, 0.80);

    // -- phase 2: excavation -------------------------------------------
    fadeIn($('excavate'), 0.065, 0.12);

    // -- NEW: planning & 3D preview (0.145 - 0.295, before the pour) -------
    // The crew gathers around a table with the sketch plan; a virtual
    // miniature floats above it while a full-size illusional sketch of the
    // house materialises on the plot — then both vanish and the pour begins.
    popU($('planTable'), 0.145, 0.175);
    popU($('holoMini'), 0.16, 0.195);
    growYU($('holoHouse'), 0.175, 0.24);
    fadeOutU($('holoHouse'), 0.26, 0.295);
    fadeOutU($('holoMini'), 0.26, 0.29);
    fadeOutU($('planTable'), 0.27, 0.30);

    // -- materials arrive with the lorry (registered early so later
    //    phase tracks win over these appearance tweens) -----------------
    pop($('palletG'), 0.135, 0.17);
    pop($('sandG'), 0.145, 0.175);
    pop($('cementG'), 0.15, 0.18);
    pop($('mixerG'), 0.17, 0.20);

    // -- phase 3: foundation -------------------------------------------
    (function () {
      var sh = $('houseShadow');
      tw(0.19, 0.26, function (p) { sh.style.opacity = (p * 0.55).toFixed(3); }, EZ.io, sh);
      tw(0.19, 0.5, function (p) {
        sh.style.transform = 'translate(' + (6 + 10 * p) + 'px,' + (10 + 12 * p) + 'px) scale(' + (0.72 + 0.28 * p) + ')';
        sh.style.transformBox = 'fill-box';
        sh.style.transformOrigin = '50% 50%';
      }, EZ.io, sh);
    })();
    growY($('slab'), 0.20, 0.27);
    // sand + cement are consumed by the pour
    (function () {
      var mound = $('sandMound');
      tw(0.20, 0.29, function (p) { mound.style.transform = 'scaleY(' + Math.max(0.001, 1 - 0.9 * p) + ')'; }, EZ.io, mound);
      fadeOut($('sandG'), 0.285, 0.315);
      fadeOut($('cementG'), 0.27, 0.31);
    })();

    // -- phase 4: columns -----------------------------------------------
    for (var ci = 0; ci < 6; ci++) growY($('col' + ci), 0.295 + ci * 0.011, 0.35 + ci * 0.011);

    // -- phase 5: brick walls (brick pallet shrinks as they rise) -------
    growY($('wallBackG'), 0.355, 0.415);
    growY($('wallLeftG'), 0.375, 0.43);
    growY($('wallFrontG'), 0.395, 0.455);
    growY($('wallRightG'), 0.415, 0.475);
    (function () {
      var stack = $('brickStack');
      tw(0.32, 0.48, function (p) { stack.style.transform = 'scaleY(' + Math.max(0.06, 1 - 0.94 * p) + ')'; }, EZ.io, stack);
      fadeOut($('palletG'), 0.74, 0.78);
    })();

    // -- phase 6: scaffolding -------------------------------------------
    riseIn($('scaffoldG'), 0.46, 0.52);
    fadeOut($('scaffoldG'), 0.605, 0.655);

    // -- phase 7: roof ----------------------------------------------------
    dropIn($('roofG'), 0.53, 0.615);
    growY($('chimneyG'), 0.565, 0.625);

    // -- phase 8: exterior finishing --------------------------------------
    fadeIn($('paintBack'), 0.615, 0.66);
    fadeIn($('paintLeft'), 0.63, 0.675);
    fadeIn($('paintFront'), 0.645, 0.69);
    fadeIn($('paintRight'), 0.66, 0.705);
    pop($('winF1'), 0.665, 0.70);
    pop($('doorG'), 0.685, 0.72);
    pop($('winF2'), 0.70, 0.735);
    pop($('winR1'), 0.715, 0.75);
    fadeIn($('doorstepG'), 0.70, 0.74);

    // -- phase 9: landscaping & cleanup -----------------------------------
    fadeIn($('drivewayG'), 0.72, 0.765);
    pop($('bush1'), 0.755, 0.80);
    pop($('bush2'), 0.775, 0.815);
    fadeIn($('flowersG'), 0.79, 0.83);
    fadeOut($('mixerG'), 0.72, 0.76);
    fadeOut($('excavate'), 0.72, 0.78); // soil bed turfed over

    // -- phase 10: interior fit-out ---------------------------------------
    fadeIn($('floorWood'), 0.83, 0.865);
    pop($('kitchenG'), 0.855, 0.885);
    pop($('rugG'), 0.87, 0.90);
    pop($('sofaG'), 0.885, 0.915);
    pop($('coffeeG'), 0.90, 0.928);
    pop($('pictureG'), 0.905, 0.932);
    pop($('diningG'), 0.915, 0.943);
    pop($('lampG'), 0.928, 0.955);
    pop($('plantG'), 0.938, 0.965);

    // cutaway: front wall, right wall and roof become translucent...
    [$('wallFrontG'), $('wallRightG'), $('roofG')].forEach(function (e) {
      tw(0.855, 0.915, function (p) { e.style.opacity = (1 - 0.86 * p).toFixed(3); }, EZ.io, e);
    });
    // ...then the shell closes up again for the handover finale
    [$('wallFrontG'), $('wallRightG'), $('roofG')].forEach(function (e) {
      tw(1.03, 1.09, function (p) { e.style.opacity = (0.14 + 0.86 * p).toFixed(3); }, EZ.io, e);
    });

    // warm interior light
    fadeIn($('glowFloor'), 0.93, 1.0);
    fadeIn($('lampGlow'), 0.945, 1.0);

    /* ============ finale: compound wall, parking, family arrival ============ */

    // -- compound wall & gate pillars (mason walks the line as it rises) -----
    growY($('wallSegL'), 1.0, 1.05);
    growY($('wallSegR'), 1.02, 1.07);
    pop($('gp1'), 1.045, 1.075);
    pop($('gp2'), 1.055, 1.085);
    pop($('gp3'), 1.065, 1.095);
    pop($('gp4'), 1.075, 1.105);

    // -- parking pad ----------------------------------------------------------
    fadeIn($('padG'), 1.03, 1.08);

    // -- family car: road -> gate -> driveway -> parking pad -------------------
    var car = $('carG');
    fadeIn(car, 1.065, 1.08);
    mover(car, [
      { t: 1.07, x: -10, y: 19.6 }, { t: 1.135, x: 12.9, y: 19.5 },
      { t: 1.165, x: 13.4, y: 16.9 }, { t: 1.20, x: 15.3, y: 14.5 },
      { t: 1.235, x: 17.55, y: 13.3 }, { t: 1.47, x: 17.55, y: 13.3 }
    ], function (moving) { car.classList.toggle('driving', moving); }, car.querySelector('.carRot'));

    // -- family steps out and walks into the house -----------------------------
    walker($('f1'), [
      { t: 1.25, x: 16.6, y: 13.9 }, { t: 1.275, x: 16.1, y: 14.4 },
      { t: 1.33, x: 13.5, y: 11.4 }, { t: 1.36, x: 13.3, y: 10.95 }, { t: 1.47, x: 13.3, y: 10.95 }
    ]);
    walker($('f2'), [
      { t: 1.26, x: 17.0, y: 14.15 }, { t: 1.29, x: 16.5, y: 14.6 },
      { t: 1.345, x: 13.8, y: 11.6 }, { t: 1.375, x: 13.5, y: 11.1 }, { t: 1.47, x: 13.5, y: 11.1 }
    ]);
    walker($('f3'), [
      { t: 1.275, x: 17.3, y: 14.35 }, { t: 1.305, x: 16.9, y: 14.7 },
      { t: 1.36, x: 14.0, y: 11.85 }, { t: 1.395, x: 13.6, y: 11.25 }, { t: 1.47, x: 13.6, y: 11.25 }
    ]);
    fadeOut($('f1'), 1.355, 1.375);  // stepping inside
    fadeOut($('f2'), 1.37, 1.39);
    fadeOut($('f3'), 1.39, 1.41);

    // -- windows glow warm once the family is home ------------------------------
    fadeIn($('winGlowG'), 1.07, 1.13);

    // -- lorry -------------------------------------------------------------
    var lorry = $('lorryG');
    fadeIn(lorry, 0.095, 0.11);
    mover(lorry, [
      { t: 0.10, x: -11, y: 19.4 }, { t: 0.175, x: 6.6, y: 19.4 },
      { t: 0.47, x: 6.6, y: 19.4 }, { t: 0.55, x: -12, y: 19.4 },
      { t: 0.755, x: -12, y: 19.4 }, { t: 0.825, x: 6.6, y: 19.4 },
      { t: 0.925, x: 6.6, y: 19.4 }, { t: 1.0, x: -12, y: 19.4 }
    ], function (moving) { lorry.classList.toggle('driving', moving); });
    fadeOut($('loadBricks'), 0.135, 0.17);
    fadeIn($('loadCrates'), 0.60, 0.70);   // loaded while off-screen
    fadeOut($('loadCrates'), 0.83, 0.865);

    // -- furniture crates: lorry -> door -> unpacked ------------------------
    var c1 = $('crate1M'), c2 = $('crate2M');
    pop(container.querySelector('#crate1G > .anim-pop'), 0.825, 0.855);
    pop(container.querySelector('#crate2G > .anim-pop'), 0.835, 0.865);
    mover(c1, [{ t: 0.83, x: 8.2, y: 18.1 }, { t: 0.895, x: 13.05, y: 10.95 }, { t: 1, x: 13.05, y: 10.95 }]);
    mover(c2, [{ t: 0.845, x: 9.7, y: 18.4 }, { t: 0.915, x: 14.15, y: 10.85 }, { t: 1, x: 14.15, y: 10.85 }]);
    fadeOut($('crate1G'), 0.925, 0.955);
    fadeOut($('crate2G'), 0.94, 0.97);

    // -- workers ------------------------------------------------------------
    // W4 (green): surveyor -> landscaping -> crate carrier
    walker($('w4'), [
      { t: 0.0, x: -9, y: 19.5 }, { t: 0.02, x: 7.5, y: 19.5 }, { t: 0.05, x: 12.9, y: 13.4 },
      { t: 0.11, x: 12.9, y: 13.4 }, { t: 0.14, x: 9.9, y: 14.35 }, // joins the planning table
      { t: 0.72, x: 9.9, y: 14.35 }, { t: 0.77, x: 10.8, y: 11.9 },
      { t: 0.84, x: 10.8, y: 11.9 }, { t: 0.865, x: 9.0, y: 18.2 },
      { t: 0.87, x: 9.0, y: 18.2, c: 1 }, { t: 0.915, x: 13.6, y: 11.3, c: 1 },
      { t: 0.93, x: 13.6, y: 11.3 }, { t: 0.955, x: 11.3, y: 13.1 }, { t: 1.0, x: 11.3, y: 13.1 },
      { t: 1.05, x: 13.2, y: 16.6 }, { t: 1.10, x: 13.0, y: 19.5 }, { t: 1.17, x: -10, y: 19.6 }
    ]);
    // W3 (white): architect with blueprint
    walker($('w3'), [
      { t: 0.015, x: -9, y: 19.5 }, { t: 0.035, x: 7.5, y: 19.5 }, { t: 0.065, x: 10.55, y: 13.5, c: 1 },
      { t: 0.29, x: 10.55, y: 13.5, c: 1 }, { t: 0.30, x: 10.55, y: 13.5 }, // presents the plan at the table
      { t: 0.34, x: 12.2, y: 14.8 }, { t: 0.60, x: 12.2, y: 14.8 },
      { t: 0.66, x: 18.1, y: 11.2 }, { t: 0.72, x: 13.2, y: 11.4 },
      { t: 0.80, x: 13.2, y: 11.4 }, { t: 0.93, x: 12.9, y: 13.7 }, { t: 1.0, x: 12.9, y: 13.7 },
      { t: 1.045, x: 13.1, y: 16.6 }, { t: 1.095, x: 12.9, y: 19.5 }, { t: 1.16, x: -10, y: 19.6 }
    ]);
    // W1 (yellow): unload -> foundation -> brick runs -> furnishing
    walker($('w1'), [
      { t: 0.085, x: -9, y: 19.5 }, { t: 0.105, x: 6.2, y: 19.6 }, { t: 0.13, x: 6.9, y: 15.1 },
      { t: 0.155, x: 6.9, y: 15.1 }, { t: 0.185, x: 10.8, y: 15.2 }, // joins the planning table
      { t: 0.19, x: 10.8, y: 15.2 }, { t: 0.215, x: 10.8, y: 11.3 },
      { t: 0.28, x: 10.8, y: 11.3 }, { t: 0.305, x: 7.3, y: 13.9 },
      { t: 0.315, x: 7.3, y: 13.9, c: 1 }, { t: 0.345, x: 11.8, y: 10.9, c: 1 },
      { t: 0.355, x: 11.8, y: 10.9 }, { t: 0.38, x: 7.3, y: 13.9 },
      { t: 0.39, x: 7.3, y: 13.9, c: 1 }, { t: 0.42, x: 14.2, y: 10.9, c: 1 },
      { t: 0.43, x: 14.2, y: 10.9 }, { t: 0.455, x: 7.3, y: 13.9 },
      { t: 0.465, x: 7.3, y: 13.9, c: 1 }, { t: 0.50, x: 11.2, y: 12.1, c: 1 },
      { t: 0.51, x: 11.2, y: 12.1 }, { t: 0.60, x: 15.4, y: 11.6 },
      { t: 0.68, x: 15.4, y: 11.6 }, { t: 0.74, x: 8.2, y: 15.2 },
      { t: 0.80, x: 8.2, y: 15.2 }, { t: 0.84, x: 8.4, y: 18.3 },
      { t: 0.85, x: 8.4, y: 18.3, c: 1 }, { t: 0.90, x: 12.9, y: 11.3, c: 1 },
      { t: 0.915, x: 12.9, y: 11.3 }, { t: 0.95, x: 12.2, y: 12.7 }, { t: 1.0, x: 12.2, y: 12.7 },
      { t: 1.055, x: 13.3, y: 16.6 }, { t: 1.105, x: 13.1, y: 19.5 }, { t: 1.175, x: -10, y: 19.6 }
    ]);
    // W2 (orange): mason — foundation, walls, painting
    walker($('w2'), [
      { t: 0.10, x: -9, y: 19.5 }, { t: 0.12, x: 7.0, y: 19.6 }, { t: 0.15, x: 8.7, y: 14.4 },
      { t: 0.185, x: 11.9, y: 14.6 }, { t: 0.19, x: 11.9, y: 14.6 }, // joins the planning table
      { t: 0.20, x: 15.1, y: 11.3 }, { t: 0.28, x: 15.1, y: 11.3 },
      { t: 0.33, x: 13.6, y: 10.85 }, { t: 0.38, x: 10.6, y: 10.85 },
      { t: 0.43, x: 13.0, y: 10.95 }, { t: 0.48, x: 17.3, y: 7.2 },
      { t: 0.55, x: 17.3, y: 7.2 }, { t: 0.60, x: 15.0, y: 11.1 },
      { t: 0.69, x: 15.0, y: 11.1 }, { t: 0.74, x: 14.6, y: 12.6 },
      { t: 0.84, x: 14.6, y: 12.6 }, { t: 0.93, x: 14.9, y: 12.4 }, { t: 0.99, x: 14.9, y: 12.4 },
      // the mason walks the compound-wall line as it rises, then heads out
      { t: 1.02, x: 7.0, y: 17.1 }, { t: 1.07, x: 16.5, y: 17.1 },
      { t: 1.11, x: 13.2, y: 19.5 }, { t: 1.18, x: -10, y: 19.6 }
    ]);

    /* ============ engine ============ */
    var playBtn = $('csPlay'), scrub = $('csScrub'), timeEl = $('csTime'),
        phaseEl = $('csPhase'), speedSel = $('csSpeed'), fadeEl = $('wrapFade');

    var time = 0, playing = true, speed = 1, dragging = false, last = null;

    // URL params for testing / embedding: ?t=0.5&autoplay=0
    var qs = new URLSearchParams(location.search);
    if (qs.has('t')) { time = clamp01(parseFloat(qs.get('t')) || 0) * DURATION; playing = qs.get('autoplay') === '1'; }
    if (qs.get('autoplay') === '0') playing = false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && !qs.has('t')) playing = false;

    function render(t) {
      var te = t * SPAN; // extended timeline units (1.0 = 15s)
      elStates.forEach(function (st) { st.applied = false; });
      for (var i = 0; i < tracks.length; i++) {
        var tr = tracks[i];
        if (t < tr.t0) continue; // future tracks leave earlier states untouched
        var p = tr.ease(clamp01((t - tr.t0) / (tr.t1 - tr.t0)));
        tr.fn(p, te);
        if (tr.el) elStates.get(tr.el).applied = true;
      }
      // elements with no active track snap back to their initial state —
      // keeps loop restarts and backward scrubs free of stale styles
      elStates.forEach(function (st, el) {
        if (st.applied) st.dirty = true;
        else if (st.dirty) { el.setAttribute('style', st.def); st.dirty = false; }
      });
      container.classList.toggle('cs-lit', te > 1.10);
    }

    function updateUI() {
      var te = Math.min(time / DURATION, 1) * SPAN;
      if (!dragging) {
        scrub.value = Math.round((time / LOOP) * 1000);
        scrub.style.setProperty('--fill', ((time / LOOP) * 100).toFixed(1) + '%');
      }
      timeEl.textContent = (Math.min(time, DURATION) / 1000).toFixed(1) + 's / 23.5s';
      var label = PHASES[0][1];
      for (var i = 0; i < PHASES.length; i++) if (te <= PHASES[i][0]) { label = PHASES[i][1]; break; }
      if (phaseEl.textContent !== label) phaseEl.textContent = label;
      playBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
      container.classList.toggle('cs-paused', !playing);
      // soft fade masks the loop wrap point
      var m = 380, o = 0;
      if (time < m) o = 1 - time / m;
      else if (time > LOOP - m) o = (time - (LOOP - m)) / m;
      fadeEl.style.opacity = (o * 0.9).toFixed(3);
    }

    function frame(now) {
      if (last === null) last = now;
      var dt = now - last;
      last = now;
      if (playing) time = (time + dt * speed) % LOOP;
      render(Math.min(time / DURATION, 1));
      updateUI();
      requestAnimationFrame(frame);
    }

    function setPlaying(v) { playing = v; }
    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    $('csReplay').addEventListener('click', function () { time = 0; setPlaying(true); });
    speedSel.addEventListener('change', function () { speed = parseFloat(speedSel.value) || 1; });
    scrub.addEventListener('input', function () {
      dragging = true;
      time = (scrub.value / 1000) * LOOP;
      scrub.style.setProperty('--fill', (scrub.value / 10) + '%');
    });
    scrub.addEventListener('change', function () { dragging = false; });
    container.addEventListener('keydown', function (e) {
      if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
      if (e.key === 'r' || e.key === 'R') { time = 0; setPlaying(true); }
    });
    container.setAttribute('tabindex', '0');

    // public API for host pages
    window.ConstructionScene = {
      play: function () { setPlaying(true); },
      pause: function () { setPlaying(false); },
      replay: function () { time = 0; setPlaying(true); },
      setTime: function (sec) { time = clamp01(sec / 23.5) * DURATION; },
      duration: 23.5
    };

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
