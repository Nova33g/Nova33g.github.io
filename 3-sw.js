(() => {
  // src/prayer.ts
  var rad = (d) => d * Math.PI / 180;
  var deg = (r) => r * 180 / Math.PI;
  var fix = (a, b) => a - b * Math.floor(a / b);
  function method(lat, lon) {
    if (lat > 22 && lat < 31.7 && lon > 24.7 && lon < 36.9) return { fajr: 19.5, isha: 17.5, label: "\u0627\u0644\u0647\u064A\u0626\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u0645\u0633\u0627\u062D\u0629" };
    if (lat > 15 && lat < 32.5 && lon >= 36.9 && lon < 60) return { fajr: 18.5, isha: 0, ishaMin: 90, label: "\u0623\u0645 \u0627\u0644\u0642\u0631\u0649" };
    if (lat > 15 && lon > -170 && lon < -50) return { fajr: 15, isha: 15, label: "\u0627\u0644\u062C\u0645\u0639\u064A\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A\u0629 \u0644\u0623\u0645\u0631\u064A\u0643\u0627 \u0627\u0644\u0634\u0645\u0627\u0644\u064A\u0629" };
    return { fajr: 18, isha: 17, label: "\u0631\u0627\u0628\u0637\u0629 \u0627\u0644\u0639\u0627\u0644\u0645 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A" };
  }
  function sun(jd) {
    const D = jd - 2451545, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360), e = 23.439 - 36e-8 * D;
    const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24);
    return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - RA };
  }
  var names = { fajr: "\u0627\u0644\u0641\u062C\u0631", sunrise: "\u0627\u0644\u0634\u0631\u0648\u0642", dhuhr: "\u0627\u0644\u0638\u0647\u0631", asr: "\u0627\u0644\u0639\u0635\u0631", maghrib: "\u0627\u0644\u0645\u063A\u0631\u0628", isha: "\u0627\u0644\u0639\u0634\u0627\u0621" };
  function day(dayUTC, lat, lon) {
    const m = method(lat, lon), jd = dayUTC / 864e5 + 24405875e-1 + 0.5 - lon / 360;
    const { decl, eqt } = sun(jd);
    const noon = fix(12 - eqt, 24) - lon / 15;
    const ta = (a) => deg(Math.acos((-Math.sin(rad(a)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat))))) / 15;
    const asrA = deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl))))));
    const taAsr = deg(Math.acos((Math.sin(rad(asrA)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl))))) / 15;
    let fa = noon - ta(m.fajr), sr = noon - ta(0.833), as = noon + taAsr, mg = noon + ta(0.833), is = m.ishaMin ? mg + m.ishaMin / 60 : noon + ta(m.isha);
    if (![fa, sr, as, mg, is].every(isFinite)) {
      sr = noon - 6;
      mg = noon + 6;
      fa = sr - 1.5;
      is = mg + 1.5;
      as = noon + 3.5;
    }
    const mk = (k, h) => ({ k, n: names[k], t: dayUTC + h * 36e5 });
    return [mk("fajr", fa), mk("sunrise", sr), mk("dhuhr", noon), mk("asr", as), mk("maghrib", mg), mk("isha", is)];
  }
  function around(now, loc) {
    const d = new Date(now), base = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const out = [];
    for (const k of [-1, 0, 1]) out.push(...day(base + k * 864e5, loc.lat, loc.lon));
    const fixed = [];
    for (const k of [-1, 0, 1]) {
      const ps = day(base + k * 864e5, loc.lat, loc.lon);
      const dh = new Date(ps[2].t), want = new Date(base + k * 864e5);
      const diff = Math.round((Date.UTC(dh.getFullYear(), dh.getMonth(), dh.getDate()) - Date.UTC(want.getUTCFullYear(), want.getUTCMonth(), want.getUTCDate())) / 864e5);
      fixed.push(...ps.map((p) => ({ ...p, t: p.t - diff * 864e5 })));
    }
    return fixed.sort((a, b) => a.t - b.t);
  }
  function nextPrayer(now, loc) {
    const all = around(now, loc).filter((p) => p.k !== "sunrise" || true);
    const five = all.filter((p) => p.k !== "sunrise");
    const next = five.find((p) => p.t > now) || five[five.length - 1];
    const prev = [...five].reverse().find((p) => p.t <= now) || five[0];
    const d0 = new Date(now);
    const s = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime();
    const list = all.filter((p) => p.t >= s && p.t < s + 864e5);
    return { next, prev, list };
  }

  // pub/ayahs-short.json
  var ayahs_short_default = [[2, 152, "\u0641\u064E\u0671\u0630\u0652\u0643\u064F\u0631\u064F\u0648\u0646\u0650\u0649\u0653 \u0623\u064E\u0630\u0652\u0643\u064F\u0631\u0652\u0643\u064F\u0645\u0652 \u0648\u064E\u0671\u0634\u0652\u0643\u064F\u0631\u064F\u0648\u0627\u06DF \u0644\u0650\u0649 \u0648\u064E\u0644\u064E\u0627 \u062A\u064E\u0643\u0652\u0641\u064F\u0631\u064F\u0648\u0646\u0650"], [2, 156, "\u0671\u0644\u0651\u064E\u0630\u0650\u064A\u0646\u064E \u0625\u0650\u0630\u064E\u0627\u0653 \u0623\u064E\u0635\u064E\u0670\u0628\u064E\u062A\u0652\u0647\u064F\u0645 \u0645\u0651\u064F\u0635\u0650\u064A\u0628\u064E\u0629\u064C\u06ED \u0642\u064E\u0627\u0644\u064F\u0648\u0653\u0627\u06DF \u0625\u0650\u0646\u0651\u064E\u0627 \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0627\u0653 \u0625\u0650\u0644\u064E\u064A\u0652\u0647\u0650 \u0631\u064E\u0670\u062C\u0650\u0639\u064F\u0648\u0646\u064E"], [94, 5, "\u0641\u064E\u0625\u0650\u0646\u0651\u064E \u0645\u064E\u0639\u064E \u0671\u0644\u0652\u0639\u064F\u0633\u0652\u0631\u0650 \u064A\u064F\u0633\u0652\u0631\u064B\u0627"], [94, 6, "\u0625\u0650\u0646\u0651\u064E \u0645\u064E\u0639\u064E \u0671\u0644\u0652\u0639\u064F\u0633\u0652\u0631\u0650 \u064A\u064F\u0633\u0652\u0631\u064B\u06ED\u0627"], [93, 3, "\u0645\u064E\u0627 \u0648\u064E\u062F\u0651\u064E\u0639\u064E\u0643\u064E \u0631\u064E\u0628\u0651\u064F\u0643\u064E \u0648\u064E\u0645\u064E\u0627 \u0642\u064E\u0644\u064E\u0649\u0670"], [93, 5, "\u0648\u064E\u0644\u064E\u0633\u064E\u0648\u0652\u0641\u064E \u064A\u064F\u0639\u0652\u0637\u0650\u064A\u0643\u064E \u0631\u064E\u0628\u0651\u064F\u0643\u064E \u0641\u064E\u062A\u064E\u0631\u0652\u0636\u064E\u0649\u0670\u0653"], [55, 13, "\u0641\u064E\u0628\u0650\u0623\u064E\u0649\u0651\u0650 \u0621\u064E\u0627\u0644\u064E\u0627\u0653\u0621\u0650 \u0631\u064E\u0628\u0651\u0650\u0643\u064F\u0645\u064E\u0627 \u062A\u064F\u0643\u064E\u0630\u0651\u0650\u0628\u064E\u0627\u0646\u0650"], [112, 1, "\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0671\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u064C"], [112, 2, "\u0671\u0644\u0644\u0651\u064E\u0647\u064F \u0671\u0644\u0635\u0651\u064E\u0645\u064E\u062F\u064F"], [108, 1, "\u0625\u0650\u0646\u0651\u064E\u0627\u0653 \u0623\u064E\u0639\u0652\u0637\u064E\u064A\u0652\u0646\u064E\u0670\u0643\u064E \u0671\u0644\u0652\u0643\u064E\u0648\u0652\u062B\u064E\u0631\u064E"], [3, 139, "\u0648\u064E\u0644\u064E\u0627 \u062A\u064E\u0647\u0650\u0646\u064F\u0648\u0627\u06DF \u0648\u064E\u0644\u064E\u0627 \u062A\u064E\u062D\u0652\u0632\u064E\u0646\u064F\u0648\u0627\u06DF \u0648\u064E\u0623\u064E\u0646\u062A\u064F\u0645\u064F \u0671\u0644\u0652\u0623\u064E\u0639\u0652\u0644\u064E\u0648\u0652\u0646\u064E \u0625\u0650\u0646 \u0643\u064F\u0646\u062A\u064F\u0645 \u0645\u0651\u064F\u0624\u0652\u0645\u0650\u0646\u0650\u064A\u0646\u064E"], [29, 57, "\u0643\u064F\u0644\u0651\u064F \u0646\u064E\u0641\u0652\u0633\u064D\u06E2 \u0630\u064E\u0627\u0653\u0626\u0650\u0642\u064E\u0629\u064F \u0671\u0644\u0652\u0645\u064E\u0648\u0652\u062A\u0650 \u06D6 \u062B\u064F\u0645\u0651\u064E \u0625\u0650\u0644\u064E\u064A\u0652\u0646\u064E\u0627 \u062A\u064F\u0631\u0652\u062C\u064E\u0639\u064F\u0648\u0646\u064E"], [55, 26, "\u0643\u064F\u0644\u0651\u064F \u0645\u064E\u0646\u0652 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u064E\u0627 \u0641\u064E\u0627\u0646\u064D\u06E2"], [55, 27, "\u0648\u064E\u064A\u064E\u0628\u0652\u0642\u064E\u0649\u0670 \u0648\u064E\u062C\u0652\u0647\u064F \u0631\u064E\u0628\u0651\u0650\u0643\u064E \u0630\u064F\u0648 \u0671\u0644\u0652\u062C\u064E\u0644\u064E\u0670\u0644\u0650 \u0648\u064E\u0671\u0644\u0652\u0625\u0650\u0643\u0652\u0631\u064E\u0627\u0645\u0650"], [89, 27, "\u064A\u064E\u0670\u0653\u0623\u064E\u064A\u0651\u064E\u062A\u064F\u0647\u064E\u0627 \u0671\u0644\u0646\u0651\u064E\u0641\u0652\u0633\u064F \u0671\u0644\u0652\u0645\u064F\u0637\u0652\u0645\u064E\u0626\u0650\u0646\u0651\u064E\u0629\u064F"], [89, 28, "\u0671\u0631\u0652\u062C\u0650\u0639\u0650\u0649\u0653 \u0625\u0650\u0644\u064E\u0649\u0670 \u0631\u064E\u0628\u0651\u0650\u0643\u0650 \u0631\u064E\u0627\u0636\u0650\u064A\u064E\u0629\u064B\u06ED \u0645\u0651\u064E\u0631\u0652\u0636\u0650\u064A\u0651\u064E\u0629\u064B\u06ED"], [89, 30, "\u0648\u064E\u0671\u062F\u0652\u062E\u064F\u0644\u0650\u0649 \u062C\u064E\u0646\u0651\u064E\u062A\u0650\u0649"], [36, 58, "\u0633\u064E\u0644\u064E\u0670\u0645\u064C\u06ED \u0642\u064E\u0648\u0652\u0644\u064B\u06ED\u0627 \u0645\u0651\u0650\u0646 \u0631\u0651\u064E\u0628\u0651\u064D\u06E2 \u0631\u0651\u064E\u062D\u0650\u064A\u0645\u064D\u06E2"], [56, 89, "\u0641\u064E\u0631\u064E\u0648\u0652\u062D\u064C\u06ED \u0648\u064E\u0631\u064E\u064A\u0652\u062D\u064E\u0627\u0646\u064C\u06ED \u0648\u064E\u062C\u064E\u0646\u0651\u064E\u062A\u064F \u0646\u064E\u0639\u0650\u064A\u0645\u064D\u06E2"]];

  // pub/snames.json
  var snames_default = ["\u0671\u0644\u0652\u0641\u064E\u0627\u062A\u0650\u062D\u064E\u0629\u0650", "\u0627\u0644\u0628\u064E\u0642\u064E\u0631\u064E\u0629\u0650", "\u0627\u0653\u0644\u0650 \u0639\u0650\u0645\u06E1\u0631\u064E\u0627\u0646\u064E", "\u0627\u0644\u0646\u0651\u0650\u0633\u064E\u0627\u0621\u0650", "\u0627\u0644\u0645\u064E\u0627\u0626\u0640\u0650\u062F\u064E\u0629\u0650", "\u0627\u0644\u0623\u064E\u0646\u06E1\u0639\u064E\u0627\u0645\u0650", "\u0627\u0644\u0623\u064E\u0639\u06E1\u0631\u064E\u0627\u0641\u0650", "\u0627\u0644\u0623\u064E\u0646\u0641\u064E\u0627\u0644\u0650", "\u0627\u0644\u062A\u0651\u064E\u0648\u06E1\u0628\u064E\u0629\u0650", "\u064A\u064F\u0648\u0646\u064F\u0633\u064E", "\u0647\u064F\u0648\u062F\u064D", "\u064A\u064F\u0648\u0633\u064F\u0641\u064E", "\u0627\u0644\u0631\u0651\u064E\u0639\u06E1\u062F\u0650", "\u0625\u0650\u0628\u06E1\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E", "\u0627\u0644\u062D\u0650\u062C\u06E1\u0631\u0650", "\u0627\u0644\u0646\u0651\u064E\u062D\u06E1\u0644\u0650", "\u0627\u0644\u0625\u0650\u0633\u06E1\u0631\u064E\u0627\u0621\u0650", "\u0627\u0644\u0643\u064E\u0647\u06E1\u0641\u0650", "\u0645\u064E\u0631\u06E1\u064A\u064E\u0645\u064E", "\u0637\u0647", "\u0627\u0644\u0623\u064E\u0646\u0628\u0650\u064A\u064E\u0627\u0621\u0650", "\u0627\u0644\u062D\u064E\u062C\u0651\u0650", "\u0627\u0644\u0645\u064F\u0624\u06E1\u0645\u0650\u0646\u064F\u0648\u0646\u064E", "\u0627\u0644\u0646\u0651\u064F\u0648\u0631\u0650", "\u0627\u0644\u0641\u064F\u0631\u06E1\u0642\u064E\u0627\u0646\u0650", "\u0627\u0644\u0634\u0651\u064F\u0639\u064E\u0631\u064E\u0627\u0621\u0650", "\u0627\u0644\u0646\u0651\u064E\u0645\u06E1\u0644\u0650", "\u0627\u0644\u0642\u064E\u0635\u064E\u0635\u0650", "\u0627\u0644\u0639\u064E\u0646\u0643\u064E\u0628\u064F\u0648\u062A\u0650", "\u0627\u0644\u0631\u0651\u064F\u0648\u0645\u0650", "\u0644\u064F\u0642\u06E1\u0645\u064E\u0627\u0646\u064E", "\u0627\u0644\u0633\u0651\u064E\u062C\u06E1\u062F\u064E\u0629\u0650", "\u0627\u0644\u0623\u064E\u062D\u06E1\u0632\u064E\u0627\u0628\u0650", "\u0633\u064E\u0628\u064E\u0625\u064D", "\u0641\u064E\u0627\u0637\u0650\u0631\u064D", "\u064A\u0633\u0653", "\u0627\u0644\u0635\u0651\u064E\u0627\u0641\u0651\u064E\u0627\u062A\u0650", "\u0635\u0653", "\u0627\u0644\u0632\u0651\u064F\u0645\u064E\u0631\u0650", "\u063A\u064E\u0627\u0641\u0650\u0631\u064D", "\u0641\u064F\u0635\u0651\u0650\u0644\u064E\u062A\u06E1", "\u0627\u0644\u0634\u0651\u064F\u0648\u0631\u064E\u0649\u0670", "\u0627\u0644\u0632\u0651\u064F\u062E\u06E1\u0631\u064F\u0641\u0650", "\u0627\u0644\u062F\u0651\u064F\u062E\u064E\u0627\u0646\u0650", "\u0627\u0644\u062C\u064E\u0627\u062B\u0650\u064A\u064E\u0629\u0650", "\u0627\u0644\u0623\u064E\u062D\u06E1\u0642\u064E\u0627\u0641\u0650", "\u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D", "\u0627\u0644\u0641\u064E\u062A\u06E1\u062D\u0650", "\u0627\u0644\u062D\u064F\u062C\u064F\u0631\u064E\u0627\u062A\u0650", "\u0642\u0653", "\u0627\u0644\u0630\u0651\u064E\u0627\u0631\u0650\u064A\u064E\u0627\u062A\u0650", "\u0627\u0644\u0637\u0651\u064F\u0648\u0631\u0650", "\u0627\u0644\u0646\u0651\u064E\u062C\u06E1\u0645\u0650", "\u0627\u0644\u0642\u064E\u0645\u064E\u0631\u0650", "\u0627\u0644\u0631\u0651\u064E\u062D\u06E1\u0645\u064E\u0670\u0646", "\u0627\u0644\u0648\u064E\u0627\u0642\u0650\u0639\u064E\u0629\u0650", "\u0627\u0644\u062D\u064E\u062F\u0650\u064A\u062F\u0650", "\u0627\u0644\u0645\u064F\u062C\u064E\u0627\u062F\u0644\u064E\u0629\u0650", "\u0627\u0644\u062D\u064E\u0634\u06E1\u0631\u0650", "\u0627\u0644\u0645\u064F\u0645\u06E1\u062A\u064E\u062D\u0646\u064E\u0629\u0650", "\u0627\u0644\u0635\u0651\u064E\u0641\u0651\u0650", "\u0627\u0644\u062C\u064F\u0645\u064F\u0639\u064E\u0629\u0650", "\u0627\u0644\u0645\u064F\u0646\u064E\u0627\u0641\u0650\u0642\u064F\u0648\u0646\u064E", "\u0627\u0644\u062A\u0651\u064E\u063A\u064E\u0627\u0628\u064F\u0646\u0650", "\u0627\u0644\u0637\u0651\u064E\u0644\u064E\u0627\u0642\u0650", "\u0627\u0644\u062A\u0651\u064E\u062D\u06E1\u0631\u0650\u064A\u0645\u0650", "\u0627\u0644\u0645\u064F\u0644\u06E1\u0643\u0650", "\u0627\u0644\u0642\u064E\u0644\u064E\u0645\u0650", "\u0627\u0644\u062D\u064E\u0627\u0642\u0651\u064E\u0629\u0650", "\u0627\u0644\u0645\u064E\u0639\u064E\u0627\u0631\u0650\u062C\u0650", "\u0646\u064F\u0648\u062D\u064D", "\u0627\u0644\u062C\u0650\u0646\u0651\u0650", "\u0627\u0644\u0645\u064F\u0632\u0651\u064E\u0645\u0651\u0650\u0644\u0650", "\u0627\u0644\u0645\u064F\u062F\u0651\u064E\u062B\u0651\u0650\u0631\u0650", "\u0627\u0644\u0642\u0650\u064A\u064E\u0627\u0645\u064E\u0629\u0650", "\u0627\u0644\u0625\u0650\u0646\u0633\u064E\u0627\u0646\u0650", "\u0627\u0644\u0645\u064F\u0631\u06E1\u0633\u064E\u0644\u064E\u0627\u062A\u0650", "\u0627\u0644\u0646\u0651\u064E\u0628\u064E\u0625\u0650", "\u0627\u0644\u0646\u0651\u064E\u0627\u0632\u0650\u0639\u064E\u0627\u062A\u0650", "\u0639\u064E\u0628\u064E\u0633\u064E", "\u0627\u0644\u062A\u0651\u064E\u0643\u06E1\u0648\u0650\u064A\u0631\u0650", "\u0627\u0644\u0627\u0646\u0641\u0650\u0637\u064E\u0627\u0631\u0650", "\u0627\u0644\u0645\u064F\u0637\u064E\u0641\u0651\u0650\u0641\u0650\u064A\u0646\u064E", "\u0627\u0644\u0627\u0646\u0634\u0650\u0642\u064E\u0627\u0642\u0650", "\u0627\u0644\u0628\u064F\u0631\u064F\u0648\u062C\u0650", "\u0627\u0644\u0637\u0651\u064E\u0627\u0631\u0650\u0642\u0650", "\u0627\u0644\u0623\u064E\u0639\u06E1\u0644\u064E\u0649\u0670", "\u0627\u0644\u063A\u064E\u0627\u0634\u0650\u064A\u064E\u0629\u0650", "\u0627\u0644\u0641\u064E\u062C\u06E1\u0631\u0650", "\u0627\u0644\u0628\u064E\u0644\u064E\u062F\u0650", "\u0627\u0644\u0634\u0651\u064E\u0645\u06E1\u0633\u0650", "\u0627\u0644\u0644\u0651\u064E\u064A\u06E1\u0644\u0650", "\u0627\u0644\u0636\u0651\u064F\u062D\u064E\u0649\u0670", "\u0627\u0644\u0634\u0651\u064E\u0631\u06E1\u062D\u0650", "\u0627\u0644\u062A\u0651\u0650\u064A\u0646\u0650", "\u0627\u0644\u0639\u064E\u0644\u064E\u0642\u0650", "\u0627\u0644\u0642\u064E\u062F\u06E1\u0631\u0650", "\u0627\u0644\u0628\u064E\u064A\u0651\u0650\u0646\u064E\u0629\u0650", "\u0627\u0644\u0632\u0651\u064E\u0644\u06E1\u0632\u064E\u0644\u064E\u0629\u0650", "\u0627\u0644\u0639\u064E\u0627\u062F\u0650\u064A\u064E\u0627\u062A\u0650", "\u0627\u0644\u0642\u064E\u0627\u0631\u0650\u0639\u064E\u0629\u0650", "\u0627\u0644\u062A\u0651\u064E\u0643\u064E\u0627\u062B\u064F\u0631\u0650", "\u0627\u0644\u0639\u064E\u0635\u06E1\u0631\u0650", "\u0627\u0644\u0647\u064F\u0645\u064E\u0632\u064E\u0629\u0650", "\u0627\u0644\u0641\u0650\u064A\u0644\u0650", "\u0642\u064F\u0631\u064E\u064A\u06E1\u0634\u064D", "\u0627\u0644\u0645\u064E\u0627\u0639\u064F\u0648\u0646\u0650", "\u0627\u0644\u0643\u064E\u0648\u06E1\u062B\u064E\u0631\u0650", "\u0627\u0644\u0643\u064E\u0627\u0641\u0650\u0631\u064F\u0648\u0646\u064E", "\u0627\u0644\u0646\u0651\u064E\u0635\u06E1\u0631\u0650", "\u0627\u0644\u0645\u064E\u0633\u064E\u062F\u0650", "\u0627\u0644\u0625\u0650\u062E\u06E1\u0644\u064E\u0627\u0635\u0650", "\u0627\u0644\u0641\u064E\u0644\u064E\u0642\u0650", "\u0627\u0644\u0646\u0651\u064E\u0627\u0633\u0650"];

  // pub/sw.src.ts
  var SHELL = "mem-shell-v1";
  var AUDIO = "mem-audio-v1";
  var NOTIF = "mem-notif-v1";
  var SCOPE = self.registration.scope;
  var absolute = (u, base) => new URL(u, base).href;
  async function precache(indexText, indexUrl) {
    const c = await caches.open(SHELL);
    const urls = /* @__PURE__ */ new Set();
    for (const m of indexText.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const u = absolute(m[1], indexUrl);
      if (u.startsWith(SCOPE) && !u.endsWith("/")) urls.add(u);
    }
    const css = [...urls].filter((u) => /style\.css/.test(u));
    for (const cu of css) {
      try {
        const r = await fetch(cu, { cache: "no-cache" });
        if (!r.ok) continue;
        const t = await r.clone().text();
        await c.put(cu, r);
        urls.delete(cu);
        for (const m of t.matchAll(/url\(([^)]+)\)/g)) {
          const f = m[1].replace(/["']/g, "");
          if (f.startsWith("data:")) continue;
          urls.add(absolute(f, cu));
        }
      } catch (e) {
      }
    }
    for (const u of urls) {
      if (/\/(3-)?sw\.js/.test(u)) continue;
      try {
        if (!await c.match(u)) {
          const r = await fetch(u);
          if (r.ok) await c.put(u, r);
        }
      } catch (e) {
      }
    }
    const cur = /* @__PURE__ */ new Set([...urls, ...css]);
    for (const k of await c.keys()) {
      if (/(app\.js|style\.css)/.test(k.url) && !cur.has(k.url)) await c.delete(k);
    }
  }
  self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil((async () => {
      try {
        const r = await fetch(SCOPE, { cache: "no-cache" });
        if (r.ok) {
          const t = await r.clone().text();
          await (await caches.open(SHELL)).put(SCOPE, r);
          await precache(t, SCOPE);
        }
      } catch (err) {
      }
    })());
  });
  self.addEventListener("activate", (e) => e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL && k !== AUDIO && k !== NOTIF) await caches.delete(k);
    await self.clients.claim();
    refresh(false).catch(() => {
    });
  })()));
  async function navigate(e) {
    const c = await caches.open(SHELL);
    const hit = await c.match(SCOPE);
    const net = (async () => {
      const r = await fetch(e.request, { cache: "no-cache" });
      if (r.ok) {
        const t = await r.clone().text();
        await c.put(SCOPE, r.clone());
        e.waitUntil(precache(t, SCOPE));
      }
      return r;
    })();
    if (!hit) return net;
    const timer = new Promise((res) => setTimeout(() => res(hit), 4e3));
    try {
      return await Promise.race([net, timer]);
    } catch (err) {
      return hit;
    }
  }
  async function asset(req) {
    const c = await caches.open(SHELL);
    const hit = await c.match(req.url);
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && r.status === 200) c.put(req.url, r.clone());
    return r;
  }
  async function audio(req) {
    const c = await caches.open(AUDIO);
    const hit = await c.match(req.url);
    if (!hit) return fetch(req);
    const blob = await hit.blob();
    const size = blob.size;
    const range = req.headers.get("range");
    const type = "audio/mpeg";
    if (!range) return new Response(blob, { status: 200, headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" } });
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let s = m && m[1] ? parseInt(m[1], 10) : 0;
    let en = m && m[2] ? parseInt(m[2], 10) : size - 1;
    if (m && !m[1] && m[2]) {
      s = Math.max(0, size - parseInt(m[2], 10));
      en = size - 1;
    }
    if (s >= size) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
    en = Math.min(en, size - 1);
    return new Response(blob.slice(s, en + 1), { status: 206, headers: { "Content-Type": type, "Content-Length": String(en - s + 1), "Content-Range": `bytes ${s}-${en}/${size}`, "Accept-Ranges": "bytes" } });
  }
  self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const u = new URL(req.url);
    if (u.hostname === "cdn.mp3quran.net" && u.pathname.endsWith(".mp3")) {
      e.respondWith(audio(req));
      return;
    }
    if (u.origin !== self.location.origin) return;
    if (/\/\d+-ad\.bin$/.test(u.pathname)) return;
    if (req.mode === "navigate") {
      e.respondWith(navigate(e));
      return;
    }
    if (/\/(3-)?sw\.js$/.test(u.pathname)) return;
    e.respondWith(asset(req));
  });
  var AR = { fajr: "\u0627\u0644\u0641\u062C\u0631", dhuhr: "\u0627\u0644\u0638\u0647\u0631", asr: "\u0627\u0644\u0639\u0635\u0631", maghrib: "\u0627\u0644\u0645\u063A\u0631\u0628", isha: "\u0627\u0644\u0639\u0634\u0627\u0621" };
  var short = (ms) => {
    const m = Math.max(0, Math.ceil(ms / 6e4)), h = Math.floor(m / 60), r = m % 60;
    return h ? h + "h " + r + "m" : (r || 1) + "m";
  };
  var pl = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  var left = (ms) => {
    const m = Math.max(0, Math.ceil(ms / 6e4)), h = Math.floor(m / 60), r = m % 60;
    if (!h) return pl(r || 1, "minute");
    return pl(h, "hour") + (r ? " " + pl(r, "minute") : "");
  };
  var clock = (t) => {
    const d = new Date(t), h = d.getHours(), m = d.getMinutes();
    return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? " AM" : " PM");
  };
  var LINE = "\u0635\u0644\u0650\u0651 \u0639\u0644\u0649 \u0645\u062D\u0645\u062F \uFDFA";
  var TITLE = "\u0635\u0644\u0650\u0651 \u0639\u0644\u0649 \u0645\u062D\u0645\u062F";
  var NKEY = () => self.location.origin + "/__notif";
  async function readN() {
    const c = await caches.open(NOTIF);
    const h = await c.match(NKEY());
    return { c, d: h ? await h.json() : null };
  }
  async function closeLegacy() {
    const ns = await self.registration.getNotifications();
    ns.forEach((n) => {
      if (n.tag === "salawat" || n.tag === "salawat-test") n.close();
    });
  }
  async function closeAll() {
    const ns = await self.registration.getNotifications();
    ns.forEach((n) => {
      if ((n.tag || "").indexOf("salawat") === 0) n.close();
    });
  }
  async function live(loc) {
    const now = Date.now();
    const nx = nextPrayer(now, loc).next;
    await self.registration.showNotification(TITLE, { body: (AR[nx.k] || nx.k) + " " + clock(nx.t) + " - " + short(nx.t - now) + "\n\nNext prayer: " + (AR[nx.k] || nx.k) + "\nTime: " + clock(nx.t) + "\n\nRemaining: " + left(nx.t - now) + "\n\n" + LINE, tag: "salawat-live", silent: true, renotify: false, requireInteraction: true, icon: "./5-6-notif.png", badge: "./6-6-badge.png", lang: "en", dir: "ltr", data: { url: "./#/prayer" } });
    return nx;
  }
  async function alertMaybe(d, loc, nx) {
    const now = Date.now();
    if (nx.t - now > 31 * 6e4) return false;
    const al = (d.al || []).filter((t) => now - t < 864e5 * 2);
    if (al.includes(nx.t)) return false;
    await self.registration.showNotification(TITLE, { body: (AR[nx.k] || nx.k) + " " + clock(nx.t) + " - " + short(nx.t - now) + "\n\nPrayer time is near: " + (AR[nx.k] || nx.k) + "\nTime: " + clock(nx.t) + "\n\nRemaining: " + left(nx.t - now) + "\n\n" + LINE, tag: "salawat-" + nx.k, image: "./7-6-banner.jpg", icon: "./5-6-notif.png", badge: "./6-6-badge.png", lang: "en", dir: "ltr", data: { url: "./#/prayer" } });
    al.push(nx.t);
    d.al = al;
    return true;
  }
  async function showAy(ix, quiet) {
    const x = ayahs_short_default[ix % ayahs_short_default.length];
    await self.registration.showNotification("\u0633\u0648\u0631\u0629 " + snames_default[x[0] - 1] + " \xB7 " + x[1], { body: x[2], tag: "salawat-ay", silent: !!quiet, icon: "./5-6-notif.png", badge: "./6-6-badge.png", lang: "ar", dir: "rtl", actions: [{ action: "renew", title: "\u062A\u062C\u062F\u064A\u062F" }], data: { url: "./#/quran/" + x[0] + "/" + x[1], ix: ix % ayahs_short_default.length } });
  }
  var AY_SLOTS = [[8, 30], [12, 30], [16, 30], [20, 30]];
  async function ayahMaybe(d) {
    const now = /* @__PURE__ */ new Date(), mins = now.getHours() * 60 + now.getMinutes();
    const day2 = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
    for (let i = 0; i < AY_SLOTS.length; i++) {
      const at = AY_SLOTS[i][0] * 60 + AY_SLOTS[i][1], key = day2 * 10 + i;
      if (mins < at || mins > at + 45 || (d.ay || []).includes(key)) continue;
      await showAy((day2 * 4 + i) % ayahs_short_default.length, false);
      d.ay = [...(d.ay || []).filter((k) => k > key - 30), key];
      return true;
    }
    return false;
  }
  async function refresh(fromPush) {
    return Promise.race([refresh2(fromPush), new Promise((res) => setTimeout(res, 9e3))]);
  }
  async function refresh2(fromPush) {
    const { c, d } = await readN();
    if (!fromPush && !(d && d.on)) {
      await closeAll();
      return;
    }
    if (d && d.on === false) {
      if (fromPush) await self.registration.showNotification("Prayer times", { tag: "salawat-live", body: "", silent: true });
      await closeAll();
      return;
    }
    await closeLegacy();
    const loc = d && d.loc ? d.loc : { lat: 30.0444, lon: 31.2357, src: "tz", name: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629" };
    const nx = await live(loc);
    if (d) {
      await alertMaybe(d, loc, nx);
      await ayahMaybe(d);
      await c.put(NKEY(), new Response(JSON.stringify(d)));
    }
  }
  self.addEventListener("push", (e) => e.waitUntil(refresh(true)));
  self.addEventListener("periodicsync", (e) => {
    if (e.tag === "mem-salawat") e.waitUntil(refresh(false));
  });
  self.addEventListener("message", (e) => {
    if (e.data && e.data.t === "refresh") e.waitUntil(refresh(false));
  });
  self.addEventListener("notificationclick", (e) => {
    if (e.action === "renew") {
      const ix = (e.notification.data && e.notification.data.ix || 0) + 1;
      e.waitUntil(showAy(ix, true));
      return;
    }
    e.notification.close();
    e.waitUntil((async () => {
      const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of cs) {
        if ("focus" in c) {
          await c.focus();
          return;
        }
      }
      await self.clients.openWindow(e.notification.data && e.notification.data.url || "./");
    })());
  });
})();
