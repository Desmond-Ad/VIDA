document.addEventListener('DOMContentLoaded', function () {
    const nextBtn = document.getElementById('nextBtn');
    const name = document.getElementById('name');
    const phone = document.getElementById('phone');
    const quantity = document.getElementById('quantity');
    const amountPaid = document.getElementById('amountPaid');
    const amountOwed = document.getElementById('amountOwed');
    const deliveryTime = document.getElementById('deliveryTime');
    const paymentMethod = document.getElementById('paymentMethod');
    const entryId = localStorage.getItem('currentEntryId'); // this holds your local id (ORD-...)

    let orders = JSON.parse(localStorage.getItem('purchaseEntries') || '[]');
    
    // Find the specific order that was clicked using entryId
    let currentOrderIndex = orders.findIndex(e => e.id === entryId);

    function saveEntries(list) {
        localStorage.setItem('purchaseEntries', JSON.stringify(list));
    }

    if (currentOrderIndex === -1) {
        console.warn('Entry not found in localStorage for id', entryId);
        alert('Order not found! Redirecting...');
        window.location.href = '/Purchase.html';
    }

    // Populate form with the selected order's data
    if (currentOrderIndex !== -1) {
        let currentOrder = orders[currentOrderIndex];
        name.value = currentOrder.name;
        phone.value = currentOrder.phone;
        quantity.value = currentOrder.quantity;
        amountPaid.value = currentOrder.amountPaid;
        amountOwed.value = currentOrder.amountOwed;
    }

    nextBtn.addEventListener('click', function () {
        if (currentOrderIndex !== -1) {
            let currentOrder = orders[currentOrderIndex];
            
            console.log("🔄 Attempting to mark order as done");
            console.log("🔄 Current order:", currentOrder);
            console.log("🔄 Backend ID:", currentOrder.backendId);
            
            // Update local storage
            orders[currentOrderIndex].done = true;
            orders[currentOrderIndex].deliveryTime = deliveryTime.value;
            orders[currentOrderIndex].paymentMethod = paymentMethod.value;
            orders[currentOrderIndex].amountPaid = Number(amountPaid.value);
            orders[currentOrderIndex].amountOwed = Number(amountOwed.value);
            orders[currentOrderIndex].quantity = Number(quantity.value);

            localStorage.setItem('purchaseEntries', JSON.stringify(orders));
            
            // Update MongoDB if the order has a backend ID
            if (currentOrder.backendId) {
                console.log("🔄 Sending PATCH request to update order:", currentOrder.backendId);
                fetchWithToken(`https://vida-uqtj.onrender.com/orders/${currentOrder.backendId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ done: true })
                })
                    .then(res => {
                        console.log("🔄 PATCH response status:", res.status);
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        console.log("✅ Order marked as done in MongoDB:", data);
                        window.location.href = '/Thanks.html';
                    })
                    .catch(err => {
                        console.error("❌ Error updating MongoDB:", err);
                        alert("Updated locally but failed to update server. Check console.");
                        window.location.href = '/Thanks.html';
                    });
            } else {
                console.warn("⚠️ No backend ID found for order, skipping server update");
                // No backend ID, just redirect
                window.location.href = '/Thanks.html';
            }
        } else {
            alert('No pending order to update!');
        }
    });
});