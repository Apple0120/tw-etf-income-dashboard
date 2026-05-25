# ETF 月領作戰室

這是一個本機優先的台股 ETF 現金流儀表板，用來估算每月配息、試算買進張數，並觀察主動式 ETF 清單。

## 隱私設計

公開 repo 只放 `data.sample.js` 範例資料。個人真實持股請放在 `data.local.js`，這個檔案已經列入 `.gitignore`，不要上傳到 GitHub。

資料載入順序：

1. `data.sample.js`：公開範例資料。
2. `data.local.js`：你的本機私有資料，存在時會覆蓋範例資料。
3. `app.js`：只讀取 `window.ETF_DASHBOARD_DATA`，不硬寫個人持股。

## 本機使用

```powershell
node server.js
```

開啟：

```text
http://localhost:4173
```

如果你的 `node` 指令不能用，可以改用系統或 Codex runtime 裡的 Node.js 執行 `server.js`。

## 建立自己的私有持股

複製一份：

```powershell
Copy-Item data.sample.js data.local.js
```

然後只修改 `data.local.js` 裡的 `holdings`。欄位說明：

- `symbol`：ETF 代號。
- `name`：ETF 名稱。
- `lots`：集保張數。
- `odd`：零股股數。
- `marginLots`：融資張數。
- `price`：預設價格，開啟後會嘗試用 TWSE MIS 更新。
- `yield`：估計年殖利率，例如 `0.075` 代表 7.5%。
- `payMonths`：配息月份，例如 `[2, 5, 8, 11]`。
- `role`：分類，可用 `growth`、`income`、`bond`、`active`、`leveraged`。

總股數計算方式：

```text
集保張數 × 1000 + 零股股數 + 融資張數 × 1000
```

## 開源前檢查

```powershell
git status --short
git check-ignore data.local.js
```

確認：

- `data.local.js` 有被 ignore。
- `app.js` 沒有你的真實持股。
- commit 裡只包含 `data.sample.js` 範例資料。

## 發布給親友

### 方案 A：親友下載本機跑

1. 建一個 GitHub repo。
2. 上傳這個資料夾，但不要上傳 `data.local.js`。
3. 親友 clone 後執行 `node server.js`。
4. 親友各自複製 `data.sample.js` 成 `data.local.js`，填自己的持股。

### 方案 B：公開互動式網頁

這個方案讓親友直接開網址，不需要下載。

架構：

- GitHub Pages：放前端頁面。
- Cloudflare Worker：提供 `/api/quotes` 行情代理。
- 親友持股：存在各自瀏覽器的 `localStorage`，不會上傳到 GitHub 或伺服器。

#### 1. 部署 Cloudflare Worker

到 Cloudflare Workers 建立一個 Worker，把 `cloudflare-worker.js` 的內容貼上並部署。

部署後會得到類似：

```text
https://tw-etf-quotes.yourname.workers.dev
```

複製 `config.sample.js` 成 `config.local.js`，填入 Worker URL：

```js
window.ETF_DASHBOARD_CONFIG = {
  quoteApiBase: "https://tw-etf-quotes.yourname.workers.dev",
};
```

如果要讓 GitHub Pages 使用這個設定，請建立公開版設定檔，例如把 `config.sample.js` 直接改成 Worker URL 後再 commit。不要在 `config.local.js` 放任何秘密；Worker URL 本身可以公開。

#### 2. 發布 GitHub Pages

在 GitHub repo：

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. Source 選 `Deploy from a branch`
5. Branch 選 `main`
6. Folder 選 `/root`
7. Save

稍等後會得到：

```text
https://你的帳號.github.io/tw-etf-income-dashboard/
```

#### 3. 親友如何填自己的持股

親友開網頁後：

1. 進入「持股校正」。
2. 在「私人持股資料」貼上自己的 JSON。
3. 按「儲存在此瀏覽器」。

這份資料只存在親友自己的瀏覽器。換裝置或清除瀏覽資料後，需要重新貼一次。

## 注意

本工具是個人分析工具，不構成投資建議。TWSE MIS 行情可用性會受網路與資料來源限制；正式公開服務若要提供真正即時行情，需注意證交所行情授權規範。
