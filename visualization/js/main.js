import { fetchDataset } from "./dataset.js"

/**
 * Adds updates options of a HTML <select> element.
 * @param {HTMLSelectElement} selectElement the select element to update
 * @param {string[]} values the options to use (will be used as text and value of each option)
 */
function updateSelect(selectElement, values) {
    selectElement.textContent = "";

    if (values.length === 0) {
        return;
    }

    const optionNodes = values.map((name, index) => {
        const optionNode = document.createElement("option");
        optionNode.value = name;
        optionNode.textContent = name;
        return optionNode;
    });
    selectElement.append(...optionNodes);
}

async function main() {
    const dataset = await fetchDataset();

    const specimenSet = new Set();
    dataset.items
        .map(item => item.specimen)
        .forEach(name => specimenSet.add(name));
    const uniqueSpecimen = new Array(...specimenSet.keys());

    const select = document.getElementById("specimen-select");

    select.addEventListener("change", (event) => {
        console.log(event);
        //TODO update other select based on selection
    });
    updateSelect(select, uniqueSpecimen);
    //...
}

main();