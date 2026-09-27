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
          { acronym: "SoCFM", id: 1333182703431424,  fullName: "Steeple of Crazy Frame Madness", difficulty: 6.34, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToUP",  id: 694820335237690,   fullName: "Tower of Unlimited Possibilities", difficulty: 6.58, length: "< 20 minutes", type: "Tower" },
          { acronym: "CoMaM", id: 2182665953282071,  fullName: "Citadel of Mix and Match", difficulty: 7.33, length: "30+ minutes", type: "Citadel" },
          { acronym: "SoSD",  id: 3282287603782711,  fullName: "Steeple of Slamo's Domain", difficulty: 7.72, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToW",   id: 4362578170541138,  fullName: "Tower of Wretchedness", difficulty: 8.33, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoI",   id: 1470185655236517,  fullName: "Steeple of Insanity", difficulty: 9.08, length: "< 20 minutes", type: "Steeple" },
      ] },
      { id: "region2", 
       name: "Region 2 - Lapis Isle", 
       badges: [
          { acronym: "ToSOC", id: 2972915973088434,  fullName: "Tower of Starting Off Chaotically", difficulty: 1.52, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToBP",  id: 1860362851449575,  fullName: "Tower of Blissful Progression", difficulty: 2.13, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToSIO", id: 3391302145954985,  fullName: "Tower of Scaling Inside Out", difficulty: 3.68, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToCA",  id: 4202647302966725,  fullName: "Tower of Cylindrical Adventures", difficulty: 4.52, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToRSO", id: 3065293195984706,  fullName: "Tower of Rushed Short Obbies", difficulty: 5.27, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoCA",  id: 3406383322272231,  fullName: "Steeple of Cluttered Anomalies", difficulty: 5.44, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToIN",  id: 590603812570325,   fullName: "Tower of Intercepting Newgrounds", difficulty: 5.9, length: "20+ minutes", type: "Tower" },
          { acronym: "ToMY",  id: 999320402542827,   fullName: "Tower of Monitor Yeeting", difficulty: 6.25, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToTKA", id: 534302266446136,   fullName: "Tower of Total Keyboard Annihilation", difficulty: 6.59, length: "< 20 minutes", type: "Tower" },
          { acronym: "BaT",   id: 2664767863512971,  fullName: "Basically a Tower", difficulty: 6.61, length: "< 20 minutes", type: "Mini Tower" },
          { acronym: "ToLE",  id: 2179500883066225,  fullName: "Tower of Losing Everything", difficulty: 7.08, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToTC",  id: 1611962334169470,  fullName: "Tower of Truss Climbing", difficulty: 7.63, length: "< 20 minutes", type: "Tower" },
          { acronym: "CoGaT", id: 1491906747903296,  fullName: "Citadel of Greed and Treachery", difficulty: 7.87, length: "20+ minutes", type: "Citadel" },
          { acronym: "ToSSI", id: 186417573793471,   fullName: "Tower of Super Silver Insanity", difficulty: 8.03, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToZET", id: 1929796743463556,  fullName: "Tower of Zeek's Endless Torment", difficulty: 9.97, length: "30+ minutes", type: "Tower" },
      ] },
      { id: "region2b", 
       name: "Region 2B - Vast Ocean", 
       badges: [
          { acronym: "SoCR",  id: 3430558082096653,  fullName: "Steeple of Crazy Rides", difficulty: 1.31, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToLOL", id: 876832821653636,   fullName: "Tower of Laughing Out Loud", difficulty: 1.76, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoJJ",  id: 2585182353986579,  fullName: "Steeple of Joyous Jumps", difficulty: 2.79, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToWS",  id: 2390046304427189,  fullName: "Tower of Walking Simulator", difficulty: 2.98, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoFP",  id: 1779973046536704,  fullName: "Steeple of Forgiving Purist", difficulty: 3.52, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoRGA", id: 2037127168189963,  fullName: "Steeple of Rather Generic Ascension", difficulty: 4.5, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoOT",  id: 994788769575733,   fullName: "Steeple of Old Trickery", difficulty: 5.00, length: "< 20 minutes", type: "Steeple" },
          { acronym: "SoDIE", id: 2904510726482437,  fullName: "Steeple of Descend Into Earth", difficulty: 5.74, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToCT",  id: 3628277731040817,  fullName: "Tower of Chaotic Traversing", difficulty: 6.00, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoWF",  id: 1338032150274702,  fullName: "Steeple of Wonky Frames", difficulty: 6.48, length: "30+ minutes", type: "Steeple" },
          { acronym: "SoST",  id: 3406165809640314,  fullName: "Steeple of Solemn Tempest", difficulty: 6.79, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToCCCC",id: 39464888325932,    fullName: "Tower of Chaotically Cool Cylindrical Constraints", difficulty: 7.63, length: "30+ minutes", type: "Tower" },
      ] },
      { id: "region3", 
       name: "Region 3 - Glyphic Canyon", 
       badges: [
          { acronym: "ITTIAT",id: 903220417829175,   fullName: "I Think This Is A Tower", difficulty: 1.00, length: "< 20 minutes", type: "Mini Tower" },
          { acronym: "ToMV",  id: 26176437867723,    fullName: "Tower of Mild Vexation", difficulty: 1.68, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToMCO", id: 565823885462576,   fullName: "Tower of Minimalistic Client Objects", difficulty: 2.72, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToEG",  id: 2864813328514129,  fullName: "Tower of Euphoric Goofiness", difficulty: 3.07, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToI",   id: 3240556112124018,  fullName: "Tower of Inconvenience", difficulty: 3.70, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToGAH", id: 142152013783404,   fullName: "Tower of Getting A Headache", difficulty: 4.02, length: "< 20 minutes", type: "Tower" },
          { acronym: "SoTTT", id: 3550863862866533,  fullName: "Steeple of Totally Tubular Teamwork", difficulty: 4.32, length: "< 20 minutes", type: "Steeple" },
          { acronym: "ToTSM", id: 1562646678487595,  fullName: "Tower of Time Stopping Momentum", difficulty: 4.76, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToCC",  id: 4082593002031417,  fullName: "Tower of CPU Crashing", difficulty: 5.03, length: "< 20 minutes", type: "Tower" },
          { acronym: "CoFCR", id: 746168265472640,   fullName: "Citadel of Five Classical Reminiscences", difficulty: 6.57, length: "45+ minutes", type: "Citadel" },
          { acronym: "ToMMM", id: 127002827939698,   fullName: "Tower of Maelstrom Maestro Maesoto", difficulty: 7.54, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToCB",  id: 2773153109821089,  fullName: "Tower of Crescent Berserk", difficulty: 8.18, length: "< 20 minutes", type: "Tower" },
          { acronym: "ToSH",  id: 2057874062637157,  fullName: "Tower of Softlock Heaven", difficulty: 9.14, length: "< 20 minutes", type: "Tower" },
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
