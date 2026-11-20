const STORAGE_KEY = "kakeiboEntries";
const yenFormatter = new Intl.NumberFormat("ja-JP");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".entry-section form");
  const dateInput = document.querySelector("#entry-date");
  const itemInput = document.querySelector("#entry-item");
  const typeInput = document.querySelector("#entry-type");
  const amountInput = document.querySelector("#entry-amount");
  const tableBody = document.querySelector(".list-section tbody");
  const totalOutput = document.querySelector(".summary-section output");

  if (
    !(form instanceof HTMLFormElement) ||
    !(dateInput instanceof HTMLInputElement) ||
    !(itemInput instanceof HTMLInputElement) ||
    !(typeInput instanceof HTMLSelectElement) ||
    !(amountInput instanceof HTMLInputElement) ||
    !(tableBody instanceof HTMLTableSectionElement) ||
    !(totalOutput instanceof HTMLOutputElement)
  ) {
    throw new Error("家計簿の画面要素が見つかりません。");
  }

  let entries;

  try {
    entries = loadEntries();
  } catch (error) {
    console.error("家計簿データを読み込めませんでした。", error);
    window.alert(
      "保存データを読み込めませんでした。データが壊れているか、ブラウザーの保存領域を利用できません。"
    );
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  dateInput.value = getToday();
  renderEntries(entries, tableBody, totalOutput);

  itemInput.addEventListener("invalid", () => {
    if (!itemInput.value.trim()) {
      itemInput.setCustomValidity("品目を入力してください。");
    }
  });

  amountInput.addEventListener("invalid", () => {
    amountInput.setCustomValidity(
      "金額は1以上の整数（安全に扱える範囲）で入力してください。"
    );
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const item = itemInput.value.trim();
    const amount = Number(amountInput.value);

    if (!item) {
      itemInput.setCustomValidity("品目を入力してください。");
      itemInput.reportValidity();
      return;
    }

    itemInput.setCustomValidity("");

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      amountInput.setCustomValidity(
        "金額は1以上の整数（安全に扱える範囲）で入力してください。"
      );
      amountInput.reportValidity();
      return;
    }

    amountInput.setCustomValidity("");

    const newEntry = {
      date: dateInput.value,
      item,
      type: typeInput.value,
      amount,
    };

    if (!isEntry(newEntry)) {
      window.alert("入力内容を確認してください。");
      return;
    }

    const updatedEntries = [...entries, newEntry];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
    } catch (error) {
      console.error("家計簿データを保存できませんでした。", error);
      window.alert("データを保存できませんでした。ブラウザーの保存領域を確認してください。");
      return;
    }

    entries = updatedEntries;
    renderEntries(entries, tableBody, totalOutput);
    form.reset();
    dateInput.value = getToday();
  });

  itemInput.addEventListener("input", () => itemInput.setCustomValidity(""));
  amountInput.addEventListener("input", () => amountInput.setCustomValidity(""));
});

function loadEntries() {
  const storedData = localStorage.getItem(STORAGE_KEY);

  if (storedData === null) {
    return [];
  }

  const parsedData = JSON.parse(storedData);

  if (!Array.isArray(parsedData) || !parsedData.every(isEntry)) {
    throw new Error("保存データの形式が正しくありません。");
  }

  return parsedData;
}

function isEntry(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.item === "string" &&
    value.item.trim().length > 0 &&
    (value.type === "income" || value.type === "expense") &&
    Number.isSafeInteger(value.amount) &&
    value.amount > 0
  );
}

function renderEntries(entries, tableBody, totalOutput) {
  tableBody.replaceChildren();

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "登録データはありません。";
    row.append(cell);
    tableBody.append(row);
  } else {
    for (const entry of entries) {
      const row = document.createElement("tr");
      const values = [
        entry.date,
        entry.item,
        entry.type === "income" ? "収入" : "支出",
        yenFormatter.format(entry.amount),
      ];

      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }

      tableBody.append(row);
    }
  }

  const balance = entries.reduce(
    (total, entry) => total + (entry.type === "income" ? entry.amount : -entry.amount),
    0
  );
  totalOutput.textContent = yenFormatter.format(balance);
}

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
