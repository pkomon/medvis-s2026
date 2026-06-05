import * as d3 from "d3";;
import { computeSummary } from "./util.js";

function callIfDefined(callback, ...args) {
    if (callback !== undefined) {
        callback(...args);
    }
}

export class BoxPlot {

    svg = undefined;
    boxes = undefined;
    width = undefined;
    height = undefined;
    x = undefined;
    xAxis = undefined;
    y = undefined;
    yAxis = undefined;
    nameAccessor = undefined;
    valueAccessor = undefined;

    onClickCallback = undefined;
    onMouseLeaveCallback = undefined;
    onMouseEnterCallback = undefined;

    summaryPerGroup = undefined;

    constructor(containerId, nameAccessor, valueAccessor) {
        this.nameAccessor = nameAccessor;
        this.valueAccessor = valueAccessor;

        // set the dimensions and margins of the graph
        this.margin = { top: 30, right: 30, bottom: 0, left: 100 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 600 - this.margin.top - this.margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select(`#${containerId}`)
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.hoverGroups = this.svg.append("g");
        this.boxes = this.svg.append("g")

        // y axis
        this.y = d3.scaleBand()
            .range([0, this.height])
            .paddingOuter(0.2)
            .paddingInner(0.2);
        this.yAxis = d3.axisLeft().scale(this.y);
        this.svg.append("g")
            .attr("class", "myYAxis");

        // y axis label
        this.svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", - this.height / 2)
            .attr("y", -this.margin.left + 20)
            .attr("transform", "rotate(-90)")
            .text("Antibiotic");

        // x axis
        this.x = d3.scaleLinear()
            .range([0, this.width]);
        this.xAxis = d3.axisTop()
            .scale(this.x)
            .tickFormat(d => `${d}%`);
        this.svg.append("g")
            .attr("class", "myXAxis");

        // x axis label
        this.svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", this.width / 2)
            .attr("y", -this.margin.top + 10)
            .text("Resistance");
    }

    setOnClickCallback(callback) {
        this.onClickCallback = callback;
    }

    /**
     * Registers callback for when mouse enters an element of the chart.
     * Callbacks are fired when entering single data items,
     * but also when entering the section for a specific group (single boxplot)
     * @param {function(string, any, SVGElement)} callback the callback to registers, parameters are
     *   type: string, string, which can be either "item" or "group"
     *   data: any, for type "item", the data item hovered, for "group" the name of "group" as string
     *   element: SVGElement, the element of the chart that is being hovered
     */
    setOnMouseEnter(callback) {
        this.onMouseEnterCallback = callback;
    }

    /**
     * Registers callback for when mouse leaves an element of the chart.
     * Callbacks are fired when entering single data items,
     * but also when leaving the section for a specific group (single box plot)
     * @param {function(string, any, SVGElement)} callback the callback to registers, parameters are
     *   type: string, string, which can be either "item" or "group"
     *   data: any, for type "item", the data item hovered, for "group" the name of "group" as string
     *   element: SVGElement, the element of the chart that is being hovered
     */
    setOnMouseLeave(callback) {
        this.onMouseLeaveCallback = callback;
    }

    setData(data, showDots = true) {
        // data format:
        // {"<box name>": [item1, item2, ...]}

        // compute summary statistics per group
        const summaryPerGroup = Object.entries(data)
            .sort(([key1, _], [key2, __]) => key1 > key2) // sort by group name
            .map(([key, array]) => [key, computeSummary(array.map(this.valueAccessor))]);
        this.summaryPerGroup = new Map(summaryPerGroup);

        // update x axis
        this.x.domain([0, 100]);
        this.svg.selectAll(".myXAxis").call(this.xAxis);

        // update y axis
        this.y.domain(summaryPerGroup.map(entry => entry[0]));
        this.svg.selectAll(".myYAxis")
            .call(this.yAxis)
            .selectAll("text")
            .attr("transform", "translate(-10,0)")
            .style("text-anchor", "end");

        const groupRows = this.hoverGroups
            .selectAll(".boxplot-row")
            .data(summaryPerGroup)
            .join("g")
            .attr("class", "boxplot-row")
            .attr("id", d => `boxplot-row_${d[0]}`)
            .on("mouseenter",
                (event, d) => callIfDefined(this.onMouseEnterCallback, "group", d[0], event.target.querySelector(".boxplot-row-bg"), event))
            .on("mouseleave",
                (event, d) => callIfDefined(this.onMouseLeaveCallback, "group", d[0], event.target.querySelector(".boxplot-row-bg"), event));

        // add row background (for hover effect)
        groupRows.selectAll(".boxplot-row-bg")
            .data(d => [d])
            .join("rect")
            .attr("class", "boxplot-row-bg")
            .attr("x", -this.margin.left)
            .attr("y", ([groupName, _]) => this.y(groupName) - this.y.padding() * this.y.bandwidth() * 0.5)
            .attr("width", this.width + this.margin.left + this.margin.right - 10)
            .attr("height", this.y.step())
            .attr("fill", "transparent")
            .attr("stroke", "none");

        // add boxes
        const boxGroups = groupRows
            .selectAll(".box-group")
            .data(d => [d])
            .join("g")
            .attr("class", "box-group");
        boxGroups.selectAll(".minMaxLine")
            .data(d => [d])
            .join("line")
            .attr("class", "minMaxLine")
            .attr("x1", ([_, item]) => this.x(item.min))
            .attr("x2", ([_, item]) => this.x(item.max))
            .attr("y1", ([groupName, _]) => this.y(groupName) + this.y.bandwidth() / 2)
            .attr("y2", ([groupName, _]) => this.y(groupName) + this.y.bandwidth() / 2)
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        boxGroups.selectAll(".quantileBox")
            .data(d => [d])
            .join("rect")
            .attr("class", "quantileBox")
            .attr("x", ([_, item]) => this.x(item.q1))
            .attr("width", ([_, item]) => this.x(item.q3 - item.q1))
            .attr("y", ([groupName, _]) => this.y(groupName))
            .attr("height", this.y.bandwidth())
            .attr("fill", "lightgrey")
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        boxGroups.selectAll(".medianLine")
            .data(d => [d])
            .join("line")
            .attr("class", "medianLine")
            .attr("x1", ([_, item]) => this.x(item.median))
            .attr("x2", ([_, item]) => this.x(item.median))
            .attr("y1", ([groupName, _]) => this.y(groupName))
            .attr("y2", ([groupName, _]) => this.y(groupName) + this.y.bandwidth())
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        // draw points
        const pointGroups = groupRows
            .selectAll(".points-group")
            .data(d => [d])
            .join("g")
            .attr("class", "points-group");
        const jitter = this.y.bandwidth() * 0.45;
        pointGroups.selectAll(".boxplot-data-items")
            .data(([groupName, _]) => data[groupName].map(item => [groupName, item]))
            .join("circle")
            .attr("class", "boxplot-data-items")
            .attr("r", 3)
            .attr("cx", ([_, item]) => this.x(this.valueAccessor(item)))
            .attr("cy", ([groupName, _]) => this.y(groupName) + this.y.bandwidth() / 2 + (Math.random() - 0.5) * jitter)
            .attr("fill", "black")
            .style("visibility", showDots ? "visible" : "hidden")
            .on("mouseenter", (event, d) => callIfDefined(this.onMouseEnterCallback, "item", d, event.target, event))
            .on("mouseleave", (event, d) => callIfDefined(this.onMouseLeaveCallback, "item", d, event.target, event))
            .on("click", (event, d) => callIfDefined(this.onClickCallback, "item", d, event.target, event));
    }
}
