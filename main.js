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
const weekSelector = document.getElementById("weekSelectorContainer");
const weekPicker = document.getElementById("weekPicker");

sheetNames.forEach(name => {
  const li = document.createElement("li");
  li.textContent = name;
  li.className = "cursor-pointer hover:underline";
  li.onclick = () => loadSheetView(name);
  sheetMenu.appendChild(li);
});

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function loadSheetView(sheetName) {
  mainView.innerHTML = "";
  weekSelector.classList.add("hidden");

  if (sheetName === "DASHBOARD") {
    mainView.innerHTML = getDashboardHTML();
    document.getElementById("csvUpload").addEventListener("change", handleFileUpload);
  } else if (sheetName === "Daily over 8hr") {
    mainView.innerHTML = "<p class='text-gray-600 mb-4'>Loading data...</p>";
    weekSelector.classList.remove("hidden");

    const today = new Date();
    weekPicker.value = getMonday(today);
    loadDailyOTData(weekPicker.value);

    weekPicker.onchange = () => {
      loadDailyOTData(weekPicker.value);
    };
  } else {
    mainView.innerHTML = `<h1 class="text-2xl font-bold">${sheetName}</h1>`;
  }
}

function getDashboardHTML() {
  return `
    <h1 class="text-2xl font-bold text-blue-800 mb-4">Labor Dashboard</h1>
    <div class="mb-4">
      <label for="csvUpload" class="font-semibold block mb-2">Upload CSV Report:</label>
      <input type="file" id="csvUpload" class="border rounded p-2 w-full">
    </div>
    <p class="text-sm text-gray-600 italic">Data is stored in the cloud for calculations only. Not shown on screen.</p>
  `;
}

// ================== FIXED CSV UPLOAD + MAPPING ==================
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file || !file.name.endsWith(".csv")) {
    alert("Please upload a CSV file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const rows = e.target.result.trim().split("\n").map(r => r.split(","));
    normalizeAndUpload(rows);
  };
  reader.readAsText(file);
}

async function normalizeAndUpload(data) {
  const headers = data[0].map(h => h.trim());
  const colMap = {
    "Business Date": "Date",
    "Number": "EmployeeID",
    "Last Name": "LastName",
    "First Name": "FirstName",
    "Hours": "Hours",
    "Job": "Position",
    "Department": "Department"
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const raw = {};
    headers.forEach((h, j) => raw[h] = row[j]?.trim());

    if (!raw["Business Date"] || !raw["Number"] || !raw["Hours"]) continue;

    const entry = {
      Date: raw["Business Date"].split(" ")[0],
      EmployeeID: raw["Number"],
      Name: `${raw["Last Name"] ?? ""} ${raw["First Name"] ?? ""}`.trim(),
      Hours: raw["Hours"],
      Position: raw["Job"] ?? "",
      Department: raw["Department"] ?? ""
    };

    const key = `${entry.Date}_${entry.EmployeeID}_${entry.Department}`;
    const id = btoa(key);

    try {
      const docRef = window.firestoreCol(window.firestoreDb, "uploads");
      await window.firestoreAdd(docRef, entry);
    } catch (err) {
      console.error("Upload failed", err);
    }
  }

  alert("Upload complete and normalized.");
}

// ========== DAILY OVER 8HR VIEW ==========

function getWeekDates(start) {
  const dates = [];
  const base = new Date(start);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function loadDailyOTData(mondayStr) {
  mainView.innerHTML = "";
  const dates = getWeekDates(mondayStr);
  const snapshot = await window.firestoreGet(window.firestoreCol(window.firestoreDb, "uploads"));

  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  const weeklyData = records.filter(r => dates.includes(r.Date));

  const employees = {};
  weeklyData.forEach(r => {
    const id = r.EmployeeID;
    if (!employees[id]) {
      employees[id] = {
        name: r.Name,
        position: r.Position,
        department: r.Department,
        daily: {},
      };
    }
    employees[id].daily[r.Date] = parseFloat(r.Hours || 0);
  });

  const table = document.createElement("table");
  table.className = "w-full table-auto text-xs border border-collapse";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  [
    "ID", "Name", "Dept", ...dates.map(d => new Date(d).toDateString().split(" ")[0]),
    "Total", "Days", "Projected", "OT", "Risk", "Risk %"
  ].forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    th.className = "border px-2 py-1 bg-gray-100";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  Object.entries(employees).forEach(([id, emp]) => {
    const tr = document.createElement("tr");
    const daily = dates.map(d => emp.daily[d] || 0);
    const total = daily.reduce((a, b) => a + b, 0);
    const days = daily.filter(h => h > 0).length;
    const projected = total + (5 - days) * 8;
    const actualOT = Math.max(0, total - 40);
    const projOT = Math.max(0, projected - 40);

    let risk = "No Risk", riskPct = "0%";
    if (actualOT > 0) {
      risk = "Overtime";
      riskPct = "100%";
    } else if (projOT > 0) {
      risk = "At Risk";
      riskPct = `${Math.round((days / 5) * 100)}%`;
    }

    [
      id, emp.name, emp.department, ...daily.map(n => n.toFixed(2)),
      total.toFixed(2), days, projected.toFixed(2), actualOT.toFixed(2),
      risk, riskPct
    ].forEach((val, i) => {
      const td = document.createElement("td");
      td.textContent = val;
      td.className = "border px-2 py-1 text-center";
      if (i === 11) {
        td.style.backgroundColor =
          risk === "Overtime" ? "#f87171" :
          risk === "At Risk" ? "#facc15" : "#d1fae5";
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  mainView.appendChild(table);
}

loadSheetView("DASHBOARD");
