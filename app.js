// VITAR Sport Analytics - Main Application

// Current view state: 'orders' or 'invoices'
let currentView = 'orders';

// Format number as CZK
function formatCZK(amount) {
    return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format number as EUR
function formatEUR(amount) {
    return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format percentage
function formatPercent(value) {
    return value.toFixed(1) + '%';
}

// Get progress bar class based on percentage
function getProgressClass(percent) {
    if (percent >= 90) return 'good';
    if (percent >= 70) return 'warning';
    return 'bad';
}

// Get diff class based on value
function getDiffClass(diff) {
    if (diff > 0) return 'positive';
    if (diff < 0) return 'negative';
    return 'neutral';
}

// Get current data based on view
function getCurrentData() {
    if (currentView === 'orders') return ordersData;
    if (currentView === 'invoices') return invoicesData;
    if (currentView === 'sponsoring') return sponsoringData;
    return ordersData;
}

function getCurrentItems() {
    if (currentView === 'orders') return itemsData;
    if (currentView === 'invoices') return invoiceItemsData;
    if (currentView === 'sponsoring') return sponsoringItemsData;
    return itemsData;
}

// Get filtered items based on current filter state
function getFilteredItems() {
    const monthFilter = document.getElementById('monthFilter').value;
    const marketFilter = document.getElementById('marketFilter').value;
    const channelFilter = document.getElementById('channelFilter').value;
    const salespersonFilter = document.getElementById('salespersonFilter').value;
    const paymentFilter = document.getElementById('paymentFilter').value;
    const cityFilter = document.getElementById('cityFilter').value;

    const sourceItems = getCurrentItems();

    return sourceItems.filter(item => {
        // Month filter
        if (monthFilter !== 'all' && item.date.substring(0, 7) !== monthFilter) {
            return false;
        }

        // Market filter
        if (marketFilter !== 'all') {
            if (marketFilter === 'CZ' && item.currency === 'EUR') return false;
            if (marketFilter === 'SK' && item.currency !== 'EUR') return false;
        }

        // Channel filter
        if (channelFilter !== 'all') {
            if (channelFilter === 'ESHOP_ENERVIT' && !item.channel.includes('ENERVIT')) return false;
            if (channelFilter === 'ESHOP_ROYALBAY' && !item.channel.includes('ROYALBAY')) return false;
            if (channelFilter === 'B2B' && item.channel !== 'B2B') return false;
        }

        // Salesperson filter
        if (salespersonFilter !== 'all' && item.salesperson !== salespersonFilter) {
            return false;
        }

        return true;
    });
}

// Get filtered orders/invoices based on current filter state
function getFilteredOrders() {
    const monthFilter = document.getElementById('monthFilter').value;
    const marketFilter = document.getElementById('marketFilter').value;
    const channelFilter = document.getElementById('channelFilter').value;
    const salespersonFilter = document.getElementById('salespersonFilter').value;
    const paymentFilter = document.getElementById('paymentFilter').value;
    const cityFilter = document.getElementById('cityFilter').value;

    const sourceData = getCurrentData();

    return sourceData.filter(order => {
        // Month filter
        if (monthFilter !== 'all' && order.date.substring(0, 7) !== monthFilter) {
            return false;
        }

        // Market filter
        if (marketFilter !== 'all') {
            if (marketFilter === 'CZ' && order.currency === 'EUR') return false;
            if (marketFilter === 'SK' && order.currency !== 'EUR') return false;
        }

        // Channel filter
        if (channelFilter !== 'all') {
            if (channelFilter === 'ESHOP_ENERVIT' && !order.channel.includes('ENERVIT')) return false;
            if (channelFilter === 'ESHOP_ROYALBAY' && !order.channel.includes('ROYALBAY')) return false;
            if (channelFilter === 'B2B' && order.channel !== 'B2B') return false;
        }

        // Salesperson filter
        if (salespersonFilter !== 'all' && order.salesperson !== salespersonFilter) {
            return false;
        }

        // Payment filter
        if (paymentFilter !== 'all' && order.payment_type !== paymentFilter) {
            return false;
        }

        // City filter
        if (cityFilter !== 'all' && order.city !== cityFilter) {
            return false;
        }

        return true;
    });
}

// Calculate summary statistics
function calculateSummary(orders) {
    const summary = {
        totalCZK: 0,
        totalEUR: 0,
        totalOrders: orders.length,
        b2bCZK: 0,
        b2bEUR: 0
    };

    orders.forEach(order => {
        if (order.currency === 'EUR') {
            summary.totalEUR += order.total_eur;
            if (order.channel === 'B2B') summary.b2bEUR += order.total_eur;
        } else {
            summary.totalCZK += order.total_czk;
            if (order.channel === 'B2B') summary.b2bCZK += order.total_czk;
        }
    });

    return summary;
}

// Update summary cards
function updateSummaryCards(orders) {
    const summary = calculateSummary(orders);
    const container = document.getElementById('summaryCards');

    container.innerHTML = `
        <div class="card cz">
            <h3>CZ Market</h3>
            <div class="value">${formatCZK(summary.totalCZK)}</div>
            <div class="subtitle">Obrat v CZK</div>
        </div>
        <div class="card sk">
            <h3>SK Market</h3>
            <div class="value">${formatEUR(summary.totalEUR)}</div>
            <div class="subtitle">Obrat v EUR</div>
        </div>
        <div class="card b2b">
            <h3>B2B</h3>
            <div class="value">${formatCZK(summary.b2bCZK)}</div>
            <div class="subtitle">${formatEUR(summary.b2bEUR)} (SK)</div>
        </div>
        <div class="card orders">
            <h3>Počet objednávek</h3>
            <div class="value">${summary.totalOrders.toLocaleString('cs-CZ')}</div>
            <div class="subtitle">Celkem</div>
        </div>
    `;
}

// Aggregate data by month and channel
function aggregateByMonth(orders) {
    const months = {};

    orders.forEach(order => {
        const month = order.date.substring(0, 7);
        if (!months[month]) {
            months[month] = {
                ESHOP_ENERVIT_CZ: { czk: 0, count: 0 },
                ESHOP_ENERVIT_SK: { eur: 0, count: 0 },
                ESHOP_ROYALBAY_CZ: { czk: 0, count: 0 },
                ESHOP_ROYALBAY_SK: { eur: 0, count: 0 },
                B2B_CZ: { czk: 0, count: 0 },
                B2B_SK: { eur: 0, count: 0 },
                totalCount: 0
            };
        }

        months[month].totalCount++;

        if (order.channel === 'ESHOP_ENERVIT_CZ') {
            months[month].ESHOP_ENERVIT_CZ.czk += order.total_czk;
            months[month].ESHOP_ENERVIT_CZ.count++;
        } else if (order.channel === 'ESHOP_ENERVIT_SK') {
            months[month].ESHOP_ENERVIT_SK.eur += order.total_eur;
            months[month].ESHOP_ENERVIT_SK.count++;
        } else if (order.channel === 'ESHOP_ROYALBAY_CZ') {
            months[month].ESHOP_ROYALBAY_CZ.czk += order.total_czk;
            months[month].ESHOP_ROYALBAY_CZ.count++;
        } else if (order.channel === 'ESHOP_ROYALBAY_SK') {
            months[month].ESHOP_ROYALBAY_SK.eur += order.total_eur;
            months[month].ESHOP_ROYALBAY_SK.count++;
        } else if (order.channel === 'B2B') {
            if (order.currency === 'EUR') {
                months[month].B2B_SK.eur += order.total_eur;
                months[month].B2B_SK.count++;
            } else {
                months[month].B2B_CZ.czk += order.total_czk;
                months[month].B2B_CZ.count++;
            }
        }
    });

    return months;
}

// Aggregate B2B by salesperson
function aggregateB2BBySalesperson(orders) {
    const months = {};
    const b2bOrders = orders.filter(o => o.channel === 'B2B' && o.currency !== 'EUR');

    b2bOrders.forEach(order => {
        const month = order.date.substring(0, 7);
        if (!months[month]) {
            months[month] = {
                Karolina: 0,
                Jirka: 0,
                'Štěpán': 0,
                'VITAR Sport': 0,
                total: 0
            };
        }

        const sp = order.salesperson || 'VITAR Sport';
        months[month][sp] = (months[month][sp] || 0) + order.total_czk;
        months[month].total += order.total_czk;
    });

    return months;
}

// Update CZ table
function updateCZTable(orders) {
    const monthlyData = aggregateByMonth(orders);
    const tbody = document.querySelector('#czTable tbody');
    const sortedMonths = Object.keys(monthlyData).sort();

    let totalEnervit = 0, totalRoyalbay = 0, totalB2B = 0;

    let html = '';
    sortedMonths.forEach(month => {
        const data = monthlyData[month];
        const enervit = data.ESHOP_ENERVIT_CZ.czk;
        const royalbay = data.ESHOP_ROYALBAY_CZ.czk;
        const b2b = data.B2B_CZ.czk;
        const total = enervit + royalbay + b2b;

        totalEnervit += enervit;
        totalRoyalbay += royalbay;
        totalB2B += b2b;

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right">${formatCZK(enervit)}</td>
                <td class="text-right">${formatCZK(royalbay)}</td>
                <td class="text-right">${formatCZK(b2b)}</td>
                <td class="text-right">${formatCZK(total)}</td>
            </tr>
        `;
    });

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right">${formatCZK(totalEnervit)}</td>
            <td class="text-right">${formatCZK(totalRoyalbay)}</td>
            <td class="text-right">${formatCZK(totalB2B)}</td>
            <td class="text-right">${formatCZK(totalEnervit + totalRoyalbay + totalB2B)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// Update SK table
function updateSKTable(orders) {
    const monthlyData = aggregateByMonth(orders);
    const tbody = document.querySelector('#skTable tbody');
    const sortedMonths = Object.keys(monthlyData).sort();

    let totalEnervit = 0, totalRoyalbay = 0, totalB2B = 0;

    let html = '';
    sortedMonths.forEach(month => {
        const data = monthlyData[month];
        const enervit = data.ESHOP_ENERVIT_SK.eur;
        const royalbay = data.ESHOP_ROYALBAY_SK.eur;
        const b2b = data.B2B_SK.eur;
        const total = enervit + royalbay + b2b;

        totalEnervit += enervit;
        totalRoyalbay += royalbay;
        totalB2B += b2b;

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right">${formatEUR(enervit)}</td>
                <td class="text-right">${formatEUR(royalbay)}</td>
                <td class="text-right">${formatEUR(b2b)}</td>
                <td class="text-right">${formatEUR(total)}</td>
            </tr>
        `;
    });

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right">${formatEUR(totalEnervit)}</td>
            <td class="text-right">${formatEUR(totalRoyalbay)}</td>
            <td class="text-right">${formatEUR(totalB2B)}</td>
            <td class="text-right">${formatEUR(totalEnervit + totalRoyalbay + totalB2B)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// Update monthly detail table
function updateMonthlyTable(orders) {
    const monthlyData = aggregateByMonth(orders);
    const tbody = document.querySelector('#monthlyTable tbody');
    const sortedMonths = Object.keys(monthlyData).sort();

    let html = '';
    sortedMonths.forEach(month => {
        const data = monthlyData[month];
        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right">${formatCZK(data.ESHOP_ENERVIT_CZ.czk)}</td>
                <td class="text-right">${formatEUR(data.ESHOP_ENERVIT_SK.eur)}</td>
                <td class="text-right">${formatCZK(data.ESHOP_ROYALBAY_CZ.czk)}</td>
                <td class="text-right">${formatEUR(data.ESHOP_ROYALBAY_SK.eur)}</td>
                <td class="text-right">${formatCZK(data.B2B_CZ.czk)}</td>
                <td class="text-right">${formatEUR(data.B2B_SK.eur)}</td>
                <td class="text-right">${data.totalCount}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Update B2B table
function updateB2BTable(orders) {
    const b2bData = aggregateB2BBySalesperson(orders);
    const tbody = document.querySelector('#b2bTable tbody');
    const sortedMonths = Object.keys(b2bData).sort();

    let totals = { Karolina: 0, Jirka: 0, 'Štěpán': 0, 'VITAR Sport': 0, total: 0 };

    let html = '';
    sortedMonths.forEach(month => {
        const data = b2bData[month];
        totals.Karolina += data.Karolina || 0;
        totals.Jirka += data.Jirka || 0;
        totals['Štěpán'] += data['Štěpán'] || 0;
        totals['VITAR Sport'] += data['VITAR Sport'] || 0;
        totals.total += data.total || 0;

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right">${formatCZK(data.Karolina || 0)}</td>
                <td class="text-right">${formatCZK(data.Jirka || 0)}</td>
                <td class="text-right">${formatCZK(data['Štěpán'] || 0)}</td>
                <td class="text-right">${formatCZK(data['VITAR Sport'] || 0)}</td>
                <td class="text-right">${formatCZK(data.total || 0)}</td>
            </tr>
        `;
    });

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right">${formatCZK(totals.Karolina)}</td>
            <td class="text-right">${formatCZK(totals.Jirka)}</td>
            <td class="text-right">${formatCZK(totals['Štěpán'])}</td>
            <td class="text-right">${formatCZK(totals['VITAR Sport'])}</td>
            <td class="text-right">${formatCZK(totals.total)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// Update orders/invoices table
function updateOrdersTable(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    const thead = document.querySelector('#ordersTable thead tr');
    const limitedOrders = orders.slice(0, 500); // Limit to 500 for performance

    // Update table header based on current view
    if (currentView === 'invoices' || currentView === 'sponsoring') {
        thead.innerHTML = `
            <th>Číslo fakt.</th>
            <th>Datum</th>
            <th>Zákazník</th>
            <th>Město</th>
            <th>Kanál</th>
            <th>Platba</th>
            <th>Stav</th>
            <th class="text-right">Částka</th>
        `;
    } else {
        thead.innerHTML = `
            <th>Číslo obj.</th>
            <th>Datum</th>
            <th>Zákazník</th>
            <th>Město</th>
            <th>Kanál</th>
            <th>Obchodník</th>
            <th>Platba</th>
            <th>Stav</th>
            <th class="text-right">Částka</th>
        `;
    }

    let html = '';
    limitedOrders.forEach(order => {
        const channelClass = order.channel.includes('ENERVIT') ? 'badge-enervit' :
                            order.channel.includes('ROYALBAY') ? 'badge-royalbay' : 'badge-b2b';
        const amount = order.currency === 'EUR' ? formatEUR(order.total_eur) : formatCZK(order.total_czk);

        // Status indicator - different for orders vs invoices/sponsoring
        let statusHtml = '';
        if (currentView === 'invoices' || currentView === 'sponsoring') {
            if (order.is_paid) {
                statusHtml = '<span class="badge" style="background:#e8f5e9;color:#2e7d32;">Uhrazeno</span>';
            } else {
                statusHtml = '<span class="badge" style="background:#ffebee;color:#c62828;">Neuhrazeno</span>';
            }
        } else {
            if (order.is_delivered) {
                statusHtml = '<span class="badge" style="background:#e8f5e9;color:#2e7d32;">Doručeno</span>';
            } else if (order.is_executed) {
                statusHtml = '<span class="badge" style="background:#fff3e0;color:#ef6c00;">Vyřízeno</span>';
            } else {
                statusHtml = '<span class="badge" style="background:#ffebee;color:#c62828;">Čeká</span>';
            }
        }

        if (currentView === 'invoices' || currentView === 'sponsoring') {
            html += `
                <tr>
                    <td>${order.invoice_number}</td>
                    <td>${order.date}</td>
                    <td>${order.company || '-'}</td>
                    <td>${order.city || '-'}</td>
                    <td><span class="badge ${channelClass}">${order.channel}</span></td>
                    <td>${order.payment_type || '-'}</td>
                    <td>${statusHtml}</td>
                    <td class="text-right">${amount}</td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <td>${order.order_number}</td>
                    <td>${order.date}</td>
                    <td>${order.company || '-'}</td>
                    <td>${order.city || '-'}</td>
                    <td><span class="badge ${channelClass}">${order.channel}</span></td>
                    <td>${order.salesperson || '-'}</td>
                    <td>${order.payment_type || '-'}</td>
                    <td>${statusHtml}</td>
                    <td class="text-right">${amount}</td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;
    let label = 'objednávek';
    if (currentView === 'invoices') label = 'faktúr';
    if (currentView === 'sponsoring') label = 'sponzoringových faktúr';
    document.getElementById('ordersCount').textContent =
        `Zobrazeno ${limitedOrders.length} z ${orders.length} ${label}`;
}

// Update Top 10 Customers table
function updateTop10CustomersTable(orders) {
    const tbody = document.querySelector('#top10CustomersTable tbody');

    // Aggregate by customer
    const customers = {};
    orders.forEach(order => {
        const company = order.company || 'Neznámý';
        if (!customers[company]) {
            customers[company] = { count: 0, total: 0 };
        }
        customers[company].count++;
        customers[company].total += order.total_czk;
    });

    // Sort by total and get top 10
    const sorted = Object.entries(customers)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    let html = '';
    sorted.forEach((customer, index) => {
        const avg = customer.count > 0 ? customer.total / customer.count : 0;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${customer.name}</td>
                <td class="text-right">${customer.count}</td>
                <td class="text-right">${formatCZK(customer.total)}</td>
                <td class="text-right">${formatCZK(avg)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;color:#999;">Žádná data</td></tr>';
}

// Update Top 10 Products table
function updateTop10ProductsTable(items) {
    const tbody = document.querySelector('#top10ProductsTable tbody');

    // Aggregate by product
    const products = {};
    items.forEach(item => {
        const key = item.product_code || item.product_name;
        if (!products[key]) {
            products[key] = {
                code: item.product_code,
                name: item.product_name,
                quantity: 0,
                total: 0
            };
        }
        products[key].quantity += item.quantity;
        products[key].total += item.total_czk;
    });

    // Sort by total and get top 10
    const sorted = Object.values(products)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    let html = '';
    sorted.forEach((product, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${product.code || '-'}</td>
                <td>${product.name}</td>
                <td class="text-right">${product.quantity.toLocaleString('cs-CZ')}</td>
                <td class="text-right">${formatCZK(product.total)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;color:#999;">Žádná data</td></tr>';
}

// Update Plan vs Actual CZ table
function updatePlanCZTable(orders) {
    const monthlyData = aggregateByMonth(orders);
    const tbody = document.querySelector('#planCZTable tbody');
    const months = Object.keys(planData).filter(m => m !== '2025-12').sort(); // Exclude December (no actual data yet)

    let totalPlan = 0, totalActual = 0;

    let html = '';
    months.forEach(month => {
        const plan = planData[month]?.celkomCZ || 0;
        const actualData = monthlyData[month];
        const actual = actualData ?
            (actualData.ESHOP_ENERVIT_CZ.czk + actualData.ESHOP_ROYALBAY_CZ.czk + actualData.B2B_CZ.czk) : 0;
        const diff = actual - plan;
        const percent = plan > 0 ? (actual / plan) * 100 : 0;

        totalPlan += plan;
        totalActual += actual;

        const progressClass = getProgressClass(percent);
        const diffClass = getDiffClass(diff);

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right plan-cell">${formatCZK(plan)}</td>
                <td class="text-right">${formatCZK(actual)}</td>
                <td class="text-right diff-cell ${diffClass}">${diff >= 0 ? '+' : ''}${formatCZK(diff)}</td>
                <td class="text-right diff-cell ${diffClass}">${formatPercent(percent)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${Math.min(percent, 100)}%"></div>
                    </div>
                </td>
            </tr>
        `;
    });

    const totalPercent = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    const totalDiff = totalActual - totalPlan;
    const totalProgressClass = getProgressClass(totalPercent);
    const totalDiffClass = getDiffClass(totalDiff);

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right plan-cell">${formatCZK(totalPlan)}</td>
            <td class="text-right">${formatCZK(totalActual)}</td>
            <td class="text-right diff-cell ${totalDiffClass}">${totalDiff >= 0 ? '+' : ''}${formatCZK(totalDiff)}</td>
            <td class="text-right diff-cell ${totalDiffClass}">${formatPercent(totalPercent)}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill ${totalProgressClass}" style="width: ${Math.min(totalPercent, 100)}%"></div>
                </div>
            </td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// Update Plan vs Actual SK table
function updatePlanSKTable(orders) {
    const monthlyData = aggregateByMonth(orders);
    const tbody = document.querySelector('#planSKTable tbody');
    const months = Object.keys(planData).filter(m => m !== '2025-12').sort();

    let totalPlan = 0, totalActual = 0;

    let html = '';
    months.forEach(month => {
        const plan = planData[month]?.celkomSK || 0;
        const actualData = monthlyData[month];
        const actual = actualData ?
            (actualData.ESHOP_ENERVIT_SK.eur + actualData.ESHOP_ROYALBAY_SK.eur + actualData.B2B_SK.eur) : 0;
        const diff = actual - plan;
        const percent = plan > 0 ? (actual / plan) * 100 : 0;

        totalPlan += plan;
        totalActual += actual;

        const progressClass = getProgressClass(percent);
        const diffClass = getDiffClass(diff);

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right plan-cell">${formatEUR(plan)}</td>
                <td class="text-right">${formatEUR(actual)}</td>
                <td class="text-right diff-cell ${diffClass}">${diff >= 0 ? '+' : ''}${formatEUR(diff)}</td>
                <td class="text-right diff-cell ${diffClass}">${formatPercent(percent)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${Math.min(percent, 100)}%"></div>
                    </div>
                </td>
            </tr>
        `;
    });

    const totalPercent = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    const totalDiff = totalActual - totalPlan;
    const totalProgressClass = getProgressClass(totalPercent);
    const totalDiffClass = getDiffClass(totalDiff);

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right plan-cell">${formatEUR(totalPlan)}</td>
            <td class="text-right">${formatEUR(totalActual)}</td>
            <td class="text-right diff-cell ${totalDiffClass}">${totalDiff >= 0 ? '+' : ''}${formatEUR(totalDiff)}</td>
            <td class="text-right diff-cell ${totalDiffClass}">${formatPercent(totalPercent)}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill ${totalProgressClass}" style="width: ${Math.min(totalPercent, 100)}%"></div>
                </div>
            </td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// Update Plan vs Actual B2B table
function updatePlanB2BTable(orders) {
    const b2bData = aggregateB2BBySalesperson(orders);
    const tbody = document.querySelector('#planB2BTable tbody');
    const months = Object.keys(planData).filter(m => m !== '2025-12').sort();

    let totals = {
        karolinaPlan: 0, karolinaActual: 0,
        jirkaPlan: 0, jirkaActual: 0,
        stepanPlan: 0, stepanActual: 0
    };

    let html = '';
    months.forEach(month => {
        const plan = planData[month];
        const actual = b2bData[month] || {};

        const karolinaPlan = plan?.karolina || 0;
        const karolinaActual = actual.Karolina || 0;
        const karolinaPercent = karolinaPlan > 0 ? (karolinaActual / karolinaPlan) * 100 : 0;

        const jirkaPlan = plan?.jirkaCZ || 0;
        const jirkaActual = actual.Jirka || 0;
        const jirkaPercent = jirkaPlan > 0 ? (jirkaActual / jirkaPlan) * 100 : 0;

        const stepanPlan = plan?.stepanCZ || 0;
        const stepanActual = actual['Štěpán'] || 0;
        const stepanPercent = stepanPlan > 0 ? (stepanActual / stepanPlan) * 100 : 0;

        totals.karolinaPlan += karolinaPlan;
        totals.karolinaActual += karolinaActual;
        totals.jirkaPlan += jirkaPlan;
        totals.jirkaActual += jirkaActual;
        totals.stepanPlan += stepanPlan;
        totals.stepanActual += stepanActual;

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right plan-cell">${formatCZK(karolinaPlan)}</td>
                <td class="text-right">${formatCZK(karolinaActual)}</td>
                <td class="text-right diff-cell ${getDiffClass(karolinaActual - karolinaPlan)}">${formatPercent(karolinaPercent)}</td>
                <td class="text-right plan-cell">${formatCZK(jirkaPlan)}</td>
                <td class="text-right">${formatCZK(jirkaActual)}</td>
                <td class="text-right diff-cell ${getDiffClass(jirkaActual - jirkaPlan)}">${formatPercent(jirkaPercent)}</td>
                <td class="text-right plan-cell">${formatCZK(stepanPlan)}</td>
                <td class="text-right">${formatCZK(stepanActual)}</td>
                <td class="text-right diff-cell ${getDiffClass(stepanActual - stepanPlan)}">${formatPercent(stepanPercent)}</td>
            </tr>
        `;
    });

    const karolinaTotalPercent = totals.karolinaPlan > 0 ? (totals.karolinaActual / totals.karolinaPlan) * 100 : 0;
    const jirkaTotalPercent = totals.jirkaPlan > 0 ? (totals.jirkaActual / totals.jirkaPlan) * 100 : 0;
    const stepanTotalPercent = totals.stepanPlan > 0 ? (totals.stepanActual / totals.stepanPlan) * 100 : 0;

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right plan-cell">${formatCZK(totals.karolinaPlan)}</td>
            <td class="text-right">${formatCZK(totals.karolinaActual)}</td>
            <td class="text-right diff-cell ${getDiffClass(totals.karolinaActual - totals.karolinaPlan)}">${formatPercent(karolinaTotalPercent)}</td>
            <td class="text-right plan-cell">${formatCZK(totals.jirkaPlan)}</td>
            <td class="text-right">${formatCZK(totals.jirkaActual)}</td>
            <td class="text-right diff-cell ${getDiffClass(totals.jirkaActual - totals.jirkaPlan)}">${formatPercent(jirkaTotalPercent)}</td>
            <td class="text-right plan-cell">${formatCZK(totals.stepanPlan)}</td>
            <td class="text-right">${formatCZK(totals.stepanActual)}</td>
            <td class="text-right diff-cell ${getDiffClass(totals.stepanActual - totals.stepanPlan)}">${formatPercent(stepanTotalPercent)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// Update section titles based on current view
function updateTitles() {
    let viewLabel = 'Objednávky';
    if (currentView === 'invoices') viewLabel = 'Faktúry';
    if (currentView === 'sponsoring') viewLabel = 'Sponzoring';

    document.getElementById('planCZTitle').textContent = `Plán vs Skutečnost - CZ Market (CZK) - ${viewLabel}`;
    document.getElementById('planSKTitle').textContent = `Plán vs Skutečnost - SK Market (EUR) - ${viewLabel}`;
    document.getElementById('planB2BTitle').textContent = `B2B Obchodníci - Plán vs Skutečnost (CZK) - ${viewLabel}`;
}

// Update all displays
function updateDisplay() {
    const filteredOrders = getFilteredOrders();
    const filteredItems = getFilteredItems();
    const allCurrentData = getCurrentData(); // All data from current view (orders or invoices)

    updateTitles();
    updateSummaryCards(filteredOrders);
    updateCZTable(filteredOrders);
    updateSKTable(filteredOrders);
    updateMonthlyTable(filteredOrders);
    updateB2BTable(filteredOrders);
    updateOrdersTable(filteredOrders);
    updateTop10CustomersTable(filteredOrders);
    updateTop10ProductsTable(filteredItems);
    updatePlanCZTable(allCurrentData); // Use current view data for plan comparison
    updatePlanSKTable(allCurrentData);
    updatePlanB2BTable(allCurrentData);
}

// Initialize month filter options
function initMonthFilter() {
    const data = getCurrentData();
    const months = [...new Set(data.map(o => o.date.substring(0, 7)))].sort();
    const select = document.getElementById('monthFilter');

    // Clear existing options except first
    select.innerHTML = '<option value="all">Všechny měsíce</option>';

    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        select.appendChild(option);
    });
}

// Initialize payment filter options
function initPaymentFilter() {
    const data = getCurrentData();
    const payments = [...new Set(data.map(o => o.payment_type).filter(p => p))].sort();
    const select = document.getElementById('paymentFilter');

    // Clear existing options except first
    select.innerHTML = '<option value="all">Všechny</option>';

    payments.forEach(payment => {
        const option = document.createElement('option');
        option.value = payment;
        option.textContent = payment;
        select.appendChild(option);
    });
}

// Initialize city filter options (top 50 cities by order count)
function initCityFilter() {
    const data = getCurrentData();
    const cityCounts = {};
    data.forEach(o => {
        if (o.city) {
            cityCounts[o.city] = (cityCounts[o.city] || 0) + 1;
        }
    });

    const topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([city]) => city)
        .sort();

    const select = document.getElementById('cityFilter');

    // Clear existing options except first
    select.innerHTML = '<option value="all">Všechna města</option>';

    topCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = `${city} (${cityCounts[city]})`;
        select.appendChild(option);
    });
}

// Initialize view toggle
function initViewToggle() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newView = btn.dataset.view;
            if (newView !== currentView) {
                currentView = newView;

                // Update button states
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Reinitialize filters for new data source
                initMonthFilter();
                initPaymentFilter();
                initCityFilter();

                // Update display
                updateDisplay();
            }
        });
    });
}

// Initialize tabs
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

// Initialize filters
function initFilters() {
    ['monthFilter', 'marketFilter', 'channelFilter', 'salespersonFilter', 'paymentFilter', 'cityFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateDisplay);
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initViewToggle();
    initMonthFilter();
    initPaymentFilter();
    initCityFilter();
    initTabs();
    initFilters();
    updateDisplay();
});
