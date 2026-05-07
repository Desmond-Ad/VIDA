document.addEventListener('DOMContentLoaded', function () {
    // --- DATA ---
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    // Auto-include current year in years array
    const currentYear = new Date().getFullYear();
    let years = [2023, 2024, 2025];
    if (!years.includes(currentYear)) {
        years.push(currentYear);
        years.sort();
    }

    // Example data for each month (replace with your real data)
    const monthChartData = [
        [10, 20, 15, 30], [5, 25, 20, 40], [15, 10, 35, 25], [12, 18, 22, 28],
        [20, 15, 25, 30], [18, 22, 28, 24], [25, 20, 30, 35], [30, 28, 25, 20],
        [22, 24, 28, 26], [28, 30, 32, 34], [35, 32, 30, 28], [40, 38, 36, 34]
    ];
    const barChartData = [
        [300, 500, 200, 400], [320, 480, 210, 390], [310, 510, 220, 420], [330, 520, 230, 410],
        [340, 530, 240, 430], [350, 540, 250, 440], [360, 550, 260, 450], [370, 560, 270, 460],
        [380, 570, 280, 470], [390, 580, 290, 480], [400, 590, 300, 490], [410, 600, 310, 500]
    ];
    const yearPieData = [
        [120, 90, 140, 180, 75, 200], // 2023
        [100, 110, 130, 170, 95, 180], // 2024
        [140, 100, 150, 160, 85, 210]  // 2025
    ];

    // --- STATE ---
    let currentMonthIndex = new Date().getMonth(); // default to current month (0-11)
    let currentYearIndex = years.indexOf(currentYear); // default to current year
    // entries is the shared source-of-truth for orders (may be populated from server)
    let entries = [];

    // --- DOM ---
    const monthLabel = document.getElementById('monthLabel');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const monthChartCanvas = document.getElementById('monthChart');

    const barLabel = document.getElementById('barLabel');
    const prevBarBtn = document.getElementById('prevBarBtn');
    const nextBarBtn = document.getElementById('nextBarBtn');
    const barChartCanvas = document.getElementById('barChart');

    const yearLabel = document.getElementById('yearLabel');
    const prevYearBtn = document.getElementById('prevYearBtn');
    const nextYearBtn = document.getElementById('nextYearBtn');
    const yearPieCanvas = document.getElementById('yearPie');

    // --- Add Next button before search input ---
    const searchInput = document.getElementById('searchInput');
    const nextMainBtn = document.createElement('button');
    nextMainBtn.textContent = 'Next';
    nextMainBtn.style.marginRight = '10px';
    nextMainBtn.style.padding = '0.5em 1.2em';
    nextMainBtn.style.background = '#2c3e50';
    nextMainBtn.style.color = '#fff';
    nextMainBtn.style.border = 'none';
    nextMainBtn.style.borderRadius = '4px';
    nextMainBtn.style.fontSize = '1em';
    nextMainBtn.style.cursor = 'pointer';
    nextMainBtn.style.transition = 'background 0.2s';
    nextMainBtn.addEventListener('mouseenter', function () {
        nextMainBtn.style.background = '#f39c12';
    });
    nextMainBtn.addEventListener('mouseleave', function () {
        nextMainBtn.style.background = '#2c3e50';
    });
    searchInput.parentNode.insertBefore(nextMainBtn, searchInput);

    // --- CHARTS ---
    let monthChart = new Chart(monthChartCanvas, {
        type: "line",
        data: {
            labels: ["Week1", "Week2", "Week3", "Week4"],
            datasets: [{
                label: months[currentMonthIndex],
                data: monthChartData[currentMonthIndex],
                borderColor: "blue",
                fill: false
            }]
        }
    });

    let barChart = new Chart(barChartCanvas, {
        type: "bar",
        data: {
            labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            datasets: [{
                label: months[currentMonthIndex],
                data: barChartData[currentMonthIndex],
                backgroundColor: "#007bff"
            }]
        }
    });

    let yearPie = new Chart(yearPieCanvas, {
        type: "pie",
        data: {
            labels: months,
            datasets: [{
                label: years[currentYearIndex],
                data: yearPieData[currentYearIndex],
                backgroundColor: ["#ff6384","#36a2eb","#ffcd56","#4bc0c0","#9966ff","#ff9f40","#ff6b6b","#4ecdc4","#45b7d1","#f9ca24","#6c5ce7","#a29bfe"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

        // --- Fetch orders from backend and compute chart data ---
        async function fetchOrdersFromServer() {
            try {
                const res = await fetchWithToken('/orders');
                if (!res || !res.ok) throw new Error('Network response was not ok');
                const serverOrders = await res.json();
                // Normalize orders to local entry shape
                return serverOrders.map(o => ({
                    id: o._id || o.id || ('ORD-' + Date.now()),
                    name: o.name || '',
                    phone: o.phone || '',
                    dateTime: o.dateTime || '',
                    recordDate: o.recordDate || (o.dateTime ? new Date(o.dateTime).toISOString().slice(0,10) : ''),
                    amountPaid: Number(o.amountPaid || 0),
                    amountOwed: Number(o.amountOwed || 0),
                    quantity: Number(o.quantity || 0),
                    done: Boolean(o.done)
                }));
            } catch (err) {
                console.warn('Failed to fetch orders from server, falling back to localStorage:', err);
                return JSON.parse(localStorage.getItem('purchaseEntries') || '[]');
            }
        }

        function computeChartDatasets(entries) {
            // initialize empty arrays
            const monthChartDataComputed = Array.from({length:12}, () => [0,0,0,0]);
            const barChartDataComputed = Array.from({length:12}, () => [0,0,0,0,0,0,0]);
            // Year pie: compute for each year in 'years' array, showing all 12 months
            const yearPieDataComputed = years.map(_ => Array(12).fill(0));

            entries.forEach(e => {
                if (!e.recordDate) return;
                // recordDate expected YYYY-MM-DD
                const parts = e.recordDate.split('-');
                if (parts.length < 3) return;
                const year = Number(parts[0]);
                const month = Number(parts[1]) - 1; // 0-11
                const day = Number(parts[2]);
                const qty = Number(e.quantity || 0);

                // Month Chart: Week index: 0..3 (1-7 -> 0, 8-14 ->1, 15-21 ->2, 22-31 ->3)
                const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
                monthChartDataComputed[month][weekIndex] += qty;

                // Bar Chart: Weekday index (use date to compute weekday: 0 Sun .. 6 Sat)
                const dt = new Date(e.recordDate);
                const weekday = dt.getDay();
                barChartDataComputed[month][weekday] += qty;

                // Year Pie: accumulate all 12 months for each year
                const yearIdx = years.indexOf(year);
                if (yearIdx !== -1 && month >= 0 && month < 12) {
                    yearPieDataComputed[yearIdx][month] += qty;
                }
            });

            return { monthChartData: monthChartDataComputed, barChartData: barChartDataComputed, yearPieData: yearPieDataComputed };
        }

        // Load data and initialize charts and table
        (async function initFromServer(){
            // First load from localStorage for immediate display
            let localEntries = JSON.parse(localStorage.getItem('purchaseEntries') || '[]');
            entries = localEntries;

            // Compute and display local data immediately
            const computed = computeChartDatasets(entries);
            monthChartData.length = 0;
            monthChartData.push(...computed.monthChartData);
            barChartData.length = 0;
            barChartData.push(...computed.barChartData);
            yearPieData.length = 0;
            yearPieData.push(...computed.yearPieData);

            updateMonthAndBarCharts();
            updateYearChart();
            renderEntries(entries);

            // Then sync with server in background
            try {
                const serverEntries = await fetchOrdersFromServer();
                // Only update if server has different/newer data
                if (serverEntries.length !== localEntries.length ||
                    JSON.stringify(serverEntries) !== JSON.stringify(localEntries)) {
                    entries = serverEntries;
                    localStorage.setItem('purchaseEntries', JSON.stringify(entries));

                    const computedServer = computeChartDatasets(entries);
                    monthChartData.length = 0;
                    monthChartData.push(...computedServer.monthChartData);
                    barChartData.length = 0;
                    barChartData.push(...computedServer.barChartData);
                    yearPieData.length = 0;
                    yearPieData.push(...computedServer.yearPieData);

                    updateMonthAndBarCharts();
                    updateYearChart();
                    renderEntries(entries);
                }
            } catch (err) {
                console.warn('Failed to sync with server, using local data:', err);
            }
            renderEntries(entries);
        })();

        // --- Refresh logic (manual + polling) ---
        async function refreshData() {
            const refreshBtnEl = document.getElementById('refreshBtn');
            try {
                if (refreshBtnEl) {
                    refreshBtnEl.disabled = true;
                    refreshBtnEl.textContent = 'Refreshing...';
                }
                const serverEntries = await fetchOrdersFromServer();
                const localEntries = JSON.parse(localStorage.getItem('purchaseEntries') || '[]');

                // Merge server and local data, preferring local changes for 'done' status
                const mergedEntries = mergeEntries(localEntries, serverEntries);
                entries = mergedEntries;
                localStorage.setItem('purchaseEntries', JSON.stringify(entries));

                const computed = computeChartDatasets(entries);
                monthChartData.length = 0;
                monthChartData.push(...computed.monthChartData);
                barChartData.length = 0;
                barChartData.push(...computed.barChartData);
                yearPieData.length = 0;
                yearPieData.push(...computed.yearPieData);

                updateMonthAndBarCharts();
                updateYearChart();
                renderEntries(entries);
            } catch (err) {
                console.error('Error refreshing data:', err);
            } finally {
                if (refreshBtnEl) {
                    refreshBtnEl.disabled = false;
                    refreshBtnEl.textContent = 'Refresh';
                }
            }
        }

        // Wire refresh button and start polling every 30s
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', refreshData);
        // Poll every 30 seconds (30_000 ms). You can change this interval if needed.
        setInterval(refreshData, 30000);

    // --- UPDATE FUNCTIONS ---
    function updateMonthAndBarCharts() {
        // Update labels
        monthLabel.textContent = months[currentMonthIndex];
        barLabel.textContent = months[currentMonthIndex];
        // Update month chart
        monthChart.data.datasets[0].label = months[currentMonthIndex];
        monthChart.data.datasets[0].data = monthChartData[currentMonthIndex];
        monthChart.update();
        // Update bar chart
        barChart.data.datasets[0].label = months[currentMonthIndex];
        barChart.data.datasets[0].data = barChartData[currentMonthIndex];
        barChart.update();
    }

    function updateYearChart() {
        yearLabel.textContent = years[currentYearIndex];
        yearPie.data.datasets[0].data = yearPieData[currentYearIndex];
        yearPie.update();
    }

    // --- EVENT HANDLERS ---
    function changeMonth(offset) {
        currentMonthIndex = (currentMonthIndex + offset + months.length) % months.length;
        updateMonthAndBarCharts();
    }
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    prevBarBtn.addEventListener('click', () => changeMonth(-1));
    nextBarBtn.addEventListener('click', () => changeMonth(1));
    nextMainBtn.addEventListener('click', () => changeMonth(1));

    prevYearBtn.addEventListener('click', function () {
        currentYearIndex = (currentYearIndex - 1 + years.length) % years.length;
        updateYearChart();
    });
    nextYearBtn.addEventListener('click', function () {
        currentYearIndex = (currentYearIndex + 1) % years.length;
        updateYearChart();
    });

    // --- INITIALIZE ---
    updateMonthAndBarCharts();
    updateYearChart();

    // --- TABLE AND SEARCH LOGIC (unchanged) ---
    const tableBody = document.querySelector('#entriesTable tbody');
    const overallTotalsDiv = document.getElementById('overallTotals');
    const dailySummariesDiv = document.getElementById('dailySummaries');

    function loadEntries() {
        return JSON.parse(localStorage.getItem('purchaseEntries') || '[]');
    }

    function groupByDate(entries) {
        const groups = {};
        entries.forEach(e => {
            if (!groups[e.recordDate]) groups[e.recordDate] = [];
            groups[e.recordDate].push(e);
        });
        return groups;
    }

    function updateOverallTotals(entries) {
        let totalOrders = entries.length;
        let totalBags = 0;
        let totalPaid = 0;
        let totalOwed = 0;

        entries.forEach(e => {
            totalBags += e.quantity;
            totalPaid += e.amountPaid;
            totalOwed += e.amountOwed;
        });

        overallTotalsDiv.innerHTML = `
            <strong>All-Time Totals:</strong>
            Orders: ${totalOrders} &nbsp; | &nbsp;
            Bags: ${totalBags} &nbsp; | &nbsp;
            Paid: ₦${totalPaid} &nbsp; | &nbsp;
            Owed: ₦${totalOwed}
        `;
    }

    function updateDailySummaries(entries) {
        const groups = groupByDate(entries);
        let html = '';
        Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
            const dayEntries = groups[date];
            let totalOrders = dayEntries.length;
            let totalBags = 0;
            let totalPaid = 0;
            let totalOwed = 0;
            dayEntries.forEach(e => {
                totalBags += e.quantity;
                totalPaid += e.amountPaid;
                totalOwed += e.amountOwed;
            });
            html += `
                <div style="margin-bottom:8px;">
                    <strong>${date}:</strong>
                    Orders: ${totalOrders} &nbsp; | &nbsp;
                    Bags: ${totalBags} &nbsp; | &nbsp;
                    Paid: ₦${totalPaid} &nbsp; | &nbsp;
                    Owed: ₦${totalOwed}
                </div>
            `;
        });
        dailySummariesDiv.innerHTML = html;
    }

    function renderEntries(entries, filter = '') {
        tableBody.innerHTML = '';
        entries
            .filter(entry => entry.name.toLowerCase().includes(filter.toLowerCase()))
            .forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Customer Name">${entry.name}</td>
                    <td data-label="ID Number">${entry.id || ''}</td>
                    <td data-label="Phone Number">${entry.phone}</td>
                    <td data-label="Date">${entry.recordDate}</td>
                    <td data-label="Amount Paid">${entry.amountPaid}</td>
                    <td data-label="Amount Owed">${entry.amountOwed}</td>
                    <td data-label="Number of Bags">${entry.quantity}</td>
                    <td data-label="Status">
                        <span style="color:${entry.done ? 'green' : 'red'};font-weight:bold;">
                            ${entry.done ? 'Done' : 'Not Done'}
                        </span>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        updateOverallTotals(entries);
        updateDailySummaries(entries);
    }

    entries = loadEntries();
    renderEntries(entries);

    searchInput.addEventListener('input', function () {
        renderEntries(entries, searchInput.value);
    });

    // --- Export CSV and Print functionality ---
    function exportToCSV(entries) {
        if (!entries || entries.length === 0) {
            alert('No orders to export');
            return;
        }
        const headers = ['Customer Name','ID Number','Phone Number','Date','Amount Paid','Amount Owed','Number of Bags','Status'];
        const rows = entries.map(e => [
            e.name,
            e.id || '',
            e.phone,
            e.recordDate,
            e.amountPaid,
            e.amountOwed,
            e.quantity,
            e.done ? 'Done' : 'Not Done'
        ]);

        // Build CSV string
        const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\r\n');

        // Create blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const ts = now.toISOString().slice(0,19).replace(/[:T]/g,'-');
        a.download = `vida-orders-${ts}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function printOrders(entries) {
        if (!entries || entries.length === 0) {
            alert('No orders to print');
            return;
        }
        // Build a simple HTML table for printing
        const win = window.open('', '_blank');
        if (!win) {
            alert('Popup blocked. Allow popups for this site to print.');
            return;
        }
        const style = `
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
              th { background: #f4f4f4; }
            </style>`;
        const header = `<h2>VIDA Orders - ${new Date().toLocaleString()}</h2>`;
        const tableHead = `<tr>${['Customer Name','ID Number','Phone Number','Date','Amount Paid','Amount Owed','Number of Bags','Status'].map(h=>`<th>${h}</th>`).join('')}</tr>`;
        const tableRows = entries.map(e => `<tr>${[
            e.name,
            e.id || '',
            e.phone,
            e.recordDate,
            e.amountPaid,
            e.amountOwed,
            e.quantity,
            e.done ? 'Done' : 'Not Done'
        ].map(cell => `<td>${String(cell)}</td>`).join('')}</tr>`).join('');

        win.document.write(`<!doctype html><html><head><title>VIDA Orders</title>${style}</head><body>${header}<table>${tableHead}${tableRows}</table></body></html>`);
        win.document.close();
        // Give the window a moment to render before printing
        setTimeout(() => {
            win.print();
        }, 300);
    }

    // Wire buttons (they exist in the HTML)
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const printBtn = document.getElementById('printBtn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportToCSV(entries));
    if (printBtn) printBtn.addEventListener('click', () => printOrders(entries));
});