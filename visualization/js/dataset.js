
class DataItem {
    /**
     * The year the test data was reported in.
     * @type {number}
     */
    year = undefined;

    /**
     * The body part where the test sample was extracted from,
     * e.g. Bloodstream, Urinary tract, Gastrointestinal, ect.
     * @type {string}
     */
    specimen = undefined;

    /**
     * Name of the pathogen that was tested.
     * @type {string}
     */
    pathogen = undefined;

    /**
     * Name of the antibiotic that was tested.
     * @type {string}
     */
    antibiotic = undefined;

    /**
     * Three-letter country code according to ISO 31661-1.
     * See https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3 for details.
     * @type {string}
     */
    iso3 = undefined;

    /**
     * Name of the country that reported the data.
     * @type {string}
     */
    countryName = undefined;

    /**
     * Name of the WHO region the country is part of.
     * @type {string}
     */
    whoRegionName = undefined;

    /**
     * Number of tests performed.
     * @type {number}
     */
    numTests = undefined;

    /**
     * Number of tests that indicate resistance.
     * @type {number}
     */
    numResistant = undefined;

    /**
     * The percentage of tests that indicated resistance.
     * (computed using {@link numResistant} / {@link numTests} * 100)
     * @type {number}
     */
    percentResistant = undefined;

    /**
     * Creates a new data item for a given row of a CSV file.
     * The order of columns is hardcoded here.
     * @param {string[]} values the string values of a single row in the CSV file
     * @returns {DataItem} new data item object for this row
     */
    static fromCsvRow(values) {
        const item = new DataItem();
        item.year = parseInt(values[0]);
        item.specimen = values[1];
        item.pathogen = values[2];
        item.antibiotic = values[3];
        item.iso3 = values[4];
        item.countryName = values[5];
        item.whoRegionName = values[6];
        item.numTests = parseInt(values[7]);
        item.numResistant = parseInt(values[8]);
        return item;
    }
}

class Dataset {
    /**
     * List of items in this dataset.
     * @type {DataItem[]}
     */
    items = [];
}

/**
 * Parses a string in CSV format into an array (rows) of arrays (columns per row).
 * @param {string} text plain text in CSV format
 * @param {string} lineSeparator separator to use for splitting string into rows
 * @param {string} columnSeparator separator to use for splitting rows into cells
 * @returns {string[][]} parsed result
 */
function parseCsv(text, lineSeparator = "\n", columnSeparator = ",") {
    return text.split(lineSeparator)
        .filter(line => line.length !== 0) // skip empty lines
        .map(line => line.split(columnSeparator));
}

/**
 * Fetches and parses the GLASS AMR dataset.
 * @returns {Promise<Dataset>}
 */
export async function fetchDataset() {
    const AMR_URL = "../../dataset/glass_amr.csv";

    const response = await fetch(AMR_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch dataset from ${AMR_URL}, status: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    const rows = parseCsv(csvText);
    const dataset = new Dataset();
    dataset.items = rows
        .slice(1) // skip header row
        .map(row => DataItem.fromCsvRow(row));
    return dataset;
}