/* ============================================================
   HARD-CODE YOUR BADGE DATA HERE
   ============================================================
   Structure: CHANNELS -> worlds -> regions -> badges

   For each badge, fill in:
     acronym    : short code shown on the left of the bar (e.g. "ToLTC")
     id         : the Roblox badge ID (number)
     fullName   : full badge name, hard-coded
     difficulty : a number from 1.00 to 11.99 (controls the bar/subbox color)
     length     : hard-coded text, e.g. "Short", "12 min", "Long"
     type       : hard-coded text, e.g. "Tower", "Obby", "Puzzle"

   description and winners (awardedCount) are pulled live from Roblox
   when you check a username, so you don't need to fill those in.

   To add a new region: copy a region block and change its "id"/"name".
   To add a new world: copy a whole world block.
   ============================================================ */

const CHANNELS = [
  {
    world: "World 1",
    regions: [
      {
        id: "region1",
        name: "Region 1 - Forgotten Grasslands",
        badges: [
          { acronym: "ToLTC", id: 1521318689699521, fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToSP",  id: 2124841912,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToHPC", id: 2124841913,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToSO",  id: 2124841914,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "SoUX",  id: 2148033909,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToD",   id: 2124841915,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToUC",  id: 2148033874,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ATIG",  id: 2148033956,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToCD",  id: 2148033989,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToTV",  id: 2148034006,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "CoPV",  id: 2148066194,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToPO",  id: 2148066223,        fullName: "", difficulty: 1.00, length: "", type: "" },
          { acronym: "ToRQ",  id: 2148066240,        fullName: "", difficulty: 1.00, length: "", type: "" },
        ]
      },
      { id: "region1b", name: "Region 1B - Nostalgic Realm", badges: [
          // { acronym: "", id: 0, fullName: "", difficulty: 1.00, length: "", type: "" },
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