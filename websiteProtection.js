export default {
    async fetch(request, env, ctx) {
      const apiKey = '';  // Using environment variable for API key
  
      try {
        // Get the client's public IP address from the headers
        const clientIP = request.headers.get("cf-connecting-ip");
  
        // Use the client's IP to query the ipdata.co API
        const apiUrl = `https://api.ipdata.co/${clientIP}?api-key=${apiKey}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
  
        console.log("IP Data:", data);
  
        // Check for threats in the IP data
        if (data.threat.is_threat || data.threat.is_tor || data.threat.is_datacenter || 
            data.threat.is_known_attacker || data.threat.is_known_abuser || data.threat.is_bogon) {
          
          await env.WTP.put(clientIP, JSON.stringify({ visitedAt: new Date().toISOString() }));
  
          // Serve an HTML access-denied page
          const htmlContent = `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <title>404</title>
                <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet" />
                <link href="css/style.css" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
                <style>
                  .fs-1 { font-size: 5rem !important; }
                </style>
              </head>
              <body class="vh-100 bg-light">
                <div class="container h-100">
                  <div class="d-flex text-dark flex-column justify-content-center h-100 align-items-center text-center">
                    <i class="fs-1 fa fa-ban mb-4 text-danger"></i>
                    <h1 class="text-danger">Access Denied!</h1>
                    <h3>You do not have enough permissions to view this page!</h3>
                    <small>Please contact system admin along with the requested URL!</small>
                  </div>
                </div>
              </body>
            </html>`;
  
          return new Response(htmlContent, {
            status: 403,
            headers: { 'Content-Type': 'text/html' }
          });
        } else {
          // If no threat is detected, allow access and return IP data
          
  
          // Now insert visitor information into the database
          const checkStmt = env.ip_info.prepare(`
            SELECT IP_Address FROM Visitor_Information WHERE IP_Address = ?
          `);
          const result = await checkStmt.bind(clientIP).first();
  
          if (!result) {
            // If no record found, insert new visitor information
            const stmt = env.ip_info.prepare(`
              INSERT INTO Visitor_Information(IP_Address, City, State, Latitude, Longitude, PinCode, asn_number, asn_name, TimeOfVisit)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            await stmt.bind(clientIP, data.city, data.region, data.latitude, data.longitude, data.postal, data.asn.asn, data.asn.name, data.time_zone.current_time).run();
          } else {
            console.log(`IP ${clientIP} already exists in the database.`);
          }
  
          const originalResponse = await fetch(request);
          const responseBody = await originalResponse.text();
  
          return new Response(responseBody, {
              status: 200, // Explicitly set the status code to 200
              headers: originalResponse.headers
          });
        }
      } catch (error) {
        console.error('Error processing request:', error);
        return new Response('Error processing request: ' + error.message, { status: 500 });
      }
    }
  };
  