const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const studentForm = document.getElementById("studentForm");
const monthlyFeeGrid = document.getElementById("monthlyFeeGrid");
const totalFee = document.getElementById("totalFee");
const recordsBody = document.getElementById("recordsBody");
const summaryCount = document.getElementById("summaryCount");
const summaryPaid = document.getElementById("summaryPaid");
const summaryDue = document.getElementById("summaryDue");
const searchInput = document.getElementById("searchInput");
const applyBaseFee = document.getElementById("applyBaseFee");
const baseFeeInput = document.getElementById("baseFee");
const clearAllBtn = document.getElementById("clearAllBtn");
const cancelEditButton = document.getElementById("cancelEditButton");
const formHeader = document.getElementById("formHeader");
const submitButton = document.getElementById("submitButton");

const storageKey = "studentFeeRecords";
let records = [];
let editingRecordId = null;

function createMonthlyInputs() {
  monthlyFeeGrid.innerHTML = "";
  months.forEach((month, index) => {
    const field = document.createElement("div");
    field.className = "month-field";
    field.innerHTML = `
      <strong>${month}</strong>
      <input type="number" min="0" data-month="${index}" value="0" />
    `;
    monthlyFeeGrid.appendChild(field);
  });
}

function getMonthlyInputs() {
  return Array.from(monthlyFeeGrid.querySelectorAll("input[data-month]")).map((input) => ({
    month: parseInt(input.dataset.month, 10),
    amount: Number(input.value) || 0,
  }));
}

function calculateTotal() {
  const total = getMonthlyInputs().reduce((sum, item) => sum + item.amount, 0);
  totalFee.textContent = `₹${total.toLocaleString()}`;
  return total;
}

function loadRecords() {
  const raw = localStorage.getItem(storageKey);
  records = raw ? JSON.parse(raw) : [];
}

function saveRecords() {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function getStatus(paid, total) {
  if (paid >= total && total > 0) return "paid";
  if (paid > 0) return "partial";
  return "due";
}

function renderRecords(filter = "") {
  const normalizedFilter = filter.trim().toLowerCase();
  const visible = records.filter((record) => {
    return (
      record.name.toLowerCase().includes(normalizedFilter) ||
      record.className.toLowerCase().includes(normalizedFilter) ||
      record.rollNumber.toLowerCase().includes(normalizedFilter)
    );
  });

  if (!visible.length) {
    recordsBody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching records found.</td></tr>`;
    updateSummary();
    return;
  }

  recordsBody.innerHTML = visible
    .map((record) => {
      const total = record.months.reduce((sum, month) => sum + month.amount, 0);
      const paid = record.months.filter((month) => month.amount > 0).length;
      const dueAmount = total - record.months.reduce((sum, month) => sum + month.amount, 0);
      const status = getStatus(paid, months.length);
      return `
      <tr>
        <td>${record.name}</td>
        <td>${record.className || "—"}</td>
        <td>${record.rollNumber || "—"}</td>
        <td>${paid} / ${months.length}</td>
        <td>₹${dueAmount.toLocaleString()}</td>
        <td><span class="badge ${status}">${status}</span></td>
        <td>
          <button class="action-btn" data-action="edit" data-id="${record.id}">Edit</button>
          <button class="action-btn" data-action="delete" data-id="${record.id}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");

  updateSummary();
}

function updateSummary() {
  const totalStudents = records.length;
  const paidMonths = records.reduce((sum, record) => sum + record.months.filter((month) => month.amount > 0).length, 0);
  const totalDue = records.reduce(
    (sum, record) => sum + record.months.reduce((sub, month) => sub + month.amount, 0),
    0
  );

  summaryCount.textContent = totalStudents;
  summaryPaid.textContent = `${paidMonths}`;
  summaryDue.textContent = `₹${totalDue.toLocaleString()}`;
}

function generateId() {
  return `stud_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function resetForm() {
  studentForm.reset();
  baseFeeInput.value = "";
  monthlyFeeGrid.querySelectorAll("input").forEach((input) => {
    input.value = 0;
  });
  editingRecordId = null;
  formHeader.textContent = "New student & monthly fees";
  submitButton.textContent = "Save student record";
  cancelEditButton.classList.add("hidden");
  calculateTotal();
}

function populateForm(record) {
  document.getElementById("studentName").value = record.name;
  document.getElementById("studentClass").value = record.className || "";
  document.getElementById("rollNumber").value = record.rollNumber || "";
  document.getElementById("studentPhone").value = record.phone || "";
  document.getElementById("studentEmail").value = record.email || "";
  document.getElementById("admissionDate").value = record.admissionDate || "";
  baseFeeInput.value = "";
  monthlyFeeGrid.querySelectorAll("input[data-month]").forEach((input) => {
    const monthData = record.months.find((item) => item.month === Number(input.dataset.month));
    input.value = monthData ? monthData.amount : 0;
  });
  cancelEditButton.classList.remove("hidden");
  calculateTotal();
}

function createRecordFromForm(existingId = null) {
  const name = document.getElementById("studentName").value.trim();
  const className = document.getElementById("studentClass").value.trim();
  const rollNumber = document.getElementById("rollNumber").value.trim();
  const phone = document.getElementById("studentPhone").value.trim();
  const email = document.getElementById("studentEmail").value.trim();
  const admissionDate = document.getElementById("admissionDate").value;
  const monthsData = getMonthlyInputs();
  const total = monthsData.reduce((sum, item) => sum + item.amount, 0);

  if (!name) {
    alert("Please enter the student name.");
    return null;
  }

  return {
    id: existingId || generateId(),
    name,
    className,
    rollNumber,
    phone,
    email,
    admissionDate,
    totalFee: total,
    months: monthsData,
    createdAt: existingId ? records.find((record) => record.id === existingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
  };
}

function registerEvents() {
  studentForm.addEventListener("input", (event) => {
    if (event.target.matches("input[data-month]")) {
      calculateTotal();
    }
  });

  studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const newRecord = createRecordFromForm(editingRecordId);
    if (!newRecord) return;

    if (editingRecordId) {
      const index = records.findIndex((record) => record.id === editingRecordId);
      if (index >= 0) {
        records[index] = newRecord;
      }
    } else {
      records.unshift(newRecord);
    }

    saveRecords();
    renderRecords(searchInput.value);
    resetForm();
  });

  searchInput.addEventListener("input", () => {
    renderRecords(searchInput.value);
  });

  applyBaseFee.addEventListener("click", () => {
    const baseValue = Number(baseFeeInput.value) || 0;
    monthlyFeeGrid.querySelectorAll("input").forEach((input) => {
      input.value = baseValue;
    });
    calculateTotal();
  });

  recordsBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action][data-id]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "delete") {
      records = records.filter((record) => record.id !== id);
      saveRecords();
      renderRecords(searchInput.value);
      if (editingRecordId === id) {
        resetForm();
      }
      return;
    }

    if (action === "edit") {
      const record = records.find((item) => item.id === id);
      if (!record) return;
      editingRecordId = id;
      formHeader.textContent = "Edit student record";
      submitButton.textContent = "Update record";
      populateForm(record);
    }
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Clear every saved record? This cannot be undone.")) return;
    records = [];
    saveRecords();
    renderRecords();
    resetForm();
  });

  cancelEditButton.addEventListener("click", () => {
    resetForm();
  });
}

function initializeApp() {
  createMonthlyInputs();
  loadRecords();
  renderRecords();
  calculateTotal();
  registerEvents();
}

initializeApp();
