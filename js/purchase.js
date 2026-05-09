document.addEventListener('DOMContentLoaded', function () {
    // Import auth functions
    // Make sure auth.js is loaded first

    const form = document.getElementById('purchaseForm');
    const name = document.getElementById('name');
    const phone = document.getElementById('phone');
    const quantity = document.getElementById('quantity');
    const amountPaid = document.getElementById('amountPaid');
    const totalAmount = document.getElementById('totalAmount');
    const entriesTable = document.querySelector('#entriesTable tbody');
    const searchInput = document.getElementById('searchInput');
    const dailyTotalsDiv = document.getElementById('dailyTotals');

    function saveEntries(entries) {
        localStorage.setItem('purchaseEntries', JSON.stringify(entries));
    }

    function loadEntries() {
        return JSON.parse(localStorage.getItem('purchaseEntries') || '[]');
    }

    function updateDailyTotals(entries) {
        const today = new Date().toISOString().slice(0, 10);
        const todayEntries = entries.filter(e => e.recordDate === today);

        let totalBags = 0;
        let totalPaid = 0;
        let totalOwed = 0;

        todayEntries.forEach(e => {
            totalBags += e.quantity;
            totalPaid += e.amountPaid;
            totalOwed += e.amountOwed;
        });

        dailyTotalsDiv.innerHTML = `
            <strong>Today's Totals:</strong>
            Bags: ${totalBags} &nbsp; | &nbsp;
            Paid: ₦${totalPaid} &nbsp; | &nbsp;
            Owed: ₦${totalOwed}
        `;
    }

    function renderEntries(entries, filter = '') {
        entriesTable.innerHTML = '';
        entries
            .filter(entry => entry.name.toLowerCase().includes(filter.toLowerCase()))
            .forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Customer Name">${entry.name}</td>
                    <td data-label="ID Number">${entry.id || ''}</td>
                    <td data-label="Phone Number">${entry.phone}</td>
                    <td data-label="Date&Time">${entry.dateTime}</td>
                    <td data-label="Amount Paid">${entry.amountPaid}</td>
                    <td data-label="Amount Owed">${entry.amountOwed}</td>
                    <td data-label="Number of Bags (Quantity)">${entry.quantity}</td>
                    <td data-label="Status">
                        <button class="status-btn" data-id="${entry.id}" 
                            style="color:${entry.done ? 'green' : 'red'};font-weight:bold;cursor:${entry.done ? 'not-allowed' : 'pointer'};" 
                            ${entry.done ? 'disabled' : ''}>
                            ${entry.done ? 'Done' : 'Not Done'}
                        </button>
                    </td>
                `;
                entriesTable.appendChild(tr);
            });
        updateDailyTotals(entries);
    }

    let entries = loadEntries();
    renderEntries(entries);

    // ✅ Auto calculator - Calculate total when quantity changes
    quantity.addEventListener('input', function () {
        const qty = Number(quantity.value);
        if (qty > 0) {
            totalAmount.value = '₦' + (qty * 300);
        } else {
            totalAmount.value = '';
        }
    });

    // ✅ Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const now = new Date();
        const dateTime = now.toLocaleString();
        const recordDate = now.toISOString().slice(0, 10);
        const pricePerBag = 300;
        const totalCost = Number(quantity.value) * pricePerBag;
        const amountOwed = totalCost - Number(amountPaid.value);

        // Prepare order data for MongoDB
        const orderData = {
            name: name.value,
            phone: phone.value,
            quantity: Number(quantity.value),
            amountPaid: Number(amountPaid.value),
            amountOwed: amountOwed > 0 ? amountOwed : 0,
            dateTime: dateTime,
            recordDate: recordDate,
            done: false
        };

        // Find existing customer by name and phone
        const existingIndex = entries.findIndex(entry =>
            entry.name.trim().toLowerCase() === name.value.trim().toLowerCase() &&
            entry.phone.trim() === phone.value.trim()
        );

        let shouldAccumulate = false; // Set to false to create separate orders

        if (existingIndex !== -1 && shouldAccumulate) {
            // Update existing customer (legacy behavior - disabled)
            entries[existingIndex].quantity += Number(quantity.value);
            entries[existingIndex].amountPaid += Number(amountPaid.value);
            entries[existingIndex].amountOwed += amountOwed > 0 ? amountOwed : 0;
            entries[existingIndex].dateTime = dateTime;
            entries[existingIndex].recordDate = recordDate;
            entries[existingIndex].done = false;
            saveEntries(entries);
            renderEntries(entries);
        }

        // ✅ ALWAYS save to MongoDB (for both new and existing customers)
        fetchWithToken("/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        })
            .then(async res => {
                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unable to read response body');
                    console.error('❌ Order POST failed:', res.status, res.statusText, errorText);
                    throw new Error(`Network response was not ok (${res.status})`);
                }
                return res.json();
            })
            .then(data => {
                console.log("✅ Order saved to MongoDB:", data);
                // Store the backend ID for this specific order entry
                const newEntry = {
                    id: 'ORD-' + Date.now(),
                    name: name.value,
                    phone: phone.value,
                    dateTime: dateTime,
                    recordDate: recordDate,
                    amountPaid: Number(amountPaid.value),
                    amountOwed: amountOwed > 0 ? amountOwed : 0,
                    quantity: Number(quantity.value),
                    done: false,
                    backendId: data.order._id  // Store backend ID immediately
                };

                if (existingIndex !== -1) {
                    // For existing customers, add a new separate order entry
                    entries.push(newEntry);
                } else {
                    // For new customers, add the order entry
                    entries.push(newEntry);
                }

                saveEntries(entries);
                renderEntries(entries);
                alert("Order saved successfully!");
            })
            .catch(err => {
                console.error("❌ Failed to save order:", err);
                alert("Error saving to database. Check console for details.");
            });

        // Reset form
        form.reset();
        totalAmount.value = '';
    });

    searchInput.addEventListener('input', function () {
        renderEntries(entries, searchInput.value);
    });

    // Redirect to rev.html when "Not Done" is clicked. If not logged in, go to login first.
    entriesTable.addEventListener('click', async function (e) {
        if (e.target.classList.contains('status-btn')) {
            const entryId = e.target.getAttribute('data-id');
            const entry = entries.find(entry => entry.id === entryId);
            if (entry && !entry.done) {
                localStorage.setItem('currentEntryId', entryId);

                // Force login before entering the Receive page to ensure the correct
                // user (Rev or Admin) authenticates at the moment of receiving.
                // This avoids re-using a token from a different session.
                window.location.href = '/Public/login.html?next=rev';
                return;
            }
        }
    });
});