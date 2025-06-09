const sheetNames = [
  "DASHBOARD", "Daily over 8hr", "HSK Prod", "Schedule vs Projected",
  "Labor Variance", "MTD Hourly Emp", "Roster", "Last Week Hourly Emp",
  "Fct Variance", "CLHours_LastWeek", "CLHours_CurrentWeek",
  "LastWeek_Schedule", "CurrentWeek_Schedule", "NEW_Schedule",
  "LastWeek_Fct", "CurrentWeek_Fct", "NEW_Fct", "Last_Week Room Stat",
  "Current_Week Room STAT", "Last_Week Room Stat.", "Rooms Stats",
  "Labor Forecast", "Emails"
];

const sheetMenu = document.getElementById("sheetMenu");
const mainView = document.getElementById("mainView");

sheetNames.forEach(name => {
  const li = document.createElement("li");
  li.textContent = name;
  li.className = "cursor-pointer hover:underline";
  li.onclick = () => loadSheetView(name);
  sheetMenu.appendChild(li);
});

function loadSheetView(sheetName) {
  mainView.innerHTML = "";
  if (sheetName === "DASHBOARD") {
    mainView.innerHTML = getDashboardHTML();
    document.getElementById("csvUpload").addEventListener("change", handleFileUpload);
    loadDashboardData();
  } else {
    mainView.innerHTML = `
      <h1 class="text-2xl font-bold text-gray-800 mb-4">${sheetName}</h1>
      <p class="text-gray-600">This section will replicate the layout and logic of the "${sheetName}" sheet.</p>
    `;
  }
}

function getDashboardHTML() {
  return `
    <h1 class="text-2xl font-bold text-blue-800 mb-4">Labor Dashboard</h1>
    <div class="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded mb-4">
      <strong>IMPORTANT:</strong> Transfer Schedules, Fct & CL Hrs before using this tab.
    </div>

    <div class="grid grid-cols-2 gap-4 text-center font-semibold text-gray-700 mb-4">
      <div class="border p-4 bg-gray-50 rounded">Daily</div>
      <div class="border p-4 bg-gray-50 rounded">Weekly</div>
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="bg-gray-100 border rounded p-4">
        <h2 class="font-bold text-gray-700 mb-2">Last Week</h2>
        <p>From: <strong>May 19, 2025</strong></p>
        <p>To: <strong>May 25, 2025</strong></p>
      </div>
      <div class="bg-gray-100 border rounded p-4">
        <h2 class="font-bold text-gray-700 mb-2">Current Week</h2>
        <p>From: <strong>June 2, 2025</strong></p>
        <p>To: <strong>June 8, 2025</strong></p>
      </div>
      <div class="bg-gray-100 border rounded p-4">
        <h2 class="font-bold text-gray-700 mb-2">Forecast Week</h2>
        <p>From: <strong>June 2, 2025</strong></p>
        <p>To: <strong>June 8, 2025</strong></p>
      </div>
    </div>

    <div class="mb-4">
      <label for="csvUpload" class="font-semibold block mb-2">Upload CSV Report:</label>
      <input type="file" id="csvUpload" class="border rounded p-2 w-full">
    </div>

    <div class="overflow-auto">
      <table id="dataTable" class="w-full table-auto border-collapse border text-xs">
        <thead id="tableHead" class="bg-gray-200"></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  `;
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file || !file.name.endsWith(".csv")) {
    alert("Please upload a CSV file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const rows = e.target.result.trim().split("\n").map(r => r.split(","));
    renderTable(rows);
  };
  reader.readAsText(file);
}

function renderTable(data) {
  const head = document.getElementById("tableHead");
  const body = document.getElementById("tableBody");
  head.innerHTML = "";
  body.innerHTML = "";

  const headers = data[0];

  const headerRow = document.createElement("tr");
  headers.forEach(cell => {
    const th = document.createElement("th");
    th.textContent = cell;
    th.className = "border px-2 py-1 text-left bg-gray-100";
    headerRow.appendChild(th);
  });
  head.appendChild(headerRow);

  data.slice(1).forEach(async row => {
    const tr = document.createElement("tr");
    row.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      td.className = "border px-2 py-1";
      tr.appendChild(td);
    });
    body.appendChild(tr);

    // Save to Firestore
    if (window.firestoreDb) {
      const entry = {};
      headers.forEach((key, i) => {
        entry[key.trim()] = row[i]?.trim() ?? "";
      });
      try {
        await window.firestoreAdd(window.firestoreCol(window.firestoreDb, "uploads"), entry);
      } catch (err) {
        console.error("Firestore save failed:", err);
      }
    }
  });
}

async function loadDashboardData() {
  const head = document.getElementById("tableHead");
  const body = document.getElementById("tableBody");
  head.innerHTML = "";
  body.innerHTML = "";

  if (!window.firestoreDb) return;

  try {
    const snapshot = await window.firestoreGet(window.firestoreCol(window.firestoreDb, "uploads"));
    const rows = [];
    snapshot.forEach(doc => rows.push(doc.data()));

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const headerRow = document.createElement("tr");
    headers.forEach(key => {
      const th = document.createElement("th");
      th.textContent = key;
      th.className = "border px-2 py-1 text-left bg-gray-100";
      headerRow.appendChild(th);
    });
    head.appendChild(headerRow);

    rows.forEach(row => {
      const tr = document.createElement("tr");
      headers.forEach(key => {
        const td = document.createElement("td");
        td.textContent = row[key];
        td.className = "border px-2 py-1";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

  } catch (err) {
    console.error("Error loading from Firestore:", err);
  }
}

loadSheetView("DASHBOARD");

