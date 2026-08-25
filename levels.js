/* Ride My Line — opening yards 1–12. Data only. */
(function (root) {
  "use strict";

  /**
   * Design space is 720x1280. Y grows down.
   * The controls never change: draw, then GO. Each yard changes the shape problem.
   */
  var LEVELS = [
    {
      id: "yard-01",
      name: "First Drop",
      difficulty: 1,
      objective: "DRAW A CATCH · reach the flag",
      inkMax: 620,
      rules: {
        maxStrokes: 1,
        material: "chalk",
        parInk: 0.9
      },
      ledge: { x: 18, y: 438, w: 198, h: 30 },
      backstop: { x: 10, y: 352, w: 16, h: 92 },
      posts: [{ x: 32, y: 468, w: 20, h: 210 }, { x: 168, y: 468, w: 18, h: 150 }],
      landing: { x: 380, y: 786, w: 322, h: 36 },
      landPosts: [{ x: 410, y: 822, w: 22, h: 160 }, { x: 640, y: 822, w: 22, h: 160 }],
      flag: { x: 556, y: 786 },
      star: { x: 326, y: 628 },
      extras: [],
      reference: [[
        { x: 198, y: 446 }, { x: 246, y: 500 }, { x: 300, y: 590 },
        { x: 354, y: 688 }, { x: 420, y: 782 }
      ]],
      push: { x: 2.42, y: 0.1 },
      driveMs: 700,
      physics: { gravityY: 1.38, stability: 0.014, inertiaScale: 1.5, driveMax: 0.42 },
      friction: { track: 0.88, land: 0.9 }
    },
    {
      id: "yard-02",
      name: "Green Zone",
      difficulty: 2,
      objective: "DRAW INSIDE GREEN · reach the flag",
      inkMax: 720,
      rules: {
        maxStrokes: 1,
        material: "chalk",
        parInk: 0.92,
        drawZones: [{ x: 148, y: 344, w: 380, h: 424 }]
      },
      ledge: { x: 16, y: 348, w: 158, h: 28 },
      backstop: { x: 8, y: 266, w: 16, h: 88 },
      posts: [{ x: 28, y: 376, w: 18, h: 240 }, { x: 138, y: 376, w: 16, h: 170 }],
      landing: { x: 470, y: 760, w: 234, h: 32 },
      landPosts: [{ x: 498, y: 792, w: 18, h: 170 }, { x: 660, y: 792, w: 18, h: 170 }],
      flag: { x: 610, y: 760 },
      star: { x: 402, y: 684 },
      extras: [],
      reference: [[
        { x: 164, y: 358 }, { x: 220, y: 408 }, { x: 280, y: 490 },
        { x: 342, y: 584 }, { x: 406, y: 680 }, { x: 478, y: 758 }
      ]],
      push: { x: 2.48, y: 0.08 },
      driveMs: 1100,
      physics: { gravityY: 1.44, stability: 0.012, inertiaScale: 1.46, driveMax: 0.44, driveAdd: 0.026 },
      friction: { track: 0.88, land: 0.94 }
    },
    {
      id: "yard-03",
      name: "Mind The Gap",
      difficulty: 3,
      objective: "TWO LINES · AVOID THE RED X",
      inkMax: 760,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.92,
        drawZones: [{ x: 168, y: 370, w: 192, h: 304 }, { x: 396, y: 640, w: 166, h: 162 }],
        noDrawZones: [{ x: 352, y: 588, w: 44, h: 112 }]
      },
      contract: { minAirMs: 70, maxAngle: 1.0 },
      ledge: { x: 16, y: 378, w: 176, h: 28 },
      backstop: { x: 8, y: 294, w: 16, h: 90 },
      posts: [{ x: 30, y: 406, w: 18, h: 210 }, { x: 154, y: 406, w: 16, h: 145 }],
      landing: { x: 520, y: 790, w: 182, h: 34 },
      landPosts: [{ x: 542, y: 824, w: 18, h: 150 }, { x: 660, y: 824, w: 18, h: 150 }],
      flag: { x: 630, y: 790 },
      star: { x: 380, y: 648 },
      extras: [],
      reference: [
        [
          { x: 184, y: 390 }, { x: 226, y: 442 }, { x: 270, y: 520 },
          { x: 310, y: 600 }, { x: 346, y: 640 }
        ],
        [
          { x: 402, y: 670 }, { x: 434, y: 704 }, { x: 474, y: 744 },
          { x: 524, y: 788 }
        ]
      ],
      push: { x: 2.55, y: 0.08 },
      driveMs: 1800,
      physics: { gravityY: 1.52, stability: 0.01, inertiaScale: 1.46, driveMax: 0.47, driveAdd: 0.028 },
      friction: { track: 0.86, land: 0.78 }
    },
    {
      id: "yard-04",
      name: "Feather Catch",
      difficulty: 5,
      objective: "CURL UNDER · no hard chassis hit",
      inkMax: 880,
      rules: {
        maxStrokes: 1,
        material: "chalk",
        parInk: 0.91,
        drawZones: [{ x: 146, y: 174, w: 390, h: 760 }],
        noDrawZones: [{ x: 406, y: 506, w: 64, h: 206 }]
      },
      contract: { maxImpact: 8.2 },
      ledge: { x: 20, y: 176, w: 154, h: 26 },
      backstop: { x: 12, y: 96, w: 16, h: 86 },
      posts: [{ x: 34, y: 202, w: 16, h: 280 }, { x: 140, y: 202, w: 16, h: 200 }],
      landing: { x: 476, y: 900, w: 206, h: 30 },
      landPosts: [{ x: 498, y: 930, w: 16, h: 110 }, { x: 640, y: 930, w: 16, h: 110 }],
      flag: { x: 596, y: 900 },
      star: { x: 338, y: 742 },
      extras: [{ type: "wall", x: 424, y: 510, w: 24, h: 198 }],
      reference: [[
        { x: 164, y: 188 }, { x: 218, y: 304 }, { x: 270, y: 450 },
        { x: 316, y: 606 }, { x: 334, y: 704 }, { x: 364, y: 770 },
        { x: 416, y: 838 }, { x: 488, y: 898 }
      ]],
      push: { x: 2.28, y: 0.08 },
      driveMs: 2200,
      physics: { gravityY: 1.72, stability: 0.007, suspensionDamping: 0.28 },
      friction: { track: 0.91, land: 0.74 }
    },
    {
      id: "yard-05",
      name: "Pin Curl",
      difficulty: 6,
      objective: "PIN TO PIN · curl below the block",
      inkMax: 640,
      rules: {
        maxStrokes: 1,
        material: "chalk",
        parInk: 0.92,
        drawZones: [{ x: 160, y: 368, w: 382, h: 476 }],
        noDrawZones: [{ x: 398, y: 580, w: 72, h: 126 }],
        anchors: [{ x: 180, y: 380 }, { x: 512, y: 796 }]
      },
      contract: { maxImpact: 13.5, maxAngle: 0.72 },
      ledge: { x: 16, y: 292, w: 150, h: 26 },
      backstop: { x: 8, y: 210, w: 16, h: 88 },
      posts: [{ x: 28, y: 318, w: 16, h: 250 }, { x: 132, y: 318, w: 16, h: 180 }],
      landing: { x: 528, y: 812, w: 140, h: 22 },
      landPosts: [{ x: 542, y: 834, w: 12, h: 150 }, { x: 642, y: 834, w: 12, h: 150 }],
      flag: { x: 602, y: 812 },
      star: { x: 360, y: 758 },
      extras: [{ type: "wall", x: 426, y: 588, w: 30, h: 112 }],
      reference: [[
        { x: 180, y: 380 }, { x: 226, y: 448 }, { x: 260, y: 550 },
        { x: 282, y: 666 }, { x: 320, y: 730 }, { x: 378, y: 758 },
        { x: 438, y: 778 }, { x: 480, y: 786 }, { x: 512, y: 796 }
      ]],
      push: { x: 2.42, y: 0.1 },
      driveMs: 2400,
      physics: { gravityY: 1.64, stability: 0.006, inertiaScale: 1.4 },
      friction: { track: 0.78, land: 0.72 }
    },
    {
      id: "yard-06",
      name: "Thread And Fly",
      difficulty: 7,
      objective: "DOWN 1 · GAP 2 · land clean",
      inkMax: 780,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 318, w: 230, h: 360 }, { x: 340, y: 648, w: 230, h: 236 }],
        noDrawZones: [{ x: 330, y: 532, w: 112, h: 106 }]
      },
      contract: { minAirMs: 90, maxAngle: 0.92 },
      checkpoints: [
        { id: "drop-ring", x: 292, y: 552, r: 32, direction: "down", minAxisSpeed: 2.5 },
        { id: "gap-ring", x: 374, y: 682, r: 32, direction: "right", minSpeed: 3.6 }
      ],
      ledge: { x: 16, y: 318, w: 142, h: 26 },
      backstop: { x: 8, y: 236, w: 16, h: 88 },
      posts: [{ x: 28, y: 344, w: 16, h: 230 }, { x: 126, y: 344, w: 16, h: 160 }],
      landing: { x: 548, y: 868, w: 156, h: 30 },
      landPosts: [{ x: 568, y: 898, w: 16, h: 120 }, { x: 664, y: 898, w: 16, h: 120 }],
      flag: { x: 646, y: 868 },
      star: { x: 514, y: 690 },
      extras: [
        { type: "wall", x: 360, y: 536, w: 24, h: 98 }
      ],
      reference: [
        [
          { x: 148, y: 328 }, { x: 208, y: 408 }, { x: 276, y: 540 },
          { x: 306, y: 622 }, { x: 334, y: 660 }
        ],
        [{ x: 348, y: 666 }, { x: 396, y: 704 }, { x: 448, y: 758 }, { x: 500, y: 818 }, { x: 552, y: 866 }]
      ],
      push: { x: 2.58, y: 0.1 },
      driveMs: 2500,
      physics: { gravityY: 1.69, stability: 0.005, inertiaScale: 1.38, driveMax: 0.48 },
      friction: { track: 0.82, land: 0.7 }
    },
    {
      id: "yard-07",
      name: "Rubber Launch",
      difficulty: 8,
      objective: "RUBBER DROP · fly through the ring",
      inkMax: 800,
      rules: {
        maxStrokes: 2,
        material: "rubber",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 338, w: 260, h: 306 }, { x: 438, y: 654, w: 164, h: 130 }],
        noDrawZones: [{ x: 408, y: 674, w: 30, h: 96 }]
      },
      contract: { minAirMs: 50 },
      checkpoints: [
        { id: "air-ring", x: 426, y: 654, r: 35, direction: "right", minSpeed: 4.0 }
      ],
      ledge: { x: 16, y: 336, w: 150, h: 26 },
      backstop: { x: 8, y: 252, w: 16, h: 90 },
      posts: [{ x: 28, y: 362, w: 16, h: 230 }, { x: 132, y: 362, w: 16, h: 160 }],
      landing: { x: 480, y: 750, w: 222, h: 30 },
      landPosts: [{ x: 502, y: 780, w: 16, h: 170 }, { x: 660, y: 780, w: 16, h: 170 }],
      flag: { x: 626, y: 750 },
      star: { x: 424, y: 596 },
      extras: [],
      reference: [
        [
          { x: 154, y: 348 }, { x: 214, y: 374 }, { x: 272, y: 436 },
          { x: 330, y: 524 }, { x: 382, y: 620 }
        ],
        [{ x: 440, y: 666 }, { x: 478, y: 700 }, { x: 520, y: 748 }]
      ],
      push: { x: 2.65, y: 0.1 },
      driveMs: 2500,
      physics: {
        gravityY: 1.75,
        stability: 0.011,
        inertiaScale: 1.68,
        rubberBounce: 0.3,
        suspensionStiffness: 0.62,
        suspensionDamping: 0.17,
        driveMax: 0.5
      },
      friction: { track: 0.28, land: 0.7 }
    },
    {
      id: "yard-08",
      name: "Ice Valley",
      difficulty: 8,
      objective: "ICE SPEED · clear the long gap",
      inkMax: 800,
      rules: {
        maxStrokes: 1,
        material: "ice",
        parInk: 0.92,
        drawZones: [{ x: 154, y: 354, w: 400, h: 520 }]
      },
      contract: { minSpeed: 4.0, minAirMs: 150 },
      checkpoints: [
        { id: "speed-down", x: 300, y: 620, r: 31, direction: "down", minSpeed: 4.2 },
        { id: "speed-air", x: 466, y: 716, r: 31, direction: "right", minSpeed: 5.0 }
      ],
      ledge: { x: 16, y: 356, w: 160, h: 26 },
      backstop: { x: 8, y: 272, w: 16, h: 90 },
      posts: [{ x: 28, y: 382, w: 16, h: 220 }, { x: 140, y: 382, w: 16, h: 150 }],
      landing: { x: 480, y: 760, w: 222, h: 32, ice: true, friction: 0.012 },
      landPosts: [{ x: 502, y: 792, w: 16, h: 170 }, { x: 660, y: 792, w: 16, h: 170 }],
      flag: { x: 620, y: 760 },
      star: { x: 468, y: 666 },
      extras: [],
      reference: [[
        { x: 170, y: 368 }, { x: 226, y: 464 }, { x: 286, y: 588 },
        { x: 346, y: 680 }, { x: 414, y: 716 }
      ]],
      push: { x: 3.2, y: 0.08 },
      driveMs: 1800,
      physics: {
        gravityY: 1.62,
        stability: 0.003,
        inertiaScale: 1.3,
        iceFriction: 0.008,
        iceBounce: 0.12,
        driveMax: 0.56,
        driveAdd: 0.034
      },
      friction: { track: 0.008, land: 0.012 }
    },
    {
      id: "yard-09",
      name: "Headwind Gap",
      difficulty: 9,
      objective: "HEADWIND · launch through the gap",
      inkMax: 800,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 270, w: 258, h: 440 }, { x: 468, y: 580, w: 126, h: 250 }],
        noDrawZones: [{ x: 398, y: 520, w: 68, h: 218 }]
      },
      contract: { minAirMs: 80 },
      checkpoints: [
        { id: "wind-ring", x: 436, y: 646, r: 34, direction: "right", minSpeed: 4.2 }
      ],
      fields: [{ type: "wind", x: 250, y: 286, w: 286, h: 440, forceX: -0.00012 }],
      ledge: { x: 16, y: 268, w: 142, h: 26 },
      backstop: { x: 8, y: 186, w: 16, h: 88 },
      posts: [{ x: 28, y: 294, w: 16, h: 250 }, { x: 126, y: 294, w: 16, h: 180 }],
      landing: { x: 510, y: 820, w: 192, h: 30 },
      landPosts: [{ x: 532, y: 850, w: 16, h: 140 }, { x: 660, y: 850, w: 16, h: 140 }],
      flag: { x: 628, y: 820 },
      star: { x: 440, y: 586 },
      extras: [{ type: "wall", x: 420, y: 704, w: 22, h: 116 }],
      reference: [
        [
          { x: 148, y: 278 }, { x: 204, y: 358 }, { x: 260, y: 452 },
          { x: 316, y: 548 }, { x: 388, y: 620 }
        ],
        [{ x: 472, y: 674 }, { x: 510, y: 728 }, { x: 550, y: 818 }]
      ],
      push: { x: 2.82, y: 0.1 },
      driveMs: 2500,
      physics: { gravityY: 1.82, stability: 0.003, inertiaScale: 1.25, driveMax: 0.52, driveAdd: 0.03 },
      friction: { track: 0.82, land: 0.7 }
    },
    {
      id: "yard-10",
      name: "Egg Steps",
      difficulty: 9,
      objective: "TWO SOFT CATCHES · save the eggs",
      inkMax: 760,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 168, y: 300, w: 212, h: 320 }, { x: 390, y: 590, w: 164, h: 280 }],
        noDrawZones: [{ x: 374, y: 582, w: 16, h: 92 }]
      },
      contract: { cargoMaxImpact: 13, maxAngle: 0.72 },
      cargo: { label: "EGGS" },
      checkpoints: [
        { id: "first-catch", x: 336, y: 548, r: 30, direction: "down", maxSpeed: 14 },
        { id: "second-catch", x: 484, y: 730, r: 30, direction: "down", maxSpeed: 13 }
      ],
      ledge: { x: 18, y: 300, w: 168, h: 28 },
      backstop: { x: 10, y: 218, w: 16, h: 88 },
      posts: [{ x: 32, y: 328, w: 18, h: 220 }, { x: 148, y: 328, w: 18, h: 160 }],
      landing: { x: 510, y: 840, w: 192, h: 34 },
      landPosts: [{ x: 534, y: 874, w: 18, h: 140 }, { x: 660, y: 874, w: 18, h: 140 }],
      flag: { x: 626, y: 840 },
      star: { x: 410, y: 638 },
      extras: [],
      reference: [
        [
          { x: 178, y: 302 }, { x: 206, y: 306 }, { x: 234, y: 324 },
          { x: 262, y: 356 }, { x: 288, y: 400 }, { x: 312, y: 452 },
          { x: 334, y: 510 }, { x: 352, y: 560 }, { x: 368, y: 596 }
        ],
        [{ x: 396, y: 602 }, { x: 430, y: 634 }, { x: 472, y: 704 }, { x: 506, y: 778 }, { x: 536, y: 838 }]
      ],
      push: { x: 2.25, y: 0.06 },
      driveMs: 1200,
      physics: {
        gravityY: 1.62,
        stability: 0.005,
        inertiaScale: 1.4,
        suspensionStiffness: 0.64,
        suspensionDamping: 0.4,
        wheelBounce: 0.035
      },
      friction: { track: 0.91, land: 0.94 }
    },
    {
      id: "yard-11",
      name: "Gravity Gate",
      difficulty: 10,
      objective: "DIVE 1 · FLY 2 · keep momentum",
      inkMax: 820,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 134, y: 286, w: 248, h: 438 }, { x: 410, y: 724, w: 176, h: 124 }],
        noDrawZones: [{ x: 382, y: 630, w: 28, h: 176 }]
      },
      contract: { minSpeed: 2.2, minAirMs: 110, maxAngle: 0.86 },
      checkpoints: [
        { id: "deep-ring", x: 310, y: 606, r: 34, direction: "down", minAxisSpeed: 2.8 },
        { id: "gate-ring", x: 430, y: 708, r: 34, direction: "right", minSpeed: 4.6 }
      ],
      ledge: { x: 16, y: 292, w: 148, h: 26 },
      backstop: { x: 8, y: 210, w: 16, h: 88 },
      posts: [{ x: 28, y: 318, w: 16, h: 240 }, { x: 132, y: 318, w: 16, h: 170 }],
      landing: { x: 520, y: 820, w: 182, h: 30 },
      landPosts: [{ x: 542, y: 850, w: 16, h: 150 }, { x: 660, y: 850, w: 16, h: 150 }],
      flag: { x: 632, y: 820 },
      star: { x: 432, y: 650 },
      extras: [],
      reference: [
        [
          { x: 150, y: 302 }, { x: 204, y: 396 }, { x: 258, y: 516 },
          { x: 310, y: 622 }, { x: 368, y: 680 }
        ],
        [{ x: 416, y: 734 }, { x: 458, y: 762 }, { x: 500, y: 794 }, { x: 538, y: 818 }]
      ],
      push: { x: 2.78, y: 0.08 },
      driveMs: 2200,
      physics: { gravityY: 1.84, stability: 0.003, inertiaScale: 1.28, driveMax: 0.52, driveAdd: 0.03 },
      friction: { track: 0.86, land: 0.92 }
    },
    {
      id: "yard-12",
      name: "Yard Boss",
      difficulty: 10,
      objective: "DIVE · FLY · CATCH · PARK",
      inkMax: 1100,
      rules: {
        maxStrokes: 2,
        material: "rubber",
        parInk: 0.92,
        drawZones: [{ x: 126, y: 224, w: 284, h: 470 }, { x: 468, y: 686, w: 172, h: 194 }],
        noDrawZones: [{ x: 410, y: 580, w: 58, h: 218 }]
      },
      contract: { minAirMs: 100, maxSpeed: 3.8, maxAngle: 0.5, settleMs: 460 },
      checkpoints: [
        { id: "boss-dive", x: 318, y: 548, r: 32, direction: "down", minAxisSpeed: 2.8 },
        { id: "boss-air", x: 450, y: 672, r: 34, direction: "down", minAxisSpeed: 2.2 },
        { id: "boss-brake", x: 562, y: 806, r: 31, direction: "down", minAxisSpeed: 1.6, maxSpeed: 9.2 }
      ],
      fields: [{ type: "wind", x: 244, y: 252, w: 250, h: 400, forceX: -0.0001 }],
      ledge: { x: 18, y: 220, w: 128, h: 24 },
      backstop: { x: 10, y: 142, w: 16, h: 84 },
      posts: [{ x: 30, y: 244, w: 14, h: 198 }, { x: 118, y: 244, w: 14, h: 108 }],
      landing: { x: 606, y: 850, w: 96, h: 22 },
      landPosts: [{ x: 618, y: 872, w: 12, h: 126 }, { x: 678, y: 872, w: 12, h: 126 }],
      flag: { x: 654, y: 850 },
      star: { x: 454, y: 612 },
      extras: [{ type: "wall", x: 694, y: 770, w: 12, h: 80, restitution: 0.02 }],
      reference: [
        [
          { x: 136, y: 232 }, { x: 204, y: 316 }, { x: 272, y: 448 },
          { x: 330, y: 566 }, { x: 392, y: 628 }
        ],
        [
          { x: 474, y: 698 }, { x: 512, y: 742 }, { x: 566, y: 818 },
          { x: 604, y: 850 }
        ]
      ],
      push: { x: 2.48, y: 0.05 },
      driveMs: 1800,
      physics: {
        gravityY: 1.92,
        stability: 0.012,
        inertiaScale: 1.8,
        rubberBounce: 0.25,
        suspensionStiffness: 0.6,
        suspensionDamping: 0.28,
        driveMax: 0.32,
        driveAdd: 0.018
      },
      friction: { track: 0.25, land: 0.96 }
    }
  ];

  root.RML_LEVELS = LEVELS;
})(typeof window !== "undefined" ? window : this);
