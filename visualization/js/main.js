import { fetchDataset } from "./dataset.js"
import { BarChart } from "./bar-chart.js";
import { LineChart, MultipleSmallLineCharts } from "./line-chart.js";

/**
 * Adds updates options of a HTML <select> element.
 * @param {HTMLSelectElement} selectElement the select element to update
 * @param {string[]} values the option values to use
 * @param {string[]} names the option texts to use
 */
function updateSelect(selectElement, values, names = undefined) {
    //console.log(`update select ${selectElement} with values ${values} and names ${names}`);
    if (names === undefined) {
        names = values;
    }

    if (names.length !== values.length) {
        throw new Error(`Error when updating <select>: received different length arrays for option names ${names} and values ${values}`);
    }

    // clear current children
    selectElement.textContent = "";

    if (values.length === 0) {
        return;
    }

    const optionNodes = values.map((value, index) => {
        const optionNode = document.createElement("option");
        optionNode.value = value;
        optionNode.textContent = names[index];
        return optionNode;
    });
    selectElement.append(...optionNodes);
}


async function main() {
    const dataset = await fetchDataset();

    const infectionSelect = document.getElementById("infection-select");
    const pathogenSelect = document.getElementById("pathogen-select");
    const yearSelect = document.getElementById("year-select");
    const countrySelect = document.getElementById("country-select");

    const updateCharts = () => {
        const barChartData = dataset.items
            .filter(item => item.year === parseInt(yearSelect.value)
                && item.infection === infectionSelect.value
                && item.pathogen === pathogenSelect.value
                && item.iso3 === countrySelect.value);
        barChart.setData(barChartData);

        //lineChart.removeAllLines();
        lineChart.removeAll();
        const lineChartData = dataset.items
            .filter(item => item.infection === infectionSelect.value
                && item.pathogen === pathogenSelect.value
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
    };

    const onSelectInfection = (infection) => {
        console.log(`Select infection type ${infection}`);
        updateSelect(pathogenSelect, dataset.getPathogenNames(infection));
        updateCharts();
    };

    // TODO for each selection, we should update all others with available data - but this might be confusing to user?
    // is there a better option or a least a way to make it more clearly?
    // one way would be to leave options there, but disable them (disabled attribute); i think for year and country this would be nice
    // TODO group options for country select by WHO region (use optgroup element), within group, alphabetic order?
    // also, now that i think about it, maybe we should use optgroup also for infection -> pathogen?
    // i think using optgroup and disabled makes the experience much better already
    // TODO make searchable (this might be annoying to do, but searching countries would be very useful)
    const onSelectYear = (year) => updateCharts();
    const onSelectCountry = (iso3) => updateCharts();
    const onSelectPathogen = (pathogen) => updateCharts();

    infectionSelect.addEventListener("change", (event) => onSelectInfection(event.target.value));
    pathogenSelect.addEventListener("change", (event) => onSelectPathogen(event.target.value));
    yearSelect.addEventListener("change", (event) => onSelectYear(event.target.value));
    countrySelect.addEventListener("change", (event) => onSelectCountry(event.target.value));

    const barChart = new BarChart("barchart", item => item.antibiotic, item => item.percentResistant);
    const lineChart = new MultipleSmallLineCharts("linechart-grid", item => item.year, item => item.percentResistant);

    // init select options
    updateSelect(infectionSelect, dataset.getInfectionNames());
    updateSelect(countrySelect, [...dataset.countryMap.keys()], [...dataset.countryMap.values()]);

    // updating options does not trigger event, call ourselves
    onSelectInfection(infectionSelect.value);
    updateCharts();
}

main();