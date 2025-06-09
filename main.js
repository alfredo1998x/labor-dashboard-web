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
    syncToFirestore(rows);
  };
  reader.readAsText(file);
}

async function syncToFirestore(data) {
  if (!window.firestoreDb) return console.error("Firestore is not available.");

  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const entry = {};
    headers.forEach((h, idx) => {
      entry[h.trim()] = row[idx]?.trim() ?? "";
    });

    // You MUST customize these field names if different
    const keyFields = [entry["Date"], entry["EmployeeID"], entry["Department"]];
    if (keyFields.includes(undefined)) {
      console.warn("Skipping row: missing required key fields", entry);
      continue;
    }

    const docId = keyFields.join("_");

    const docRef = window.firestoreCol(window.firestoreDb, "uploads");
    const docPath = `${docRef.path}/${docId}`;

    try {
      const docSnapshot = await window.firestoreGet(window.firestoreCol(window.firestoreDb, "uploads"));
      let matchFound = false;

      docSnapshot.forEach(async doc => {
        if (doc.id === docId) {
          matchFound = true;
          const existing = doc.data();
          const hasChanges = Object.keys(entry).some(key => entry[key] !== existing[key]);
          if (hasChanges) {
            await window.firestoreAdd(window.firestoreCol(window.firestoreDb, "uploads"), entry); // Overwrite
            console.log("Updated:", docId);
          } else {
            console.log("No changes for:", docId);
          }
        }
      });

      if (!matchFound) {
        await window.firestoreAdd(window.firestoreCol(window.firestoreDb, "uploads"), entry);
        console.log("Added new:", docId);
      }

    } catch (err) {
      console.error("Error syncing Firestore:", err);
    }
  }

  alert("Upload complete. Data saved to Firestore.");
}

loadSheetView("DASHBOARD");
