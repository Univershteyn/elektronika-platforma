# Google orqali kirish va o‘qituvchi jurnali

Sayt statik (GitHub Pages). Bizning serverimiz yo‘q va repoda maxfiy kalit yo‘q. Talaba o‘z Google tokeni bilan boshqa odamning Drive iga yozolmaydi. Shuning uchun har bir o‘qituvchining jurnali **uning o‘z Google jadvalida** turadi. Jadvalga biriktirilgan Apps Script o‘qituvchi nomidan yozadi va talabaning Google ID tokenini tekshiradi.

Qisqa integratsiya kodi (6 belgi) egasining reestriga yoziladi. Talaba kodni kiritsa, sayt reestrdan o‘qituvchining veb-ilova manzilini oladi va natijani shu manzilga yuboradi.

Mehmon Google siz ishlaydi. Uning natijasi jurnalga yozilmaydi. Lokal jurnal, PDF/CSV/JSON eksport va internetsiz maslahatchi avvalgidek qoladi.

O‘qituvchi qadamlari saytda ham bor: laboratoriya paroli, **O‘qituvchi** paneli, **Yo‘riqnoma** bo‘limi. Bo‘lim Drive ulanmasdan oldin ham ochiladi.

## Nima uchun shu yo‘l

| Yo‘l | Nima uchun tanlanmadi yoki tanlandi |
| --- | --- |
| Talaba to‘g‘ridan-to‘g‘ri o‘qituvchi Drive iga yozadi | Google bunga ruxsat bermaydi: talaba tokeni faqat o‘zining Drive iga tegishli |
| Bitta umumiy jadval egasining hisobida | Jurnal o‘qituvchining o‘z Drive ida bo‘lishi kerak |
| Faqat uzun Apps Script manzilini doskaga yozish | Ishlaydi, lekin guruhga berish noqulay |
| **Jadval nusxasi + veb-ilova + 6 belgili kod** | O‘qituvchi bir marta nusxa oladi va joylaydi. Keyin doskaga faqat kod yoziladi |

Google Cloud Console o‘zbekcha emas. Quyidagi ega qadamlaridagi tugma nomlari inglizcha, konsolda qanday yozilgan bo‘lsa shunday. Jadval va Apps Script tugmalari hisob tiliga qarab o‘zgaradi: o‘zbekcha va inglizcha juftlab yozilgan. Ikkalasidan qaysi biri chiqsa, o‘shani bosing.

## Sayt egasi — bir marta

O‘qituvchilar bu bo‘limni qilmaydi. Siz bir marta client ID, reestr va namuna jadvalni qo‘yasiz.

### 1. Loyiha

1. [console.cloud.google.com](https://console.cloud.google.com) ni oching va shu saytning egasi bo‘lgan Google hisobiga kiring.
2. Yuqori chapdagi loyiha tanlagich: **Select a project**.
3. **New project**. Nom: `elektronika-tdpi`. **Create**.
4. Bildirishnoma tugagach, shu loyiha tanlanganini tekshiring. Noto‘g‘ri loyihada client ID boshqa joyda qoladi.

### 2. Google Auth platform — ilova ma’lumoti

Yangi konsolda chap menyu **Google Auth platform**. Eski menyuda bu **APIs & Services**. Ikkalasi bir sozlamaga olib boradi.

Agar sahifa **Google Auth platform not configured yet** desa, **Get started** ni bosing va shu oynani to‘ldiring:

1. **App name**: `Elektronika va signallarni qayta ishlash`.
2. **User support email**: o‘z Gmail ingiz.
3. **Audience**: **External**. **Internal** faqat bitta Workspace tashkiloti ichida ishlaydi. Talabalarning oddiy Gmail i kira olmaydi.
4. **Contact information**: xat keladigan email.
5. **I agree to the Google API Services: User Data Policy** ni belgilang.
6. **Continue**, so‘ng **Create**.

Allaqachon sozlangan bo‘lsa, **Branding** bo‘limida ilova nomi va support email ni tekshiring. Bosh sahifa sifatida `https://elektronika-tdpi.uz` qo‘yish mumkin. **Save**.

### 3. Auditoriya va scope

1. **Audience** (eski nom: **OAuth consent screen**).
2. User type **External** qolsin.
3. Holat **Testing** bo‘lsa, faqat **Test users** ro‘yxatidagi pochtalar kiradi va ular 100 tadan oshmaydi. **Add users** bilan o‘zingizni qo‘shishingiz sinov uchun yetadi, guruh uchun emas.
4. Dars uchun **Publish app** ni bosing va tasdiqlang. Holat **In production** bo‘ladi.
5. **Data Access** (eski nom: **Scopes**). Qo‘shimcha scope qo‘shmang. **Add or remove scopes** ni ochib, Drive, Gmail yoki Sheets scope qo‘yilgan bo‘lsa, olib tashlang va **Save**.
6. Google bilan kirish o‘zi `openid`, `email`, `profile` so‘raydi. Bu uchchalik tekshiruvsiz ishlaydi. Drive scope shu yerga qo‘shilsa, talaba «tasdiqlanmagan ilova» oynasiga tushadi va yangi foydalanuvchilar 100 tadan keyin to‘xtaydi.

Jadvalga yozish ruxsati boshqa oyna: o‘qituvchi o‘z Apps Script ini joylaganda o‘z hisobiga beradi. Uni shu consent screen ga yozmang.

### 4. OAuth client ID

1. **Clients** → **Create client**. Eski yo‘l: **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. **Application type**: **Web application**.
3. **Name**: `elektronika-tdpi-web`. Bu nom faqat konsolda ko‘rinadi.
4. **Authorized JavaScript origins** → **Add URI**. Aynan shu qator, oxirida yo‘l va slesh yo‘q:

   `https://elektronika-tdpi.uz`

   `https://elektronika-tdpi.uz/laboratoriya` yozilsa, tugma `origin_mismatch` beradi.
5. O‘z kompyuteringizda sinash kerak bo‘lsa, ikkinchi qator: `http://localhost:8765`. `http://127.0.0.1` ni Google ko‘pincha rad etadi.
6. **Authorized redirect URIs** bo‘sh qoladi. Sayt Google Identity Services tugmasidan ID token oladi, serverga qaytish yo‘q.
7. **Create**.
8. **Client ID** ni nusxalang. U `.apps.googleusercontent.com` bilan tugaydi. Bu maxfiy emas.
9. **Client secret** chiqsa ham, saytga yozmang. Veb-tugma uni ishlatmaydi.

### 5. `google-config.js`

`laboratoriya/google-config.js`:

```javascript
window.ELAB_GOOGLE = {
  clientId: "948557132699-fk85kr5ul3enbissb8tk0o4pevdg3b8o.apps.googleusercontent.com",
  registryUrl: "https://script.google.com/macros/s/AKfycbz3oz5VEBtDu0xLgcplJ9vKeYh2qpzGzCn3yP8z8t_3AZmJKQElRNyS4gJLUrWDISY6/exec",
  templateUrl: "https://docs.google.com/spreadsheets/d/17bOfLzbscuHJI3PJGnzbySlnToR6R7gfF2LDbEgXuac/copy"
};
```

Bu uch qiymat hozir saytda yozilgan. Kalit, client secret yoki Drive tokenini yozmang.

Saytni ochib, laboratoriya parolidan keyin **Sign in with Google** chiqishini tekshiring. Chiqmasa, origins qatorini va loyiha holati **In production** ekanini qayta o‘qing.

### 6. Reestr (kod → manzil)

Reestrda talaba bahosi yo‘q. Unda faqat 6 belgili kod va o‘qituvchining `/exec` manzili turadi.

1. [sheets.google.com](https://sheets.google.com) da yangi jadval. Nom: `Elektronika reestri`.
2. **Kengaytmalar → Apps Script** (inglizcha: **Extensions → Apps Script**).
3. `docs/registry-apps-script.gs` dagi butun kodni joylang. `CONFIG.CLIENT_ID` o‘rniga 4-qadamdagi Client ID ni yozing. `PASTE_OAUTH_CLIENT_ID` qolsa, kod ro‘yxatdan o‘tmaydi.
4. **Saqlash** / **Save** (disk belgisi yoki Ctrl+S).
5. O‘ng yuqori: **Joylashtirish** / **Deploy** → **Yangi joylashtirish** / **New deployment**.
6. **Select type** yonidagi tishli g‘ildirak → **Veb-ilova** / **Web app**.
7. **Execute as**: **Me**. **Who has access**: **Anyone** (ba’zi ekranda **Anyone, even anonymous**). **Only myself** va **Anyone with a Google account** sayt so‘rovini qabul qilmaydi.
8. **Deploy**.
9. Ruxsat oynasi chiqsa, quyidagi «Tasdiqlanmagan ilova» qadamini bajaring. So‘raladigan ruxsat — jadvalni o‘qish/yozish va tashqi manzilga murojaat (token tekshiruvi).
10. Chiqqan manzil `https://script.google.com/macros/s/....../exec` ko‘rinishida. Oxiri `/exec` bo‘lsin, `/dev` emas. Uni `registryUrl` ga yozing va saytni yana yangilang.

### 7. O‘qituvchi nusxa oladigan jadval

1. Yana bir jadval: `Elektronika jurnali (namuna)`.
2. **Kengaytmalar → Apps Script**, `docs/journal-apps-script.gs` kodini joylang, saqlang.
3. Bu namunani **Deploy** qilmang. Joylashtirishni har bir o‘qituvchi o‘z nusxasida qiladi.
4. Jadvalda **Ulashish** / **Share**.
5. Umumiy kirish: **Havolaga ega har kim** / **Anyone with the link**.
6. Rol: **Ko‘ruvchi** / **Viewer**. Muharrir qilmang — talaba namunaning o‘zini tahrirlamasin.
7. **Tayyor** / **Done**.
8. Brauzer manzilidagi `/edit?...` qismini `/copy` qiling. Hozirgi namuna:

   `https://docs.google.com/spreadsheets/d/17bOfLzbscuHJI3PJGnzbySlnToR6R7gfF2LDbEgXuac/copy`

9. Shu havola `templateUrl` da turadi. O‘qituvchi panelidagi **Jadval nusxasini olish** shu manzilni ochadi.

Shu bilan jurnal sozlamasi tugaydi. AI maslahatchi alohida, faqat sizda.

### 8. AI maslahatchi (faqat ega)

Talaba va o‘qituvchi kalit kiritmaydi. Kalit sayt faylida ham yo‘q. Maslahatchi shu reestr skripti orqali javob oladi. Ishlamasa, saytdagi ichki maslahatchi javob beradi.

1. Bepul kalit oling: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Reestr jadvalida **Kengaytmalar → Apps Script**. Sozlama tishli g‘ildiragi: **Настройки проекта** → **Свойства скрипта**. Yangi xossa: nomi `GEMINI_API_KEY`, qiymati — olingan kalit. Kalitni boshqa joyga nusxalamang.
3. Skript oynasidagi kodni `docs/registry-apps-script.gs` dagi yangi matn bilan almashtiring va saqlang.
4. `/exec` manzili o‘zgarmasligi uchun yangi joylashtirish emas, mavjudini yangilang: **Начать развертывание** → **Управление развертываниями** → qalamcha (tahrirlash) → Version **Новая версия** → **Начать развертывание**.
5. Birinchi AI chaqiruvida Google **UrlFetchApp** (tashqi manzilga chiqish) uchun yangi ruxsat so‘raydi. Buni tasdiqlang. Shu ruxsatsiz modelga murojaat ketmaydi va sayt ichki maslahatchiga qaytadi.

`registryUrl` o‘sha `/exec` bo‘lib qoladi. Saytni qayta yozish shart emas.

Skript yana yangilandi: o‘qituvchi qidiruvi Gmail nuqtalarini va `googlemail.com` ni bir xil hisoblaydi, eskirgan belgini `exp` deb qaytaradi. `docs/registry-apps-script.gs` ni qayta joylab, **Новая версия** bilan deploy qiling. `/exec` o‘zgarmaydi. Sayt yangilansa ham, eskirgan belgi yangilanib, jurnal kod so‘ralmasdan ochiladi.

Skript yana yangilandi: o‘qituvchi hisobi Google `sub` va email bilan saqlanadi. Yangi amallar: `teacher` (shu hisobning kodi va manzili) va `link` (eski qatorni kod orqali bog‘lash; jurnal `whoami` egasini tasdiqlaydi). `docs/registry-apps-script.gs` ni qayta joylab, **Новая версия** bilan deploy qiling. `/exec` o‘zgarmaydi.

Jurnal namunasi ham yangilandi: `whoami`, baho (`mark`), izoh (`note`), o‘chirish (`drop`). Namuna jadvaldagi skriptni yangilang. Allaqachon nusxa olgan o‘qituvchi o‘z nusxasida ham shuni qiladi va **Yangi versiya** qilib joylaydi. Eski nusxa `list` ni qaytarar ekan, kod va talabalar ro‘yxati baribir tiklanadi. `whoami` bo‘lmasa, eski kodni bog‘lashda sayt aniq o‘zbekcha yo‘l ko‘rsatadi. Baho va izoh barcha qurilmalarda bir xil bo‘lishi uchun jurnal skripti yangilangan bo‘lishi kerak.

Skript yana yangilandi: model tayyor sonni aytmaydi, faqat yo‘nalish beradi. Mijoz yuborgan `system` xabari tashlanadi. Shu yangi `docs/registry-apps-script.gs` ni qayta joylab, **Новая версия** qilib yana deploy qiling. Aks holda eski joylashtirish ishlayveradi.

## Tasdiqlanmagan ilova — ega va o‘qituvchi uchun bir xil

Apps Script birinchi marta joylansa, Google «bu ilovani tekshirmaganmiz» deydi. Bu siz yozgan skript. Ko‘k tugma bekor qiladi.

1. **Ruxsatlarni ko‘rib chiqish** / **Review permissions**.
2. Skript turgan Gmail ni tanlang.
3. Sarlavha: **Google bu ilovani tasdiqlamagan** yoki **Google hasn’t verified this app**. Ko‘k tugma **Xavfsizlikka qaytish** / **Back to safety** — bosilmaydi.
4. Pastki chapdagi mayda yozuv: **Kengaytirilgan** yoki **Qo‘shimcha** / **Advanced**.
5. Yangi havola: **… ga o‘tish (xavfli)** / **Go to … (unsafe)**. Nuqtalar o‘rnida loyiha nomi turadi.
6. Yangiroq ekranda **Advanced** o‘rniga **Davom etish** / **Continue** chiqishi mumkin. U oldinga o‘tkazadi. **Back to safety** bekor qiladi.
7. Ro‘yxatda jadvallarni ko‘rish va tahrirlash, hamda tashqi xizmatga ulanish so‘raladi. Inglizcha: **See, edit, create, and delete all your Google Sheets spreadsheets** va **Connect to an external service**.
8. **Ruxsat berish** / **Allow**.

Ruxsat shu Google hisobiga beriladi. Talaba bu oynani ko‘rmaydi.

## Har bir o‘qituvchi

Shu matn panelda **Yo‘riqnoma** bo‘limida ham turadi. Drive ulanmasdan ochiladi.

### 1. Saytga va panelga kirish

1. `https://elektronika-tdpi.uz` da virtual laboratoriyani oching.
2. Laboratoriya paroli **1234**. Tugma: **OK**.
3. **Google bilan kirish** (inglizcha: **Sign in with Google**). O‘z Gmail ingiz.
4. Tugma o‘rniga «Google hali sozlanmagan» chiqsa, ega hali client ID qo‘ymagan. Lokal jurnal va **Mehmon** ishlaydi. Mehmon natijasi jurnalga yozilmaydi.
5. **Men o‘qituvchiman**. **Men talabaman** talaba formasi.
6. Yuqoridagi **O‘qituvchi** paneli Google hisobi bilan ochiladi. Parol so‘ralmaydi. Eski parol **123456** faqat Google ulanmagan brauzer uchun.
7. Telefon yoki boshqa kompyuter: shu Gmail bilan kiring va **Men o‘qituvchiman** ni tanlang. Kod so‘ralmaydi — jurnal o‘zi ochiladi. Xato chiqsa **Qayta urinish**. Kulrang `reestr:` satri sababni ko‘rsatadi.
8. **Yo‘riqnoma** bo‘limi shu paytdan bor. Jurnal kartasidagi **Yo‘riqnoma** tugmasi ham shu yerni ochadi.

### 2. Jurnal namunasidan nusxa

1. **Jurnal** kartasidagi **Jadval nusxasini olish** shu sahifani ochadi:

   `https://docs.google.com/spreadsheets/d/17bOfLzbscuHJI3PJGnzbySlnToR6R7gfF2LDbEgXuac/copy`

2. Google sahifasidagi tugma: **Nusxa olish** yoki **Make a copy**. Ba’zi hisobda **Nusxa yaratish**.
3. Jadvalning o‘zi ochiq bo‘lsa: **Fayl → Nusxa olish** / **File → Make a copy**.
4. Nom bering, masalan «Elektronika jurnali — 2-kurs». Nusxa sizning Drive ingizda.
5. Namunaning o‘zida **Deploy** bosilmaydi. Joylashtirish faqat sizning nusxangizda.

### 3. Apps Script

1. Nusxada: **Kengaytmalar → Apps Script** / **Extensions → Apps Script**.
2. Kod turgan bo‘lsa, o‘chirmang.
3. Oyna bo‘sh bo‘lsa, to‘xtang va egaga ayting.
4. **Saqlash** / **Save**.

### 4. Veb-ilova

1. **Joylashtirish** / **Deploy** → **Yangi joylashtirish** / **New deployment**.
2. **Select type** yonidagi tishli g‘ildirak → **Veb-ilova** / **Web app**. G‘ildiraksiz tur chiqmaydi.
3. Tavsif ixtiyoriy.
4. **Bajarish** / **Execute as**: **Men** / **Me**. «Foydalanuvchi» / **User accessing the web app** emas.
5. **Kimlar kira oladi** / **Who has access**: **Hamma** / **Anyone** (ba’zan **Anyone, even anonymous**). **Faqat men** / **Only myself** va faqat **Anyone with a Google account** talaba yozuvini qabul qilmaydi.
6. **Deploy**.
7. Ruxsat so‘ralsa, yuqoridagi «Tasdiqlanmagan ilova» qadamlarini yuring.

### 5. Manzil va kod

1. Oynadagi manzil `https://script.google.com/macros/s/…/exec` bilan tugaydi. **Nusxalash** / **Copy**. `/dev` sinf uchun yaramaydi.
2. **Tayyor** / **Done**.
3. Saytda **Jurnal** maydoniga qo‘ying va **Kodni olish**.
4. 6 belgili kod chiqadi. **Kodni nusxalash**. Doskaga kodni yozing, `/exec` manzilini yubormang.
5. Kodni joylagandan keyin darhol oling. Birinchi Google hisobi shu jadvalning egasi bo‘lib yoziladi.
6. Manzilni keyin topish: **Deploy → Manage deployments**.

### 6. Talaba

1. **Google bilan kirish**, **Men talabaman**.
2. Ism, familiya, kurs (1–4), guruh raqami (1–30), o‘qituvchi kodi.
3. **Jurnalga ulanish**.
4. Test, o‘lchov, hisob va baho jadvalning **Jurnal** varag‘iga tushadi. Panel ochilganda ro‘yxat jadvaldan o‘zi keladi.
5. **Mehmon sifatida davom etish** jurnalga yozmaydi.

Internet uzilsa, ish shu brauzerda davom etadi. Ulanish qaytganida natija qayta yuboriladi.

### 7. Yangilash, eksport, parol

1. Panel ochilganda talabalar jadvaldan keladi. **Jadvaldan yangilash** ro‘yxatni qayta oladi. Telefon va kompyuter bir xil jadvalni ko‘radi.
2. **Jurnalni PDF**, **CSV (anonim)**, **JSON: to‘liq (ism bilan)**, **JSON: xAPI jurnali (anonim)**. To‘liq JSON ni boshqa kompyuterda **JSON import** qilish mumkin.
3. Grafikli hisobotni talaba o‘zi «PDF hisobot» bilan oladi.
4. Panel kaliti — Google hisobi. **Sozlama** dagi parol faqat Google siz ulanmagan eski brauzer uchun. Laboratoriya paroli 1234 o‘zgarmaydi.
5. **Chiqish** Google o‘qituvchisida panelni yopadi. Keyingi safar parol so‘ralmaydi.
6. **Yangi kod** eski kodni bekor qiladi. Jadvaldagi yozuvlar qoladi. Talabaga yangi kodni bering.

## Baholash mezoni (5–2)

Baho 100 balllik natijaning foizidan chiqadi. Talaba hisobotda baho va foizni yonma-yon ko‘radi. O‘qituvchi **Talabalar** bo‘limida bahoni o‘zgartira oladi. Mehmon ham bahoni ko‘radi, lekin u jurnalga yozilmaydi. Sertifikat 3, 4 va 5 da beriladi. 2 da berilmaydi — avtomatik ball 60 % dan past bo‘lsa ham, o‘qituvchi 2 qo‘ysa ham.

**5 — a‘lo (90 % va undan yuqori).** Talaba fanning mohiyatini to‘liq tushunadi, biladi, ifodalay oladi, aytib beradi, tasavvurga ega, mustaqil mushohada yuritadi, olgan bilimini amalda qo‘llay oladi, ijodiy fikrlaydi hamda mustaqil xulosa va qaror qabul qiladi.

**4 — yaxshi (70 % dan 90 % gacha).** Talaba mustaqil mushohada yuritadi, olgan bilimini amalda qo‘llay oladi, fanning mohiyatini tushunadi, biladi, ifodalay oladi, aytib beradi va tasavvurga ega.

**3 — qoniqarli (60 % dan 70 % gacha).** Talaba olgan bilimini amalda qo‘llay oladi, fanning mohiyatini tushunadi, biladi, ifodalay oladi, aytib beradi va tasavvurga ega.

**2 — qoniqarsiz (60 % dan past).** Talaba fan dasturini o‘zlashtirmagan, fanning mohiyatini tushunmaydi hamda tasavvurga ega emas. Sertifikat berilmaydi.

| Baho | Ball foizi |
| --- | --- |
| 5 — a‘lo | 90 % va undan yuqori |
| 4 — yaxshi | 70 % dan 90 % gacha |
| 3 — qoniqarli | 60 % dan 70 % gacha |
| 2 — qoniqarsiz, sertifikat yo‘q | 60 % dan past |

Baho shu chegaralar bilan chiqadi: 90 % va yuqori — 5, 70 % dan 90 % gacha — 4, 60 % dan 70 % gacha — 3, 60 % dan past — 2. 90, 70 va 60 o‘z bahosiga kiradi.

Jadvaldagi `grade` ustuni endi 5, 4, 3 yoki 2. Qo‘shimcha ustunlar (oxiriga qo‘shiladi, eski ustunlar siljmaydi): `gradeWord`, `criteria`, `gradeOverride`, `gradeAuto`. To‘liq yozuv avvalgidek `labJson` ichida. Namuna jadvaldagi skriptni yangilab, **yangi versiya** qilib qayta joylang. Allaqachon nusxa olgan o‘qituvchi ham o‘z nusxasidagi skriptni yangilashi kerak.

## Xatolar

**Google tugmasi yo‘q.** Ega client ID qo‘ymagan yoki sayt yangilanmagan.

**origin_mismatch.** Origins qatorida yo‘l bor yoki `http` yozilgan. To‘g‘risi: `https://elektronika-tdpi.uz`.

**Namuna havolasi yo‘q.** `templateUrl` bo‘sh.

**Kod topilmadi.** Kod xato, bo‘shliq bor, yoki **Yangi kod** bosilgan.

**Manzil …/exec bo‘lishi kerak.** Jadval havolasi yoki `/dev` qo‘yilgan.

**Talaba ishladi, panel bo‘sh.** Panel jadvaldan o‘qiydi. Talaba Google bilan shu kodga ulangan bo‘lishi kerak. Mehmon yozuvi jadvalga tushmaydi.

**Telefonda jurnal ochilmadi.** Shu Gmail bilan kiring va **Qayta urinish** ni bosing. Google belgisi taxminan bir soatda eskiradi; sayt yangisini o‘zi so‘raydi. Kod so‘ralmaydi. `reestr: token` eskirgan belgi degani.

**Jurnal tasdiqlanmadi.** Execute as **Me** emas yoki kirish **Anyone** emas. **Manage deployments** → qalamcha → shu ikki sozlama → **Deploy**, so‘ng saytda kodni qayta oling.

**Xavfsizlikka qaytish bosilgan.** Ruxsat bekor. Joylashtirishni qaytaring va Advanced → Go to … (unsafe) → Allow.

**Sahifa topilmadi (404).** Kirish «Only myself» qolgan yoki joylashtirish o‘chirilgan.

**Kod o‘zgardi, talaba eskisini ko‘radi.** **Manage deployments** → qalamcha → **New version** → **Deploy**.

**Avval kod oling.** Yangilashdan oldin kod kerak. Yo‘riqnoma baribir ochiladi.

**Panel paroli esimda yo‘q.** Google bilan kirilganda parol kerak emas. Eski parol faqat shu brauzerda edi. Google jadvalidagi qatorlar qoladi.

**Token muddati.** Talaba taxminan bir soatdan keyin qayta **Google bilan kirish** qiladi.

## Lokal sinov

Haqiqiy Google hisobisiz oqimni ko‘rish uchun manzil oxiriga `?googleMock=1` qo‘shiladi. Bu faqat shu brauzerning xotirasida soxta jadval ochadi va Google Drive ga tegmaydi. Darsda ishlatilmaydi. Sayt egasi client ID ni qo‘ymaguncha oddiy sahifada Google tugmasi o‘rniga sozlash eslatmasi chiqadi, mehmon rejimi esa ishlaydi.
