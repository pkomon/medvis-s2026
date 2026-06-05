import * as d3 from "d3";

export class BarChart {
    svg = undefined;
    content = undefined;
    width = undefined;
    height = undefined;
    x = undefined;
    xAxis = undefined;
    y = undefined;
    yAxis = undefined;
    nameAccessor = undefined;
    valueAccessor = undefined;
    onHoverCallback = undefined;
    onClickCallback = undefined;
    highlightedName = undefined;
    selectedName = undefined;

    constructor(containerId, nameAccessor, valueAccessor) {
        this.nameAccessor = nameAccessor;
        this.valueAccessor = valueAccessor;

        // set the dimensions and margins of the graph
        const margin = { top: 30, right: 30, bottom: 0, left: 100 };
        this.width = 800 - margin.left - margin.right;
        this.height = 500 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select(`#${containerId}`)
            .append("svg")
            .attr("width", this.width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

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

    setOnClickCallback(callback) {
        this.onClickCallback = callback;
    }

    setOnHoverCallback(callback) {
        this.onHoverCallback = callback;
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
        this.content.selectAll("rect")
            .classed("highlighted", d => this.nameAccessor(d) === this.highlightedName)
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
            .on("mouseenter", (event, d) => {
                if (this.onHoverCallback !== undefined) {
                    this.onHoverCallback(this.nameAccessor(d), event, d);
                }
            })
            .on("mousemove", (event, d) => {
                if (this.onHoverCallback !== undefined) {
                    this.onHoverCallback(this.nameAccessor(d), event, d);
                }
            })
            .on("mouseleave", (event, d) => {
                if (this.onHoverCallback !== undefined) {
                    this.onHoverCallback(undefined, event, d);
                }
            })
            .on("click", (event, d) => {
                const name = this.nameAccessor(d);
                if (this.onClickCallback !== undefined) {
                    this.onClickCallback(name);
                }
            });
        this.updateStyles();
    }
}
