// VITAR Sport Analytics - Main Application

// Current view state: 'orders' or 'invoices'
let currentView = 'orders';

// Get VAT mode: 'with_vat' or 'without_vat'
function getVatMode() {
    const vatFilter = document.getElementById('vatFilter');
    return vatFilter ? vatFilter.value : 'with_vat';
}

// Get price fields based on VAT mode
function getPriceField(item, currency) {
    const vatMode = getVatMode();
    if (currency === 'EUR') {
        return vatMode === 'without_vat' ?
            (item.total_eur_bez_dph || 0) :
            (item.total_eur || 0);
    } else {
        return vatMode === 'without_vat' ?
            (item.total_czk_bez_dph || 0) :
            (item.total_czk || 0);
    }
}

// Classify product brand based on product name
function classifyBrand(productName) {
    if (!productName) return 'VITAR';
    const name = productName.toUpperCase();

    if (name.includes('ENERVIT') ||
        name.includes('ISOCARB') ||
        name.includes('CARBO GEL') ||
        name.includes('CARBO FLOW') ||
        name.includes('CARBO BAR') ||
        name.includes('CARBO CHEWS') ||
        name.includes('CARBO JELLY') ||
        name.includes('CARBO TABLETS') ||
        name.includes('COMPETITION BAR') ||
        name.includes('ISOTONIC') ||
        name.includes('RECOVERY DRINK') ||
        name.includes('LIQUID GEL') ||
        name.includes('PRE SPORT') ||
        name.includes('AFTER SPORT') ||
        name.includes('PROTEIN BAR') ||
        name.includes('C2:1') ||
        name.includes('BCAA') ||
        name.includes('CREATINA') ||
        name.includes('CREATINE') ||
        name.includes('MAGNESIUM SPORT') ||
        name.includes('GEL (25') ||
        name.includes('GEL (') && name.includes('ML)')) {
        return 'ENERVIT';
    }

    if (name.includes('ROYAL BAY') || name.includes('ROYALBAY')) {
        return 'ROYALBAY';
    }

    return 'VITAR';
}

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
        const eurAmount = getPriceField(order, 'EUR');
        const czkAmount = getPriceField(order, 'CZK');

        if (order.currency === 'EUR') {
            summary.totalEUR += eurAmount;
            if (order.channel === 'B2B') summary.b2bEUR += eurAmount;
        } else {
            summary.totalCZK += czkAmount;
            if (order.channel === 'B2B') summary.b2bCZK += czkAmount;
        }
    });

    return summary;
}

// Calculate plan totals for selected period
function calculatePlanTotals(monthFilter) {
    let planCZK = 0;
    let planEUR = 0;

    if (monthFilter === 'all') {
        // Sum all months
        Object.values(planData).forEach(month => {
            planCZK += month.celkomCZ || 0;
            planEUR += month.celkomSK || 0;
        });
    } else {
        // Single month
        const monthPlan = planData[monthFilter];
        if (monthPlan) {
            planCZK = monthPlan.celkomCZ || 0;
            planEUR = monthPlan.celkomSK || 0;
        }
    }

    return { planCZK, planEUR };
}

// Update summary cards
function updateSummaryCards(orders) {
    const summary = calculateSummary(orders);
    const container = document.getElementById('summaryCards');
    const monthFilter = document.getElementById('monthFilter').value;

    // Calculate plan values for the selected period
    const { planCZK, planEUR } = calculatePlanTotals(monthFilter);

    // Calculate fulfillment percentages
    const percentCZK = planCZK > 0 ? (summary.totalCZK / planCZK) * 100 : 0;
    const percentEUR = planEUR > 0 ? (summary.totalEUR / planEUR) * 100 : 0;

    // Get progress bar classes
    const progressClassCZK = getProgressClass(percentCZK);
    const progressClassEUR = getProgressClass(percentEUR);

    container.innerHTML = `
        <div class="card cz">
            <h3>CZ Market</h3>
            <div class="value">${formatCZK(summary.totalCZK)}</div>
            <div class="subtitle">Obrat v CZK</div>
            <div class="plan-info">
                <span class="plan-label">Plán: ${formatCZK(planCZK)}</span>
                <span class="plan-percent ${progressClassCZK}">${formatPercent(percentCZK)}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${progressClassCZK}" style="width: ${Math.min(percentCZK, 100)}%"></div>
            </div>
        </div>
        <div class="card sk">
            <h3>SK Market</h3>
            <div class="value">${formatEUR(summary.totalEUR)}</div>
            <div class="subtitle">Obrat v EUR</div>
            <div class="plan-info">
                <span class="plan-label">Plán: ${formatEUR(planEUR)}</span>
                <span class="plan-percent ${progressClassEUR}">${formatPercent(percentEUR)}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${progressClassEUR}" style="width: ${Math.min(percentEUR, 100)}%"></div>
            </div>
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

        const czkAmount = getPriceField(order, 'CZK');
        const eurAmount = getPriceField(order, 'EUR');

        if (order.channel === 'ESHOP_ENERVIT_CZ') {
            months[month].ESHOP_ENERVIT_CZ.czk += czkAmount;
            months[month].ESHOP_ENERVIT_CZ.count++;
        } else if (order.channel === 'ESHOP_ENERVIT_SK') {
            months[month].ESHOP_ENERVIT_SK.eur += eurAmount;
            months[month].ESHOP_ENERVIT_SK.count++;
        } else if (order.channel === 'ESHOP_ROYALBAY_CZ') {
            months[month].ESHOP_ROYALBAY_CZ.czk += czkAmount;
            months[month].ESHOP_ROYALBAY_CZ.count++;
        } else if (order.channel === 'ESHOP_ROYALBAY_SK') {
            months[month].ESHOP_ROYALBAY_SK.eur += eurAmount;
            months[month].ESHOP_ROYALBAY_SK.count++;
        } else if (order.channel === 'B2B') {
            if (order.currency === 'EUR') {
                months[month].B2B_SK.eur += eurAmount;
                months[month].B2B_SK.count++;
            } else {
                months[month].B2B_CZ.czk += czkAmount;
                months[month].B2B_CZ.count++;
            }
        }
    });

    return months;
}

// Aggregate items by brand
function aggregateByBrand(items) {
    const months = {};

    items.forEach(item => {
        const month = item.date.substring(0, 7);
        if (!months[month]) {
            months[month] = {
                ENERVIT: 0,
                ROYALBAY: 0,
                VITAR: 0,
                total: 0
            };
        }

        const brand = classifyBrand(item.product_name);
        const czkAmount = getPriceField(item, 'CZK');
        const eurAmount = getPriceField(item, 'EUR');
        const amount = czkAmount + (eurAmount * 25); // Convert EUR to CZK approx

        months[month][brand] += amount;
        months[month].total += amount;
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
        const czkAmount = getPriceField(order, 'CZK');
        months[month][sp] = (months[month][sp] || 0) + czkAmount;
        months[month].total += czkAmount;
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

// Update Brand table
function updateBrandTable(items) {
    const brandData = aggregateByBrand(items);
    const tbody = document.querySelector('#brandTable tbody');
    const sortedMonths = Object.keys(brandData).sort();

    let totals = { ENERVIT: 0, ROYALBAY: 0, VITAR: 0, total: 0 };

    let html = '';
    sortedMonths.forEach(month => {
        const data = brandData[month];
        totals.ENERVIT += data.ENERVIT || 0;
        totals.ROYALBAY += data.ROYALBAY || 0;
        totals.VITAR += data.VITAR || 0;
        totals.total += data.total || 0;

        html += `
            <tr>
                <td>${month}</td>
                <td class="text-right">${formatCZK(data.ENERVIT || 0)}</td>
                <td class="text-right">${formatCZK(data.ROYALBAY || 0)}</td>
                <td class="text-right">${formatCZK(data.VITAR || 0)}</td>
                <td class="text-right">${formatCZK(data.total || 0)}</td>
            </tr>
        `;
    });

    html += `
        <tr class="total-row">
            <td>CELKEM</td>
            <td class="text-right">${formatCZK(totals.ENERVIT)}</td>
            <td class="text-right">${formatCZK(totals.ROYALBAY)}</td>
            <td class="text-right">${formatCZK(totals.VITAR)}</td>
            <td class="text-right">${formatCZK(totals.total)}</td>
        </tr>
    `;

    tbody.innerHTML = html;

    // Update title
    let viewLabel = 'Objednávky';
    if (currentView === 'invoices') viewLabel = 'Faktúry';
    if (currentView === 'sponsoring') viewLabel = 'Sponzoring';
    document.getElementById('brandTitle').textContent = `Obrat podle značky - ${viewLabel}`;
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
        const amount = order.currency === 'EUR' ?
            formatEUR(getPriceField(order, 'EUR')) :
            formatCZK(getPriceField(order, 'CZK'));

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
        customers[company].total += getPriceField(order, 'CZK');
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
        products[key].total += getPriceField(item, 'CZK');
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
    const months = Object.keys(planData).sort();

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
    const months = Object.keys(planData).sort();

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
    const months = Object.keys(planData).sort();

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
    const allCurrentItems = getCurrentItems(); // All items from current view

    updateTitles();
    updateSummaryCards(filteredOrders);
    updateBrandTable(allCurrentItems); // Brand breakdown by items
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

// Calculate days overdue for an invoice
function getDaysOverdue(invoice) {
    if (invoice.is_paid) return 0;
    if (!invoice.date_due) return 0;

    const today = new Date();
    const dueDate = new Date(invoice.date_due);
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
}

// Get overdue category
function getOverdueCategory(daysOverdue) {
    if (daysOverdue === 0) return 'ok';
    if (daysOverdue <= 15) return 'warning';
    if (daysOverdue <= 30) return 'danger';
    if (daysOverdue <= 90) return 'danger';
    return 'critical';
}

// Get overdue status text
function getOverdueStatusText(daysOverdue) {
    if (daysOverdue === 0) return 'Uhrazeno';
    if (daysOverdue <= 15) return '0-15 dní';
    if (daysOverdue <= 30) return '15-30 dní';
    if (daysOverdue <= 90) return '30-90 dní';
    return '90+ dní - PRÁVNE ODD.';
}

// Get overdue invoices
function getOverdueInvoices() {
    const overdueFilter = document.getElementById('overdueFilter')?.value || 'all';

    // Combine regular and sponsoring invoices
    const allInvoices = [...invoicesData, ...sponsoringData];

    // Filter unpaid invoices that are past due date
    let overdue = allInvoices.filter(inv => {
        if (inv.is_paid) return false;
        const daysOverdue = getDaysOverdue(inv);
        return daysOverdue > 0;
    });

    // Apply filter
    if (overdueFilter !== 'all') {
        overdue = overdue.filter(inv => {
            const days = getDaysOverdue(inv);
            switch (overdueFilter) {
                case '0-15': return days > 0 && days <= 15;
                case '15-30': return days > 15 && days <= 30;
                case '30-90': return days > 30 && days <= 90;
                case '90+': return days > 90;
                default: return true;
            }
        });
    }

    // Sort by days overdue descending
    overdue.sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a));

    return overdue;
}

// Update overdue summary cards
function updateOverdueSummary(invoices) {
    const container = document.getElementById('overdueSummary');
    if (!container) return;

    // Calculate stats for each category
    const stats = {
        '0-15': { count: 0, amount: 0 },
        '15-30': { count: 0, amount: 0 },
        '30-90': { count: 0, amount: 0 },
        '90+': { count: 0, amount: 0 }
    };

    // Use all unpaid invoices for summary (not filtered)
    const allInvoices = [...invoicesData, ...sponsoringData];
    allInvoices.forEach(inv => {
        if (inv.is_paid) return;
        const days = getDaysOverdue(inv);
        if (days <= 0) return;

        const amount = inv.currency === 'EUR' ?
            getPriceField(inv, 'EUR') * 25 :
            getPriceField(inv, 'CZK');

        if (days <= 15) {
            stats['0-15'].count++;
            stats['0-15'].amount += amount;
        } else if (days <= 30) {
            stats['15-30'].count++;
            stats['15-30'].amount += amount;
        } else if (days <= 90) {
            stats['30-90'].count++;
            stats['30-90'].amount += amount;
        } else {
            stats['90+'].count++;
            stats['90+'].amount += amount;
        }
    });

    container.innerHTML = `
        <div class="overdue-card overdue-ok">
            <h4>0-15 dní</h4>
            <div class="count">${stats['0-15'].count}</div>
            <div class="amount">${formatCZK(stats['0-15'].amount)}</div>
        </div>
        <div class="overdue-card overdue-warning">
            <h4>15-30 dní</h4>
            <div class="count">${stats['15-30'].count}</div>
            <div class="amount">${formatCZK(stats['15-30'].amount)}</div>
        </div>
        <div class="overdue-card overdue-danger">
            <h4>30-90 dní</h4>
            <div class="count">${stats['30-90'].count}</div>
            <div class="amount">${formatCZK(stats['30-90'].amount)}</div>
        </div>
        <div class="overdue-card overdue-critical">
            <h4>90+ dní (právne odd.)</h4>
            <div class="count">${stats['90+'].count}</div>
            <div class="amount">${formatCZK(stats['90+'].amount)}</div>
        </div>
    `;
}

// Update overdue table
function updateOverdueTable(invoices) {
    const tbody = document.querySelector('#overdueTable tbody');
    if (!tbody) return;

    let html = '';
    invoices.forEach(inv => {
        const daysOverdue = getDaysOverdue(inv);
        const category = getOverdueCategory(daysOverdue);
        const statusText = getOverdueStatusText(daysOverdue);
        const amount = inv.currency === 'EUR' ?
            formatEUR(getPriceField(inv, 'EUR')) :
            formatCZK(getPriceField(inv, 'CZK'));

        let rowClass = '';
        if (category === 'warning') rowClass = 'overdue-row-warning';
        else if (category === 'danger') rowClass = 'overdue-row-danger';
        else if (category === 'critical') rowClass = 'overdue-row-critical';

        let statusClass = 'overdue-' + category;

        html += `
            <tr class="${rowClass}">
                <td>${inv.invoice_number}</td>
                <td>${inv.company || inv.customer_name || '-'}</td>
                <td>${inv.salesperson || inv.centre || 'VITAR Sport'}</td>
                <td>${inv.date_due}</td>
                <td><strong>${daysOverdue}</strong> dní</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="text-right">${amount}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;color:#999;">Žádné faktury po splatnosti</td></tr>';

    const countEl = document.getElementById('overdueCount');
    if (countEl) {
        countEl.textContent = `Celkem ${invoices.length} faktúr po splatnosti`;
    }
}

// ============================================================================
// STOCK FUNCTIONS
// ============================================================================

// Get stock status category
function getStockStatus(daysRemaining) {
    if (daysRemaining === -1) return 'no_sales';
    if (daysRemaining < 30) return 'critical';
    if (daysRemaining < 60) return 'low';
    if (daysRemaining <= 120) return 'ok';
    return 'high';
}

// Get stock status text
function getStockStatusText(daysRemaining) {
    if (daysRemaining === -1) return 'Bez predaja';
    if (daysRemaining < 30) return 'Kritické';
    if (daysRemaining < 60) return 'Nízké';
    if (daysRemaining <= 120) return 'OK';
    return 'Vysoké';
}

// Get filtered stock items
function getFilteredStock() {
    const brandFilter = document.getElementById('stockBrandFilter')?.value || 'all';
    const statusFilter = document.getElementById('stockStatusFilter')?.value || 'all';

    let filtered = stockData.filter(item => item.count > 0); // Only items with stock

    // Brand filter
    if (brandFilter !== 'all') {
        filtered = filtered.filter(item => item.brand === brandFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(item => {
            const status = getStockStatus(item.days_remaining);
            return status === statusFilter;
        });
    }

    // Sort by days remaining (critical first)
    filtered.sort((a, b) => {
        // No sales items at the end
        if (a.days_remaining === -1 && b.days_remaining !== -1) return 1;
        if (b.days_remaining === -1 && a.days_remaining !== -1) return -1;
        return a.days_remaining - b.days_remaining;
    });

    return filtered;
}

// Update stock summary cards
function updateStockSummary() {
    const container = document.getElementById('stockSummary');
    if (!container) return;

    const stats = {
        critical: { count: 0, label: 'Kritické (<30 dní)' },
        low: { count: 0, label: 'Nízké (30-60 dní)' },
        ok: { count: 0, label: 'OK (60-120 dní)' },
        high: { count: 0, label: 'Vysoké (>120 dní)' },
        no_sales: { count: 0, label: 'Bez predaja' }
    };

    stockData.forEach(item => {
        if (item.count <= 0) return;
        const status = getStockStatus(item.days_remaining);
        stats[status].count++;
    });

    container.innerHTML = `
        <div class="stock-card stock-critical">
            <h4>${stats.critical.label}</h4>
            <div class="count">${stats.critical.count}</div>
        </div>
        <div class="stock-card stock-low">
            <h4>${stats.low.label}</h4>
            <div class="count">${stats.low.count}</div>
        </div>
        <div class="stock-card stock-ok">
            <h4>${stats.ok.label}</h4>
            <div class="count">${stats.ok.count}</div>
        </div>
        <div class="stock-card stock-high">
            <h4>${stats.high.label}</h4>
            <div class="count">${stats.high.count}</div>
        </div>
        <div class="stock-card stock-no-sales">
            <h4>${stats.no_sales.label}</h4>
            <div class="count">${stats.no_sales.count}</div>
        </div>
    `;
}

// Update stock table
function updateStockTable(items) {
    const tbody = document.querySelector('#stockTable tbody');
    if (!tbody) return;

    let html = '';
    items.forEach(item => {
        const status = getStockStatus(item.days_remaining);
        const statusText = getStockStatusText(item.days_remaining);

        let rowClass = '';
        if (status === 'critical') rowClass = 'stock-row-critical';
        else if (status === 'low') rowClass = 'stock-row-low';

        const daysText = item.days_remaining === -1 ? '-' : `${item.days_remaining}`;
        const avgDaily = item.avg_daily_sales.toFixed(1);

        html += `
            <tr class="${rowClass}">
                <td>${item.code}</td>
                <td>${item.full_name}</td>
                <td><span class="badge badge-${item.brand === 'ENERVIT' ? 'enervit' : 'royalbay'}">${item.brand}</span></td>
                <td class="text-right">${item.count.toLocaleString('cs-CZ')} ${item.unit}</td>
                <td class="text-right">${avgDaily}</td>
                <td class="text-right">${item.total_sold_90d.toLocaleString('cs-CZ')}</td>
                <td class="text-right"><strong>${daysText}</strong></td>
                <td><span class="badge stock-${status}">${statusText}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;color:#999;">Žádné položky</td></tr>';

    const countEl = document.getElementById('stockCount');
    if (countEl) {
        countEl.textContent = `Zobrazeno ${items.length} z ${stockData.filter(i => i.count > 0).length} položiek`;
    }
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

                // Show/hide special filters and sections
                const overdueFilterGroup = document.getElementById('overdueFilterGroup');
                const overdueSection = document.getElementById('overdueSection');
                const stockBrandFilterGroup = document.getElementById('stockBrandFilterGroup');
                const stockStatusFilterGroup = document.getElementById('stockStatusFilterGroup');
                const stockSection = document.getElementById('stockSection');
                const summaryCards = document.getElementById('summaryCards');
                const tabsDiv = document.querySelector('.tabs');
                const tabContents = document.querySelectorAll('.tab-content');

                // Hide all special sections first
                if (overdueFilterGroup) overdueFilterGroup.style.display = 'none';
                if (overdueSection) overdueSection.style.display = 'none';
                if (stockBrandFilterGroup) stockBrandFilterGroup.style.display = 'none';
                if (stockStatusFilterGroup) stockStatusFilterGroup.style.display = 'none';
                if (stockSection) stockSection.style.display = 'none';
                const summaryMonthFilterGroup = document.getElementById('summaryMonthFilterGroup');
                const summarySection = document.getElementById('summarySection');
                if (summaryMonthFilterGroup) summaryMonthFilterGroup.style.display = 'none';
                if (summarySection) summarySection.style.display = 'none';

                if (newView === 'overdue') {
                    // Show overdue-specific UI
                    if (overdueFilterGroup) overdueFilterGroup.style.display = 'flex';
                    if (overdueSection) overdueSection.style.display = 'block';
                    if (summaryCards) summaryCards.style.display = 'none';
                    if (tabsDiv) tabsDiv.style.display = 'none';
                    tabContents.forEach(tc => tc.style.display = 'none');

                    // Update overdue display
                    const overdueInvoices = getOverdueInvoices();
                    updateOverdueSummary(overdueInvoices);
                    updateOverdueTable(overdueInvoices);
                } else if (newView === 'stock') {
                    // Show stock-specific UI
                    if (stockBrandFilterGroup) stockBrandFilterGroup.style.display = 'flex';
                    if (stockStatusFilterGroup) stockStatusFilterGroup.style.display = 'flex';
                    if (stockSection) stockSection.style.display = 'block';
                    if (summaryCards) summaryCards.style.display = 'none';
                    if (tabsDiv) tabsDiv.style.display = 'none';
                    tabContents.forEach(tc => tc.style.display = 'none');

                    // Update stock display
                    updateStockSummary();
                    const filteredStock = getFilteredStock();
                    updateStockTable(filteredStock);
                } else if (newView === 'summary') {
                    // Show summary-specific UI
                    if (summaryMonthFilterGroup) summaryMonthFilterGroup.style.display = 'flex';
                    if (summarySection) summarySection.style.display = 'block';
                    if (summaryCards) summaryCards.style.display = 'none';
                    if (tabsDiv) tabsDiv.style.display = 'none';
                    tabContents.forEach(tc => tc.style.display = 'none');

                    // Generate monthly summary
                    const selectedMonth = document.getElementById('summaryMonthFilter')?.value || '2025-11';
                    generateMonthlySummary(selectedMonth);
                } else {
                    // Show normal UI
                    if (summaryCards) summaryCards.style.display = 'grid';
                    if (tabsDiv) tabsDiv.style.display = 'flex';

                    // Reinitialize filters for new data source
                    initMonthFilter();
                    initPaymentFilter();
                    initCityFilter();

                    // Update display
                    updateDisplay();
                }
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
    ['monthFilter', 'marketFilter', 'channelFilter', 'salespersonFilter', 'paymentFilter', 'cityFilter', 'vatFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateDisplay);
    });

    // Overdue filter
    const overdueFilter = document.getElementById('overdueFilter');
    if (overdueFilter) {
        overdueFilter.addEventListener('change', () => {
            if (currentView === 'overdue') {
                const overdueInvoices = getOverdueInvoices();
                updateOverdueTable(overdueInvoices);
            }
        });
    }

    // Stock filters
    const stockBrandFilter = document.getElementById('stockBrandFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');

    if (stockBrandFilter) {
        stockBrandFilter.addEventListener('change', () => {
            if (currentView === 'stock') {
                const filteredStock = getFilteredStock();
                updateStockTable(filteredStock);
            }
        });
    }

    if (stockStatusFilter) {
        stockStatusFilter.addEventListener('change', () => {
            if (currentView === 'stock') {
                const filteredStock = getFilteredStock();
                updateStockTable(filteredStock);
            }
        });
    }

    // Summary month filter
    const summaryMonthFilter = document.getElementById('summaryMonthFilter');
    if (summaryMonthFilter) {
        summaryMonthFilter.addEventListener('change', () => {
            if (currentView === 'summary') {
                generateMonthlySummary(summaryMonthFilter.value);
            }
        });
    }
}

// ============================================================================
// MONTHLY SUMMARY FUNCTIONS
// ============================================================================

// Get month name in Slovak
function getMonthNameSK(monthStr) {
    const months = {
        '01': 'Január', '02': 'Február', '03': 'Marec', '04': 'Apríl',
        '05': 'Máj', '06': 'Jún', '07': 'Júl', '08': 'August',
        '09': 'September', '10': 'Október', '11': 'November', '12': 'December'
    };
    const [year, month] = monthStr.split('-');
    return `${months[month]} ${year}`;
}

// Generate Executive Summary - Big 4 style business insight
function generateExecutiveSummary(data) {
    const {
        selectedMonth,
        totalCZK, totalEUR, planCZPercent, planSKPercent,
        invoicedCZK, invoicedEUR, invoicePlanCZPercent, invoicePlanSKPercent,
        plan, momChangeCZ, momChangeSK,
        b2bPercent, eshopPercent, brandPercents, brandTotals,
        salespersonStats, salespersonInvoiceStats,
        top5Customers, top5Products,
        monthOrders, monthInvoices, paidPercent
    } = data;

    let insights = [];

    // === 1. OVERALL PERFORMANCE ASSESSMENT ===
    const combinedOrderPlan = (planCZPercent + planSKPercent) / 2;
    const combinedInvoicePlan = (invoicePlanCZPercent + invoicePlanSKPercent) / 2;
    const czOverperformed = planCZPercent >= 100;
    const skUnderperformed = planSKPercent < 100;
    const czCompensatedSk = czOverperformed && skUnderperformed && combinedOrderPlan >= 95;

    if (czOverperformed && planSKPercent >= 100) {
        insights.push(`<p><strong>Celkové hodnotenie:</strong> Excelentný mesiac. Obchodný plán bol naplnený na oboch trhoch - CZ na ${formatPercent(planCZPercent)} a SK na ${formatPercent(planSKPercent)}. Toto predstavuje silný výkon naprieč celým portfóliom.</p>`);
    } else if (czCompensatedSk) {
        const czOverage = totalCZK - plan.celkomCZ;
        const skShortfall = plan.celkomSK - totalEUR;
        insights.push(`<p><strong>Celkové hodnotenie:</strong> Český trh prekročil plán o ${formatCZK(czOverage)} (${formatPercent(planCZPercent)}), čím kompenzoval nižší výkon na slovenskom trhu (${formatPercent(planSKPercent)}). V súhrne bol mesačný cieľ v podstate dosiahnutý s kombinovaným plnením ${formatPercent(combinedOrderPlan)}.</p>`);
    } else if (planCZPercent >= 90 || planSKPercent >= 90) {
        insights.push(`<p><strong>Celkové hodnotenie:</strong> Mesiac s čiastočným plnením plánu. CZ: ${formatPercent(planCZPercent)}, SK: ${formatPercent(planSKPercent)}. Odporúčame analýzu príčin odchýlok a úpravu taktiky pre nasledujúce obdobie.</p>`);
    } else {
        insights.push(`<p><strong>Celkové hodnotenie:</strong> Mesiac pod očakávaním s plnením CZ: ${formatPercent(planCZPercent)}, SK: ${formatPercent(planSKPercent)}. Vyžaduje sa okamžitá revízia obchodnej stratégie.</p>`);
    }

    // === 2. ORDERS VS INVOICES ANALYSIS ===
    const orderToInvoiceRatioCZ = invoicedCZK > 0 && totalCZK > 0 ? (invoicedCZK / totalCZK) * 100 : 0;
    const orderToInvoiceRatioSK = invoicedEUR > 0 && totalEUR > 0 ? (invoicedEUR / totalEUR) * 100 : 0;

    if (invoicePlanCZPercent >= 100 || invoicePlanSKPercent >= 100) {
        insights.push(`<p><strong>Realizácia objednávok:</strong> Fakturácia dosahuje ${formatPercent(invoicePlanCZPercent)} plánu na CZ a ${formatPercent(invoicePlanSKPercent)} na SK. ${orderToInvoiceRatioCZ > 100 ? 'Faktúry prevyšujú objednávky, čo indikuje úspešnú realizáciu backlogu z predchádzajúcich období.' : 'Konverzia objednávok na faktúry prebieha v štandardnom tempe.'}</p>`);
    } else {
        insights.push(`<p><strong>Realizácia objednávok:</strong> Fakturácia na úrovni CZ: ${formatPercent(invoicePlanCZPercent)}, SK: ${formatPercent(invoicePlanSKPercent)} plánu. Pomer faktúr k objednávkam: CZ ${formatPercent(orderToInvoiceRatioCZ)}, SK ${formatPercent(orderToInvoiceRatioSK)}.</p>`);
    }

    // === 3. MONTH-OVER-MONTH TREND ===
    if (momChangeCZ !== 0 || momChangeSK !== 0) {
        let trendText = '<p><strong>Medzimesačný trend:</strong> ';
        if (momChangeCZ > 0 && momChangeSK > 0) {
            trendText += `Pozitívny rast na oboch trhoch (CZ: +${formatPercent(momChangeCZ)}, SK: +${formatPercent(momChangeSK)}). `;
        } else if (momChangeCZ < 0 && momChangeSK < 0) {
            trendText += `Pokles oproti predchádzajúcemu mesiacu (CZ: ${formatPercent(momChangeCZ)}, SK: ${formatPercent(momChangeSK)}). `;
        } else {
            trendText += `Zmiešaný výkon - CZ: ${momChangeCZ >= 0 ? '+' : ''}${formatPercent(momChangeCZ)}, SK: ${momChangeSK >= 0 ? '+' : ''}${formatPercent(momChangeSK)}. `;
        }
        trendText += '</p>';
        insights.push(trendText);
    }

    // === 4. CHANNEL MIX ANALYSIS ===
    let channelInsight = '<p><strong>Kanálový mix:</strong> ';
    if (b2bPercent > 60) {
        channelInsight += `B2B segment dominuje s ${formatPercent(b2bPercent)} celkového obratu. Toto poskytuje stabilnú bázu, ale zvyšuje závislosť na kľúčových odberateľoch. `;
    } else if (eshopPercent > 60) {
        channelInsight += `E-shop kanály tvoria ${formatPercent(eshopPercent)} obratu, čo indikuje silný retail segment s vyššou maržovosťou ale väčšou volatilitou. `;
    } else {
        channelInsight += `Vyvážený mix medzi B2B (${formatPercent(b2bPercent)}) a e-shop (${formatPercent(eshopPercent)}) kanálmi poskytuje diverzifikáciu príjmov. `;
    }
    channelInsight += '</p>';
    insights.push(channelInsight);

    // === 5. BRAND PERFORMANCE ===
    const dominantBrand = Object.entries(brandPercents).sort((a, b) => b[1] - a[1])[0];
    let brandInsight = '<p><strong>Výkon značiek:</strong> ';
    brandInsight += `${dominantBrand[0]} vedie s ${formatPercent(dominantBrand[1])} podielu (${formatCZK(brandTotals[dominantBrand[0]])}). `;

    if (brandPercents.ENERVIT > 50) {
        brandInsight += 'Portfólio je koncentrované na prémiovú značku ENERVIT. ';
    }
    if (brandPercents.ROYALBAY > 20) {
        brandInsight += `ROYALBAY prispieva ${formatPercent(brandPercents.ROYALBAY)}, čo predstavuje rastový potenciál v kompresnom segmente. `;
    }
    brandInsight += '</p>';
    insights.push(brandInsight);

    // === 6. TOP PERFORMERS ===
    // Top salesperson
    const topSalesperson = Object.entries(salespersonStats)
        .filter(([name, stats]) => stats.totalCZK > 0)
        .sort((a, b) => b[1].totalCZK - a[1].totalCZK)[0];

    if (topSalesperson) {
        const [spName, spStats] = topSalesperson;
        const spInvoiceStats = salespersonInvoiceStats[spName];
        insights.push(`<p><strong>Top obchodník:</strong> ${spName} s obratom ${formatCZK(spStats.totalCZK)}${spStats.totalEUR > 0 ? ' + ' + formatEUR(spStats.totalEUR) : ''} z ${spStats.orders} objednávok. ${spInvoiceStats ? `Fakturované: ${formatCZK(spInvoiceStats.totalCZK)} z ${spInvoiceStats.invoices} faktúr.` : ''}</p>`);
    }

    // Top customer concentration
    if (top5Customers.length > 0) {
        const top5Total = top5Customers.reduce((sum, c) => sum + c[1].total, 0);
        const totalRevenue = totalCZK + (totalEUR * 25);
        const top5Concentration = totalRevenue > 0 ? (top5Total / totalRevenue) * 100 : 0;

        insights.push(`<p><strong>Koncentrácia zákazníkov:</strong> Top 5 B2B zákazníkov tvorí ${formatPercent(top5Concentration)} obratu. Najväčší odberateľ ${top5Customers[0][0].substring(0, 35)} s ${formatCZK(top5Customers[0][1].total)} (${top5Customers[0][1].orders} objednávok).</p>`);
    }

    // === 7. PAYMENT COLLECTION ===
    if (paidPercent < 70) {
        insights.push(`<p><strong>Upozornenie - Inkaso:</strong> Len ${formatPercent(paidPercent)} faktúr je uhradených. Odporúčame aktiváciu collection procesu pre minimalizáciu DSO.</p>`);
    } else if (paidPercent >= 90) {
        insights.push(`<p><strong>Inkaso:</strong> Výborná platobná disciplína s ${formatPercent(paidPercent)} uhradených faktúr.</p>`);
    }

    // === 8. KEY RECOMMENDATIONS ===
    let recommendations = [];

    if (planSKPercent < 80) {
        recommendations.push('Posilniť obchodné aktivity na SK trhu');
    }
    if (b2bPercent > 70) {
        recommendations.push('Diverzifikovať zákaznícke portfólio pre zníženie koncentračného rizika');
    }
    if (paidPercent < 80) {
        recommendations.push('Zintenzívniť follow-up na neuhradené faktúry');
    }
    if (brandPercents.ROYALBAY < 15) {
        recommendations.push('Zvážiť marketingové aktivity pre značku ROYALBAY');
    }

    if (recommendations.length > 0) {
        insights.push(`<p><strong>Odporúčania:</strong> ${recommendations.join('. ')}.</p>`);
    }

    return insights.join('');
}

// Generate monthly summary report
function generateMonthlySummary(selectedMonth) {
    const container = document.getElementById('summaryContent');
    if (!container) return;

    // Filter data for selected month
    const monthOrders = ordersData.filter(o => o.date.startsWith(selectedMonth));
    const monthInvoices = invoicesData.filter(i => i.date.startsWith(selectedMonth));
    const monthItems = itemsData.filter(i => i.date.startsWith(selectedMonth));
    const monthInvoiceItems = invoiceItemsData.filter(i => i.date.startsWith(selectedMonth));

    // Get previous month for comparison
    const [year, month] = selectedMonth.split('-');
    const prevMonth = month === '01'
        ? `${parseInt(year) - 1}-12`
        : `${year}-${String(parseInt(month) - 1).padStart(2, '0')}`;
    const prevMonthOrders = ordersData.filter(o => o.date.startsWith(prevMonth));

    // === ORDERS STATS ===
    const ordersCZ = monthOrders.filter(o => o.currency !== 'EUR');
    const ordersSK = monthOrders.filter(o => o.currency === 'EUR');
    const totalCZK = ordersCZ.reduce((sum, o) => sum + (o.total_czk || 0), 0);
    const totalEUR = ordersSK.reduce((sum, o) => sum + (o.total_eur || 0), 0);

    // Previous month totals
    const prevOrdersCZ = prevMonthOrders.filter(o => o.currency !== 'EUR');
    const prevOrdersSK = prevMonthOrders.filter(o => o.currency === 'EUR');
    const prevTotalCZK = prevOrdersCZ.reduce((sum, o) => sum + (o.total_czk || 0), 0);
    const prevTotalEUR = prevOrdersSK.reduce((sum, o) => sum + (o.total_eur || 0), 0);

    // Plan fulfillment
    const plan = planData[selectedMonth] || { celkomCZ: 0, celkomSK: 0 };
    const planCZPercent = plan.celkomCZ > 0 ? (totalCZK / plan.celkomCZ) * 100 : 0;
    const planSKPercent = plan.celkomSK > 0 ? (totalEUR / plan.celkomSK) * 100 : 0;

    // Month-over-month change
    const momChangeCZ = prevTotalCZK > 0 ? ((totalCZK - prevTotalCZK) / prevTotalCZK) * 100 : 0;
    const momChangeSK = prevTotalEUR > 0 ? ((totalEUR - prevTotalEUR) / prevTotalEUR) * 100 : 0;

    // === INVOICES STATS ===
    const invoicesCZ = monthInvoices.filter(i => i.currency !== 'EUR');
    const invoicesSK = monthInvoices.filter(i => i.currency === 'EUR');
    const invoicedCZK = invoicesCZ.reduce((sum, i) => sum + (i.total_czk || 0), 0);
    const invoicedEUR = invoicesSK.reduce((sum, i) => sum + (i.total_eur || 0), 0);
    const paidInvoices = monthInvoices.filter(i => i.is_paid).length;
    const paidPercent = monthInvoices.length > 0 ? (paidInvoices / monthInvoices.length) * 100 : 0;

    // === BRAND BREAKDOWN ===
    const brandTotals = { ENERVIT: 0, ROYALBAY: 0, VITAR: 0 };
    monthItems.forEach(item => {
        const brand = classifyBrand(item.product_name);
        const amount = (item.total_czk || 0) + ((item.total_eur || 0) * 25);
        brandTotals[brand] += amount;
    });
    const brandTotal = brandTotals.ENERVIT + brandTotals.ROYALBAY + brandTotals.VITAR;
    const brandPercents = {
        ENERVIT: brandTotal > 0 ? (brandTotals.ENERVIT / brandTotal) * 100 : 0,
        ROYALBAY: brandTotal > 0 ? (brandTotals.ROYALBAY / brandTotal) * 100 : 0,
        VITAR: brandTotal > 0 ? (brandTotals.VITAR / brandTotal) * 100 : 0
    };

    // === CHANNEL BREAKDOWN ===
    const channelTotals = { ESHOP: 0, B2B: 0 };
    monthOrders.forEach(o => {
        const amount = (o.total_czk || 0) + ((o.total_eur || 0) * 25);
        if (o.channel === 'B2B') {
            channelTotals.B2B += amount;
        } else {
            channelTotals.ESHOP += amount;
        }
    });
    const channelTotal = channelTotals.ESHOP + channelTotals.B2B;
    const eshopPercent = channelTotal > 0 ? (channelTotals.ESHOP / channelTotal) * 100 : 0;
    const b2bPercent = channelTotal > 0 ? (channelTotals.B2B / channelTotal) * 100 : 0;

    // === B2B SALESPERSON BREAKDOWN ===
    const b2bOrders = monthOrders.filter(o => o.channel === 'B2B');
    const salespersonStats = {};

    b2bOrders.forEach(o => {
        const sp = o.salesperson || 'VITAR Sport';
        if (!salespersonStats[sp]) {
            salespersonStats[sp] = {
                orders: 0,
                totalCZK: 0,
                totalEUR: 0,
                products: {},
                customers: {}
            };
        }
        salespersonStats[sp].orders++;
        salespersonStats[sp].totalCZK += o.total_czk || 0;
        salespersonStats[sp].totalEUR += o.total_eur || 0;

        // Track customer
        const customer = o.company || 'Neznámý';
        salespersonStats[sp].customers[customer] = (salespersonStats[sp].customers[customer] || 0) + (o.total_czk || 0) + ((o.total_eur || 0) * 25);
    });

    // Get top products per salesperson from items
    const b2bItems = monthItems.filter(i => i.channel === 'B2B');
    b2bItems.forEach(item => {
        const sp = item.salesperson || 'VITAR Sport';
        if (salespersonStats[sp]) {
            const productKey = item.product_name || item.product_code || 'Unknown';
            if (!salespersonStats[sp].products[productKey]) {
                salespersonStats[sp].products[productKey] = { qty: 0, total: 0 };
            }
            salespersonStats[sp].products[productKey].qty += item.quantity || 0;
            salespersonStats[sp].products[productKey].total += (item.total_czk || 0) + ((item.total_eur || 0) * 25);
        }
    });

    // Find top product and customer for each salesperson
    Object.keys(salespersonStats).forEach(sp => {
        const products = salespersonStats[sp].products;
        const topProduct = Object.entries(products)
            .sort((a, b) => b[1].total - a[1].total)[0];
        salespersonStats[sp].topProduct = topProduct ? { name: topProduct[0], ...topProduct[1] } : null;

        const customers = salespersonStats[sp].customers;
        const topCustomer = Object.entries(customers)
            .sort((a, b) => b[1] - a[1])[0];
        salespersonStats[sp].topCustomer = topCustomer ? { name: topCustomer[0], total: topCustomer[1] } : null;
    });

    // === TOP 5 PRODUCTS OVERALL ===
    const productTotals = {};
    monthItems.forEach(item => {
        const key = item.product_name || item.product_code || 'Unknown';
        if (!productTotals[key]) {
            productTotals[key] = { qty: 0, total: 0, code: item.product_code };
        }
        productTotals[key].qty += item.quantity || 0;
        productTotals[key].total += (item.total_czk || 0) + ((item.total_eur || 0) * 25);
    });
    const top5Products = Object.entries(productTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

    // === TOP 5 CUSTOMERS (skip empty/unknown) ===
    const customerTotals = {};
    monthOrders.forEach(o => {
        const customer = o.company;
        // Skip empty or unknown customers (eshop orders)
        if (!customer || customer === 'Neznámý' || customer.trim() === '') {
            return;
        }
        if (!customerTotals[customer]) {
            customerTotals[customer] = { orders: 0, total: 0 };
        }
        customerTotals[customer].orders++;
        customerTotals[customer].total += (o.total_czk || 0) + ((o.total_eur || 0) * 25);
    });
    const top5Customers = Object.entries(customerTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

    // === INVOICES PLAN FULFILLMENT ===
    const invoicePlanCZPercent = plan.celkomCZ > 0 ? (invoicedCZK / plan.celkomCZ) * 100 : 0;
    const invoicePlanSKPercent = plan.celkomSK > 0 ? (invoicedEUR / plan.celkomSK) * 100 : 0;

    // === B2B SALESPERSON STATS FROM INVOICES ===
    const b2bInvoices = monthInvoices.filter(i => i.channel === 'B2B');
    const salespersonInvoiceStats = {};
    b2bInvoices.forEach(inv => {
        const sp = inv.salesperson || 'VITAR Sport';
        if (!salespersonInvoiceStats[sp]) {
            salespersonInvoiceStats[sp] = { invoices: 0, totalCZK: 0, totalEUR: 0 };
        }
        salespersonInvoiceStats[sp].invoices++;
        salespersonInvoiceStats[sp].totalCZK += inv.total_czk || 0;
        salespersonInvoiceStats[sp].totalEUR += inv.total_eur || 0;
    });

    // === GENERATE HTML ===
    const planCZClass = planCZPercent >= 90 ? 'good' : (planCZPercent >= 70 ? 'warning' : 'bad');
    const planSKClass = planSKPercent >= 90 ? 'good' : (planSKPercent >= 70 ? 'warning' : 'bad');
    const invPlanCZClass = invoicePlanCZPercent >= 90 ? 'good' : (invoicePlanCZPercent >= 70 ? 'warning' : 'bad');
    const invPlanSKClass = invoicePlanSKPercent >= 90 ? 'good' : (invoicePlanSKPercent >= 70 ? 'warning' : 'bad');

    let html = `
        <div class="summary-report">
            <h2>Mesačné zhrnutie - ${getMonthNameSK(selectedMonth)}</h2>

            <!-- Orders Section -->
            <div class="summary-section">
                <h3>Prijaté objednávky</h3>
                <div class="summary-grid">
                    <div class="summary-stat ${planCZClass}">
                        <div class="label">CZ Market</div>
                        <div class="value">${formatCZK(totalCZK)}</div>
                        <div class="sub">Plán: ${formatPercent(planCZPercent)}</div>
                    </div>
                    <div class="summary-stat ${planSKClass}">
                        <div class="label">SK Market</div>
                        <div class="value">${formatEUR(totalEUR)}</div>
                        <div class="sub">Plán: ${formatPercent(planSKPercent)}</div>
                    </div>
                    <div class="summary-stat info">
                        <div class="label">Počet objednávok</div>
                        <div class="value">${monthOrders.length}</div>
                        <div class="sub">CZ: ${ordersCZ.length} | SK: ${ordersSK.length}</div>
                    </div>
                    <div class="summary-stat ${momChangeCZ >= 0 ? 'good' : 'bad'}">
                        <div class="label">vs. predchádzajúci mesiac</div>
                        <div class="value">${momChangeCZ >= 0 ? '+' : ''}${formatPercent(momChangeCZ)}</div>
                        <div class="sub">CZ market</div>
                    </div>
                </div>
            </div>

            <!-- Invoices Section -->
            <div class="summary-section">
                <h3>Vydané faktúry</h3>
                <div class="summary-grid">
                    <div class="summary-stat ${invPlanCZClass}">
                        <div class="label">CZ Market</div>
                        <div class="value">${formatCZK(invoicedCZK)}</div>
                        <div class="sub">Plán: ${formatPercent(invoicePlanCZPercent)}</div>
                    </div>
                    <div class="summary-stat ${invPlanSKClass}">
                        <div class="label">SK Market</div>
                        <div class="value">${formatEUR(invoicedEUR)}</div>
                        <div class="sub">Plán: ${formatPercent(invoicePlanSKPercent)}</div>
                    </div>
                    <div class="summary-stat info">
                        <div class="label">Počet faktúr</div>
                        <div class="value">${monthInvoices.length}</div>
                        <div class="sub">CZ: ${invoicesCZ.length} | SK: ${invoicesSK.length}</div>
                    </div>
                    <div class="summary-stat ${paidPercent >= 80 ? 'good' : (paidPercent >= 50 ? 'warning' : 'bad')}">
                        <div class="label">Uhradené</div>
                        <div class="value">${formatPercent(paidPercent)}</div>
                        <div class="sub">${paidInvoices} z ${monthInvoices.length}</div>
                    </div>
                </div>
            </div>

            <!-- Brand & Channel Breakdown -->
            <div class="summary-section">
                <h3>Rozdelenie podľa značky a kanálu</h3>
                <div class="summary-text">
                    <p><strong>Značky:</strong>
                        ENERVIT <span class="${brandPercents.ENERVIT > 50 ? 'positive' : ''}">${formatPercent(brandPercents.ENERVIT)}</span> (${formatCZK(brandTotals.ENERVIT)}) |
                        ROYALBAY ${formatPercent(brandPercents.ROYALBAY)} (${formatCZK(brandTotals.ROYALBAY)}) |
                        VITAR ${formatPercent(brandPercents.VITAR)} (${formatCZK(brandTotals.VITAR)})
                    </p>
                    <p><strong>Kanály:</strong>
                        ESHOP ${formatPercent(eshopPercent)} |
                        B2B <span class="${b2bPercent > 50 ? 'positive' : ''}">${formatPercent(b2bPercent)}</span>
                    </p>
                    <p><strong>Krajiny:</strong>
                        CZ ${formatPercent((totalCZK / (totalCZK + totalEUR * 25)) * 100)} |
                        SK ${formatPercent((totalEUR * 25 / (totalCZK + totalEUR * 25)) * 100)}
                    </p>
                </div>
            </div>

            <!-- B2B Salespeople Section -->
            <div class="summary-section">
                <h3>B2B obchodníci</h3>
    `;

    // Add salesperson sections - simplified with both orders and invoices
    const salespersonOrder = ['Karolina', 'Jirka', 'Štěpán', 'VITAR Sport'];
    salespersonOrder.forEach(sp => {
        const orderStats = salespersonStats[sp];
        const invoiceStats = salespersonInvoiceStats[sp];

        // Show if there are any orders or invoices
        if ((orderStats && orderStats.orders > 0) || (invoiceStats && invoiceStats.invoices > 0)) {
            html += `
                <div class="salesperson-section">
                    <h4>${sp}</h4>
                    <div class="stats">
                        <div class="stat-item">
                            <span class="label">Objednávky:</span>
                            <span class="value">${orderStats ? orderStats.orders : 0} obj. / ${orderStats ? formatCZK(orderStats.totalCZK) : formatCZK(0)}${orderStats && orderStats.totalEUR > 0 ? ' + ' + formatEUR(orderStats.totalEUR) : ''}</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">Faktúry:</span>
                            <span class="value">${invoiceStats ? invoiceStats.invoices : 0} fakt. / ${invoiceStats ? formatCZK(invoiceStats.totalCZK) : formatCZK(0)}${invoiceStats && invoiceStats.totalEUR > 0 ? ' + ' + formatEUR(invoiceStats.totalEUR) : ''}</span>
                        </div>
                    </div>
                    ${orderStats && orderStats.topProduct ? `
                    <div class="top-product">
                        <span class="label">Top produkt:</span>
                        <span class="name">${orderStats.topProduct.name.substring(0, 50)}${orderStats.topProduct.name.length > 50 ? '...' : ''}</span>
                        <span class="details">(${orderStats.topProduct.qty} ks, ${formatCZK(orderStats.topProduct.total)})</span>
                    </div>
                    ` : ''}
                    ${orderStats && orderStats.topCustomer ? `
                    <div class="top-customer" style="margin-top: 8px;">
                        <span class="label">Top zákazník:</span>
                        <span class="name">${orderStats.topCustomer.name.substring(0, 40)}${orderStats.topCustomer.name.length > 40 ? '...' : ''}</span>
                        <span class="details">(${formatCZK(orderStats.topCustomer.total)})</span>
                    </div>
                    ` : ''}
                </div>
            `;
        }
    });

    html += `
            </div>

            <!-- Top Products -->
            <div class="summary-section">
                <h3>Top 5 produktov</h3>
                <div class="summary-text">
    `;

    top5Products.forEach((product, index) => {
        html += `<p>${index + 1}. <strong>${product[0].substring(0, 60)}${product[0].length > 60 ? '...' : ''}</strong> - ${product[1].qty} ks, ${formatCZK(product[1].total)}</p>`;
    });

    html += `
                </div>
            </div>

            <!-- Top Customers -->
            <div class="summary-section">
                <h3>Top 5 zákazníkov</h3>
                <div class="summary-text">
    `;

    top5Customers.forEach((customer, index) => {
        html += `<p>${index + 1}. <strong>${customer[0].substring(0, 50)}${customer[0].length > 50 ? '...' : ''}</strong> - ${customer[1].orders} obj., ${formatCZK(customer[1].total)}</p>`;
    });

    html += `
                </div>
            </div>

            <!-- Business Insight -->
            <div class="insight-box">
                <h4>Executive Summary - ${getMonthNameSK(selectedMonth)}</h4>
                ${generateExecutiveSummary({
                    selectedMonth,
                    totalCZK, totalEUR, planCZPercent, planSKPercent,
                    invoicedCZK, invoicedEUR, invoicePlanCZPercent, invoicePlanSKPercent,
                    plan, momChangeCZ, momChangeSK,
                    b2bPercent, eshopPercent, brandPercents, brandTotals,
                    salespersonStats, salespersonInvoiceStats,
                    top5Customers, top5Products,
                    monthOrders, monthInvoices, paidPercent
                })}
            </div>
        </div>
    `;

    container.innerHTML = html;
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
