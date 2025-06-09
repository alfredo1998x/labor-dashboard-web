// Sheet names from your Excel workbook
const sheetNames = [
  "DASHBOARD", "Daily over 8hr", "HSK Prod", "Schedule vs Projected",
  "Labor Variance", "MTD Hourly Emp", "Roster", "Last Week Hourly Emp",
  "Fct Variance", "CLHours_LastWeek", "CLHours_CurrentWeek",
  "LastWeek_Schedule", "CurrentWeek_Schedule", "NEW_Schedule",
  "LastWeek_Fct", "CurrentWeek_Fct", "NEW_Fct", "Last_Week Room Stat",
  "Current_Week Room STAT", "Last_Week Room Stat.", "Rooms Stats",
  "Labor Forecast", "Emails"
];

// Build the sidebar menu
const sheetMenu = document.getElementById("sheetMenu");
const mainView = document.getElementById("mainView");

sheetNames.forEach(name => {
  const li = document.createElement("li");
  li.textContent = name;
  li.className = "cursor-pointer hover:underline";
  li.onclick = () => loadSheetView(name);
  sheetMenu.appendChild(li);
});

// Load view for selected sheet
function loadSheetView(sheetName) {
  mainView.innerHTML = ""; // Clear current view

  if (sheetName === "DASHBOARD") {
    mainView.innerHTML = getDashboardHTML();
  } else {
    mainView.innerHTML = `
      <h1 class="text-2xl font-bold text-gray-800 mb-4">${sheetName}</h1>
      <p class="text-gray-600">This section will replicate the layout and logic of the "${sheetName}" sheet.</p>
    `;
  }
}

// Dashboard placeholder layout
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

    <div class="grid grid-cols-3 gap-6">
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
  `;
}

// Load Dashboard by default on first load
loadSheetView("DASHBOARD");
