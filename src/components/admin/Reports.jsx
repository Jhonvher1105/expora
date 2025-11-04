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
        headers = ["ID", "Listing Title", "Guest ID", "Host ID", "Start Date", "End Date", "Guests", "Total Price", "Status", "Created At"];
        rows = filteredData.map(b => [
          b.id,
          b.listingTitle || "",
          b.guestId || "",
          b.hostId || "",
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
        rows = filteredData.map(l => [
          l.id,
          l.title || "",
          l.category || "",
          l.location || "",
          l.price || 0,
          l.ownerId || "",
          l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString() : ""
        ]);
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
    // Simple PDF generation using window.print or a library
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${reportType.toUpperCase()} Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${filteredData.length}</p>
          <table>
            ${generateTableHTML()}
          </table>
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
        headers = ["ID", "Listing", "Guest", "Host", "Start Date", "End Date", "Price", "Status"];
        rows = filteredData.map(b => [
          b.id.substring(0, 8),
          b.listingTitle || "N/A",
          b.guestId?.substring(0, 8) || "N/A",
          b.hostId?.substring(0, 8) || "N/A",
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
        rows = filteredData.map(l => [
          l.id.substring(0, 8),
          l.title || "N/A",
          l.category || "N/A",
          l.location || "N/A",
          `₱${l.price || 0}`
        ]);
        break;
    }

    let html = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
    rows.forEach(row => {
      html += "<tr>" + row.map(cell => `<td>${cell}</td>`).join("") + "</tr>";
    });
    return html;
  };

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>Generate Reports</h2>

      {/* Report Options */}
      <div style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "24px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            >
              <option value="bookings">Bookings Report</option>
              <option value="users">Users Report</option>
              <option value="listings">Listings Report</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          padding: "16px",
          background: "#f8f9fa",
          borderRadius: "4px",
          marginBottom: "24px"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Report Summary</div>
          <div>Total Records: <strong>{filteredData.length}</strong></div>
          {dateRange.start && dateRange.end && (
            <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
              Date Range: {dateRange.start} to {dateRange.end}
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            style={{
              padding: "12px 24px",
              background: "#28a745",
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
            style={{
              padding: "12px 24px",
              background: "#dc3545",
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
      <div style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        maxHeight: "500px",
        overflow: "auto"
      }}>
        <h3 style={{ marginBottom: "16px" }}>Preview ({filteredData.length} records)</h3>
        {filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No data available for the selected criteria.
          </div>
        ) : (
          <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
            {filteredData.slice(0, 50).map((item, index) => (
              <div key={item.id || index} style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {JSON.stringify(item, null, 2).substring(0, 200)}...
              </div>
            ))}
            {filteredData.length > 50 && (
              <div style={{ padding: "8px", color: "#666", fontStyle: "italic" }}>
                ... and {filteredData.length - 50} more records
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

