import * as d3 from "d3";
import { callIfDefined } from "./util.js";

export class LineChart {
    svg = undefined;
    width = undefined;
    height = undefined;
    x = undefined;
    xAxis = undefined;
    y = undefined;
    yAxis = undefined;
    lines = {};
    root = undefined;
    linesContainer = undefined;
    uncertainContainer = undefined;
    guideContainer = undefined;
    onPointHoverCallback = undefined;

    constructor(containerId, xAccessor, yAccessorLine, yAccessorUncertain, desiredWidth = 200, desiredHeight = 120, title, indicatorVisible = false) {
        this.xAccessor = xAccessor;
        this.yAccessorLine = yAccessorLine;
        this.yAccessorUncertain = yAccessorUncertain; //TODO document
        this.root = d3.select(`#${containerId}`);

        // set the dimensions and margins of the graph
        const margin = { top: 25, right: 25, bottom: 25, left: 35 };
        const width = desiredWidth - margin.left - margin.right;
        const height = desiredHeight - margin.top - margin.bottom;
        this.width = width;
        this.height = height;

        // append the svg object to the body of the page
        this.svg = this.root
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        this.linesContainer = this.svg.append("g");
        this.uncertainContainer = this.svg.append("g");
        this.guideContainer = this.svg.append("g")
            .attr("class", "line-guide")
            .style("display", "none");
        this.guideContainer.append("line")
            .attr("class", "guide-line guide-line-x")
            .attr("y1", 0)
            .attr("y2", height);
        this.guideContainer.append("line")
            .attr("class", "guide-line guide-line-y")
            .attr("x1", 0)
            .attr("x2", width);

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
            .ticks(3, "d")
            .tickFormat(d => `${d}%`);
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
                .style("font-size", "12px")
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

    setOnPointHoverCallback(callback) {
        this.onPointHoverCallback = callback;
    }

    setGuide(year, value) {
        if (year === undefined || value === undefined) {
            this.clearGuide();
            return;
        }

        const x = this.x(year);
        const y = this.y(value);
        this.guideContainer.style("display", null);
        this.guideContainer.select(".guide-line-x")
            .attr("x1", x)
            .attr("x2", x);
        this.guideContainer.select(".guide-line-y")
            .attr("y1", y)
            .attr("y2", y);
    }

    clearGuide() {
        this.guideContainer.style("display", "none");
    }

    updateLines() {
        Object.keys(this.lines).forEach((name) => {
            const object = this.lines[name];
            const color = object.color;
            if (object.type === "line") {
                const lineData = object.data;
                const lineId = object.id;
                //const colorIndex = this.lines[name].colorIndex;

                const selection = this.linesContainer.selectAll(`.${lineId}`)
                    .data([lineData], this.xAccessor);

                // update the line
                selection
                    .join("path")
                    .attr("class", `${lineId} line-series`)
                    .attr("d", d3.line()
                        .x(d => this.x(this.xAccessor(d)))
                        .y(d => this.y(this.yAccessorLine(d))))
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 2.5);

                this.linesContainer.selectAll(`.${lineId}-point`)
                    .data(lineData)
                    .join("circle")
                    .attr("class", `${lineId}-point line-point`)
                    .attr("r", 5)
                    .attr("cx", d => this.x(this.xAccessor(d)))
                    .attr("cy", d => this.y(this.yAccessorLine(d)))
                    .attr("fill", "white")
                    .attr("stroke", color)
                    .attr("stroke-width", 2.5)
                    .style("pointer-events", "all")
                    .on("mouseenter", (event, d) => {
                        if (this.onPointHoverCallback !== undefined) {
                            this.onPointHoverCallback(name, event, d);
                        }
                    })
                    .on("mousemove", (event, d) => {
                        if (this.onPointHoverCallback !== undefined) {
                            this.onPointHoverCallback(name, event, d);
                        }
                    })
                    .on("mouseleave", (event, d) => {
                        if (this.onPointHoverCallback !== undefined) {
                            this.onPointHoverCallback(undefined, event, d);
                        }
                    });
            } else if (object.type === "uncertain") {
                const lineData = object.data;
                const lineId = object.id;
                //const colorIndex = this.lines[name].colorIndex;

                const selection = this.uncertainContainer.selectAll(`.${lineId}`)
                    .data([lineData], this.xAccessor);

                // update the line
                selection
                    .join("path")
                    .attr("class", `${lineId}`)
                    .attr("d", d3.area()
                        .x(d => this.x(this.xAccessor(d)))
                        .y0(d => this.y(this.yAccessorUncertain(d).min))
                        .y1(d => this.y(this.yAccessorUncertain(d).max)))
                    .attr("fill", "#d3e4e0");
                selection
                    .join("path")
                    .attr("class", `${lineId}`)
                    .attr("d", d3.area()
                        .x(d => this.x(this.xAccessor(d)))
                        .y0(d => this.y(this.yAccessorUncertain(d).q1))
                        .y1(d => this.y(this.yAccessorUncertain(d).q3)))
                    .attr("fill", "#69b3a2");

                selection
                    .join("path")
                    .attr("class", `${lineId}`)
                    .attr("d", d3.line()
                        .x(d => this.x(this.xAccessor(d)))
                        .y(d => this.y(this.yAccessorUncertain(d).median)))
                    .attr("fill", "none")
                    .attr("stroke", "black");
            }
        });
        this.linesContainer.raise();
        this.guideContainer.raise();
    }

    add(name, type, data, color) {
        if (type !== "line" && type !== "uncertain") {
            throw new Error(`Failed to add element to LineChart, invalid type: ${type}`);
        }

        this.lines[name] = { type: type, data: data, color: color, id: `line-${Object.keys(this.lines).length}` };
        this.updateLines();
    }

    removeLine(name) {
        if (this.lines[name] === undefined) {
            return;
        }
        const lineId = this.lines[name].id;
        delete this.lines[name];
        this.svg.selectAll(`.${lineId}`).remove();
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
    highlightedName = undefined;
    selectedName = undefined;
    onHoverCallback = undefined;
    onClickCallback = undefined;
    onPointHoverCallback = undefined;

    constructor(containerId, xAccessor, yAccessor, yAccessorUncertain) {
        //this.container = d3.select(`#${containerId}`);
        this.container = document.getElementById(containerId);
        this.xAccessor = xAccessor;
        this.yAccessor = yAccessor;
        this.yAccessorUncertain = yAccessorUncertain;
    }

    setOnHoverCallback(callback) {
        this.onHoverCallback = callback;
    }

    setOnClickCallback(callback) {
        this.onClickCallback = callback;
    }

    setOnPointHoverCallback(callback) {
        this.onPointHoverCallback = callback;
    }

    setGuide(year, value) {
        this.lineCharts.forEach(({ chart }) => chart.setGuide(year, value));
    }

    clearGuide() {
        this.lineCharts.forEach(({ chart }) => chart.clearGuide());
    }

    setHighlight(name) {
        this.highlightedName = name;
        this.updateStyles();
    }

    setSelection(name) {
        this.selectedName = name;
        this.updateStyles();
    }

    updateStyles() {
        this.lineCharts.forEach(({ name, element }) => {
            const activeName = this.highlightedName || this.selectedName;
            const isHighlighted = name === this.highlightedName;
            const isSelected = name === this.selectedName;
            element.classList.toggle("highlighted", isHighlighted);
            element.classList.toggle("selected", isSelected);
            element.classList.toggle("dimmed", activeName !== undefined && name !== activeName);

            const path = element.querySelector(".line-series");
            if (path !== null) {
                path.setAttribute("stroke", isSelected ? "#c84f31" : isHighlighted ? "#2f7fbd" : "black");
                path.setAttribute("stroke-width", isSelected || isHighlighted ? "3.5" : "2.5");
            }
        });
    }

    /**
     * Sets data of this chart.
     * 
     * Data is an object with string keys and arrays as value. Each array contains time series data.
     * 
     * @param {Object} data 
     */
    setData(data) {
        this.lineCharts = Object.keys(data).map((key, index) => {
            const object = data[key];
            const element = document.createElement("div");
            element.id = `${this.container.id}-${index}`;
            element.className = "linechart-container";
            this.container.appendChild(element);
            const smallLineChart = new LineChart(element.id, this.xAccessor, this.yAccessor, this.yAccessorUncertain, undefined, undefined, key);
            smallLineChart.setOnPointHoverCallback((seriesName, event, item) => callIfDefined(this.onPointHoverCallback, key, seriesName, event, item));
            const series = object.series || [{ name: key, type: object.type, data: object.data, color: "black" }];
            series.forEach(item => smallLineChart.add(item.name, item.type, item.data, item.color || "black"));
            element.addEventListener("mouseenter", () => callIfDefined(this.onHoverCallback, key));
            element.addEventListener("mouseleave", () => callIfDefined(this.onHoverCallback, undefined));
            element.addEventListener("click", () => callIfDefined(this.onClickCallback, key));
            return { name: key, element, chart: smallLineChart };
        });
        this.updateStyles();
    }

    removeAll() {
        this.container.textContent = "";
        this.lineCharts = [];
    }
}
