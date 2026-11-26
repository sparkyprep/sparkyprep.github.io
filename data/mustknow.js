// Must-know: facts the tutor flagged as very likely to come up in the real capstone.
// New questions are appended to their unit (ids stay stable); existing ones are just marked.

window.MUSTKNOW = [
  { title: "Fire extinguishers", fact: "The three to know: foam, dry powder and carbon dioxide (CO₂).", unit: "32605", s: "2c" },
  { title: "Electrical fires", fact: "Class E. Use dry powder or CO₂ only. Never water.", unit: "32605", s: "2c" },
  { title: "Lockout key", fact: "The key goes in YOUR pocket. Never leave it in the lock.", unit: "32605", s: "3b" },
  { title: "Prove dead", fact: "Prove → Test → Prove. Check the tester on a known live source before and after.", unit: "32605", s: "3a" },
  { title: "Test before you touch", fact: "Test ALL conductors, including neutral and earth.", unit: "32605", s: "3a" },
  { title: "Red-handled breaker", fact: "Usually the isolator, and it can be locked out. Blue or black ones are not isolators.", unit: "32605", s: "3b" },
  { title: "Meter calibration", fact: "Calibrate test meters every year.", unit: "faults", s: "1c" },
  { title: "Emergency response", fact: "Isolate → Make safe → Call 111 → Assist.", unit: "32605", s: "2a" },
  { title: "RCDs", fact: "Trip at 30 mA, in as little as 30 ms. They have a test button. Know how they work.", unit: "faults", s: "2e" },
  { title: "RCD vs RCBO vs MCB", fact: "RCD: earth leakage, can cover up to 3 circuits. RCBO: earth leakage plus overload, 1 circuit. MCB: overload and short circuit, no earth leakage.", unit: "faults", s: "2e" },
  { title: "TLC", fact: "A Trainee Limited Certificate lets you ASSIST a supervisor. Never work alone.", unit: "32605", s: "1b" },
  { title: "PEW", fact: "Prescribed Electrical Work: who can do it is restricted, and it has standards it must meet.", unit: "32605", s: "1b" },
  { title: "Crimp colours", fact: "Red = 1.5 mm². Blue = 2.5 mm². Yellow = 6 mm².", unit: "32613", s: "2e" },
  { title: "SWA cable", fact: "Steel wire armoured cable. Your tutor says it will be in the capstone.", unit: "32613", s: "1c" },
];

QB.markMust(["32605-5", "32605-6", "32605-17", "32605-20", "32605-21", "faults-32"]);

QB.markMust(QB.addMore("32605", [
  ["Which three are the common types of fire extinguisher you need to know?",
   ["Foam, dry powder and carbon dioxide (CO₂)", "Water, sand and foam", "Dry powder, water and halon", "Foam, water and wet chemical"],
   "Foam, dry powder and CO₂. For an electrical fire (Class E), only dry powder or CO₂.", "Fire"],
  ["You've locked out a circuit. Where should the key to your lock go?",
   ["In your pocket", "Left in the lock so others can find it", "On top of the switchboard", "With the site office"],
   "The key stays with you, so nobody else can remove your lock and liven the circuit.", "Isolation"],
  ["On a switchboard, a breaker with a red handle is usually…",
   ["The isolator, and it can be locked out", "Only a switch, not an isolator", "An RCD", "A surge diverter"],
   "Red = isolator (lockable). Blue or black breakers aren't isolators.", "Isolation"],
  ["Someone is receiving an electric shock. What is the correct order?",
   ["Isolate → make safe → call 111 → assist", "Call 111 → pull them free → isolate → assist", "Assist → isolate → call 111 → make safe", "Make safe → assist → isolate → call 111"],
   "Isolate first so you don't become the second casualty.", "First aid"],
]));

QB.markMust(QB.addMore("faults", [
  ["How often should a test meter be calibrated?",
   ["Every year", "Every five years", "Only when it's dropped", "Every month"],
   "Yearly calibration keeps its readings trustworthy.", "Test instruments"],
  ["What does a personal-protection RCD trip at, and how fast?",
   ["30 mA, in as little as 30 ms", "300 mA, in 3 seconds", "30 A, in 30 ms", "3 mA, in 300 ms"],
   "30 mA leakage, tripping in as little as 30 milliseconds.", "RCDs"],
  ["Which device protects against BOTH earth leakage and overload on a single circuit?",
   ["RCBO", "RCD (RCCB)", "MCB", "Isolating switch"],
   "RCBO = RCD + overload. An RCCB is earth leakage only. An MCB has no earth leakage protection.", "RCDs"],
  ["What does an MCB on its own NOT protect against?",
   ["Earth leakage (it's not an RCD)", "Overload", "Short circuit", "Overcurrent"],
   "An MCB trips on overload and short circuit. For earth leakage you need an RCD or RCBO.", "RCDs"],
]));

QB.markMust(QB.addMore("32613", [
  ["A BLUE crimp lug is sized for which conductor?",
   ["2.5 mm²", "1.5 mm²", "6 mm²", "10 mm²"],
   "Red = 1.5 mm², blue = 2.5 mm², yellow = 6 mm².", "Terminations"],
  ["What does SWA cable stand for, and why is it used?",
   ["Steel wire armoured: the armour gives strong mechanical protection", "Single wire aluminium: it's lighter", "Shielded wire assembly: it blocks interference", "Solid wire annealed: it's more flexible"],
   "The steel wire armour protects the cable where it could be damaged, such as underground.", "Construction"],
]));
