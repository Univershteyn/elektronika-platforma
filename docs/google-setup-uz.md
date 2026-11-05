# Google orqali kirish va o‘qituvchi jurnali

Sayt statik (GitHub Pages). Bizning serverimiz yo‘q va repoda maxfiy kalit yo‘q. Talaba o‘z Google tokeni bilan boshqa odamning Drive iga yozolmaydi. Shuning uchun har bir o‘qituvchining jurnali **uning o‘z Google jadvalida** turadi. Jadvalga biriktirilgan Apps Script o‘qituvchi nomidan yozadi va talabaning Google ID tokenini tekshiradi.

Qisqa integratsiya kodi (6 belgi) egasining reestriga yoziladi. Talaba kodni kiritsa, sayt reestrdan o‘qituvchining veb-ilova manzilini oladi va natijani shu manzilga yuboradi.

Mehmon Google siz ishlaydi. Uning natijasi jurnalga yozilmaydi. Lokal jurnal, PDF/CSV/JSON eksport va internetsiz maslahatchi avvalgidek qoladi.

## Nima uchun shu yo‘l

| Yo‘l | Nima uchun tanlanmadi yoki tanlandi |
| --- | --- |
| Talaba to‘g‘ridan-to‘g‘ri o‘qituvchi Drive iga yozadi | Google bunga ruxsat bermaydi: talaba tokeni faqat o‘zining Drive iga tegishli |
| Bitta umumiy jadval egasining hisobida | Jurnal o‘qituvchining o‘z Drive ida bo‘lishi kerak |
| Faqat uzun Apps Script manzilini doskaga yozish | Ishlaydi, lekin guruhga berish noqulay |
| **Jadval nusxasi + veb-ilova + 6 belgili kod** | O‘qituvchi bir marta nusxa oladi va joylaydi. Keyin doskaga faqat kod yoziladi |

## Sayt egasi — bir marta

Quyidagilarni Google Cloud Console va Apps Script da o‘zingiz qilasiz. O‘qituvchilar buni qilmaydi.

### 1. OAuth mijoz identifikatori

1. [console.cloud.google.com](https://console.cloud.google.com) da loyiha oching (masalan, `elektronika-tdpi`).
2. **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - Ilova nomi: `Elektronika va signallarni qayta ishlash`.
   - Support email: o‘z Gmail ingiz.
   - Qo‘shimcha scope qo‘shmang. Google bilan kirish o‘zi `openid`, `email`, `profile` so‘raydi. Drive scope **kerak emas**.
   - Test holatida qolsangiz, faqat test userlar kira oladi. Talabalar uchun **Publish app** qiling.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized JavaScript origins** ga aynan shuni yozing (yo‘l qo‘shilmaydi):
     - `https://elektronika-tdpi.uz`
   - Lokal sinov uchun, agar kerak bo‘lsa: `http://localhost:8765` (Google `127.0.0.1` ni qabul qilmasligi mumkin).
   - Redirect URI shart emas: sayt Google Identity Services tugmasidan ID token oladi, server yo‘q.
4. Chiqqan **Client ID** ni nusxalang. U `....apps.googleusercontent.com` bilan tugaydi. Bu maxfiy emas.

### 2. `google-config.js`

`laboratoriya/google-config.js` faylida:

```javascript
window.ELAB_GOOGLE = {
  clientId: "SHU_YERGA_CLIENT_ID",
  registryUrl: "",
  templateUrl: ""
};
```

`clientId` ni qo‘ying va saytni yangilang (git push). Kalit, client secret yoki Drive tokenini yozmang. Client secret kerak ham emas.

### 3. Reestr (kod → manzil)

1. [sheets.google.com](https://sheets.google.com) da yangi jadval: `Elektronika reestri`.
2. **Kengaytmalar → Apps Script**.
3. `docs/registry-apps-script.gs` dagi butun kodni joylang.
4. `CONFIG.CLIENT_ID` ni 2-qadamdagi client ID bilan almashtiring.
5. Saqlang. **Deploy → New deployment → Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Ruxsatlarni tasdiqlang (jadvalni o‘qish/yozish).
6. Chiqqan URL `https://script.google.com/macros/s/....../exec` ko‘rinishida. Uni `registryUrl` ga yozing.

### 4. O‘qituvchi nusxa oladigan jadval

1. Yana bir jadval: `Elektronika jurnali (namuna)`.
2. **Kengaytmalar → Apps Script**, `docs/journal-apps-script.gs` kodini joylang, saqlang. Bu namunani veb-ilova qilib joylamang.
3. Jadvalni ulashing: **Har qanday havolaga ega odam — Ko‘ruvchi**.
4. Brauzer manzilidagi `/edit?...` qismini `/copy` qiling. Masalan: `https://docs.google.com/spreadsheets/d/JADVAL_ID/copy`
5. Shu havolani `templateUrl` ga yozing.

Shu bilan eganing ishi tugaydi.

## Har bir o‘qituvchi

1. Saytda laboratoriya parolini kiriting, so‘ng **Google bilan kirish**.
2. **Men o‘qituvchiman** ni tanlang.
3. **O‘qituvchi** panelini oching (standart parol `123456`, keyin o‘zgartiring). Jurnal ichida **Google Drive** kartasi bor.
4. **Jadval nusxasini olish** tugmasi namuna jadvalni ochadi. **Nusxa olish** ni bosing. Nusxa sizning Drive ingizda.
5. Nusxada: **Kengaytmalar → Apps Script → Deploy → New deployment → Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Google so‘rasa, jadvalga yozishga ruxsat bering. Bu ruxsat sizning hisobingizga, talabanikiga emas.
6. `.../exec` manzilini kartadagi maydonga qo‘ying va **Kodni olish** ni bosing.
7. Chiqqan 6 belgili kodni (masalan, `K7M2QP`) guruhga bering. Talaba natijalari shu jadvalning **Jurnal** varag‘iga tushadi.
8. **Google Drive dan yangilash** paneldagi jadvalni Drive dagi qatorlar bilan to‘ldiradi. PDF va CSV eksport avvalgidek shu paneldan.

**Yangi kod** eski kodni bekor qiladi: reestrdan o‘chadi, jadvaldagi yozuvlar qoladi. Talabalarga yangi kodni bering. Kodni olishni joylaganingizdan keyin darhol bosing, manzilni talabaga yubormang — talaba faqat 6 belgili kodni ko‘radi. Birinchi marta sizning Google hisobingiz shu jadvalning egasi bo‘lib yoziladi; boshqa hisob keyin kodni almashtira olmaydi.

## Talaba

1. **Google bilan kirish**.
2. Ism, familiya, kurs va guruh raqamini tanlang.
3. O‘qituvchi bergan 6 belgili kodni yozing.
4. Laboratoriyani bajaring. Test, o‘lchov, hisob va baho shu o‘qituvchining jurnaliga boradi va uning panelida ko‘rinadi.

Internet uzilsa, ish shu brauzerda davom etadi. Ulanish qaytganida natija qayta yuboriladi.

## Mehmon

**Mehmon sifatida davom etish**. Laboratoriya ishlaydi. Natija o‘qituvchi jurnaliga va lokal jurnalga yozilmaydi.

## Lokal sinov

Haqiqiy Google hisobisiz oqimni ko‘rish uchun manzil oxiriga `?googleMock=1` qo‘shiladi. Bu faqat shu brauzerning xotirasida soxta jadval ochadi va Google Drive ga tegmaydi. Darsda ishlatilmaydi. Sayt egasi client ID ni qo‘ymaguncha oddiy sahifada Google tugmasi o‘rniga sozlash eslatmasi chiqadi, mehmon rejimi esa ishlaydi.
