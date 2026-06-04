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

async function main() {
    const dataset = await fetchDataset();

    const infectionSelect = document.getElementById("infection-select");
    const yearSelect = document.getElementById("year-select");
    const countrySelect = document.getElementById("country-select");

    const updateCharts = () => {
        const [infection, pathogen] = infectionSelect.value.split("_");
        console.log(`Update chart, infection type=${infection}, pathogen=${pathogen}`);

        // update line charts
        lineChart.removeAll();
        const lineChartData = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && item.iso3 === countrySelect.value);
        const antibiotics = new Map();
        lineChartData
            .sort((a, b) => a.year < b.year)
            .forEach(item => {
                const array = antibiotics.getOrInsert(item.antibiotic, []);
                array.push(item);
            });
        const lineData = Object.fromEntries(antibiotics);
        lineChart.setData(lineData);

        // update bar chart
        const barChartData = lineChartData.filter(item => item.year === parseInt(yearSelect.value));
        barChart.setData(barChartData);
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

    const data = Object.fromEntries([...dataset.infectionMap.entries()] // infection -> pathogen -> antibiotic
        .map(([key, value]) => [key, { "values": [...value.keys()] }]));
    updateSelectGroup(infectionSelect, data);

    //updateSelect(infectionSelect, dataset.getInfectionNames());
    updateSelectGroup(countrySelect, { "values": [...dataset.countryMap.keys()], "names": [...dataset.countryMap.values()] });

    // updating options does not trigger event, call ourselves
    updateCharts();
}

main();