import * as d3 from "d3";

import { fetchDataset } from "./dataset.js"
import { BarChart } from "./bar-chart.js";
import { BoxPlot } from "./boxplot.js";
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
function updateSelectGroup(selectElement, data, compoundValues = false, compoundNames = false) {
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
                optionNode.value = compoundValues ? `${optgroupName}_${value}` : value;
                optionNode.text = compoundNames ? `${optgroupName} - ${names[index]}` : names[index];
                return optionNode;
            });
            optgroupNode.append(...optionNodes);
            return optgroupNode;
        });
    }
    selectElement.append(...nodes);
}

function groupBy(data, accessor) {
    const result = new Map();
    data.forEach(item => {
        const array = result.getOrInsert(accessor(item), []);
        array.push(item);
    });
    return Object.fromEntries(result);
}

async function main() {
    const dataset = await fetchDataset();

    const bacteriaSelect = document.getElementById("bacteria-select");
    const yearSelect = document.getElementById("year-select");
    const countrySelect = document.getElementById("country-select");

    const updateCharts = () => {
        const [infection, pathogen] = bacteriaSelect.value.split("_");
        const year = parseInt(yearSelect.value);
        const country = countrySelect.value;
        console.log(`Update chart, infection type=${infection}, pathogen=${pathogen}`);

        // update line charts
        lineChart.removeAll();
        const lineChartData = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && item.iso3 === country)
            .sort((a, b) => a.antibiotic < b.antibiotic && a.year < b.year);
        const perLineData = groupBy(lineChartData, item => item.antibiotic);
        lineChart.setData(perLineData);

        // update bar chart
        const barChartData = lineChartData.filter(item => item.year === year);
        barChart.setData(barChartData);

        // update boxplot
        //TODO dont hardcore global data, use region select
        const boxPlotData = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && item.year === year);
        const perBoxData = groupBy(boxPlotData, item => item.antibiotic);
        boxPlot.setData(perBoxData);
    };

    // TODO for each selection, we should update all others with available data - but this might be confusing to user?
    // is there a better option or a least a way to make it more clearly?
    // one way would be to leave options there, but disable them (disabled attribute); i think for year and country this would be nice
    // TODO group options for country select by WHO region (use optgroup element), within group, alphabetic order?
    // also, now that i think about it, maybe we should use optgroup also for infection -> pathogen?
    // i think using optgroup and disabled makes the experience much better already
    // TODO make searchable (this might be annoying to do, but searching countries would be very useful)

    bacteriaSelect.addEventListener("change", (event) => updateCharts());
    yearSelect.addEventListener("change", (event) => updateCharts());
    countrySelect.addEventListener("change", (event) => updateCharts());

    document.getElementById("area-mode-select").addEventListener("change", (event) => {
        updateCharts();
        const isCountryMode = event.target.value === "Country";
        document.getElementById("barchart-container").hidden = !isCountryMode;
        document.getElementById("boxplot-container").hidden = isCountryMode;
    });

    const barChart = new BarChart("barchart", item => item.antibiotic, item => item.percentResistant);
    const boxPlot = new BoxPlot("boxplot", item => item.antibiotic, item => item.percentResistant);
    const lineChart = new MultipleSmallLineCharts("linechart-grid", item => item.year, item => item.percentResistant);

    // fill options for dropdown
    const bacteriaSelectData = Object.fromEntries([...dataset.infectionIndex.entries()] // infection -> pathogen -> antibiotic
        .map(([key, value]) => [key, { "values": [...value.keys()] }]));
    updateSelectGroup(bacteriaSelect, bacteriaSelectData, true, true);

    const countrySelectData = Object.fromEntries([...dataset.regionIndex.entries()]
        .map(([regionName, isoCodeSet]) => {
            const values = [...isoCodeSet.keys()];
            const names = values.map(code => dataset.countryIndex.get(code));
            return [regionName, { "values": values, "names": names }];
        }));
    updateSelectGroup(countrySelect, countrySelectData);

    // updating options does not trigger event, call ourselves
    updateCharts();

    boxPlot.setOnMouseEnter((mode, dataItem, element) => {
        if (mode === "item") {
            d3.select(element)
                .transition()
                .duration(100)
                .attr("fill", "red");
            //TODO show popup with details (using dataItem)
        }
    });
    boxPlot.setOnMouseLeave((mode, dataItem, element) => {
        if (mode === "item") {
            d3.select(element)
                .transition()
                .duration(100)
                .attr("fill", "black");
            //TODO hide popup
        }
    });
}

main();