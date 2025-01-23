function getDepartments() {
    const departments = [];
    const banks = {};
    const rows = document.querySelectorAll('tr[id^="bank-row-"], tr[id^="filial-row-"]');

    rows.forEach(row => {
        const rowId = row.id;
        const number = rowId.split('-').pop();

        if (rowId.startsWith('bank-row-')) {
            const bankName = row.querySelector('td').textContent.trim();
            banks[number] = bankName;
        } else if (rowId.startsWith('filial-row-')) {
            row.querySelectorAll('tbody[aria-live="polite"] > tr').forEach(departmentElement => {
                if (departmentElement.querySelector('.currencies-courses__branch-name + div i.ic-warning')) {
                    return;
                }

                const street = departmentElement.querySelector('.currencies-courses__branch-name')?.textContent.trim();
                const locateString = departmentElement.querySelector('.currencies-courses__icon-cell')?.dataset.fillialCoords;

                if (!street || !locateString) return;

                const [lat, lon] = JSON.parse(locateString.replace(/&quot;/g, '"'))[0]
                    .split(',')
                    .map(Number);

                const rates = [...departmentElement.querySelectorAll('.currencies-courses__currency-cell')]
                    .reduce((acc, cell, index, array) => {
                        if (index % 2 === 0) {
                            acc.push({
                                currency: array[index + 1].querySelector('i').dataset.currency,
                                buy: parseFloat(array[index + 1].querySelector('span').textContent.trim()),
                                sell: parseFloat(cell.querySelector('span').textContent.trim())
                            });
                        }
                        return acc;
                    }, []);

                departments.push({
                    bank: banks[number] || 'No Name',
                    street,
                    locate: { lat, lon },
                    rates
                });
            });
        }
    });

    return departments;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Infinity;
    
    const toRadians = (deg) => deg * (Math.PI / 180);
    const R = 6371000;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBestDepartments(departments, currency, operation, userLocation = { lat: 0, lon: 0 }) {
    return departments
        .reduce((acc, department) => {
            const rateInfo = department.rates.find(rate => rate.currency === currency);
            if (!rateInfo) return acc;
            
            const departmentLocation = department.locate;
            const distance = calculateDistance(
                userLocation.lat, userLocation.lon,
                departmentLocation.lat, departmentLocation.lon
            );

            acc.push({
                bank: department.bank,
                street: department.street,
                distance: distance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "_"),
                value: rateInfo[operation],
                currency,
                operation,
                href: `https://maps.yandex.ru/?text=${departmentLocation.lat}+${departmentLocation.lon}`,
                rate: rateInfo,
                location: department.locate
            });

            return acc;
        }, [])
        .sort((a, b) => operation === 'buy' ? a.value - b.value : b.value - a.value);
}

// USD / EUR / RUB
// buy / sell
// { lat: 50.000, lon: 20.000 }
getBestDepartments(getDepartments(), 'USD', 'buy', { lat: 50.0, lon: 20.0 });