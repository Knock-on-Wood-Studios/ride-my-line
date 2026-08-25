/* Ride My Line — launch mastery yards 13–25. Data only. */
(function (root) {
  "use strict";

  var LEVELS = [
    {
      id: "yard-13",
      name: "Tailwind Turn",
      difficulty: 11,
      objective: "DIVE · CATCH THE TAILWIND · FLY",
      inkMax: 800,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 318, w: 230, h: 360 }, { x: 340, y: 648, w: 230, h: 236 }],
        noDrawZones: [{ x: 330, y: 532, w: 112, h: 106 }]
      },
      contract: { minAirMs: 90, maxAngle: 0.92 },
      checkpoints: [
        { id: "tailwind-dive", x: 292, y: 552, r: 32, direction: "down", minAxisSpeed: 2.5 },
        { id: "tailwind-gap", x: 374, y: 682, r: 32, direction: "right", minSpeed: 3.6 }
      ],
      fields: [{ type: "wind", x: 250, y: 360, w: 270, h: 390, forceX: 0.00002 }],
      ledge: { x: 16, y: 318, w: 142, h: 26 },
      backstop: { x: 8, y: 236, w: 16, h: 88 },
      posts: [{ x: 28, y: 344, w: 16, h: 230 }, { x: 126, y: 344, w: 16, h: 160 }],
      landing: { x: 548, y: 868, w: 156, h: 30 },
      landPosts: [{ x: 568, y: 898, w: 16, h: 120 }, { x: 664, y: 898, w: 16, h: 120 }],
      flag: { x: 646, y: 868 },
      star: { x: 514, y: 690 },
      extras: [{ type: "wall", x: 360, y: 536, w: 24, h: 98 }],
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
      id: "yard-14",
      name: "Ice Needle",
      difficulty: 11,
      objective: "ICE LINE · THREAD BOTH RINGS",
      inkMax: 820,
      rules: {
        maxStrokes: 1,
        material: "ice",
        parInk: 0.9,
        drawZones: [{ x: 154, y: 354, w: 400, h: 520 }],
        noDrawZones: [{ x: 350, y: 372, w: 92, h: 170 }]
      },
      contract: { minSpeed: 4.2, minAirMs: 140 },
      checkpoints: [
        { id: "needle-drop", x: 300, y: 620, r: 30, direction: "down", minSpeed: 4.1 },
        { id: "needle-eye", x: 466, y: 716, r: 28, direction: "right", minSpeed: 4.8 }
      ],
      ledge: { x: 16, y: 356, w: 160, h: 26 },
      backstop: { x: 8, y: 272, w: 16, h: 90 },
      posts: [{ x: 28, y: 382, w: 16, h: 220 }, { x: 140, y: 382, w: 16, h: 150 }],
      landing: { x: 480, y: 760, w: 222, h: 32, ice: true, friction: 0.012 },
      landPosts: [{ x: 502, y: 792, w: 16, h: 170 }, { x: 660, y: 792, w: 16, h: 170 }],
      flag: { x: 620, y: 760 },
      star: { x: 420, y: 646 },
      extras: [{ type: "wall", x: 392, y: 370, w: 24, h: 160, restitution: 0.04 }],
      reference: [[
        { x: 170, y: 368 }, { x: 226, y: 464 }, { x: 286, y: 588 },
        { x: 346, y: 680 }, { x: 414, y: 716 }
      ]],
      push: { x: 3.24, y: 0.08 },
      driveMs: 1850,
      physics: {
        gravityY: 1.66,
        stability: 0.003,
        inertiaScale: 1.28,
        iceFriction: 0.007,
        iceBounce: 0.1,
        driveMax: 0.58,
        driveAdd: 0.035
      },
      friction: { track: 0.007, land: 0.012 }
    },
    {
      id: "yard-15",
      name: "Rubber Relay",
      difficulty: 11,
      objective: "BOUNCE 1 · CATCH 2 · KEEP MOVING",
      inkMax: 820,
      rules: {
        maxStrokes: 2,
        material: "rubber",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 338, w: 260, h: 306 }, { x: 438, y: 654, w: 164, h: 130 }],
        noDrawZones: [{ x: 408, y: 650, w: 30, h: 120 }]
      },
      contract: { minAirMs: 90, minSpeed: 2.4 },
      checkpoints: [
        { id: "relay-bounce", x: 360, y: 584, r: 32, direction: "down", minAxisSpeed: 2.3 },
        { id: "relay-pass", x: 426, y: 654, r: 35, direction: "right", minSpeed: 4.0 }
      ],
      fields: [{ type: "wind", x: 260, y: 408, w: 236, h: 294, forceX: -0.00005 }],
      ledge: { x: 16, y: 336, w: 150, h: 26 },
      backstop: { x: 8, y: 252, w: 16, h: 90 },
      posts: [{ x: 28, y: 362, w: 16, h: 230 }, { x: 132, y: 362, w: 16, h: 160 }],
      landing: { x: 480, y: 750, w: 222, h: 30 },
      landPosts: [{ x: 502, y: 780, w: 16, h: 170 }, { x: 660, y: 780, w: 16, h: 170 }],
      flag: { x: 626, y: 750 },
      star: { x: 424, y: 596 },
      extras: [{ type: "wall", x: 416, y: 674, w: 18, h: 92, restitution: 0.12 }],
      reference: [
        [
          { x: 154, y: 348 }, { x: 214, y: 374 }, { x: 272, y: 436 },
          { x: 330, y: 524 }, { x: 382, y: 620 }
        ],
        [{ x: 444, y: 666 }, { x: 478, y: 700 }, { x: 520, y: 748 }]
      ],
      push: { x: 2.74, y: 0.1 },
      driveMs: 2600,
      physics: {
        gravityY: 1.78,
        stability: 0.01,
        inertiaScale: 1.7,
        rubberBounce: 0.32,
        suspensionStiffness: 0.62,
        suspensionDamping: 0.18,
        driveMax: 0.52
      },
      friction: { track: 0.27, land: 0.72 }
    },
    {
      id: "yard-16",
      name: "Pin Drop",
      difficulty: 12,
      objective: "PIN TO PIN · DROP LEFT OF THE POST",
      inkMax: 750,
      rules: {
        maxStrokes: 1,
        material: "chalk",
        parInk: 0.91,
        drawZones: [{ x: 152, y: 286, w: 396, h: 558 }],
        noDrawZones: [{ x: 394, y: 526, w: 78, h: 184 }],
        anchors: [{ x: 174, y: 302 }, { x: 520, y: 812 }]
      },
      contract: { maxImpact: 12.8, maxAngle: 0.76 },
      checkpoints: [{ id: "pin-drop-ring", x: 328, y: 654, r: 34, direction: "down", minAxisSpeed: 2.2 }],
      fields: [{ type: "wind", x: 196, y: 382, w: 246, h: 380, forceX: 0.00004 }],
      ledge: { x: 16, y: 214, w: 150, h: 26 },
      backstop: { x: 8, y: 132, w: 16, h: 88 },
      posts: [{ x: 28, y: 240, w: 16, h: 250 }, { x: 132, y: 240, w: 16, h: 180 }],
      landing: { x: 536, y: 826, w: 132, h: 24 },
      landPosts: [{ x: 550, y: 850, w: 12, h: 150 }, { x: 642, y: 850, w: 12, h: 150 }],
      flag: { x: 608, y: 826 },
      star: { x: 364, y: 742 },
      extras: [{ type: "wall", x: 420, y: 536, w: 28, h: 164 }],
      reference: [[
        { x: 174, y: 302 }, { x: 220, y: 374 }, { x: 256, y: 486 },
        { x: 278, y: 614 }, { x: 314, y: 704 }, { x: 372, y: 758 },
        { x: 438, y: 786 }, { x: 486, y: 800 }, { x: 520, y: 812 }
      ]],
      push: { x: 2.48, y: 0.1 },
      driveMs: 2500,
      physics: { gravityY: 1.76, stability: 0.006, inertiaScale: 1.42, suspensionDamping: 0.3 },
      friction: { track: 0.8, land: 0.76 }
    },
    {
      id: "yard-17",
      name: "Eggs In Flight",
      difficulty: 12,
      objective: "TWO SOFT CATCHES · ONE CLEAN JUMP",
      inkMax: 790,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 168, y: 300, w: 212, h: 320 }, { x: 390, y: 590, w: 164, h: 280 }],
        noDrawZones: [{ x: 374, y: 574, w: 16, h: 104 }]
      },
      contract: { cargoMaxImpact: 13.2, maxAngle: 0.72, minAirMs: 60 },
      cargo: { label: "EGGS" },
      checkpoints: [
        { id: "egg-catch", x: 336, y: 548, r: 30, direction: "down", maxSpeed: 14 },
        { id: "egg-flight", x: 390, y: 620, r: 28, direction: "right", minSpeed: 2.6 },
        { id: "egg-landing", x: 484, y: 730, r: 30, direction: "down", maxSpeed: 13 }
      ],
      ledge: { x: 18, y: 300, w: 168, h: 28 },
      backstop: { x: 10, y: 218, w: 16, h: 88 },
      posts: [{ x: 32, y: 328, w: 18, h: 220 }, { x: 148, y: 328, w: 18, h: 160 }],
      landing: { x: 510, y: 840, w: 192, h: 34 },
      landPosts: [{ x: 534, y: 874, w: 18, h: 140 }, { x: 660, y: 874, w: 18, h: 140 }],
      flag: { x: 626, y: 840 },
      star: { x: 410, y: 650 },
      extras: [{ type: "wall", x: 376, y: 584, w: 12, h: 82, restitution: 0.02 }],
      reference: [
        [
          { x: 178, y: 302 }, { x: 206, y: 306 }, { x: 234, y: 324 },
          { x: 262, y: 356 }, { x: 288, y: 400 }, { x: 312, y: 452 },
          { x: 334, y: 510 }, { x: 352, y: 560 }, { x: 368, y: 596 }
        ],
        [{ x: 396, y: 602 }, { x: 430, y: 634 }, { x: 472, y: 704 }, { x: 506, y: 778 }, { x: 536, y: 838 }]
      ],
      push: { x: 2.3, y: 0.06 },
      driveMs: 1300,
      physics: {
        gravityY: 1.66,
        stability: 0.005,
        inertiaScale: 1.42,
        suspensionStiffness: 0.64,
        suspensionDamping: 0.4,
        wheelBounce: 0.03
      },
      friction: { track: 0.9, land: 0.94 }
    },
    {
      id: "yard-18",
      name: "Brake Check",
      difficulty: 12,
      objective: "DIVE · REBOUND · PARK BELOW 4",
      inkMax: 1120,
      rules: {
        maxStrokes: 2,
        material: "rubber",
        parInk: 0.92,
        drawZones: [{ x: 126, y: 224, w: 284, h: 470 }, { x: 468, y: 686, w: 172, h: 194 }],
        noDrawZones: [{ x: 410, y: 580, w: 58, h: 218 }]
      },
      contract: { minAirMs: 100, maxSpeed: 3.8, maxAngle: 0.5, settleMs: 460 },
      checkpoints: [
        { id: "brake-dive", x: 318, y: 548, r: 32, direction: "down", minAxisSpeed: 2.8 },
        { id: "brake-air", x: 450, y: 672, r: 34, direction: "down", minAxisSpeed: 2.2 },
        { id: "brake-pad", x: 562, y: 806, r: 31, direction: "down", minAxisSpeed: 1.6, maxSpeed: 9.2 }
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
        [{ x: 474, y: 698 }, { x: 512, y: 742 }, { x: 566, y: 818 }, { x: 604, y: 850 }]
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
    },
    {
      id: "yard-19",
      name: "Triple Stitch",
      difficulty: 13,
      objective: "THREE LINES · STITCH TWO GAPS",
      inkMax: 790,
      rules: {
        maxStrokes: 3,
        material: "chalk",
        parInk: 0.91,
        drawZones: [
          { x: 168, y: 370, w: 100, h: 166 },
          { x: 286, y: 536, w: 78, h: 120 },
          { x: 388, y: 638, w: 178, h: 166 }
        ],
        noDrawZones: [{ x: 268, y: 506, w: 14, h: 58 }, { x: 364, y: 596, w: 18, h: 108 }]
      },
      contract: { minAirMs: 120, maxAngle: 1.0 },
      checkpoints: [
        { id: "stitch-one", x: 278, y: 538, r: 30, direction: "right", minSpeed: 2.8 },
        { id: "stitch-two", x: 378, y: 650, r: 36, direction: "right", minSpeed: 3.0 }
      ],
      ledge: { x: 16, y: 378, w: 176, h: 28 },
      backstop: { x: 8, y: 294, w: 16, h: 90 },
      posts: [{ x: 30, y: 406, w: 18, h: 210 }, { x: 154, y: 406, w: 16, h: 145 }],
      landing: { x: 520, y: 790, w: 182, h: 34 },
      landPosts: [{ x: 542, y: 824, w: 18, h: 150 }, { x: 660, y: 824, w: 18, h: 150 }],
      flag: { x: 630, y: 790 },
      star: { x: 382, y: 612 },
      extras: [
        { type: "wall", x: 270, y: 512, w: 10, h: 46 }
      ],
      reference: [
        [{ x: 184, y: 390 }, { x: 220, y: 432 }, { x: 246, y: 478 }, { x: 260, y: 518 }],
        [{ x: 290, y: 548 }, { x: 314, y: 590 }, { x: 338, y: 626 }, { x: 356, y: 646 }],
        [{ x: 390, y: 658 }, { x: 430, y: 698 }, { x: 476, y: 742 }, { x: 524, y: 788 }]
      ],
      push: { x: 3.15, y: 0.08 },
      driveMs: 3000,
      physics: { gravityY: 1.54, stability: 0.008, inertiaScale: 1.45, driveMax: 0.56, driveAdd: 0.034 },
      friction: { track: 0.8, land: 0.8 }
    },
    {
      id: "yard-20",
      name: "Crosswind Canyon",
      difficulty: 13,
      objective: "HEADWIND · TAILWIND · HOLD THE GAP",
      inkMax: 830,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 270, w: 258, h: 440 }, { x: 468, y: 580, w: 126, h: 250 }],
        noDrawZones: [{ x: 398, y: 520, w: 68, h: 218 }]
      },
      contract: { minAirMs: 90, minSpeed: 2.2 },
      checkpoints: [
        { id: "crosswind-down", x: 330, y: 568, r: 32, direction: "down", minAxisSpeed: 2.4 },
        { id: "crosswind-gap", x: 436, y: 646, r: 34, direction: "right", minSpeed: 4.2 }
      ],
      fields: [
        { type: "wind", x: 250, y: 286, w: 178, h: 440, forceX: -0.00012 },
        { type: "wind", x: 428, y: 440, w: 112, h: 300, forceX: 0.000005 }
      ],
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
      push: { x: 2.78, y: 0.1 },
      driveMs: 2500,
      physics: { gravityY: 1.82, stability: 0.004, inertiaScale: 1.26, driveMax: 0.52, driveAdd: 0.03 },
      friction: { track: 0.82, land: 0.72 }
    },
    {
      id: "yard-21",
      name: "Ice Slalom",
      difficulty: 13,
      objective: "ICE SPEED · THREAD THE POSTS",
      inkMax: 830,
      rules: {
        maxStrokes: 1,
        material: "ice",
        parInk: 0.91,
        drawZones: [{ x: 150, y: 344, w: 414, h: 540 }],
        noDrawZones: [{ x: 324, y: 392, w: 72, h: 126 }, { x: 420, y: 548, w: 62, h: 102 }]
      },
      contract: { minSpeed: 4.4, minAirMs: 120 },
      checkpoints: [
        { id: "slalom-low", x: 300, y: 620, r: 30, direction: "down", minSpeed: 4.1 },
        { id: "slalom-out", x: 470, y: 720, r: 30, direction: "right", minSpeed: 5.0 }
      ],
      ledge: { x: 16, y: 346, w: 160, h: 26 },
      backstop: { x: 8, y: 262, w: 16, h: 90 },
      posts: [{ x: 28, y: 372, w: 16, h: 220 }, { x: 140, y: 372, w: 16, h: 150 }],
      landing: { x: 484, y: 766, w: 218, h: 32, ice: true, friction: 0.011 },
      landPosts: [{ x: 506, y: 798, w: 16, h: 170 }, { x: 660, y: 798, w: 16, h: 170 }],
      flag: { x: 622, y: 766 },
      star: { x: 444, y: 672 },
      extras: [
        { type: "wall", x: 348, y: 400, w: 22, h: 108, restitution: 0.04 },
        { type: "wall", x: 438, y: 556, w: 20, h: 84, restitution: 0.04 }
      ],
      reference: [[
        { x: 170, y: 358 }, { x: 224, y: 456 }, { x: 282, y: 584 },
        { x: 344, y: 682 }, { x: 416, y: 724 }
      ]],
      push: { x: 3.3, y: 0.08 },
      driveMs: 1900,
      physics: {
        gravityY: 1.7,
        stability: 0.003,
        inertiaScale: 1.28,
        iceFriction: 0.006,
        iceBounce: 0.11,
        driveMax: 0.59,
        driveAdd: 0.036
      },
      friction: { track: 0.006, land: 0.011 }
    },
    {
      id: "yard-22",
      name: "Pinned Parcel",
      difficulty: 14,
      objective: "FOUR PINS · DELIVER THE JARS",
      inkMax: 800,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.91,
        drawZones: [{ x: 168, y: 296, w: 212, h: 324 }, { x: 390, y: 588, w: 170, h: 286 }],
        noDrawZones: [{ x: 374, y: 580, w: 16, h: 96 }],
        anchors: [{ x: 178, y: 302 }, { x: 368, y: 596 }, { x: 396, y: 602 }, { x: 536, y: 838 }]
      },
      contract: { cargoMaxImpact: 13.4, maxAngle: 0.7 },
      cargo: { label: "JARS" },
      checkpoints: [
        { id: "parcel-one", x: 336, y: 548, r: 30, direction: "down", maxSpeed: 14 },
        { id: "parcel-two", x: 484, y: 730, r: 30, direction: "down", maxSpeed: 13 }
      ],
      ledge: { x: 18, y: 300, w: 168, h: 28 },
      backstop: { x: 10, y: 218, w: 16, h: 88 },
      posts: [{ x: 32, y: 328, w: 18, h: 220 }, { x: 148, y: 328, w: 18, h: 160 }],
      landing: { x: 510, y: 840, w: 192, h: 34 },
      landPosts: [{ x: 534, y: 874, w: 18, h: 140 }, { x: 660, y: 874, w: 18, h: 140 }],
      flag: { x: 626, y: 840 },
      star: { x: 410, y: 638 },
      extras: [{ type: "wall", x: 376, y: 586, w: 12, h: 82, restitution: 0.02 }],
      reference: [
        [
          { x: 178, y: 302 }, { x: 206, y: 306 }, { x: 234, y: 324 },
          { x: 262, y: 356 }, { x: 288, y: 400 }, { x: 312, y: 452 },
          { x: 334, y: 510 }, { x: 352, y: 560 }, { x: 368, y: 596 }
        ],
        [{ x: 396, y: 602 }, { x: 430, y: 634 }, { x: 472, y: 704 }, { x: 506, y: 778 }, { x: 536, y: 838 }]
      ],
      push: { x: 2.28, y: 0.06 },
      driveMs: 1300,
      physics: {
        gravityY: 1.68,
        stability: 0.005,
        inertiaScale: 1.44,
        suspensionStiffness: 0.64,
        suspensionDamping: 0.41,
        wheelBounce: 0.03
      },
      friction: { track: 0.91, land: 0.94 }
    },
    {
      id: "yard-23",
      name: "Rubber Ladder",
      difficulty: 14,
      objective: "THREE BOUNCES · CLIMB THE GAPS",
      inkMax: 850,
      rules: {
        maxStrokes: 3,
        material: "rubber",
        parInk: 0.91,
        drawZones: [
          { x: 142, y: 338, w: 142, h: 180 },
          { x: 292, y: 458, w: 112, h: 188 },
          { x: 438, y: 652, w: 166, h: 134 }
        ],
        noDrawZones: [{ x: 284, y: 438, w: 8, h: 102 }, { x: 404, y: 610, w: 34, h: 158 }]
      },
      contract: { minAirMs: 140, minSpeed: 2.2 },
      checkpoints: [
        { id: "ladder-one", x: 286, y: 468, r: 30, direction: "right", minSpeed: 3.0 },
        { id: "ladder-two", x: 422, y: 634, r: 32, direction: "right", minSpeed: 3.8 }
      ],
      ledge: { x: 16, y: 336, w: 150, h: 26 },
      backstop: { x: 8, y: 252, w: 16, h: 90 },
      posts: [{ x: 28, y: 362, w: 16, h: 230 }, { x: 132, y: 362, w: 16, h: 160 }],
      landing: { x: 480, y: 750, w: 222, h: 30 },
      landPosts: [{ x: 502, y: 780, w: 16, h: 170 }, { x: 660, y: 780, w: 16, h: 170 }],
      flag: { x: 626, y: 750 },
      star: { x: 424, y: 578 },
      extras: [
        { type: "wall", x: 282, y: 446, w: 8, h: 82, restitution: 0.12 },
        { type: "wall", x: 414, y: 620, w: 18, h: 136, restitution: 0.12 }
      ],
      reference: [
        [{ x: 154, y: 348 }, { x: 206, y: 370 }, { x: 252, y: 418 }, { x: 278, y: 486 }],
        [{ x: 300, y: 492 }, { x: 330, y: 534 }, { x: 360, y: 582 }, { x: 398, y: 630 }],
        [{ x: 444, y: 666 }, { x: 478, y: 700 }, { x: 520, y: 748 }]
      ],
      push: { x: 2.86, y: 0.1 },
      driveMs: 2800,
      physics: {
        gravityY: 1.8,
        stability: 0.01,
        inertiaScale: 1.72,
        rubberBounce: 0.36,
        suspensionStiffness: 0.62,
        suspensionDamping: 0.17,
        driveMax: 0.54
      },
      friction: { track: 0.26, land: 0.72 }
    },
    {
      id: "yard-24",
      name: "Storm Gate",
      difficulty: 14,
      objective: "BEAT THE GALE · HIT BOTH RINGS",
      inkMax: 840,
      rules: {
        maxStrokes: 2,
        material: "chalk",
        parInk: 0.9,
        drawZones: [{ x: 142, y: 270, w: 258, h: 440 }, { x: 468, y: 580, w: 126, h: 250 }],
        noDrawZones: [{ x: 398, y: 520, w: 68, h: 218 }]
      },
      contract: { minAirMs: 90 },
      checkpoints: [
        { id: "storm-dive", x: 326, y: 558, r: 30, direction: "down", minAxisSpeed: 2.5 },
        { id: "storm-gate", x: 436, y: 646, r: 32, direction: "right", minSpeed: 4.4 }
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
      id: "yard-25",
      name: "Backyard Crown",
      difficulty: 15,
      objective: "THREE LINES · THREE RINGS · PARK",
      inkMax: 1140,
      rules: {
        maxStrokes: 3,
        material: "rubber",
        parInk: 0.92,
        drawZones: [
          { x: 126, y: 224, w: 164, h: 310 },
          { x: 300, y: 486, w: 112, h: 214 },
          { x: 468, y: 686, w: 172, h: 194 }
        ],
        noDrawZones: [{ x: 290, y: 438, w: 10, h: 126 }, { x: 412, y: 580, w: 56, h: 218 }]
      },
      contract: { minAirMs: 150, maxSpeed: 3.9, maxAngle: 0.5, settleMs: 480 },
      checkpoints: [
        { id: "crown-dive", x: 318, y: 548, r: 34, direction: "down", minAxisSpeed: 2.6 },
        { id: "crown-flight", x: 450, y: 672, r: 36, direction: "down", minAxisSpeed: 2.0 },
        { id: "crown-park", x: 562, y: 806, r: 31, direction: "down", minAxisSpeed: 1.6, maxSpeed: 9.2 }
      ],
      fields: [
        { type: "wind", x: 220, y: 252, w: 170, h: 390, forceX: -0.0001 },
        { type: "wind", x: 390, y: 500, w: 120, h: 260, forceX: 0.00008 }
      ],
      ledge: { x: 18, y: 220, w: 128, h: 24 },
      backstop: { x: 10, y: 142, w: 16, h: 84 },
      posts: [{ x: 30, y: 244, w: 14, h: 198 }, { x: 118, y: 244, w: 14, h: 108 }],
      landing: { x: 606, y: 850, w: 96, h: 22 },
      landPosts: [{ x: 618, y: 872, w: 12, h: 126 }, { x: 678, y: 872, w: 12, h: 126 }],
      flag: { x: 654, y: 850 },
      star: { x: 454, y: 612 },
      extras: [
        { type: "wall", x: 292, y: 446, w: 8, h: 106, restitution: 0.12 },
        { type: "wall", x: 694, y: 770, w: 12, h: 80, restitution: 0.02 }
      ],
      reference: [
        [{ x: 136, y: 232 }, { x: 192, y: 298 }, { x: 242, y: 390 }, { x: 282, y: 512 }],
        [{ x: 308, y: 500 }, { x: 334, y: 560 }, { x: 366, y: 606 }, { x: 404, y: 636 }],
        [{ x: 474, y: 698 }, { x: 512, y: 742 }, { x: 566, y: 818 }, { x: 604, y: 850 }]
      ],
      push: { x: 2.72, y: 0.05 },
      driveMs: 2300,
      physics: {
        gravityY: 1.98,
        stability: 0.011,
        inertiaScale: 1.78,
        rubberBounce: 0.3,
        suspensionStiffness: 0.6,
        suspensionDamping: 0.27,
        driveMax: 0.36,
        driveAdd: 0.021
      },
      friction: { track: 0.24, land: 0.97 }
    }
  ];

  root.RML_LEVELS = (root.RML_LEVELS || []).concat(LEVELS);
})(typeof window !== "undefined" ? window : this);
