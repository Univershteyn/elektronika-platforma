/* O‘qituvchi jurnali, o‘qituvchi paneli va AI maslahatchi.
   Namuna (Frank–Gerts) dagi UX: parol darvozasi, bo‘limlar, talaba yozuvlari,
   jsPDF eksport, localStorage. AI: window.claude.use("sample") bo‘lsa shu yo‘l,
   aks holda egasining reestr skripti (kalit faqat Apps Script xossasida),
   u ham ishlamasa ichki qoida-asosli maslahatchi. Repoda maxfiy kalit yo‘q.
   Standart o‘qituvchi paroli kodda ochiq yozilmaydi — faqat SHA-256("ELAB|"+parol). */
(function () {
  "use strict";
  const EL = window.ELAB;
  if (!EL) { console.warn("ELAB bridge missing"); return; }

  const DEFH = "46a72ff6bd9d9c6645cd949f7005bf06af1698804c7d895f42ef8da711fbdd66";
  const LEGACY_SYNC = "Jurnal skriptingiz eski. Baho va izoh hozircha shu brauzerda qoladi. O‘z jadval nusxangizdagi Apps Scriptni yangilab, yangi versiya qilib joylang — shunda barcha qurilmalarda bir xil bo‘ladi.";
  const KEY = "elektronika_teach_v1";
  const STEPS = ["", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];

  const UI = {
    uz: {
      teachBtn: "O‘qituvchi", teacher_panel: "O‘qituvchi paneli", journal: "O‘qituvchi jurnali",
      tab_journal: "Jurnal",       tab_guide: "Yo‘riqnoma", tab_list: "Talabalar", tab_an: "Tahlil", tab_lb: "Reyting", tab_set: "Sozlama",
      tp_pw: "O‘qituvchi paroli", tp_login: "Kirish", tp_badpw: "Parol noto‘g‘ri.",
      tp_about: "Google bilan o‘qituvchi sifatida kirgan bo‘lsangiz, parol so‘ralmaydi. Parol faqat Google siz ulanmagan eski jurnal uchun.",
      tp_std: "Eski standart parol: 123456. Google hisobi bo‘lsa, u ishlatilmaydi.",
      tp_info: "Google jurnali jadvaldan keladi: telefon va kompyuterda talabalar bir xil. Google siz bo‘lmagan yozuv shu brauzerda qoladi.",
      tp_csv: "CSV (anonim)", tp_xapi: "JSON: xAPI jurnali (anonim)", tp_full: "JSON: to‘liq (ism bilan)",
      tp_pdf: "Jurnalni PDF", tp_pdf1: "Shu talaba PDF", tp_import: "JSON import", tp_logout: "Chiqish",
      tp_student: "Talaba", tp_group: "Guruh", tp_lab: "Ish", tp_status: "Holat", tp_steps: "Bosqich",
      tp_tests: "Testlar", tp_series: "Seriyalar", tp_score: "Ball", tp_grade: "Baho", tp_updated: "Yangilangan",
      tp_done: "Yakunlangan", tp_active: "Jarayonda", tp_empty: "Hali yozuv yo‘q. Talaba laboratoriya ochganda jurnal to‘ladi.",
      tp_del: "O‘chirish", tp_confirm: "«{n}» yozuvi jurnaldan o‘chirilsinmi?", tp_note: "O‘qituvchi izohi",
      tp_save: "Saqlash", tp_pwchange: "Parolni almashtirish", tp_pwnew: "Yangi parol (kamida 6 belgi)",
      tp_pwshort: "Parol kamida 6 belgidan iborat bo‘lsin.", tp_pwok: "Yangi parol saqlandi. Google bilan kirilganda parol so‘ralmaydi.",
      tp_avg: "O‘rtacha", tp_legend: "Katakdagi son — 5 balllik baho (5 a‘lo, 4 yaxshi, 3 qoniqarli, 2 qoniqarsiz). Ko‘k raqam — joriy bosqich.",
      tp_filter: "Guruh", tp_all: "Barchasi", tp_open: "Batafsil", tp_back: "Jadvalga qaytish",
      tp_imp_res: "Import: {ok} ta qabul qilindi, {bad} ta nazorat yig‘indisi mos kelmadi, {fail} ta o‘qilmadi.",
      tp_imp_ok: "tekshirilgan", tp_imp_bad: "yig‘indi mos emas",
      an_h: "Tahlil", an_none: "Tahlil uchun hali yakunlangan ish yo‘q.",
      an_avg: "O‘rtacha ball (yakunlangan ishlar)", an_fin: "Yakunlaganlar soni",
      an_wrong: "Ko‘p adashilgan hisoblar (noto‘g‘ri qolgan)",
      lb_h: "Reyting", lb_done: "Yakunlangan ish", lb_mean: "O‘rtacha ball",
      ai_btn: "AI maslahatchi", ai_h: "AI maslahatchi",
      ai_p: "Tayyor son bermaydi — formulani, tartibni va xato turini aytadi. Test paytida o‘chiriladi.",
      ai_ph: "Savolingizni yozing…", ai_send: "Yuborish", ai_think: "O‘ylayapti…",
      ai_src_off: "Ichki maslahatchi (internetsiz)", ai_src_net: "Tarmoq maslahatchisi",
      ai_netfail: "(Tarmoq javob bermadi — ichki maslahatchi ishladi.)",
      ai_ask: "Maslahatchidan so‘rash",
      h_format: "Son formatida kiriting (masalan 4,95 yoki 1,23e-3). Vergul ham bo‘ladi.",
      h_order: "Qiymat tartibi noto‘g‘ri: birliklar va daraja ko‘rsatkichini tekshiring.",
      h_sign: "Ishorani tekshiring.",
      h_close: "Yaqin, lekin ruxsat etilgan ±5 % dan tashqarida. Yaxlitlashni va formuladagi o‘zgarmasni qayta ko‘ring.",
      h_check: "Hisobni qayta tekshiring. Tayyor son berilmaydi.",
      h_pct: "Natijani foizda kiriting (×100).",
      h_unit: "Birlikni tekshiring: maydon so‘ragan birlikda yozing ({u}).",
      h_bits: "Faqat 0 va 1 yozing, probelsiz.",
      h_len: "Ketma-ketlik uzunligi mos emas. Savolda nechta bit so‘ralganini sanang.",
      h_inv: "0 va 1 o‘rni almashgan bo‘lishi mumkin (inkor).",
      h_bit: "Ayrim bitlar mos kelmayapti. Chinlik jadvalini qatorma-qator solishtiring, tayyor qatorni aytmayman.",
      h_formula: "Formula",
      st_pre: "Kirish testi", st_theory: "Nazariya", st_asm: "Qurilma", st_meas: "O‘lchash", st_calc: "Hisoblash", st_fin: "Xulosa", st_rep: "Hisobot"
    },
    ru: {
      teachBtn: "Преподаватель", teacher_panel: "Панель преподавателя", journal: "Журнал преподавателя",
      tab_journal: "Журнал", tab_guide: "Yo‘riqnoma", tab_list: "Студенты", tab_an: "Аналитика", tab_lb: "Рейтинг", tab_set: "Настройки",
      guide_lang: "Qadamlar o‘zbek tilida — saytdagi tugmalar bilan bir xil.",
      tp_pw: "Пароль преподавателя", tp_login: "Войти", tp_badpw: "Неверный пароль.",
      tp_about: "Если вы вошли как преподаватель через Google, пароль не нужен. Пароль — только для старого журнала без Google.",
      tp_std: "Старый пароль: 123456. С Google он не используется.",
      tp_info: "Студент попадает в журнал, когда регистрируется на этом компьютере. Чужой JSON можно импортировать. Полный отчёт с графиками студент скачивает сам.",
      tp_csv: "CSV (анонимно)", tp_xapi: "JSON: журнал xAPI (анонимно)", tp_full: "JSON: полный (с именами)",
      tp_pdf: "Журнал в PDF", tp_pdf1: "PDF этого студента", tp_import: "Импорт JSON", tp_logout: "Выйти",
      tp_student: "Студент", tp_group: "Группа", tp_lab: "Работа", tp_status: "Статус", tp_steps: "Этап",
      tp_tests: "Тесты", tp_series: "Серии", tp_score: "Балл", tp_grade: "Оценка", tp_updated: "Обновлено",
      tp_done: "Завершено", tp_active: "В процессе", tp_empty: "Записей пока нет. Журнал заполнится, когда студент откроет работу.",
      tp_del: "Удалить", tp_confirm: "Удалить запись «{n}» из журнала?", tp_note: "Заметка преподавателя",
      tp_save: "Сохранить", tp_pwchange: "Смена пароля", tp_pwnew: "Новый пароль (не менее 6 символов)",
      tp_pwshort: "Пароль должен быть не короче 6 символов.", tp_pwok: "Новый пароль сохранён. При входе через Google пароль не спрашивается.",
      tp_avg: "Среднее", tp_legend: "Число в клетке — итоговый балл. Синее число — текущий этап.",
      tp_filter: "Группа", tp_all: "Все", tp_open: "Подробнее", tp_back: "К таблице",
      tp_imp_res: "Импорт: принято {ok}, контрольная сумма не совпала {bad}, не прочитано {fail}.",
      tp_imp_ok: "проверено", tp_imp_bad: "сумма не совпала",
      an_h: "Аналитика", an_none: "Пока нет завершённых работ для анализа.",
      an_avg: "Средний балл (завершённые работы)", an_fin: "Число завершивших",
      an_wrong: "Частые ошибки в расчётах",
      lb_h: "Рейтинг", lb_done: "Завершено работ", lb_mean: "Средний балл",
      ai_btn: "AI-консультант", ai_h: "AI-консультант",
      ai_p: "Не называет готовое число — объясняет формулу, порядок действий и тип ошибки. Во время теста выключен.",
      ai_ph: "Ваш вопрос…", ai_send: "Отправить", ai_think: "Думает…",
      ai_src_off: "Встроенный консультант (офлайн)", ai_src_net: "Сетевой консультант",
      ai_netfail: "(Сеть не ответила — сработал встроенный консультант.)",
      ai_ask: "Спросить консультанта",
      h_format: "Введите число (например 4,95 или 1,23e-3).",
      h_order: "Неверный порядок величины: проверьте единицы и показатель степени.",
      h_sign: "Проверьте знак.",
      h_close: "Близко, но за пределом ±5 %. Проверьте округление и константу в формуле.",
      h_check: "Проверьте расчёт. Готовое число не сообщается.",
      h_pct: "Введите результат в процентах (×100).",
      h_unit: "Проверьте единицу: в поле нужна единица «{u}».",
      h_bits: "Пишите только 0 и 1, без пробелов.",
      h_len: "Длина последовательности не совпала. Пересчитайте, сколько бит просят.",
      h_inv: "Возможно, 0 и 1 переставлены (инверсия).",
      h_bit: "Часть битов не совпала. Сверьте таблицу истинности построчно.",
      h_formula: "Формула",
      st_pre: "Входной тест", st_theory: "Теория", st_asm: "Установка", st_meas: "Измерение", st_calc: "Расчёт", st_fin: "Вывод", st_rep: "Отчёт"
    },
    en: {
      teachBtn: "Teacher", teacher_panel: "Teacher panel", journal: "Teacher journal",
      tab_journal: "Journal", tab_guide: "Yo‘riqnoma", tab_list: "Students", tab_an: "Analytics", tab_lb: "Ranking", tab_set: "Settings",
      guide_lang: "The steps are in Uzbek, matching the buttons on this site.",
      tp_pw: "Teacher password", tp_login: "Sign in", tp_badpw: "Wrong password.",
      tp_about: "A Google teacher sign-in opens this panel without a password. The password is only a fallback when Google is not used.",
      tp_std: "Legacy password: 123456. It is not used after Google sign-in.",
      tp_info: "A student is written into the journal when they register on this computer. Import a JSON file from another computer. The full report with graphs is downloaded by the student.",
      tp_csv: "CSV (anonymous)", tp_xapi: "JSON: xAPI log (anonymous)", tp_full: "JSON: full (with names)",
      tp_pdf: "Journal PDF", tp_pdf1: "This student PDF", tp_import: "Import JSON", tp_logout: "Sign out",
      tp_student: "Student", tp_group: "Group", tp_lab: "Lab", tp_status: "Status", tp_steps: "Step",
      tp_tests: "Tests", tp_series: "Series", tp_score: "Score", tp_grade: "Grade", tp_updated: "Updated",
      tp_done: "Finished", tp_active: "In progress", tp_empty: "No records yet. The journal fills when a student opens a lab.",
      tp_del: "Delete", tp_confirm: "Delete the record for “{n}”?", tp_note: "Teacher note",
      tp_save: "Save", tp_pwchange: "Change password", tp_pwnew: "New password (at least 6 characters)",
      tp_pwshort: "Use at least 6 characters.", tp_pwok: "New password saved. Google sign-in does not ask for it.",
      tp_avg: "Average", tp_legend: "A number in a cell is the final score. A blue number is the current step.",
      tp_filter: "Group", tp_all: "All", tp_open: "Details", tp_back: "Back to the table",
      tp_imp_res: "Import: accepted {ok}, checksum mismatch {bad}, unreadable {fail}.",
      tp_imp_ok: "verified", tp_imp_bad: "checksum mismatch",
      an_h: "Analytics", an_none: "No finished labs to analyse yet.",
      an_avg: "Average score (finished labs)", an_fin: "Students who finished",
      an_wrong: "Calculations most often left wrong",
      lb_h: "Ranking", lb_done: "Labs finished", lb_mean: "Average score",
      ai_btn: "AI tutor", ai_h: "AI tutor",
      ai_p: "It does not give the final number — it explains the formula, the procedure and the kind of mistake. It is off during tests.",
      ai_ph: "Your question…", ai_send: "Send", ai_think: "Thinking…",
      ai_src_off: "Built-in tutor (offline)", ai_src_net: "Network tutor",
      ai_netfail: "(The network did not answer — the built-in tutor replied.)",
      ai_ask: "Ask the tutor",
      h_format: "Enter a number (for example 4.95 or 1.23e-3).",
      h_order: "Wrong order of magnitude: check the units and the exponent.",
      h_sign: "Check the sign.",
      h_close: "Close, but outside the allowed ±5 %. Check rounding and the constant in the formula.",
      h_check: "Check the calculation. The finished number is not given.",
      h_pct: "Enter the result in percent (×100).",
      h_unit: "Check the unit: the field asks for “{u}”.",
      h_bits: "Use only 0 and 1, with no spaces.",
      h_len: "The bit-string length does not match. Count how many bits the question asks for.",
      h_inv: "0 and 1 may be swapped (inversion).",
      h_bit: "Some bits do not match. Compare the truth table row by row.",
      h_formula: "Formula",
      st_pre: "Entry test", st_theory: "Theory", st_asm: "Setup", st_meas: "Measurement", st_calc: "Calculation", st_fin: "Conclusion", st_rep: "Report"
    }
  };

  function lang() { return (EL.S && UI[EL.S.lang]) ? EL.S.lang : "uz"; }
  function tr(k, map) {
    const d = UI[lang()] || UI.uz;
    let s = (d[k] != null ? d[k] : UI.uz[k]) || k;
    if (map) Object.keys(map).forEach(key => { s = s.replace("{" + key + "}", map[key]); });
    return s;
  }
  function Lng(uz, ru, en) { return { uz: uz, ru: ru, en: en }; }
  function tx(pack) { if (!pack) return ""; const l = lang(); return pack[l] || pack.uz || ""; }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s || "").toLowerCase().replace(/[‘’ʼ`]/g, "'").replace(/\s+/g, " ").trim();
  function nid(id) { return String(id || "").trim().toLowerCase().replace(/\s+/g, ""); }
  function fnv(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function anon(id) { return "S" + fnv("anon|" + nid(id)).toString(36).toUpperCase(); }
  function stepName(n) {
    return tr(["", "st_pre", "st_theory", "st_asm", "st_meas", "st_calc", "st_fin", "st_rep"][n] || "st_pre");
  }
  function gradeText(i) {
    const g = (EL.GRADES && (EL.GRADES[lang()] || EL.GRADES.uz)) || [];
    return g[i] || "";
  }
  function shownPoint(lab) {
    if (!lab) return null;
    if (lab.gradeOverride >= 2 && lab.gradeOverride <= 5) return lab.gradeOverride;
    if (lab.gradePoint >= 2 && lab.gradePoint <= 5) return lab.gradePoint;
    if (lab.baho && lab.baho.mark >= 2) return lab.baho.mark;
    if (lab.gradePoint == null && lab.grade === 0) return 5;
    if (lab.gradePoint == null && lab.grade === 1) return 4;
    if (lab.gradePoint == null && lab.grade === 2) return 3;
    if (lab.gradePoint == null && lab.grade === 3) return 2;
    return null;
  }
  function pointWord(n) {
    const row = (EL.MEZON || []).find(x => x.n === n);
    return row ? row.w : "";
  }
  function applyPoint(lab, n) {
    lab.gradePoint = n;
    lab.gradeWord = pointWord(n);
    lab.grade = n === 5 ? 0 : n === 4 ? 1 : n === 3 ? 2 : 3;
  }
  function fmtVal(v) {
    if (typeof v === "number" && isFinite(v)) {
      const a = Math.abs(v);
      if (a !== 0 && (a < 1e-3 || a >= 1e4)) return v.toExponential(3);
      return String(+v.toPrecision(4));
    }
    return v == null || v === "" ? "—" : String(v);
  }
  function dt(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const p = n => String(n).padStart(2, "0");
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------- per-lab tutor knowledge (no numeric answers) ---------- */
  const GUIDE = {
    1: {
      idea: Lng("Diod Shokli tenglamasiga bo‘ysunadi: I = I_S[exp(U/(n φ_T)) − 1], φ_T = kT/q. T — variantingizdagi harorat.", "Диод подчиняется уравнению Шокли: I = I_S[exp(U/(n φ_T)) − 1], φ_T = kT/q. T — температура вашего варианта.", "The diode follows Shockley’s law: I = I_S[exp(U/(n φ_T)) − 1], φ_T = kT/q. T is your variant’s temperature."),
      asm: Lng("Manba o‘chiq bo‘lsin. Musbat qutb R orqali anodga, katod halqasi manbaning minusiga. Ampermetr ketma-ket (DC mA), voltmetr diodga parallel.", "Питание выключено. Плюс через R на анод, кольцо катода — на минус. Амперметр последовательно (DC mA), вольтметр параллельно диоду.", "Power off. Positive through R to the anode, cathode band to the negative. Ammeter in series (DC mA), voltmeter across the diode."),
      meas: Lng("Ikki seriya: to‘g‘ri ulanish (E: 0…8 V, kamida 10 nuqta) va teskari (E: −12…0 V, kamida 6). «Avto-o‘lchash» seriyani yozadi. Grafik silliq bo‘lishi uchun oraliqlarni teng yoyib yozing.", "Две серии: прямое включение (E: 0…8 В, не меньше 10 точек) и обратное (E: −12…0 В, не меньше 6). «Авто» записывает серию.", "Two series: forward (E: 0…8 V, at least 10 points) and reverse (E: −12…0 V, at least 6). Auto-sweep records the series."),
      task: {
        u5: { k: ["5 ma", "u_d", "ud ", "u d", "to'g'ri kuchlanish", "forward voltage"], t: Lng("I_D = 5 mA gorizontal chiziqni VAX bilan kesishmasidan U_D ni o‘qing. Tokni mA da qoldiring, kuchlanish volt.", "Снимите U_D с пересечения ВАХ и линии I_D = 5 мА. Напряжение в вольтах.", "Read U_D where the curve crosses I_D = 5 mA. Voltage is in volts.") },
        rst: { k: ["r_st", "statik", "static"], t: Lng("R_st = U_D / I_D. I_D ni amperga o‘tkazing: 5 mA = 0,005 A, shunda natija om chiqadi.", "R_st = U_D / I_D. Переведите 5 мА в амперы (0,005 А), тогда ответ в омах.", "R_st = U_D / I_D. Convert 5 mA to amperes (0.005 A) so the result is in ohms.") },
        n: { k: ["ideallik", "phi", "φ", "koeffitsient n", "n ni", "n =", "idealit"], t: Lng("Ikki nuqta: 1 mA va 10 mA. n = (U_2 − U_1) / (φ_T · ln(10)). φ_T = kT/q ni VOLTda oling (millivolt emas, aks holda natija ~1000 marta katta).", "Две точки: 1 мА и 10 мА. n = (U_2 − U_1) / (φ_T · ln(10)). φ_T берите в вольтах, не в милливольтах.", "Two points: 1 mA and 10 mA. n = (U_2 − U_1) / (φ_T · ln(10)). Use φ_T in volts, not millivolts.") },
        rd: { k: ["r_d", "differensial", "differential"], t: Lng("r_d = n·φ_T / I_D. I_D = 5 mA = 0,005 A, φ_T volt. Avval n ni to‘g‘ri toping.", "r_d = n·φ_T / I_D. I_D = 0,005 А, φ_T в вольтах. Сначала найдите n.", "r_d = n·φ_T / I_D. I_D = 0.005 A and φ_T in volts. Find n first.") }
      }
    },
    2: {
      idea: Lng("Umumiy emitter: β = h_21e = I_K / I_B. Kirish h_11e = ΔU_BE/ΔI_B, chiqish h_22e = ΔI_K/ΔU_KE. Erli effekti chiqish egrilarini qiyshaytiradi.", "Общий эмиттер: β = h_21e = I_K / I_B. h_11e = ΔU_BE/ΔI_B, h_22e = ΔI_K/ΔU_KE.", "Common emitter: β = h_21e = I_K / I_B. h_11e = ΔU_BE/ΔI_B, h_22e = ΔI_K/ΔU_KE."),
      asm: Lng("Kollektorga (+) (mA-metr orqali), emitter umumiy minusga, baza: U_BB → R_B → µA-metr → baza. U_BE baza–emitterga parallel.", "На коллектор плюс (через мА-метр), эмиттер на общий минус, база: U_BB → R_B → µA-метр → база.", "Collector to positive through the mA meter, emitter to common negative, base through R_B and the µA meter."),
      meas: Lng("Kirish xarakteristikasi (U_KE = 5 V, I_B 0…100 µA) va uchta chiqish (I_B = 20, 40, 60 µA, U_KE 0…12 V). Har birida kamida 8–10 nuqta.", "Входная характеристика и три выходные (I_B = 20, 40, 60 мкА). В каждой не меньше 8–10 точек.", "Input curve plus three output curves (I_B = 20, 40, 60 µA), at least 8–10 points each."),
      task: {
        b: { k: ["h21", "beta", "β", "40"], t: Lng("β = I_K / I_B nuqtada I_B = 40 µA, U_KE = 5 V. I_K (mA) / I_B (µA) ni 1000 ga ko‘paytiring — aks holda natija 1000 marta kichik.", "β = I_K / I_B при I_B = 40 мкА и U_KE = 5 В. Согласуйте мА и мкА (множитель 1000).", "β = I_K / I_B at I_B = 40 µA, U_KE = 5 V. Match mA and µA or you will be off by 1000.") },
        h11: { k: ["h11", "kirish qarshilik"], t: Lng("h_11e = (U_BE(50 µA) − U_BE(30 µA)) / 20 µA. Natija kΩ da: omni 1000 ga bo‘ling.", "h_11e = ΔU_BE / ΔI_B между 30 и 50 мкА. Ответ в кОм.", "h_11e = ΔU_BE / ΔI_B between 30 and 50 µA. The field wants kΩ.") },
        h22: { k: ["h22", "o'tkazuvchan", "conductance"], t: Lng("h_22e = (I_K(10 V) − I_K(4 V)) / 6 V, I_B = 40 µA. Birlik µS: simensni 10^6 ga ko‘paytiring.", "h_22e = ΔI_K / ΔU_KE (4…10 В) при I_B = 40 мкА. Ответ в мкСм.", "h_22e = ΔI_K / ΔU_KE from 4 V to 10 V at I_B = 40 µA. Answer in µS.") },
        ic: { k: ["60", "i_k", "kollektor toki"], t: Lng("Chiqish grafigidan I_B = 60 µA, U_KE = 8 V nuqtasidagi I_K ni o‘qing. Birlik mA.", "Снимите I_K с выходной кривой I_B = 60 мкА при U_KE = 8 В, в мА.", "Read I_K on the I_B = 60 µA curve at U_KE = 8 V, in mA.") }
      }
    },
    3: {
      idea: Lng("Induksiyalangan n-MDYa: to‘yinishda I_S = (K/2)(U_ZI − U_b)². √I_S chiziqli, o‘q bilan kesishmasi U_b. g_m = K(U_ZI − U_b).", "Индуцированный n-МОП: в насыщении I_S = (K/2)(U_ЗИ − U_пор)². g_m = K(U_ЗИ − U_пор).", "Enhancement n-MOS: in saturation I_S = (K/2)(U_GS − V_th)². g_m = K(U_GS − V_th)."),
      asm: Lng("Zatvor U_ZI ga (R orqali), istok umumiy minus, stok U_SI (+) va mA-metr orqali. Zatvor toki ≈ 0. Bilaguzuk yerga.", "Затвор к U_ЗИ через R, исток на общий минус, сток через мА-метр к U_СИ. Ток затвора ≈ 0.", "Gate to U_GS through R, source to common negative, drain through the mA meter to U_DS. Gate current ≈ 0."),
      meas: Lng("Uzatish: U_SI = 10 V, U_ZI 0…6 V. Uchta chiqish: U_ZI = 3,5 / 4,5 / 5,5 V. U_b ni topish uchun to‘yinishdagi nuqtalardan √I_S ni chizing.", "Передаточная при U_СИ = 10 В и три выходные (3,5 / 4,5 / 5,5 В).", "Transfer curve at U_DS = 10 V and three output curves (3.5 / 4.5 / 5.5 V)."),
      task: {
        vth: { k: ["bo'sag", "порог", "threshold", "u_b"], t: Lng("√I_S ni U_ZI ga nisbatan chizing (to‘yinish, U_SI = 10 V) va to‘g‘ri chiziqni U_ZI o‘qigacha davom ettiring. Tok endi paydo bo‘lgan nuqta hali U_b emas.", "Экстраполируйте √I_S до оси U_ЗИ. Точка, где ток только появился, ещё не порог.", "Extrapolate √I_S to the U_GS axis. The first visible current is not yet V_th.") },
        k: { k: ["solishtirma", "mA/V", "specific"], t: Lng("K = 2·I_S / (U_ZI − U_b)², U_SI = 10 V. I_S ni mA da qoldirsangiz K mA/V² chiqadi. U_b siz topgan qiymat.", "K = 2·I_S / (U_ЗИ − U_пор)² при U_СИ = 10 В, в мА/В².", "K = 2·I_S / (U_GS − V_th)² at U_DS = 10 V, in mA/V².") },
        gm: { k: ["g_m", "qiyalik", "transconduct"], t: Lng("g_m = K·(U_ZI − U_b) nuqtada U_ZI = 4,5 V, U_SI = 10 V. Birlik mS (mA/V).", "g_m = K·(4,5 − U_пор) при U_СИ = 10 В, в мСм.", "g_m = K·(4.5 − V_th) at U_DS = 10 V, in mS.") },
        id: { k: ["5,5", "5.5", "stok toki"], t: Lng("I_S = (K/2)·(5,5 − U_b)², U_SI = 10 V, javob mA. Avval U_b va K kerak.", "I_S = (K/2)·(5,5 − U_пор)², ответ в мА.", "I_S = (K/2)·(5.5 − V_th)², answer in mA.") }
      }
    },
    4: {
      idea: Lng("Bir yarim davrli: U_0 ≈ 0,45 U_2, ikki yarim davrli (ko‘prik, o‘rta nuqta): U_0 ≈ 0,9 U_2. Real diodda U_f tushadi (ko‘prikda ikki diod). Filtr: U_pp ≈ I_0 /(f_p C), q = U_pp/(2 U_0).", "Однополупериодный: U_0 ≈ 0,45 U_2; мост и со средней точкой ≈ 0,9 U_2, минус падение на диодах. q = U_pp/(2 U_0).", "Half-wave U_0 ≈ 0.45 U_2; bridge and centre-tap ≈ 0.9 U_2, minus diode drops. q = U_pp/(2 U_0)."),
      asm: Lng("Birlamchi chulg‘am saqlagich va kalit orqali ~220 V. Ko‘prik: ikki katod (+) chiqishga, ikki anod (−) ga. Elektrolit (+) musbatga. U_0 ni DC V da, yuklamaga parallel o‘lchang. Ossillograf yerlari bitta nuqtada.", "Первичная обмотка через предохранитель. В мосте два катода на плюс. Электролит полярно. U_0 — режим DC V.", "Primary through the fuse. Bridge: two cathodes to positive. Electrolytic capacitor is polarised. Read U_0 on DC V."),
      meas: Lng("Tashqi xarakteristika U_0(I_0) uchun R_yu ni o‘zgartirasiz (C = 0, uchta sxema). Filtrli ko‘prik alohida seriya. U_pp(C) seriyasida R_yu = 500 Ω, C logarifmik.", "Снимите U_0(I_0) для трёх схем без фильтра и мост с C = 470 мкФ, затем U_pp(C).", "Record U_0(I_0) for three schemes with C = 0, the bridge with C = 470 µF, then U_pp(C)."),
      task: {
        h0: { k: ["bir yarim", "half-wave", "однополу", "u0", "u₀", "o'rtacha"], t: Lng("Bir yarim davrli, C = 0, R_yu = 1000 Ω qatoridagi U_0 (DC). Ideal 0,45 U_2 dan U_f va R_w hisobiga kichikroq. U_2 — variant jadvalidagi effektiv qiymat.", "U_0 однополупериодной схемы при C = 0 и R = 1000 Ом. Меньше 0,45 U_2 из-за U_f.", "U_0 of the half-wave circuit, C = 0, R = 1000 Ω. A bit under 0.45 U_2 because of U_f.") },
        b0: { k: ["ko'prik", "bridge", "мост"], t: Lng("Ko‘prik, C = 0, R_yu = 1000 Ω. Ideal 0,9 U_2 dan ikki diod U_f ayiriladi. Bir yarim davrlidan taxminan ikki marta katta, teng emas.", "Мост, C = 0, R = 1000 Ом. Меньше 0,9 U_2 на два U_f.", "Bridge, C = 0, R = 1000 Ω. Under 0.9 U_2 by two diode drops.") },
        kt: { k: ["to'g'rilash koeff", "k =", "rectification"], t: Lng("k = U_0 / U_2. U_2 — effektiv (jadvaldagi), U_0 — shu rejimdagi o‘lchov. k o‘lchamsiz, 1 dan kichik.", "k = U_0 / U_2, U_2 — действующее из варианта. Безразмерный, меньше 1.", "k = U_0 / U_2 with U_2 the RMS value from your variant. Dimensionless and below 1.") },
        upp: { k: ["u_pp", "pulsatsiya kuch", "ripple voltage"], t: Lng("Ko‘prik, C = 470 µF, R_yu = 500 Ω. U_pp — chiqishdagi cho‘qqidan cho‘qqigacha, o‘rtacha U_0 emas.", "U_pp — размах от пика до пика, не среднее U_0. Мост, C = 470 мкФ, R = 500 Ом.", "U_pp is peak-to-peak, not the average U_0. Bridge, C = 470 µF, R = 500 Ω.") },
        q: { k: ["pulsatsiya koeff", " q ", "ripple factor"], t: Lng("q = U_pp / (2·U_0) shu filtrli nuqtada. Foiz emas, nisbat.", "q = U_pp / (2·U_0) в той же точке. Это доля, не проценты.", "q = U_pp / (2·U_0) at that same point. A ratio, not a percent.") }
      }
    },
    5: {
      idea: Lng("RC-kaskad (umumiy emitter): K_u = U_chiq/U_kir. Pastki chastotani ajratuvchi va shuntlovchi kondensatorlar, yuqori chastotani Millar sig‘imi kesadi. K(dB) = 20 lg K.", "RC-каскад: K_u = U_вых/U_вх. K(дБ) = 20 lg K. Нижнюю частоту задают разделительные ёмкости, верхнюю — Миллер.", "RC stage: K_u = U_out/U_in. K(dB) = 20 log10 K. Coupling capacitors set the low end, Miller capacitance the high end."),
      asm: Lng("Kollektor R_K orqali +E_k ga, emitter R_E || C_E orqali umumiy simga. Signal C1 orqali bazaga, chiqish C2 orqali R_yu ga. Ossillograf: CH1 kirish, CH2 chiqish.", "Коллектор через R_K на +E_к, эмиттер через R_E || C_E на общий. Сигнал через C1, выход через C2.", "Collector via R_C to +Vcc, emitter via R_E || C_E to ground. Signal through C1, output through C2."),
      meas: Lng("Kichik signalda (U_g taxminan 10 mV) chastotani logarifmik aylantiring. K_max o‘rta chastotada. f_q va f_yu — K = K_max/√2 nuqtalari.", "На малом сигнале снимите АЧХ. f_н и f_в — где K = K_max/√2.", "Use a small signal and sweep frequency. f_L and f_H are where K = K_max/√2."),
      task: {
        k: { k: ["1 khz", "k_u", "kuchaytirish koeff"], t: Lng("K_u = U_chiq/U_kir, f = 1 kHz, kichik signal. Bu nisbat, desibel emas. Chiqish kirishdan katta.", "K_u = U_вых/U_вх на 1 кГц, малый сигнал. Это отношение, не децибелы.", "K_u = U_out/U_in at 1 kHz, small signal. A ratio, not decibels.") },
        kdb: { k: ["db", "desibel", "lg"], t: Lng("K(dB) = 20·lg(K_u). lg — o‘nli logarifm. K_u > 1 bo‘lsa desibel musbat.", "K(дБ) = 20·lg(K_u), десятичный логарифм.", "K(dB) = 20·log10(K_u).") },
        fl: { k: ["quyi", "f_q", "lower"], t: Lng("f_q — pastki chastota, bu yerda K = K_max/√2 ≈ 0,707 K_max. Javob Hz. O‘rta chastotani emas, tushish nuqtasini oling.", "f_н — где усиление падает до 0,707·K_max. Ответ в Гц.", "f_L is where the gain falls to 0.707·K_max. Answer in Hz.") },
        fh: { k: ["yuqori", "f_yu", "upper"], t: Lng("f_yu — yuqori chegara, yana 0,707·K_max. Maydon kHz: Hz bo‘lib qolsa, tartib 1000 ga farq qiladi.", "f_в на уровне 0,707·K_max. Ответ в кГц, не в Гц.", "f_H at 0.707·K_max. The field wants kHz, not Hz.") },
        ik: { k: ["tinchlik", "i_k0", "quiescent"], t: Lng("I_K0 — signal yo‘qligidagi kollektor toki, mA. Generator amplitudasini juda kichik qiling yoki tinchlik nuqtasini o‘qing.", "I_K0 — ток покоя коллектора, мА, без сигнала.", "I_K0 is the quiescent collector current in mA, with no signal.") }
      }
    },
    6: {
      idea: Lng("Teskari bog‘lanish (ketma-ket kuchlanish bo‘yicha) kuchaytirishni kamaytiradi, polosani kengaytiradi. Chuqurlik F = K / K_TB.", "Отрицательная обратная связь уменьшает усиление и расширяет полосу. Глубина F = K / K_ОС.", "Series-voltage feedback lowers the gain and widens the band. Depth F = K / K_fb."),
      asm: Lng("S1 ochiq — TB yo‘q, S1 yopiq — TB ulangan. Ikkala kaskadni manba o‘chiq holida yig‘ing, keyin solishtiring.", "S1 разомкнут — без ОС, замкнут — с ОС. Сравнивайте при одном и том же входном сигнале.", "S1 open means no feedback, S1 closed means feedback. Compare at the same input."),
      meas: Lng("Avval TB siz, keyin TB bilan AChX yozing. Kichik signal. Yuqori chegara TB bilan o‘ngga siljishi kerak.", "Снимите АЧХ без ОС и с ОС на малом сигнале.", "Record the response with feedback off, then on, at small signal."),
      task: {
        k: { k: ["tb siz", "without", "без"], t: Lng("K — S1 ochiq, f = 1 kHz, U_chiq/U_kir. TB siz K katta.", "K без ОС на 1 кГц: U_вых/U_вх.", "K with feedback off, at 1 kHz: U_out/U_in.") },
        kf: { k: ["k_tb", "tb bilan", "with feedback"], t: Lng("K_TB — S1 yopiq, shu chastota. K_TB < K, lekin 1 dan katta yoki tartibda kichikroq bo‘lishi mumkin — o‘lchovdan oling.", "K_ОС меньше K. Снимите при замкнутом S1.", "K_fb is smaller than K. Measure it with S1 closed.") },
        F: { k: ["chuqurlik", "f =", "depth"], t: Lng("F = K / K_TB. Ikkalasi bir xil chastota va bir xil kichik signalda o‘lchangan bo‘lsin. F > 1.", "F = K / K_ОС, оба на одной частоте. F > 1.", "F = K / K_fb, both at the same frequency. F > 1.") },
        fh0: { k: ["tb siz yuqori", "fh0", "without feedback"], t: Lng("TB siz f_yu — K 0,707·K_max ga tushgan yuqori chastota, kHz.", "f_в без ОС, уровень 0,707·K_max, в кГц.", "Upper cutoff without feedback, at 0.707·K_max, in kHz.") },
        fh1: { k: ["tb bilan yuqori", "f_yu,tb", "with feedback"], t: Lng("TB bilan yuqori chegara kengayadi: f_yu,TB > f_yu. Yana kHz, 0,707 sath.", "С ОС верхняя граница выше. Тоже в кГц.", "With feedback the upper cutoff moves up. Still in kHz.") }
      }
    },
    7: {
      idea: Lng("Emitter qaytargich: K = U_chiq/U_kir < 1, faza 0. Z_kir katta, Z_chiq kichik. Z_kir = R_q·U_kir/(U_g − U_kir), Z_chiq = R_yu·(U_salt/U_yu − 1).", "Эмиттерный повторитель: K < 1, фаза 0. Z_вх большое, Z_вых малое.", "Emitter follower: K < 1, phase 0. High Z_in, low Z_out."),
      asm: Lng("Kollektor to‘g‘ridan-to‘g‘ri +E_k ga, yuklama emitterdan. R_q kirishda ketma-ket — uni Z_kir o‘lchovi uchun ulang.", "Коллектор на +E_к, нагрузка в эмиттере. R_q последовательно на входе для измерения Z_вх.", "Collector straight to +Vcc, load in the emitter. R_q is the series input resistor used to find Z_in."),
      meas: Lng("Uch rejim: R_yu = ∞ va R_q = 0 (K va salt), R_yu = 100 Ω (K va Z_chiq), R_q = 10 kΩ (Z_kir). Kichik signal, 1 kHz.", "Три режима: холостой ход, R_н = 100 Ом и R_q = 10 кОм. Малый сигнал, 1 кГц.", "Three setups: open load, R_L = 100 Ω, and R_q = 10 kΩ. Small signal, 1 kHz."),
      task: {
        k: { k: ["r_yu = ∞", "salt", "open"], t: Lng("K = U_chiq/U_kir, R_yu = ∞, R_q = 0, f = 1 kHz, E = 100 mV (signal cheklanmasin). K 1 ga yaqin, lekin 1 dan kichik.", "K = U_вых/U_вх при R_н = ∞, f = 1 кГц, E = 100 мВ. K ≈ 1, но меньше 1.", "K = U_out/U_in with R_L open, 1 kHz, E = 100 mV. K is near 1 but below 1.") },
        kl: { k: ["100", "yuklama", "loaded"], t: Lng("Xuddi shu nisbat, R_yu = 100 Ω, E = 100 mV, 1 kHz. Yuklama K ni biroz tushiradi. Katta E da manfiy yarim to‘lqin kesiladi — K ni o‘sha nuqtadan olmang.", "То же отношение при R_н = 100 Ом и E = 100 мВ. На большом сигнале не считайте K.", "Same ratio at R_L = 100 Ω and E = 100 mV. Do not take K from a clipped large signal.") },
        zin: { k: ["z_kir", "r_q", "input"], t: Lng("E = 100 mV, f = 1 kHz, R_yu = ∞, R_q = 10 kΩ. Z_kir = R_q·U_kir/(U_g − U_kir). U_kir — R_q dan keyin. Javob kΩ.", "E = 100 мВ, R_q = 10 кОм, R_н = ∞. Z_вх = R_q·U_вх/(U_g − U_вх), в кОм.", "E = 100 mV, R_q = 10 kΩ, R_L open. Z_in = R_q·U_in/(U_g − U_in), in kΩ.") },
        zout: { k: ["z_chiq", "chiqish qarsh", "output"], t: Lng("E = 100 mV ni salt (R_yu = ∞) va R_yu = 100 Ω da o‘zgartirmang. Z_chiq = R_yu·(U_salt/U_yu − 1). Javob Ω. Katta signalda kesilgan cho‘qqidan hisoblamang.", "E = 100 мВ не меняйте. Z_вых = R_н·(U_хх/U_н − 1), в омах.", "Keep E = 100 mV. Z_out = R_L·(U_open/U_loaded − 1), in ohms. Do not use a clipped large signal.") },
        um: { k: ["yarim to'lqin", "cheklan", "clip"], t: Lng("R_yu = 100 Ω da manfiy yarim to‘lqin cheklanadigan |U_chiq| ni ossillogrammadan o‘qing, mV. Musbat cho‘qqi emas.", "Снимите с осциллограммы амплитуду отрицательной полуволны, где она срезается, в мВ.", "Read the negative half-wave amplitude where it starts to clip, in mV.") }
      }
    },
    8: {
      idea: Lng("K_st = (ΔU_kir/U_kir) / (ΔU_chiq/U_chiq). R_chiq = |ΔU_chiq/ΔI_yu|. Kompensatsion sxema parametrikdan barqarorroq (K_st katta, R_chiq kichik). η — foydali ish koeffitsienti, foizda.", "K_ст = (ΔU_вх/U_вх)/(ΔU_вых/U_вых). У компенсационного K_ст больше, R_вых меньше.", "K_st = (ΔU_in/U_in)/(ΔU_out/U_out). The series regulator has a higher K_st and a smaller R_out."),
      asm: Lng("Parametrik: R_b va stabilitron parallel yuklamaga. Kompensatsion: o‘tkazuvchi tranzistor, tayanch stabilitron. Har safar sxema tanloviga qarab yig‘ing, manba o‘chiq.", "Соберите схему, выбранную переключателем, при выключенном источнике.", "Build the scheme selected by the switch, with the supply off."),
      meas: Lng("U_kir ni 12 va 18 V atrofida o‘zgartiring (nominal 15 V), R_yu ni ham o‘zgartiring. I_yu = U_chiq/R_yu.", "Меняйте U_вх около 12 и 18 В и R_н. I_н = U_вых/R_н.", "Vary U_in around 12 V and 18 V, and vary R_L. I_L = U_out/R_L."),
      task: {
        kp: { k: ["parametrik", "parametric"], t: Lng("Parametrik K_st. ΔU_kir = 18−12 = 6 V, U_kir nominal 15 V. ΔU_chiq — shu ikki nuqtadagi chiqishlar farqi, R_yu = 500 Ω. Nisbat, foiz emas.", "K_ст параметрического: ΔU_вх = 6 В, U_вх = 15 В, R_н = 500 Ом.", "Parametric K_st: ΔU_in = 6 V, nominal U_in = 15 V, R_L = 500 Ω.") },
        rp: { k: ["parametrik: chiqish", "r_chiq"], t: Lng("R_chiq = |ΔU_chiq/ΔI_yu|, U_kir = 15 V, R_yu 1000→500 Ω. I = U/R har bir nuqtada. Javob Ω.", "R_вых = |ΔU/ΔI| при U_вх = 15 В, R_н от 1000 до 500 Ом.", "R_out = |ΔU/ΔI| at U_in = 15 V as R_L goes from 1000 to 500 Ω.") },
        kc: { k: ["kompensatsion: k", "compensation"], t: Lng("Xuddi shu K_st formulasi, lekin kompensatsion sxema. Parametrikdan sezilarli katta chiqishi kerak.", "Та же формула K_ст для компенсационной схемы. Значение больше, чем у параметрической.", "Same K_st formula on the series regulator. It should be clearly larger than the parametric one.") },
        rc: { k: ["kompensatsion: r", "100 ω"], t: Lng("Kompensatsion R_chiq, U_kir = 15 V, R_yu 1000→100 Ω. Odatda omning ulushlari yoki bir necha om — tartibni adashtirmang.", "R_вых компенсационного стабилизатора заметно меньше.", "R_out of the series regulator is much smaller. Watch the order of magnitude.") },
        eta: { k: ["fik", "η", "foiz", "efficiency"], t: Lng("η = U_chiq·I_yu / (U_kir·I_kir) · 100 %. U_kir = 15 V, R_yu = 100 Ω. Javob foiz. 0…1 qoldirsangiz, 100 ga ko‘paytirish unutilgan.", "η в процентах: не забудьте ×100. U_вх = 15 В, R_н = 100 Ом.", "η is in percent: do not forget ×100. U_in = 15 V, R_L = 100 Ω.") }
      }
    },
    9: {
      idea: Lng("Rezonans kuchaytirgich: K(f) = K_0 / √(1+ξ²), ξ = Q_e (f/f_0 − f_0/f). R_sh konturni shuntlab Q va K_0 ni tushiradi, polosani kengaytiradi. f_0 = 1/(2π√(LC)).", "Резонансный каскад: R_ш снижает Q и K_0 и расширяет полосу. f_0 = 1/(2π√(LC)).", "Tuned stage: R_sh lowers Q and K_0 and widens the band. f_0 = 1/(2π√(LC))."),
      asm: Lng("Kontur L || C kollektorda. Generator bazaga, chiqish konturdan. R_sh ni tanlov bo‘yicha ulang. Manba o‘chiq yig‘ing.", "Контур L || C в коллекторе. Соберите при выключенном питании.", "Tank L || C in the collector. Assemble with the supply off."),
      meas: Lng("Chastotani rezonans atrofida logarifmik yurgizing. Avval R_sh = ∞, keyin 22 kΩ va 4,7 kΩ. Maksimum — f_0 va K_0.", "Снимите АЧХ без шунта и с шунтами. Максимум даёт f_0 и K_0.", "Sweep through resonance with R_sh open, then with the shunts. The peak is f_0 and K_0."),
      task: {
        f0: { k: ["f_0", "f0", "rezonans chastot"], t: Lng("f_0 — K(f) maksimumi, R_sh = ∞. Javob kHz. Grafikdagi cho‘qqini o‘qing, formulani esa tekshirish uchun ishlating.", "f_0 — частота максимума K, без шунта, в кГц.", "f_0 is the frequency of maximum K, R_sh open, in kHz.") },
        k0: { k: ["k_0", "k0", "rezonansdagi"], t: Lng("K_0 — shu cho‘qqidagi U_chiq/U_kir, R_sh = ∞.", "K_0 — усиление на вершине, без шунта.", "K_0 is U_out/U_in at that peak, R_sh open.") },
        df: { k: ["polosa", "2δ", "bandwidth"], t: Lng("2Δf_0,7 — K = 0,707 K_0 bo‘lgan ikki chastota orasidagi kenglik, kHz. Yarim kenglik emas, to‘liq polosa.", "Полная полоса между точками 0,707·K_0, в кГц.", "Full bandwidth between the 0.707·K_0 points, in kHz.") },
        q0: { k: ["q_e", "asillik", "quality"], t: Lng("Q_e = f_0 / 2Δf_0,7. f_0 va polosa bir xil birlikda bo‘lsin (ikkala kHz yoki ikkala Hz).", "Q_e = f_0 / полоса. Единицы f_0 и полосы одинаковые.", "Q_e = f_0 / bandwidth. Use the same unit for both.") },
        q2: { k: ["4,7", "shunt", "4.7"], t: Lng("R_sh = 4,7 kΩ ulanganda polosani qayta o‘lchab Q_e ni hisoblang. Shunt Q ni kamaytiradi.", "С шунтом 4,7 кОм добротность меньше.", "With the 4.7 kΩ shunt, Q is lower.") }
      }
    },
    10: {
      idea: Lng("Invertorlovchi: K ≈ −R_tb/R1 (ishora manfiy). Invertorlamaydigan: K ≈ 1 + R_tb/R1 (musbat). Yuqori chastotada bir qutbli tushish. SR — katta signaldagi eng tik qiyalik, V/µs. Chiqish manbadan oldin to‘yinadi.", "Инвертирующий K отрицателен (≈ −R_ос/R1). Неинвертирующий положителен (≈ 1 + R_ос/R1).", "Inverting K is negative (≈ −R_f/R1). Non-inverting K is positive (≈ 1 + R_f/R1)."),
      asm: Lng("µA741: 7-oyoq +15 V, 4-oyoq −15 V, har bir manba yonida 0,1 µF. Chiqish — 6-oyoq. Sxema tanloviga qarab R larni ulang.", "Питание ±15 В на выводы 7 и 4, блокировка 0,1 мкФ. Выход — вывод 6.", "±15 V on pins 7 and 4, 0.1 µF bypasses. Output is pin 6."),
      meas: Lng("Kichik signal (o‘nlab mV) da 1 kHz da K ni o‘lchang. f_yu uchun chastotani oshiring. SR uchun katta meandr. To‘yinish — amplitudani oshirib, chiqish o‘smay qolgan sath.", "На малом сигнале снимите K, затем f_в. SR — крутизна большого сигнала.", "Measure K with a small signal, then f_H. SR is the slope of a large square wave."),
      task: {
        ki: { k: ["invertorlovchi", "inverting"], t: Lng("K = |U_chiq/U_kir| — asbobdagi musbat amplitudalar nisbati, 1 kHz, kichik signal (taxminan 20 mV). Manfiy ishora bu maydonga yozilmaydi: minus 180° fazani bildiradi, u alohida. Ideal modul ≈ R_tb/R1.", "K = |U_вых/U_вх| — положительное отношение амплитуд на 1 кГц при малом сигнале. Знак минус (фаза 180°) в это поле не вносится. Модуль ≈ R_ос/R1.", "K = |U_out/U_in| — the positive amplitude ratio at 1 kHz, small signal. Do not enter the minus sign; that is the 180° phase. The magnitude is about R_f/R1.") },
        kn: { k: ["invertorlamaydigan", "non-inverting", "неинверт"], t: Lng("Invertorlamaydigan K musbat va 1 dan katta. K = U_chiq/U_kir, 1 kHz.", "Неинвертирующий K положителен и больше 1.", "Non-inverting K is positive and greater than 1.") },
        fh: { k: ["yuqori chegar", "f_yu", "20 mv"], t: Lng("Invertorlovchi sxemada U_kir = 20 mV (kichik signal, SR ga urilmang). f_yu — 0,707·K_0, javob kHz.", "f_в при U_вх = 20 мВ, уровень 0,707·K_0, в кГц.", "f_H at U_in = 20 mV, level 0.707·K_0, in kHz.") },
        sr: { k: ["sr", "o'sish tez", "slew"], t: Lng("SR = |dU/dt|_max katta meandrda. Birlik V/µs. V/s yoki V/ms tartibni buzadi.", "SR в В/мкс, не в В/с.", "SR in V/µs, not V/s.") },
        us: { k: ["to'yinish", "u_toy", "saturation"], t: Lng("U_toy+ — chiqishning musbat to‘yinish sathi. Manba +15 V dan kichik (chiqish pog‘onasi). Ossillogrammaning tekis cho‘qqisi.", "U_нас+ меньше +15 В. Это плоская вершина осциллограммы.", "U_sat+ is below +15 V. It is the flat top of the waveform.") }
      }
    },
    11: {
      idea: Lng("Vin ko‘prigi: f = 1/(2πRC). Generatsiya sharti K ≥ 3, ya’ni R2/R1 ≥ 2. Diodlar amplitudani cheklaydi; diodsiz signal to‘yinishgacha o‘sadi.", "Мост Вина: f = 1/(2πRC). Условие генерации K ≥ 3. Диоды ограничивают амплитуду.", "Wien bridge: f = 1/(2πRC). Oscillation needs K ≥ 3. Diodes limit the amplitude."),
      asm: Lng("Ketma-ket RC chiqishdan musbat kirishga, parallel RC undan yerga. Manfiy tarmoqda R2 (trimmer) va diodlar. Manba ±15 V.", "Последовательная RC-цепь на неинвертирующий вход, параллельная — на землю.", "Series RC to the non-inverting input, parallel RC to ground."),
      meas: Lng("R va C ni topshiriqdagi juftlikka qo‘ying, R2a ni sekin oshiring. Barqaror sinus — chastota va U_m. Kritik R2a — tebranish endi paydo bo‘ladigan eng kichik qiymat.", "Подберите R2a: критическое значение — где колебания только возникают.", "Raise R2a slowly. The critical value is where oscillation just starts."),
      task: {
        f1: { k: ["22 nf", "10 kω", "f1"], t: Lng("f = 1/(2πRC), R = 10 kΩ, C = 22 nF. R ni om, C ni farad qilib Hz oling. Javob Hz, kHz emas.", "f = 1/(2πRC): R в омах, C в фарадах, ответ в Гц.", "f = 1/(2πRC) with R in ohms and C in farads. Answer in Hz.") },
        f2: { k: ["4,7", "10 nf", "f2"], t: Lng("Xuddi shu formula, R = 4,7 kΩ, C = 10 nF. Javob kHz — Hz da qoldirsangiz tartib 1000 ga farq qiladi.", "Ответ в кГц, не в Гц.", "Answer in kHz, not Hz.") },
        rcr: { k: ["kritik", "r2a", "critical"], t: Lng("R2a,kr — tebranish endi boshlanadigan trimmer. Nazariy yaqinlashuv R2/R1 ≈ 2, aniq qiymatni ossillogramma (o‘sish/so‘nish chegarasi) dan oling. Javob kΩ.", "Критическое R2a — где синус только появляется. Ответ в кОм.", "Critical R2a is where the sine just appears. Answer in kΩ.") },
        um: { k: ["barqaror", "diodli", "stable"], t: Lng("Diodlar yoniq, R = 10 kΩ, C = 22 nF, R2a = 16 kΩ. U_m — barqaror sinus amplitudasi, V.", "Амплитуда установившегося синуса с диодами, в вольтах.", "Steady sine amplitude with the diodes on, in volts.") },
        un: { k: ["diodlar o'chir", "stabilizatsiyasiz", "without diode"], t: Lng("Diodlarsiz amplituda to‘yinishgacha o‘sadi va diodlidan katta. Xuddi shu R, C, R2a.", "Без диодов амплитуда больше — до насыщения.", "Without diodes the amplitude is larger, up to saturation.") }
      }
    },
    12: {
      idea: Lng("LC-generator (uch nuqta): f ≈ 1/(2π√(LC)). L = 1/(4π² f² C). Generatsiya uchun teskari bog‘lanish k_tb kritikdan katta bo‘lsin.", "LC-генератор: f ≈ 1/(2π√(LC)). L = 1/(4π² f² C).", "LC oscillator: f ≈ 1/(2π√(LC)). L = 1/(4π² f² C)."),
      asm: Lng("Kontur kollektorda, TB sig‘imi orqali bazaga. Manba o‘chiq yig‘ing, keyin k_tb ni oshiring.", "Контур в коллекторе, обратная связь на базу. Питание включите после сборки.", "Tank in the collector, feedback to the base. Power on only after assembly."),
      meas: Lng("C va k_tb ni topshiriq bo‘yicha qo‘ying. Barqaror sinusdan f va U_m. Kritik k_tb — tebranish endi tug‘iladigan eng kichik koeffitsient.", "Снимите частоту и амплитуду установившегося синуса. Критический k — где колебания только возникают.", "Read f and U_m from the steady sine. Critical k is where oscillation just starts."),
      task: {
        f1: { k: ["4,7 nf", "f1", "0,3"], t: Lng("C = 4,7 nF, k_tb = 0,3. Chastotani ossillogramma yoki chastotomer ko‘rsatkichidan o‘qing. Javob kHz.", "Частота при C = 4,7 нФ, ответ в кГц.", "Frequency at C = 4.7 nF, answer in kHz.") },
        f2: { k: ["1 nf", "f2"], t: Lng("C = 1 nF. Sig‘im kichrayganda chastota o‘sadi (1/√C). Yana kHz.", "При C = 1 нФ частота выше. Ответ в кГц.", "At C = 1 nF the frequency is higher. Answer in kHz.") },
        L: { k: ["induktiv", "g'altak", "coil"], t: Lng("L = 1/(4π² f² C). f ni GERS, C ni FARAD qiling, L genri chiqadi, keyin µH ga o‘tkazing (×10^6). C = 4,7 nF dagi o‘lchangan f dan.", "L = 1/(4π² f² C): f в герцах, C в фарадах, ответ в мкГн.", "L = 1/(4π² f² C) with f in hertz and C in farads. Answer in µH.") },
        pcr: { k: ["kritik tb", "k_tb", "1 v", "critical"], t: Lng("C = 4,7 nF da U_m(k_tb) grafigidan U_m = 1 V bo‘lgan k_tb ni o‘qing (kesishma). Bu chiziqli nazariy chegaradan biroz katta: amplituda simulyatorda endi aniq ko‘rinadi. 0,3 ni taxmin qilib yozmang.", "При C = 4,7 нФ снимите с графика U_m(k) значение k, где U_m = 1 В. Не подставляйте 0,3 наугад.", "At C = 4.7 nF read k from the U_m(k) graph where U_m = 1 V. Do not guess 0.3.") },
        um: { k: ["amplituda", "u_m", "0,3"], t: Lng("U_m — C = 4,7 nF, k_tb = 0,3 dagi barqaror amplituda, V.", "Установившаяся амплитуда при C = 4,7 нФ и k = 0,3, в вольтах.", "Steady amplitude at C = 4.7 nF and k = 0.3, in volts.") }
      }
    },
    13: {
      idea: Lng("Tranzistorli avtogenerator MV: T ≈ ln(2)·(R1 C1 + R2 C2). D = t_impuls/T. NE555: f ≈ 1,44/((R_A+2 R_B)C), D = (R_A+R_B)/(R_A+2 R_B). Aniq qiymatni ossillogrammadan oling — nominaldan biroz farq qiladi.", "Мультивибратор: период с осциллограммы. Для NE555 f ≈ 1,44/((R_A+2 R_B)C).", "Astable multivibrator: take the period from the scope. For the NE555, f ≈ 1.44/((R_A+2 R_B)C)."),
      asm: Lng("Ikki tranzistorli MV da kondensatorlar kollektor–baza kesishgan. 555 da R_A, R_B va C. Manba o‘chiq yig‘ing. +5…12 V emas, sxemadagi E_k.", "Соберите выбранную схему при выключенном питании.", "Build the selected circuit with the supply off."),
      meas: Lng("Ossillogrammadan davr T va impuls kengligi t_i ni o‘qing. Simmetrik va nosimmetrik holatni alohida yozing. 555 uchun alohida sxema.", "Снимите период и длительность импульса с осциллограммы.", "Read the period and the pulse width from the scope."),
      task: {
        T: { k: ["simmetrik", "davr", "22 k"], t: Lng("R1 = R2 = 22 kΩ, C1 = C2 = 47 nF. T ni ossillogrammadan (ikkala yarim davr yig‘indisi), javob ms. R·C ni sekundda hisoblab, ×1000 qilsangiz ms.", "Период симметричного МВ в мс. R·C считайте в секундах.", "Period of the symmetric MV in ms. Compute R·C in seconds, then convert.") },
        k: { k: ["t/(r", "koeffitsient", "ln"], t: Lng("k = T / (R1 C1 + R2 C2). Nominal R va C bilan. ln(2) ≈ 0,69 ga yaqin tartib, lekin o‘lchangan T dan hisoblang.", "k = T / (R1 C1 + R2 C2) по измеренному T. Около ln 2.", "k = T / (R1 C1 + R2 C2) from the measured T. Near ln 2.") },
        D: { k: ["nosimmetrik", "to'ldirish", "47 k"], t: Lng("R1 = 22 kΩ, R2 = 47 kΩ, C lar 47 nF. D = t_i / T, bu yerda t_i — K1 dagi impuls. 0 bilan 1 orasida.", "D = t_и / T для импульса на K1. Между 0 и 1.", "D = t_pulse / T for the pulse at K1. Between 0 and 1.") },
        f5: { k: ["555", "ne555", "chastota f"], t: Lng("f = 1,44 / ((R_A + 2 R_B) C), R_A = 10 kΩ, R_B = 22 kΩ, C = 47 nF. Javob Hz. R om, C farad.", "f = 1,44 / ((R_A + 2 R_B) C), ответ в Гц.", "f = 1.44 / ((R_A + 2 R_B) C), answer in Hz.") },
        D5: { k: ["555", "d =", "скваж", "duty"], t: Lng("D = (R_A + R_B) / (R_A + 2 R_B). 0,5 dan katta, chunki R_A + R_B > R_B.", "D = (R_A + R_B) / (R_A + 2 R_B), больше 0,5.", "D = (R_A + R_B) / (R_A + 2 R_B), greater than 0.5.") }
      }
    },
    14: {
      idea: Lng("TTL 0 va 1. AND: Y=A·B, OR: Y=A+B, NOT: Y=¬A, NAND/NOR universal, XOR: kirishlar har xil bo‘lsa 1. To‘liq jamlagich S = A⊕B⊕C_i. t_pd = (t_PHL + t_PLH)/2.", "ТТЛ: NAND и NOR универсальны, XOR равен 1 при разных входах. S = A⊕B⊕C_i. t_pd = (t_PHL+t_PLH)/2.", "TTL: NAND and NOR are universal, XOR is 1 when the inputs differ. S = A⊕B⊕C_i. t_pd = (t_PHL+t_PLH)/2."),
      asm: Lng("Manba +5 V — 14-oyoq, umumiy — 7-oyoq. Har bir mikrosxema yonida 0,1 µF. Ishlatilmayotgan TTL kirishini ochiq qoldirmang. LED 330 Ω orqali. Tumbler — pull-up 1 kΩ.", "Питание +5 В на вывод 14, общий на 7. Светодиод через 330 Ом. Входы ТТЛ не оставляйте висящими.", "+5 V on pin 14, ground on pin 7. LED through 330 Ω. Do not leave TTL inputs floating."),
      meas: Lng("7404 uchun U_kir ni 0 dan 5 V gacha yurgizib U_OH, U_OL va o‘tishni yozing. Vaqt o‘lchovi — t_PHL va t_PLH. Chinlik jadvalini tumblerlar bilan to‘ldiring: AB = 00, 01, 10, 11 tartibida.", "Снимите уровни 7404 и таблицу истинности в порядке 00, 01, 10, 11.", "Record 7404 levels and the truth table in the order 00, 01, 10, 11."),
      task: {
        voh: { k: ["u_oh", "yuqori sath", "high"], t: Lng("U_OH — U_kir = 0 bo‘lganda chiqish (NOT teskarisi). Volt. 5 V emas, chiqish pog‘onasi pastroq.", "U_OH при U_вх = 0. Это не ровно 5 В.", "U_OH at U_in = 0. It is not exactly 5 V.") },
        vol: { k: ["u_ol", "past sath", "low"], t: Lng("U_OL — U_kir = 3 V (mantiqiy 1) bo‘lganda chiqish. Yuzlab millivolt tartibida, voltlar emas.", "U_OL при U_вх = 3 В — доли вольта.", "U_OL at U_in = 3 V is a fraction of a volt.") },
        vt: { k: ["bo'sag", "1,5", "threshold"], t: Lng("U_kir ni shunday topingki, U_chiq = 1,5 V bo‘lsin. Bu o‘tish bo‘sag‘asi, U_OH emas.", "Найдите U_вх, при котором U_вых = 1,5 В.", "Find U_in where U_out = 1.5 V.") },
        tpd: { k: ["t_pd", "kechik", "delay"], t: Lng("t_pd = (t_PHL + t_PLH)/2. Javob ns. µs yoki ms — tartib xatosi.", "t_pd в наносекундах, не в микросекундах.", "t_pd in nanoseconds, not microseconds.") },
        xor: { k: ["xor", "istisno"], t: Lng("XOR: AB = 00, 01, 10, 11 uchun ketma-ket 4 bit. Kirishlar har xil bo‘lsa 1. Masalan shakl 0 va 1 dan, probelsiz.", "XOR: 4 бита в порядке 00, 01, 10, 11. Единица, когда входы разные.", "XOR: 4 bits in the order 00, 01, 10, 11. A 1 when the inputs differ.") },
        nor: { k: ["nor", "yoki-emas"], t: Lng("NOR: faqat ikkala kirish 0 bo‘lsa chiqish 1. Qolgan uch holat 0. Yana 4 bit, tartib 00, 01, 10, 11.", "NOR: единица только при 00.", "NOR: a 1 only for 00.") },
        fa: { k: ["jamlagich", "to'liq", "full adder", "8 ta"], t: Lng("To‘liq jamlagich S = A ⊕ B ⊕ C_i. ABC ni 000 dan 111 gacha sanab, 8 ta bit yozing. C_o ni aralashtirmang — so‘ralgan S.", "S = A ⊕ B ⊕ C_i, 8 бит от ABC = 000 до 111. Это S, не перенос.", "S = A ⊕ B ⊕ C_i, 8 bits from ABC = 000 to 111. That is S, not the carry.") }
      }
    }
  };

  function guide(id) { return GUIDE[id] || null; }

  /* ---------- answer classification (no numeric reveal) ---------- */
  function rel(a, b) { return Math.abs(a - b) / (Math.abs(b) + 1e-15); }
  function unitHint(unit, x, exp) {
    const u = String(unit || "");
    const near = (a, b) => rel(a, b) <= 0.08;
    if (u === "%" && near(x * 100, exp)) return tr("h_pct");
    const pairs = [
      [["kΩ", "kHz", "mA", "mV", "mS", "ms", "kΩ"], 1e3],
      [["µS", "µs", "µA", "µH", "nF"], 1e6]
    ];
    if ((u === "kΩ" || u === "kHz" || u === "mA" || u === "mV" || u === "mS" || u === "ms") && (near(x / 1e3, exp) || near(x * 1e3, exp)))
      return tr("h_unit", { u: u });
    if ((u === "µS" || u === "µs" || u === "µH" || u === "ns" || u === "mA/V²" || u === "V/µs") && (near(x / 1e6, exp) || near(x * 1e6, exp) || near(x / 1e3, exp) || near(x * 1e3, exp)))
      return tr("h_unit", { u: u });
    if ((u === "V" || u === "Ω" || u === "Hz") && (near(x * 1e3, exp) || near(x / 1e3, exp)))
      return tr("h_unit", { u: u || "V" });
    return null;
  }
  function classify(task, val) {
    if (!task) return tr("h_check");
    if (task.type === "bits") {
      const raw = String(val == null ? "" : val);
      const s = raw.replace(/[^01]/g, "");
      const a = String(task.ans);
      if (!raw.trim() || /[^01\s]/.test(raw)) return tr("h_bits");
      if (s.length !== a.length) return tr("h_len");
      if (s.split("").map(c => c === "0" ? "1" : "0").join("") === a) return tr("h_inv");
      return tr("h_bit");
    }
    const x = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
    if (!isFinite(x)) return tr("h_format");
    const exp = task.ans;
    if (!isFinite(exp)) return tr("h_check");
    const uh = unitHint(task.unit, x, exp);
    if (uh) return uh;
    if (exp !== 0 && x !== 0) {
      const q = Math.log10(Math.abs(x / exp));
      const n = Math.round(q);
      if (Math.abs(q - n) < 0.06 && n !== 0) return tr("h_order");
    }
    if (exp !== 0 && Math.sign(x) !== Math.sign(exp) && rel(Math.abs(x), Math.abs(exp)) < 0.08) return tr("h_sign");
    if (rel(x, exp) > 0.05 && rel(x, exp) <= 0.2) return tr("h_close");
    return tr("h_check");
  }
  function formulaOf(id, taskId) {
    const g = guide(id);
    const item = g && g.task && g.task[taskId];
    return item ? tx(item.t) : "";
  }

  /* ---------- journal store ---------- */
  const TJ = {
    load() {
      let j = null;
      try { j = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { j = null; }
      if (!j || typeof j !== "object") j = {};
      if (!j.students || typeof j.students !== "object") j.students = {};
      if (j.apiKey || j.apiBase || j.apiModel) {
        delete j.apiKey; delete j.apiBase; delete j.apiModel;
        try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (e) { }
      }
      return j;
    },
    save(j) {
      try { localStorage.setItem(KEY, JSON.stringify(j)); return true; }
      catch (e) { console.warn(e); return false; }
    },
    snapshot() {
      if (window.ELAB_AUTH && typeof window.ELAB_AUTH.allowJournal === "function" && !window.ELAB_AUTH.allowJournal()) return;
      const S = EL.S;
      if (!S || !S.student || !nid(S.student.id)) return;
      const j = this.load();
      const id = nid(S.student.id);
      const rec = j.students[id] || { id: S.student.id.trim(), first: Date.now(), labs: {}, log: [], ai: 0, note: "" };
      rec.name = String(S.student.name || "").trim();
      rec.group = String(S.student.group || "").trim();
      rec.id = String(S.student.id || "").trim();
      rec.last = Date.now();
      if (S.labId) {
        const L = EL.LABS.find(x => x.id === S.labId);
        const ld = S.labs && S.labs[S.labId];
        if (L && L.ready && ld) {
          const prev = rec.labs[L.id];
          const snap = this.labSnap(L, ld);
          if (prev && prev.gradeOverride >= 2 && prev.gradeOverride <= 5) {
            snap.gradeOverride = prev.gradeOverride;
            snap.gradePoint = prev.gradeOverride;
            const row = (EL.MEZON || []).find(x => x.n === prev.gradeOverride);
            if (row) snap.gradeWord = row.w;
            snap.grade = prev.gradeOverride === 5 ? 0 : prev.gradeOverride === 4 ? 1 : prev.gradeOverride === 3 ? 2 : 3;
          }
          rec.labs[L.id] = snap;
        }
      }
      j.students[id] = rec;
      this.save(j);
    },
    labSnap(L, ld) {
      const series = (L.series || []).map(s => ({ id: s.id, name: s.name, n: (ld.meas && ld.meas[s.id] ? ld.meas[s.id].length : 0), min: s.min }));
      const snap = {
        id: L.id, title: L.title, step: ld.step || 1, max: ld.max || 1,
        preN: (L.pre || []).length, preOk: ld.pre && ld.pre.done ? ld.pre.n : null,
        postN: (L.post || []).length, postOk: ld.post && ld.post.done ? ld.post.n : null,
        series: series, asmErr: ld.asm ? ld.asm.err || 0 : 0, asmDone: !!(ld.asm && ld.asm.done),
        concl: String(ld.concl || "").slice(0, 2000), t0: ld.t0 || null, t1: ld.t1 || null,
        updated: Date.now(), calc: null, score: null, grade: null, parts: null, done: !!ld.t1
      };
      const hasCalc = ld.calc && Object.keys(ld.calc).length;
      if (hasCalc || ld.t1) {
        const prev = EL.V;
        try {
          EL.V = EL.makeVariant(L);
          const T = L.tasks(EL.V);
          snap.calc = T.map(k => {
            const s = ld.calc[k.id] || {};
            return { id: k.id, q: k.q, unit: k.unit || "", type: k.type || "num", val: s.val == null ? null : s.val, ok: !!s.ok, tries: s.tries || 0, err: s.err == null ? null : s.err };
          });
          if (ld.t1) {
            const sc = EL.Plus.score(L, ld);
            const b = EL.baho(L, ld);
            snap.score = sc.score;
            snap.baho = b;
            snap.criteria = b.items;
            snap.gradeAuto = b.mark;
            snap.gradePoint = b.mark;
            snap.gradeWord = b.word;
            snap.grade = b.mark === 5 ? 0 : b.mark === 4 ? 1 : b.mark === 3 ? 2 : 3;
            snap.parts = { pre: sc.pre, post: sc.post, meas: sc.meas, calc: sc.calc, acc: sc.acc };
            snap.qaror = String(ld.qaror || "").slice(0, 2000);
          }
        } catch (e) { console.warn(e); }
        finally { EL.V = prev; }
      }
      return snap;
    },
    list() {
      return Object.keys(this.load().students).map(k => this.load().students[k]).filter(Boolean);
    },
    bumpAi() {
      const S = EL.S;
      if (!S || !S.student) return;
      const j = this.load();
      const id = nid(S.student.id);
      if (!j.students[id]) this.snapshot();
      const j2 = this.load();
      if (!j2.students[id]) return;
      j2.students[id].ai = (j2.students[id].ai || 0) + 1;
      this.save(j2);
    }
  };
  window.ELAB_onSave = function () { try { TJ.snapshot(); } catch (e) { console.warn(e); } };

  /* ---------- PDF ---------- */
  function pdfDoc(landscape) {
    const { jsPDF } = window.jspdf;
    const d = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
    let F = "helvetica";
    try {
      if (EL.FONT_R && EL.FONT_B) {
        d.addFileToVFS("dv.ttf", EL.FONT_R); d.addFont("dv.ttf", "DV", "normal");
        d.addFileToVFS("dvb.ttf", EL.FONT_B); d.addFont("dvb.ttf", "DV", "bold");
        F = "DV";
      }
    } catch (e) { console.warn(e); }
    const A = s => F === "DV" ? String(s) : String(s).replace(/[^\x20-\x7E]/g, "?");
    return { d, F, A };
  }
  const PDF = {
    journal(rows) {
      const { d, F, A } = pdfDoc(true);
      const W = 297, H = 210;
      let y = 14;
      const line = (s, sz, b) => {
        d.setFont(F, b ? "bold" : "normal"); d.setFontSize(sz);
        d.splitTextToSize(A(s), W - 20).forEach(t => { if (y > H - 12) { d.addPage(); y = 14; } d.text(t, 10, y); y += sz * 0.45; });
      };
      const au = EL.AUTHOR && EL.AUTHOR.uz;
      line("O‘qituvchi jurnali — Elektronika va signallarni qayta ishlash", 14, 1);
      line((au ? au.inst + " · " + au.name : "") + " · " + new Date().toLocaleString(), 9, 0);
      y += 2;
      const cols = [46, 22];
      for (let i = 0; i < 14; i++) cols.push(13.2);
      cols.push(16);
      const head = ["F.I.Sh.", "Guruh"].concat(Array.from({ length: 14 }, (_, i) => String(i + 1)), "O‘rt.");
      const drawRow = (cells, headRow) => {
        if (y > H - 12) { d.addPage(); y = 14; }
        let x = 8;
        d.setFont(F, headRow ? "bold" : "normal"); d.setFontSize(headRow ? 8 : 7.5);
        cells.forEach((c, i) => {
          d.rect(x, y, cols[i], 6);
          d.text(A(c), x + 1, y + 4);
          x += cols[i];
        });
        y += 6;
      };
      drawRow(head, 1);
      rows.forEach(r => {
        const cells = [r.name, r.group];
        let sum = 0, n = 0;
        for (let i = 1; i <= 14; i++) {
          const lab = r.labs && r.labs[i];
          const pt = shownPoint(lab);
          if (lab && lab.done && pt != null) { cells.push(String(pt)); sum += pt; n++; }
          else if (lab) cells.push(String(lab.step || "·"));
          else cells.push("—");
        }
        cells.push(n ? String(Math.round(sum / n)) : "—");
        drawRow(cells, 0);
      });
      d.save("Jurnal_elektronika_" + new Date().toISOString().slice(0, 10) + ".pdf");
    },
    student(rec) {
      const { d, F, A } = pdfDoc(false);
      let y = 15;
      const ln = (s, sz, b) => {
        d.setFont(F, b ? "bold" : "normal"); d.setFontSize(sz || 11);
        d.splitTextToSize(A(s), 180).forEach(t => { if (y > 282) { d.addPage(); y = 15; } d.text(t, 14, y); y += (sz || 11) * 0.48; });
      };
      ln("Talaba natijalari — virtual laboratoriya", 14, 1);
      ln(rec.name + " · " + rec.group + " · ID " + rec.id, 12, 1);
      ln(dt(Date.now()), 9, 0); y += 2;
      Object.keys(rec.labs || {}).sort((a, b) => a - b).forEach(id => {
        const lab = rec.labs[id];
        const title = (lab.title && (lab.title.uz || lab.title)) || ("Lab " + id);
        ln(id + ". " + (typeof title === "string" ? title : title.uz), 12, 1);
        ln((lab.done ? "Yakunlangan" : "Jarayonda") + " · " + stepName(lab.step) + (lab.score != null ? " · ball " + lab.score + " · " + gradeText(lab.grade) : ""), 10, 0);
        if (lab.preOk != null) ln("Kirish testi: " + lab.preOk + "/" + lab.preN + (lab.postOk != null ? " · Yakuniy: " + lab.postOk + "/" + lab.postN : ""), 10, 0);
        (lab.series || []).forEach(s => ln("  " + s.name + ": " + s.n + "/" + s.min, 9, 0));
        (lab.calc || []).forEach(c => ln("  • " + c.q + " → " + fmtVal(c.val) + " " + (c.unit || "") + (c.ok ? " (to‘g‘ri)" : c.tries ? " (noto‘g‘ri)" : ""), 9, 0));
        if (lab.concl) ln("Xulosa: " + lab.concl, 9, 0);
        y += 2;
      });
      if (rec.note) ln("O‘qituvchi izohi: " + rec.note, 10, 0);
      d.save("Talaba_" + String(rec.name || "student").replace(/\s+/g, "_") + ".pdf");
    }
  };

  /* ---------- teacher panel ---------- */
  const Teacher = {
    auth: false, tab: "journal", group: "", sel: null,
    async open() {
      const d = document.getElementById("teacher");
      const b = document.getElementById("tBody");
      document.getElementById("tClose").onclick = () => d.close();
      document.getElementById("tTitle").textContent = tr("teacher_panel");
      if (!d.open) d.showModal();
      const st = window.ELAB_AUTH && window.ELAB_AUTH.state;
      if (st && st.mode === "teacher" && st.account) {
        this.google = true;
        this.auth = true;
        if (b) b.innerHTML = `<p class="tmsg info">Jurnal qidirilmoqda…</p>`;
        if (window.ELAB_AUTH.ensureTeacher) await window.ELAB_AUTH.ensureTeacher();
        this.render();
        return;
      }
      this.google = false;
      this.render();
    },
    async check(pw) {
      const h = await EL.sha("ELAB|" + pw);
      const st = this.store().pw || DEFH;
      return !!h && h === st;
    },
    store() { return TJ.load(); },
    students() {
      let rows = Object.values(this.store().students);
      rows.sort((a, b) => String(a.group).localeCompare(String(b.group)) || String(a.name).localeCompare(String(b.name)));
      if (this.group) rows = rows.filter(r => r.group === this.group);
      return rows;
    },
    render() {
      const b = document.getElementById("tBody");
      if (!b) return;
      if (!this.auth) {
        b.innerHTML = `<form id="tLogin" style="max-width:380px"><div class="row"><label for="tPw">${esc(tr("tp_pw"))}</label><input id="tPw" type="password" autocomplete="current-password" style="flex:1"></div><div id="tMsg"></div><button class="ok" type="submit">${esc(tr("tp_login"))}</button></form><p class="tmsg info">${esc(tr("tp_about"))}</p><p style="font-size:12.5px;color:#94a3b8">${esc(tr("tp_std"))}</p><div class="grow"><button type="button" class="sec" id="tGoogle">Google bilan kirish</button></div>`;
        const gbtn = document.getElementById("tGoogle");
        if (gbtn && window.ELAB_AUTH && window.ELAB_AUTH.openGate) gbtn.onclick = () => window.ELAB_AUTH.openGate();
        document.getElementById("tLogin").onsubmit = async e => {
          e.preventDefault();
          if (await this.check(document.getElementById("tPw").value)) { this.auth = true; this.render(); }
          else document.getElementById("tMsg").innerHTML = `<div class="tmsg err">${esc(tr("tp_badpw"))}</div>`;
        };
        setTimeout(() => { const i = document.getElementById("tPw"); if (i) i.focus(); }, 40);
        return;
      }
      const tabs = [["journal", "tab_journal"], ["guide", "tab_guide"], ["list", "tab_list"], ["an", "tab_an"], ["lb", "tab_lb"], ["set", "tab_set"]];
      b.innerHTML = `<div class="ttabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-tt="${k}" class="${this.tab === k ? "on" : ""}">${esc(tr(n))}</button>`).join("")}</div><div id="tPane"></div>`;
      b.querySelectorAll("[data-tt]").forEach(x => x.onclick = () => { this.tab = x.dataset.tt; this.sel = null; this.render(); });
      if (this.tab === "journal") this.paneJournal();
      else if (this.tab === "guide") this.paneGuide();
      else if (this.tab === "list") this.paneList();
      else if (this.tab === "an") this.paneAn();
      else if (this.tab === "lb") this.paneLb();
      else this.paneSet();
    },
    groupsOf(rows) {
      const g = [...new Set(rows.map(r => r.group).filter(Boolean))];
      g.sort();
      return g;
    },
    paneJournal() {
      const all = Object.values(this.store().students);
      const rows = this.students();
      const gs = this.groupsOf(all);
      const pane = document.getElementById("tPane");
      pane.innerHTML = `<div class="tmsg info">${esc(tr("tp_info"))}</div>
        <div class="tgrid"><label>${esc(tr("tp_filter"))} <select id="tGrp"><option value="">${esc(tr("tp_all"))}</option>${gs.map(g => `<option ${g === this.group ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label>
        <button type="button" id="xPdf">📄 ${esc(tr("tp_pdf"))}</button>
        <button type="button" class="sec" id="xCsv">${esc(tr("tp_csv"))}</button>
        <button type="button" class="sec" id="xFull">${esc(tr("tp_full"))}</button>
        <button type="button" class="sec" id="xJson">${esc(tr("tp_xapi"))}</button>
        <label class="sec" style="padding:7px 14px;border-radius:6px;cursor:pointer">${esc(tr("tp_import"))}<input id="xImp" type="file" accept="application/json,.json" hidden></label>
        <button type="button" class="sec" id="tOut" style="margin-left:auto">${esc(tr("tp_logout"))}</button></div>
        <p style="color:#94a3b8;font-size:12.5px">${esc(tr("tp_legend"))}</p>
        <div class="tscroll"><table class="tt"><thead><tr><th>${esc(tr("tp_student"))}</th><th>${esc(tr("tp_group"))}</th>${Array.from({ length: 14 }, (_, i) => `<th>${i + 1}</th>`).join("")}<th>${esc(tr("tp_avg"))}</th></tr></thead><tbody>
        ${rows.length ? rows.map(r => {
          let sum = 0, n = 0;
          const cells = [];
          for (let i = 1; i <= 14; i++) {
            const lab = r.labs && r.labs[i];
            const pt = shownPoint(lab);
            if (lab && lab.done && pt != null) { sum += pt; n++; cells.push(`<td class="jcell done" title="${esc(pointWord(pt) + (lab.gradeOverride ? " · o‘qituvchi" : "") + (lab.score != null ? " · ball " + lab.score : ""))}">${pt}</td>`); }
            else if (lab) cells.push(`<td class="jcell prog" title="${esc(stepName(lab.step))}">${lab.step}</td>`);
            else cells.push(`<td class="jcell">—</td>`);
          }
          return `<tr><td><b>${esc(r.name)}</b><br><span style="color:#94a3b8">ID ${esc(r.id)}</span></td><td>${esc(r.group)}</td>${cells.join("")}<td class="jcell">${n ? Math.round(sum / n) : "—"}</td></tr>`;
        }).join("") : `<tr><td colspan="17" style="color:#94a3b8;padding:18px">${esc(tr("tp_empty"))}</td></tr>`}
        </tbody></table></div><div id="impMsg"></div>`;
      const grp = document.getElementById("tGrp");
      grp.onchange = () => { this.group = grp.value; this.render(); };
      document.getElementById("tOut").onclick = () => {
        if (this.google) { document.getElementById("teacher").close(); return; }
        this.auth = false; this.tab = "journal"; this.render();
      };
      document.getElementById("xPdf").onclick = () => PDF.journal(rows);
      document.getElementById("xCsv").onclick = () => this.csv(Object.values(this.store().students));
      document.getElementById("xFull").onclick = () => this.fullJson();
      document.getElementById("xJson").onclick = () => this.xapi(Object.values(this.store().students));
      document.getElementById("xImp").onchange = e => this.importFiles(e.target.files);
    },
    paneList() {
      const rows = this.students();
      const pane = document.getElementById("tPane");
      if (this.sel) {
        const r = this.store().students[this.sel];
        if (!r) { this.sel = null; this.paneList(); return; }
        const labs = Object.keys(r.labs || {}).sort((a, b) => a - b).map(id => {
          const lab = r.labs[id];
          const title = lab.title && lab.title[lang()] || (lab.title && lab.title.uz) || "";
          const calc = (lab.calc || []).map(c => `<tr><td style="text-align:left">${esc(c.q)}</td><td>${esc(fmtVal(c.val))} ${esc(c.unit || "")}</td><td>${c.tries || 0}</td><td class="${c.ok ? "okc" : "bad"}">${c.ok ? "✔" : (c.tries ? "✘" : "—")}</td></tr>`).join("");
          const pt = shownPoint(lab);
          const text = (EL.MEZON || []).find(x => x.n === pt);
          const items = (lab.baho && lab.baho.items) || lab.criteria || [];
          const checks = items.map(it => `<li class="${it.met ? "baho-ok" : "baho-no"}">${it.met ? "✔" : "✘"} ${esc(it.name)} — ${esc(it.detail || "")}</li>`).join("");
          const ov = lab.gradeOverride || "";
          return `<div class="card"><b>${id}. ${esc(title)}</b><br>${lab.done ? `<span class="tag ok">${esc(tr("tp_done"))}</span>` : `<span class="tag info">${esc(stepName(lab.step))}</span>`} ${pt != null ? `<b>${pt} — ${esc(pointWord(pt))}${lab.score != null ? " · " + lab.score + "%" : ""}</b>` : ""}${lab.gradeOverride ? ` <span class="tag warn">o‘qituvchi</span>` : ""}${pt === 2 ? ` <span class="tag err">sertifikat yo‘q</span>` : ""}<br><small>${esc(tr("tp_tests"))}: ${lab.preOk == null ? "—" : lab.preOk + "/" + lab.preN} · ${lab.postOk == null ? "—" : lab.postOk + "/" + lab.postN}</small>${text ? `<p>${esc(text.t)}</p>` : ""}${checks ? `<ul class="baho-list">${checks}</ul>` : ""}<label>Baho <select data-ov="${esc(String(id))}"><option value="" ${ov === "" ? "selected" : ""}>Avtomatik${lab.gradeAuto ? " (" + lab.gradeAuto + ")" : ""}</option>${[5, 4, 3, 2].map(n => `<option value="${n}" ${String(ov) === String(n) ? "selected" : ""}>${n} ${esc(pointWord(n))}</option>`).join("")}</select></label>${calc ? `<table class="tt" style="margin-top:6px"><tr><th>${esc(tr("h_formula"))}</th><th>${esc(tr("tp_score"))}</th><th></th><th></th></tr>${calc}</table>` : ""}</div>`;
        }).join("");
        pane.innerHTML = `<button type="button" class="sec" id="tBack">${esc(tr("tp_back"))}</button>
          <h3 style="margin:10px 0 4px">${esc(r.name)}</h3><p style="color:#94a3b8">${esc(r.group)} · ID ${esc(r.id)} · AI: ${r.ai || 0}</p>
          ${labs || `<p class="tmsg warn">${esc(tr("tp_empty"))}</p>`}
          <label>${esc(tr("tp_note"))}</label><textarea id="tNote" style="width:100%;height:70px">${esc(r.note || "")}</textarea><br>
          <button type="button" id="tNoteSave">${esc(tr("tp_save"))}</button> <button type="button" class="sec" id="tPdf1">${esc(tr("tp_pdf1"))}</button> <button type="button" class="sec" id="tDel">${esc(tr("tp_del"))}</button>`;
        document.getElementById("tBack").onclick = () => { this.sel = null; this.render(); };
        document.getElementById("tNoteSave").onclick = async () => {
          const j = this.store();
          const text = document.getElementById("tNote").value.slice(0, 2000);
          j.students[r.id && nid(r.id)].note = text;
          TJ.save(j);
          if (this.google && window.ELAB_AUTH && window.ELAB_AUTH.saveNote) {
            const res = await window.ELAB_AUTH.saveNote(r.id, text);
            if (res && res.legacy) document.getElementById("tNote").insertAdjacentHTML("afterend", `<p class="tmsg warn">${esc(LEGACY_SYNC)}</p>`);
          }
        };
        document.getElementById("tPdf1").onclick = () => PDF.student(this.store().students[this.sel]);
        document.getElementById("tDel").onclick = async () => {
          if (!confirm(tr("tp_confirm", { n: r.name }))) return;
          if (this.google && window.ELAB_AUTH && window.ELAB_AUTH.dropStudent) {
            const res = await window.ELAB_AUTH.dropStudent(r.id);
            if (res && res.legacy) { alert(LEGACY_SYNC); return; }
          }
          const j = this.store(); delete j.students[this.sel]; TJ.save(j); this.sel = null; this.render();
        };
        pane.querySelectorAll("[data-ov]").forEach(sel => sel.onchange = () => {
          const j = this.store();
          const rec = j.students[this.sel];
          const lab = rec && rec.labs && rec.labs[sel.dataset.ov];
          if (!lab) return;
          if (!sel.value) delete lab.gradeOverride;
          else lab.gradeOverride = +sel.value;
          const n = lab.gradeOverride || lab.gradeAuto;
          if (n) applyPoint(lab, n);
          TJ.save(j);
          const sub = rec.id;
          const labId = sel.dataset.ov;
          const ov = lab.gradeOverride == null ? "" : lab.gradeOverride;
          this.render();
          if (this.google && window.ELAB_AUTH && window.ELAB_AUTH.saveMark) {
            window.ELAB_AUTH.saveMark(sub, labId, ov).then(res => {
              if (res && res.legacy) {
                const pane = document.getElementById("tPane");
                if (pane) pane.insertAdjacentHTML("afterbegin", `<p class="tmsg warn">${esc(LEGACY_SYNC)}</p>`);
              }
            });
          }
        });
        return;
      }
      pane.innerHTML = `<div class="tscroll"><table class="tt"><thead><tr><th>${esc(tr("tp_student"))}</th><th>${esc(tr("tp_status"))}</th><th>${esc(tr("tp_steps"))}</th><th>${esc(tr("tp_score"))}</th><th>${esc(tr("tp_updated"))}</th><th></th></tr></thead><tbody>
        ${rows.length ? rows.map(r => {
          const labs = Object.values(r.labs || {});
          const done = labs.filter(l => l.done).length;
          const last = labs.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0))[0];
          const scores = labs.filter(l => l.score != null).map(l => l.score);
          const mean = scores.length ? Math.round(scores.reduce((p, q) => p + q, 0) / scores.length) : "—";
          return `<tr><td><b>${esc(r.name)}</b><br><span style="color:#94a3b8">${esc(r.group)}, ID ${esc(r.id)}</span>${r.imported ? `<br><span class="tag ${r.imported === "ok" ? "ok" : "err"}">${esc(r.imported === "ok" ? tr("tp_imp_ok") : tr("tp_imp_bad"))}</span>` : ""}</td><td>${done ? `<span class="tag ok">${done}</span>` : `<span class="tag info">${esc(tr("tp_active"))}</span>`}</td><td>${last ? esc(stepName(last.step)) + " · №" + last.id : "—"}</td><td><b>${mean}</b></td><td>${dt(r.last)}</td><td><button type="button" class="sec" data-open="${esc(nid(r.id))}">${esc(tr("tp_open"))}</button></td></tr>`;
        }).join("") : `<tr><td colspan="6" style="color:#94a3b8;padding:18px">${esc(tr("tp_empty"))}</td></tr>`}
      </tbody></table></div>`;
      pane.querySelectorAll("[data-open]").forEach(x => x.onclick = () => { this.sel = x.dataset.open; this.render(); });
    },
    paneAn() {
      const rows = Object.values(this.store().students);
      const doneLabs = [];
      const wrong = {};
      for (let i = 1; i <= 14; i++) {
        const fin = [];
        rows.forEach(r => { const lab = r.labs && r.labs[i]; if (lab && lab.done && lab.score != null) fin.push(lab.score); (lab && lab.calc || []).forEach(c => { if (c.tries && !c.ok) { const k = i + ":" + c.id; wrong[k] = (wrong[k] || 0) + 1; } }); });
        doneLabs.push({ i, n: fin.length, avg: fin.length ? Math.round(fin.reduce((a, b) => a + b, 0) / fin.length) : 0 });
      }
      const bars = (title, items, pick) => `<h4>${esc(title)}</h4>` + items.map(it => `<div class="bar-row"><span>${esc(it.label)}</span><div class="bar"><i style="width:${it.max ? (100 * it.value / it.max) : 0}%"></i></div><b>${it.value}</b></div>`).join("");
      const avgItems = doneLabs.filter(x => x.n).map(x => ({ label: x.i + ". " + ((EL.LABS.find(l => l.id === x.i) || {}).title || {})[lang()] || x.i, value: x.avg, max: 100 }));
      const nItems = doneLabs.map(x => ({ label: String(x.i), value: x.n, max: Math.max(1, ...doneLabs.map(d => d.n)) }));
      const wItems = Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: k, value: v, max: Math.max(1, ...Object.values(wrong)) }));
      document.getElementById("tPane").innerHTML = avgItems.length ? bars(tr("an_avg"), avgItems) + bars(tr("an_fin"), nItems) + (wItems.length ? bars(tr("an_wrong"), wItems) : "") : `<p class="tmsg warn">${esc(tr("an_none"))}</p>`;
    },
    paneLb() {
      const rows = Object.values(this.store().students).map(r => {
        const labs = Object.values(r.labs || {}).filter(l => l.done && l.score != null);
        const mean = labs.length ? labs.reduce((s, l) => s + l.score, 0) / labs.length : null;
        return { r, n: labs.length, mean };
      }).filter(x => x.n).sort((a, b) => b.mean - a.mean);
      document.getElementById("tPane").innerHTML = rows.length ? `<table class="tt"><thead><tr><th>#</th><th>${esc(tr("tp_student"))}</th><th>${esc(tr("tp_group"))}</th><th>${esc(tr("lb_done"))}</th><th>${esc(tr("lb_mean"))}</th></tr></thead><tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.r.name)}</td><td>${esc(x.r.group)}</td><td>${x.n}</td><td><b>${Math.round(x.mean)}</b></td></tr>`).join("")}</tbody></table>` : `<p class="tmsg warn">${esc(tr("an_none"))}</p>`;
    },
    paneGuide() {
      const note = lang() === "uz" ? "" : tr("guide_lang");
      const copyUrl = (window.ELAB_GOOGLE && window.ELAB_GOOGLE.templateUrl) || "https://docs.google.com/spreadsheets/d/17bOfLzbscuHJI3PJGnzbySlnToR6R7gfF2LDbEgXuac/copy";
      document.getElementById("tPane").innerHTML = (note ? `<p class="tmsg info">${esc(note)}</p>` : "") + `<div class="yguide">
        <p>Bu bo‘lim Google Drive ulanmasdan ham ochiladi. Qadamlarni bir marta bajaring. Talabaga faqat 6 belgili kod beriladi, uzun manzil emas.</p>
        <p>Har bir tugmaning o‘zbekcha va inglizcha nomi yonma-yon yozilgan. Hisob tili qaysi bo‘lsa, o‘sha nom chiqadi. Cloud Console o‘zbekcha emas — uni faqat sayt egasi ochadi.</p>
        <div class="yjumps">
          <button type="button" data-yjump="y1">1. Kirish</button>
          <button type="button" data-yjump="y2">2. Nusxa</button>
          <button type="button" data-yjump="y3">3. Apps Script</button>
          <button type="button" data-yjump="y4">4. Joylash</button>
          <button type="button" data-yjump="y5">5. Ogohlantirish</button>
          <button type="button" data-yjump="y6">6. Kod</button>
          <button type="button" data-yjump="y7">7. Talaba</button>
          <button type="button" data-yjump="y8">8. Yangilash</button>
          <button type="button" data-yjump="y9">9. Parol</button>
          <button type="button" data-yjump="y10">10. Xatolar</button>
          <button type="button" data-yjump="yMez">Mezon</button>
        </div>

        <h3 id="y1">1. Saytga va panelga kirish</h3>
        <ol>
          <li>Brauzerda <span class="ybtn">https://elektronika-tdpi.uz</span> ni oching va virtual laboratoriyaga kiring.</li>
          <li>Laboratoriya paroli <span class="ybtn">1234</span>. Tugma: <span class="ybtn">OK</span>.</li>
          <li><span class="ybtn">Google bilan kirish</span> (inglizcha tugma: <span class="ybtn">Sign in with Google</span>). O‘z Gmail ingizni tanlang.</li>
          <li>Tugma chiqmasa, yozuv «Google hali sozlanmagan» bo‘ladi. Buni sayt egasi tuzatadi. Siz shu vaqtgacha lokal jurnal va <span class="ybtn">Mehmon</span> bilan dars o‘ta olasiz. Mehmon natijasi jurnalga yozilmaydi.</li>
          <li><span class="ybtn">Men o‘qituvchiman</span> ni bosing. <span class="ybtn">Men talabaman</span> ni tanlamang — u talaba formasi.</li>
          <li>Yuqoridagi <span class="ybtn">O‘qituvchi</span> paneli Google hisobingiz bilan ochiladi. Parol so‘ralmaydi. Eski parol <span class="ybtn">123456</span> faqat Google siz ulanmagan brauzer uchun.</li>
          <li>Telefon yoki boshqa kompyuter: shu Gmail bilan kiring va <span class="ybtn">Men o‘qituvchiman</span> ni tanlang. Kod so‘ralmaydi — jurnal o‘zi ochiladi. Xato chiqsa <span class="ybtn">Qayta urinish</span> ni bosing. Kod maydoni oddiy yo‘lda yo‘q.</li>
          <li><span class="ybtn">Yo‘riqnoma</span> shu yerda, Drive ulanmasdan oldin ham bor. Google kartasidagi <span class="ybtn">Yo‘riqnoma</span> tugmasi ham shu bo‘limni ochadi.</li>
        </ol>

        <h3 id="y2">2. Jurnal namunasidan nusxa olish</h3>
        <p>Jurnal sizning Google Drive ingizda turadi. Sayt egasining jadvaliga yozilmaydi.</p>
        <ol>
          <li><span class="ybtn">Jurnal</span> kartasidagi <span class="ybtn">Jadval nusxasini olish</span> shu sahifani ochadi: <a href="${esc(copyUrl)}" target="_blank" rel="noopener">${esc(copyUrl)}</a></li>
          <li>Google nusxa sahifasida tugma: <span class="ybtn">Nusxa olish</span> yoki <span class="ybtn">Make a copy</span>. Ba’zi hisoblarda <span class="ybtn">Nusxa yaratish</span>. Bu namunaning o‘zi emas, sizning Drive ingizdagi nusxa.</li>
          <li>Jadvalning o‘zi ochiq bo‘lsa, menyu: <span class="ybtn">Fayl → Nusxa olish</span> (inglizcha: <span class="ybtn">File → Make a copy</span>).</li>
          <li>Nusxaga tushunarli nom bering, masalan «Elektronika jurnali — 2-kurs». U sizning Drive ingizda saqlanadi.</li>
          <li>Namunaning o‘zida <span class="ybtn">Joylashtirish</span> / <span class="ybtn">Deploy</span> ni bosmang. Joylashtirish faqat sizning nusxangizda.</li>
        </ol>

        <h3 id="y3">3. Apps Scriptni ochish</h3>
        <ol>
          <li>O‘z nusxangizda yuqori menyu: <span class="ybtn">Kengaytmalar → Apps Script</span> (inglizcha: <span class="ybtn">Extensions → Apps Script</span>).</li>
          <li>Kod oynasi ochiladi. Namuna to‘g‘ri bo‘lsa, kod allaqachon turadi. O‘chirmang va boshqa matn qo‘shmang.</li>
          <li>Oyna bo‘sh bo‘lsa, nusxa skriptni olib o‘tmagan. To‘xtang va sayt egasiga ayting. Tasodifiy kod qo‘ymang.</li>
          <li>Disk tugmasi yoki <span class="ybtn">Ctrl+S</span> bilan saqlang. Tugma nomi: <span class="ybtn">Saqlash</span> / <span class="ybtn">Save</span>.</li>
        </ol>

        <h3 id="y4">4. Veb-ilova qilib joylash</h3>
        <ol>
          <li>Skript oynasining o‘ng yuqorisida <span class="ybtn">Joylashtirish</span> / <span class="ybtn">Deploy</span> → <span class="ybtn">Yangi joylashtirish</span> / <span class="ybtn">New deployment</span>.</li>
          <li>«Turni tanlang» / <span class="ybtn">Select type</span> yonidagi tishli g‘ildirakni bosing. Ro‘yxatdan <span class="ybtn">Veb-ilova</span> / <span class="ybtn">Web app</span> ni tanlang. G‘ildiraksiz tur chiqmaydi.</li>
          <li>Tavsif ixtiyoriy. Masalan: Elektronika jurnali.</li>
          <li><span class="ybtn">Bajarish</span> / <span class="ybtn">Execute as</span>: <span class="ybtn">Men</span> / <span class="ybtn">Me</span>. «Foydalanuvchi» / <span class="ybtn">User accessing the web app</span> ni tanlamang. Yozuv sizning hisobingizdan ketishi kerak.</li>
          <li><span class="ybtn">Kimlar kira oladi</span> / <span class="ybtn">Who has access</span>: <span class="ybtn">Hamma</span> / <span class="ybtn">Anyone</span>. Ba’zi ekranlarda <span class="ybtn">Anyone, even anonymous</span>. <span class="ybtn">Faqat men</span> / <span class="ybtn">Only myself</span> va faqat «Google hisobi borlar» / <span class="ybtn">Anyone with a Google account</span> talaba yozuvini qabul qilmaydi: sayt natijani alohida so‘rovdan yuboradi.</li>
          <li><span class="ybtn">Joylashtirish</span> / <span class="ybtn">Deploy</span> ni bosing.</li>
        </ol>

        <h3 id="y5">5. «Tasdiqlanmagan ilova» ogohlantirishi</h3>
        <p>Bu sizning nusxangiz. Google yozuvni ko‘rib chiqmaganini aytadi. Jurnal buzilgan degani emas. Ko‘k tugma bekor qiladi — uni bosmang.</p>
        <ol>
          <li>Birinchi oyna: <span class="ybtn">Ruxsatlarni ko‘rib chiqish</span> / <span class="ybtn">Review permissions</span>.</li>
          <li>Shu jadval turgan Gmail ni tanlang.</li>
          <li>Sarlavha: <span class="ybtn">Google bu ilovani tasdiqlamagan</span> yoki <span class="ybtn">Google hasn’t verified this app</span>. Ko‘k tugma <span class="ybtn">Xavfsizlikka qaytish</span> / <span class="ybtn">Back to safety</span> — bosilmaydi.</li>
          <li>Pastki chapdagi mayda yozuv: <span class="ybtn">Kengaytirilgan</span> yoki <span class="ybtn">Qo‘shimcha</span> / <span class="ybtn">Advanced</span>.</li>
          <li>So‘ng yangi havola: <span class="ybtn">… ga o‘tish (xavfli)</span> / <span class="ybtn">Go to … (unsafe)</span>. Nuqtalar o‘rnida skript nomi turadi. Shu havolani bosing.</li>
          <li>Yangiroq ekranda <span class="ybtn">Advanced</span> o‘rniga <span class="ybtn">Davom etish</span> / <span class="ybtn">Continue</span> chiqishi mumkin. Davom etish oldinga o‘tkazadi. <span class="ybtn">Back to safety</span> esa bekor qiladi.</li>
          <li>Keyingi ro‘yxatda jadvalga yozish va tashqi tekshiruv so‘raladi. Inglizcha matn taxminan: <span class="ybtn">See, edit, create, and delete all your Google Sheets spreadsheets</span> va <span class="ybtn">Connect to an external service</span>. O‘zbekcha hisobda: jadvallarni ko‘rish, tahrirlash, yaratish va o‘chirish. Bu ruxsat sizning hisobingizga. Talaba bunday oyna ko‘rmaydi.</li>
          <li><span class="ybtn">Ruxsat berish</span> / <span class="ybtn">Allow</span>. Ba’zi ekranlarda yana <span class="ybtn">Davom etish</span> / <span class="ybtn">Continue</span>.</li>
        </ol>
        <div class="ybox">Ruxsatni bir marta berasiz. Kodni keyin o‘zgartirsangiz, Google qayta so‘rashi mumkin. Yana shu yo‘l: Kengaytirilgan → ga o‘tish (xavfli) → Ruxsat berish.</div>

        <h3 id="y6">6. /exec manzil va 6 belgili kod</h3>
        <ol>
          <li>Joylashtirish tugagach, oyna <span class="ybtn">Veb-ilova URL</span> / <span class="ybtn">Web app</span> manzilini ko‘rsatadi. U <span class="ybtn">https://script.google.com/macros/s/…/exec</span> bilan tugaydi.</li>
          <li><span class="ybtn">Nusxalash</span> / <span class="ybtn">Copy</span>. Oxiri <span class="ybtn">/exec</span> bo‘lsin. <span class="ybtn">/dev</span> sinov manzili — sinf uchun yaramaydi.</li>
          <li><span class="ybtn">Tayyor</span> / <span class="ybtn">Done</span>.</li>
          <li>Saytga qayting. <span class="ybtn">Jurnal</span> kartasidagi maydonga shu manzilni qo‘ying. Tugma: <span class="ybtn">Kodni olish</span>.</li>
          <li>6 ta harf va raqam chiqadi (masalan, K7M2QP). <span class="ybtn">Kodni nusxalash</span>. Kodni doskaga yozing. /exec manzilini talabaga yubormang.</li>
          <li>Kodni joylaganingizdan keyin darhol oling. Birinchi marta bosgan Google hisobi shu jadvalning egasi bo‘lib yoziladi. Boshqa hisob keyin kodni almashtira olmaydi.</li>
          <li>Manzilni keyin topish: <span class="ybtn">Joylashtirish → Joylashtirishlarni boshqarish</span> / <span class="ybtn">Deploy → Manage deployments</span>. Veb-ilova qatoridagi manzilni nusxalang.</li>
        </ol>

        <h3 id="y7">7. Talabaga nima deyiladi</h3>
        <ol>
          <li><span class="ybtn">Google bilan kirish</span>, so‘ng <span class="ybtn">Men talabaman</span>.</li>
          <li>Ism, familiya, kurs (1–4) va guruh raqami (1–30). Kod maydoniga sizning 6 belgingiz.</li>
          <li><span class="ybtn">Jurnalga ulanish</span>. Noto‘g‘ri kodda «Kod topilmadi» chiqadi.</li>
          <li>Laboratoriya: kirish testi, o‘lchov, hisob, xulosa va baho shu jadvalning <span class="ybtn">Jurnal</span> varag‘iga tushadi.</li>
          <li><span class="ybtn">Mehmon sifatida davom etish</span> laboratoriyani ochadi, lekin jurnalga yozmaydi.</li>
        </ol>

        <h3 id="y8">8. Drive dan yangilash va eksport</h3>
        <ol>
          <li>Panel ochilganda talabalar jadvaldan o‘zi keladi. <span class="ybtn">Jadvaldan yangilash</span> ro‘yxatni qayta oladi. Telefon va kompyuter bir xil jadvalni ko‘radi.</li>
          <li><span class="ybtn">Jurnalni PDF</span> — albom varaq, 14 ta ish ustuni.</li>
          <li><span class="ybtn">CSV (anonim)</span> — ismsiz jadval.</li>
          <li><span class="ybtn">JSON: to‘liq (ism bilan)</span> — zaxira nusxa. Boshqa kompyuterga <span class="ybtn">JSON import</span> bilan qaytadi.</li>
          <li><span class="ybtn">JSON: xAPI jurnali (anonim)</span> — ismsiz hodisalar ro‘yxati.</li>
          <li>Talaba o‘zining «PDF hisobot» ini o‘zi yuklab oladi. Grafikli hisobot panelda emas.</li>
          <li>Internet uzilsa, ish shu brauzerda davom etadi. Ulanish qaytganida talaba natijasi qayta yuboriladi. Panelda ko‘rish uchun yangilashni yana bosing.</li>
        </ol>

        <h3 id="y9">9. Panelga kirish</h3>
        <p>Google hisobi panelning kaliti. Shu Gmail boshqa qurilmada ham shu jurnalni ochadi. <span class="ybtn">Sozlama</span> dagi parol faqat Google siz ulanmagan eski brauzer uchun. Laboratoriya paroli <span class="ybtn">1234</span> o‘zgarmaydi.</p>
        <p><span class="ybtn">Yangi kod</span> eski 6 belgini bekor qiladi. Jadvaldagi yozuvlar qoladi. Talabalarga yangi kodni bering.</p>

        <h3 id="yMez">Baholash mezoni (5–2)</h3>
        <p>Baho 100 balllik natijaning foizidan chiqadi. Talaba hisobotda baho va foizni ko‘radi. Siz Talabalar bo‘limida bahoni o‘zgartira olasiz. 2 bahoda sertifikat berilmaydi, jumladan siz 2 qo‘yganingizda ham.</p>
        <p><b>5 — a‘lo:</b> 90 % va undan yuqori. Talaba fanning mohiyatini to‘liq tushunadi, biladi, ifodalay oladi, aytib beradi, tasavvurga ega, mustaqil mushohada yuritadi, olgan bilimini amalda qo‘llay oladi, ijodiy fikrlaydi hamda mustaqil xulosa va qaror qabul qiladi.</p>
        <p><b>4 — yaxshi (70 % dan 90 % gacha).</b> Talaba mustaqil mushohada yuritadi, olgan bilimini amalda qo‘llay oladi, fanning mohiyatini tushunadi, biladi, ifodalay oladi, aytib beradi va tasavvurga ega.</p>
        <p><b>3 — qoniqarli (60 % dan 70 % gacha).</b> Talaba olgan bilimini amalda qo‘llay oladi, fanning mohiyatini tushunadi, biladi, ifodalay oladi, aytib beradi va tasavvurga ega.</p>
        <p><b>2 — qoniqarsiz (60 % dan past).</b> Talaba fan dasturini o‘zlashtirmagan. Sertifikat berilmaydi.</p>
        <ul class="baho-list">
          <li><b>Biladi</b> — kirish testi.</li>
          <li><b>Tushunadi</b> — yakuniy test.</li>
          <li><b>To‘liq tushunadi</b> — ikkala testning o‘rtachasi.</li>
          <li><b>Ifodalay oladi, aytib beradi</b> — ikkala test yakunlangan.</li>
          <li><b>Tasavvurga ega</b> — nazariya ochilgan va testlarning yarmi to‘g‘ri.</li>
          <li><b>Amalda qo‘llay oladi</b> — sxema yig‘ilgan va barcha o‘lchov seriyalari yetarli.</li>
          <li><b>Mustaqil mushohada</b> — hisoblarning to‘g‘ri ulushi.</li>
          <li><b>Ijodiy fikrlaydi</b> — «Mustaqil qaror» maydoni.</li>
          <li><b>Mustaqil xulosa va qaror</b> — xulosa va qaror. Yakuniy baho shu bandlardan emas, 100 ballning foizidan chiqadi.</li>
        </ul>
        <p><b>4 — yaxshi:</b> 70 % dan 90 % gacha. <b>3 — qoniqarli:</b> 60 % dan 70 % gacha. <b>2 — qoniqarsiz:</b> 60 % dan past, sertifikat berilmaydi. Chegara: 90, 70 va 60 o‘z bahosiga kiradi (90 — 5, 70 — 4, 60 — 3).</p>

        <h3 id="y10">10. Tez-tez chiqadigan xatolar</h3>
        <p><span class="ybtn">Google tugmasi yo‘q.</span> Ega hali client ID qo‘ymagan. Lokal jurnal ishlaydi. Mehmon jurnalga yozmaydi.</p>
        <p><span class="ybtn">Namuna havolasi yo‘q.</span> Ega <span class="ybtn">templateUrl</span> ni qo‘ymagan. Nusxani o‘zingiz ocholmaysiz.</p>
        <p><span class="ybtn">origin_mismatch.</span> Sayt manzili Cloud Console dagi ro‘yxatda yo‘q yoki oxirida qo‘shimcha yo‘l bor. To‘g‘ri yozuv: https://elektronika-tdpi.uz — buni ega tuzatadi.</p>
        <p><span class="ybtn">Kod topilmadi.</span> Kod xato, bo‘shliq bor, yoki siz <span class="ybtn">Yangi kod</span> bosgansiz. Doskadagi kodni yangisi bilan almashtiring.</p>
        <p><span class="ybtn">Manzil …/exec bo‘lishi kerak.</span> Maydonga jadval havolasi, /dev yoki bo‘shliq tushgan. Veb-ilova oynasidagi manzilni qayta nusxalang.</p>
        <p><span class="ybtn">Talaba ishladi, panel bo‘sh.</span> Panel jadvaldan o‘qiydi. Talaba Google bilan shu kodga ulangan bo‘lishi kerak. Mehmon yozuvi jadvalga tushmaydi.</p>
        <p><span class="ybtn">Jurnal tasdiqlanmadi</span> yoki yangilash xato. Execute as <span class="ybtn">Me</span> emas, yoki kirish <span class="ybtn">Anyone</span> emas. <span class="ybtn">Joylashtirishlarni boshqarish</span> → qalamcha → shu ikki sozlama → <span class="ybtn">Joylashtirish</span>. So‘ng saytda kodni qayta oling.</p>
        <p><span class="ybtn">Xavfsizlikka qaytish</span> bosilgan. Ruxsat bekor bo‘lgan. Joylashtirishni qaytaring va 5-qadam: Kengaytirilgan → ga o‘tish (xavfli) → Ruxsat berish.</p>
        <p><span class="ybtn">Sahifa topilmadi</span> (404). Kirish «Faqat men» qolgan yoki joylashtirish o‘chirilgan. Yangi joylashtirish qiling, manzilni qayta qo‘ying.</p>
        <p><span class="ybtn">Kodni o‘zgartirdim, talaba eski natijani ko‘ryapti.</span> Eski joylashtirish eski kodni ishlatadi. Boshqarish → qalamcha → versiya: <span class="ybtn">Yangi versiya</span> / <span class="ybtn">New version</span> → Joylashtirish.</p>
        <p><span class="ybtn">Avval kod oling.</span> Yangilashdan oldin 6-qadam kerak. Yo‘riqnoma baribir ochiladi.</p>
        <p><span class="ybtn">Telefonda jurnal ochilmadi.</span> Shu Gmail bilan kiring. Belgisi eskirgan bo‘lsa <span class="ybtn">Qayta urinish</span> yangi belgi oladi. Kod so‘ralmaydi. Kulrang <span class="ybtn">reestr:</span> qatori xato sababini ko‘rsatadi.</p>
        <p><span class="ybtn">Panel paroli esimda yo‘q.</span> Google bilan kirilganda parol kerak emas. Eski parol faqat shu brauzerda edi. Google jadvalidagi qatorlar o‘chmaydi.</p>
        <p><span class="ybtn">Token muddati.</span> Google belgisi taxminan bir soatda eskiradi. Talaba qayta <span class="ybtn">Google bilan kirish</span> qiladi.</p>
        <h3 id="yAi">AI maslahatchi — faqat sayt egasi</h3>
        <p>O‘qituvchi va talaba kalit kiritmaydi. Kalit sayt kodida ham yo‘q. Maslahatchi reestr skripti orqali ishlaydi; u ishlamasa ichki maslahatchi javob beradi.</p>
        <ol>
          <li>Bepul kalit: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</li>
          <li>Reestr jadvalida <span class="ybtn">Kengaytmalar → Apps Script</span>. Tishli g‘ildirak: <span class="ybtn">Настройки проекта</span> → <span class="ybtn">Свойства скрипта</span>. Xossa nomi <span class="ybtn">GEMINI_API_KEY</span>, qiymati — olingan kalit.</li>
          <li>Skript kodini <span class="ybtn">docs/registry-apps-script.gs</span> dagi yangi nusxa bilan almashtiring.</li>
          <li>Manzil o‘zgarmasligi uchun: <span class="ybtn">Начать развертывание</span> → <span class="ybtn">Управление развертываниями</span> → qalamcha → Version <span class="ybtn">Новая версия</span> → <span class="ybtn">Начать развертывание</span>. <span class="ybtn">/exec</span> o‘sha holicha qoladi.</li>
          <li>Birinchi chaqiruvda Google <span class="ybtn">UrlFetchApp</span> uchun yangi ruxsat so‘raydi. Tasdiqlang.</li>
          <li>Skript yana yangilandi: o‘qituvchi hisobi Google orqali tiklanadi (<span class="ybtn">teacher</span> va <span class="ybtn">link</span>). Yangi faylni qayta joylab, <span class="ybtn">Новая версия</span> bilan yana deploy qiling. <span class="ybtn">/exec</span> o‘zgarmaydi.</li>
        </ol>
        <div class="ybox">Sayt egasi Cloud Console, reestr va namuna jadvalni bir marta sozlaydi. O‘qituvchi buni qilmaydi. Ega uchun qadamlar: docs/google-setup-uz.md</div>
      </div>`;
      document.getElementById("tPane").querySelectorAll("[data-yjump]").forEach(btn => {
        btn.onclick = () => {
          const el = document.getElementById(btn.dataset.yjump);
          if (el) el.scrollIntoView({ block: "start" });
        };
      });
    },
    paneSet() {
      const j = this.store();
      const still = !j.pw || j.pw === DEFH;
      document.getElementById("tPane").innerHTML = `<h4 style="margin:0 0 6px">${esc(tr("tp_pwchange"))}</h4>${still ? `<p class="tmsg warn">${esc(tr("tp_std"))}</p>` : ""}
        <form id="tPwF" class="tgrid"><input id="tNew" type="password" autocomplete="new-password" placeholder="${esc(tr("tp_pwnew"))}" style="min-width:220px"><button class="sec" type="submit">${esc(tr("tp_save"))}</button></form><div id="tPwMsg"></div>`;
      document.getElementById("tPwF").onsubmit = async e => {
        e.preventDefault();
        const v = document.getElementById("tNew").value;
        const msg = document.getElementById("tPwMsg");
        if (v.length < 6) { msg.innerHTML = `<div class="tmsg err">${esc(tr("tp_pwshort"))}</div>`; return; }
        const j2 = this.store(); j2.pw = await EL.sha("ELAB|" + v); TJ.save(j2);
        document.getElementById("tNew").value = "";
        msg.innerHTML = `<div class="tmsg ok">${esc(tr("tp_pwok"))}</div>`;
      };
    },
    csv(recs) {
      const H = ["anon_id", "group", "lab", "done", "step", "score", "grade", "pre", "post", "series_done", "calc_ok", "ai", "imported"];
      const lines = [H.join(";")];
      recs.forEach(r => {
        const labs = Object.keys(r.labs || {});
        (labs.length ? labs : [""]).forEach(id => {
          const lab = id ? r.labs[id] : null;
          const seriesDone = lab && lab.series ? lab.series.filter(s => s.n >= s.min).length : "";
          const calcOk = lab && lab.calc ? lab.calc.filter(c => c.ok).length : "";
          const row = [anon(r.id), r.group, id, lab && lab.done ? 1 : 0, lab ? lab.step : "", lab && lab.score != null ? lab.score : "", lab && lab.grade != null ? lab.grade : "", lab && lab.preOk != null ? lab.preOk : "", lab && lab.postOk != null ? lab.postOk : "", seriesDone, calcOk, r.ai || 0, r.imported || ""];
          lines.push(row.map(v => { const s = String(v).replace(/;/g, ","); return /["\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(";"));
        });
      });
      this.download("elektronika_jurnal_" + new Date().toISOString().slice(0, 10) + ".csv", "\uFEFF" + lines.join("\n"), "text/csv");
    },
    async fullJson() {
      const students = this.store().students;
      const sum = await EL.sha("ELAB-SALT|" + JSON.stringify(students));
      this.download("elektronika_jurnal_toliq_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ type: "elab-journal-v1", sum, students }, null, 1), "application/json");
    },
    xapi(recs) {
      const out = [];
      recs.forEach(r => {
        const actor = anon(r.id);
        Object.values(r.labs || {}).forEach(lab => {
          out.push({ actor: { account: { name: actor }, group: r.group }, verb: lab.done ? "completed" : "progressed", object: "lab-" + lab.id, result: { score: lab.score, step: lab.step }, timestamp: new Date(lab.updated || r.last || Date.now()).toISOString() });
        });
      });
      this.download("elektronika_xapi_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(out, null, 1), "application/json");
    },
    download(name, text, type) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" }));
      a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    },
    async importFiles(files) {
      let ok = 0, bad = 0, fail = 0;
      const j = this.store();
      for (const f of files) {
        try {
          const data = JSON.parse(await f.text());
          if (data && data.type === "elab-journal-v1" && data.students) {
            const sum = await EL.sha("ELAB-SALT|" + JSON.stringify(data.students));
            const flag = data.sum && data.sum === sum ? "ok" : "bad";
            if (flag === "ok") ok++; else bad++;
            Object.values(data.students).forEach(r => { if (!r || !r.id) return; r.imported = flag; j.students[nid(r.id)] = r; });
          } else if (data && data.student && data.lab && data.data) {
            const id = nid(data.student.id);
            if (!id) { fail++; continue; }
            const rec = j.students[id] || { id: data.student.id, name: data.student.name, group: data.student.group, first: Date.now(), labs: {}, ai: 0, note: "" };
            rec.name = data.student.name; rec.group = data.student.group; rec.last = Date.now(); rec.imported = "ok";
            const L = EL.LABS.find(x => x.id === data.lab);
            if (L) {
              const prevS = EL.S.student, prevId = EL.S.labId, prevLabs = EL.S.labs;
              EL.S.student = data.student; EL.S.labId = data.lab;
              const hold = {}; hold[data.lab] = data.data;
              EL.S.labs = hold;
              try { rec.labs[data.lab] = TJ.labSnap(L, data.data); if (data.score && data.score.score != null) { rec.labs[data.lab].score = data.score.score; rec.labs[data.lab].done = true; } }
              finally { EL.S.student = prevS; EL.S.labId = prevId; EL.S.labs = prevLabs; }
            }
            j.students[id] = rec; ok++;
          } else fail++;
        } catch (e) { fail++; }
      }
      TJ.save(j);
      this.render();
      const pane = document.getElementById("tPane");
      if (pane) pane.insertAdjacentHTML("afterbegin", `<div class="tmsg ${bad || fail ? "warn" : "ok"}">${esc(tr("tp_imp_res", { ok: ok, bad: bad, fail: fail }))}</div>`);
    }
  };

  /* ---------- AI tutor ---------- */
  const Tutor = {
    sample: null, busy: false, chats: {}, source: "off",
    init() {
      let n = 0;
      const tick = () => {
        try {
          if (window.claude && typeof window.claude.use === "function") {
            window.claude.use("sample").then(s => { this.sample = s || null; }).catch(() => { this.sample = null; });
            return;
          }
        } catch (e) { }
        if (++n < 8) setTimeout(tick, 500);
      };
      tick();
      document.getElementById("teachBtn").onclick = () => Teacher.open();
      const dlg = document.getElementById("teacher");
      dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    },
    allowed() {
      const S = EL.S;
      if (!S || !S.student || !S.labId) return false;
      const L = EL.lab();
      if (!L || !L.ready) return false;
      const ld = S.labs && S.labs[S.labId];
      if (!ld) return false;
      if (ld.step === 1) return false;
      if (ld.step === 6 && !(ld.post && ld.post.done)) return false;
      return true;
    },
    sync() {
      const on = this.allowed();
      const fab = document.getElementById("aiFab");
      if (!on) { if (fab) fab.remove(); const p = document.getElementById("aiBox"); if (p) p.remove(); return; }
      if (!fab) {
        const b = document.createElement("button");
        b.id = "aiFab"; b.type = "button";
        b.innerHTML = `<span>✦</span><span class="ai-lab"></span>`;
        b.onclick = () => this.open();
        document.body.appendChild(b);
      }
      const labEl = document.querySelector("#aiFab .ai-lab");
      if (labEl) labEl.textContent = tr("ai_btn");
    },
    bag() {
      const id = EL.S && EL.S.labId || 0;
      if (!this.chats[id]) this.chats[id] = [];
      return this.chats[id];
    },
    open() {
      if (!this.allowed()) return;
      let p = document.getElementById("aiBox");
      if (p) { p.remove(); return; }
      p = document.createElement("div");
      p.id = "aiBox"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", tr("ai_h"));
      p.innerHTML = `<div class="ai-h"><b>✦ ${esc(tr("ai_h"))}</b><button type="button" class="sec" id="aiX" aria-label="✕">✕</button></div><p class="ai-p">${esc(tr("ai_p"))} · <span id="aiSrc">${esc(tr("ai_src_off"))}</span></p><div class="ai-log" id="aiLog"></div><form id="aiF" class="ai-f"><input class="inp" id="aiIn" autocomplete="off" placeholder="${esc(tr("ai_ph"))}" maxlength="500"><button class="btn sm" type="submit">${esc(tr("ai_send"))}</button></form>`;
      document.body.appendChild(p);
      document.getElementById("aiX").onclick = () => p.remove();
      if (!this.bag().length) this.bag().push({ role: "assistant", content: this.greet() });
      this.draw();
      document.getElementById("aiF").onsubmit = e => { e.preventDefault(); const v = document.getElementById("aiIn").value.trim(); if (!v || this.busy) return; document.getElementById("aiIn").value = ""; this.ask(v); };
      setTimeout(() => { const i = document.getElementById("aiIn"); if (i) i.focus(); }, 30);
    },
    draw(partial) {
      const lg = document.getElementById("aiLog");
      if (!lg) return;
      const src = document.getElementById("aiSrc");
      if (src) src.textContent = tr(this.source === "net" ? "ai_src_net" : "ai_src_off");
      lg.innerHTML = this.bag().map(m => `<div class="ai-m ${m.role === "user" ? "user" : "assistant"}">${esc(m.content)}</div>`).join("") + (partial !== undefined ? `<div class="ai-m assistant">${esc(partial || tr("ai_think"))}</div>` : "");
      lg.scrollTop = lg.scrollHeight;
    },
    context() {
      const L = EL.lab(), ld = EL.LD();
      const g = guide(L.id);
      const series = (L.series || []).map(s => `${s.name}: ${(ld.meas[s.id] || []).length}/${s.min}`).join("; ");
      let calc = "";
      try {
        const T = L.tasks(EL.V);
        calc = T.map(k => { const s = (ld.calc || {})[k.id]; if (!s || s.val == null || s.val === "") return k.id + ":empty"; return k.id + ":" + (s.ok ? "correct" : "wrong"); }).join(", ");
      } catch (e) { calc = ""; }
      const live = liveRead();
      return `Lab ${L.id} (${L.title && L.title.en}). Step ${ld.step}. ${g ? "Idea: " + g.idea.en : ""} Series: ${series || "none"}. Readings: ${live || "none"}. Calculations (status only, no expected values): ${calc || "not started"}.`;
    },
    systemPrompt() {
      const hint = lang() === "ru" ? "The page language is Russian." : lang() === "en" ? "The page language is English." : "The page language is Uzbek.";
      return `You are a Socratic electronics laboratory guide at Termez State Pedagogical Institute, inside "Elektronika va signallarni qayta ishlash". You never solve the lab. You only give direction (yo‘nalish) and the next step.
HARD RULES:
- NEVER compute or state a final number, a measured result, a calculated result, or a truth-table bit string.
- Tell the student which formula to write, which quantities to read on the simulator, their units, and the order of steps. Ask one short guiding question.
- If they ask for the answer ("javobini ayt", "javobni ber", "скажи ответ", "tell me the answer"), refuse politely and give the next step instead.
- You may check a number they already typed only qualitatively: order of magnitude, sign, or unit ("tartibi to‘g‘ri", "birlikni tekshiring"). Do not say the correct value.
- Language: Uzbek Latin by default. If their latest message is Russian, answer in Russian. If it is English, answer in English. ${hint}
- At most 90 words. Unrelated questions: one short refusal.
CURRENT STATE (status only; do not turn these into the answer): ${this.context()}`;
    },
    async tryClaude(history) {
      if (!this.sample) return null;
      const input = [{ role: "user", content: this.systemPrompt() }, ...history.slice(-8)];
      const res = await this.sample(input, { modelTier: "quick", cache: false, onText: ({ text }) => this.draw(text) });
      return res && res.text ? res.text.trim() : null;
    },
    clientId() {
      const k = "elektronika_ai_client_v1";
      let id = "";
      try { id = localStorage.getItem(k) || ""; } catch (e) { id = ""; }
      if (!/^[A-Za-z0-9_-]{16,40}$/.test(id)) {
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        id = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
        try { localStorage.setItem(k, id); } catch (e) { }
      }
      return id;
    },
    packMessages(history) {
      const scrub = s => String(s || "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "").slice(0, 1500);
      const sys = scrub(this.systemPrompt()).slice(0, 3500);
      const rest = history.slice(-7).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: scrub(m.content)
      })).filter(m => m.content);
      let messages = [{ role: "system", content: sys }, ...rest].slice(0, 8);
      const size = () => messages.reduce((n, m) => n + m.content.length, 0);
      while (messages.length > 1 && size() > 6000) messages.splice(1, 1);
      if (size() > 6000) messages[0].content = messages[0].content.slice(0, 6000);
      return messages;
    },
    async tryProxy(history) {
      const cfg = window.ELAB_GOOGLE || {};
      if (!cfg.registryUrl) return null;
      const labId = Number(EL.S && EL.S.labId);
      if (!(labId >= 1 && labId <= 14)) return null;
      const ac = new AbortController();
      const tm = setTimeout(() => ac.abort(), 20000);
      try {
        const url = cfg.registryUrl + (String(cfg.registryUrl).indexOf("?") >= 0 ? "&" : "?") + "action=ai";
        const r = await fetch(url, {
          method: "POST",
          signal: ac.signal,
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "ai", clientId: this.clientId(), labId: labId, messages: this.packMessages(history) })
        });
        if (!r.ok) return null;
        const data = await r.json();
        if (!data || data.ok !== true || !data.text) return null;
        return String(data.text).trim();
      } catch (e) {
        return null;
      } finally { clearTimeout(tm); }
    },
    async ask(q) {
      this.busy = true;
      this.bag().push({ role: "user", content: q });
      this.draw("");
      TJ.bumpAi();
      const history = this.bag().filter(m => m.role === "user" || m.role === "assistant").map(m => ({ role: m.role, content: m.content }));
      let text = null, netFail = false, usedNet = false;
      try { text = await this.tryClaude(history); if (text) usedNet = true; } catch (e) { text = null; }
      if (!text) {
        try { text = await this.tryProxy(history); if (text) usedNet = true; else netFail = true; } catch (e) { netFail = true; text = null; }
      }
      if (!text) { try { text = this.offline(q); } catch (e) { console.warn(e); text = tr("h_check"); } }
      if (netFail) text += "\n\n" + tr("ai_netfail");
      this.source = usedNet ? "net" : "off";
      this.bag().push({ role: "assistant", content: text });
      if (this.bag().length > 40) this.chats[EL.S.labId] = this.bag().slice(-40);
      this.busy = false;
      this.draw();
    },
    greet() {
      const L = EL.lab(), ld = EL.LD(), g = guide(L.id);
      const lines = [];
      lines.push(L.id + ". " + (L.title[lang()] || L.title.uz));
      lines.push(stepName(ld.step) + ".");
      if (g) {
        if (ld.step === 2) lines.push(tx(g.idea));
        else if (ld.step === 3) lines.push(tx(g.asm));
        else if (ld.step === 4) lines.push(tx(g.meas));
        else if (ld.step >= 5) lines.push(tx(g.idea));
      }
      if (ld.step === 4) {
        lines.push((L.series || []).map(s => `${s.name}: ${(ld.meas[s.id] || []).length}/${s.min}`).join("\n"));
        const live = liveRead();
        if (live) lines.push(live);
      }
      if (ld.step === 5 && ld.calc) {
        try {
          const T = L.tasks(EL.V);
          T.forEach(k => {
            const s = ld.calc[k.id];
            if (s && s.tries && !s.ok) lines.push(k.q + "\n" + classify(k, s.val) + "\n" + formulaOf(L.id, k.id));
          });
        } catch (e) { }
      }
      lines.push(lang() === "ru" ? "Готовое число не назову — спрошите, с чего начать." : lang() === "en" ? "I will not state the finished number — ask where to start." : "Tayyor sonni aytmayman — qayerdan boshlashni so‘rang.");
      return lines.filter(Boolean).join("\n\n");
    },
    offline(q) {
      const L = EL.lab(), ld = EL.LD(), g = guide(L.id);
      const n = norm(q);
      const fish = /javobini ayt|javobni (ayt|ber)|tayyor (javob|son)|nechchi|necha chiq|qancha chiq|sonini ayt|hisoblab ber|aniq javob|to'g'ri javob|скажи ответ|дай ответ|посчитай|сколько (получ|будет|равно)|какое число|tell me the answer|correct answer|give (me )?the (number|answer|value)|what is the (value|answer)|solve it|calculate (it|the)/.test(n);
      const live = liveRead();
      const series = (L.series || []).map(s => `${s.name}: ${(ld.meas[s.id] || []).length}/${s.min}`).join("\n");
      let task = null;
      try { task = matchTask(L, n); } catch (e) { task = null; }
      const bits = [];
      if (fish) bits.push(lang() === "ru" ? "Готовое число не назову. Следующий шаг: запишите формулу, подставьте величины с приборов и проверьте единицу." : lang() === "en" ? "I will not state the finished number. Next step: write the formula, take the quantities from the instruments, and check the unit." : "Tayyor javobni aytmayman. Keyingi qadam: formulani yozing, kattaliklarni asbobdan oling va birlikni tekshiring.");
      if (task) {
        bits.push(formulaOf(L.id, task.id));
        const s = ld.calc && ld.calc[task.id];
        const typed = fieldVal(task.id);
        const val = typed != null && typed !== "" ? typed : (s ? s.val : null);
        if (val != null && val !== "" && !(s && s.ok)) bits.push(classify(task, val));
        else if (s && s.ok) bits.push(lang() === "ru" ? "Этот пункт уже верный. Переходите к следующему." : lang() === "en" ? "This item is already correct. Move to the next one." : "Bu band to‘g‘ri. Keyingisiga o‘ting.");
      } else if (ld.step === 3 && g) bits.push(tx(g.asm));
      else if (ld.step === 5 && g) {
        bits.push(tx(g.idea));
        try { const pending = pendingTask(L, ld); if (pending) bits.push(formulaOf(L.id, pending.id)); } catch (e) { }
      } else if (g && ld.step !== 4) bits.push(tx(g.idea));
      if (ld.step === 4) {
        if (!task && g) bits.push(tx(g.meas));
        if (series) bits.push(series);
        if (live && !fish) bits.push((lang() === "ru" ? "Снимите с приборов и запишите сами: " : lang() === "en" ? "Read these on the instruments and write them yourself: " : "Asbobdan o‘zingiz yozing: ") + live);
      }
      if ((ld.step === 2 || ld.step === 3) && g) bits.push(tx(g.meas));
      return bits.filter(Boolean).join("\n\n");
    },
    askAbout(taskId) {
      if (!document.getElementById("aiBox")) this.open();
      const L = EL.lab();
      let qtext = taskId;
      try { const T = L.tasks(EL.V); const k = T.find(x => x.id === taskId); if (k) qtext = k.q; } catch (e) { }
      const q = lang() === "ru" ? `Проверьте мой ввод и объясните ход, без готового числа: ${qtext}` : lang() === "en" ? `Check my entry and explain the method, without the finished number: ${qtext}` : `Kiritgan qiymatimni tekshiring va yo‘lini tushuntiring, tayyor sonsiz: ${qtext}`;
      this.ask(q);
    }
  };

  function liveRead() {
    const rd = EL.C && EL.C._rd;
    if (!rd) return "";
    return Object.entries(rd).filter(e => e[0][0] !== "_").map(([, v]) => `${v[2]} = ${EL.fmtR(v[0])} ${v[1]}`).join(", ");
  }
  function fieldVal(id) {
    const el = document.getElementById("a_" + id);
    if (!el) return null;
    return el.value;
  }
  function matchTask(L, n) {
    const g = guide(L.id);
    if (!g) return null;
    const T = L.tasks(EL.V);
    let best = null, score = 0;
    T.forEach(task => {
      const meta = g.task[task.id];
      if (!meta) return;
      let s = 0;
      (meta.k || []).forEach(w => { if (n.includes(norm(w))) s += Math.max(norm(w).length, 4); });
      norm(task.q).split(/[^a-z0-9\u0400-\u04ff']+/i).forEach(w => { if (w.length > 5 && n.includes(w)) s += 3; });
      const qq = norm(task.q);
      if (qq.length > 18 && n.includes(qq.slice(0, 22))) s += 24;
      if (s > score) { score = s; best = task; }
    });
    return score >= 3 ? best : null;
  }
  function pendingTask(L, ld) {
    const T = L.tasks(EL.V);
    return T.find(k => { const s = (ld.calc || {})[k.id]; return !s || !s.ok; }) || T[0];
  }

  function attachHints(L, ld) {
    let T = [];
    try { T = L.tasks(EL.V); } catch (e) { return; }
    T.forEach(k => {
      const s = (ld.calc || {})[k.id];
      if (!s || !s.tries || s.ok) return;
      const inp = document.getElementById("a_" + k.id);
      if (!inp || !inp.parentElement) return;
      const d = document.createElement("div");
      d.className = "calc-hint";
      d.textContent = classify(k, s.val) + " " + tr("h_formula") + ": " + formulaOf(L.id, k.id);
      inp.parentElement.appendChild(d);
      if (Tutor.allowed()) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "hint-ask"; b.textContent = tr("ai_ask");
        b.onclick = () => Tutor.askAbout(k.id);
        inp.parentElement.appendChild(b);
      }
    });
  }

  function boot() {
    const stepCalc0 = EL.stepCalc;
    EL.stepCalc = function (P, L, ld) { stepCalc0(P, L, ld); try { attachHints(L, ld); } catch (e) { console.warn(e); } };
    const bindReg0 = EL.bindReg;
    EL.bindReg = function () {
      bindReg0();
      document.querySelectorAll(".lab").forEach(e => {
        const old = e.onclick;
        e.onclick = () => { TJ.snapshot(); if (old) old(); };
      });
    };
    const stepReport0 = EL.stepReport;
    EL.stepReport = function (P, L, ld) {
      stepReport0(P, L, ld);
      const ns = document.getElementById("ns");
      if (ns) { const old = ns.onclick; ns.onclick = () => { TJ.snapshot(); if (old) old(); }; }
    };
    const render0 = EL.render;
    EL.render = function () {
      render0();
      const b = document.getElementById("teachBtn");
      if (b) b.textContent = tr("teachBtn");
      const tt = document.getElementById("tTitle");
      if (tt && (!document.getElementById("teacher").open)) tt.textContent = tr("teacher_panel");
      Tutor.sync();
    };
    Tutor.init();
    try { TJ.snapshot(); } catch (e) { }
    Tutor.sync();
    const b = document.getElementById("teachBtn");
    if (b) b.textContent = tr("teachBtn");
    try { EL.render(); } catch (e) { console.warn(e); }
  }

  window.TEACH = { TJ, Teacher, Tutor, classify, GUIDE, tr };
  boot();
})();
