import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Download, FileText } from "lucide-react";

export default function Reports({ bookings, users, listings }) {
  const [reportType, setReportType] = useState("bookings");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    filterData();
  }, [reportType, dateRange, bookings, users, listings]);

  // Helper function to get user name from userId
  const getUserName = (userId) => {
    if (!userId || !users || users.length === 0) return "N/A";
    const user = users.find(u => u.id === userId);
    if (!user) return "N/A";
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.email || "N/A";
  };

  const filterData = () => {
    let data = [];
    
    switch (reportType) {
      case "bookings":
        data = bookings;
        break;
      case "users":
        data = users;
        break;
      case "listings":
        data = listings;
        break;
      default:
        data = [];
    }

    // Filter by date range if provided
    if (dateRange.start && dateRange.end) {
      data = data.filter(item => {
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
      });
    }

    setFilteredData(data);
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    let csvContent = "";
    let headers = [];
    let rows = [];

    switch (reportType) {
      case "bookings":
        headers = ["ID", "Listing Title", "Guest Name", "Host Name", "Start Date", "End Date", "Guests", "Total Price", "Status", "Created At"];
        rows = filteredData.map(b => [
          b.id,
          b.listingTitle || "",
          getUserName(b.guestId),
          getUserName(b.hostId),
          b.startDate || "",
          b.endDate || "",
          b.guests || 0,
          b.totalPrice || 0,
          b.status || "",
          b.createdAt?.toDate ? b.createdAt.toDate().toLocaleString() : ""
        ]);
        break;
      case "users":
        headers = ["ID", "Email", "First Name", "Last Name", "Phone", "Role", "Created At"];
        rows = filteredData.map(u => [
          u.id,
          u.email || "",
          u.firstName || "",
          u.lastName || "",
          u.phoneNumber || "",
          u.role || u.accType || "guest",
          u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : ""
        ]);
        break;
      case "listings":
        headers = ["ID", "Title", "Category", "Location", "Price", "Owner ID", "Created At"];
        rows = filteredData.map(l => {
          const locationStr = typeof l.location === 'string' 
            ? l.location 
            : (l.location?.address || JSON.stringify(l.location) || "");
          return [
            l.id,
            l.title || "",
            l.category || "",
            locationStr,
            l.price || 0,
            l.ownerId || "",
            l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString() : ""
          ];
        });
        break;
    }

    csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDFReport = () => {
    // Enhanced PDF generation with improved design
    const printWindow = window.open("", "_blank");
    const currentDate = new Date().toLocaleString();
    const reportTitle = reportType.charAt(0).toUpperCase() + reportType.slice(1) + " Report";
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 30px;
              background: #ffffff;
              color: #333;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px solid #ff6b35;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            h1 { 
              color: #1a1a2e;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .report-info {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              font-size: 14px;
              color: #666;
            }
            .report-info-item {
              display: flex;
              flex-direction: column;
            }
            .report-info-label {
              font-weight: 600;
              color: #ff6b35;
              margin-bottom: 4px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            th { 
              background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
              color: #ffffff;
              padding: 12px 10px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: 1px solid #e0e0e0;
            }
            td { 
              border: 1px solid #e0e0e0; 
              padding: 10px;
              text-align: left;
              font-size: 12px;
              color: #333;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #fff5f0;
            }
            .summary {
              margin-top: 30px;
              padding: 20px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 8px;
              border-left: 4px solid #ff6b35;
            }
            .summary-title {
              font-weight: 700;
              color: #1a1a2e;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .summary-content {
              color: #666;
              font-size: 14px;
            }
            @media print {
              body {
                padding: 15px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <div class="report-info">
              <div class="report-info-item">
                <span class="report-info-label">Generated On</span>
                <span>${currentDate}</span>
              </div>
              <div class="report-info-item">
                <span class="report-info-label">Total Records</span>
                <span>${filteredData.length}</span>
              </div>
              ${dateRange.start && dateRange.end ? `
              <div class="report-info-item">
                <span class="report-info-label">Date Range</span>
                <span>${dateRange.start} to ${dateRange.end}</span>
              </div>
              ` : ''}
            </div>
          </div>
          <table>
            ${generateTableHTML()}
          </table>
          <div class="summary">
            <div class="summary-title">Report Summary</div>
            <div class="summary-content">
              This report contains ${filteredData.length} ${reportType} record${filteredData.length !== 1 ? 's' : ''} 
              ${dateRange.start && dateRange.end ? `for the period from ${dateRange.start} to ${dateRange.end}` : ''}.
              Generated by Explora Admin Dashboard.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateTableHTML = () => {
    if (filteredData.length === 0) return "<tr><td colspan='10'>No data available</td></tr>";

    let headers = [];
    let rows = [];

    switch (reportType) {
      case "bookings":
        headers = ["ID", "Listing", "Guest Name", "Host Name", "Start Date", "End Date", "Price", "Status"];
        rows = filteredData.map(b => [
          b.id.substring(0, 8),
          b.listingTitle || "N/A",
          getUserName(b.guestId),
          getUserName(b.hostId),
          b.startDate || "N/A",
          b.endDate || "N/A",
          `₱${b.totalPrice || 0}`,
          b.status || "N/A"
        ]);
        break;
      case "users":
        headers = ["ID", "Email", "Name", "Phone", "Role"];
        rows = filteredData.map(u => [
          u.id.substring(0, 8),
          u.email || "N/A",
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || "N/A",
          u.phoneNumber || "N/A",
          u.role || u.accType || "guest"
        ]);
        break;
      case "listings":
        headers = ["ID", "Title", "Category", "Location", "Price"];
        rows = filteredData.map(l => {
          const locationStr = typeof l.location === 'string' 
            ? l.location 
            : (l.location?.address || "N/A");
          return [
            l.id.substring(0, 8),
            l.title || "N/A",
            l.category || "N/A",
            locationStr,
            `₱${l.price || 0}`
          ];
        });
        break;
    }

    let html = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
    rows.forEach(row => {
      html += "<tr>" + row.map(cell => `<td>${cell}</td>`).join("") + "</tr>";
    });
    return html;
  };

  return (
    <div className="admin-content" style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold", color: "#ffffff" }}>Generate Reports</h2>

      {/* Report Options */}
      <div className="admin-card" style={{
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="admin-form-select"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff"
              }}
            >
              <option value="bookings" style={{ background: "#1a1a2e", color: "#ffffff" }}>Bookings Report</option>
              <option value="users" style={{ background: "#1a1a2e", color: "#ffffff" }}>Users Report</option>
              <option value="listings" style={{ background: "#1a1a2e", color: "#ffffff" }}>Listings Report</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="admin-form-input"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="admin-form-input"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff"
                }}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          padding: "16px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "4px",
          marginBottom: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#ffffff" }}>Report Summary</div>
          <div style={{ color: "#ffffff" }}>Total Records: <strong>{filteredData.length}</strong></div>
          {dateRange.start && dateRange.end && (
            <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)", marginTop: "4px" }}>
              Date Range: {dateRange.start} to {dateRange.end}
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            className="admin-btn admin-btn-success"
            style={{
              padding: "12px 24px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: filteredData.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: filteredData.length === 0 ? 0.6 : 1
            }}
          >
            <Download size={20} />
            Export to CSV
          </button>
          <button
            onClick={generatePDFReport}
            disabled={filteredData.length === 0}
            className="admin-btn admin-btn-danger"
            style={{
              padding: "12px 24px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: filteredData.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: filteredData.length === 0 ? 0.6 : 1
            }}
          >
            <FileText size={20} />
            Generate PDF
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="admin-card" style={{
        padding: "24px",
        borderRadius: "8px",
        maxHeight: "500px",
        overflow: "auto"
      }}>
        <h3 style={{ marginBottom: "16px", color: "#ffffff" }}>Preview ({filteredData.length} records)</h3>
        {filteredData.length === 0 ? (
          <div className="admin-empty-state" style={{ textAlign: "center", padding: "40px", color: "rgba(255, 255, 255, 0.6)" }}>
            No data available for the selected criteria.
          </div>
        ) : (
          <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
            {filteredData.slice(0, 50).map((item, index) => (
              <div key={item.id || index} style={{ padding: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "rgba(255, 255, 255, 0.8)" }}>
                {JSON.stringify(item, null, 2).substring(0, 200)}...
              </div>
            ))}
            {filteredData.length > 50 && (
              <div style={{ padding: "8px", color: "rgba(255, 255, 255, 0.5)", fontStyle: "italic" }}>
                ... and {filteredData.length - 50} more records
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

