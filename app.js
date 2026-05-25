const number = new Intl.NumberFormat("zh-TW");
const currency = {
  format(value) {
    return `NT$${number.format(Math.round(value || 0))}`;
  },
};
const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

const appData = window.ETF_DASHBOARD_DATA || {};
const appConfig = window.ETF_DASHBOARD_CONFIG || {};
const defaultHoldings = appData.holdings || [];
const storedHoldings = loadStoredHoldings();
let holdings = storedHoldings || defaultHoldings.map((item) => ({ ...item }));
let usingStoredHoldings = Boolean(storedHoldings);
const activeEtfs = appData.activeEtfs || [];

const state = {
  targetIncome: 30000,
  monthlyBudget: 30000,
  strategyMode: "balanced",
  activeFilter: "all",
};

const els = {
  targetIncome: document.querySelector("#targetIncome"),
  targetIncomeLabel: document.querySelector("#targetIncomeLabel"),
  monthlyBudget: document.querySelector("#monthlyBudget"),
  strategyMode: document.querySelector("#strategyMode"),
  refreshQuotes: document.querySelector("#refreshQuotes"),
  quoteStatus: document.querySelector("#quoteStatus"),
  clock: document.querySelector("#clock"),
  monthlyIncome: document.querySelector("#monthlyIncome"),
  annualIncome: document.querySelector("#annualIncome"),
  portfolioValue: document.querySelector("#portfolioValue"),
  incomeGap: document.querySelector("#incomeGap"),
  yieldNow: document.querySelector("#yieldNow"),
  weakMonth: document.querySelector("#weakMonth"),
  weakMonthGap: document.querySelector("#weakMonthGap"),
  cashflowNote: document.querySelector("#cashflowNote"),
  monthBars: document.querySelector("#monthBars"),
  holdingRows: document.querySelector("#holdingRows"),
  planModeLabel: document.querySelector("#planModeLabel"),
  planList: document.querySelector("#planList"),
  activeEtfRows: document.querySelector("#activeEtfRows"),
  correctionRows: document.querySelector("#correctionRows"),
  holdingsJson: document.querySelector("#holdingsJson"),
  saveHoldings: document.querySelector("#saveHoldings"),
  resetHoldings: document.querySelector("#resetHoldings"),
  exportHoldings: document.querySelector("#exportHoldings"),
  holdingsDataStatus: document.querySelector("#holdingsDataStatus"),
  lastUpdated: document.querySelector("#lastUpdated"),
};

function loadStoredHoldings() {
  try {
    const raw = localStorage.getItem("etf-dashboard-holdings");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistHoldings(nextHoldings) {
  localStorage.setItem("etf-dashboard-holdings", JSON.stringify(nextHoldings, null, 2));
}

function sharesOf(item) {
  return item.lots * 1000 + item.odd + item.marginLots * 1000;
}

function annualDividend(item) {
  return sharesOf(item) * item.price * item.yield;
}

function monthIncome() {
  const monthly = Array(12).fill(0);
  holdings.forEach((item) => {
    if (!item.payMonths.length) return;
    const eachPayment = annualDividend(item) / item.payMonths.length;
    item.payMonths.forEach((month) => {
      monthly[month - 1] += eachPayment;
    });
  });
  return monthly;
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderSummary() {
  const annual = holdings.reduce((sum, item) => sum + annualDividend(item), 0);
  const value = holdings.reduce((sum, item) => sum + sharesOf(item) * item.price, 0);
  const monthlyAverage = annual / 12;
  const gap = Math.max(0, state.targetIncome - monthlyAverage);
  const monthly = monthIncome();
  const weakest = monthly.reduce((minIndex, value, index, list) => (value < list[minIndex] ? index : minIndex), 0);

  els.monthlyIncome.textContent = currency.format(monthlyAverage);
  els.annualIncome.textContent = currency.format(annual);
  els.portfolioValue.textContent = currency.format(value);
  els.incomeGap.textContent = gap ? `缺口 ${currency.format(gap)}` : "已達標";
  els.yieldNow.textContent = `整體殖利率 ${formatPct(value ? annual / value : 0)}`;
  els.weakMonth.textContent = monthNames[weakest];
  els.weakMonthGap.textContent = `該月約 ${currency.format(monthly[weakest])}`;
  els.cashflowNote.textContent = `目標 ${currency.format(state.targetIncome)} / 月`;
}

function renderMonthBars() {
  const monthly = monthIncome();
  const maxValue = Math.max(state.targetIncome, ...monthly);
  els.monthBars.innerHTML = monthly
    .map((value, index) => {
      const percent = Math.max(4, Math.round((value / maxValue) * 100));
      const className = value < state.targetIncome * 0.55 ? "weak" : value >= state.targetIncome ? "good" : "";
      return `
        <article class="month-card ${className}">
          <span>${monthNames[index]}</span>
          <div class="bar-track"><div class="bar-fill" style="height:${percent}%"></div></div>
          <strong>${currency.format(value)}</strong>
          <small>${value >= state.targetIncome ? "達標" : `差 ${currency.format(state.targetIncome - value)}`}</small>
        </article>
      `;
    })
    .join("");
}

function renderHoldings() {
  els.holdingRows.innerHTML = holdings
    .map((item) => `
      <tr>
        <td class="symbol">${item.symbol}</td>
        <td>${item.name}</td>
        <td>${number.format(sharesOf(item))}</td>
        <td><input data-field="price" data-symbol="${item.symbol}" type="number" step="0.01" value="${item.price.toFixed(2)}" /></td>
        <td><input data-field="yield" data-symbol="${item.symbol}" type="number" step="0.1" value="${(item.yield * 100).toFixed(1)}" /></td>
        <td>${item.payMonths.length ? item.payMonths.map((month) => monthNames[month - 1]).join(" ") : "不配"}</td>
        <td>${currency.format(annualDividend(item))}</td>
      </tr>
    `)
    .join("");
}

function renderCorrections() {
  if (els.holdingsJson && document.activeElement !== els.holdingsJson) {
    els.holdingsJson.value = JSON.stringify(holdings, null, 2);
  }
  if (els.holdingsDataStatus) {
    els.holdingsDataStatus.textContent = usingStoredHoldings ? "使用此瀏覽器的私人資料" : "使用公開範例或本機資料檔";
  }
  els.correctionRows.innerHTML = holdings
    .map((item) => `
      <tr>
        <td class="symbol">${item.symbol}</td>
        <td>${number.format(item.lots)}</td>
        <td>${number.format(item.odd)}</td>
        <td>${number.format(item.marginLots)}</td>
        <td><strong>${number.format(sharesOf(item))}</strong></td>
      </tr>
    `)
    .join("");
}

function planWeights() {
  if (state.strategyMode === "income") return { "00919": 0.32, "00929": 0.26, "00878": 0.22, "00937B": 0.1, "006208": 0.1 };
  if (state.strategyMode === "growth") return { "006208": 0.34, "0050": 0.22, "0052": 0.18, "00929": 0.14, "00878": 0.12 };
  return { "00919": 0.22, "00929": 0.2, "00878": 0.18, "006208": 0.18, "0050": 0.12, "00937B": 0.1 };
}

function renderPlan() {
  const weights = planWeights();
  const labels = { balanced: "均衡", income: "月配優先", growth: "成長優先" };
  els.planModeLabel.textContent = `${labels[state.strategyMode]} / 每月 ${currency.format(state.monthlyBudget)}`;

  els.planList.innerHTML = Object.entries(weights)
    .map(([symbol, weight]) => {
      const item = holdings.find((holding) => holding.symbol === symbol);
      const spend = state.monthlyBudget * weight;
      const shares = item ? Math.floor(spend / item.price) : 0;
      const annualAdd = item ? shares * item.price * item.yield : 0;
      const progress = Math.min(100, (annualAdd / 12 / Math.max(1, state.targetIncome)) * 100);
      return `
        <article class="plan-item">
          <span class="symbol">${symbol}</span>
          <h3>${item?.name || ""}</h3>
          <strong>${number.format(shares)} 股</strong>
          <span>預算 ${currency.format(spend)}</span>
          <progress max="100" value="${progress}"></progress>
          <small>月均配息增加約 ${currency.format(annualAdd / 12)}</small>
        </article>
      `;
    })
    .join("");
}

function activeEtfClass(item) {
  const classes = [];
  if (item.payout === "月配") classes.push("monthly");
  if (item.overseas) classes.push("overseas");
  if (!item.daysListed || item.daysListed <= 45) classes.push("new");
  return classes.join(" ");
}

function filteredActiveEtfs() {
  return activeEtfs.filter((item) => {
    if (state.activeFilter === "monthly") return item.payout === "月配";
    if (state.activeFilter === "quarterly") return item.payout === "季配";
    if (state.activeFilter === "overseas") return item.overseas;
    if (state.activeFilter === "new") return !item.daysListed || item.daysListed <= 45;
    return true;
  });
}

function renderActiveEtfs() {
  els.activeEtfRows.innerHTML = filteredActiveEtfs()
    .map((item) => `
      <article class="etf-row ${activeEtfClass(item)}">
        <span class="symbol">${item.symbol}</span>
        <div>
          <strong>${item.name}</strong>
          <div>${item.issuer} / ${item.listingDate}</div>
        </div>
        <span class="badge">${item.payout}</span>
        <span>${item.daysListed ? `${item.daysListed} 天` : "新品"}</span>
        <span>${item.overseas ? "海外" : "台股"}</span>
      </article>
    `)
    .join("");
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#${tab.dataset.view}`).classList.add("active");
    });
  });
}

function bindFilters() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      state.activeFilter = chip.dataset.filter;
      renderActiveEtfs();
    });
  });
}

function bindInputs() {
  els.targetIncome.addEventListener("input", () => {
    state.targetIncome = Number(els.targetIncome.value);
    els.targetIncomeLabel.textContent = currency.format(state.targetIncome);
    renderAll();
  });

  els.monthlyBudget.addEventListener("input", () => {
    state.monthlyBudget = Number(els.monthlyBudget.value || 0);
    renderPlan();
  });

  els.strategyMode.addEventListener("change", () => {
    state.strategyMode = els.strategyMode.value;
    renderPlan();
  });

  els.holdingRows.addEventListener("input", (event) => {
    const input = event.target;
    const item = holdings.find((holding) => holding.symbol === input.dataset.symbol);
    if (!item) return;
    if (input.dataset.field === "price") item.price = Number(input.value || 0);
    if (input.dataset.field === "yield") item.yield = Number(input.value || 0) / 100;
    renderSummary();
    renderMonthBars();
    renderPlan();
  });

  els.refreshQuotes.addEventListener("click", refreshQuotes);

  els.saveHoldings?.addEventListener("click", () => {
    try {
      const nextHoldings = JSON.parse(els.holdingsJson.value);
      if (!Array.isArray(nextHoldings)) throw new Error("資料必須是陣列");
      holdings = nextHoldings;
      persistHoldings(nextHoldings);
      usingStoredHoldings = true;
      els.holdingsDataStatus.textContent = "已儲存在此瀏覽器";
      renderAll();
      refreshQuotes();
    } catch (error) {
      els.holdingsDataStatus.textContent = `JSON 格式錯誤：${error.message}`;
    }
  });

  els.resetHoldings?.addEventListener("click", () => {
    localStorage.removeItem("etf-dashboard-holdings");
    holdings = defaultHoldings.map((item) => ({ ...item }));
    usingStoredHoldings = false;
    els.holdingsDataStatus.textContent = "已還原公開範例";
    renderAll();
    refreshQuotes();
  });

  els.exportHoldings?.addEventListener("click", async () => {
    const text = JSON.stringify(holdings, null, 2);
    els.holdingsJson.value = text;
    try {
      await navigator.clipboard.writeText(text);
      els.holdingsDataStatus.textContent = "已複製目前資料";
    } catch {
      els.holdingsDataStatus.textContent = "已顯示目前資料，可手動複製";
    }
  });
}

async function refreshQuotes() {
  const symbols = holdings.map((item) => item.symbol).join(",");
  els.quoteStatus.textContent = "更新中";
  try {
    const quoteApiBase = (appConfig.quoteApiBase || "").replace(/\/$/, "");
    const response = await fetch(`${quoteApiBase}/api/quotes?symbols=${encodeURIComponent(symbols)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const quoteMap = new Map((data.msgArray || []).map((quote) => [quote.c, quote]));
    holdings.forEach((item) => {
      const quote = quoteMap.get(item.symbol);
      const price = Number(quote?.z);
      if (Number.isFinite(price) && price > 0) item.price = price;
    });
    const now = new Date();
    els.quoteStatus.textContent = "行情已更新";
    els.lastUpdated.textContent = `更新 ${now.toLocaleString("zh-TW", { hour12: false })}`;
    renderAll();
  } catch (error) {
    els.quoteStatus.textContent = "行情更新失敗";
    els.lastUpdated.textContent = "使用內建估算價格";
  }
}

function tickClock() {
  els.clock.textContent = new Date().toLocaleTimeString("zh-TW", { hour12: false });
}

function renderAll() {
  renderSummary();
  renderMonthBars();
  renderHoldings();
  renderCorrections();
  renderPlan();
  renderActiveEtfs();
}

bindTabs();
bindFilters();
bindInputs();
renderAll();
tickClock();
setInterval(tickClock, 1000);
refreshQuotes();
