# 第三方來源

本專案的 MIT 授權不取代第三方資源各自的授權。

- Sites Vite plugin：授權全文見 `build/sites-vite-plugin.LICENSE`。
- shadcn Tailwind 樣式：授權全文見 `vendor/shadcn-tailwind-4.13.0.LICENSE.md`。
- npm 套件：版本鎖定於 `package-lock.json`；安裝後的套件目錄提供各自授權。
- Tesseract.js 與核心：建置時由 `scripts/prepare-ocr.mjs` 複製其授權檔至 `public/ocr/`。
- OCR 語言模型：來源 URL 與 SHA-256 見 `public/ocr/languages.json`。對應套件為 `@tesseract.js-data/chi_tra` 與 `@tesseract.js-data/eng`；上游授權全文保存在 `public/ocr/LICENSE-tessdata.txt`，來源為 https://github.com/naptha/tessdata/blob/gh-pages/LICENSE。
- 外部食譜與推薦內容不屬於本模板授權。使用者匯入內容時應自行確認使用權限。

