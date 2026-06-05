import * as d3 from "d3";
import { callIfDefined } from "./util.js";

export class BarChart {
    svg = undefined;
    hoverGroups = undefined;
    content = undefined;
    width = undefined;
    height = undefined;
    margin = undefined;
    x = undefined;
    xAxis = undefined;
    y = undefined;
    yAxis = undefined;
    nameAccessor = undefined;
    valueAccessor = undefined;
    onHoverItemCallback = undefined;
    onHoverRowCallback = undefined;
    onClickItemCallback = undefined;
    highlightedName = undefined;
    highlightedItem = undefined;
    selectedName = undefined;

    constructor(containerId, nameAccessor, valueAccessor) {
        this.nameAccessor = nameAccessor;
        this.valueAccessor = valueAccessor;

        // set the dimensions and margins of the graph
        this.margin = { top: 50, right: 50, bottom: 0, left: 120 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select(`#${containerId}`)
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.hoverGroups = this.svg.append("g");
        this.content = this.svg.append("g");

        // y axis
        this.y = d3.scaleBand()
            .range([0, this.height])
            .padding(0.2);
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
            .attr("y", -this.margin.top + 20)
            .text("Resistance");
    }

    setOnClickItemCallback(callback) {
        this.onClickItemCallback = callback;
    }

    setOnHoverItemCallback(callback) {
        this.onHoverItemCallback = callback;
    }

    setOnHoverRowCallback(callback) {
        this.onHoverRowCallback = callback;
    }

    setHighlightRow(name) {
        this.highlightedName = name;
        this.updateStyles();
    }

    setHighlightItem(item) {
        this.highlightedItem = item;
        this.updateStyles();
    }

    setSelection(name) {
        this.selectedName = name;
        this.updateStyles();
    }

    updateStyles() {
        // update row background
        this.hoverGroups.selectAll(".bar-row-bg")
            .classed("highlighted", d => this.nameAccessor(d) === this.highlightedName);

        // update bar background
        this.content.selectAll("rect")
            .classed("highlighted", d => d.equalsId(this.highlightedItem))
            .classed("selected", d => this.nameAccessor(d) === this.selectedName)
            .classed("dimmed", d => {
                const activeName = this.highlightedName || this.selectedName;
                return activeName !== undefined && this.nameAccessor(d) !== activeName;
            });
    }

    setData(data, sortBarsByValue = true) {
        if (sortBarsByValue) {
            data = data.sort((a, b) => this.valueAccessor(a) < this.valueAccessor(b));
        }

        // update x axis
        const maxX = d3.max(data, this.valueAccessor)
        this.x.domain([0, maxX]);
        this.svg.selectAll(".myXAxis").call(this.xAxis);

        // update y axis
        this.y.domain(data.map(this.nameAccessor));
        this.svg.selectAll(".myYAxis")
            .call(this.yAxis)
            .selectAll("text")
            .attr("transform", "translate(-4,0)")
            .style("text-anchor", "end");

        // add row background (for hover effect)
        this.hoverGroups.selectAll(".bar-row-bg")
            .data(data, this.nameAccessor)
            .join("rect")
            .attr("class", "bar-row-bg")
            .attr("x", -this.margin.left)
            .attr("y", d => this.y(this.nameAccessor(d)) - this.y.padding() * this.y.bandwidth() * 0.5)
            .attr("width", this.width + this.margin.left + this.margin.right - 10)
            .attr("height", this.y.step())
            .on("mouseenter", (event, d) => callIfDefined(this.onHoverRowCallback, this.nameAccessor(d), event, d))
            .on("mousemove", (event, d) => callIfDefined(this.onHoverRowCallback, this.nameAccessor(d), event, d))
            .on("mouseleave", (event, d) => callIfDefined(this.onHoverRowCallback, undefined, event, d));

        // update bars
        this.content.selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", 0)
            .attr("y", d => this.y(this.nameAccessor(d)))
            .attr("width", d => this.x(this.valueAccessor(d)))
            .attr("height", this.y.bandwidth())
            .attr("fill", "#69b3a2")
            .attr("class", "bar")
            .on("mouseenter", (event, d) => callIfDefined(this.onHoverItemCallback, this.nameAccessor(d), event, d))
            .on("mousemove", (event, d) => callIfDefined(this.onHoverItemCallback, this.nameAccessor(d), event, d))
            .on("mouseleave", (event, d) => callIfDefined(this.onHoverItemCallback, undefined, event, d))
            .on("click", (event, d) => callIfDefined(this.onClickItemCallback, this.nameAccessor(d), event, d));
        this.updateStyles();
    }
}
