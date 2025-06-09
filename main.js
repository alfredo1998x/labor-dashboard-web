const sheetNames = ["DASHBOARD", "Daily over 8hr"];

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

function getMonday(date) {
  const d = new Date(date);
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
    weekPicker.value = getMonday(new Date());
    loadDailyOver8hrTable(weekPicker.value);
    weekPicker.onchange = () => loadDailyOver8hrTable(weekPicker.value);
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
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const raw = {};
    headers.forEach((h, j) => raw[h] = row[j]?.trim());

    if (!raw["Business Date"] || !raw["Number"] || !raw["Hours"]) continue;

    const name = raw["First Name"]
      ? `${raw["Last Name"] ?? ""} ${raw["First Name"] ?? ""}`.trim()
      : raw["Last Name"] ?? "Unknown";

    const entry = {
      Date: raw["Business Date"].split(" ")[0],
      EmployeeID: raw["Number"],
      Name: name,
      Hours: raw["Hours"],
      Position: raw["Job"] ?? "",
      Department: raw["Department"] ?? ""
    };

    try {
      const docRef = window.firestoreCol(window.firestoreDb, "uploads");
      await window.firestoreAdd(docRef, entry);
    } catch (err) {
      console.error("Upload failed", err);
    }
  }

  alert("Upload complete.");
}

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

async function loadDailyOver8hrTable(mondayStr) {
  mainView.innerHTML = "";
  const dates = getWeekDates(mondayStr);
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const snapshot = await window.firestoreGet(window.firestoreCol(window.firestoreDb, "uploads"));
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  const weekData = records.filter(r => dates.includes(r.Date));
  const employees = {};

  weekData.forEach(r => {
    const id = r.EmployeeID;
    if (!employees[id]) {
      employees[id] = {
        name: r.Name,
        department: r.Department,
        position: r.Position,
        daily: {}
      };
    }
    employees[id].daily[r.Date] = parseFloat(r.Hours || 0);
  });

  const table = document.createElement("table");
  table.className = "w-full table-auto text-xs border border-collapse";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  [
    "ID", "Name", "Position", "Department",
    ...weekdayNames,
    "Total", "Days", "Projected", "OT", "Risk", "Risk %", "OT Display"
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
    const projectedOT = Math.max(0, projected - 40);

    let risk = "No Risk", riskPct = "0%", otText = "";
    if (actualOT > 0) {
      risk = "Overtime";
      riskPct = "100%";
      otText = `${actualOT.toFixed(2)} hr OT`;
    } else if (projectedOT > 0) {
      risk = "At Risk";
      riskPct = `${Math.round((days / 5) * 100)}%`;
      otText = `${projectedOT.toFixed(2)} hr OT`;
    }

    const rowData = [
      id, emp.name, emp.position, emp.department,
      ...daily.map(h => h.toFixed(2)),
      total.toFixed(2),
      days,
      projected.toFixed(2),
      actualOT.toFixed(2),
      risk,
      riskPct,
      otText
    ];

    rowData.forEach((val, i) => {
      const td = document.createElement("td");
      td.textContent = val;
      td.className = "border px-2 py-1 text-center";
      if (i === 11) {
        td.style.backgroundColor =
          risk === "Overtime" ? "#f87171" :
          risk === "At Risk" ? "#facc15" :
          "#d1fae5";
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  mainView.innerHTML = "";
  mainView.appendChild(table);
}

loadSheetView("DASHBOARD");
