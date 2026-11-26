// Question bank registry. Each unit file calls QB.add(unitId, [...]).
// Question ids are "<unit>-<n>", so only ever APPEND new questions to a unit file:
// inserting in the middle would shift ids and muddle people's saved review schedule.

window.QB = (function () {
  const UNITS = [
    { id: "32605", code: "US 32605", name: "Working Safely", long: "Working safely in the electrical industry", icon: "shield", tone: "t1" },
    { id: "32606", code: "US 32606", name: "Tools, Fittings & Plans", long: "Tools, fittings, appliances and plans", icon: "wrench", tone: "t2" },
    { id: "32609", code: "US 32609", name: "Maths & Resistance", long: "Maths, electrical principles and resistance", icon: "resistor", tone: "t3" },
    { id: "32610", code: "US 32610", name: "Ohm's Law & DC Circuits", long: "Ohm's law, power, energy and DC circuits", icon: "bolt", tone: "t4" },
    { id: "32611", code: "US 32611", name: "Magnetism & AC", long: "Magnetism, electromagnetism and AC theory", icon: "sine", tone: "t5" },
    { id: "32612", code: "US 32612", name: "Legislation & AS/NZS 3000", long: "Legislation, governance bodies and the Wiring Rules", icon: "scales", tone: "t6" },
    { id: "32613", code: "US 32613", name: "Cords, Cables & Installation", long: "Cords, cables and cable installation", icon: "cable", tone: "t7" },
    { id: "faults", learn: "32614", code: "US 32614", name: "Faults & Protection", long: "Electrical faults, circuit protection, decommissioning and commissioning", icon: "breaker", tone: "t8", partial: true },
  ];

  const questions = [];
  const byId = {};

  function add(unit, list) {
    list.forEach(([q, options, explain, topic], i) => {
      const item = { id: `${unit}-${i + 1}`, unit, q, options, explain, topic, kind: "bank" };
      questions.push(item);
      byId[item.id] = item;
    });
  }

  // Adds questions after the ones already loaded for that unit, keeping earlier ids unchanged
  function addMore(unit, list) {
    const start = questions.filter((q) => q.unit === unit).length;
    list.forEach(([q, options, explain, topic], i) => {
      const item = { id: `${unit}-${start + i + 1}`, unit, q, options, explain, topic, kind: "bank" };
      questions.push(item);
      byId[item.id] = item;
    });
  }

  return {
    UNITS,
    add,
    addMore,
    all: () => questions,
    get: (id) => byId[id],
    forUnit: (unit) => questions.filter((q) => q.unit === unit),
    unit: (id) => UNITS.find((u) => u.id === id),
    topics(unit) {
      const out = {};
      for (const q of questions) if (q.unit === unit) out[q.topic] = (out[q.topic] || 0) + 1;
      return out;
    },
  };
})();
