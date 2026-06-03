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

    constructor(containerId, nameAccessor, valueAccessor) {
        this.nameAccessor = nameAccessor;
        this.valueAccessor = valueAccessor;

        // set the dimensions and margins of the graph
        const margin = { top: 30, right: 30, bottom: 70, left: 100 };
        this.width = 800 - margin.left - margin.right;
        this.height = 300 - margin.top - margin.bottom;

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

        // x axis
        this.x = d3.scaleLinear()
            .range([0, this.width]);
        this.xAxis = d3.axisTop().scale(this.x);
        this.svg.append("g")
            .attr("class", "myXAxis");
    }

    setOnClickCallback(callback) {
        this.onClickCallback = callback;
    }

    setData(data) {
        // filter out 0 values and sort data descending
        data = data
            .filter(d => this.valueAccessor(d) > 0)
            .sort((a, b) => this.valueAccessor(a) < this.valueAccessor(b));

        // update x axis
        const maxX = d3.max(data, this.valueAccessor)
        this.x.domain([0, maxX]);
        this.svg.selectAll(".myXAxis").call(this.xAxis);

        // update y axis
        this.y.domain(data.map(this.nameAccessor));
        this.svg.selectAll(".myYAxis")
            .call(this.yAxis)
            .selectAll("text")
            .attr("transform", "translate(-10,0)")
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
            .attr("id", d => `bar-${this.nameAccessor(d)}`)
            .on("click", event => {
                const id = event.target.id;
                const name = id.split("-")[1];
                if (this.onClickCallback !== undefined) {
                    this.onClickCallback(name);
                }
            });
    }
}