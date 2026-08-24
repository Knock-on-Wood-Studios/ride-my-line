/* Ride My Line — ten yards. Data only; game.js builds the world. */
(function (root) {
  "use strict";

  /**
   * Design space is 720x1280. Y grows down.
   * ledge / landing / extras use top-left boxes.
   * spawn sits on that yard's ledge, near the lip.
   */
  var LEVELS = [
    {
      id: "yard-01",
      name: "First Drop",
      inkMax: 720,
      hint: "draw the catch · tap GO",
      ledge: { x: 18, y: 438, w: 198, h: 30 },
      backstop: { x: 10, y: 352, w: 16, h: 92 },
      posts: [
        { x: 32, y: 468, w: 20, h: 210 },
        { x: 168, y: 468, w: 18, h: 150 }
      ],
      landing: { x: 392, y: 786, w: 310, h: 36 },
      landPosts: [
        { x: 420, y: 822, w: 22, h: 160 },
        { x: 640, y: 822, w: 22, h: 160 }
      ],
      flag: { x: 628, y: 786 },
      star: { x: 318, y: 628 },
      extras: [],
      push: { x: 2.7, y: 0.12 },
      driveMs: 380,
      friction: { track: 0.88, land: 0.9 }
    },
    {
      id: "yard-02",
      name: "Gap",
      inkMax: 560,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 348, w: 158, h: 28 },
      backstop: { x: 8, y: 266, w: 16, h: 88 },
      posts: [
        { x: 28, y: 376, w: 18, h: 240 },
        { x: 138, y: 376, w: 16, h: 170 }
      ],
      landing: { x: 508, y: 838, w: 196, h: 32 },
      landPosts: [
        { x: 528, y: 870, w: 18, h: 140 },
        { x: 660, y: 870, w: 18, h: 140 }
      ],
      flag: { x: 642, y: 838 },
      star: { x: 352, y: 548 },
      extras: [],
      push: { x: 2.5, y: 0.1 },
      driveMs: 340,
      friction: { track: 0.86, land: 0.88 }
    },
    {
      id: "yard-03",
      name: "Greedy Star",
      inkMax: 620,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 408, w: 176, h: 28 },
      backstop: { x: 8, y: 324, w: 16, h: 90 },
      posts: [
        { x: 30, y: 436, w: 18, h: 200 },
        { x: 154, y: 436, w: 16, h: 140 }
      ],
      landing: { x: 448, y: 792, w: 254, h: 34 },
      landPosts: [
        { x: 470, y: 826, w: 18, h: 150 },
        { x: 650, y: 826, w: 18, h: 150 }
      ],
      flag: { x: 636, y: 792 },
      star: { x: 274, y: 236 },
      extras: [],
      push: { x: 2.6, y: 0.1 },
      driveMs: 360,
      friction: { track: 0.88, land: 0.9 }
    },
    {
      id: "yard-04",
      name: "Long Fall",
      inkMax: 520,
      hint: "draw the catch · tap GO",
      ledge: { x: 20, y: 176, w: 154, h: 26 },
      backstop: { x: 12, y: 96, w: 16, h: 86 },
      posts: [
        { x: 34, y: 202, w: 16, h: 280 },
        { x: 140, y: 202, w: 16, h: 200 }
      ],
      landing: { x: 468, y: 896, w: 214, h: 30 },
      landPosts: [
        { x: 490, y: 926, w: 16, h: 110 },
        { x: 640, y: 926, w: 16, h: 110 }
      ],
      flag: { x: 548, y: 896 },
      star: { x: 368, y: 486 },
      extras: [],
      push: { x: 2.2, y: 0.08 },
      driveMs: 300,
      friction: { track: 0.84, land: 0.86 }
    },
    {
      id: "yard-05",
      name: "Skinny Deck",
      inkMax: 540,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 292, w: 150, h: 26 },
      backstop: { x: 8, y: 210, w: 16, h: 88 },
      posts: [
        { x: 28, y: 318, w: 16, h: 250 },
        { x: 132, y: 318, w: 16, h: 180 }
      ],
      landing: { x: 528, y: 812, w: 92, h: 20 },
      landPosts: [
        { x: 538, y: 832, w: 12, h: 150 },
        { x: 598, y: 832, w: 12, h: 150 }
      ],
      flag: { x: 572, y: 812 },
      star: { x: 336, y: 548 },
      extras: [],
      push: { x: 2.4, y: 0.1 },
      driveMs: 320,
      friction: { track: 0.86, land: 0.92 }
    },
    {
      id: "yard-06",
      name: "Two Bites",
      inkMax: 600,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 318, w: 142, h: 26 },
      backstop: { x: 8, y: 236, w: 16, h: 88 },
      posts: [
        { x: 28, y: 344, w: 16, h: 230 },
        { x: 126, y: 344, w: 16, h: 160 }
      ],
      landing: { x: 548, y: 868, w: 156, h: 30 },
      landPosts: [
        { x: 568, y: 898, w: 16, h: 120 },
        { x: 664, y: 898, w: 16, h: 120 }
      ],
      flag: { x: 646, y: 868 },
      star: { x: 358, y: 468 },
      extras: [
        { type: "plank", x: 298, y: 628, w: 112, h: 20 }
      ],
      push: { x: 2.5, y: 0.1 },
      driveMs: 340,
      friction: { track: 0.86, land: 0.88 }
    },
    {
      id: "yard-07",
      name: "Wall",
      inkMax: 580,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 336, w: 150, h: 26 },
      backstop: { x: 8, y: 252, w: 16, h: 90 },
      posts: [
        { x: 28, y: 362, w: 16, h: 230 },
        { x: 132, y: 362, w: 16, h: 160 }
      ],
      landing: { x: 508, y: 812, w: 196, h: 30 },
      landPosts: [
        { x: 528, y: 842, w: 16, h: 140 },
        { x: 660, y: 842, w: 16, h: 140 }
      ],
      flag: { x: 644, y: 812 },
      star: { x: 438, y: 388 },
      extras: [
        { type: "wall", x: 376, y: 508, w: 22, h: 304 }
      ],
      push: { x: 2.5, y: 0.1 },
      driveMs: 340,
      friction: { track: 0.86, land: 0.88 }
    },
    {
      id: "yard-08",
      name: "Ice",
      inkMax: 520,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 356, w: 160, h: 26 },
      backstop: { x: 8, y: 272, w: 16, h: 90 },
      posts: [
        { x: 28, y: 382, w: 16, h: 220 },
        { x: 140, y: 382, w: 16, h: 150 }
      ],
      landing: { x: 392, y: 788, w: 308, h: 32, ice: true, friction: 0.035 },
      landPosts: [
        { x: 420, y: 820, w: 16, h: 150 },
        { x: 650, y: 820, w: 16, h: 150 }
      ],
      flag: { x: 528, y: 788 },
      star: { x: 318, y: 568 },
      extras: [],
      push: { x: 2.4, y: 0.08 },
      driveMs: 300,
      friction: { track: 0.82, land: 0.035 }
    },
    {
      id: "yard-09",
      name: "Cruel Star",
      inkMax: 640,
      hint: "draw the catch · tap GO",
      ledge: { x: 16, y: 268, w: 142, h: 26 },
      backstop: { x: 8, y: 186, w: 16, h: 88 },
      posts: [
        { x: 28, y: 294, w: 16, h: 250 },
        { x: 126, y: 294, w: 16, h: 180 }
      ],
      landing: { x: 488, y: 868, w: 214, h: 30 },
      landPosts: [
        { x: 508, y: 898, w: 16, h: 120 },
        { x: 660, y: 898, w: 16, h: 120 }
      ],
      flag: { x: 628, y: 868 },
      star: { x: 352, y: 148 },
      extras: [
        { type: "plank", x: 248, y: 418, w: 86, h: 16 }
      ],
      push: { x: 2.4, y: 0.1 },
      driveMs: 320,
      friction: { track: 0.86, land: 0.88 }
    },
    {
      id: "yard-10",
      name: "Knievel",
      inkMax: 400,
      hint: "draw the catch · tap GO",
      ledge: { x: 18, y: 148, w: 128, h: 24 },
      backstop: { x: 10, y: 70, w: 16, h: 84 },
      posts: [
        { x: 30, y: 172, w: 14, h: 300 },
        { x: 118, y: 172, w: 14, h: 210 }
      ],
      landing: { x: 568, y: 918, w: 86, h: 18 },
      landPosts: [
        { x: 578, y: 936, w: 10, h: 100 },
        { x: 632, y: 936, w: 10, h: 100 }
      ],
      flag: { x: 608, y: 918 },
      star: { x: 292, y: 228 },
      extras: [
        { type: "wall", x: 430, y: 620, w: 18, h: 160 }
      ],
      push: { x: 2.15, y: 0.06 },
      driveMs: 280,
      friction: { track: 0.84, land: 0.9 }
    }
  ];

  root.RML_LEVELS = LEVELS;
})(typeof window !== "undefined" ? window : this);
