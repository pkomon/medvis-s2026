import * as d3 from "d3";

import { fetchDataset } from "./dataset.js"
import { BarChart } from "./bar-chart.js";
import { BoxPlot } from "./boxplot.js";
import { MultipleSmallLineCharts } from "./line-chart.js";
import { computeSummary, formatInteger, formatPercent, groupBy } from "./util.js";

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

function createDetailsHtml(item, total, rank, isCountryMode) {
    const susceptible = 100 - item.percentResistant;
    return `
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
            <div ${isCountryMode ? "" : "hidden"}>
                <span class="detail-label" title="Higher rank means higher susceptibility against bacteria in year in country compared to other antibiotics."
                    style="
                        cursor: help;
                        text-decoration: underline dotted;
                        text-underline-offset: 2px;
                    ">Rank</span>
                <span class="detail-value">${rank} of ${total}</span>
            </div>
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
}

async function main() {
    const dataset = await fetchDataset();

    const bacteriaSelect = document.getElementById("bacteria-select");
    const yearSelect = document.getElementById("year-select");
    const countrySelect = document.getElementById("country-select");
    const compareCountrySelect = document.getElementById("compare-country-select");
    const regionSelect = document.getElementById("region-select");
    const detailContentSelected = document.getElementById("detail-content-selected");
    const detailContentHovered = document.getElementById("detail-content-hovered");
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.hidden = true;
    document.body.appendChild(tooltip);

    let currentLineChartData = [];
    let currentBarChartData = [];
    let hoveredAntibiotic = undefined;
    let selectedAntibiotic = undefined;
    let hoveredItem = undefined;
    let selectedItem = undefined;

    const getActiveAntibiotic = () => hoveredAntibiotic || selectedAntibiotic;

    const getCurrentItem = (antibioticName) => currentBarChartData
        .find(item => item.antibiotic === antibioticName);

    const moveTooltip = (event) => {
        const margin = 14;
        tooltip.style.left = `${event.clientX + margin}px`;
        tooltip.style.top = `${event.clientY + margin}px`;
    };

    const showTooltip = (event, title, rows) => {
        tooltip.innerHTML = `
            <div class="tooltip-title">${title}</div>
            ${rows.map(([label, value]) => `
                <div class="tooltip-row">
                    <span class="tooltip-label">${label}</span>
                    <span>${value}</span>
                </div>
            `).join("")}
        `;
        moveTooltip(event);
        tooltip.hidden = false;
    };

    const hideTooltip = () => {
        tooltip.hidden = true;
    };

    const showDataItemTooltip = (event, item, title = item.antibiotic) => {
        showTooltip(event, title, [
            ["Resistance", formatPercent(item.percentResistant)],
            ["Resistant / ASTs", `${formatInteger(item.numResistant)} / ${formatInteger(item.numTests)}`],
            ["Country", item.countryName],
            ["Year", item.year],
        ]);
    };

    const updateDetailsPanel = (detailsPanel, item, hover = false) => {
        if (item === undefined) {
            detailsPanel.className = "detail-content detail-empty";
            detailsPanel.textContent = `${hover ? "Hover" : "Click"} an antibiotic to inspect resistance details.`;
            return;
        }

        detailsPanel.className = "detail-content";
        const sorted = [...currentBarChartData]
            .filter(d => d.percentResistant > 0)
            .sort((a, b) => a.percentResistant - b.percentResistant);
        const rank = sorted.findIndex(d => d.antibiotic === item.antibiotic) + 1;
        const total = sorted.length;
        const isCountryMode = document.getElementById("area-mode-select").value === "Country";
        detailsPanel.innerHTML = createDetailsHtml(item, total, rank, isCountryMode);
    };

    const updateLinkedState = () => {
        barChart.setHighlightRow(hoveredAntibiotic);
        barChart.setHighlightItem(hoveredItem);
        barChart.setSelectionItem(selectedItem);
        lineChart.setHighlightChart(hoveredAntibiotic);
        lineChart.setHighlightItem(hoveredItem);
        lineChart.setSelectionItem(selectedItem);
        updateDetailsPanel(detailContentSelected, selectedItem);
        updateDetailsPanel(detailContentHovered, hoveredItem, true);
    };

    const setHoveredAntibiotic = (antibioticName, event, item) => {
        hoveredAntibiotic = antibioticName;
        hoveredItem = antibioticName === undefined ? undefined : item;
        updateLinkedState();
        if (antibioticName !== undefined && item !== undefined && event !== undefined) {
            showDataItemTooltip(event, item);
        } else {
            hideTooltip();
        }
    };

    const setSelectedAntibiotic = (antibioticName, event, item) => {
        const isSameSelection = selectedItem !== undefined && selectedItem.equalsId(item);
        selectedAntibiotic = isSameSelection ? undefined : antibioticName;
        selectedItem = selectedAntibiotic === undefined ? undefined : item;
        updateLinkedState();
    };

    const updateCharts = () => {
        const [infection, pathogen] = bacteriaSelect.value.split("_");
        const year = parseInt(yearSelect.value);
        const country = countrySelect.value;
        const compareCountry = compareCountrySelect.value;
        const regionName = regionSelect.value;
        console.log(`Update chart, infection type=${infection}, pathogen=${pathogen}`);

        // update line charts
        lineChart.removeAll();
        currentLineChartData = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && item.iso3 === country)
            .sort((a, b) => a.antibiotic.localeCompare(b.antibiotic) || a.year - b.year);
        const comparisonLineChartData = compareCountry !== "" && compareCountry !== country
            ? dataset.items
                .filter(item => item.infection === infection
                    && item.pathogen === pathogen
                    && item.iso3 === compareCountry)
                .sort((a, b) => a.antibiotic.localeCompare(b.antibiotic) || a.year - b.year)
            : [];
        const primaryLineData = groupBy(currentLineChartData, item => item.antibiotic);
        const comparisonLineData = groupBy(comparisonLineChartData, item => item.antibiotic);
        const antibioticNames = [...new Set([...Object.keys(primaryLineData), ...Object.keys(comparisonLineData)])];
        const perLineData = Object.fromEntries(antibioticNames
            .map(antibiotic => {
                const series = [];
                if (primaryLineData[antibiotic] !== undefined) {
                    series.push({
                        name: dataset.countryIndex.get(country),
                        type: "line",
                        data: primaryLineData[antibiotic],
                        color: "black",
                    });
                }
                if (comparisonLineData[antibiotic] !== undefined) {
                    series.push({
                        name: dataset.countryIndex.get(compareCountry),
                        type: "line",
                        data: comparisonLineData[antibiotic],
                        color: "#2f7fbd",
                    });
                }
                return [antibiotic, { series }];
            }));
        lineChart.setData(perLineData);

        // update bar chart
        currentBarChartData = currentLineChartData.filter(item => item.year === year);
        if (selectedAntibiotic !== undefined && getCurrentItem(selectedAntibiotic) === undefined) {
            selectedAntibiotic = undefined;
            //selectedItem = undefined;
        }
        barChart.setData(currentBarChartData);
        updateLinkedState();

        // update boxplot
        const isGlobalRegion = regionName === "Global";
        const boxPlotData = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && item.year === year
                && (isGlobalRegion || item.whoRegionName === regionName));
        const perBoxData = groupBy(boxPlotData, item => item.antibiotic);
        boxPlot.setData(perBoxData);

        // update area/line charts
        lineChartRegions.removeAll();
        const regionLineChartItems = dataset.items
            .filter(item => item.infection === infection
                && item.pathogen === pathogen
                && (isGlobalRegion || item.whoRegionName === regionName));
        const perAntibioticDataInRegion = groupBy(regionLineChartItems, item => item.antibiotic);
        const regionLineChartData = Object.fromEntries(Object.entries(perAntibioticDataInRegion)
            .map(([antibiotic, itemsWithAntibiotic]) => {
                const uncertainData = Object.entries(groupBy(itemsWithAntibiotic, item => item.year))
                    .map(([year, itemsForYear]) => {
                        const values = itemsForYear.map(item => item.percentResistant);
                        return { year: year, ...computeSummary(values) };
                    });
                return [antibiotic, { type: "uncertain", data: uncertainData }];
            }));
        lineChartRegions.setData(regionLineChartData);
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
    compareCountrySelect.addEventListener("change", (event) => updateCharts());
    regionSelect.addEventListener("change", (event) => updateCharts());

    document.getElementById("area-mode-select").addEventListener("change", (event) => {
        updateCharts();
        const isCountryMode = event.target.value === "Country";
        document.querySelectorAll(".country-mode").forEach((element) => element.hidden = !isCountryMode);
        document.querySelectorAll(".region-mode").forEach((element) => element.hidden = isCountryMode);
        hoveredAntibiotic = undefined;
        selectedAntibiotic = undefined;
        selectedItem = undefined;
        updateDetailsPanel(detailContentSelected, undefined);
        updateDetailsPanel(detailContentHovered, undefined, true);
    });

    const barChart = new BarChart("barchart", item => item.antibiotic, item => item.percentResistant);
    const boxPlot = new BoxPlot("boxplot", item => item.antibiotic, item => item.percentResistant);
    const lineChart = new MultipleSmallLineCharts("linechart-grid", item => item.year, item => item.percentResistant);
    const lineChartRegions = new MultipleSmallLineCharts("region-linechart-grid",
        item => item.year, item => item.percentResistant, item => item);
    barChart.setOnHoverItemCallback(setHoveredAntibiotic);
    barChart.setOnClickItemCallback(setSelectedAntibiotic);
    barChart.setOnHoverRowCallback((antibioticName) => {
        barChart.setHighlightRow(antibioticName);
        lineChart.setHighlightChart(antibioticName);
    });
    lineChart.setOnHoverChartCallback(setHoveredAntibiotic);
    lineChart.setOnPointHoverCallback((antibioticName, seriesName, event, item) => {
        if (antibioticName === undefined) {
            setHoveredAntibiotic(undefined);
            lineChart.clearGuide();
            return;
        }
        hoveredAntibiotic = antibioticName;
        hoveredItem = item;
        updateLinkedState();
        lineChart.setGuide(item.year, item.percentResistant);
        showDataItemTooltip(event, item, `${antibioticName} (${seriesName})`);
    });
    lineChart.setOnPointClickCallback((antibioticName, seriesName, event, item) => {
        setSelectedAntibiotic(antibioticName, event, item);
    });
    boxPlot.setOnClickCallback((type, item, element, event) => {
        if (type === "item") {
            selectedItem = item;
            updateDetailsPanel(detailContentSelected, item);
            boxPlot.removeHighlightSelected();
            d3.select(element)
                .classed("highlighted-selected", true);
        }
    });

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
    updateSelectGroup(compareCountrySelect, countrySelectData);
    compareCountrySelect.insertBefore(new Option("None", ""), compareCountrySelect.firstChild);
    compareCountrySelect.value = "";
    updateSelectGroup(regionSelect, { "values": ["Global", ...dataset.regionIndex.keys()] });

    // updating options does not trigger event, call ourselves
    updateCharts();


    boxPlot.setOnMouseEnter((mode, dataItem, element, event) => {
        //console.log("Mouse enter event for boxplot: ", mode, dataItem, element);
        if (mode === "item") {
            showDataItemTooltip(event, dataItem, `${dataItem.antibiotic} (${dataItem.countryName})`);
            updateDetailsPanel(detailContentHovered, dataItem, true);
            d3.select(element)
                .classed("highlighted-hovered", true);
        } else if (mode === "group") {
            lineChartRegions.setHighlightChart(dataItem);
            boxPlot.highlightRow(dataItem);
        }
    });
    boxPlot.setOnMouseLeave((mode, dataItem, element, event) => {
        //console.log("Mouse leave event for boxplot: ", mode, dataItem, element);
        if (mode === "item") {
            hideTooltip();
            updateDetailsPanel(detailContentHovered, undefined, true);
            d3.select(element)
                .classed("highlighted-hovered", false);
        } else if (mode === "group") {
            lineChartRegions.setHighlightChart(undefined);
            boxPlot.removeRowHighlight(dataItem);
        }
    });
}

main();
