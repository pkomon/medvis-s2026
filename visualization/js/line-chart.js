import * as d3 from "d3";

export class LineChart {
    svg = undefined;
    width = undefined;
    height = undefined;
    x = undefined;
    xAxis = undefined;
    y = undefined;
    yAxis = undefined;
    lines = {};

    constructor(containerId, xAccessor, yAccessor, desiredWidth = 200, desiredHeight = 80, title, indicatorVisible = false) {
        this.xAccessor = xAccessor;
        this.yAccessor = yAccessor;

        // set the dimensions and margins of the graph
        const margin = { top: 15, right: 25, bottom: 25, left: 25 };
        const width = desiredWidth - margin.left - margin.right;
        const height = desiredHeight - margin.top - margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select(`#${containerId}`)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // indicator for current time
        this.indicator = this.svg
            .append("line")
            .attr("x1", 10)
            .attr("y1", 0)
            .attr("x2", 10)
            .attr("y2", height)
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "10 5")
            .attr("stroke-width", 5)
            .attr("id", "indicator");
        this.setIndicatorVisible(indicatorVisible);

        // x axis
        this.xBase = d3.scaleLinear()
            .range([0, width])
            .domain([2020, 2023]); //TODO dont hardcode
        this.x = this.xBase.copy();
        this.xAxis = d3.axisBottom()
            .scale(this.x)
            .ticks(4, "d");
        this.svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .attr("class", "myXAxis")
            .call(this.xAxis);

        // y axis
        this.y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, 100]);
        this.yAxis = d3.axisLeft()
            .scale(this.y)
            .ticks(3, "d");
        this.svg.append("g")
            .attr("class", "myYAxis")
            .call(this.yAxis);

        // title if defined
        if (title !== undefined) {
            this.svg.append("g")
                .attr("class", "linechart-title")
                .append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", "0%")
                .text(title);
        }
    }

    setIndicator(value) {
        this.indicator
            .attr("x1", this.x(value))
            .attr("x2", this.x(value));
    }

    setIndicatorVisible(visible) {
        this.indicator.style("visibility", visible ? "visible" : "hidden");
    }

    updateLines() {
        Object.keys(this.lines).forEach((name) => {
            const lineObject = this.lines[name];
            const data = lineObject.data;
            const color = lineObject.color;
            //const colorIndex = this.lines[name].colorIndex;

            const lineName = `line-${name}`;
            const selection = this.svg.selectAll(`.${lineName}`)
                .data([data], this.xAccessor);

            // update the line
            selection
                .join("path")
                .attr("class", lineName)
                .attr("d", d3.line()
                    .x(d => this.x(this.xAccessor(d)))
                    .y(d => this.y(this.yAccessor(d))))
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2.5);

            selection
                .data(data)
                .join("circle")
                .attr("r", 3)
                .attr("cx", d => this.x(this.xAccessor(d)))
                .attr("cy", d => this.y(this.yAccessor(d)))
                .attr("stroke", color)
                .attr("stroke-width", 2.5);
        });
    }

    addLine(name, data, color) {
        this.lines[name] = { data: data, color: color };
        this.updateLines();
    }

    removeLine(name) {
        if (this.lines[name] === undefined) {
            return;
        }
        delete this.lines[name];
        this.svg.selectAll(`.line-${name}`).remove();
        this.updateLines();
    }

    removeAllLines() {
        Object.keys(this.lines).forEach(name => this.removeLine(name));
    }
}


export class MultipleSmallLineCharts {

    /** @type {HTMLDivElement} */
    container = undefined;

    /** @type {LineChart} */
    lineCharts = [];

    constructor(containerId, xAccessor, yAccessor) {
        //this.container = d3.select(`#${containerId}`);
        this.container = document.getElementById(containerId);
        this.xAccessor = xAccessor;
        this.yAccessor = yAccessor;
    }

    /**
     * Sets data of this chart.
     * 
     * Data is an object with string keys and arrays as value. Each array contains time series data.
     * 
     * @param {Object} data 
     */
    setData(data) {
        Object.keys(data).map(key => {
            const value = data[key];
            const element = document.createElement("div");
            element.id = `linechart-container-${key}`;
            this.container.appendChild(element);
            const smallLineChart = new LineChart(element.id, this.xAccessor, this.yAccessor, undefined, undefined, key);
            smallLineChart.addLine(key, value, "black");
            return smallLineChart;
        });
    }

    removeAll() {
        this.container.textContent = "";
    }
}