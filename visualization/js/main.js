import { fetchDataset } from "./dataset.js"
import { BarChart } from "./bar-chart.js";
import { MultipleSmallLineCharts } from "./line-chart.js";

/**
 * Adds updates options of a HTML <select> element.
 * @param {HTMLSelectElement} selectElement the <select> element to update
 * @param {Object} data optgroups and options to create in either format
 *    { "<label-for-opt-group>": { "values": ["opt1", ...], "names": ["Option 1", ...] }, ... }
 *    this creates <optgroup> elements using keys of data as labels
 *    within each optgroup, an option is created for each entry pair in its values and names (need to be same length)
 *    names can be omitted, than values is used for names
 * or
 *    { "values": ["opt1", ...], "names": ["Option 1", ...] }
 *    does not create optgroups, but directly options with values and names
 */
function updateSelectGroup(selectElement, data) {
    // clear content
    selectElement.textContent = "";


    let nodes = undefined;
    if (data["values"] !== undefined && data["values"] instanceof Array) { // create options without optgroups
        const values = data["values"];
        const names = data["names"] || values;
        nodes = values.map((value, index) => {
            const optionNode = document.createElement("option");
            optionNode.value = `${value}`;
            optionNode.text = `${names[index]}`;
            return optionNode;
        });
    } else { // create optgroups containing options
        nodes = Object.keys(data).map(optgroupName => {
            const optgroupNode = document.createElement("optgroup");
            optgroupNode.label = optgroupName;
            const values = data[optgroupName].values;
            const names = data[optgroupName].names || values;
            if (names.length !== values.length) {
                throw new Error(`Error when adding <optgroup> ${optgroupName}:`
                    `received different length arrays for option names ${names} and values ${values}`);
            }
            const optionNodes = values.map((value, index) => {
                const optionNode = document.createElement("option");
                optionNode.value = `${optgroupName}_${value}`;
                optionNode.text = `${optgroupName} - ${names[index]}`;
                return optionNode;
            });
            optgroupNode.append(...optionNodes);
            return optgroupNode;
        });
    }
    selectElement.append(...nodes);
}

function getOrInsert(map, key, defaultValue) {
    if (!map.has(key)) {
        map.set(key, defaultValue);
    }
    return map.get(key);
}

function formatPercent(value) {
    if (value === undefined || Number.isNaN(value)) {
        return "n/a";
    }
    return `${value.toFixed(1)}%`;
}

function formatInteger(value) {
    if (value === undefined || Number.isNaN(value)) {
        return "n/a";
    }
    return value.toLocaleString("en-US");
}

async function main() {
    const dataset = await fetchDataset();

    const infectionSelect = document.getElementById("infection-select");
    const yearSelect = document.getElementById("year-select");
    const countrySelect = document.getElementById("country-select");
    const detailContent = document.getElementById("detail-content");

    let currentLineChartData = [];
    let currentBarChartData = [];
    let hoveredAntibiotic = undefined;
    let selectedAntibiotic = undefined;

    const getActiveAntibiotic = () => hoveredAntibiotic || selectedAntibiotic;

    const getCurrentItem = (antibioticName) => currentBarChartData
        .find(item => item.antibiotic === antibioticName);

    const updateDetailPanel = (antibioticName) => {
        const item = antibioticName !== undefined ? getCurrentItem(antibioticName) : undefined;
        if (item === undefined) {
            detailContent.className = "detail-content detail-empty";
            detailContent.textContent = "Hover or click an antibiotic to inspect resistance details.";
            return;
        }

        const sorted = [...currentBarChartData]
            .filter(d => d.percentResistant > 0)
            .sort((a, b) => a.percentResistant - b.percentResistant);
        const rank = sorted.findIndex(d => d.antibiotic === item.antibiotic) + 1;
        const total = sorted.length;
        const susceptible = 100 - item.percentResistant;

        detailContent.className = "detail-content";
        detailContent.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Antibiotic</span>
                <span class="detail-value">${item.antibiotic}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Reported resistance</span>
                <span class="detail-value">${formatPercent(item.percentResistant)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Estimated susceptibility</span>
                <span class="detail-value">${formatPercent(susceptible)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Rank</span>
                <span class="detail-value">${rank} of ${total} (lower resistance first)</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Resistant / ASTs</span>
                <span class="detail-value">${formatInteger(item.numResistant)} / ${formatInteger(item.numTests)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Country</span>
                <span class="detail-value">${item.countryName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Pathogen</span>
                <span class="detail-value">${item.pathogen}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Year</span>
                <span class="detail-value">${item.year}</span>
            </div>
        `;
    };

    const updateLinkedState = () => {
        const activeAntibiotic = getActiveAntibiotic();
        barChart.setHighlight(hoveredAntibiotic);
        barChart.setSelection(selectedAntibiotic);
        lineChart.setHighlight(hoveredAntibiotic);
        lineChart.setSelection(selectedAntibiotic);
        updateDetailPanel(activeAntibiotic);
    };

    const setHoveredAntibiotic = (antibioticName) => {
        hoveredAntibiotic = antibioticName;
        updateLinkedState();
    };

    const setSelectedAntibiotic = (antibioticName) => {
        selectedAntibiotic = selectedAntibiotic === antibioticName ? undefined : antibioticName;
        updateLinkedState();
    };

    const updateCharts = () => {
        const [infection, pathogen] = infectionSelect.value.split("_");
        console.log(`Update chart, infection type=${infection}, pathogen=${pathogen}`);

        // update line charts
        lineChart.removeAll();
        currentLineChartData = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && item.iso3 === countrySelect.value);
        const antibiotics = new Map();
        currentLineChartData
            .sort((a, b) => a.year - b.year)
            .forEach(item => {
                const array = getOrInsert(antibiotics, item.antibiotic, []);
                array.push(item);
            });
        const lineData = Object.fromEntries(antibiotics);
        lineChart.setData(lineData);

        // update bar chart
        currentBarChartData = currentLineChartData.filter(item => item.year === parseInt(yearSelect.value));
        if (selectedAntibiotic !== undefined && getCurrentItem(selectedAntibiotic) === undefined) {
            selectedAntibiotic = undefined;
        }
        barChart.setData(currentBarChartData);
        updateLinkedState();
    };

    // TODO for each selection, we should update all others with available data - but this might be confusing to user?
    // is there a better option or a least a way to make it more clearly?
    // one way would be to leave options there, but disable them (disabled attribute); i think for year and country this would be nice
    // TODO group options for country select by WHO region (use optgroup element), within group, alphabetic order?
    // also, now that i think about it, maybe we should use optgroup also for infection -> pathogen?
    // i think using optgroup and disabled makes the experience much better already
    // TODO make searchable (this might be annoying to do, but searching countries would be very useful)

    infectionSelect.addEventListener("change", (event) => updateCharts());
    yearSelect.addEventListener("change", (event) => updateCharts());
    countrySelect.addEventListener("change", (event) => updateCharts());

    const barChart = new BarChart("barchart", item => item.antibiotic, item => item.percentResistant);
    const lineChart = new MultipleSmallLineCharts("linechart-grid", item => item.year, item => item.percentResistant);
    barChart.setOnHoverCallback(setHoveredAntibiotic);
    barChart.setOnClickCallback(setSelectedAntibiotic);
    lineChart.setOnHoverCallback(setHoveredAntibiotic);
    lineChart.setOnClickCallback(setSelectedAntibiotic);

    const data = Object.fromEntries([...dataset.infectionMap.entries()] // infection -> pathogen -> antibiotic
        .map(([key, value]) => [key, { "values": [...value.keys()] }]));
    updateSelectGroup(infectionSelect, data);

    //updateSelect(infectionSelect, dataset.getInfectionNames());
    updateSelectGroup(countrySelect, { "values": [...dataset.countryMap.keys()], "names": [...dataset.countryMap.values()] });

    // updating options does not trigger event, call ourselves
    updateCharts();
}

main();
