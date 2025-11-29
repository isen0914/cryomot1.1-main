// Global variable to track history refresh interval
let historyRefreshInterval = null;

function switchTab(tabName) {
  const sections = document.querySelectorAll('.section');
  sections.forEach((section) => section.classList.remove('active'));

  // Update active state for both desktop and mobile nav buttons
  const allButtons = document.querySelectorAll('.nav-btn');
  allButtons.forEach((btn) => btn.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  
  // Find and activate the corresponding buttons in both desktop and mobile nav
  const desktopButtons = document.querySelectorAll('#desktop-nav .nav-btn');
  const mobileButtons = document.querySelectorAll('.mobile-nav .nav-btn');
  
  desktopButtons.forEach((btn, index) => {
    if (btn.onclick && btn.onclick.toString().includes(`'${tabName}'`)) {
      btn.classList.add('active');
    }
  });
  
  mobileButtons.forEach((btn, index) => {
    if (btn.onclick && btn.onclick.toString().includes(`'${tabName}'`)) {
      btn.classList.add('active');
    }
  });

  // Handle history tab - fetch and start auto-refresh
  if (tabName === 'history') {
    loadHistory(); // Fetch immediately when tab is opened
    startHistoryAutoRefresh();
  } else {
    stopHistoryAutoRefresh();
  }
}

// Start auto-refresh for history (every 10 seconds)
function startHistoryAutoRefresh() {
  // Clear any existing interval first
  stopHistoryAutoRefresh();
  
  // Set up new interval
  historyRefreshInterval = setInterval(() => {
    console.log("Auto-refreshing history...");
    loadHistory();
  }, 10000); // 10 seconds
}

// Stop auto-refresh
function stopHistoryAutoRefresh() {
  if (historyRefreshInterval) {
    clearInterval(historyRefreshInterval);
    historyRefreshInterval = null;
  }
}

// Mobile Navigation Functions
function toggleMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileNavOverlay');
  
  mobileNav.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileNavOverlay');
  
  mobileNav.classList.remove('open');
  overlay.classList.remove('show');
}

function toggleStep(button) {
  const expanded = button.closest('div').nextElementSibling;
  if (expanded && expanded.classList.contains('step-content-expanded')) {
    expanded.classList.toggle('show');
    button.textContent = expanded.classList.contains('show') ? '▲' : '▼';
  }
}

function toggleHistory(button) {
  const expanded = button.closest('div').parentElement.nextElementSibling;
  if (expanded && expanded.classList.contains('history-expanded')) {
    expanded.classList.toggle('show');
    button.textContent = expanded.classList.contains('show') ? '▲' : '▼';
  }
}

function openFolderPicker() {
  document.getElementById('folderInput').click();
}

function handleFolderSelect(event) {
  const files = event.target.files;
  if (files.length > 0) {
    console.log('Folder selected with files:', files);
    alert(`Folder uploaded with ${files.length} files!`);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('dragover');

  const items = event.dataTransfer.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const entry = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          console.log('Folder dropped:', entry.name);
          alert(`Folder "${entry.name}" dropped successfully!`);
        }
      }
    }
  }
}

// Format a Date to "MM-DD-YYYY HH:MM:SS"
function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Save current Results into History (name = current date/time)
async function saveResult() {
  const name = formatTimestamp(new Date());

  const total = document.getElementById('totalMotorsValue')?.textContent?.trim() || '0';
  const avgDist = document.getElementById('avgDistanceValue')?.textContent?.trim() || '';
  const avgF = document.getElementById('avgFbetaValue')?.textContent?.trim() || '';
  const avgProc = document.getElementById('avgProcTimeValue')?.textContent?.trim() || '';

  const high = document.getElementById('highConfCount')?.textContent?.trim() || '0';
  const med = document.getElementById('medConfCount')?.textContent?.trim() || '0';
  const low = document.getElementById('lowConfCount')?.textContent?.trim() || '0';

  // Save to database
  const sql = `INSERT INTO cryomot_history (timestamp, total_motors, avg_distance, avg_fbeta, avg_proc_time, high_conf, med_conf, low_conf) 
               VALUES ('${name}', ${total}, '${avgDist}', '${avgF}', '${avgProc}', ${high}, ${med}, ${low})`;
  
  const result = await executeSQL(sql);
  
  // Give brief feedback on button
  const btn = document.getElementById('saveResultBtn');
  if (!result.error) {
    await loadHistory(); // Reload history to show new entry
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = 'Saved';
      setTimeout(() => (btn.textContent = prev), 1200);
    }
  } else {
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = 'Error';
      setTimeout(() => (btn.textContent = prev), 1200);
    }
    console.error("Failed to save result:", result.error);
  }
}

// Delete a history entry. `btn` is the 'Delete' button inside .history-expanded
async function deleteHistory(btn) {
  const recordId = btn.getAttribute('data-id');
  
  if (!recordId) {
    console.warn('No record ID found');
    return;
  }

  // Delete from database
  const sql = `DELETE FROM cryomot_history WHERE id = ${recordId}`;
  const result = await executeSQL(sql);
  
  if (!result.error) {
    await loadHistory(); // Reload history to reflect deletion
  } else {
    alert("Failed to delete record: " + result.error);
    console.error("Delete error:", result.error);
  }
}

// ============ DATABASE FUNCTIONS ============
const API_URL = "https://mysql.justpi.tech/api/sql.php";

// Execute SQL query via API
async function executeSQL(sqlQuery) {
  console.log("Executing SQL:", sqlQuery);
  console.log("API URL:", API_URL);
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: sqlQuery })
    });
    
    console.log("Response status:", res.status);
    console.log("Response OK:", res.ok);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log("Response data:", data);
    return data;
  } catch (err) {
    console.error("SQL Error:", err);
    console.error("Error details:", err.message);
    return { error: err.message };
  }
}

// Load history from database
async function loadHistory() {
  const sql = "SELECT * FROM cryomot_history ORDER BY created_at DESC";
  const result = await executeSQL(sql);
  
  console.log("Load history result:", result); // Debug logging
  
  // Handle different response formats
  let records = [];
  if (result.data) {
    records = result.data;
  } else if (Array.isArray(result)) {
    records = result;
  } else if (result.error) {
    console.warn("Failed to load history:", result.error);
    return;
  }

  const historyList = document.querySelector('.history-list');
  if (!historyList) {
    console.warn("History list element not found");
    return;
  }

  // Clear existing history items (keep the h2 title)
  const children = Array.from(historyList.children);
  children.forEach((child, index) => {
    if (index > 0) child.remove(); // Keep first child (h2 title)
  });

  console.log("Records to display:", records); // Debug logging

  // Populate with database records
  records.forEach(record => {
    const container = document.createElement('div');

    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-timestamp">${record.timestamp}</div>
      <div class="history-count">${record.total_motors}</div>
      <div class="history-controls">
        <button class="delete-btn" onclick="toggleHistory(this)">▼</button>
      </div>
    `;

    const expanded = document.createElement('div');
    expanded.className = 'history-expanded';
    expanded.innerHTML = `
      <div class="stats-grid" style="margin-top: 0">
        <div class="stat-box">
          <div class="stat-label">Total Motors Detected</div>
          <div class="stat-value">${record.total_motors}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Avg. Euclidean Distance</div>
          <div class="stat-value">${record.avg_distance}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Avg. F Beta Score</div>
          <div class="stat-value">${record.avg_fbeta}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Avg. Processing time</div>
          <div class="stat-value">${record.avg_proc_time}</div>
        </div>
      </div>
      <button class="delete-history-btn" data-id="${record.id}" onclick="deleteHistory(this)">Delete</button>
    `;

    container.appendChild(item);
    container.appendChild(expanded);
    historyList.appendChild(container);
  });
}

// Add random test data to database
async function addRandomHistory() {
  const timestamp = formatTimestamp(new Date());
  const totalMotors = Math.floor(Math.random() * 10);
  const avgDist = Math.floor(Math.random() * 100) + "%";
  const avgFbeta = Math.floor(Math.random() * 100) + "%";
  const avgProcTime = (Math.random() * 60).toFixed(1) + "s";
  const highConf = Math.floor(Math.random() * 5);
  const medConf = Math.floor(Math.random() * 5);
  const lowConf = Math.floor(Math.random() * 5);

  const sql = `INSERT INTO cryomot_history (timestamp, total_motors, avg_distance, avg_fbeta, avg_proc_time, high_conf, med_conf, low_conf) 
               VALUES ('${timestamp}', ${totalMotors}, '${avgDist}', '${avgFbeta}', '${avgProcTime}', ${highConf}, ${medConf}, ${lowConf})`;
  
  console.log("Executing SQL:", sql); // Debug logging
  const result = await executeSQL(sql);
  console.log("Insert result:", result); // Debug logging
  
  if (!result.error) {
    console.log("Insert successful, reloading history..."); // Debug logging
    await loadHistory(); // Reload history to show new entry
    alert("Random test data added!");
  } else {
    alert("Failed to add test data: " + result.error);
  }
}s

// Cleanup: remove stray text nodes that contain only the character "2"
document.addEventListener('DOMContentLoaded', () => {
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const toRemove = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim() === '2') toRemove.push(node);
    }
    toRemove.forEach(n => n.parentNode && n.parentNode.removeChild(n));
    if (toRemove.length) console.log(`Removed ${toRemove.length} stray '2' text node(s)`);
  } catch (e) {
    console.warn('Cleanup routine failed', e);
  }

  // Don't load history on page load - only when user switches to history tab
  // This saves unnecessary API calls
});
