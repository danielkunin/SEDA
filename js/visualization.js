// load visualizations
window.onload = function() {
  scatter();
  chloropleth();
  cluster();
};

// scatter plot of data
function scatter() {

	// Set up dimensions of SVG
	var margin = {top: 60, right: 60, bottom: 60, left: 60},
		width = 800 - margin.left - margin.right,
		height = 600 - margin.top - margin.bottom;

	// Create SVG
	var svg = d3.select("#districts").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Scales
	var x = d3.scaleLinear()
	    .range([0, width]);
	var y = d3.scaleLinear()
	    .range([height, 0]);
	var r = d3.scaleLinear()
	    .range([5,20]);
	var c = d3.scaleOrdinal(d3.schemeCategory10);

	// Axes
	var xAxis =  d3.axisBottom(x).ticks(6)
	var yAxis =  d3.axisLeft(y).ticks(6)

	// Graph
	svg.append("g")
	  .attr("class", "x axis")
	  .attr("transform", "translate(0," + height + ")")
	  .call(xAxis);
	svg.append("g")
	  .attr("class", "y axis")
	  .attr("transform", "translate(0,0)")
	  .call(yAxis);

	// Axes Labels
	svg.append("text")
	  .attr("class", "label")
	  .attr("text-anchor", "middle")
	  .attr("transform", "translate(" + width / 2 + "," + (height + 4 / 5 * margin.bottom ) + ")");              
	svg.append("text")
	  .attr("class", "label")
	  .attr("text-anchor", "middle")
	  .attr("transform", "translate(" + - 4 / 5 * margin.left + "," + height / 2 + ")rotate(-90)");


	// Tool Tip
	var tip = d3.tip().attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d,i) { 
	  	return d["State"] + ": " + d["District Name"];
	  });
	svg.call(tip);

	// Join, Update, Enter, Exit Data
	var time = 300,
		radius = 5;
	function update(data) {
		// Get Traits
		trait_x = $("#x_axis").val();
		trait_y = $("#y_axis").val();
		trait_r = $("#radius").val();
		trait_c = $("#color").val();

		// Update Axes Labels
		svg.selectAll("text.label")
		  .data([trait_x, trait_y])
		  .text(function(d) { return d; });

		// Scale Domains
		x.domain([d3.min(data, function(d) { return d[trait_x]; }), 
				  d3.max(data, function(d) { return d[trait_x]; })]);
		y.domain([d3.min(data, function(d) { return d[trait_y]; }), 
				  d3.max(data, function(d) { return d[trait_y]; })]);
		r.domain([d3.min(data, function(d) { return d[trait_r]; }), 
				  d3.max(data, function(d) { return d[trait_r]; })]);
		c.domain(d3.set(data, function(d) { return d[trait_c]; }));

		// Update Axis
		svg.select('.x.axis').transition().duration(time).call(xAxis);
		svg.select(".y.axis").transition().duration(time).call(yAxis);

		// JOIN new data with old elements.
		var points = svg.selectAll("circle")
		  .data(data, function(d) { return d["key"]; });

		// UPDATE old elements present in new data.
		points.attr("class", "update")
		.transition(time)
		  .attr("cx", function(d) { return x(d[trait_x]); })
		  .attr("cy", function(d) { return y(d[trait_y]); })
		  .attr("r", function(d) { return r(d[trait_r]); })
		  .style("fill", function(d) { return c(d[trait_c]); });

		// ENTER new elements present in new data.
		points.enter().append("circle")
		  .attr("cx", function(d) { return x(d[trait_x]); })
		  .attr("cy", function(d) { return y(d[trait_y]); })
		  .attr("r", function(d) { return r(d[trait_r]); })
		  .style("fill", function(d) { return c(d[trait_c]); })
		  .style("fill-opacity", 1e-6)
		  .on('mouseover', function(d) { tip.show(d,this); })
	      .on('mouseout', tip.hide)
		.transition(time)
		  .style("fill-opacity", 0.7);

		// EXIT old elements not present in new data.
		points.exit()
		  .attr("class", "exit")
		  .remove();
	}

	// Filter by state
	function filter_state() {
		var state = $("#state").val();
		data = districts.filter(function(d) { return state == d['State']; });
		return state != "Use All" ? data : districts;
	}

	// Handle plot button
	$("#scatter_control").change(function(event){
		var year = $("#year").val();
		data = filter_state().filter(function(d) { return year == d['Year']; });
		update(data);
	});

	// Initialize Plot
	$("#scatter_control").change()

}

// Chlorpleth of geospatial data (this code was adapted from Mike Bostock)
function chloropleth() {

	// / Set up dimensions of SVG
	var margin = {top: 20, right: 20, bottom: 20, left: 20},
		width = 1000 - margin.left - margin.right,
		height = 640 - margin.top - margin.bottom;

	// Create SVG
	var svg = d3.select("#chloropleth").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Scales 
	var num = 9;
	var x = d3.scaleLinear()
	    .domain([0, 10])
	    .rangeRound([400, 860]);
	var color = d3.scaleThreshold()
	    .domain(d3.range(1, 10, 1))
	    .range(d3.schemeBlues[9]);


	// load data
	var data = d3.map();
	d3.queue()
	    .defer(d3.json, "https://d3js.org/us-10m.v1.json")
	    .await(borders);

	// Create Map and path
	var map = svg.append("g")
		.style("cursor", "pointer");
	var path = d3.geoPath();

	// draw state and county borders
	function borders(error, us) {
	  if (error) throw error;

	  // Add Counties
	  map.append("g")
	      .attr("class", "counties")
	    .selectAll("path")
	    .data(topojson.feature(us, us.objects.counties).features)
	    .enter().append("path")
	      .attr("d", path)

	  // Add State Borders
	  map.append("path")
	      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
	      .attr("class", "states")
	      .attr("d", path);

	 // Add Clickable States
	 map.append("g")
	      .attr("class", "state")
	    .selectAll("path")
	    .data(topojson.feature(us, us.objects.states).features)
	    .enter().append("path")
	      .attr("fill-opacity", 0)
	      .attr("d", path)
	      .on("click", clicked)

	 // initialize plot
	 $("#map_control").change()
	}

	// Legend
	var legend = svg.append("g")
	    .attr("class", "key")
	    .attr("transform", "translate(0,20)");

	legend.selectAll("rect")
	  .data(color.range().map(function(d) {
	      d = color.invertExtent(d);
	      if (d[0] == null) d[0] = x.domain()[0];
	      if (d[1] == null) d[1] = x.domain()[1];
	      return d;
	    }))
	  .enter().append("rect")
	    .attr("height", 8)
	    .attr("x", function(d) { return x(d[0]); })
	    .attr("width", function(d) { return x(d[1]) - x(d[0]); })
	    .attr("fill", function(d) { return color(d[0]); });

	legend.append("text")
	    .attr("class", "caption")
	    .attr("x", x.range()[0])
	    .attr("y", -6)
	    .attr("fill", "white")
	    .attr("text-anchor", "start")
	    .attr("font-weight", "bold");

	var x_axis = d3.axisBottom(x)
		.tickSize(10)
	    .tickFormat(function(x, i) { return i ? x.toFixed(1) : x.toFixed(1) + "%"; })

	legend.call(x_axis.tickValues(color.domain()))
	  .select(".domain")
	    .remove();

	// Handle zoom and zoom out
	var centered;
	function clicked(d) {
	  var x, y, k;

	  if (d && centered !== d) {
	    var centroid = path.centroid(d);
	    x = centroid[0];
	    y = centroid[1];
	    k = 4;
	    centered = d;
	  } else {
	    x = width / 2;
	    y = height / 2;
	    k = 1;
	    centered = null;
	  }

	  map.selectAll("path")
	      .classed("active", centered && function(d) { return d === centered; });

	  map.transition()
	      .duration(1000)
	      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
	      .style("stroke-width", 1.5 / k + "px");
	}

	// update map
	function update(feature) {
		// update scales
		var min = d3.min(data.values()),
			max = d3.max(data.values()),
			step = (max - min) / num;
		x.domain([min - step, max])
		color.domain(d3.range(min, max, step))
		// update legend
		d3.select(".caption").text(feature);
		legend.call(x_axis.tickValues(color.domain()))
		  .select(".domain")
		    .remove();
		// color counties
		map.select(".counties")
		.selectAll("path")
		  .transition()
	      .attr("fill", function(d) { 
	      	found = (data.get(+d.id) != undefined) & !isNaN(data.get(+d.id))
	      	return found ? color(data.get(+d.id)) : "#686868"; 
	      });
	}


	// handle map selection
	$("#map_control").change(function(e){
		data = d3.map();
		var year = $("#year_map").val(),
			feature = $("#feature").val();
		d3.queue()
		    .defer(d3.csv, "data/districts.csv", function(d) { //"data/node.csv"
		    	if (d.Year == year) {
		    		data.set(+d.countyid, +d[feature]);
		    	} 
		    })
		    .await(function () {
		    	update(feature);
		    });
	});

}

// force based layout visualization of a network (adapted code from Mike Bostock)
function cluster() {
	// / Set up dimensions of SVG
	var margin = {top: 20, right: 20, bottom: 20, left: 20},
		width = 1000 - margin.left - margin.right,
		height = 640 - margin.top - margin.bottom;

	// Create SVG
	var svg = d3.select("#cluster").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Scale
	var color = d3.scaleOrdinal(d3.schemeCategory20);
	var l = d3.scaleLinear()
		.range([0,1]);
	var r = d3.scaleLinear()
		.range([3,20]);

	// Force Layout
	var simulation = d3.forceSimulation()
	    .force("link", d3.forceLink().id(function(d) { return d.id; }))
	    .force("charge", d3.forceManyBody().strength([-250]))
	    .force("center", d3.forceCenter(width / 2, height / 2));

	var data;
	function update(error, graph) {
	  if (error) throw error;

	  data = graph;
	  // filter links
	  graph.links = graph.links.filter(function(d) { return d.responses > 1000; });
	  min = d3.min(graph.links, function(d) {return d.responses; })
	  max = d3.max(graph.links, function(d) {return d.responses; })
	  l.domain([min, max])

	  var link = svg.append("g")
	      .attr("class", "links")
	    .selectAll("line")
	    .data(graph.links)
	    .enter().append("line")
	      .attr("opacity", function(d) { return l(d.responses); });

	  var node = svg.append("g")
	      .attr("class", "nodes")
	    .selectAll("circle")
	    .data(graph.nodes)
	    .enter().append("circle")
	      .attr("r", function(d) { return 8;})
	      .attr("fill", function(d) { return color(d.state); })
	      .on('mouseover', function(d) { tip.show(d,this); })
	      .on('mouseout', tip.hide)
	      .on('dblclick', connectedNodes)
	      .call(d3.drag()
	          .on("start", dragstarted)
	          .on("drag", dragged)
	          .on("end", dragended));

	  simulation
	      .nodes(graph.nodes)
	      .on("tick", ticked);

	  simulation.force("link")
	      .links(graph.links);

	  function ticked() {
	    link
	        .attr("x1", function(d) { return d.source.x; })
	        .attr("y1", function(d) { return d.source.y; })
	        .attr("x2", function(d) { return d.target.x; })
	        .attr("y2", function(d) { return d.target.y; });

	    node
	        .attr("cx", function(d) { return d.x; })
	        .attr("cy", function(d) { return d.y; });
	  }

	  	// Handles click (adapted from http://www.coppelia.io/2014/06/finding-neighbours-in-a-d3-force-directed-layout-2/)
		var linkedByIndex = {};
		var toggle = 0;
	  	for (i = 0; i < graph.nodes.length; i++) {
		    linkedByIndex[i + "," + i] = 1;
		};
		graph.links.forEach(function (d) {
		    linkedByIndex[d.source.index + "," + d.target.index] = 1;
		});

		function neighboring(a, b) {
		    return linkedByIndex[a.index + "," + b.index];
		}

		function connectedNodes() {

		    if (toggle == 0) {

		        d = d3.select(this).node().__data__;
		        node.style("opacity", function (o) {
		            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.15;
		        });
		        toggle = 1;
		    } else {
		        node.style("opacity", 1);;
		        toggle = 0;
		    }
		}
	}

	function dragstarted(d) {
	  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	  d.fx = d.x;
	  d.fy = d.y;
	}

	function dragged(d) {
	  d.fx = d3.event.x;
	  d.fy = d3.event.y;
	}

	function dragended(d) {
	  if (!d3.event.active) simulation.alphaTarget(0);
	  d.fx = null;
	  d.fy = null;
	}

	// Tool Tip
	var tip = d3.tip().attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d,i) { 
	  	return d.state;
	  });
	svg.call(tip);

	// handle map selection
	$("#cluster_control").change(function(e){
		var rad = $("#radius_cluster").val(),
			col = $("#color_cluster").val();
		var min = d3.min(data.nodes, function(d) {return +d[rad]; })
	    var max = d3.max(data.nodes, function(d) {return +d[rad]; })
	    r.domain([min, max])
			svg.selectAll("circle")
			  .transition()
			  .attr("r", function(d) { 
			  	return rad == "equal" ? 8 : r(d[rad]); 
			  })
			  .attr("fill", function(d) { return color(d[col]); });
	});

	// load viz
	d3.json("data/migration.json", update);
}



