import * as d3 from "d3";;
import { computeSummary } from "./util.js";

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
        const margin = { top: 30, right: 30, bottom: 0, left: 100 };
        this.width = 800 - margin.left - margin.right;
        this.height = 600 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select(`#${containerId}`)
            .append("svg")
            .attr("width", this.width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        this.boxes = this.svg.append("g");
        this.points = this.svg.append("g");

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
            .attr("y", -margin.left + 20)
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
            .attr("y", -margin.top + 10)
            .text("Resistance");
    }

    callCallback(event, dataItem) {
        //console.log(event, dataItem);
        if (event.type === "mouseenter" && this.onMouseEnterCallback !== undefined) {
            this.onMouseEnterCallback("item", dataItem, event.target, event);
        } else if (event.type === "mouseleave" && this.onMouseLeaveCallback !== undefined) {
            this.onMouseLeaveCallback("item", dataItem, event.target, event);
        } else if (event.type === "click" && this.onClickCallback !== undefined) {
            this.onClickCallback("item", dataItem, event.target, event);
        }
    }

    setOnClickCallback(callback) {
        this.onClickCallback = callback;
    }

    /**
     * 
     * @param {function(string, any, SVGElement)} callback 
     */
    setOnMouseEnter(callback) {
        this.onMouseEnterCallback = callback;
    }

    /**
     * 
     * @param {function(string, any, SVGElement)} callback 
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

        // draw boxes
        this.boxes.selectAll(".minMaxLine")
            .data(summaryPerGroup)
            .join("line")
            .attr("class", "minMaxLine")
            .attr("x1", ([_, item]) => this.x(item.min))
            .attr("x2", ([_, item]) => this.x(item.max))
            .attr("y1", ([groupName, _]) => this.y(groupName) + this.y.bandwidth() / 2)
            .attr("y2", ([groupName, _]) => this.y(groupName) + this.y.bandwidth() / 2)
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        this.boxes.selectAll(".quantileBox")
            .data(summaryPerGroup)
            .join("rect")
            .attr("class", "quantileBox")
            .attr("x", ([_, item]) => this.x(item.q1))
            .attr("width", ([_, item]) => this.x(item.q3 - item.q1))
            .attr("y", ([groupName, _]) => this.y(groupName))
            .attr("height", this.y.bandwidth())
            .attr("fill", "#69b3a2")
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        this.boxes.selectAll(".medianLine")
            .data(summaryPerGroup)
            .join("line")
            .attr("class", "medianLine")
            .attr("x1", ([_, item]) => this.x(item.median))
            .attr("x2", ([_, item]) => this.x(item.median))
            .attr("y1", ([groupName, _]) => this.y(groupName))
            .attr("y2", ([groupName, _]) => this.y(groupName) + this.y.bandwidth())
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        // draw points
        const jitter = this.y.bandwidth() * 0.45;
        const groupItemPairs = Object.entries(data)
            .map(([key, items]) => items.map(item => [key, item]))
            .flat();

        this.points.selectAll(".boxplot-data-items")
            .data(groupItemPairs)
            .join("circle")
            .attr("class", "boxplot-data-items")
            .attr("r", 3)
            .attr("cx", ([_, item]) => this.x(this.valueAccessor(item)))
            .attr("cy", ([groupName, _]) => this.y(groupName) + this.y.bandwidth() / 2 + (Math.random() - 0.5) * jitter)
            .attr("fill", "black")
            .style("visibility", showDots ? "visible" : "hidden")
            .on("mouseenter", (event, d) => this.callCallback(event, d))
            .on("mouseleave", (event, d) => this.callCallback(event, d))
            .on("click", (event, d) => this.callCallback(event, d));
    }
}
