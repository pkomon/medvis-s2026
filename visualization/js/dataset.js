
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
    infection = undefined;

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

    equalsId(other) {
        return other !== undefined
            && other instanceof DataItem
            && this.year === other.year
            && this.infection === other.infection
            && this.pathogen === other.pathogen
            && this.antibiotic === other.antibiotic
            && this.iso3 === other.iso3;
    }

    /**
     * Creates a new data item for a given row of a CSV file.
     * The order of columns is hardcoded here.
     * @param {Array<string>} values the string values of a single row in the CSV file
     * @returns {DataItem} new data item object for this row
     */
    static fromCsvRow(values) {
        const item = new DataItem();
        item.year = parseInt(values[0]);
        item.infection = values[1];
        item.pathogen = values[2];
        item.antibiotic = values[3];
        item.iso3 = values[4];
        item.countryName = values[5];
        item.whoRegionName = values[6];
        item.numTests = parseInt(values[7]);
        item.numResistant = parseInt(values[8]);
        item.percentResistant = parseFloat(values[9]);
        return item;
    }
}

class Dataset {
    /**
     * List of items in this dataset.
     * @type {DataItem[]}
     */
    items = [];

    /**
     * Map of infection names to map of pathogen names to set of antibiotics.
     * (infection (Map) -> pathogen (Map) -> antibiotics (Set))
     * @type {Map<string, Map<string, Set>>}
     */
    infectionIndex = new Map();

    /**
     * Map of WHO region name to ISO3 codes.
     * @type {Map<string, string>}
     */
    regionIndex = new Map();


    /**
     * Map of country ISO3 codes to country names.
     * @type {Map<string, string>}
     */
    countryIndex = new Map();

    constructor(items) {
        this.items = items;
        this.initIndices();
    }

    /**
     * Returns unique fields of data items.
     * @param {function(DataItem)} accessor function that takes a data item and returns some field
     * @returns {Array<string|number>} unique values
     */
    getUnique(accessor) {
        const set = new Set();
        this.items
            .map(item => accessor(item))
            .forEach(name => set.add(name));
        return new Array(...set.keys());
    }

    /**
     * Populates helper mappings {@link infectionIndex}, {@link countryIndex}, {@link regionIndex}
     */
    initIndices() {
        this.items.forEach(item => {
            const pathogenIndex = this.infectionIndex.getOrInsert(item.infection, new Map());
            const antibioticsSet = pathogenIndex.getOrInsert(item.pathogen, new Set());
            antibioticsSet.add(item.antibiotic);

            const regionSet = this.regionIndex.getOrInsert(item.whoRegionName, new Set());
            regionSet.add(item.iso3);

            this.countryIndex.set(item.iso3, item.countryName);
        });

        //sort by region name and country name
        this.regionIndex = new Map([...this.regionIndex.entries()]
            .sort(([regionName1, _], [regionName2, __]) => regionName1 > regionName2)
            .map(([whoRegionName, isoCodeSet]) => [
                whoRegionName,
                new Set([...isoCodeSet.keys()]
                    .map(isoCode => [isoCode, this.countryIndex.get(isoCode)])
                    .sort(([_, countryName1], [__, countryName2]) => countryName1 > countryName2)
                    .map(([isoCode, _], __) => isoCode))
            ]));
    }
}

/**
 * Parses a string in CSV format into an array (rows) of arrays (columns per row).
 * @param {string} text plain text in CSV format
 * @param {string} lineSeparator separator to use for splitting string into rows
 * @param {string} columnSeparator separator to use for splitting rows into cells
 * @returns {Array<Array<string>>} parsed result
 */
function parseCsv(text, lineSeparator = "\n", columnSeparator = ";") {
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
    const dataItems = parseCsv(csvText)
        .slice(1) // skip header row
        .map(row => DataItem.fromCsvRow(row));
    return new Dataset(dataItems);
}
