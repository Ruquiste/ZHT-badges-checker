/* ============================================================
   HARD CODING DATA
   ============================================================
   Structure: CHANNELS -> worlds -> regions -> badges

   For each badge:
     acronym    : short code shown on the left of the bar (e.g. "ToLTC")
     id         : the Roblox badge ID (number)
     fullName   : full badge name, hard-coded
     difficulty : a number from 1.00 to 11.99 (controls the bar/subbox color)
     length     : hard-coded text, e.g. "Short", "12 min", "Long"
     type       : hard-coded text, e.g. "Tower", "Obby", "Puzzle"

   To add a new region: copy a region block and change its "id"/"name".
   To add a new world: copy a whole world block.
   :thumbs_up:
   ============================================================ */

const CHANNELS = [
  {
    world: "World 1",
    regions: [
      {
        id: "region1",
        name: "Region 1 - Forgotten Grasslands",
        badges: [
          { acronym: "ToBE",  id: 2124799722,        fullName: "Tower of Beginner's Expedition", difficulty: 1.08, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToAK",  id: 2124841910,        fullName: "Tower of Anxious Knockoff", difficulty: 1.90, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToOPS", id: 2124841911,        fullName: "Tower of Outdoor Pipe System", difficulty: 2.41, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToLTC", id: 1521318689699521,  fullName: "Tower of Lengthy Tree Climbing", difficulty: 3.00, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToSP",  id: 2124841912,        fullName: "Tower of Simple Platforming", difficulty: 3.33, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToHPC", id: 2124841913,        fullName: "Tower of Horrible Placement Choices", difficulty: 4.24, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToSO",  id: 2124841914,        fullName: "Tower of Square One", difficulty: 4.82, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoUX",  id: 2148033909,        fullName: "Steeple of Uncovered Xeriscapes", difficulty: 4.99, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToD",   id: 2124841915,        fullName: "Tower of Doom", difficulty: 5.31, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToUC",  id: 2148033874,        fullName: "Tower of Unskilled Challenges", difficulty: 5.82, length: "30+ minutes", type: "Tower" },
          { acronym: "ATIG",  id: 2148033956,        fullName: "A Tower I Guess", difficulty: 6.06, length: "< 20 minutes", type: "Mini Tower" },
          { acronym: "ToCD",  id: 2148033989,        fullName: "Tower of Color Destruction", difficulty: 6.17, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToTV",  id: 2148034006,        fullName: "Tower of Thermal Velocity", difficulty: 7.63, length: "< 20 minutes", type: "Tower" },
          { acronym: "CoPV",  id: 2148066194,        fullName: "Citadel of Positive Vibes", difficulty: 7.68, length: "30+ minutes", type: "Citadel" },
          { acronym: "ToPO",  id: 2148066223,        fullName: "Tower of Purist Obsecurity", difficulty: 8.82, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToRQ",  id: 2148066240,        fullName: "Tower of Rage Quitting", difficulty: 9.76, length: "45+ minutes", type: "Tower" },
        ]
      },
      { id: "region1b", 
       name: "Region 1B - Nostalgic Realm", 
       badges: [
          { acronym: "SoHLD", id: 3794968535578504,  fullName: "Steeple of Happy Lazy Days", difficulty: 1.20, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoEC",  id: 672078790292046,   fullName: "Steeple of Easy Craziness", difficulty: 2.28, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToJ",   id: 649330960853266,   fullName: "Tower of Jumping", difficulty: 2.48, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToSC",  id: 4347589745118123,  fullName: "Tower of Screen Chopping", difficulty: 3.01, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoDE",  id: 4256519703384997,  fullName: "Steeple of Dark End", difficulty: 3.53, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoEM",  id: 2724214888498615,  fullName: "Steeple of Explosive Mayhem", difficulty: 4.20, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoFC",  id: 1653367870482742,  fullName: "Steeple of Flipping Chairs", difficulty: 4.78, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoHH",  id: 3291983064397201,  fullName: "Steeple of Harsh Harassments", difficulty: 5.53, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToA",   id: 1328126418835075,  fullName: "Tower of Annoyances", difficulty: 5.59, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoCFM", id: 1333182703431424,  fullName: "Steeple of Crazy Frame Madness", difficulty: 6.34, length: "30+ minutes", type: "Steeple" },
          { acronym: "ToUP",  id: 694820335237690,   fullName: "Tower of Unlimited Possibilities", difficulty: 6.58, length: "< 20 minutes", type: "Tower" },
          { acronym: "CoMaM", id: 2182665953282071,  fullName: "Citadel of Mix and Match", difficulty: 7.33, length: "30+ minutes", type: "Citadel" },
          { acronym: "SoSD",  id: 3282287603782711,  fullName: "Steeple of Slamo's Domain", difficulty: 7.72, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToW",   id: 4362578170541138,  fullName: "Tower of Wretchedness", difficulty: 8.33, length: "30+ minutes", type: "Tower" },
          { acronym: "SoI",   id: 1470185655236517,  fullName: "Steeple of Insanity", difficulty: 9.08, length: "< 20 minutes", type: "Steeple" },
      ] },
      { id: "region2", name: "Region 2 - Lapis Isle", badges: [
          // { acronym: "", id: 0, fullName: "", difficulty: 1.00, length: "", type: "" },
      ] },
      { id: "region2b", name: "Region 2B - Vast Ocean", badges: [
          // { acronym: "", id: 0, fullName: "", difficulty: 1.00, length: "", type: "" },
      ] },
      { id: "region3", name: "Region 3 - Glyphic Canyon", badges: [
          // { acronym: "", id: 0, fullName: "", difficulty: 1.00, length: "", type: "" },
      ] },
      { id: "region4", name: "Region 4 - Autumn Vale", badges: [
          // { acronym: "", id: 0, fullName: "", difficulty: 1.00, length: "", type: "" },
      ] },
    ]
  },

  // To add "World 2", copy this whole block and edit it:
  // {
  //   world: "World 2",
  //   regions: [
  //     { id: "region5", name: "Region 5 - ???", badges: [] },
  //   ]
  // },
];

/* Difficulty index -> color (RGB), used to tint the bar + sub-box.
   Edit these if you want different colors for each difficulty band. */
const DIFFICULTY_COLORS = [
  { min: 1,  max: 1.99,  rgb: [75, 151, 75]   },
  { min: 2,  max: 2.99,  rgb: [155, 155, 0]   },
  { min: 3,  max: 3.99,  rgb: [155, 75, 0]    },
  { min: 4,  max: 4.99,  rgb: [146, 53, 53]   },
  { min: 5,  max: 5.99,  rgb: [97, 0, 0]      },
  { min: 6,  max: 6.99,  rgb: [45, 60, 70]    },
  { min: 7,  max: 7.99,  rgb: [123, 0, 123]   },
  { min: 8,  max: 8.99,  rgb: [0, 32, 96]     },
  { min: 9,  max: 9.99,  rgb: [51, 88, 130]   },
  { min: 10, max: 10.99, rgb: [0, 155, 155]   },
  { min: 11, max: 11.99, rgb: [155, 155, 155] },
];

function getDifficultyColor(difficulty) {
  const d = Number(difficulty);
  const match = DIFFICULTY_COLORS.find(b => d >= b.min && d <= b.max);
  return match ? match.rgb : [130, 130, 130];
}
