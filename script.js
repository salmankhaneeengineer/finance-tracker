/* --------------------------------------------------------------
   Finance‑Tracker front‑end (runs on GitHub Pages)
   -------------------------------------------------------------- */

/* ---- 1️⃣  UPDATE THIS WITH YOUR DEPLOYED URL ---- */
const API_URL = 'https://script.google.com/macros/s/1RuZe1do44nQq5c4IU8ZWFpe3hGxX2MKCgnsCL3F75we7me8krW2E3mSi/exec';
/* -------------------------------------------------- */

async function fetchJSON(url, options = {}) {
  const resp = await fetch(url, { cache: 'no-store', ...options });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${txt}`);
  }
  return resp.json();
}

/* --------------------- LOAD ALL ROWS --------------------- */
async function loadTransactions() {
  try {
    const data = await fetchJSON(API_URL);
    renderData(data);
  } catch (err) {
    console.error(err);
    document.getElementById('formStatus').textContent = '❗ Could not load data.';
  }
}

/* --------------------- RENDER TABLE & SUMMARI­ES --------------------- */
let expenseChart = null;
function renderData(transactions) {
  const tbody = document.querySelector('#txnTable tbody');
  tbody.innerHTML = '';

  let totalIncome = 0, totalExpense = 0;
  const expenseByCat = {};

  transactions.forEach(tx => {
    const tr = document.createElement('tr');
    const dateStr = tx.date || new Date(tx.timestamp).toISOString().slice(0,10);
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${tx.type}</td>
      <td>${tx.category}</td>
      <td>${tx.description || ''}</td>
      <td>${Number(tx.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    `;
    tbody.appendChild(tr);

    const amt = Number(tx.amount);
    if (tx.type.toLowerCase() === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      const cat = tx.category || 'Other';
      expenseByCat[cat] = (expenseByCat[cat] || 0) + amt;
    }
  });

  const balance = totalIncome - totalExpense;
  document.getElementById('totalIncome').textContent = `Income: $${totalIncome.toFixed(2)}`;
  document.getElementById('totalExpense').textContent = `Expense: $${totalExpense.toFixed(2)}`;
  document.getElementById('balance').textContent = `Balance: $${balance.toFixed(2)}`;

  // ------- PIE CHART (expenses by category) -------
  const ctx = document.getElementById('expenseChart').getContext('2d');
  const labels = Object.keys(expenseByCat);
  const values = Object.values(expenseByCat);

  if (expenseChart) {
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = values;
    expenseChart.update();
  } else {
    expenseChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#2563eb','#22c55e','#ef4444','#f59e0b',
            '#8b5cf6','#10b981','#d946ef','#0ea5e9',
            '#f97316','#6366f1'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: $${ctx.parsed.toLocaleString(undefined,{minimumFractionDigits:2})}`
            }
          }
        }
      }
    });
  }
}

/* --------------------- SUBMIT NEW TRANSACTION --------------------- */
document.getElementById('txnForm').addEventListener('submit', async e => {
  e.preventDefault();
  const status = document.getElementById('formStatus');
  status.textContent = '⏳ Saving…';

  const fd = new FormData(e.target);
  const payload = {
    date: fd.get('date'),
    type: fd.get('type'),
    category: fd.get('category').trim(),
    description: fd.get('description').trim(),
    amount: parseFloat(fd.get('amount'))
  };

  try {
    const result = await fetchJSON(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (result.ok) {
      status.textContent = '✅ Saved!';
      e.target.reset();
      await loadTransactions();   // refresh table + summary + chart
    } else {
      status.textContent = `❌ ${result.error || 'Failed'}`;
    }
  } catch (err) {
    console.error(err);
    status.textContent = `❌ ${err.message}`;
  }
});

/* --------------------- INITIAL LOAD --------------------- */
document.addEventListener('DOMContentLoaded', loadTransactions);
