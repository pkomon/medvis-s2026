import * as d3 from "d3";

export function computeSummary(array) {
    const sorted = array.sort((a, b) => a > b);
    const q1 = d3.quantile(sorted, 0.25);
    const median = d3.quantile(sorted, 0.5);
    const q3 = d3.quantile(sorted, 0.75);
    //const interQuantileRange = q3 - q1;
    //const min = q1 - 1.5 * interQuantileRange;
    //const max = q1 + 1.5 * interQuantileRange;
    const min = sorted[0];
    const max = sorted.at(-1);
    return { "min": min, "q1": q1, "median": median, "q3": q3, "max": max };
}