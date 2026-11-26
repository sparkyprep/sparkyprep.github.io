// Maths trainer: every question is generated with fresh numbers, so you can practise forever.
// Each generator returns { q, answer, wrong: [3 common mistakes], steps: [...], formula, topic, unit }.
// Wrong answers are the mistakes people actually make: forgetting to flip, × instead of ÷,
// skipping a unit conversion, using 0.637 instead of 0.707.

(function () {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const round = (n, dp = 2) => {
    const f = 10 ** dp;
    return Math.round((n + Number.EPSILON) * f) / f;
  };
  // Pretty number: up to 2 dp, thousands separators, no trailing zeros
  const fmt = (n, dp = 2) => {
    const r = round(n, dp);
    return r.toLocaleString("en-NZ", { maximumFractionDigits: dp });
  };
  const sin = (deg) => Math.sin((deg * Math.PI) / 180);
  const NICE_R = [2, 4, 5, 6, 8, 10, 12, 15, 20, 22, 24, 25, 30, 40, 47, 50, 60, 68, 75, 82, 100, 120, 150, 220];

  const gens = {
    ohmI() {
      const R = pick(NICE_R), V = pick([6, 9, 12, 24, 36, 48, 110, 230]);
      const I = V / R;
      return {
        topic: "Ohm's law", formula: "I = V ÷ R", unit: "A",
        q: `A ${V} V supply is connected across a ${R} Ω resistor. What current flows?`,
        answer: I, wrong: [V * R, R / V, V - R > 0 ? V - R : V + R],
        steps: [`I = V ÷ R`, `I = ${V} ÷ ${R}`, `I = ${fmt(I)} A`],
      };
    },
    ohmV() {
      const R = pick(NICE_R), I = pick([0.2, 0.5, 1.5, 2, 2.5, 3, 4, 5]);
      const V = I * R;
      return {
        topic: "Ohm's law", formula: "V = I × R", unit: "V",
        q: `${fmt(I)} A flows through a ${R} Ω resistor. What is the voltage across it?`,
        answer: V, wrong: [R / I, I / R, I + R],
        steps: [`V = I × R`, `V = ${fmt(I)} × ${R}`, `V = ${fmt(V)} V`],
      };
    },
    ohmR() {
      const I = pick([0.5, 1.2, 2, 2.5, 4, 5, 8]), V = pick([12, 24, 48, 120, 230]);
      const R = V / I;
      return {
        topic: "Ohm's law", formula: "R = V ÷ I", unit: "Ω",
        q: `A heater draws ${fmt(I)} A from a ${V} V supply. What is its resistance?`,
        answer: R, wrong: [V * I, I / V, V - I],
        steps: [`R = V ÷ I`, `R = ${V} ÷ ${fmt(I)}`, `R = ${fmt(R)} Ω`],
      };
    },
    powerVI() {
      const V = pick([12, 24, 230]), I = pick([0.5, 2, 4.5, 6, 8.7, 10, 13]);
      const P = V * I;
      return {
        topic: "Power", formula: "P = V × I", unit: "W",
        q: `An appliance on ${V} V draws ${fmt(I)} A. What is its power?`,
        answer: P, wrong: [V / I, I * I * V, P / 1000],
        steps: [`P = V × I`, `P = ${V} × ${fmt(I)}`, `P = ${fmt(P)} W`],
      };
    },
    powerI2R() {
      const I = pick([0.05, 0.1, 0.5, 2, 3, 5]), R = pick([10, 22, 47, 50, 100, 470]);
      const P = I * I * R;
      return {
        topic: "Power", formula: "P = I² × R", unit: "W",
        q: `${fmt(I)} A flows through a ${R} Ω resistor. What power does it dissipate?`,
        answer: P, wrong: [I * R, (I * R) ** 2, R / (I * I)],
        steps: [`P = I² × R`, `P = ${fmt(I)}² × ${R}`, `P = ${fmt(I * I, 4)} × ${R}`, `P = ${fmt(P, 3)} W`],
        dp: 3,
      };
    },
    powerV2R() {
      const V = pick([12, 24, 230]), R = pick([4, 6, 12, 24, 46, 52.9]);
      const P = (V * V) / R;
      return {
        topic: "Power", formula: "P = V² ÷ R", unit: "W",
        q: `A ${R} Ω element is connected to ${V} V. What power does it use?`,
        answer: P, wrong: [V / R, V * R, (V / R) ** 2],
        steps: [`P = V² ÷ R`, `P = ${V}² ÷ ${R}`, `P = ${fmt(V * V)} ÷ ${R}`, `P = ${fmt(P)} W`],
      };
    },
    currentFromPower() {
      const P = pick([1000, 1500, 2000, 2400, 3000]), V = 230;
      const I = P / V;
      return {
        topic: "Power", formula: "I = P ÷ V", unit: "A",
        q: `A ${fmt(P)} W heater runs on ${V} V. Roughly what current does it draw?`,
        answer: I, wrong: [P * V / 1000, V / P * 100, P / 1000],
        steps: [`I = P ÷ V`, `I = ${fmt(P)} ÷ ${V}`, `I = ${fmt(I)} A`],
      };
    },
    series() {
      const n = pick([2, 3, 3, 4]);
      const rs = Array.from({ length: n }, () => pick(NICE_R));
      const V = pick([12, 24, 48, 100]);
      const Rt = rs.reduce((a, b) => a + b, 0);
      const ask = pick(["R", "I"]);
      if (ask === "R") {
        const par = 1 / rs.reduce((a, r) => a + 1 / r, 0);
        return {
          topic: "Series circuits", formula: "Rₜ = R₁ + R₂ + …", unit: "Ω",
          q: `Resistors of ${rs.join(" Ω, ")} Ω are connected in SERIES. What is the total resistance?`,
          answer: Rt, wrong: [par, Rt / n, Math.max(...rs)],
          steps: [`Series: just add them`, `Rₜ = ${rs.join(" + ")}`, `Rₜ = ${fmt(Rt)} Ω`],
        };
      }
      const I = V / Rt;
      return {
        topic: "Series circuits", formula: "I = V ÷ Rₜ", unit: "A",
        q: `A ${V} V supply feeds ${rs.join(" Ω, ")} Ω in SERIES. What current flows?`,
        answer: I, wrong: [V / rs[0], V * Rt, I * n],
        steps: [`Rₜ = ${rs.join(" + ")} = ${fmt(Rt)} Ω`, `I = V ÷ Rₜ = ${V} ÷ ${fmt(Rt)}`, `I = ${fmt(I)} A`, `The same current flows through every resistor.`],
      };
    },
    seriesVoltDrop() {
      const R1 = pick([4, 5, 10, 20]), R2 = pick([6, 8, 15, 30]), V = pick([12, 24, 50, 100]);
      const I = V / (R1 + R2), V2 = I * R2;
      return {
        topic: "Series circuits", formula: "V = I × R", unit: "V",
        q: `${R1} Ω and ${R2} Ω are in series on ${V} V. What is the voltage across the ${R2} Ω resistor?`,
        answer: V2, wrong: [V - V2 === V2 ? V2 / 2 : V - V2, V, I],
        steps: [`Rₜ = ${R1} + ${R2} = ${R1 + R2} Ω`, `I = ${V} ÷ ${R1 + R2} = ${fmt(I)} A`, `V = I × R = ${fmt(I)} × ${R2}`, `V = ${fmt(V2)} V`, `Check: ${fmt(I * R1)} + ${fmt(V2)} = ${V} V ✓`],
      };
    },
    parallelTwo() {
      let R1 = pick(NICE_R), R2 = pick(NICE_R);
      if (R1 === R2) R2 = R2 * 2;
      const Rt = (R1 * R2) / (R1 + R2);
      return {
        topic: "Parallel circuits", formula: "Rₜ = (R₁ × R₂) ÷ (R₁ + R₂)", unit: "Ω",
        q: `${R1} Ω and ${R2} Ω are connected in PARALLEL. What is the total resistance?`,
        answer: Rt, wrong: [R1 + R2, 1 / R1 + 1 / R2, (R1 + R2) / 2],
        steps: [`Two resistors: product over sum`, `Rₜ = (${R1} × ${R2}) ÷ (${R1} + ${R2})`, `Rₜ = ${fmt(R1 * R2)} ÷ ${R1 + R2}`, `Rₜ = ${fmt(Rt)} Ω`, `Check: smaller than ${Math.min(R1, R2)} Ω ✓`],
      };
    },
    parallelThree() {
      const rs = [pick([10, 12, 20]), pick([20, 30, 40]), pick([40, 60, 100])];
      const inv = rs.reduce((a, r) => a + 1 / r, 0), Rt = 1 / inv;
      return {
        topic: "Parallel circuits", formula: "1/Rₜ = 1/R₁ + 1/R₂ + 1/R₃, then flip", unit: "Ω",
        q: `${rs.join(" Ω, ")} Ω are connected in PARALLEL. What is the total resistance?`,
        answer: Rt, wrong: [inv, rs[0] + rs[1] + rs[2], (rs[0] + rs[1] + rs[2]) / 3],
        steps: [`1/Rₜ = ${rs.map((r) => "1/" + r).join(" + ")}`, `1/Rₜ = ${rs.map((r) => fmt(1 / r, 4)).join(" + ")} = ${fmt(inv, 4)}`, `FLIP: Rₜ = 1 ÷ ${fmt(inv, 4)}`, `Rₜ = ${fmt(Rt)} Ω`],
        trap: "The wrong answer close to 0 is what you get if you forget to flip.",
      };
    },
    parallelEqual() {
      const R = pick([60, 75, 100, 120, 170, 220]) * pick([1, 1000]), n = pick([2, 3, 4]);
      const Rt = R / n;
      const show = (x) => (x >= 1000 ? fmt(x / 1000) + " kΩ" : fmt(x) + " Ω");
      return {
        topic: "Parallel circuits", formula: "Equal resistors: Rₜ = R ÷ n", unit: R >= 1000 ? "kΩ" : "Ω", scale: R >= 1000 ? 1000 : 1,
        q: `${n} resistors of ${show(R)} each are connected in PARALLEL. What is the total resistance?`,
        answer: Rt, wrong: [R * n, R, 1 / (n / R)  === Rt ? R / (n + 1) : 1 / (n / R)],
        steps: [`Equal resistors in parallel: divide one by how many there are`, `Rₜ = ${show(R)} ÷ ${n}`, `Rₜ = ${show(Rt)}`],
      };
    },
    parallelBranch() {
      const V = pick([12, 24, 48]), R1 = pick([20, 40, 60]), R2 = pick([30, 60, 120]);
      const I1 = V / R1, It = V / R1 + V / R2;
      return {
        topic: "Parallel circuits", formula: "I = V ÷ R (each branch gets full V)", unit: "A",
        q: `${R1} Ω and ${R2} Ω are in parallel on ${V} V. What current flows through the ${R1} Ω branch?`,
        answer: I1, wrong: [It, It / 2 === I1 ? It * 2 : It / 2, V / (R1 + R2)],
        steps: [`Every parallel branch gets the full ${V} V`, `I = V ÷ R = ${V} ÷ ${R1}`, `I = ${fmt(I1)} A`],
      };
    },
    seriesParallel() {
      const R1 = pick([6, 10, 20]), R2 = pick([10, 12, 40, 50]), R3 = pick([10, 12, 40, 60]), V = pick([30, 36, 100]);
      const Rp = (R2 * R3) / (R2 + R3), Rt = R1 + Rp;
      return {
        topic: "Series-parallel", formula: "Rₜ = R₁ + (R₂ ∥ R₃)", unit: "Ω",
        q: `R1 = ${R1} Ω is in series with R2 = ${R2} Ω and R3 = ${R3} Ω, which are in parallel with each other. What is the total resistance?`,
        answer: Rt, wrong: [R1 + R2 + R3, 1 / (1 / R1 + 1 / R2 + 1 / R3), R1 + 1 / R2 + 1 / R3],
        steps: [`Parallel part first: (${R2} × ${R3}) ÷ (${R2} + ${R3}) = ${fmt(Rp)} Ω`, `Add the series resistor: ${R1} + ${fmt(Rp)}`, `Rₜ = ${fmt(Rt)} Ω`],
      };
    },
    energyCost() {
      const W = pick([800, 1200, 1500, 2000, 2400, 3000]), h = pick([2, 4, 6, 8]), days = pick([5, 7, 30]);
      const price = pick([0.26, 0.28, 0.3, 0.32, 0.35]);
      const kWh = (W / 1000) * h * days, cost = kWh * price;
      return {
        topic: "Energy & cost", formula: "Cost = kW × hours × price per kWh", unit: "$", prefix: true,
        q: `A ${fmt(W)} W appliance runs ${h} hours a day for ${days} days. Power costs ${fmt(price * 100)}c per kWh. What does it cost?`,
        answer: cost, wrong: [W * h * days * price, kWh, cost / days],
        steps: [`Convert to kW: ${fmt(W)} ÷ 1000 = ${fmt(W / 1000)} kW`, `Hours: ${h} × ${days} = ${h * days} h`, `Energy: ${fmt(W / 1000)} × ${h * days} = ${fmt(kWh)} kWh`, `Cost: ${fmt(kWh)} × $${fmt(price)} = $${fmt(cost)}`],
      };
    },
    energyDuty() {
      const kW = pick([1.5, 2, 3]), h = pick([5, 8]), d = 5, wk = 48, duty = pick([75, 80, 85]);
      const hrs = h * d * wk * (duty / 100), kWh = kW * hrs;
      return {
        topic: "Energy & cost", formula: "Energy = kW × (h/day × days × weeks × duty)", unit: "kWh",
        q: `A ${fmt(kW)} kW heater runs ${h} h/day, ${d} days a week, ${wk} weeks a year, at a ${duty}% duty cycle. How much energy does it use in a year?`,
        answer: kWh, wrong: [kW * h * d * wk, hrs, kW * h * d * wk * duty],
        steps: [`Duty cycle as a decimal: ${duty} ÷ 100 = ${duty / 100}`, `Hours: ${h} × ${d} × ${wk} × ${duty / 100} = ${fmt(hrs)} h`, `Energy: ${fmt(kW)} × ${fmt(hrs)} = ${fmt(kWh)} kWh`],
      };
    },
    efficiency() {
      const input = pick([500, 800, 1000, 2000, 2500]), eff = pick([70, 75, 80, 85, 90]);
      const out = (input * eff) / 100;
      const ask = pick(["eff", "input"]);
      if (ask === "eff")
        return {
          topic: "Efficiency", formula: "Efficiency = Output ÷ Input × 100", unit: "%",
          q: `A motor takes in ${fmt(input)} W and delivers ${fmt(out)} W of output. What is its efficiency?`,
          answer: eff, wrong: [(input / out) * 100, input - out, out / input],
          steps: [`Efficiency = Output ÷ Input × 100`, `= ${fmt(out)} ÷ ${fmt(input)} × 100`, `= ${eff}%`],
        };
      return {
        topic: "Efficiency", formula: "Input = Output ÷ efficiency", unit: "W",
        q: `A motor is ${eff}% efficient and delivers ${fmt(out)} W of output. What is its input power?`,
        answer: input, wrong: [out * (eff / 100), out + eff, out / eff],
        steps: [`Input = Output ÷ (efficiency as a decimal)`, `= ${fmt(out)} ÷ ${eff / 100}`, `= ${fmt(input)} W`],
      };
    },
    hp() {
      const hp = pick([0.5, 1, 1.5, 2, 3, 5]);
      return {
        topic: "Power", formula: "1 HP = 746 W", unit: "W",
        q: `What is ${fmt(hp)} HP in watts? (1 HP = 746 W)`,
        answer: hp * 746, wrong: [746 / hp, hp * 1000, hp * 74.6],
        steps: [`W = HP × 746`, `= ${fmt(hp)} × 746`, `= ${fmt(hp * 746)} W`],
      };
    },
    acRMS() {
      const pk = pick([100, 170, 325, 340, 350, 400, 565]);
      return {
        topic: "AC values", formula: "RMS = Peak × 0.707", unit: "V",
        q: `An AC waveform has a peak of ${pk} V. What is its RMS value?`,
        answer: pk * 0.707, wrong: [pk / 0.707, pk * 0.637, pk * 2],
        steps: [`RMS = Peak × 0.707`, `= ${pk} × 0.707`, `= ${fmt(pk * 0.707)} V`],
      };
    },
    acPeak() {
      const rms = pick([12, 24, 110, 230, 240, 400]);
      return {
        topic: "AC values", formula: "Peak = RMS ÷ 0.707", unit: "V",
        q: `A supply is ${rms} V RMS. What is the peak voltage?`,
        answer: rms / 0.707, wrong: [rms * 0.707, rms / 0.637, (rms / 0.707) * 2],
        steps: [`Peak = RMS ÷ 0.707`, `= ${rms} ÷ 0.707`, `= ${fmt(rms / 0.707)} V`],
      };
    },
    acAverage() {
      const pk = pick([100, 200, 325, 350]);
      return {
        topic: "AC values", formula: "Average = Peak × 0.637", unit: "V",
        q: `A sine wave peaks at ${pk} V. What is its average value?`,
        answer: pk * 0.637, wrong: [pk * 0.707, pk / 0.637, pk / 2],
        steps: [`Average = Peak × 0.637`, `= ${pk} × 0.637`, `= ${fmt(pk * 0.637)} V`],
      };
    },
    acFreq() {
      const ms = pick([10, 16.67, 20, 25, 40, 50]);
      const f = 1 / (ms / 1000);
      return {
        topic: "AC values", formula: "f = 1 ÷ T (T in seconds)", unit: "Hz",
        q: `One cycle of a waveform takes ${ms} ms. What is its frequency?`,
        answer: f, wrong: [1 / ms, ms * 1000 / 100, ms],
        steps: [`Convert to seconds: ${ms} ÷ 1000 = ${ms / 1000} s`, `f = 1 ÷ ${ms / 1000}`, `f = ${fmt(f)} Hz`],
        trap: "If you didn't convert ms to seconds, you'd get a tiny decimal.",
      };
    },
    acPeriod() {
      const f = pick([25, 50, 60, 100, 400]);
      const T = 1000 / f;
      return {
        topic: "AC values", formula: "T = 1 ÷ f", unit: "ms",
        q: `What is the period of one cycle at ${f} Hz, in milliseconds?`,
        answer: T, wrong: [f / 1000, 1 / f, f],
        steps: [`T = 1 ÷ f = 1 ÷ ${f} = ${fmt(1 / f, 4)} s`, `× 1000 to get ms`, `T = ${fmt(T)} ms`],
      };
    },
    acInst() {
      const pk = pick([100, 200, 325.3, 340, 350]), deg = pick([30, 45, 60, 65, 120, 210]);
      const v = pk * sin(deg);
      return {
        topic: "AC values", formula: "v = Peak × sin θ", unit: "V",
        q: `A sine wave has a peak of ${fmt(pk)} V. What is the instantaneous voltage at ${deg}°?`,
        answer: v, wrong: [pk * Math.cos((deg * Math.PI) / 180), pk * Math.sin(deg), pk * 0.707],
        steps: [`v = Peak × sin θ (calculator in DEGREES)`, `sin ${deg}° = ${fmt(sin(deg), 4)}`, `v = ${fmt(pk)} × ${fmt(sin(deg), 4)}`, `v = ${fmt(v)} V`],
        trap: "One wrong answer is what a calculator in radians mode gives.",
      };
    },
    impedance() {
      const V = pick([20, 33, 100, 230]), Z = pick([2, 5, 10, 11, 23, 46]);
      return {
        topic: "Impedance", formula: "I = V ÷ Z", unit: "A",
        q: `A ${V} V AC circuit has an impedance of ${Z} Ω. What current flows?`,
        answer: V / Z, wrong: [V * Z, Z / V, V - Z],
        steps: [`AC Ohm's law: I = V ÷ Z`, `= ${V} ÷ ${Z}`, `= ${fmt(V / Z)} A`],
      };
    },
    convert() {
      const c = pick([
        { v: 4700, from: "mA", to: "A", f: 1 / 1000, how: "÷ 1000" },
        { v: 0.0035, from: "A", to: "mA", f: 1000, how: "× 1000" },
        { v: 2.2, from: "kΩ", to: "Ω", f: 1000, how: "× 1000" },
        { v: 470000, from: "Ω", to: "kΩ", f: 1 / 1000, how: "÷ 1000" },
        { v: 1.5, from: "MΩ", to: "kΩ", f: 1000, how: "× 1000" },
        { v: 3425000, from: "mV", to: "kV", f: 1e-6, how: "÷ 1,000,000" },
        { v: 2500, from: "W", to: "kW", f: 1 / 1000, how: "÷ 1000" },
        { v: 0.00022, from: "F", to: "µF", f: 1e6, how: "× 1,000,000" },
      ]);
      const ans = c.v * c.f;
      return {
        topic: "Units", formula: `${c.from} → ${c.to}: ${c.how}`, unit: c.to, dp: 6,
        q: `Convert ${fmt(c.v, 6)} ${c.from} to ${c.to}.`,
        answer: ans, wrong: [c.v / c.f, ans * 10, ans / 10],
        steps: [`${c.from} → ${c.to}: ${c.how}`, `${fmt(c.v, 6)} ${c.how} = ${fmt(ans, 6)} ${c.to}`],
      };
    },
    pctDiff() {
      const calc = pick([1.2, 2, 4.7, 5, 10, 24]);
      const meas = round(calc * (1 + pick([-0.08, -0.05, -0.03, 0.02, 0.04, 0.06])), 3);
      const d = Math.abs(meas - calc), pct = (d / calc) * 100;
      return {
        topic: "Measurement", formula: "% diff = Difference ÷ Calculated × 100", unit: "%",
        q: `You calculated ${fmt(calc)} but your meter reads ${fmt(meas, 3)}. What is the percentage difference?`,
        answer: pct, wrong: [(d / meas) * 100 === pct ? pct * 2 : (d / meas) * 100, d, (meas / calc) * 100],
        steps: [`Difference = ${fmt(meas, 3)} − ${fmt(calc)} = ${fmt(d, 3)}`, `÷ the CALCULATED value: ${fmt(d, 3)} ÷ ${fmt(calc)}`, `× 100 = ${fmt(pct)}%`],
      };
    },
    resistivity() {
      const L = pick([20, 50, 100, 150]), A = pick([1, 1.5, 2.5, 4]);
      const rho = 1.72e-8, R = (rho * L) / (A * 1e-6);
      return {
        topic: "Resistance", formula: "R = ρL ÷ A (A in m²)", unit: "Ω", dp: 3,
        q: `Find the resistance of ${L} m of copper with a cross-sectional area of ${A} mm² (ρ = 1.72 × 10⁻⁸ Ωm).`,
        answer: R, wrong: [R * 1000, R * 10, (rho * L) / (A * 1e-3)],
        steps: [`Convert area: ${A} mm² = ${A} × 10⁻⁶ m²`, `R = (1.72 × 10⁻⁸ × ${L}) ÷ (${A} × 10⁻⁶)`, `R = ${fmt(R, 3)} Ω`],
      };
    },
    resistanceChange() {
      const R = pick([0.4, 0.6, 0.8, 1.2]), lf = pick([2, 3]), af = pick([2, 3]);
      const ans = (R * lf) / af;
      return {
        topic: "Resistance", formula: "R ∝ length, R ∝ 1/area", unit: "Ω",
        q: `A cable measures ${fmt(R)} Ω. A cable of the same material is ${lf}× as long with ${af}× the cross-sectional area. What is its resistance?`,
        answer: ans, wrong: [R * lf * af, (R * af) / lf, R],
        steps: [`Longer → more resistance: × ${lf}`, `Bigger area → less resistance: ÷ ${af}`, `${fmt(R)} × ${lf} ÷ ${af} = ${fmt(ans)} Ω`],
      };
    },
    circleArea() {
      const d = pick([1.13, 1.38, 1.78, 2.25, 20, 50]);
      const A = (Math.PI * d * d) / 4;
      return {
        topic: "Area", formula: "A = π × d² ÷ 4", unit: "mm²",
        q: `A round conductor has a diameter of ${d} mm. What is its cross-sectional area?`,
        answer: A, wrong: [Math.PI * d * d, Math.PI * d, (Math.PI * d) / 4],
        steps: [`A = π × d² ÷ 4`, `= π × ${d}² ÷ 4`, `= ${fmt(A)} mm²`],
      };
    },
    triangleArea() {
      const w = pick([60, 80, 100, 150]), h = pick([30, 45, 60, 90]);
      return {
        topic: "Area", formula: "A = ½ × width × height", unit: "mm²",
        q: `What is the area of a triangle ${w} mm wide and ${h} mm high?`,
        answer: 0.5 * w * h, wrong: [w * h, w + h, (w * h) / 4],
        steps: [`A = ½ × w × h`, `= 0.5 × ${w} × ${h}`, `= ${fmt(0.5 * w * h)} mm²`],
      };
    },
  };

  // "Which formula?" drill. Recognising the formula is the hard part in the exam.
  const FORMULA_DRILL = [
    ["You know the voltage and resistance and want the current.", "I = V ÷ R", ["I = V × R", "I = R ÷ V", "I = P × V"]],
    ["You know the current and resistance and want the power. You don't know the voltage.", "P = I² × R", ["P = V × I", "P = V² ÷ R", "P = I ÷ R"]],
    ["You know the voltage and resistance and want the power.", "P = V² ÷ R", ["P = I² × R", "P = V × R", "P = V ÷ R"]],
    ["You want the total of two resistors in PARALLEL.", "(R₁ × R₂) ÷ (R₁ + R₂)", ["R₁ + R₂", "(R₁ + R₂) ÷ 2", "R₁ × R₂"]],
    ["You want the RMS value from the peak.", "Peak × 0.707", ["Peak ÷ 0.707", "Peak × 0.637", "Peak × 2"]],
    ["You want the peak value from the RMS (e.g. 230 V).", "RMS ÷ 0.707", ["RMS × 0.707", "RMS × 0.637", "RMS ÷ 2"]],
    ["You want the frequency from the period.", "f = 1 ÷ T", ["f = T × 50", "f = 1 × T", "f = T ÷ 1000"]],
    ["You want the energy an appliance used.", "Energy = Power × Time", ["Energy = Power ÷ Time", "Energy = V × I", "Energy = Time ÷ Power"]],
    ["You want the efficiency of a motor.", "Output ÷ Input × 100", ["Input ÷ Output × 100", "Input − Output", "Output × Input"]],
    ["You want the current in an AC circuit with impedance.", "I = V ÷ Z", ["I = V × Z", "I = Z ÷ V", "I = V ÷ R only"]],
    ["You want the instantaneous voltage at a certain angle.", "Peak × sin θ", ["RMS × sin θ", "Peak × cos θ", "Peak × 0.707 × θ"]],
    ["You want the resistance of a length of cable from its material.", "R = ρL ÷ A", ["R = ρA ÷ L", "R = L ÷ ρA", "R = V × I"]],
    ["You want the % difference between calculated and measured.", "Difference ÷ Calculated × 100", ["Difference ÷ Measured × 100", "Measured ÷ Calculated", "Calculated − Measured"]],
  ];

  function formulaQuestion() {
    const [scenario, right, wrong] = pick(FORMULA_DRILL);
    return {
      kind: "formula", topic: "Which formula?",
      q: scenario + " Which formula do you use?",
      options: [right, ...wrong], answerText: right,
      steps: [`Use: ${right}`],
    };
  }

  // Turn a generator result into a 4-option question with unique, formatted options
  function build(key) {
    const g = gens[key]();
    const dp = g.dp ?? 2;
    const scale = g.scale || 1;
    const show = (n) => {
      const v = fmt(n / scale, dp);
      if (g.prefix) return `${g.unit}${round(n, 2).toFixed(2)}`;
      return g.unit === "%" ? `${v}%` : `${v} ${g.unit}`;
    };
    const right = show(g.answer);
    const seen = new Set([right]);
    const opts = [right];
    const pool = [...g.wrong, g.answer * 2, g.answer / 2, g.answer * 10, g.answer / 10, g.answer + 1];
    for (const w of pool) {
      if (opts.length === 4) break;
      if (!Number.isFinite(w) || w === 0 || (g.answer > 0 && w < 0)) continue;
      const s = show(w);
      if (/^\$?-?0(\.0+)?(\s|%|$)/.test(s)) continue;
      if (!seen.has(s)) { seen.add(s); opts.push(s); }
    }
    return { kind: "maths", key, topic: g.topic, q: g.q, options: opts, answerText: right, steps: g.steps, formula: g.formula, trap: g.trap };
  }

  const TOPICS = {
    "Ohm's law": ["ohmI", "ohmV", "ohmR"],
    "Power": ["powerVI", "powerI2R", "powerV2R", "currentFromPower", "hp"],
    "Series circuits": ["series", "seriesVoltDrop"],
    "Parallel circuits": ["parallelTwo", "parallelThree", "parallelEqual", "parallelBranch"],
    "Series-parallel": ["seriesParallel"],
    "Energy & cost": ["energyCost", "energyDuty"],
    "Efficiency": ["efficiency"],
    "AC values": ["acRMS", "acPeak", "acAverage", "acFreq", "acPeriod", "acInst"],
    "Impedance": ["impedance"],
    "Units & conversions": ["convert", "pctDiff"],
    "Resistance & area": ["resistivity", "resistanceChange", "circleArea", "triangleArea"],
  };

  window.Maths = {
    TOPICS,
    keys: Object.keys(gens),
    make(topic) {
      if (topic === "Which formula?") return formulaQuestion();
      const keys = topic && TOPICS[topic] ? TOPICS[topic] : Object.keys(gens);
      if (!topic && Math.random() < 0.2) return formulaQuestion();
      return build(pick(keys));
    },
    build,
    formulaQuestion,
  };
})();
