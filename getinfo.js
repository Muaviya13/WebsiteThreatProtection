export default {
    async fetch(request, env, ctx) {
      // Fetch all keys and values from KV with pagination handling
      let cursor = null;
      const allKeys = [];
      
      // Loop through all pages to get all keys from KV
      do {
        const kvData = await env.WTP.list({ cursor });
        allKeys.push(...kvData.keys);
        cursor = kvData.cursor;
      } while (cursor);
  
      // Fetch the values for each key
      const kvKeyValues = await Promise.all(allKeys.map(async (keyObj) => {
        const key = keyObj.name;
        const value = await env.WTP.get(key);
        return { key, value };
      }));
  
      // Fetch all data from D1 database
      const d1Query = "SELECT * FROM Visitor_Information";
      const d1Results = await env.ip_info.prepare(d1Query).all(); // Fetch all rows
  
      // Generate table headers dynamically based on the first row keys from D1 data
      const headers = d1Results.results && d1Results.results.length > 0
        ? Object.keys(d1Results.results[0]).map(key => `<th>${key}</th>`).join('')
        : '';
  
      // Generate table rows for D1 data
      const d1Rows = d1Results.results && d1Results.results.length > 0
        ? d1Results.results.map(row => {
            const columns = Object.values(row).map(value => `<td>${value}</td>`).join('');
            return `<tr>${columns}</tr>`;
          }).join('')
        : "<tr><td colspan='100%'>No data found in D1</td></tr>";
  
      // Generate KV table rows
      const kvRows = kvKeyValues.length > 0
        ? kvKeyValues.map(({ key, value }) => `
            <tr>
              <td>${key}</td>
              <td>${value || 'N/A'}</td>
            </tr>`).join('')
        : "<tr><td colspan='2'>No KV data found</td></tr>";
  
      // Construct HTML response with a switch button and tables
      const htmlResponse = `
      <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KV and D1 Data</title>
      <style>
          body {
              background-color: rgba(21, 20, 20, 0.0143) !important; /* Dark background color */
              color: white; /* Make text white for better contrast */
          }
          table {
              width: 100%;
              border-collapse: collapse;
          }
          th, td {
              border: 1px solid #ddd;
              padding: 8px;
              color: black; /* Set table text color to black */
          }
          th {
              background-color: #f2f2f2;
              text-align: left;
          }
          tr:nth-child(even) {
              background-color: #f9f9f9;
          }
          .search-container {
              margin-bottom: 15px;
          }
          .switch-button {
              margin-bottom: 20px;
          }
          #kvTable, #d1Table {
              display: none;
          }
      </style>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  </head>
  <body>
  <a href="https://mohitji.com/"><-Go to Home</a>
  <div class="container mt-5 mb-4">
         
      <div class="bg-light p-3 border rounded mb-5">
  
          <h1 class="mb-4">Visitors</h1>
        
          <!-- Switch Button -->
          <div class="switch-button mb-4">
            <button class="btn btn-primary" id="showKvBtn" onclick="switchTable('kv')">Threat Users</button>
            <button class="btn btn-secondary" id="showD1Btn" onclick="switchTable('d1')">Genuine Users</button>
          </div>
        
          <!-- Search Bar -->
          <div class="d-flex gap-1 search-container">
            <input class="form-control" type="text" id="searchInput" placeholder="Search...">
            <button class="btn btn-primary" onclick="searchTable()">GO</button>
          </div>
      </div>
  
    <!-- KV Data Table -->
    <div id="kvTable">
      <h2>Threat Users Visited</h2>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>IP</th>
            <th>Visit Time</th>
          </tr>
        </thead>
        <tbody id="dataTableKv">
          ${kvRows}
        </tbody>
      </table>
    </div>
  
    <!-- D1 Data Table -->
    <div id="d1Table">
      <h2>Genuine Users Visited</h2>
      <table class="table table-striped">
        <thead>
          <tr>
            ${headers}
          </tr>
        </thead>
        <tbody id="dataTableD1">
          ${d1Rows}
        </tbody>
      </table>
    </div>
  </div>
  
  <script>
    // Function to switch between KV and D1 tables
    function switchTable(tableType) {
      const kvTable = document.getElementById('kvTable');
      const d1Table = document.getElementById('d1Table');
      const showKvBtn = document.getElementById('showKvBtn');
      const showD1Btn = document.getElementById('showD1Btn');
      
      if (tableType === 'kv') {
        kvTable.style.display = 'block';
        d1Table.style.display = 'none';
        showKvBtn.classList.add('btn-primary');
        showKvBtn.classList.remove('btn-secondary');
        showD1Btn.classList.remove('btn-primary');
        showD1Btn.classList.add('btn-secondary');
      } else {
        kvTable.style.display = 'none';
        d1Table.style.display = 'block';
        showKvBtn.classList.remove('btn-primary');
        showKvBtn.classList.add('btn-secondary');
        showD1Btn.classList.add('btn-primary');
        showD1Btn.classList.remove('btn-secondary');
      }
    }
  
    // Function to search through both tables
    function searchTable() {
      const input = document.getElementById('searchInput').value.toLowerCase();
      const kvRows = document.querySelectorAll('#dataTableKv tr');
      const d1Rows = document.querySelectorAll('#dataTableD1 tr');
      
      [...kvRows, ...d1Rows].forEach(row => {
        const cells = Array.from(row.getElementsByTagName('td'));
        const match = cells.some(cell => cell.textContent.toLowerCase().includes(input));
        row.style.display = match ? '' : 'none';
      });
    }
  
    // Initially display KV table
    switchTable('kv');
  </script>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
  
  </body>
  </html>
  `;
  
      return new Response(htmlResponse, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  };
  